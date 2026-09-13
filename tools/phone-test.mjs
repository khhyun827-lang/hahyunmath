// 전화번호 — «-» 를 넣어 적는다 · 누락을 소리 내어 말한다 (2026-09-13 · K-15)
//
//   node tools/phone-test.mjs
//
// 🔴 **왜 재는가** — 사용자 신고: 「전화번호가 누락된 게 있는 것 같아 … "-"추가해서 볼 수 있도록해줘」.
//   캐 보니 누락의 원인이 **둘**이었다:
//     ① 올린 명단 하나의 열 머리가 **「학부전화번호」**(«모»가 빠졌다) — 일괄 등록이 못 읽어
//        그 반 여덟 명의 학부모 번호가 **아무 말 없이** 빈 채로 들어갔다.
//     ② 엑셀이 번호를 **숫자**로 들고 있으면 앞의 0 이 떨어진다(`01047020451` → `1047020451`).
//
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);
function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if (html.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const P = new Function(lift('phoneDigits') + NL + lift('phoneLabel') + NL + 'return { phoneDigits, phoneLabel };')();

/* ═══ ① 꼴 맞추기 ═══ */
console.log(NL + '① 번호를 «-» 로 끊어 적는다' + NL);
{
  봄('휴대폰 11자리', P.phoneLabel('01047020451'), '010-4702-0451');
  봄('🔴 엑셀이 떨어뜨린 앞의 0 을 되돌린다 (열 자리 10…)', P.phoneLabel('1047020451'), '010-4702-0451');
  봄('이미 «-» 가 있어도 같은 답', P.phoneLabel('010-4702-0451'), '010-4702-0451');
  봄('사이에 빈칸·점이 섞여 있어도', [P.phoneLabel('010 4702 0451'), P.phoneLabel('010.4702.0451')],
    ['010-4702-0451', '010-4702-0451']);
  봄('옛 휴대폰 10자리(011·016…)', [P.phoneLabel('0113334444'), P.phoneLabel('01712345678')],
    ['011-333-4444', '017-1234-5678']);
  봄('서울 국번', [P.phoneLabel('0212345678'), P.phoneLabel('021234567')], ['02-1234-5678', '02-123-4567']);
  봄('지역번호 세 자리', P.phoneLabel('0311234567'), '031-123-4567');
  봄('빈 값은 빈 값', [P.phoneLabel(''), P.phoneLabel(null), P.phoneLabel(undefined)], ['', '', '']);
  /* 🔴 모르는 꼴은 지어내지 않는다 — 없는 번호가 화면에 서면 그걸 믿고 전화를 건다. */
  봄('🔴 모르는 꼴은 그대로 둔다 (지어내지 않는다)',
    [P.phoneLabel('010301021375'), P.phoneLabel('1234'), P.phoneLabel('전화 없음')],
    ['010301021375', '1234', '전화 없음']);
  봄('숫자만 뽑기', [P.phoneDigits('010-1234-5678'), P.phoneDigits('없음'), P.phoneDigits(null)],
    ['01012345678', '', '']);
  봄('두 번 걸어도 같은 답 (멱등)', P.phoneLabel(P.phoneLabel('1047020451')), '010-4702-0451');
}

/* ═══ ② 보는 자리마다 그 함수를 거친다 ═══ */
console.log(NL + '② 번호가 보이는 자리가 다 그 함수를 거치는가' + NL);
{
  봄('명단 표', lift('teacherRosterHTML').includes('phoneLabel(s.parentPhone)'), true);
  봄('학생 상세',
    lift('sdScreenHTML').includes('phoneLabel(s.parentPhone)') && lift('sdScreenHTML').includes('phoneLabel(s.phone)'), true);
  봄('고치는 칸', lift('studentAccountFormHTML').includes('phoneLabel(s.parentPhone)'), true);
  봄('명단 엑셀', lift('exportRosterExcel').includes('phoneLabel(s.parentPhone), phoneLabel(s.phone)'), true);
  봄('반 엑셀', lift('exportClassExcel').includes('phoneLabel(s.parentPhone), phoneLabel(s.phone)'), true);
  봄('미제출 알림이 보내는 번호', html.includes('const HW_NOTICE_TO = s => phoneLabel(s.phone);'), true);
  /* 저장할 때도 같은 꼴로 — 다음에 읽을 때 또 셀 일이 없다 */
  봄('🔴 새로 만들 때 그 꼴로 저장한다', lift('addStudent').includes("phoneLabel(document.getElementById('new-sparentphone').value)"), true);
  봄('🔴 고칠 때도 그 꼴로 저장한다', lift('updateStudentInfo').includes("phoneLabel(document.getElementById('info-sparentphone').value)"), true);
  /* 🔴 «trim() 만 하던» 옛 자리가 남아 있지 않은가 */
  봄('🔴 옛 자리가 안 남았다', /document\.getElementById\('(new|info)-s(parent)?phone'\)\.value\.trim\(\)/.test(html), false);
}

/* ═══ ③ 일괄 등록 — 열 이름 한 글자로 한 반이 비었다 ═══ */
console.log(NL + '③ 일괄 등록 — 조용히 비어 들어가지 않는가' + NL);
{
  const imp = lift('handleStudentExcelFile');
  봄('🔴 「학부전화번호」(«모» 빠진 것)도 받는다 — 이것이 누락의 원인이었다',
    imp.includes("r['학부전화번호']"), true);
  봄('본래 이름도 그대로 받는다', imp.includes("r['학부모전화번호']"), true);
  봄('🔵 읽으면서 «-» 꼴로 맞춘다',
    imp.includes('parentPhone: phoneLabel(') && imp.includes('phone: phoneLabel('), true);
  /* 🔴 이름을 더 받아 주는 것만으로는 모자라다 — 열 이름은 얼마든지 더 달라질 수 있다.
     이 흠의 본질은 «조용히» 빈 채로 들어간 것이다. 올리기 전에 세어 말해야 한다. */
  const prev = lift('studentImportPreviewHTML');
  봄('🔴 빈 전화번호를 세어 «올리기 전에» 말한다',
    prev.includes("const 번호빔 = ['parentPhone', 'phone'].map(k => imp.rows.filter(r => !r[k]).length);"), true);
  봄('그 수를 화면에 세운다', prev.includes('전화번호 빈 칸'), true);

  /* 실제로 그려 본다 — 열 머리가 틀린 명단을 올린 꼴 */
  const state = { studentImportPreview: { classId: 'c1', rows: [
      { studentId: 'a1', name: '가나', pw: '123456', parentPhone: '', phone: '010-1111-1111' },
      { studentId: 'a2', name: '다라', pw: '123456', parentPhone: '', phone: '010-2222-2222' },
      { studentId: 'a3', name: '마바', pw: '123456', parentPhone: '010-3333-3333', phone: '' },
    ] }, importResult: null, importBusy: false };
  const V = new Function('state', 'DATA', 'escHtml', 'classNameOf', 'iconSvg',
    lift('studentImportPreviewHTML') + NL + 'return studentImportPreviewHTML;')(
    state, { students: [] }, s => String(s == null ? '' : s), () => '고1GA1', () => '');
  const 그림 = V();
  봄('🔴 학부모가 둘 비었다고 말한다', /전화번호 빈 칸 학부모 2 · 학생 1/.test(그림), true);
  state.studentImportPreview.rows.forEach(r => { r.parentPhone = '010-0000-0000'; r.phone = '010-0000-0000'; });
  봄('다 차 있으면 아무 말 안 한다', V().includes('전화번호 빈 칸'), false);
}

/* ═══ ④ 메우는 도구 ═══ */
console.log(NL + '④ contact-repair — 엑셀로 메운다' + NL);
{
  const tool = fs.readFileSync(path.join(ROOT, 'tools', 'contact-repair.mjs'), 'utf8').replace(/\r\n/g, '\n');
  봄('🔴 번호 함수를 index.html 에서 떠 온다 (옮겨 적으면 도구와 화면이 갈린다)',
    tool.includes("lift('phoneDigits')") && tool.includes("lift('phoneLabel')"), true);
  봄('🔴 재 보기가 기본 — `--go` 라야 쓴다', tool.includes("const 쓴다 = process.argv.includes('--go');"), true);
  봄('🔴 이름이 다르면 손대지 않고 말만 한다', tool.includes('이름다름.push'), true);
  봄('🔴 값이 다르면 --force 라야 덮는다', tool.includes('--force 라야 덮습니다'), true);
  봄('학생 문서가 아니라 contacts 에만 쓴다',
    tool.includes("BASE + '/contacts/'") && !tool.includes("BASE + '/students/'"), true);
  봄('앱과 같은 모양으로 쓴다 (value 한 칸)',
    tool.includes('const body = { fields: { value: { stringValue: JSON.stringify(x.값) } } };'), true);
  봄('열 머리가 다르면 소리 내어 말한다', tool.includes('머리말썩음'), true);
  봄('못 읽으면 멈춘다 (빈 것과 못 읽은 것을 가른다)', tool.includes('을 못 읽었습니다 (http'), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
