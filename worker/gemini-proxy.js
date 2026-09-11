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
/* 🔴 «올렸는지 짐작하지 않는다» — 이 워커는 대시보드에 붙여넣어 올리므로 밖에서는 어느 판이 도는지
   알 길이 없었다(2026-09-11에 사용자가 올리고 「도는지 확인은 못 해봤어」). /quota 가 이 값을 같이
   돌려주고 tools/worker-check.mjs 가 저장소의 값과 견준다. **프롬프트나 규칙을 바꾸면 이 날짜를 올릴 것.** */
const WORKER_VERSION = '2026-09-12c';
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
      /* ⚠ 검토는 «다른 통»이다 — 같은 통으로 보이면 화면이 남은 생성을 틀리게 띄운다.
         ?bucket=review 로 물으면 검토 통을 본다. 안 주면 예전대로 생성 통이다. */
      const bucket = url.searchParams.get('bucket') === 'review' ? 'review' : 'ai';
      const limit = bucket === 'review' ? REVIEW_DAILY_LIMIT : AI_DAILY_LIMIT;
      return new Response(JSON.stringify({ ...(await peekQuota(env, bucket, who.uid, limit)), version: WORKER_VERSION }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    /* 할당량은 «비용이 드는 것»에만 건다.
       /delete는 정리 작업이라 막으면 드라이브에 쓰레기가 쌓인다 — 그대로 통과시킨다. */
    if (url.pathname === '/upload') {
      const q = await bumpQuota(env, 'upload', who.uid, UPLOAD_PER_USER_DAILY, null);
      if (!q.ok) return quotaExceeded(q, corsHeaders);
    } else if (url.pathname === '/review') {
      /* 🔴 검토가 «만들기» 한도를 먹으면 안 된다 — 통을 따로 둔다.
         한 문항 검토는 위쪽 요청 1~2건이다(답이 갈릴 때만 둘째 모델을 부른다). */
      const q = await bumpQuota(env, 'review', who.uid, REVIEW_DAILY_LIMIT, REVIEW_DAILY_LIMIT);
      if (!q.ok) return quotaExceeded(q, corsHeaders);
    } else if (url.pathname !== '/delete' && !url.pathname.startsWith('/admin/')) {
      /* 🔴 **관리자 길을 여기서 빼지 않으면 «비밀번호 재설정»이 AI 한도를 먹는다.**
         아래 라우팅이 catch-all 이라, 새 길을 낼 때마다 이 줄을 같이 봐야 한다.
         (한도가 다 차면 비밀번호도 못 바꾸게 되는, 설명하기 어려운 상태가 된다.) */
      // 나머지는 전부 Gemini 생성이다 (기존 라우팅이 catch-all이라 그대로 맞춘다)
      const q = await bumpQuota(env, 'ai', who.uid, AI_DAILY_LIMIT, AI_DAILY_LIMIT);
      if (!q.ok) return quotaExceeded(q, corsHeaders);
    }

    if (url.pathname === '/upload') return handleUpload(request, env, corsHeaders);
    if (url.pathname === '/delete') return handleDelete(request, env, corsHeaders);
    if (url.pathname === '/figure') return handleFigureScene(request, env, corsHeaders, who.uid);
    if (url.pathname === '/review') return handleReview(request, env, corsHeaders, who.uid);
    /* 🔴 **관리자 길은 «강사인지»를 서버에서 본다** — 화면에서 단추를 감추는 것으로는 못 막는다.
       학생도 토큰이 있으니 이 주소를 그대로 부를 수 있다. */
    if (url.pathname === '/admin/reset-pw') return handleAdminResetPw(request, env, corsHeaders, who.uid);
    if (url.pathname === '/admin/delete-user') return handleAdminDeleteUser(request, env, corsHeaders, who.uid);
    /* 🔴 **터져도 한도는 돌려주고, 까닭은 CORS 머리를 달고 나간다** (2026-09-12).
       Cloudflare 의 1101 페이지에는 CORS 머리가 없어 브라우저에는 「Failed to fetch」 다섯 글자만 남는다 —
       고칠 실마리가 하나도 없고, 한도는 부르기 «전»에 세니 누를 때마다 한 건씩 나갔다(실제로 그랬다).
       ⚠ 위쪽(Gemini)의 거절은 handleGeminiTwin 안에서 따로 되돌린다 — 여기는 «우리 코드가 터진 것»만 받는다. */
    try {
      return await handleGeminiTwin(request, env, corsHeaders, who.uid);
    } catch (e) {
      try { await refundQuota(env, 'ai', who.uid); } catch (_) {}
      return new Response(JSON.stringify({ error: 'worker exception', detail: String((e && e.stack) || e).slice(0, 600), refunded: true }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};


/* =================== 관리자 (2026-09-07) =====================================
   🔵 **왜 워커가 해야 하나** — 남의 비밀번호를 바꾸거나 계정을 지우는 것은 «관리자 권한»이다.
     브라우저에서는 아무리 해도 안 된다(자기 것만 바꿀 수 있다). 그래서 서버가 대신 한다.

   🔴 **그래서 이 길은 «강사인지»를 반드시 서버에서 본다.** 화면에서 단추를 감추는 것으로는
     못 막는다 — 학생도 로그인하면 토큰이 있고, 이 주소를 그대로 부를 수 있다.
     판단은 Firestore 의 `teachers/{uid}` 문서가 «있는가» 하나다(firestore.rules 와 같은 잣대).

   ⚠ 서비스 계정 열쇠는 `FIREBASE_SA` 비밀에 JSON 통째로 들어 있다.
     이 열쇠는 **프로젝트 전체를 여는 것**이라 저장소에 두지 않는다. 워커만 안다. */

let saTokenCache = { value: null, expiresAt: 0 };

/* 서비스 계정으로 «구글에게» access token 을 받는다.
   ⚠ 드라이브 쪽(getDriveAccessToken)과 다른 길이다 — 저건 사람이 동의해 준 리프레시 토큰이고,
     이건 서비스 계정이 스스로 서명한 JWT 다. 둘을 섞지 말 것. */
async function getServiceAccountToken(env) {
  const now = Date.now();
  if (saTokenCache.value && now < saTokenCache.expiresAt - 60000) return saTokenCache.value;

  let sa;
  try { sa = JSON.parse(env.FIREBASE_SA); }
  catch (e) { throw new Error('FIREBASE_SA 를 못 읽었다 — JSON 통째로 넣었는지 볼 것'); }
  if (!sa.client_email || !sa.private_key) throw new Error('FIREBASE_SA 에 client_email/private_key 가 없다');

  const iat = Math.floor(now / 1000);
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat, exp: iat + 3600,
  };
  const b64url = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const 머리 = b64url({ alg: 'RS256', typ: 'JWT' });
  const 몸 = b64url(claim);
  const 서명할것 = 머리 + '.' + 몸;

  /* PEM(-----BEGIN PRIVATE KEY-----) 을 WebCrypto 가 받는 꼴로 푼다.
     ⚠ JSON 안의 private_key 는 줄바꿈이 \\n 으로 들어 있다 — 진짜 줄바꿈으로 되돌려야 한다. */
  const pem = String(sa.private_key).replace(/\\n/g, String.fromCharCode(10));
  const 알맹이 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(알맹이), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', raw.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(서명할것));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: 서명할것 + '.' + sigB64,
    }).toString(),
  });
  if (!res.ok) throw new Error('service account token failed: ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  saTokenCache = { value: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return saTokenCache.value;
}

/* 🔴 «강사인가»를 Firestore 에서 본다 — 규칙과 «같은 잣대»를 쓴다.
   ⚠ 관리자 토큰으로 읽으므로 규칙을 지나치지 않는다. 그래도 잣대는 같아야 한다 —
     둘이 갈리면 「화면에서는 강사인데 워커는 아니라고 한다」가 된다. */
async function isTeacher(env, uid) {
  if (!uid) return false;
  const sa = JSON.parse(env.FIREBASE_SA);
  const tok = await getServiceAccountToken(env);
  const url = 'https://firestore.googleapis.com/v1/projects/' + sa.project_id
    + '/databases/(default)/documents/teachers/' + encodeURIComponent(uid);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } });
  return r.status === 200;
}

/* 학번(가짜 이메일)으로 계정을 찾는다 — 화면은 uid 를 모를 수 있다. */
async function lookupUid(env, email) {
  const sa = JSON.parse(env.FIREBASE_SA);
  const tok = await getServiceAccountToken(env);
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + sa.project_id + '/accounts:lookup', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [email] }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j.users && j.users[0] && j.users[0].localId) || null;
}

function adminJson(obj, corsHeaders, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/* 관리자 길의 «앞문» — 강사인지 보고, 부르는 값을 받아 낸다. */
async function adminGate(request, env, corsHeaders, uid) {
  if (!env.FIREBASE_SA) {
    return { 흠: adminJson({ error: 'not_configured',
      detail: '워커에 FIREBASE_SA 비밀이 없습니다.' }, corsHeaders, 503) };
  }
  let ok;
  try { ok = await isTeacher(env, uid); }
  catch (e) { return { 흠: adminJson({ error: 'admin_error', detail: String(e.message || e).slice(0, 200) }, corsHeaders, 500) }; }
  /* ⚠ 「강사가 아니다」와 「못 물어봤다」를 가른다 — 위에서 못 물어보면 500 으로 나갔다.
     여기 오면 물어봤고 아니라는 뜻이다. */
  if (!ok) return { 흠: adminJson({ error: 'forbidden', detail: '강사만 할 수 있습니다.' }, corsHeaders, 403) };
  let body;
  try { body = await request.json(); } catch (e) { body = {}; }
  return { body };
}

/* 비밀번호 재설정 — { email } 또는 { uid } 와 { password } */
async function handleAdminResetPw(request, env, corsHeaders, callerUid) {
  const g = await adminGate(request, env, corsHeaders, callerUid);
  if (g.흠) return g.흠;
  const { email, uid, password } = g.body;
  if (!password || String(password).length < 6)
    return adminJson({ error: 'bad_password', detail: '비밀번호는 6자 이상이어야 합니다.' }, corsHeaders, 400);

  const localId = uid || (email ? await lookupUid(env, email) : null);
  if (!localId) return adminJson({ error: 'no_such_user', detail: '그런 계정이 없습니다.' }, corsHeaders, 404);

  const sa = JSON.parse(env.FIREBASE_SA);
  const tok = await getServiceAccountToken(env);
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + sa.project_id + '/accounts:update', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId, password: String(password) }),
  });
  if (!r.ok) return adminJson({ error: 'update_failed', detail: (await r.text()).slice(0, 200) }, corsHeaders, 502);
  return adminJson({ ok: true, uid: localId }, corsHeaders);
}

/* 계정 삭제 — { email } 또는 { uid }
   🔴 지우면 되돌릴 수 없다. 그래서 «누구를 지우는지»를 그대로 돌려준다 — 화면이 확인할 수 있게. */
async function handleAdminDeleteUser(request, env, corsHeaders, callerUid) {
  const g = await adminGate(request, env, corsHeaders, callerUid);
  if (g.흠) return g.흠;
  const { email, uid } = g.body;
  const localId = uid || (email ? await lookupUid(env, email) : null);
  if (!localId) return adminJson({ ok: true, uid: null, detail: '이미 없습니다.' }, corsHeaders);
  /* ⚠ 자기 자신은 못 지운다 — 강사가 실수로 제 계정을 지우면 아무도 못 들어온다. */
  if (localId === callerUid)
    return adminJson({ error: 'self_delete', detail: '자기 계정은 여기서 못 지웁니다.' }, corsHeaders, 400);

  const sa = JSON.parse(env.FIREBASE_SA);
  const tok = await getServiceAccountToken(env);
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + sa.project_id + '/accounts:delete', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId }),
  });
  if (!r.ok) return adminJson({ error: 'delete_failed', detail: (await r.text()).slice(0, 200) }, corsHeaders, 502);
  return adminJson({ ok: true, uid: localId }, corsHeaders);
}

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

/* 🔴 **위쪽(Gemini)이 엎어지면 한 건을 돌려준다** (2026-09-06 · 사용자가 「실패율이 너무높아」).
   여기는 Gemini 를 부르기 «전»에 센다(라우팅 문턱). 그래서 Gemini 가 429(한도)나
   503(붐빔)을 내면 **아무것도 못 받고 하루치만 깎인다.** 실측으로 둘 다 나왔다.
   🔵 «우리가 쓴 것»은 답을 받은 것이라야 한다 — 못 받았으면 안 쓴 것이다.
   ⚠ **모든 실패에 돌려주면 안 된다.** 모델이 이상한 답을 내서 우리가 못 읽은 것은
     Gemini 를 진짜로 쓴 것이다(돈이 나갔다). **위쪽이 거절한 것만** 돌려준다.
   ⚠ 0 아래로 안 내려간다 — 다른 창에서 동시에 쓰면 셈이 어긋날 수 있다. */
async function refundQuota(env, bucket, uid) {
  if (!env.QUOTA) return;
  const day = quotaDay();
  const uKey = `q:${bucket}:${uid}:${day}`;
  const gKey = `q:${bucket}:_all:${day}`;
  const [uRaw, gRaw] = await Promise.all([env.QUOTA.get(uKey), env.QUOTA.get(gKey)]);
  const opts = { expirationTtl: 60 * 60 * 48 };
  await Promise.all([
    env.QUOTA.put(uKey, String(Math.max(0, Number(uRaw || 0) - 1)), opts),
    env.QUOTA.put(gKey, String(Math.max(0, Number(gRaw || 0) - 1)), opts),
  ]);
}
/* 위쪽이 «거절»한 것인가 — 429(한도) · 5xx(붐빔·장애). 그 밖은 우리가 쓴 것이다. */
function upstreamRefused(status) { return status === 429 || (status >= 500 && status <= 599); }

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

  /* 🔴 **서식은 장식이 아니라 «구조»다** (2026-09-07 · 사용자가 짚었다 —
       「원본문항의 서식이 달라졌어. 조건박스도 사라지고 (가) 이것도 박스가 들어가야 하는건데」).
     화면(`problemHTML`)은 평문에서 두 가지를 읽어 그린다 —
       ① `| … |` 로 시작·끝나는 줄  → 조건·증명 «상자»
       ② 수식 «밖»의 맨 `(가)`      → 답을 넣을 «네모칸»
     Gemini 가 이 둘을 모르면 증명 과정이 줄글이 되고 (가)가 글에 묻힌다.
     ⚠ `\\text{(가)}` 로 쓰면 수식 «안»이라 네모가 안 생긴다 — 원본은 수식을 끊고 밖에 둔다. */
  const layoutRule = `문제 본문의 서식 규칙입니다. 원본의 구조를 그대로 유지하세요.
1. 원본에 조건 상자·증명 과정 상자(각 줄이 | 로 시작해서 | 로 끝나는 줄들)가 있으면, 변형 문제에도 반드시 같은 방식으로 만드세요. 상자에 들어갈 각 줄은 반드시 "| 내용 |" 형태로 쓰세요.
2. (가) (나) (다) 처럼 빈칸을 나타내는 표시는 반드시 수식 밖에 일반 텍스트로 쓰세요. \\text{(가)} 나 $(가)$ 처럼 수식 안에 넣지 마세요. 수식 도중에 빈칸이 오면 수식을 잠시 닫고 쓰세요. 예: $a^2 + b^2 = $(가)$ + c^2$
3. [보기] 상자가 원본에 있으면 첫 줄을 "| [보기] |" 로 두고 그 아래 줄들을 이어 쓰세요.
4. 객관식 보기 ①~⑤ 는 상자 밖에, 각각 새 줄에 쓰세요.`;
  const jsonSchemaRule = `반드시 아래 JSON 형식으로만 답하세요. 다른 설명, 인사말, 코드블록 기호는 절대 포함하지 마세요.
{"mode": "text" 또는 "figure" 또는 "reuse" (그림이 없는 문제면 언제나 "text"), "problem": "새 문제 내용 (객관식이면 보기 ①~⑤까지 이 안에 포함)", "answer": "999 이하 자연수 또는 보기 기호 ①~⑤ 중 하나", "solution": "단계별 풀이 과정을 1. 2. 3. 처럼 번호를 매겨 서술 (검토자가 정답을 검증할 수 있도록, 마크다운 기호 없이 일반 텍스트로). **여섯 단계 이내로, 각 단계는 두 줄을 넘기지 마세요.**", "figureSpec": "mode가 figure일 때만 채우고, 아니면 빈 문자열", "scene": mode가 figure이고 그림이 ①(좌표평면 위의 그림)이면 아래 [장면 형식]의 JSON 객체, 그 밖에는 null}`;

  let effectiveImage = image;
  if ((!effectiveImage || typeof effectiveImage !== 'string') && imageFileId) {
    try {
      effectiveImage = await fetchDriveFileAsDataUrl(imageFileId, env);
    } catch (e) {
      console.error('drive image fetch failed', e);
    }
  }
  const hasImage = typeof effectiveImage === 'string' && effectiveImage.startsWith('data:');
  /* 🔵 **(B)의 그림은 쌍둥이를 만드는 «그 자리»에서 낸다** (2026-09-12 · 사용자 제안 — 「문항을 제작할 땐 답까지 산출하면서
     모든 문제의 상황을 인지한 상태니까 그당시에 그리게 하면 더 정확」). 따로 부르는 /figure 는 네 줄 지침만 보고 그리므로
     본문·정답과 어긋날 수 있었고, 한도도 둘 들었다. 검산은 여전히 화면(figure.js)이 한다 — 걸리면 그림 없이 (B)로 남고
     「초안 그려 보기」가 다시 시도하는 길로 남는다. */
  /* 🔴 **여기가 hasImage «뒤»여야 한다** — 09-12b 에서 앞에 두어 ReferenceError(TDZ)로 **모든 쌍둥이 호출이 터졌고**,
     한도는 부르기 전에 세니 한 번 누를 때마다 한 건씩 태웠다. 브라우저에는 CORS 머리 없는 1101 페이지라 「Failed to fetch」로만 보였다. */
  const sceneRule = hasImage ? `
[장면 형식] — "scene" 에 넣을 것. mode가 figure이고 그림이 ①이면 **반드시** 채우세요. 새 문제의 본문·정답과 같은 수로.
${SCENE_FORMAT}` : '';
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
     그림을 남기면서 수까지 그대로 두는 «소재만 바꾸기»는 (B)에서도 금지된다.

     🔵 **2026-09-11 · 세 번째 — «함수 그래프»는 (B)를 먼저 고른다.**
     C→A→B 는 (B)의 대가가 «사람이 그린다»였을 때의 순서다. 그 사이 (B)의 함수 그래프는
     기계가 그리고(/figure → figure.js) 수치로 검산하고 편집기로 다듬게 됐다 — 대가가 사라졌다.
     그리고 (A)는 그래프를 글로 옮기면서 **원본보다 길고 어려운 문제**를 만든다(2026-08-11 사용자 확인).
     사용자의 말 — 「그림 변형을 아예 안 하려고만 하는 것처럼 느껴진다」. 맞는 지적이었다.
     ⚠ 통째로 B 우선으로 뒤집지는 않는다 — 도형·지도·입체는 여전히 사람이 그리므로
       그것들까지 (B)로 몰리면 「그림 필요」 큐가 사람 몫으로 찬다. **«기계가 그릴 수 있나»로 가른다.**
       장면 v2(선분·원·각)가 생기면 이 첫 줄의 범위만 넓히면 된다. */
  const taskRule = hasImage
    ? `다음은 고등학교 수학 문제와 정답이고, 문제에 첨부된 그림(그래프/도형/표)도 같이 드립니다. 이 문제와 같은 개념·난이도를 묻는 "쌍둥이 문제" 1개를 새로 만들어주세요.

먼저 그림이 무엇인지 보고 아래 갈래 중 하나를 고르세요. 어느 것을 고르든 **원본과 다른 문제가 되어야 합니다** — 수가 그대로면 그것은 쌍둥이가 아니라 원본입니다.

**① 그림이 «좌표평면 위의 그림»이면 무조건 (B)입니다.** 다른 갈래를 따지지 마세요. 두 가지가 여기 듭니다.
  - 함수 그래프: x축·y축이 있는 좌표평면 위에 직선·포물선·곡선(다항함수, 유리·무리함수, 지수·로그, 삼각함수)이 그려진 그림. 교점·꼭짓점·절편이 표시되어 있어도 그렇습니다.
  - 좌표가 있는 도형: 좌표평면 위에 **꼭짓점·중심·끝점의 좌표를 알 수 있는** 삼각형·사각형·선분·원·각이 그려진 그림 (점 A(1,2) 같은 표시, 또는 본문에 좌표가 적혀 있는 것). 넓이·거리·중점·수직 조건도 좌표로 검산할 수 있습니다.
  - 이런 그림은 **기계가 지침을 받아 새로 그리고 수치로 검산합니다.** 사람이 그리지 않으니 (B)를 피할 이유가 없습니다.
  - 그래프를 글로 옮기면 원본보다 길고 어려운 문제가 됩니다 — **(A)로 도망가지 마세요.** 그래프를 «읽는» 문제는 그래프를 «읽는» 문제로 남아야 쌍둥이입니다.
  - ⚠ **좌표평면이 없는** 도형(좌표 없이 길이·각만 적힌 삼각형, 입체도형, 전개도)은 여기 들지 않습니다 — ②로 가세요.

**② 그 밖의 그림은 (C) → (A) → (B) 순으로 따져 보고, 앞의 것이 성립하면 뒤의 것을 고르지 마세요.** 뒤로 갈수록 사람이 손으로 해야 할 일이 늘어납니다. 다만 성립하지 않는데 억지로 앞의 것을 고르면 안 됩니다 — 각 갈래의 조건을 그대로 지키세요.

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
  - 그림이 좌표평면 위의 그림이다 (①)
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
  - "figureSpec"에 그 그림을 그릴 지침을 쓰세요. 함수 그래프면 기계가, 그 밖은 사람이 이 지침을 보고 그립니다. 형식은 아래와 같습니다.
  - 좌표평면 위의 그림(①)의 figureSpec에는 **식이나 좌표를 세울 수 있는 수**를 적으세요 — 함수면 x절편·꼭짓점·교점의 x좌표·특정 x에서의 값, 도형이면 **모든 꼭짓점·중심의 좌표와 반지름**처럼 «검산할 수 있는 조건»이어야 기계가 그립니다. 「대략 오른쪽으로 옮긴다」 같은 말로는 못 그립니다.

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
${layoutRule}
${jsonSchemaRule}
${sceneRule}

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
    /* 🔴 **위쪽이 거절했으면 한 건을 돌려준다** (2026-09-06 · 실측 429·503 둘 다 나왔다).
       한도는 Gemini 를 부르기 «전»에 센다(라우팅 문턱). 안 그러면 아무것도 못 받고
       하루치만 깎인다 — 위쪽이 붐비는 날은 20건을 통째로 버린다.
       ⚠ 모델이 «이상한 답»을 낸 것은 쓴 것이다(돈이 나갔다) — 그건 안 돌려준다. */
    if (upstreamRefused(geminiRes.status)) await refundQuota(env, 'ai', uid);
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
    /* (B)면 함께 온 장면. 검산은 화면이 한다 — 여기서는 «꼴»만 본다(객체이고 kind 가 graph). */
    scene: (needsFigure && parsed.scene && typeof parsed.scene === 'object' && parsed.scene.kind === 'graph') ? parsed.scene : null,
    quotaUsed: q.used, quotaLimit: q.limit,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/* 장면(scene) 형식 — «무엇을 그릴지»의 데이터. 🔴 두 곳이 같은 글을 본다: (1) 쌍둥이를 만들 때 (B)면 함께 내고,
   (2) 「초안 그려 보기」/「다시 그려 보기」로 지침만 보고 따로 낸다. 한 벌만 고치면 조용히 어긋난다.
   스키마의 진실은 figure.js 머리말이다 — 여기는 «모델에게 시킬 만큼»으로 줄인 판. */
const SCENE_FORMAT = `{"kind": "graph" 또는 "unsupported",
 "reason": "kind가 unsupported일 때만, 왜 못 그리는지 한 문장",
 "curves": [{"expr": "x에 대한 산술식", "label": "y=f(x)"}],
 "points": [{"x": 숫자, "curve": 곡선번호, "dot": true, "dropTo": "axis" 또는 null, "label": "P", "labelPos": "above"}],
 "segments": [{"from": [x, y], "to": [x, y], "dash": false, "label": ""}],
 "polygons": [{"pts": [[x, y], [x, y], [x, y]], "fill": false, "label": ""}],
 "circles": [{"c": [x, y], "r": 숫자, "label": ""}],
 "angles": [{"at": [x, y], "from": [x, y], "to": [x, y], "right": true}],
 "xTicks": [숫자들], "yTicks": [숫자들],
 "axis": {"xLabel": "x", "yLabel": "y", "origin": "O"},
 "checks": [ … 아래 참고 … ]}

[expr — 식을 쓰는 법]
- 변수는 x 하나뿐입니다. 순수 산술식으로 쓰세요. **LaTeX를 쓰지 마세요** ($, \\frac, ^{} 모두 금지).
- 쓸 수 있는 것: 숫자 · x · + - * / ^ · 괄호 · abs sqrt sin cos tan exp ln log log10 · pi e
- 예: "-(x-2)*(x-6)"  "0.5*x^2 - 3*x + 1"  "sqrt(x+4)"  "abs(x-1)"
- 그 밖의 이름을 쓰면 그림이 통째로 버려집니다.

[checks — 이것이 이 응답의 핵심입니다]
지침에 적힌 수가 그림에서 **실제로 그렇게 되는지** 기계가 검산합니다. 하나라도 어긋나면
이 초안은 버려지고 사람이 손으로 그리게 됩니다. 지침의 「달라지는 것」과 「반드시 표시할 값」에
나오는 수를 빠짐없이 checks로 옮기세요.
- {"type": "root", "curve": 0, "x": 2}                 곡선0이 x=2에서 x축과 만난다
- {"type": "intersect", "curves": [0, 1], "x": 1}      곡선0과 곡선1이 x=1에서 만난다
- {"type": "value", "curve": 0, "x": 4, "y": 4}        곡선0의 x=4에서의 값이 4다
- {"type": "convex", "curve": 0, "dir": "down"}        "down"=위로 볼록(∩) · "up"=아래로 볼록(∪)
도형이면 (좌표는 [x, y] 두 수):
- {"type": "dist", "a": [0, 0], "b": [4, 3], "d": 5}        두 점 사이의 거리가 5
- {"type": "right", "at": [4, 0], "from": [0, 0], "to": [4, 3]}   at 에서의 각이 직각
- {"type": "oncircle", "circle": 0, "p": [4, 1]}            점이 원0 위에 있다
- {"type": "midpoint", "m": [2, 1.5], "a": [0, 0], "b": [4, 3]}   m 이 a·b 의 중점
- {"type": "collinear", "pts": [[0, 0], [2, 1], [4, 2]]}     세 점이 한 직선 위
- {"type": "area", "polygon": 0, "a": 6}                     다각형0의 넓이가 6
- {"type": "oncurve", "curve": 0, "p": [1, -5]}              점이 곡선0 위에 있다
[도형을 쓰는 법]
- 꼭짓점에 이름이 있으면 **points 에 {"x", "y", "label"} 로** 찍으세요 (y 를 직접 줍니다). 도형 자체는 polygons/segments/circles 로.
- 좌표는 문제의 조건에서 **계산해서** 넣으세요. 원 위의 점이면 중심과 반지름에서, 직각이면 내적이 0이 되게. 눈대중으로 찍으면 검산에서 걸립니다.
- 도형이 하나라도 있으면 그리는 쪽이 x·y 축의 비율을 같게 맞춥니다 — 원은 원으로 보입니다. xRange·yRange 는 여전히 쓰지 마세요.

[식을 «유도»하세요 — 임의로 쓰고 맞기를 바라지 마세요]
조건이 여럿이면 그 조건을 만족하도록 식을 세워야 합니다.
- x절편이 p, q이고 위로 볼록한 이차함수 → "-(x-p)*(x-q)"
- f와 x=m, n에서 만나는 또 하나의 곡선 g → "(f의 식) + k*(x-m)*(x-n)" 꼴로 두고 k를 정합니다.
  f가 위로 볼록일 때 g를 아래로 볼록으로 만들려면 k > 1이어야 합니다 (k=2가 무난합니다).
- 이렇게 세우면 checks가 저절로 맞습니다. 숫자를 찍어 넣고 맞기를 바라면 거의 틀립니다.

[그 밖의 규칙]
- **xRange·yRange는 쓰지 마세요.** 보기 좋은 창은 그리는 쪽이 알아서 잡습니다.
- xTicks에는 지침의 「반드시 표시할 값」 중 x축에 적어야 하는 수만 넣으세요.
- points는 교점·특별한 점입니다. "dropTo": "axis"를 주면 그 점에서 x축으로 점선이 내려갑니다.
- label에도 LaTeX를 쓰지 마세요. "y=f(x)"처럼 그대로 씁니다.

[unsupported로 답해야 하는 경우]
좌표평면 위의 **함수 그래프**와 **좌표가 있는 도형**(선분·다각형·원·각)만 그릴 수 있습니다. 아래는 반드시 "unsupported"입니다.
지도·구역도·인접 관계도 · 대진표·수형도 · 입체도형 · 사진이나 실물 그림 · 표 ·
좌표평면이 **없는** 도형(좌표 없이 길이·각만 적힌 삼각형, 전개도) · 좌표를 계산해 낼 수 없는 그림.
**그럴듯하게 비슷한 것을 지어내지 마세요.** 못 그린다고 답하면 사람이 그립니다 — 그것이 옳습니다.`;

/* =================== 그림 «장면(scene)» 생성 — (B)의 초안 ===================

   ⚠ 여기서 만드는 것은 **그림이 아니라 «무엇을 그릴지»를 적은 데이터**다.
   모델에게 그리게 하면 그럴듯한데 좌표가 틀린 그림이 나오고, 그 순간 문제가 거짓이 된다.
   그리는 것은 클라이언트의 figure.js이고, 이 응답은 그 입력일 뿐이다.

   **검산은 여기서 하지 않는다.** 규칙이 두 벌이 되면 워커와 화면이 다른 판정을 내리는데,
   막는 쪽은 화면이므로 진실도 거기 하나여야 한다 → index.html이 Figure.verifyScene()으로
   받자마자 검문하고, 통과 못 한 초안은 버린다 (「그림 필요」에 그대로 남는다).

   ⚠ 이 경로도 **하루 20건 한도를 하나 쓴다** (위 라우팅의 else-if가 /upload·/delete만 비켜 간다).
   그래서 클라이언트는 «일괄 생성»에서 이걸 부르지 않는다 — 검토자가 「초안 그려 보기」를
   누를 때만 부른다. 안 그러면 (B) 하나가 한도를 둘씩 먹는다. */

async function handleFigureScene(request, env, corsHeaders, uid) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { spec, content, image, imageFileId } = body;
  if (!spec) {
    return new Response(JSON.stringify({ error: 'missing spec' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let effectiveImage = image;
  if ((!effectiveImage || typeof effectiveImage !== 'string') && imageFileId) {
    try { effectiveImage = await fetchDriveFileAsDataUrl(imageFileId, env); }
    catch (e) { console.error('drive image fetch failed', e); }
  }
  const hasImage = typeof effectiveImage === 'string' && effectiveImage.startsWith('data:');

  /* 스키마는 figure.js 머리말과 **같은 것**이어야 한다. 한쪽만 고치면 조용히 어긋난다.
     여기 적는 것은 «모델에게 시킬 만큼»으로 줄인 판이다 — v1에서 실제로 쓰는 갈래만 남겼다. */
  const schemaRule = `아래 JSON 형식으로만 답하세요. 설명·인사말·코드블록 기호를 절대 붙이지 마세요.

${SCENE_FORMAT}`;

  const prompt = `당신은 고등학교 수학 문제의 그림을 «좌표평면 위의 함수 그래프와 도형»으로 옮겨 적는 사람입니다.
아래는 원본 문제의 그림${hasImage ? '(첨부)' : ''}과, 그 그림을 어떻게 바꿔 그려야 하는지 적은 지침,
그리고 그 그림이 붙을 새 문제의 본문입니다.
**지침대로 바뀐 «새» 그림**을 아래 JSON 형식으로 적어 주세요. 원본 그림을 그대로 옮기는 것이 아닙니다.

${schemaRule}

[그리는 지침]
${spec}

[이 그림이 붙을 새 문제]
${content || '(본문 없음)'}`;

  const parts = [{ text: prompt }];
  if (hasImage) {
    const m = effectiveImage.match(/^data:([^;]+);base64,(.*)$/s);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
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
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
        }),
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'gemini request failed', detail: String(e) }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!geminiRes.ok) {
    /* 🔴 **위쪽이 거절했으면 한 건을 돌려준다** (2026-09-06 · 실측 429·503 둘 다 나왔다).
       한도는 Gemini 를 부르기 «전»에 센다(라우팅 문턱). 안 그러면 아무것도 못 받고
       하루치만 깎인다 — 위쪽이 붐비는 날은 20건을 통째로 버린다.
       ⚠ 모델이 «이상한 답»을 낸 것은 쓴 것이다(돈이 나갔다) — 그건 안 돌려준다. */
    if (upstreamRefused(geminiRes.status)) await refundQuota(env, 'ai', uid);
    return new Response(JSON.stringify({ error: 'gemini error', detail: await geminiRes.text() }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await geminiRes.json();
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.[0]?.text || '';
  const finishReason = cand?.finishReason || '';
  let scene;
  try {
    /* 쌍둥이와 같은 복구를 거친다 — 여기는 LaTeX가 없어야 정상이지만, 모델이 label에
       $를 붙여 보내는 일이 있고 그때 역슬래시가 같은 방식으로 깨진다. */
    scene = parseModelJson(text);
  } catch (e) {
    return new Response(JSON.stringify({
      error: finishReason === 'MAX_TOKENS' ? 'truncated' : 'parse failed',
      finishReason, raw: text,
    }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const q = await peekQuota(env, 'ai', uid, AI_DAILY_LIMIT);
  /* «못 그린다»는 실패가 아니다 — 200으로 돌려준다. 화면은 이걸 받아 「사람이 그리세요」로 간다.
     502로 돌리면 화면이 «워커가 고장났다»와 구분할 수 없다. */
  if (!scene || scene.kind !== 'graph' || !Array.isArray(scene.curves) || !scene.curves.length) {
    return new Response(JSON.stringify({
      unsupported: true,
      reason: (scene && scene.reason) || '이 그림은 좌표평면 위의 함수 그래프로 옮길 수 없습니다.',
      quotaUsed: q.used, quotaLimit: q.limit,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ scene, quotaUsed: q.used, quotaLimit: q.limit }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/* =================== 검토: 다른 AI가 «직접 풀어» 맞대 본다 =================== */

/* 🔴 **모델에게 「이 문제 괜찮나요?」라고 묻지 않는다.** 그렇게 물으면 대개 괜찮다고 한다.
     정답을 «숨기고» 직접 풀린 뒤 맞대 본다. 그래서 프롬프트에 정답이 절대 안 들어간다 —
     들어가면 「맞다」가 공짜로 나오고, 검토는 하나 마나가 된다.

   🔴 **만든 AI의 «해설»도 안 보여 준다.** 제작 AI가 틀린 변형을 만들었으면 해설도 같이
     틀려 있다. 그 해설을 검토 AI에게 보여 주면 틀린 논리를 그대로 따라가 같은 오답에 닿는다.
     즉 정작 잡아야 할 문항에서 검토가 무력해진다. 해설은 판정 «뒤»에 사람에게 보여 줄 것이다.

   🔵 **답이 갈렸을 때 「AI가 틀렸다」와 「AI가 못 풀었다」를 가른다.**
     실측: 쉬운 문항이 섞이면 96.7% 지만 어려운 문항만 모으면 75% 였다(2026-09-06).
     그 25%는 대개 문항이 잘못된 게 아니라 AI가 못 푼 것이다. 그걸 「답이 다릅니다」로
     올리면 선생님이 헛일을 한다. 그래서 계보가 «다른» 모델을 하나 더 부른다 —
       · 둘이 «같은» 다른 답  → 🔴 문항·정답이 의심스럽다 (사람에게 최우선)
       · 둘째가 창고와 일치   → ✅ 통과 (첫째가 혼자 틀린 것)
       · 셋이 다 다름         → ⚪ 검토 못 함 (문항은 건드리지 않는다)
     ⚠ 난이도 라벨(SCENE)로 가르지 않는다 — 엔딩크레딧 교재에만 있어 다음 교재에서 무너진다.

   ⚠ 값은 «갈린 것»에만 든다 — 대부분은 한 번으로 끝난다. 전부 두 번 부르면 값이 두 배다. */

const REVIEW_DAILY_LIMIT = 60;
const REVIEW_MODEL_A = 'openai/gpt-oss-120b';
const REVIEW_MODEL_B = 'qwen/qwen3.8-27b';
const REVIEW_MAX_TOKENS = 4000;
/* ⚠ max_tokens 를 분당 한도(8000)와 같게 주면 «자리 예약»에 걸려 통이 비어 있지 않아도
     매 요청이 429 다 (2026-09-06 실측). 어려운 문항의 실제 필요치는 3,700 토큰이었다. */

const REVIEW_PROMPT = [
  '너는 고등학교 수학 문제를 푸는 사람이다. 아래 문제를 직접 풀어라.',
  '풀이를 간단히 적은 뒤, 마지막 줄에 반드시 다음 꼴로만 답을 적어라:',
  '정답: <답>',
  '객관식(①~⑤)이면 기호 하나만, 아니면 숫자만 적어라. 다른 말을 덧붙이지 마라.',
].join(String.fromCharCode(10));

const REVIEW_CIRCLES = ['①', '②', '③', '④', '⑤'];
const RV_BS = String.fromCharCode(92);

/* 「분수」와 「16/3」이 같은 값임을 알아본다 — 앞자리만 떼면 맞은 답이 틀린 답이 된다. */
const RV_FRAC = new RegExp(RV_BS + RV_BS + 'd?frac' + RV_BS + 's*' + RV_BS + '{([^{}]*)' + RV_BS + '}' + RV_BS + 's*' + RV_BS + '{([^{}]*)' + RV_BS + '}', 'g');
const RV_LR = new RegExp(RV_BS + RV_BS + 'left|' + RV_BS + RV_BS + 'right', 'g');
function reviewValueForm(t) {
  return String(t)
    .replace(RV_FRAC, '$1/$2')
    .replace(RV_LR, '')
    .replace(/[$\s{}]/g, '')
    .replace(/^\(|\)$/g, '');
}

/* 본문에서 보기 다섯을 갈라낸다 — 창고에 보기가 따로 없어서 글에서 읽어야 한다. */
function reviewChoices(text) {
  const s = String(text || '');
  const at = REVIEW_CIRCLES.map((d) => s.lastIndexOf(d));
  if (at.some((i) => i < 0)) return null;
  for (let i = 1; i < 5; i++) if (at[i] < at[i - 1]) return null;
  const edge = at.concat([s.length]);
  return REVIEW_CIRCLES.map((d, i) => reviewValueForm(s.slice(edge[i] + d.length, edge[i + 1])));
}

/* 창고 정답이 어떤 꼴인가. 객관식도 숫자도 아니면 검토하지 않는다. */
function reviewAnswerKind(a) {
  const s = String(a == null ? '' : a).trim();
  if (/^[①②③④⑤]$/.test(s)) return { kind: 'choice', v: s };
  const m = s.replace(/\$/g, '').replace(/\s/g, '');
  if (/^-?\d{1,4}$/.test(m)) return { kind: 'number', v: String(Number(m)) };
  return null;
}

/* 모델이 낸 마지막 「정답:」 줄을 읽는다. */
function reviewPickAnswer(text) {
  const lines = String(text || '').split(String.fromCharCode(10)).map((s) => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/정답\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const s = m[1].replace(/[*`]/g, '').trim();
    const c = s.match(/[①②③④⑤]/); if (c) return c[0];
    const bare = s.replace(/[$\s]/g, '');
    if (/^-?\d{1,4}$/.test(bare)) return String(Number(bare));
    return reviewValueForm(s).slice(0, 24);
  }
  return '';
}

/* 🔴 «같은 답을 다르게 적은 것»을 다르다고 하면 안 된다 — 없는 불일치가 사람을 헛일시킨다.
   실측 세 가지: 「2」와 「②」 · 「-10」과 ①(=-10) · 「16/3」과 ②(=16/3).
   ⚠ 반대쪽도 지킨다 — 2 를 «언제나» ② 로 보면 답이 2 인 주관식에서 아무 번호나 맞게 된다. */
function reviewSameAnswer(given, want, kind, text) {
  if (!given) return false;
  if (given === want) return true;
  if (kind !== 'choice') return false;
  const n = String(given).match(/^([1-5])$/);
  if (n) return REVIEW_CIRCLES[Number(n[1]) - 1] === want;
  const ch = reviewChoices(text);
  if (!ch) return false;
  const i = REVIEW_CIRCLES.indexOf(want);
  return i >= 0 && ch[i] !== '' && ch[i] === reviewValueForm(given);
}

/* 한 모델에게 «한 번» 풀린다. 돌아오는 것은 답 하나이거나, 왜 못 냈는지다. */
async function reviewSolve(model, content, env) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.GROQ_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: REVIEW_MAX_TOKENS,
      messages: [
        { role: 'system', content: REVIEW_PROMPT },
        { role: 'user', content },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) return { refused: upstreamRefused(res.status), status: res.status, detail: text.slice(0, 200) };
  let j; try { j = JSON.parse(text); } catch (e) { return { detail: '응답을 못 읽음' }; }
  const ch = j.choices && j.choices[0];
  const body = (ch && ch.message && ch.message.content) || '';
  const answer = reviewPickAnswer(body);
  /* ⚠ 답이 없는데 finish_reason 이 length 면 «못 푼 것»이 아니라 «적기 전에 잘린 것»이다.
     그걸 틀림으로 세면 모델을 억울하게 깎고, 없는 불일치를 만든다. */
  if (!answer && ch && ch.finish_reason === 'length') return { truncated: true };
  return { answer, tokens: (j.usage && j.usage.total_tokens) || 0 };
}

async function handleReview(request, env, corsHeaders, uid) {
  const send = (body, status) => new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  if (!env.GROQ_KEY) {
    await refundQuota(env, 'review', uid);
    return send({ error: 'no key', detail: 'GROQ_KEY 비밀이 워커에 없습니다' }, 500);
  }

  let body;
  try { body = await request.json(); } catch (e) { body = null; }
  const content = body && String(body.content || '').trim();
  const stored = body && reviewAnswerKind(body.answer);
  if (!content || !stored) {
    /* 위쪽에 아무것도 안 보냈으니 한도를 먹지 않는다. */
    await refundQuota(env, 'review', uid);
    return send({ error: 'bad request', detail: '본문과 «①~⑤ 또는 숫자» 정답이 있어야 검토합니다' }, 400);
  }

  const a = await reviewSolve(REVIEW_MODEL_A, content, env);
  if (a.refused) {
    /* 🔵 못 받았으면 안 쓴 것이다 — 하루치를 돌려준다. */
    await refundQuota(env, 'review', uid);
    return send({ error: 'upstream', status: a.status, detail: a.detail }, 503);
  }
  if (a.truncated || !a.answer) {
    return send({ verdict: 'unsure', reason: a.truncated ? 'truncated' : 'no-answer', models: [REVIEW_MODEL_A] });
  }
  if (reviewSameAnswer(a.answer, stored.v, stored.kind, content)) {
    return send({ verdict: 'agree', answer: a.answer, models: [REVIEW_MODEL_A] });
  }

  /* 여기서부터가 «갈린» 경우다. 계보가 다른 모델을 하나 더 부른다. */
  const b = await reviewSolve(REVIEW_MODEL_B, content, env);
  if (b.refused) {
    return send({ verdict: 'unsure', reason: 'second-refused', first: a.answer, models: [REVIEW_MODEL_A] });
  }
  if (b.truncated || !b.answer) {
    return send({ verdict: 'unsure', reason: 'second-no-answer', first: a.answer, models: [REVIEW_MODEL_A, REVIEW_MODEL_B] });
  }
  if (reviewSameAnswer(b.answer, stored.v, stored.kind, content)) {
    /* 둘째가 창고와 맞았다 — 첫째가 혼자 틀린 것이다. 통과시키되 그 사실은 남긴다. */
    return send({ verdict: 'agree', answer: b.answer, lone: a.answer, models: [REVIEW_MODEL_A, REVIEW_MODEL_B] });
  }
  if (a.answer === b.answer || reviewSameAnswer(a.answer, b.answer, 'choice', content)) {
    /* 🔴 계보가 다른 두 모델이 «같은» 다른 답에 닿았다 — 문항이나 정답을 의심할 이유가 가장 크다. */
    return send({ verdict: 'suspect', answer: a.answer, stored: stored.v, models: [REVIEW_MODEL_A, REVIEW_MODEL_B] });
  }
  /* 셋이 다 다르다 — 문항이 이상한 게 아니라 AI가 못 푼 것이다. 문항은 건드리지 않는다. */
  return send({ verdict: 'unsure', reason: 'disagree', first: a.answer, second: b.answer, models: [REVIEW_MODEL_A, REVIEW_MODEL_B] });
}
