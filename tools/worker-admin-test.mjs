// 워커 관리자 길 검사 — «강사인지»를 서버에서 보는가 (2026-09-07 · 인증 옮기기 ⑥)
//
//   node tools/worker-admin-test.mjs
//
// 🔴 **여기가 이 앱에서 가장 위험한 문이다.** 남의 비밀번호를 바꾸고 계정을 지우는 길이라,
//   막이가 한 겹만 새도 «학생이 남의 비밀번호를 바꾸는 문»이 된다.
//   그리고 화면에서 단추를 감추는 것으로는 **못 막는다** — 학생도 로그인하면 토큰이 있고
//   이 주소를 그대로 부를 수 있다. 그래서 막는 자리는 언제나 워커여야 한다.
//
// ⚠ 워커를 실제로 부르지 않는다. 소스가 «지켜야 할 모양»을 갖췄는지와,
//   앱 쪽이 워커의 대답을 사람 말로 옮기는지를 본다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 벗기기 = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const worker = 벗기기(fs.readFileSync(path.join(ROOT, 'worker/gemini-proxy.js'), 'utf8').replace(/\r\n/g, '\n'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇
    + (같다 ? '' : '\n      나온 것: ' + JSON.stringify(잰것) + '\n      나와야:  ' + JSON.stringify(바란것)));
};
function 몸떠내기(글, 이름) {
  const at = 글.indexOf('async function ' + 이름 + '(');
  if (at < 0) throw new Error(이름 + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = 글.indexOf('{', at); j < 글.length; j++) {
    if (글[j] === '{') 깊이++;
    else if (글[j] === '}') { 깊이--; if (!깊이) return 글.slice(at, j + 1); }
  }
  throw new Error(이름 + ' 의 끝을 못 찾았습니다');
}

console.log('\n워커 관리자 길 — 막이가 제자리에 있는가\n');

/* ── ① 두 길 모두 «앞문»을 지나는가 ─────────────────────────── */
for (const 이름 of ['handleAdminResetPw', 'handleAdminDeleteUser']) {
  const 몸 = 몸떠내기(worker, 이름);
  const 첫줄 = 몸.split('\n').filter((t) => t.trim())[1] || '';
  봄('🔴 ' + 이름 + ' 이 맨 먼저 adminGate 를 지난다', /adminGate\(/.test(첫줄), true);
  봄('   막히면 곧바로 돌려보낸다', /if\s*\(g\.흠\)\s*return g\.흠;/.test(몸), true);
}

/* ── ② 앞문이 «강사인지»를 실제로 보는가 ────────────────────── */
//
// 🔴 **여기는 «돌려서» 잰다.** 처음엔 소스에 「forbidden … 403」이 적혀 있는지만 봤는데,
//   강사 확인을 `if (false)` 로 죽여도 그 글자는 그대로 남아 **검사가 안 물었다**(실측).
//   막이를 지키는 검사는 «아닌 사람이 실제로 막히는지»를 봐야 한다.
{
  const 몸 = 몸떠내기(worker, 'adminGate');
  const 만들기 = (강사인가, 물어봐지나 = true) => new Function(
    'env', 'request', 'corsHeaders', 'uid', 'isTeacher', 'adminJson',
    몸 + '; return adminGate;')(
    { FIREBASE_SA: '{}' },
    { json: async () => ({ password: 'abcdef' }) },
    {}, 'U1',
    async () => { if (!물어봐지나) throw new Error('위쪽이 엎어졌다'); return 강사인가; },
    (obj, ch, status) => ({ 몸통: obj, status: status || 200 }),
  );

  const 강사 = await 만들기(true)({ json: async () => ({ password: 'abcdef' }) },
    { FIREBASE_SA: '{}' }, {}, 'U1');
  봄('🔵 강사면 통과하고 몸을 넘겨준다', !!(강사.body && 강사.body.password), true);
  봄('   막힌 표시는 없다', 강사.흠, undefined);

  const 남 = await 만들기(false)({ json: async () => ({ password: 'abcdef' }) },
    { FIREBASE_SA: '{}' }, {}, 'U1');
  봄('🔴 강사가 아니면 막는다', !!남.흠, true);
  봄('🔴 403 으로 막는다', 남.흠 && 남.흠.status, 403);
  봄('   몸을 넘겨주지 않는다', 남.body, undefined);

  // ⚠ 「강사가 아니다」와 「못 물어봤다」를 뭉개면, 위쪽이 잠깐 엎어졌을 때 문이 열릴 수 있다.
  const 못물어봄 = await 만들기(true, false)({ json: async () => ({ password: 'abcdef' }) },
    { FIREBASE_SA: '{}' }, {}, 'U1');
  봄('🔴 «못 물어본 것»은 통과가 아니다', !!못물어봄.흠, true);
  봄('🔴 그때는 500 이다 — 403 과 갈라 말한다', 못물어봄.흠 && 못물어봄.흠.status, 500);

  const 열쇠없음 = await 만들기(true)({ json: async () => ({}) }, {}, {}, 'U1');
  봄('🔴 열쇠가 없으면 아예 안 묻고 503', 열쇠없음.흠 && 열쇠없음.흠.status, 503);
}

/* ── ③ 강사 판단이 규칙과 «같은 잣대»인가 ───────────────────── */
{
  const 몸 = 몸떠내기(worker, 'isTeacher');
  봄('🔴 teachers/{uid} 문서를 본다', /documents\/teachers\//.test(몸), true);
  봄('있으면 200, 없으면 아니다', /r\.status === 200/.test(몸), true);
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  봄('🔵 규칙도 같은 문서를 본다 — 잣대가 둘로 갈리지 않는다',
    /documents\/teachers\/\$\(request\.auth\.uid\)/.test(rules), true);
}

/* ── ④ 관리자 길이 AI 한도를 먹지 않는가 ────────────────────── */
//
// ⚠ 라우팅이 catch-all 이라, 새 길을 낼 때 여기를 같이 안 고치면
//   「한도가 다 차서 비밀번호도 못 바꾸는」 설명하기 어려운 상태가 된다.
봄('🔴 /admin/ 은 AI 한도에서 빠져 있다',
  /url\.pathname !== '\/delete' && !url\.pathname\.startsWith\('\/admin\/'\)/.test(worker), true);

/* ── ⑤ 자기 계정은 못 지운다 ────────────────────────────────── */
//
// ⚠ 강사가 실수로 제 계정을 지우면 아무도 못 들어온다 — 되돌릴 길이 없다.
{
  const 몸 = 몸떠내기(worker, 'handleAdminDeleteUser');
  봄('🔴 자기 자신은 못 지운다', /localId === callerUid/.test(몸), true);
}

/* ── ⑥ 서비스 계정 열쇠를 저장소에 두지 않았는가 ────────────── */
{
  봄('🔴 워커 소스에 private_key 값이 없다', /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(worker), false);
  봄('열쇠는 env 에서만 읽는다', /env\.FIREBASE_SA/.test(worker), true);
}

/* ── ⑦ 앱 쪽 — 워커의 대답을 «사람 말»로 옮기는가 ───────────── */
{
  const 몸 = 몸떠내기(html, 'adminCall');
  const 옮기기 = new Function('j', 'res',
    'const 말 = ' + (몸.match(/const 말 = ([\s\S]*?);\n/) || [])[1] + '; return 말;');
  봄('강사가 아니면 그렇게 말한다', 옮기기({ error: 'forbidden' }, {}), '강사만 할 수 있습니다.');
  봄('열쇠가 없으면 «워커에 권한이 없다»고 말한다',
    /FIREBASE_SA/.test(옮기기({ error: 'not_configured' }, {})), true);
  봄('모르는 흠은 워커가 준 까닭을 그대로 쓴다',
    옮기기({ error: 'weird', detail: '위쪽이 엎어졌습니다' }, {}), '위쪽이 엎어졌습니다');
  // ⚠ 「실패했습니다」만 띄우면 무엇을 고칠지 모른다.
  봄('마지막 기댈 곳은 http 상태라도 말한다', 옮기기({}, { status: 502 }), 'http 502');
}

/* ── ⑧ 앱이 «Firestore 에 비밀번호를 도로 넣지» 않는가 ───────── */
{
  const 코드 = 벗기기(html);
  봄('🔴 비밀번호를 문서에 쓰는 자리가 없다', /\.pw\s*=[^=]/.test(코드), false);
  봄('🔴 조교 재설정이 워커를 지난다', /adminResetPassword\('assistant'/.test(코드), true);
  봄('🔴 학생 재설정도 워커를 지난다', /adminResetPassword\('student'/.test(코드), true);
  봄('학생을 지우면 계정도 지운다', /adminDeleteUser\('student'/.test(코드), true);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
