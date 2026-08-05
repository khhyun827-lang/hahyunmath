/* 워커의 verifyFirebaseIdToken을 실제 RSA 키로 검증한다.
   가짜 JWKS를 fetch 스텁으로 물려 놓고, 맞는 토큰 1개 + 틀린 토큰 6개를 넣어 본다. */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// 상대 경로로 불러도 되게 절대 경로로 고정한다.
const SRC = path.resolve(process.argv[2] || path.join(import.meta.dirname, 'gemini-proxy.js'));
const PROJECT = 'hahyunmath';

// 1) RSA 키쌍 생성 → JWK 공개키로 가짜 JWKS 구성
const kp = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' },
  true, ['sign', 'verify']
);
const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
pubJwk.kid = 'testkid'; pubJwk.alg = 'RS256'; pubJwk.use = 'sig';

// 2) fetch 스텁 — JWKS만 응답한다
globalThis.fetch = async (url) => {
  if (String(url).includes('/jwk/securetoken')) {
    return { ok: true, headers: { get: () => 'public, max-age=3600' }, json: async () => ({ keys: [pubJwk] }) };
  }
  throw new Error('unexpected fetch: ' + url);
};

// 3) 모듈에서 검증 함수만 꺼내 온다 (export가 없으므로 임시 사본에 추가)
const src = fs.readFileSync(SRC, 'utf8');
const tmp = path.join(path.dirname(SRC), '__jwt_probe.mjs');
fs.writeFileSync(tmp, src + '\nexport { verifyFirebaseIdToken };\n');
const { verifyFirebaseIdToken } = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

// 4) 토큰 제조기
const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function makeToken(payloadOverrides = {}, headerOverrides = {}, tamper = false) {
  const now = Math.floor(Date.now()/1000);
  const header = { alg:'RS256', kid:'testkid', typ:'JWT', ...headerOverrides };
  const payload = {
    iss: 'https://securetoken.google.com/' + PROJECT, aud: PROJECT,
    sub: 'anon-uid-123', iat: now - 10, exp: now + 3600, ...payloadOverrides
  };
  const h = b64url(JSON.stringify(header)), p = b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey,
    new TextEncoder().encode(h + '.' + p));
  let s = b64url(new Uint8Array(sig));
  if (tamper) s = s.slice(0, -2) + (s.endsWith('AA') ? 'BB' : 'AA');
  return `${h}.${p}.${s}`;
}

const now = Math.floor(Date.now()/1000);
const cases = [
  ['정상 토큰',              await makeToken(),                                   true ],
  ['만료됨 (exp 과거)',      await makeToken({ exp: now - 1 }),                    false],
  ['미래 발급 (iat +10분)',  await makeToken({ iat: now + 600 }),                  false],
  ['다른 프로젝트 aud',      await makeToken({ aud: 'someone-else' }),             false],
  ['iss 위조',               await makeToken({ iss: 'https://evil.example/x' }),   false],
  ['sub 없음',               await makeToken({ sub: '' }),                         false],
  ['서명 변조',              await makeToken({}, {}, true),                        false],
  ['alg:none 공격',          await makeToken({}, { alg: 'none' }),                 false],
  ['모르는 kid',             await makeToken({}, { kid: 'nope' }),                 false],
  ['형식 깨짐',              'not.a.jwt',                                          false],
];

let pass = 0, fail = 0;
for (const [name, token, shouldAccept] of cases) {
  const got = await verifyFirebaseIdToken(token);
  const accepted = got !== null;
  const ok = accepted === shouldAccept;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(22)} 기대=${shouldAccept?'통과':'거절'} 실제=${accepted?'통과':'거절'}`
    + (accepted && got.sub ? `  uid=${got.sub}` : ''));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
