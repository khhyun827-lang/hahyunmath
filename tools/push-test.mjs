// 선생님 폰 알림 검사 — 워커 /push-* 가 «지켜야 할 것»을 지키는가 (2026-09-24 · N-4)
//
//   node tools/push-test.mjs
//
// 🔴 /push-ping 은 학생이 부르는 문이다 — 여기서 보는 것 —
//   ① AI 한도(catch-all)에서 빠져 있다 ② 익명(랜딩)은 못 부른다 · 모르는 kind 는 400
//   ③ 한 사람·한 종류는 gap 안에 한 번(채팅 묶음) ④ 죽은 토큰(404 UNREGISTERED)은 걷는다
//   ⑤ 기기 맡기기는 강사만 · 새 것이 앞 · 다섯 대까지 ⑥ 화면은 «저장된 뒤»에만 부른다
// ⚠ FCM 을 실제로 부르지 않는다 — fetch 를 가짜로 바꿔 «무엇을 보내는지»를 본다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stripComments } from './strip-comments.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const worker = stripComments(fs.readFileSync(path.join(ROOT, 'worker/gemini-proxy.js'), 'utf8').replace(/\r\n/g, '\n'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇
    + (같다 ? '' : '\n      나온 것: ' + JSON.stringify(잰것) + '\n      나와야:  ' + JSON.stringify(바란것)));
};
function 몸떠내기(글, 머리) {
  const at = 글.indexOf(머리);
  if (at < 0) throw new Error(머리 + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = 글.indexOf('{', at); j < 글.length; j++) {
    if (글[j] === '{') 깊이++;
    else if (글[j] === '}') { 깊이--; if (!깊이) return 글.slice(at, j + 1); }
  }
  throw new Error(머리 + ' 의 끝을 못 찾았습니다');
}

console.log('워커 폰 알림 길 — 막이가 제자리에 있는가\n');

/* ── ① 모양 ─────────────────────────────────────────────────── */
{
  봄('🔴 /push-* 넷은 AI 한도(catch-all)에서 빠져 있다', /!PUSH_PATHS\.includes\(url\.pathname\)/.test(worker), true);
  const 길 = worker.match(/const PUSH_PATHS = (\[[^\]]+\])/)[1];
  const 라우팅 = [...worker.matchAll(/url\.pathname === '(\/push-[a-z-]+)'\) return/g)].map((m) => m[1]).sort();
  봄('🔴 빠진 길 = 라우팅된 길 (라우팅 없는 길이 빠지면 Gemini 로 공짜로 샌다)', 라우팅, JSON.parse(길.replace(/'/g, '"')).sort());
  for (const 이름 of ['handlePushRegister', 'handlePushTest']) {
    const 첫줄 = 몸떠내기(worker, 'async function ' + 이름 + '(').split('\n').filter((t) => t.trim())[1] || '';
    봄('🔴 ' + 이름 + ' 는 맨 먼저 adminGate(강사만)', /adminGate\(request, env, corsHeaders, callerUid\)/.test(첫줄), true);
  }
  봄('   인증이 provider 를 넘긴다 (익명을 가르려고)', /provider: \(payload\.firebase && payload\.firebase\.sign_in_provider\)/.test(worker), true);
  const 판 = worker.match(/const WORKER_VERSION = '([^']+)'/)[1];
  const 화면판 = html.match(/const PUSH_WORKER_MIN = '([^']+)'/)[1];
  봄('   화면이 바라는 워커 판 ≤ 워커 판', 화면판 <= 판, true);
}

/* ── ② 돌려서 잰다 — 가짜 FCM · 가짜 KV ───────────────────────── */
const 몸 = worker.slice(worker.indexOf('const PUSH_PATHS'), worker.indexOf('async function authenticate('));
function 차리기(o = {}) {
  const kv = new Map(o.kv || []);
  const 보낸것 = [];
  const env = { FIREBASE_SA: JSON.stringify({ project_id: 'hahyunmath' }),
    QUOTA: { get: async (k) => kv.get(k) || null, put: async (k, v, opt) => { kv.set(k, v); if (opt) kv.set('ttl:' + k, opt.expirationTtl); } } };
  const 강사 = o.강사 !== false;
  const F = new Function('env', 'fetch', 'adminGate', 'adminJson', 'bumpQuota', 'getServiceAccountToken', 'JSON',
    몸 + '; return { handlePushRegister, handlePushTest, handlePushPing, pushSend };')(
    env,
    async (url, opt) => {
      const m = JSON.parse(opt.body).message;
      보낸것.push({ url, auth: opt.headers.Authorization, ...m });
      if (m.token === 'dead') return { ok: false, status: 404, text: async () => '{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}' };
      if (m.token === 'sick') return { ok: false, status: 500, text: async () => 'backend down' };
      return { ok: true, status: 200, text: async () => '{}' };
    },
    async (request) => 강사 ? { body: await request.json() } : { 흠: { 몸통: { error: 'forbidden' }, status: 403 } },
    (obj, ch, status) => ({ 몸통: obj, status: status || 200 }),
    async () => (o.한도막힘 ? { ok: false } : { ok: true }),
    async () => 'sa-tok',
    JSON,
  );
  return { F, env, kv, 보낸것 };
}
const 요청 = (body) => ({ json: async () => body });
const 기기 = (...ts) => [['push:tokens', JSON.stringify(ts.map((token) => ({ token, label: '', at: '' })))]];
const TOK = 'fcmTokenAAAAAAAAAAAAAAAAAAAAAA';

{
  const { F, env, 보낸것, kv } = 차리기({ kv: 기기('p1', 'p2') });
  const 학생 = { uid: 'S1', provider: 'password' };
  const r1 = await F.handlePushPing(요청({ kind: 'qna', name: '  김민아  ', text: '3번 문제\n\n왜 부호가   바뀌나요?' }), env, {}, 학생);
  봄('🔵 맡긴 기기 전부에 한 통씩', [r1.몸통.sent, r1.몸통.devices, 보낸것.map((m) => m.token)], [2, 2, ['p1', 'p2']]);
  봄('🔴 문구의 머리는 워커가 짓는다 · 이름·글은 다듬어 자른다', 보낸것[0].data,
    { title: '새 질문 — 김민아', body: '3번 문제 왜 부호가 바뀌나요?', go: 'qna', tag: 'qna:S1' });
  봄('   FCM v1 · 서비스 계정 토큰 · data 만(notification 칸 없음)',
    [보낸것[0].url, 보낸것[0].auth, 'notification' in 보낸것[0]], ['https://fcm.googleapis.com/v1/projects/hahyunmath/messages:send', 'Bearer sa-tok', false]);
  봄('   바로 뜨게 Urgency high', 보낸것[0].webpush.headers.Urgency, 'high');

  const r2 = await F.handlePushPing(요청({ kind: 'qna', name: '김민아', text: '또' }), env, {}, 학생);
  봄('🔴 같은 사람·같은 종류는 gap 안에 한 번 — FCM 을 안 부른다', [r2.몸통.why, 보낸것.length], ['gap', 2]);
  봄('   gap 은 KV 수명으로 — 질문 60초 · 채팅 180초', kv.get('ttl:ping:qna:S1'), 60);
  const r3 = await F.handlePushPing(요청({ kind: 'chat', name: '김민아', text: '선생님' }), env, {}, 학생);
  봄('   다른 종류(채팅)는 따로 센다', [r3.몸통.sent, kv.get('ttl:ping:chat:S1')], [2, 180]);
  const r4 = await F.handlePushPing(요청({ kind: 'qna', name: '박서준', text: '' }), env, {}, { uid: 'S2', provider: 'password' });
  봄('   다른 학생은 따로 센다 · 이름 없으면 «학생»은 아니고 준 이름 그대로', [r4.몸통.sent, 보낸것.at(-1).data.title], [2, '새 질문 — 박서준']);
}
{
  const { F, env, 보낸것 } = 차리기({ kv: 기기('p1') });
  const r = await F.handlePushPing(요청({ kind: 'qna', name: 'x', text: 'y' }), env, {}, { uid: 'A1', provider: 'anonymous' });
  봄('🔴 익명(랜딩)은 403 — FCM 을 안 부른다', [r.status, 보낸것.length], [403, 0]);
  for (const kind of ['sms', '__proto__', 'toString', undefined]) {
    const b = await F.handlePushPing(요청({ kind, name: 'x' }), env, {}, { uid: 'S1', provider: 'password' });
    봄('   모르는 kind(' + kind + ')는 400', b.status, 400);
  }
  const 한도 = 차리기({ kv: 기기('p1'), 한도막힘: true });
  const q = await 한도.F.handlePushPing(요청({ kind: 'qna', name: 'x' }), 한도.env, {}, { uid: 'S1', provider: 'password' });
  봄('🔴 하루 뚜껑에 닿으면 quota — 안 보낸다', [q.몸통.why, 한도.보낸것.length], ['quota', 0]);
  const 빈 = 차리기();
  const e = await 빈.F.handlePushPing(요청({ kind: 'clinic', name: 'x' }), 빈.env, {}, { uid: 'S1', provider: 'password' });
  봄('   맡긴 기기가 없으면 no_device (터지지 않는다)', [e.몸통.ok, e.몸통.why], [true, 'no_device']);
}
{
  const { F, env, kv } = 차리기({ kv: 기기('p1', 'dead', 'sick') });
  const r = await F.pushSend({ QUOTA: { get: async (k) => kv.get(k), put: async (k, v) => kv.set(k, v) }, FIREBASE_SA: JSON.stringify({ project_id: 'hahyunmath' }) },
    { title: 't', body: 'b' });
  봄('🔴 404 UNREGISTERED 는 걷고 · 다른 실패는 남긴다(까닭은 돌려준다)',
    [r.sent, r.dropped, JSON.parse(kv.get('push:tokens')).map((d) => d.token), r.why.split(' ').slice(0, 2).join(' ')],
    [1, 1, ['p1', 'sick'], 'fcm 500']);
}
{
  const { F, env, kv } = 차리기({ kv: 기기('old1', 'old2', 'old3', 'old4', 'old5') });
  const r = await F.handlePushRegister(요청({ token: TOK, label: '안드로이드 · 2026-09-24' }), env, {}, 'T1', false);
  const 목록 = JSON.parse(kv.get('push:tokens'));
  봄('🔵 새 기기가 맨 앞 · 다섯 대까지(가장 오래된 것이 밀린다)', [r.몸통.devices, 목록.map((d) => d.token)], [5, [TOK, 'old1', 'old2', 'old3', 'old4']]);
  await F.handlePushRegister(요청({ token: TOK }), env, {}, 'T1', false);
  봄('   같은 토큰을 다시 맡겨도 한 줄', JSON.parse(kv.get('push:tokens')).filter((d) => d.token === TOK).length, 1);
  await F.handlePushRegister(요청({ token: TOK }), env, {}, 'T1', true);
  봄('   끄면 그 토큰만 빠진다', JSON.parse(kv.get('push:tokens')).map((d) => d.token), ['old1', 'old2', 'old3', 'old4']);
  const 나쁜 = await F.handlePushRegister(요청({ token: 'x' }), env, {}, 'T1', false);
  봄('   토큰 꼴이 아니면 400', 나쁜.status, 400);
  const 학생 = 차리기({ 강사: false });
  const 막 = await 학생.F.handlePushRegister(요청({ token: TOK }), 학생.env, {}, 'S1', false);
  봄('🔴 강사가 아니면 기기를 못 맡긴다(남의 폰으로 알림을 돌릴 수 없다)', [막.status, 학생.kv.has('push:tokens')], [403, false]);
}

/* ── ③ 화면 — 저장된 «뒤»에만 · 학생만 ───────────────────────── */
{
  const 핑 = 몸떠내기(html, 'function pushPing(');
  봄('🔴 pushPing 은 학생만 부른다', /u\.type !== 'student'\) return;/.test(핑), true);
  봄('   기다리지 않고 실패는 삼킨다', /\.catch\(/.test(핑) && !/await/.test(핑), true);
  const 질문 = 몸떠내기(html, 'async function submitQuestion(');
  봄('🔴 질문 — 저장이 된 뒤에만', /if\(저장됨 === true\) pushPing\('qna'/.test(질문), true);
  const 클리닉 = 몸떠내기(html, 'async function submitClinicRequest(');
  봄('🔴 클리닉 — «직접 제안»만 · 저장된 뒤', /if\(freeform && 저장됨 === true\) pushPing\('clinic'/.test(클리닉), true);
  const 채팅 = 몸떠내기(html, 'async function sendChatMessage(');
  봄('🔴 채팅 — 학생이 보낸 것만 · 저장된 뒤', /if\(from === 'student' && 저장됨 === true\) pushPing\('chat'/.test(채팅), true);
  봄('   saveChat 이 저장 결과를 돌려준다', /return dbSetDoc\('chats'/.test(몸떠내기(html, 'async function saveChat(')), true);
  봄('🔴 옛 워커면 /push-* 를 안 부른다 (catch-all 이 AI 한도를 태운다)', /if\(\(await workerVersion\(\)\) < PUSH_WORKER_MIN\)/.test(몸떠내기(html, 'async function pushPost(')), true);
  봄('   받는 파일이 index.html 옆에 있고 그 이름으로 붙인다', fs.existsSync(path.join(ROOT, 'push-sw.js')) && /register\('push-sw\.js'\)/.test(html), true);
  const sw = fs.readFileSync(path.join(ROOT, 'push-sw.js'), 'utf8');
  봄('   받는 파일은 워커가 보낸 칸(title·body·go·tag)을 읽고 누르면 #teacher/<go> 로 간다',
    ['d.title', 'd.body', 'd.tag', "'#teacher/' + go"].every((k) => sw.includes(k)), true);
}

console.log('\n' + (틀림 ? '✗ ' + 틀림 + '개 틀림 · ' : '✓ 전부 통과 · ') + (통과 + 틀림) + '개');
process.exit(틀림 ? 1 : 0);
