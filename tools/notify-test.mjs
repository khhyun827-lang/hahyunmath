// 알림톡 길 검사 — 워커 /notify 가 «지켜야 할 것»을 지키는가 (2026-09-19 · N-1·N-2)
//
//   node tools/notify-test.mjs
//
// 🔴 돈이 나가고 학생에게 도달하는 문이다. 여기서 보는 것 넷 —
//   ① 강사만 지난다(adminGate 가 맨 먼저) ② 번호는 화면이 준 것이 아니라 contacts 에서 읽는다
//   ③ 같은 날 같은 학생에게 두 번 안 간다 ④ 부분 실패를 사람마다 돌려준다
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
  throw new Error(이름 + ' 의 끝을 못 찾았습니다');
}
const 상수 = (이름) => { const m = worker.match(new RegExp('const ' + 이름 + ' = ([^;]+);')); return m ? m[1] : null; };

console.log('워커 알림톡 길 — 막이가 제자리에 있는가\n');

/* ── ① 모양 ─────────────────────────────────────────────────── */
{
  const 몸 = 몸떠내기(worker, 'handleNotify');
  const 첫줄 = 몸.split('\n').filter((t) => t.trim())[1] || '';
  봄('🔴 handleNotify 가 맨 먼저 adminGate 를 지난다', /adminGate\(/.test(첫줄), true);
  봄('   막히면 곧바로 돌려보낸다', /if\s*\(g\.흠\)\s*return g\.흠;/.test(몸), true);
  봄('🔴 /notify 는 AI 한도(catch-all)에서 빠져 있다', /url\.pathname !== '\/notify'/.test(worker), true);
  봄('🔴 라우팅에 /notify 가 있다', /url\.pathname === '\/notify'\) return handleNotify\(/.test(worker), true);
  봄('🔴 번호는 화면이 준 것을 안 쓴다 — items 에 phone 을 읽는 자리가 없다', /it\.phone|item\.phone/.test(몸), false);
  봄('   비밀 넷 + 그 종류의 템플릿만 본다', ['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_SENDER', 'SOLAPI_PFID']
    .every((k) => 몸.includes("'" + k + "'")) && /NOTIFY_TPL\[kind\]/.test(몸), true);
  봄('🔵 이 문은 조교도 지난다 — 다른 관리자 길은 강사만', /adminGate\(request, env, corsHeaders, callerUid, isTeacherOrStaff\)/.test(몸)
    && !/isTeacherOrStaff/.test(몸떠내기(worker, 'handleAdminResetPw')), true);
  봄('   조교 판단도 규칙과 같은 문서(staff/{uid})', /documents\/staff\//.test(몸떠내기(worker, 'isTeacherOrStaff')), true);
}

/* ── ② 돌려서 잰다 — 가짜 솔라피·가짜 contacts ───────────────── */
{
  const 몸 = worker.slice(worker.indexOf('const NOTIFY_DAILY_LIMIT'), worker.indexOf('async function handleAdminResetPw('));
  const 보낸것 = [];
  const kv = new Map();
  const env = {
    FIREBASE_SA: '{}', QUOTA: { get: async (k) => kv.get(k) || null, put: async (k, v) => { kv.set(k, v); } },
    SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER: '01000000000', SOLAPI_PFID: 'pf1',
    SOLAPI_TPL_HW: 'hw_01', SOLAPI_TPL_VID: 'vid_01', SOLAPI_TPL_QNA: 'qna_01',
  };
  /* 화면이 쓰는 꼴 — 번호는 fields.value 안 JSON (09-21 에 이걸 몰라 no_phone 이 났다) */
  const 번호들 = { U1: '010-1111-2222', U2: '', U3: '010-3333-4444' };
  const 헤더들 = [];
  const 만들기 = () => new Function(
    'env', 'fetch', 'adminGate', 'adminJson', 'quotaDay', 'bumpQuota', 'refundQuota', 'getServiceAccountToken', 'JSON', 'crypto',
    몸 + '; return handleNotify;')(
    env,
    async (url, opt) => {
      if (/api\.solapi\.com\/messages\/v4\/send-many\/detail/.test(url)) {
        const m = JSON.parse(opt.body).messages[0];
        보낸것.push(m); 헤더들.push(opt.headers.Authorization);
        const failed = m.to === '01033334444' ? [{ to: m.to, statusCode: '1011', statusMessage: '수신번호 오류' }] : [];
        return { status: 200, json: async () => ({ groupInfo: { count: { total: 1 } }, failedMessageList: failed }) };
      }
      const key = decodeURIComponent(url.split('/contacts/')[1]);
      return { status: 200, json: async () => ({ fields: { value: { stringValue: JSON.stringify({ phone: 번호들[key] || '' }) } } }) };
    },
    async (request) => ({ body: await request.json() }),
    (obj, ch, status) => ({ 몸통: obj, status: status || 200 }),
    () => '2026-09-19',
    async () => ({ ok: true, used: 1 }),
    async () => {},
    async () => 'tok',
    JSON, globalThis.crypto,
  );
  const 부르기 = (body) => 만들기()({ json: async () => body }, env, {}, 'T1');
  const 변수 = { '#{학생명}': '철수', '#{과제명}': '3단원', '#{마감일}': '2026-09-20' };

  const r1 = await 부르기({ kind: 'hw', id: 'A1', items: [
    { key: 'U1', vars: 변수, message: '[김하현수학연구소]\n철수 학생…' },
    { key: 'U2', vars: 변수, message: '…' },
    { key: 'U3', vars: 변수, message: '…' },
  ] });
  const 결과 = r1.몸통.results.map((x) => [x.key, x.ok, x.why.split(' ')[0]]);
  봄('🔵 부분 실패를 사람마다 돌려준다 — 보냄 · 번호 없음 · 솔라피 거절', 결과,
    [['U1', true, ''], ['U2', false, 'no_phone'], ['U3', false, 'solapi']]);
  봄('   sent 는 성공한 수다', r1.몸통.sent, 1);
  봄('   거절 까닭은 솔라피의 코드·말 그대로', r1.몸통.results[2].why, 'solapi 1011 수신번호 오류');
  봄('🔴 번호는 contacts(fields.value 안 JSON)에서 읽어 숫자만 보낸다', 보낸것[0].to, '01011112222');
  봄('   발신번호·채널·템플릿은 비밀에서, 템플릿은 kind 대로', [보낸것[0].from, 보낸것[0].kakaoOptions.pfId, 보낸것[0].kakaoOptions.templateId], ['01000000000', 'pf1', 'hw_01']);
  봄('🔴 문안이 아니라 «변수»를 보낸다 — 솔라피가 템플릿으로 짓는다', [보낸것[0].kakaoOptions.variables, 보낸것[0].text], [변수, undefined]);
  봄('   문자 대체발송을 끄지 않는다 (disableSms 없음)', 보낸것[0].kakaoOptions.disableSms, undefined);
  봄('🔴 HMAC-SHA256 서명 머리 — apiKey · date · salt · signature(64 hex)', /^HMAC-SHA256 apiKey=k, date=\d{4}-\d\d-\d\dT[\d:.]+Z, salt=[0-9a-f]{32}, signature=[0-9a-f]{64}$/.test(헤더들[0]), true);
  봄('   번호 없는 사람에게는 솔라피를 안 부른다', 보낸것.length, 2);

  const r2 = await 부르기({ kind: 'hw', id: 'A1', items: [{ key: 'U1', vars: 변수 }] });
  봄('🔴 같은 날 같은 과제·같은 학생은 두 번 안 간다', [r2.몸통.results[0].why, 보낸것.length], ['already', 2]);
  const r3 = await 부르기({ kind: 'vid', id: 'A1', items: [{ key: 'U1', vars: { '학생명': '철수' } }] });
  봄('   다른 종류(강의)면 따로 센다 · 이름만 온 변수도 #{…} 로 감싼다', [r3.몸통.results[0].ok, 보낸것[2].kakaoOptions.templateId, 보낸것[2].kakaoOptions.variables],
    [true, 'vid_01', { '#{학생명}': '철수' }]);

  const r4 = await 부르기({ kind: 'sms', id: 'A1', items: [{ key: 'U1', vars: 변수 }] });
  봄('   모르는 kind 는 400', r4.status, 400);
  const r8 = await 부르기({ kind: 'qna', id: 'Q0', items: [{ key: 'U1', message: '변수 없이 옛 꼴' }] });
  봄('   변수가 없으면 bad_item (옛 화면이 문안만 보내면 안 나간다)', r8.몸통.results[0].why, 'bad_item');
  const r6 = await 부르기({ kind: 'qna', id: 'Q1', items: [{ key: 'U1', vars: { '#{학생명}': '철수', '#{질문}': '왜요' } }] });
  봄('   질문 답변(qna)도 간다 — 템플릿은 제 것', [r6.몸통.results[0].ok, 보낸것[3].kakaoOptions.templateId], [true, 'qna_01']);
  const r7 = await 부르기({ kind: 'wrong', id: '2026-09-19', items: [{ key: 'U1', vars: 변수 }] });
  봄('🔴 심사 안 끝난 템플릿(wrong)만 503 — 다른 알림은 막히지 않는다', [r7.status, r7.몸통.detail], [503, '워커 비밀이 없습니다: SOLAPI_TPL_WRONG']);
  const r5 = await 부르기({ kind: 'hw', id: 'A1', items: Array.from({ length: 51 }, () => ({ key: 'U1', vars: 변수 })) });
  봄('   한 번에 ' + 상수('NOTIFY_PER_CALL') + '명까지', r5.status, 400);
}

/* ── ③ 화면 쪽 ───────────────────────────────────────────────── */
{
  봄('🔵 숙제·강의가 같은 sendNotice 를 쓴다', (html.match(/onclick="event\.stopPropagation\(\); sendNotice\('(hw|vid)'/g) || []).length, 2);
  봄('   잠긴 단추(«아직 연결되지 않았습니다»)는 남아 있지 않다', /아직 연결되지 않았습니다/.test(html), false);
  봄('   답의 까닭을 사람 말로 옮긴다', /already:'오늘 이미 보냄'/.test(html) && /no_phone:'번호 없음'/.test(html), true);
  봄('   보내기 전에 묻는다 — 문자 요금이 나간다', /confirm\(items\.length \+ '명에게 카카오톡 알림을 보냅니다/.test(html), true);
  봄('🔴 옛 워커면 새 길을 안 부른다 — catch-all 이 AI 한도를 태운다 · 솔라피 판(22a)부터', /if\(!\(await notifyWorkerReady\(\)\)\)/.test(html.slice(html.indexOf('async function notifyPost'), html.indexOf('async function notifyPost')+400)) && /NOTIFY_WORKER_MIN = '2026-09-22a'/.test(html), true);
  봄('🔴 화면은 워커에 vars 를 실어 보낸다 (솔라피는 변수를 받는다)', /items\.map\(\(\{key, vars, message\}\) => \(\{key, vars, message\}\)\)/.test(html), true);
  봄('   네 문안이 다 «변수 → 글» 한 길로 지어진다', ['hw', 'vid', 'qna', 'wrong'].every(k => new RegExp('function ' + k + 'NoticeText\\([^)]*\\)\\{ return fillNotice\\(').test(html)), true);
  봄('   보내는 세 자리가 다 vars 를 싣는다', (html.match(/vars:\s+kind === 'hw' \? hwNoticeVars|vars: qnaNoticeVars\(|vars: wrongNoticeVars\(/g) || []).length, 3);
}

/* ── ④ 오답숙제 «풀 수 있게 된 순간» — 실제로 돌려 본다 ───────── */
{
  const lift = (이름) => {
    const at = html.search(new RegExp('^(async )?function ' + 이름 + '\\(', 'm'));
    let 깊이 = 0;
    for (let j = html.indexOf('{', at); j < html.length; j++) {
      if (html[j] === '{') 깊이++;
      else if (html[j] === '}') { 깊이--; if (!깊이) return html.slice(at, j + 1); }
    }
  };
  const DATA = {
    problemBank: [{ id: 'b1', status: 'approved', examId: 'e1' }, { id: 'b2', status: 'pending', examId: 'e1' }, { id: 'b3', status: 'approved', examId: 'e2' }],
    students: [{ studentId: 's1', name: '가' }, { studentId: 's2', name: '나' }, { studentId: 's3', name: '다' }, { studentId: 's4', name: '라', withdrawn: true }],
  };
  const state = { allRecords: {
    s1: { wrongHomework: [{ bankId: 'b1', done: false }, { bankId: 'b3', done: false }] },   // b1 새로 열림 · 풀 수 있는 것 둘
    s2: { wrongHomework: [{ bankId: 'b1', done: true }] },                                    // 이미 풀었다
    s3: { wrongHomework: [{ bankId: 'b2', done: false }] },                                   // 아직 공개 안 됨
    s4: { wrongHomework: [{ bankId: 'b1', done: false }] },                                   // 퇴원생
  } };
  const 나간것 = [];
  const F = new Function('DATA', 'state', 'wrongHomeworkLeft', 'examTitleOf', 'todayStr', 'notifyAuto', 'isWithdrawn', 'studentKeyOfSid', 'notifyPost', 'showToast', 'notifyWhy',
    lift('fillNotice') + '\n' + lift('wrongNoticeVars') + '\n' + lift('wrongNoticeText') + '\n' + lift('notifyWrongReady') + '\n' + lift('notifyAuto') + '\n'
    + 'const WRONG_NOTICE_TEMPLATE = ' + JSON.stringify(html.match(/const WRONG_NOTICE_TEMPLATE =\n`([^`]*)`/)[1]) + ';\n'
    + 'return { notifyWrongReady, notifyAuto };')(
    DATA, state,
    rec => (rec.wrongHomework || []).filter(h => { const b = DATA.problemBank.find(x => x.id === h.bankId); return b && b.status === 'approved' && !h.done; }),
    id => ({ e1: '9월 모의고사' })[id] || '', () => '2026-09-20',
    null, s => !!s.withdrawn, sid => 'uid-' + sid,
    async (kind, id, items) => { 나간것.push({ kind, id, items }); return { sent: items.length, results: items.map(i => ({ key: i.key, ok: true })) }; },
    () => {}, w => w);
  // notifyWrongReady 가 부르는 notifyAuto 는 같은 판 안의 것이어야 한다 — 위에서 null 로 준 자리를 실제 것으로 잇는다
  await F.notifyWrongReady(['b1']);
  봄('🔴 그 문항을 안 푼 채 들고 있는 학생에게만 — 푼 사람·공개 전 문항·퇴원생은 뺀다',
    나간것.map(n => [n.kind, n.id, n.items.map(i => i.key)]), [['wrong', '2026-09-20', ['uid-s1']]]);
  봄('   문안에는 출처와 «지금 풀 수 있는 문항 수»', 나간것[0].items[0].message,
    '[김하현수학연구소]\n가 학생, 새 오답숙제가 나왔습니다.\n출처: 9월 모의고사\n풀 수 있는 문항: 2개\n앱 학습 > 오답숙제에서 풀 수 있습니다.');
  봄('   변수도 같이 간다 — 솔라피가 이걸로 짓는다', 나간것[0].items[0].vars, { '#{학생명}': '가', '#{출처}': '9월 모의고사', '#{문항수}': '2' });
  봄('   공개하는 네 길이 다 부른다', (html.match(/notifyWrongReady\(/g) || []).length, 5);   // 정의 1 + advanceBankStatus · fillEmptyFromStore · bookReqAccept · bankAskAccept
}

console.log('\n  ' + (틀림 ? '🔴 ' : '✅ ') + 통과 + ' 통과 · ' + 틀림 + ' 실패');
process.exit(틀림 ? 1 : 0);
