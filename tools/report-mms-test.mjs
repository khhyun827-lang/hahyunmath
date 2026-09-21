// 월간 리포트 MMS — 워커 /report-mms 가 «지켜야 할 것»을 지키는가 (2026-09-20)
//
//   node tools/report-mms-test.mjs
//
// 🔴 학부모에게 사진이 간다. 여기서 보는 것 — ① 강사만 ② 번호는 contacts 의 «학부모» 번호 ③ 한 달에 한 번
//   ④ 문구는 워커가 짓는다(화면이 아무 글이나 못 보낸다) ⑤ 사진 상한 ⑥ 알리고 문자 API 의 칸 이름(key·user_id·msg_type=MMS)
// ⚠ 알리고를 실제로 부르지 않는다 — fetch 를 가짜로 바꿔 «무엇을 보내는지»를 본다.

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
function 몸떠내기(글, 이름) {
  const at = 글.indexOf('async function ' + 이름 + '(');
  if (at < 0) throw new Error(이름 + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = 글.indexOf('{', at); j < 글.length; j++) {
    if (글[j] === '{') 깊이++;
    else if (글[j] === '}') { 깊이--; if (!깊이) return 글.slice(at, j + 1); }
  }
}

console.log('워커 리포트 MMS 길 — 막이가 제자리에 있는가\n');

{
  const 몸 = 몸떠내기(worker, 'handleReportMms');
  const 첫줄 = 몸.split('\n').filter((t) => t.trim())[1] || '';
  봄('🔴 맨 먼저 adminGate — 강사만 (조교 문은 안 넘긴다)', /adminGate\(request, env, corsHeaders, callerUid\);/.test(첫줄), true);
  봄('🔴 /report-mms 는 AI 한도(catch-all)에서 빠져 있다', /url\.pathname !== '\/report-mms'/.test(worker), true);
  봄('   라우팅에 있다', /url\.pathname === '\/report-mms'\) return handleReportMms\(/.test(worker), true);
  봄('🔴 번호는 «학부모» 번호를 contacts 에서 읽는다', /readContactParentPhone\(env, key\)/.test(몸) && /parentPhone/.test(몸떠내기(worker, 'readContactParentPhone')), true);
  봄('🔴 문구는 워커가 짓는다 — 화면의 msg 를 받는 자리가 없다', /body\.msg|g\.body\.message/.test(몸), false);
}

{
  /* 번호 읽기는 알림톡과 한 함수(readContact)로 합쳐져 위쪽에 산다 — 함께 떠 온다 (2026-09-21) */
  /* 발송 길이 지나는 것들을 함께 떠 온다 — 번호 읽기·중계 갈림(aligoTarget)·-101 IP 안내(whyWithEgress · 나가는 IP 재기는 가짜) */
  const 함수떠내기 = (이름) => { const at = worker.indexOf('function ' + 이름 + '('); let d = 0; for (let j = worker.indexOf('{', at); j < worker.length; j++) { if (worker[j] === '{') d++; else if (worker[j] === '}') { d--; if (!d) return worker.slice(at, j + 1); } } };
  const 몸 = [몸떠내기(worker, 'readContact'), 몸떠내기(worker, 'readContactParentPhone'), 함수떠내기('aligoTarget'), 몸떠내기(worker, 'whyWithEgress'),
    'const egressIp = async () => "";'].join(String.fromCharCode(10)) + String.fromCharCode(10)
    + worker.slice(worker.indexOf('const REPORT_MMS_DAILY_LIMIT'), worker.indexOf('async function handleAdminResetPw('));
  const 보낸것 = [];
  const kv = new Map();
  const env = {
    FIREBASE_SA: '{}', QUOTA: { get: async (k) => kv.get(k) || null, put: async (k, v, o) => { kv.set(k, [v, o]); } },
    ALIGO_APIKEY: 'k', ALIGO_USERID: 'u', ALIGO_SENDER: '01000000000',
  };
  const 번호들 = { U1: '010-9999-8888', U2: '' };
  class FD { constructor() { this.m = {}; } append(k, v, name) { this.m[k] = name ? { blob: v, name } : v; } }
  const F = new Function('env', 'fetch', 'FormData', 'Blob', 'adminGate', 'adminJson', 'bumpQuota', 'refundQuota', 'getServiceAccountToken', 'JSON', 'atob',
    몸 + '; return handleReportMms;')(
    env,
    async (url, opt) => {
      if (/apis\.aligo\.in\/send/.test(url)) { 보낸것.push(opt.body.m); return { json: async () => (opt.body.m.receiver === '01099998888' ? { result_code: 1, message: 'success' } : { result_code: -101, message: '번호' }) }; }
      const key = decodeURIComponent(url.split('/contacts/')[1]);
      return { status: 200, json: async () => ({ fields: { parentPhone: { stringValue: 번호들[key] || '' } } }) };
    },
    FD, class { constructor(parts, o) { this.size = parts[0].length; this.type = o.type; } },
    async (request) => ({ body: await request.json() }),
    (obj, ch, status) => ({ 몸통: obj, status: status || 200 }),
    async () => ({ ok: true, used: 1 }), async () => {}, async () => 'tok', JSON,
    (s) => Buffer.from(s, 'base64').toString('binary'),
  );
  const 사진 = (kb) => 'data:image/jpeg;base64,' + Buffer.alloc(kb * 1024, 1).toString('base64');
  const 부르기 = (body) => F({ json: async () => body }, env, {}, 'T1');

  const r1 = await 부르기({ key: 'U1', name: '가나', ym: '2026-09', image: 사진(200) });
  봄('🔴 보낸다 — 학부모 번호(숫자만) · MMS · 워커가 지은 문구 · 사진 한 장', [r1.몸통.ok, 보낸것[0].receiver, 보낸것[0].msg_type, 보낸것[0].msg, 보낸것[0].image.name, 보낸것[0].image.blob.type],
    [true, '01099998888', 'MMS', '[김하현수학연구소] 가나 학생 2026년 9월 월간 리포트입니다.', 'report.jpg', 'image/jpeg']);
  봄('   알리고 «문자» API 의 칸 이름 — key · user_id · sender (알림톡의 apikey·userid 와 다르다)', [보낸것[0].key, 보낸것[0].user_id, 보낸것[0].sender], ['k', 'u', '01000000000']);
  const r2 = await 부르기({ key: 'U1', name: '가나', ym: '2026-09', image: 사진(200) });
  봄('🔴 같은 학생·같은 달은 두 번 안 간다 (40일)', [r2.몸통.why, 보낸것.length, kv.get('sent:report:2026-09:U1')[1].expirationTtl], ['already', 1, 60 * 60 * 24 * 40]);
  const r3 = await 부르기({ key: 'U1', name: '가나', ym: '2026-10', image: 사진(200) });
  봄('   다른 달이면 간다', [r3.몸통.ok, 보낸것.length], [true, 2]);
  const r4 = await 부르기({ key: 'U2', name: '다라', ym: '2026-09', image: 사진(200) });
  봄('   학부모 번호가 없으면 알리고를 안 부른다', [r4.몸통.why, 보낸것.length], ['no_phone', 2]);
  const r5 = await 부르기({ key: 'U1', name: '가나', ym: '2026-11', image: 사진(320) });
  봄('🔴 사진이 300KB 를 넘으면 안 보낸다', [r5.몸통.why, 보낸것.length], ['too_big', 2]);
  const r6 = await 부르기({ key: 'U1', name: '가나', ym: '2026/11', image: 사진(10) });
  봄('   달 꼴이 아니면 400', r6.status, 400);
  const r7 = await 부르기({ key: 'U1', name: '가나', ym: '2026-12', image: 'data:image/png;base64,AAAA' });
  봄('   jpeg 가 아니면 400', r7.status, 400);
}

{
  봄('🔵 화면 — 문자용 사진 상한은 300KB 안(다운로드용 950KB 와 다르다)', /const REPORT_MMS_MAX_BYTES = 290 \* 1024;/.test(html) && /rptBakeImage\(canvas, REPORT_MMS_MAX_BYTES\)/.test(html), true);
  봄('   굽기가 상한을 받는다 — 사다리가 더 내려간다', /async function rptBakeImage\(canvas, maxBytes\)/.test(html) && /\{q:\.7, s:\.4\}/.test(html), true);
  봄('   보내기 전에 묻는다 — 요금 · 한 달 한 번', /confirm\(번호있음\.length \+ '명의 학부모께 '/.test(html), true);
  봄('   화면은 key·name·ym·image 만 보낸다', /JSON\.stringify\(\{ key: studentKeyOfSid\(st\.studentId\), name: st\.name, ym: b\.ym, image: baked\.url \}\)/.test(html), true);
  봄('   번호 없는 학생은 누르기 «전»에 줄에 보인다', /'대기 · 학부모 번호 없음'/.test(html), true);
  봄('   서랍에 단추가 있다', /onclick="runReportSend\(\)"/.test(html), true);
}

/* 🔴 **번호를 «화면이 쓰는 꼴»에서 읽는가** (2026-09-21 · 첫 MMS 시험이 no_phone 으로 걸렸다).
   index.html 의 docFields 는 문서를 { value: JSON.stringify(data), uid, week } 로 쓴다 — 번호는 `fields.value` 안 JSON 이다.
   09-19 판은 `fields.parentPhone.stringValue` 를 읽어 번호가 있어도 언제나 '' 였다. 가짜 Firestore 로 두 꼴을 다 준다. */
{
  const 글 = 몸떠내기(worker, 'readContact') + '\n' + 몸떠내기(worker, 'readContactPhone') + '\n' + 몸떠내기(worker, 'readContactParentPhone')
    + '\nreturn { readContact, readContactPhone, readContactParentPhone };';
  const 문서 = { fields: { value: { stringValue: JSON.stringify({ studentId: 'test', phone: '010-1111-2222', parentPhone: '010-3322-1292' }) }, uid: { stringValue: 'u' } } };
  const 옛꼴 = { fields: { phone: { stringValue: '01099998888' }, parentPhone: { stringValue: '010 7777 6666' } } };
  const 만들기 = (doc, status = 200) => new Function('fetch', 'getServiceAccountToken', 글)(
    async () => ({ status, json: async () => doc }), async () => 'tok');
  const env = { FIREBASE_SA: JSON.stringify({ project_id: 'p' }) };
  const A = 만들기(문서);
  봄('🔴 화면이 쓴 꼴(fields.value 안 JSON)에서 학부모 번호를 읽는다 — 숫자만', await A.readContactParentPhone(env, 'k'), '01033221292');
  봄('   학생 번호도 같은 자리에서', await A.readContactPhone(env, 'k'), '01011112222');
  const B = 만들기(옛꼴);
  봄('   맨 칸에 든 옛 꼴도 읽는다', [await B.readContactParentPhone(env, 'k'), await B.readContactPhone(env, 'k')], ['01077776666', '01099998888']);
  const C = 만들기({}, 404);
  봄('   문서가 없으면 빈 글자 (no_phone 으로 간다)', await C.readContactParentPhone(env, 'k'), '');
  봄('🔴 판을 올렸다 (09-19 판은 no_phone 을 낸다)', (worker.match(/WORKER_VERSION = '([^']+)'/) || [])[1] > '2026-09-21', true);
}

/* 🔴 **고정 IP 중계** (2026-09-21) — ALIGO_RELAY 가 있으면 그리로, 없으면 직접. 열쇠는 머리에. */
{
  const at = worker.indexOf('function aligoTarget(');
  let 깊이 = 0, end = at;
  for (let j = worker.indexOf('{', at); j < worker.length; j++) { if (worker[j] === '{') 깊이++; else if (worker[j] === '}') { 깊이--; if (!깊이) { end = j + 1; break; } } }
  const T = new Function(worker.slice(at, end) + '; return aligoTarget;')();
  봄('   중계가 없으면 알리고를 직접 부른다', T({}, 'sms', '/send/'), { url: 'https://apis.aligo.in/send/', headers: {} });
  봄('🔴 중계가 있으면 /sms·/kakao 로 갈라 보내고 열쇠를 머리에 단다',
    [T({ ALIGO_RELAY: 'https://1.2.3.4.sslip.io/', ALIGO_RELAY_KEY: 'k1' }, 'sms', '/send/'), T({ ALIGO_RELAY: 'https://r', ALIGO_RELAY_KEY: 'k1' }, 'kakao', '/akv10/alimtalk/send/').url],
    [{ url: 'https://1.2.3.4.sslip.io/sms/send/', headers: { 'X-Relay-Key': 'k1' } }, 'https://r/kakao/akv10/alimtalk/send/']);
  봄('   두 발송 길이 다 aligoTarget 을 지난다', (worker.match(/aligoTarget\(env, '(sms|kakao)'/g) || []).length, 2);
}

console.log('\n  ' + (틀림 ? '🔴 ' : '✅ ') + 통과 + ' 통과 · ' + 틀림 + ' 실패');
process.exit(틀림 ? 1 : 0);
