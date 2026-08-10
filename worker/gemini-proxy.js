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

    /* 남은 한도를 «쓰지 않고» 물어보는 길. 화면이 「오늘 남은 생성」을 정확히 띄우려면 필요하다.
       클라이언트가 따로 세면 반드시 어긋난다 — 워커는 실패한 요청도 세고, 사용자별로 세고,
       날짜를 UTC로 보는데 클라이언트는 성공만·공용 하나·로컬 날짜로 셌다.
       그래서 «남았다고 떠 있는데 429»가 났다 (2026-08-10). 진실은 여기 하나뿐이다. */
    if (url.pathname === '/quota') {
      return new Response(JSON.stringify(await peekQuota(env, 'ai', who.uid, AI_DAILY_LIMIT)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    return handleGeminiTwin(request, env, corsHeaders, who.uid);
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

/* 세지 않고 «지금 얼마나 썼나»만 본다. bumpQuota와 같은 키·같은 날짜 계산을 써야
   둘이 어긋나지 않는다 — 그래서 날짜를 만드는 곳을 하나로 모았다. */
function quotaDay(){ return new Date().toISOString().slice(0, 10); }
async function peekQuota(env, bucket, uid, limit) {
  if (!env.QUOTA) return { used: 0, limit, remaining: limit, unlimited: true };
  const day = quotaDay();
  const [uRaw, gRaw] = await Promise.all([
    env.QUOTA.get(`q:${bucket}:${uid}:${day}`),
    env.QUOTA.get(`q:${bucket}:_all:${day}`),
  ]);
  /* 개인 한도와 전체 한도 중 «더 많이 찬 쪽»이 실제로 막는 쪽이다. */
  const used = Math.max(Number(uRaw || 0), Number(gRaw || 0));
  return { used, limit, remaining: Math.max(0, limit - used) };
}
async function bumpQuota(env, bucket, uid, perUserLimit, globalLimit) {
  if (!env.QUOTA) {
    console.warn('QUOTA KV 미바인딩 — 할당량 검사를 건너뜁니다');
    return { ok: true, used: 0 };
  }
  const day = quotaDay();
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

/* =================== 모델이 낸 JSON 읽기 ===================
   ⚠ **모델이 LaTeX의 역슬래시를 JSON 규칙대로 두 번 쓰지 않을 때가 있다.** 간헐적이고,
   수식이 많은 문항일수록 자주 걸린다. 그 결과가 두 갈래인데 **뒤쪽이 더 나쁘다.**

     "$\alpha$"  → \a 는 JSON에 없는 이스케이프다. 그 자리에서 파싱이 **터진다** (눈에 보인다)
     "$\frac{}$" → \f 는 «폼피드»라 파싱은 **통과하고** 글자만 조용히 깨진다.
                   그대로 두면 깨진 문제가 검토를 지나 학생에게 간다

   그래서 «문자열 안의 역슬래시»만 한 번 더 이스케이프해서 다시 읽는다.
   제대로 쓴 응답(`\\alpha`)은 첫 파싱에서 그대로 통과하므로 손대지 않는다.

   ⚠ `\n`은 살려 둔다 — figureSpec의 네 줄을 나누는 것이 그것이다.
     (`\neq`가 줄바꿈으로 읽힐 수 있지만, 우리가 줄바꿈을 시켜 놓았으므로 그쪽이 압도적으로 흔하다.
      부등호는 프롬프트에서 `\leq`/`\geq`로 쓰게 해 두었다.) */
const MANGLED = /[\b\f\t\r]/;   // 백스페이스·폼피드·탭·CR — 문제 본문에 있을 리 없는 글자들

function repairJsonEscapes(src) {
  let out = '', inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (!inStr) { if (c === '"') inStr = true; out += c; continue; }
    if (c === '"') { inStr = false; out += c; continue; }
    if (c !== '\\') { out += c; continue; }
    const n = src[i + 1];
    // 진짜 이스케이프는 그대로 둔다. \" 를 건드리면 문자열 끝을 잘못 읽는다
    if (n === '"' || n === '\\' || n === '/' || n === 'n') { out += c + n; i++; continue; }
    if (n === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) { out += src.slice(i, i + 6); i += 5; continue; }
    out += '\\\\';            // 나머지는 전부 LaTeX 명령어로 본다 (\alpha, \frac, \times …)
  }
  return out;
}

function parseModelJson(text) {
  let first;
  try {
    first = JSON.parse(text);
  } catch (e) {
    return JSON.parse(repairJsonEscapes(text));   // 여기서 또 터지면 부르는 쪽이 받는다
  }
  // 파싱은 됐다. 그래도 \frac 류가 제어문자로 읽힌 흔적이 있으면 고쳐서 다시 읽는다
  const junk = Object.values(first).some(v => typeof v === 'string' && MANGLED.test(v));
  if (!junk) return first;
  try { return JSON.parse(repairJsonEscapes(text)); } catch (e) { return first; }
}

/* =================== 기존 Gemini 쌍둥이문제 생성 (imageFileId 지원 추가) =================== */

async function handleGeminiTwin(request, env, corsHeaders, uid) {
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
{"mode": "text" 또는 "figure" 또는 "reuse" (그림이 없는 문제면 언제나 "text"), "problem": "새 문제 내용 (객관식이면 보기 ①~⑤까지 이 안에 포함)", "answer": "999 이하 자연수 또는 보기 기호 ①~⑤ 중 하나", "solution": "단계별 풀이 과정을 1. 2. 3. 처럼 번호를 매겨 서술 (검토자가 정답을 검증할 수 있도록, 마크다운 기호 없이 일반 텍스트로). **여섯 단계 이내로, 각 단계는 두 줄을 넘기지 마세요.**", "figureSpec": "mode가 figure일 때만 채우고, 아니면 빈 문자열"}`;

  let effectiveImage = image;
  if ((!effectiveImage || typeof effectiveImage !== 'string') && imageFileId) {
    try {
      effectiveImage = await fetchDriveFileAsDataUrl(imageFileId, env);
    } catch (e) {
      console.error('drive image fetch failed', e);
    }
  }
  const hasImage = typeof effectiveImage === 'string' && effectiveImage.startsWith('data:');
  /* ⚠ 그림 문항의 «변형»은 두 길 중 하나다. 모델이 고르되, 고를 «기준»을 준다.

     이 규칙은 두 번 뒤집혔다. 처음에는 「그림은 두고 숫자만 바꾸거나, **또는** 그림에
     의존하지 않는 형태로 조정하라」였다 — 두 갈래를 조건 없이 열어 주니 모델이 늘 쉬운 쪽을
     골라 **소재만 바꾼 같은 문제**가 나왔다 (축구 대진표 → 피구 대진표. 수도 그림도 그대로).
     그래서 2026-08-10에 갈래를 없애고 「무조건 그림 없이 풀 수 있게 다시 써라」 하나로 못박았다.

     그러자 반대쪽으로 넘어갔다 — 그림 하나에 들어 있던 배치·좌표를 전부 문장으로 풀어 쓰니
     **원본보다 길고 어려운 문제**가 되어 나왔다 (사용자 확인, 2026-08-11).
     그림을 읽는 것 자체가 물음인 문제는 애초에 글로 옮길 수 없다.

     → 갈래는 둘로 되돌리되 **판단 기준을 못박고, 쉬운 쪽에 대가를 붙인다.**
     "figure"를 고르면 그림을 **사람이 새로 그려야** 하므로 «그리는 지침»(figureSpec)을
     반드시 써 내야 하고, 그 그림이 붙기 전에는 학생에게 공개되지 않는다.
     그림을 남기면서 수까지 그대로 두는 «소재만 바꾸기»는 (B)에서도 금지된다. */
  const taskRule = hasImage
    ? `다음은 고등학교 수학 문제와 정답이고, 문제에 첨부된 그림(그래프/도형/표)도 같이 드립니다. 이 문제와 같은 개념·난이도를 묻는 "쌍둥이 문제" 1개를 새로 만들어주세요.

먼저 아래 세 갈래 중 하나를 고르세요. 어느 것을 고르든 **원본과 다른 문제가 되어야 합니다** — 수가 그대로면 그것은 쌍둥이가 아니라 원본입니다.

**(C) → (A) → (B) 순으로 따져 보고, 앞의 것이 성립하면 뒤의 것을 고르지 마세요.** 뒤로 갈수록 사람이 손으로 해야 할 일이 늘어납니다. 다만 성립하지 않는데 억지로 앞의 것을 고르면 안 됩니다 — 각 갈래의 조건을 그대로 지키세요.

(C) 그림은 원본 것을 그대로 두고 **본문의 수만** 바꾸면 되는 경우 → "mode"를 "reuse"로 하세요.
  다음 두 조건을 **모두** 만족할 때만 (C)입니다.
  - 그림에 원본 문제의 수치(좌표, 길이, 각도, 눈금 값 등)가 **적혀 있지 않다.** 그림은 배치·구조만 보여 주는 배경이다 (지도, 구역도, 대진표, 인접 관계도, 좌석 배치 등)
  - 바꿀 수가 **본문에만** 있다 (예: 색의 가짓수, 사람 수, 횟수, 확률의 조건)
  (C)에서 지킬 것:
  - **본문의 수를 반드시 바꾸세요.** 바꿀 수 없다면 (C)가 아닙니다.
  - 상황·소재는 바꾸지 마세요. 그림을 그대로 쓰므로 소재를 바꾸면 그림과 본문이 어긋납니다.
  - "figureSpec"은 빈 문자열로 두세요. 사람이 그릴 것이 없습니다.
  - ⚠ 그림에 수치가 하나라도 적혀 있는데 그 수를 본문에서 바꾸면 **그림과 본문이 모순됩니다.** 그런 경우는 (C)가 아니라 (B)입니다.

(C)가 아니라면, 다음을 판단하세요 — 그림이 담고 있는 정보를 문장으로 옮겨 적었을 때, 새 문제가 원본과 비슷한 길이·난이도로 남습니까?

(A) 남는다 → "mode"를 "text"로 하고, **그림 없이 글만으로 풀 수 있는 문제**로 새로 쓰세요.
  - 그림에서만 알 수 있는 정보(좌표, 길이, 각도, 배치, 개수 등)를 새 문제 본문에 글로 명시하세요. 새 문제에는 그림이 붙지 않습니다.
  - "다음 그림과 같이", "위 그림에서", "아래 표와 같이" 같은 표현을 절대 쓰지 마세요. 그런 말이 들어가면 학생은 문제를 풀 수 없습니다.
  - 원본과 숫자·상황이 모두 달라야 합니다. 소재(축구→피구 같은)만 바꾸고 수를 그대로 두면 같은 문제입니다.

(B) 남지 않는다 → "mode"를 "figure"로 하세요. 아래 중 하나라도 해당하면 반드시 (B)입니다.
  - 그림을 글로 옮기면 조건 문장이 다섯 줄을 넘거나, 원본에 없던 좌표계·기호를 새로 도입해야 한다
  - 그림을 읽어 내는 것 자체가 이 문제가 묻는 능력이다 (그래프 개형, 도형의 위치 관계, 자료·표 해석 등)
  - 글로 옮기면 원본보다 눈에 띄게 어려워지거나 쉬워진다
  (B)에서 지킬 것:
  - **그림이 반드시 달라져야 합니다.** "원본 그림과 동일", "변형 없음" 같은 지침은 절대 쓰지 마세요. 그림을 그대로 쓸 것이라면 (B)가 아니라 (C)입니다.
  - 바꿀 것은 숫자만이 아닙니다. 그림에 바꿀 숫자가 없으면 **구조를 바꾸세요.**
    · 수가 있는 그림(그래프, 도형, 좌표평면) → 계수, 길이, 좌표값, 눈금, 각도를 바꾼다
    · 수가 없는 그림(지도, 인접 관계도, 배치도, 대진표, 연결망) → **칸·영역·꼭짓점의 개수나 인접 관계, 배치 자체를 바꾼다.** 예를 들어 7개 영역짜리 지도라면 6개나 8개짜리로, 또는 어느 영역끼리 맞닿는지를 바꾼다. (구조를 그대로 두고 본문의 수만 바꿀 생각이라면 그것은 (C)입니다)
  - 상황·소재는 바꾸지 마세요 (축구를 피구로 바꾸는 식). 바꿔야 하는 것은 소재가 아니라 **그림이 담은 수 또는 구조**입니다.
  - **자기 점검**: 그림도 본문도 원본과 같은데 정답만 달라졌다면, 그 문제는 틀린 것입니다. 정답이 달라졌다면 그림이나 본문 중 무엇이 달라졌는지 figureSpec에 반드시 적혀 있어야 합니다.
  - 본문에 "다음 그림과 같이" 같은 표현을 원본처럼 그대로 써도 됩니다. 그림은 사람이 새로 그려서 붙입니다.
  - "figureSpec"에 그 그림을 그릴 사람을 위한 지침을 쓰세요. 형식은 아래와 같습니다.

[figureSpec 작성 형식] 마크다운 기호 없이 일반 텍스트로, 아래 네 줄을 줄바꿈으로 나누어 순서대로 쓰세요.
1. 달라지는 것: 원본 그림에서 무엇이 어떻게 바뀌는지 (예: 포물선의 꼭짓점이 (1, -4)에서 (2, -9)로 바뀝니다 / 예: 가운데 영역에 맞닿는 영역이 4개에서 3개로 줄어듭니다). **여기가 비거나 "없음"이면 (B)를 고른 것 자체가 잘못입니다.**
2. 그대로 두는 것: 축, 눈금 간격, 점 이름, 위치 관계 등 손대지 않을 것
3. 반드시 표시할 값: 새 그림에 적어 넣어야 하는 좌표·길이·각도·점 이름을 빠짐없이
4. 그리는 방법: 어떤 범위로 어떻게 그리면 되는지 한 줄 (예: 모눈종이에 x축 -1~5, y축 -10~2 범위로)`
    : `다음은 고등학교 수학 문제와 정답입니다. 문제의 풀이 구조, 유형, 난이도는 그대로 유지하되 숫자(계수, 상수, 조건 값 등)만 바꾸어 "쌍둥이 문제" 1개를 새로 만들어주세요. 이 문제에는 그림이 없으므로 "mode"는 "text"입니다.`;

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
          /* ⚠ maxOutputTokens를 반드시 명시한다. 안 걸어 두면 기본값에 걸려 **JSON이 중간에서 잘리고**,
             그러면 아래 JSON.parse가 터져 «parse failed»로만 보인다 — 실제로 겪었다 (2026-08-11,
             갈래를 셋으로 늘려 프롬프트가 길어진 직후). 이 모델은 생각한 것도 출력 예산에서 쓴다.
             잘린 것과 «모델이 JSON을 못 쓴 것»은 고치는 법이 다르므로 finishReason도 같이 본다. */
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 16384 },
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
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.[0]?.text || '';
  const finishReason = cand?.finishReason || '';
  let parsed;
  try {
    parsed = parseModelJson(text);
  } catch (e) {
    /* «잘렸다»와 «모델이 JSON을 못 썼다»는 고치는 법이 다르다. 어느 쪽인지 남긴다. */
    return new Response(JSON.stringify({
      error: finishReason === 'MAX_TOKENS' ? 'truncated' : 'parse failed',
      finishReason, raw: text,
    }), {
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

  /* 그림 문항이 어느 길로 갔는지를 클라이언트가 알아야 한다. 셋이 서로 배타적이다.
       needsFigure  — (B). 그림이 있어야 풀리고 그림도 달라져야 한다. figureSpec을 보고 **사람이 그린다.**
                      그림이 붙기 전에는 공개할 수 없다 (index.html advanceBankStatus).
       reuseFigure  — (C). 그림은 배경이라 원본 것을 그대로 쓰고 **본문의 수만** 바뀌었다.
                      사람이 그릴 것이 없다 — 지도·배치도·대진표가 여기로 온다.
       figureFree   — (A). 그림 없이 푸는 문제로 새로 썼다. **원본 그림을 붙이면 안 된다** —
                      글에 값이 다 적혀 있는데 상관없는 그림이 같이 뜨면 그걸 보고 풀려다 틀린다.
       셋 다 아님    — 원본에 그림이 없던 문항.
     ⚠ mode를 안 보내는 옛 모델 응답은 (A)로 본다. 예전 프롬프트가 (A) 하나뿐이었다. */
  const needsFigure = hasImage && parsed.mode === 'figure';
  const reuseFigure = hasImage && parsed.mode === 'reuse';
  /* 남은 한도를 같이 실어 보낸다 — 클라이언트가 스스로 세면 반드시 어긋난다. */
  const q = await peekQuota(env, 'ai', uid, AI_DAILY_LIMIT);
  return new Response(JSON.stringify({
    content: parsed.problem, answer: parsed.answer, solution: parsed.solution || '',
    figureFree: hasImage && !needsFigure && !reuseFigure,
    needsFigure,
    reuseFigure,
    figureSpec: needsFigure ? String(parsed.figureSpec || '') : '',
    quotaUsed: q.used, quotaLimit: q.limit,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
