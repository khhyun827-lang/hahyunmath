/* =============================================================
   hahyunmath Gemini 프록시 — Firebase ID 토큰 검증판 (참조 구현)

   이 파일은 «지금 배포돼 있는 워커»가 아니다. 원본 소스가 저장소에 없어서
   index.html이 부르는 계약(엔드포인트·헤더·응답 모양)에 맞춰 새로 쓴 것이다.
   실제 워커에 이 파일의 «인증·할당량» 부분을 옮겨 붙이는 것이 목표다.

   바꾸는 이유 — AI_SITE_TOKEN은 정적 클라이언트에 그대로 실려 나가서
   처음부터 비밀이 될 수 없는 값이었다. 회전해도 새 값이 똑같이 공개된다.
   게다가 일 20건 제한이 클라이언트에만 있어서(index.html:731,758)
   토큰만 있으면 이 워커를 직접 루프로 호출해 비용을 태울 수 있었다.

   ⚠ 익명 로그인이라는 점을 알고 가야 한다.
   index.html:5401이 signInAnonymously()다. 따라서 여기서 검증하는 «유효한 ID 토큰»은
   «강사»가 아니라 «이 사이트를 연 사람»을 뜻한다. 이걸로 강사만 걸러낼 수는 없다.
   이 변경이 실제로 사주는 것은 셋이다.
     1. 영구 정적 비밀이 사라진다 (1시간 만료 · 회수 가능한 토큰으로 대체)
     2. 할당량을 «서버»에서 uid별로 강제한다 — 지금은 클라이언트 장식일 뿐이다
     3. 누가 얼마나 썼는지 uid 단위로 남는다
   강사만 통과시키려면 커스텀 클레임이 필요하고, 그건 클레임을 심을 권한 있는
   백엔드가 따로 있어야 한다. 지금 구조에는 없다 — 별건으로 다뤄야 한다.

   필요한 바인딩 (wrangler.toml)
     [[kv_namespaces]]  binding = "QUOTA"   id = "..."
     [vars]             ALLOW_ORIGIN = "https://khhyun827-lang.github.io"
     비밀            GEMINI_API_KEY, GOOGLE_DRIVE_* 등 기존 것 그대로
     이행 기간에만    LEGACY_SITE_TOKEN (3단계에서 지운다)
   ============================================================= */

const FIREBASE_PROJECT_ID = 'hahyunmath';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const AI_DAILY_LIMIT = 20;      // index.html의 AI_DAILY_LIMIT과 같은 값이어야 한다
const UPLOAD_DAILY_LIMIT = 300; // 이미지 업로드는 학생도 쓴다. 넉넉하되 무한은 아니게

/* ---------- Firebase ID 토큰 검증 ----------
   구글 공개키로 서명을 확인하고 iss/aud/exp를 본다.
   Admin SDK 없이 WebCrypto만으로 되며, 워커에 서비스 계정 키를 둘 필요가 없다. */

let jwksCache = { keys: null, expiresAt: 0 };

async function getSigningKey(kid){
  const now = Date.now();
  if(!jwksCache.keys || now >= jwksCache.expiresAt){
    const res = await fetch(JWKS_URL);
    if(!res.ok) throw new Error('jwks fetch ' + res.status);
    const body = await res.json();
    // 구글이 주는 Cache-Control을 그대로 따른다. 키는 며칠에 한 번 돈다.
    const m = (res.headers.get('cache-control') || '').match(/max-age=(\d+)/);
    jwksCache = { keys: body.keys || [], expiresAt: now + (m ? Number(m[1]) : 3600) * 1000 };
  }
  return jwksCache.keys.find(k => k.kid === kid) || null;
}

function b64urlToBytes(s){
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToJson(s){
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

// 통과하면 payload, 아니면 null. 실패 사유를 호출자에게 흘리지 않는다 —
// «왜 거절됐는지»는 공격자에게 주는 힌트다.
async function verifyIdToken(jwt){
  try{
    const parts = String(jwt || '').split('.');
    if(parts.length !== 3) return null;

    const header = b64urlToJson(parts[0]);
    if(header.alg !== 'RS256' || !header.kid) return null;   // alg:none 류를 막는다

    const jwk = await getSigningKey(header.kid);
    if(!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1])
    );
    if(!ok) return null;

    const p = b64urlToJson(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    if(!(p.exp > now)) return null;
    if(p.iat > now + 60) return null;                                        // 시계 어긋남 여유 60초
    if(p.aud !== FIREBASE_PROJECT_ID) return null;                           // 다른 프로젝트 토큰 차단
    if(p.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT_ID) return null;
    if(!p.sub) return null;
    return p;
  }catch(e){
    return null;
  }
}

/* ---------- 할당량 (서버 쪽) ----------
   KV는 원자적이지 않아서 동시 요청이 겹치면 한도를 한두 건 넘길 수 있다.
   정확히 막아야 하면 Durable Object로 올려야 한다. 1인 운영 · 일 20건에서는
   «대충 20건»으로 충분하고, 지금처럼 «아예 안 막힘»과는 차원이 다르다. */

function todayStr(){
  return new Date().toISOString().slice(0, 10);
}

async function bumpQuota(env, bucket, uid, limit){
  if(!env.QUOTA) return { ok: true, used: 0, note: 'KV 미설정 — 할당량 검사 건너뜀' };
  const day = todayStr();
  const uKey = `q:${bucket}:${uid}:${day}`;
  const gKey = `q:${bucket}:_all:${day}`;

  const [uRaw, gRaw] = await Promise.all([env.QUOTA.get(uKey), env.QUOTA.get(gKey)]);
  const used = Number(uRaw || 0), total = Number(gRaw || 0);
  if(used >= limit || total >= limit) return { ok: false, used: Math.max(used, total) };

  // 이틀치만 남기면 된다. 지난 날짜 키는 알아서 사라진다.
  const opts = { expirationTtl: 60 * 60 * 48 };
  await Promise.all([
    env.QUOTA.put(uKey, String(used + 1), opts),
    env.QUOTA.put(gKey, String(total + 1), opts)
  ]);
  return { ok: true, used: used + 1 };
}

/* ---------- CORS ----------
   authorization을 반드시 허용 목록에 넣어야 한다. 안 넣으면 브라우저가
   프리플라이트에서 요청을 통째로 막아 AI 생성과 이미지 업로드가 그 자리에서 죽는다.
   이행 기간에는 x-site-token도 같이 열어 둔다. */
function corsHeaders(env, req){
  const allow = env.ALLOW_ORIGIN || '*';
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allow === '*' ? '*' : (origin === allow ? origin : allow),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, x-site-token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(body, status, extra){
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, extra || {})
  });
}

/* ---------- 인증 게이트 ----------
   2단계(클라이언트 전환) 동안만 옛 사이트 토큰도 받는다.
   LEGACY_SITE_TOKEN 비밀을 지우는 순간 이 경로는 저절로 닫힌다 — 코드를 또 고칠 필요 없다. */
async function authenticate(req, env){
  const auth = req.headers.get('Authorization') || '';
  if(auth.startsWith('Bearer ')){
    const payload = await verifyIdToken(auth.slice(7));
    if(payload) return { uid: payload.sub, via: 'firebase' };
    return null;   // 토큰을 보냈는데 틀렸다면 옛 경로로 되돌리지 않는다
  }
  const legacy = req.headers.get('X-Site-Token');
  if(env.LEGACY_SITE_TOKEN && legacy && legacy === env.LEGACY_SITE_TOKEN){
    return { uid: 'legacy', via: 'site-token' };
  }
  return null;
}

export default {
  async fetch(req, env, ctx){
    const cors = corsHeaders(env, req);
    if(req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if(req.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

    const who = await authenticate(req, env);
    if(!who) return json({ error: 'unauthorized' }, 401, cors);

    const path = new URL(req.url).pathname.replace(/\/+$/, '') || '/';

    // 할당량은 «비용이 드는 것»에만 건다. /delete는 정리 작업이라 막으면 쓰레기가 쌓인다.
    if(path === '/' || path === '/upload'){
      const isAI = path === '/';
      const q = await bumpQuota(env, isAI ? 'ai' : 'upload', who.uid,
                                isAI ? AI_DAILY_LIMIT : UPLOAD_DAILY_LIMIT);
      if(!q.ok) return json({ error: 'quota exceeded', used: q.used }, 429, cors);
    }

    /* ---------- 아래는 기존 워커의 몸통을 그대로 두는 자리 ----------
       index.html이 기대하는 계약만 지키면 된다.
         POST /         {content, answer, image?|imageFileId?} -> {content, answer}
         POST /upload   multipart(file)                        -> {url, fileId}
         POST /delete   {fileId}                               -> 아무거나
       배포된 워커에서 이 세 핸들러를 그대로 가져와 붙이면 된다. */
    try{
      if(path === '/')       return json(await handleGenerate(req, env), 200, cors);
      if(path === '/upload') return json(await handleUpload(req, env), 200, cors);
      if(path === '/delete') return json(await handleDelete(req, env), 200, cors);
      return json({ error: 'not found' }, 404, cors);
    }catch(e){
      // 내부 오류 메시지를 그대로 돌려주지 않는다.
      console.error(path, e);
      return json({ error: 'upstream failure' }, 502, cors);
    }
  }
};

/* 아래 셋은 «현재 배포된 워커의 코드로 채워야 하는» 자리다.
   여기 손으로 다시 쓰면 Gemini 프롬프트와 드라이브 업로드 동작이 미묘하게 달라진다. */
async function handleGenerate(req, env){ throw new Error('기존 워커의 생성 핸들러를 여기에 옮겨 붙일 것'); }
async function handleUpload(req, env){ throw new Error('기존 워커의 업로드 핸들러를 여기에 옮겨 붙일 것'); }
async function handleDelete(req, env){ throw new Error('기존 워커의 삭제 핸들러를 여기에 옮겨 붙일 것'); }
