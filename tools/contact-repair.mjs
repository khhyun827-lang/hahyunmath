// 전화번호가 빠진 학생을 엑셀 명단으로 메운다 (2026-09-13 · K-15)
//
//   node tools/contact-repair.mjs <명단1.xlsx> [명단2.xlsx …]          ← 재 보기만 한다
//   node tools/contact-repair.mjs <명단…> --go                          ← 실제로 쓴다
//   node tools/contact-repair.mjs <명단…> --go --force                  ← 이미 있는 값도 덮는다
//
// 🔴 **왜 빠졌나 — 둘이다.**
//   ① 일괄 등록이 읽는 열 이름은 `학부모전화번호` 인데, 명단 하나는 머리가 **`학부전화번호`** 다.
//      («모»가 빠졌다.) 그 반은 학부모 번호가 **통째로 빈 채로** 들어갔다.
//      ⚠ 일괄 등록은 «없으면 빈 값»으로 조용히 넘어간다 — 아무 말도 안 한다.
//   ② 엑셀이 번호를 **숫자**로 들고 있으면 앞의 0 이 떨어진다(`01047020451` → `1047020451`).
//      네 파일 중 셋이 그 꼴이다.
//
// 🔵 **맞추는 잣대는 «숫자만 남긴 학번»이다** — 앞의 0 이 있든 없든 같은 학생으로 본다.
//   ⚠ 이름까지 같은지 함께 본다. 다르면 **손대지 않고 말만 한다** — 짐작으로 쓰면 남의 번호가 박힌다.
//
// ⚠ 쓰는 것은 `contacts` 뿐이다. `students` 문서에는 번호를 안 넣는다(09-13 K-11의 규칙).

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { 강사로로그인 } from './fb-login.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const 파일들 = process.argv.slice(2).filter(a => !a.startsWith('--'));
const 쓴다 = process.argv.includes('--go');
const 덮는다 = process.argv.includes('--force');
if (!파일들.length) {
  console.error('명단 xlsx 를 하나 이상 주세요.\n  node tools/contact-repair.mjs <명단.xlsx> [--go] [--force]');
  process.exit(2);
}

/* ---------- xlsx 를 표로 (라이브러리 없이 — zip + XML) ---------- */
function 엑셀읽기(src) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-'));
  try {
    execFileSync('unzip', ['-qo', src, '-d', tmp]);
    const ssPath = path.join(tmp, 'xl', 'sharedStrings.xml');
    let ss = [];
    if (fs.existsSync(ssPath)) {
      const x = fs.readFileSync(ssPath, 'utf8');
      ss = [...x.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m =>
        [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => 풀기(t[1])).join(''));
    }
    const sheet = fs.readFileSync(path.join(tmp, 'xl', 'worksheets', 'sheet1.xml'), 'utf8');
    const rows = [];
    for (const r of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const 줄 = [];
      for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
        const col = 칸번호(c[1]);
        const t = (c[2].match(/t="([^"]+)"/) || [])[1] || 'n';
        const v = (c[3].match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        const inline = (c[3].match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];
        줄[col] = t === 's' && v !== undefined ? (ss[+v] ?? '')
          : t === 'inlineStr' && inline !== undefined ? 풀기(inline)
          : v !== undefined ? 풀기(v) : '';
      }
      rows.push(줄);
    }
    return rows.map(r => Array.from({ length: r.length }, (_, i) => String(r[i] ?? '')));
  } finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} }
}
function 칸번호(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
function 풀기(s) {
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
}

/* ---------- 전화번호 — 화면과 «같은 함수»를 쓴다 ----------
   🔴 여기에 옮겨 적으면 도구와 화면이 갈린다. index.html 에서 그대로 뜬다. */
const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 index.html 에서 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
const { phoneDigits, phoneLabel } = new Function(
  lift('phoneDigits') + '\n' + lift('phoneLabel') + '\nreturn { phoneDigits, phoneLabel };')();

/* ---------- 엑셀에서 «학번 → 번호» 를 모은다 ---------- */
const 머리찾기 = (head, ...후보) => {
  for (const c of 후보) { const i = head.findIndex(h => String(h).replace(/\s/g, '') === c); if (i >= 0) return i; }
  return -1;
};
const 명단 = new Map();       // 숫자만 남긴 학번 → {이름, phone, parentPhone, 어디}
const 머리말썩음 = [];
for (const f of 파일들) {
  const rows = 엑셀읽기(f);
  const head = rows[0] || [];
  const iId = 머리찾기(head, '아이디', '학번');
  const iNm = 머리찾기(head, '이름');
  const iPa = 머리찾기(head, '학부모전화번호', '학부모전화', '학부전화번호', '학부전화');
  const iSt = 머리찾기(head, '학생전화번호', '학생전화', '전화번호');
  /* 🔴 일괄 등록이 읽는 이름과 다르면 **그 반은 통째로 비어 들어간다** — 소리 내어 말한다. */
  if (iPa >= 0 && String(head[iPa]).replace(/\s/g, '') !== '학부모전화번호')
    머리말썩음.push(path.basename(f) + ' — 학부모 열 머리가 「' + head[iPa] + '」 입니다 (일괄 등록은 「학부모전화번호」만 읽습니다)');
  if (iId < 0 || iNm < 0) { console.log('⚠ ' + path.basename(f) + ' — 아이디/이름 열을 못 찾아 건너뜁니다'); continue; }
  for (const r of rows.slice(1)) {
    const id = phoneDigits(r[iId] || '');
    if (!id) continue;
    명단.set(id.replace(/^0/, ''), {
      이름: String(r[iNm] || '').trim(),
      phone: phoneLabel(r[iSt] >= 0 ? r[iSt] : ''),
      parentPhone: iPa >= 0 ? phoneLabel(r[iPa]) : '',
      어디: path.basename(f),
    });
  }
}
console.log('엑셀에서 읽은 학생 ' + 명단.size + '명 (' + 파일들.length + '개 파일)');
if (머리말썩음.length) {
  console.log('\n🔴 **열 머리가 일괄 등록과 다릅니다 — 이것이 누락의 한 원인입니다:**');
  머리말썩음.forEach(x => console.log('   · ' + x));
}

/* ---------- 실 DB ---------- */
const { BASE, H } = await 강사로로그인();
async function 목록(col) {
  let out = [], tok = '';
  do {
    const r = await fetch(BASE + '/' + col + '?pageSize=300' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''), { headers: H });
    if (!r.ok) { console.error('🔴 ' + col + ' 을 못 읽었습니다 (http ' + r.status + ') — 멈춥니다.'); process.exit(1); }
    const j = await r.json();
    (j.documents || []).forEach(d => {
      let v = null; try { v = JSON.parse(d.fields.value.stringValue); } catch (e) {}
      if (v) out.push({ id: d.name.split('/').pop(), v });
    });
    tok = j.nextPageToken || '';
  } while (tok);
  return out;
}
const students = await 목록('students');
const contacts = await 목록('contacts');
const 연락처 = new Map();
contacts.forEach(c => { if (c.v.studentId) 연락처.set(c.v.studentId, c); });
console.log('실 DB — 학생 ' + students.length + '명 · 연락처 문서 ' + contacts.length + '개\n');

/* ---------- 맞춰 본다 ---------- */
const 할것 = [], 이미 = [], 못찾음 = [], 이름다름 = [];
for (const s of students) {
  if (s.v.withdrawnAt) continue;
  const key = phoneDigits(s.v.studentId || '').replace(/^0/, '');
  const 엑셀 = 명단.get(key);
  if (!엑셀) { 못찾음.push(s.v.name + ' (' + s.v.studentId + ')'); continue; }
  /* ⚠ 짐작으로 쓰지 않는다 — 이름이 다르면 말만 하고 넘어간다. */
  if (엑셀.이름 && s.v.name && 엑셀.이름 !== s.v.name) {
    이름다름.push(s.v.studentId + ' — DB 「' + s.v.name + '」 vs 엑셀 「' + 엑셀.이름 + '」');
    continue;
  }
  const 있던것 = 연락처.get(s.v.studentId);
  const 지금 = { phone: (있던것 && 있던것.v.phone) || '', parentPhone: (있던것 && 있던것.v.parentPhone) || '' };
  const 새것 = { studentId: s.v.studentId, phone: 지금.phone, parentPhone: 지금.parentPhone };
  const 바뀜 = [];
  for (const k of ['phone', 'parentPhone']) {
    const 넣을것 = 엑셀[k];
    if (!넣을것) continue;
    const 빔 = !지금[k];
    const 꼴만다름 = !빔 && phoneDigits(지금[k]) === phoneDigits(넣을것) && 지금[k] !== 넣을것;
    const 아주다름 = !빔 && phoneDigits(지금[k]) !== phoneDigits(넣을것);
    if (빔) { 새것[k] = 넣을것; 바뀜.push(k + ' 없었음 → ' + 넣을것); }
    else if (꼴만다름) { 새것[k] = 넣을것; 바뀜.push(k + ' 꼴 ' + 지금[k] + ' → ' + 넣을것); }
    else if (아주다름 && 덮는다) { 새것[k] = 넣을것; 바뀜.push('🔴 ' + k + ' 덮음 ' + 지금[k] + ' → ' + 넣을것); }
    else if (아주다름) { 바뀜.push('⚠ ' + k + ' 값이 다릅니다 (DB ' + 지금[k] + ' · 엑셀 ' + 넣을것 + ') — --force 라야 덮습니다'); }
  }
  const 쓸것있나 = 바뀜.some(x => !x.startsWith('⚠'));
  if (쓸것있나) 할것.push({ uid: (있던것 && 있던것.id) || s.id, 이름: s.v.name, 값: 새것, 바뀜 });
  else if (바뀜.length) 할것.push({ 말만: true, 이름: s.v.name, 바뀜 });
  else 이미.push(s.v.name);
}

console.log('── 고칠 것 ' + 할것.filter(x => !x.말만).length + '명 ──');
할것.forEach(x => console.log((x.말만 ? '  ⚠ ' : '  · ') + x.이름 + ' :: ' + x.바뀜.join(' / ')));
console.log('\n이미 맞는 학생 ' + 이미.length + '명');
if (못찾음.length) { console.log('\n⚠ 엑셀에 없는 학생 ' + 못찾음.length + '명 — 손대지 않습니다:'); 못찾음.forEach(x => console.log('   · ' + x)); }
if (이름다름.length) { console.log('\n🔴 이름이 안 맞아 건너뛴 것:'); 이름다름.forEach(x => console.log('   · ' + x)); }

if (!쓴다) { console.log('\n▶ 재 보기만 했습니다. 실제로 쓰려면 `--go` 를 붙이세요.'); process.exit(0); }

let 썼다 = 0, 막힘 = 0;
for (const x of 할것) {
  if (x.말만) continue;
  /* 🔴 **앱과 «같은 모양»으로 쓴다** — `dbSetDoc` 은 `value` 한 칸에 JSON 을 넣고,
     문서 밖에는 `색인칸`(uid·week)만 적는다. 연락처에는 그 둘이 없으므로 `value` 뿐이다.
     ⚠ 여기서 칸을 더 적으면 앱이 다음에 저장할 때 그 칸이 사라진다(PATCH 가 문서를 통째로 간다). */
  const body = { fields: { value: { stringValue: JSON.stringify(x.값) } } };
  const r = await fetch(BASE + '/contacts/' + encodeURIComponent(x.uid), {
    method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (r.ok) 썼다++; else { 막힘++; console.log('   🔴 ' + x.이름 + ' — http ' + r.status); }
}
console.log('\n✅ ' + 썼다 + '건 썼습니다' + (막힘 ? ' · 🔴 ' + 막힘 + '건 막혔습니다' : ''));
