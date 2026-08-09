/* =============================================================
   hahyunmath Gemini 프록시

   2026-08-06 변경 — X-Site-Token(정적 공유 비밀) → Firebase ID 토큰 검증.
   드라이브·Gemini 로직은 배포본 그대로다. 손댄 곳은 셋뿐이다.
     ① CORS에 Authorization 허용        ② 인증 게이트                ③ 서버 쪽 할당량

   왜 «회전»이 아니라 «교체»인가 — AI_SITE_TOKEN은 정적 클라이언트에 실려
   모든 방문자 브라우저로 내려간다. 새 토큰으로 갈아도 새 값이 똑같이 공개된다.
   처음부터 비밀이 될 수 없는 값이었다. 게다가 일 20건 제한이 클라이언트에만 있어서
   (index.html:731,758) 토큰만 있으면 이 워커를 루프로 호출해 Gemini 비용을 태울 수 있었다.

   ⚠ 익명 로그인이라는 점을 알고 가야 한다 (index.html:5401 signInAnonymously()).
   여기서 검증하는 «유효한 ID 토큰»은 «강사»가 아니라 «이 사이트를 연 사람»이다.
   이 변경이 사주는 것은 셋 — 영구 정적 비밀 제거(1시간 만료·회수 가능),
   서버 쪽 할당량 강제(지금은 클라이언트 장식), uid 단위 추적.
   「강사만 접근」은 커스텀 클레임이 필요하고 클레임을 심을 백엔드가 따로 있어야 한다. 별건이다.

   **2026-08-06에 3단계까지 끝났다.** SITE_TOKEN 비밀이 삭제되어 유출된 값은 죽었고
   (옛 토큰으로 부르면 401 — 실제로 확인함), 이 파일에서도 옛 경로를 지웠다.
     바인딩   [[kv_namespaces]] binding = "QUOTA"   (없으면 할당량 검사를 건너뛴다)
     vars     ALLOW_ORIGIN — 실제 배포 도메인. 안 넣으면 '*'
     비밀     GEMINI 관련 키만 남는다. SITE_TOKEN은 더 이상 쓰지 않는다
   ============================================================= */

const FIREBASE_PROJECT_ID = 'hahyunmath';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// index.html의 AI_DAILY_LIMIT과 같은 값이어야 한다. 어긋나면 «남았다고 떠 있는데 429»가 된다.
const AI_DAILY_LIMIT = 20;
// 이미지 업로드는 학생도 쓴다(질의응답 사진). 비용이 드는 쪽은 Gemini라 여기는 넉넉하게,
// 다만 «한 명이 무한히»는 막는다. 전체 상한은 걸지 않는다 — 걸면 바쁜 날 학생이 막힌다.
const UPLOAD_PER_USER_DAILY = 200;

export default {
  async fetch(request, env) {
    const corsHeaders = {
      // Authorization을 반드시 넣어야 한다. 없으면 브라우저가 프리플라이트에서 요청을
      // 통째로 막아 AI 생성과 이미지 업로드가 그 자리에서 죽는다.
      // X-Site-Token은 이행 기간용이었다 — 3단계(2026-08-06)에서 뺐다.
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const who = await authenticate(request, env);
    if (!who) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);

    /* 할당량은 «비용이 드는 것»에만 건다.
       /delete는 정리 작업이라 막으면 드라이브에 쓰레기가 쌓인다 — 그대로 통과시킨다. */
    if (url.pathname === '/upload') {
      const q = await bumpQuota(env, 'upload', who.uid, UPLOAD_PER_USER_DAILY, null);
      if (!q.ok) return quotaExceeded(q, corsHeaders);
    } else if (url.pathname !== '/delete') {
      // 나머지는 전부 Gemini 생성이다 (기존 라우팅이 catch-all이라 그대로 맞춘다)
      const q = await bumpQuota(env, 'ai', who.uid, AI_DAILY_LIMIT, AI_DAILY_LIMIT);
      if (!q.ok) return quotaExceeded(q, corsHeaders);
    }

    if (url.pathname === '/upload') return handleUpload(request, env, corsHeaders);
    if (url.pathname === '/delete') return handleDelete(request, env, corsHeaders);
    return handleGeminiTwin(request, env, corsHeaders);
  },
};

/* =================== 인증 =================== */

/* 인증은 Firebase ID 토큰 하나뿐이다.
   2단계 동안 열어 뒀던 옛 사이트 토큰 경로는 3단계(2026-08-06 SITE_TOKEN 비밀 삭제)로 닫혔고,
   확인 뒤 코드에서도 지웠다 — 옛 토큰으로 부르면 401이다. */
async function authenticate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const payload = await verifyFirebaseIdToken(auth.slice(7));
  return payload ? { uid: payload.sub, via: 'firebase' } : null;
}

/* Firebase ID 토큰 검증 — 구글 공개키(JWKS)로 서명을 확인하고 iss/aud/exp를 본다.
   WebCrypto만 쓰므로 Admin SDK도, 서비스 계정 키를 워커에 두는 일도 필요 없다. */

let jwksCache = { keys: null, expiresAt: 0 };

async function getSigningKey(kid) {
  const now = Date.now();
  if (!jwksCache.keys || now >= jwksCache.expiresAt) {
    const res = await fetch(JWKS_URL);
    if (!res.ok) throw new Error('jwks fetch ' + res.status);
    const body = await res.json();
    // 구글이 주는 Cache-Control을 그대로 따른다. 키는 며칠에 한 번 돈다.
    const m = (res.headers.get('cache-control') || '').match(/max-age=(\d+)/);
    jwksCache = { keys: body.keys || [], expiresAt: now + (m ? Number(m[1]) : 3600) * 1000 };
  }
  return jwksCache.keys.find((k) => k.kid === kid) || null;
}

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

// 통과하면 payload, 아니면 null. 거절 «사유»는 돌려주지 않는다 — 공격자에게 주는 힌트다.
async function verifyFirebaseIdToken(jwt) {
  try {
    const parts = String(jwt || '').split('.');
    if (parts.length !== 3) return null;

    const header = b64urlToJson(parts[0]);
    if (header.alg !== 'RS256' || !header.kid) return null; // alg:none 류를 막는다

    const jwk = await getSigningKey(header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlToBytes(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1])
    );
    if (!ok) return null;

    const p = b64urlToJson(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    if (!(p.exp > now)) return null;
    if (p.iat > now + 60) return null;                                          // 시계 어긋남 여유 60초
    if (p.aud !== FIREBASE_PROJECT_ID) return null;                             // 다른 프로젝트 토큰 차단
    if (p.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT_ID) return null;
    if (!p.sub) return null;
    return p;
  } catch (e) {
    return null;
  }
}

/* =================== 할당량 (서버 쪽) ===================
   KV는 원자적이지 않아 동시 요청이 겹치면 한도를 한두 건 넘길 수 있다.
   정확히 막아야 하면 Durable Object로 올린다. 1인 운영·일 20건에서는
   «대충 20건»으로 충분하고, 지금처럼 «아예 안 막힘»과는 차원이 다르다. */

function quotaExceeded(q, corsHeaders) {
  return new Response(JSON.stringify({ error: 'quota exceeded', used: q.used }), {
    status: 429,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function bumpQuota(env, bucket, uid, perUserLimit, globalLimit) {
  if (!env.QUOTA) {
    console.warn('QUOTA KV 미바인딩 — 할당량 검사를 건너뜁니다');
    return { ok: true, used: 0 };
  }
  const day = new Date().toISOString().slice(0, 10);
  const uKey = `q:${bucket}:${uid}:${day}`;
  const gKey = `q:${bucket}:_all:${day}`;

  const [uRaw, gRaw] = await Promise.all([env.QUOTA.get(uKey), env.QUOTA.get(gKey)]);
  const used = Number(uRaw || 0);
  const total = Number(gRaw || 0);
  if (perUserLimit !== null && used >= perUserLimit) return { ok: false, used };
  if (globalLimit !== null && total >= globalLimit) return { ok: false, used: total };

  const opts = { expirationTtl: 60 * 60 * 48 }; // 이틀치만 남기면 지난 날짜 키는 알아서 사라진다
  await Promise.all([
    env.QUOTA.put(uKey, String(used + 1), opts),
    env.QUOTA.put(gKey, String(total + 1), opts),
  ]);
  return { ok: true, used: used + 1 };
}

/* =================== 구글 드라이브: OAuth 리프레시 토큰으로 액세스 토큰 발급 =================== */

let driveTokenCache = { value: null, expiresAt: 0 };

async function getDriveAccessToken(env) {
  const now = Date.now();
  if (driveTokenCache.value && now < driveTokenCache.expiresAt - 60000) {
    return driveTokenCache.value;
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DRIVE_OAUTH_CLIENT_ID,
      client_secret: env.DRIVE_OAUTH_CLIENT_SECRET,
      refresh_token: env.DRIVE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString(),
  });
  if (!res.ok) throw new Error('token refresh failed: ' + res.status + ' ' + await res.text());
  const data = await res.json();
  driveTokenCache = { value: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return driveTokenCache.value;
}

/* =================== 구글 드라이브: 업로드 / 삭제 =================== */

async function handleUpload(request, env, corsHeaders) {
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid form data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return new Response(JSON.stringify({ error: 'missing file' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let accessToken;
  try {
    accessToken = await getDriveAccessToken(env);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'auth failed', detail: String(e) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const boundary = 'wkr_' + crypto.randomUUID();
  const name = form.get('name') || ('img_' + Date.now() + '.jpg');
  const metadata = { name, parents: [env.DRIVE_FOLDER_ID] };
  const body = new Blob([
    `--${boundary}\r\n`,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata) + '\r\n',
    `--${boundary}\r\n`,
    `Content-Type: ${file.type || 'image/jpeg'}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`,
  ]);

  let uploadRes;
  try {
    uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'drive upload request failed', detail: String(e) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!uploadRes.ok) {
    return new Response(JSON.stringify({ error: 'drive upload failed', detail: await uploadRes.text() }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const doc = await uploadRes.json();

  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}/permissions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
  } catch (e) { /* 권한 설정 실패해도 파일 자체는 업로드됐으니 계속 진행 */ }

  return new Response(JSON.stringify({
    fileId: doc.id,
    url: `https://drive.google.com/thumbnail?id=${doc.id}&sz=w2000`,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleDelete(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const fileId = body.fileId;
  if (!fileId) {
    return new Response(JSON.stringify({ error: 'missing fileId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  let accessToken;
  try {
    accessToken = await getDriveAccessToken(env);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'auth failed', detail: String(e) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (res.ok || res.status === 404) {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: 'delete failed', detail: await res.text() }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function fetchDriveFileAsDataUrl(fileId, env) {
  const accessToken = await getDriveAccessToken(env);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (!res.ok) throw new Error('drive fetch failed: ' + res.status);
  const mimeType = res.headers.get('Content-Type') || 'image/jpeg';
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return `data:${mimeType};base64,${btoa(bin)}`;
}

/* =================== 기존 Gemini 쌍둥이문제 생성 (imageFileId 지원 추가) =================== */

async function handleGeminiTwin(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { content, answer, image, imageFileId } = body;
  if (!content || !answer) {
    return new Response(JSON.stringify({ error: 'missing content/answer' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const persona = `당신은 대한민국 고등학교 수학 교육과정에 완벽하게 통달한 수석 출제 위원입니다.`;

  /* 학생 답안 입력칸이 받을 수 있는 것은 딱 둘이다 — «숫자 입력» 아니면 «①~⑤ 보기 버튼»
     (index.html의 isMultipleChoice / answerInputHTML). 분수·무리수·음수·문자식이 정답으로
     나오면 학생은 입력할 방법이 없어, 풀 수는 있지만 제출할 수 없는 문제가 된다.
     그래서 정답의 «형태»를 두 갈래로 못박는다. 예전 규칙이 "깔끔한 정수 또는 간단한 기약분수"를
     허용했는데, 기약분수가 바로 그 입력 불가 사례였다. */
  const answerFormRule = `정답의 형태에 대한 절대 규칙입니다. 반드시 지키세요.

(1) 1순위 — 주관식. 최종 정답이 1 이상 999 이하의 자연수로 떨어지도록 목표 정답을 먼저 정한 뒤, 그 정답이 도출되도록 원본 문제의 조건(방정식의 계수, 평행이동 좌표, 도형의 길이 등)을 역산하여 재구성하세요. 임의의 난수를 대입하지 마세요. 이 경우 "answer"에는 숫자만 쓰세요 (예: "12").

(2) 2순위 — 객관식. 문제의 유형상 정답이 999 이하의 자연수가 될 수 없는 경우(분수, 무리수, 음수, 0, 1000 이상의 수, 문자를 포함한 식, 좌표쌍, 집합, 구간 등)에는 반드시 객관식으로 만드세요.
  - 문제 본문 맨 끝에 보기 다섯 개를 ① ② ③ ④ ⑤ 기호를 붙여 나열하세요.
  - "answer"에는 정답 보기의 기호 하나만 쓰세요 (예: "③"). 숫자 3이 아니라 기호 ③ 입니다.
  - 오답 보기는 흔한 계산 실수(부호 실수, 약분 실수, 공식 혼동 등)에서 나올 법한 값으로 만드세요. 무작위 값이나 누가 봐도 틀린 값은 쓰지 마세요.
  - 보기 다섯 개는 서로 달라야 하며, 정답은 반드시 그 다섯 개 중 하나여야 합니다.

(3) 반드시 (1) 아니면 (2)입니다. 999 이하의 자연수도 아니고 객관식도 아닌 정답은 절대로 만들지 마세요.`;

  const safetyRule = `변형된 문제는 반드시 다음 조건을 만족해야 합니다. 첫째, 이차방정식이 포함된 경우 판별식을 확인하여 근의 성질(실근/허근, 중근 여부 등)이 원본과 동일하게 유지될 것. 둘째, 길이·넓이·시간 등 물리적으로 양수여야 하는 값은 반드시 양수(+)로 나올 것. 셋째, 확률/경우의 수 문제는 표본공간이 바뀌어도 논리적으로 모순이 없을 것.`;

  const formatRule = `수식(분수, 제곱, 루트, 부등호 등)은 반드시 LaTeX 문법으로 쓰고 앞뒤를 $ 기호로 감싸주세요 (예: $x^2 - 3x + 2 = 0$, $\\frac{1}{2}$, $\\sqrt{5}$, $\\alpha \\leq x$). 곱하기·이하·이상 같은 연산은 절대 "times", "le", "ge" 같은 영단어로 쓰지 말고 반드시 \\times, \\leq, \\geq 같은 LaTeX 명령어만 사용하세요. 수식이 아닌 일반 문장은 $ 없이 그대로 쓰세요.`;

  const jsonSchemaRule = `반드시 아래 JSON 형식으로만 답하세요. 다른 설명, 인사말, 코드블록 기호는 절대 포함하지 마세요.
{"problem": "새 문제 내용 (객관식이면 보기 ①~⑤까지 이 안에 포함)", "answer": "999 이하 자연수 또는 보기 기호 ①~⑤ 중 하나", "solution": "단계별 풀이 과정을 1. 2. 3. 처럼 번호를 매겨 서술 (검토자가 정답을 검증할 수 있도록, 마크다운 기호 없이 일반 텍스트로)"}`;

  let effectiveImage = image;
  if ((!effectiveImage || typeof effectiveImage !== 'string') && imageFileId) {
    try {
      effectiveImage = await fetchDriveFileAsDataUrl(imageFileId, env);
    } catch (e) {
      console.error('drive image fetch failed', e);
    }
  }
  const hasImage = typeof effectiveImage === 'string' && effectiveImage.startsWith('data:');
  /* ⚠ 그림이 있는 문항은 «그림 없이 풀 수 있는 문제»로 다시 쓴다.

     예전 지시는 「그림은 그대로 두고 숫자만 바꾸거나, **또는** 그림에 의존하지 않는 형태로
     조정하라」였다. 두 갈래를 열어 주니 모델이 쉬운 쪽을 골라 **소재만 바꾼 같은 문제**가 나왔다
     (축구 대진표 → 피구 대진표. 그림도 수도 그대로였다).
     그림을 새로 그릴 수 없는 이상 «그림을 남기는 변형»은 원본과 같은 문제일 수밖에 없다.
     그래서 갈래를 없애고 한 길로 못박는다 — 그림에 있던 정보를 글로 옮겨 적게 한다. */
  const taskRule = hasImage
    ? `다음은 고등학교 수학 문제와 정답이고, 문제에 첨부된 그림(그래프/도형)도 같이 드립니다. 이 문제와 같은 개념·난이도를 묻되 **그림 없이 글만으로 풀 수 있는** "쌍둥이 문제" 1개를 새로 만들어주세요.
반드시 지킬 것:
- 그림에서만 알 수 있는 정보(좌표, 길이, 각도, 배치, 개수 등)는 **새 문제의 본문에 글로 명시**하세요. 새 문제에는 그림이 첨부되지 않습니다.
- "다음 그림과 같이", "위 그림에서", "아래 표와 같이" 같은 표현을 절대 쓰지 마세요. 그런 말이 들어가면 학생은 문제를 풀 수 없습니다.
- 원본과 **숫자·상황이 모두** 달라야 합니다. 소재(축구→피구 같은)만 바꾸고 수를 그대로 두면 같은 문제입니다.`
    : `다음은 고등학교 수학 문제와 정답입니다. 문제의 풀이 구조, 유형, 난이도는 그대로 유지하되 숫자(계수, 상수, 조건 값 등)만 바꾸어 "쌍둥이 문제" 1개를 새로 만들어주세요.`;

  const prompt = `${persona}
${taskRule}
${answerFormRule}
${safetyRule}
${formatRule}
${jsonSchemaRule}

[원본 문제]
${content}

[원본 정답]
${answer}`;

  const parts = [{ text: prompt }];
  if (hasImage) {
    const m = effectiveImage.match(/^data:([^;]+);base64,(.*)$/s);
    if (m) {
      parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
  }

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'gemini request failed', detail: String(e) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return new Response(JSON.stringify({ error: 'gemini error', detail: errText }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await geminiRes.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'parse failed', raw: text }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!parsed.problem || !parsed.answer) {
    return new Response(JSON.stringify({ error: 'incomplete result', raw: parsed }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  /* figureFree — 원본에 그림이 있었고, 그래서 «그림 없이 푸는 문제»로 새로 썼다는 표시다.
     클라이언트는 이 값을 보고 **변형에 원본 그림을 붙이지 않는다.**
     안 그러면 글에 다 적혀 있는데 상관없는 그림이 같이 떠서 학생이 헷갈린다. */
  return new Response(JSON.stringify({
    content: parsed.problem, answer: parsed.answer, solution: parsed.solution || '',
    figureFree: hasImage,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
