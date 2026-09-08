// 휴강·보강, 그리고 반별 공지 (2026-09-08 · 사용자 요청)
//
//   node tools/offday-notice-test.mjs
//
// 🔴 **왜 재는가** — 둘 다 «누구에게 걸리는가»가 요지다.
//   · 휴강: 반을 안 고르면 전체, 고르면 그 반만. 잘못 걸리면 **남의 반 수업이 사라진다.**
//   · 공지: 반을 안 고르면 전체, 고르면 그 반만. 잘못 걸리면 **남의 반 공지가 학생에게 간다.**
//   🔵 둘이 «같은 규칙»(빈 배열 = 전체)이라 한자리에서 잰다 — 규칙이 갈리면 그때 가른다.
//
// ⚠ 달력에 어떻게 그려지는가는 `student-calendar-test.mjs` 가 잰다. 여기는 «고르는 규칙»이다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

function lift(name){
  let at = html.indexOf('function ' + name + '(');
  if(at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if(html.slice(at - 6, at) === 'async ') at -= 6;     // ⚠ async 를 떼면 await 가 문법 흠이 된다
  let depth = 0;
  for(let j = html.indexOf('{', at); j < html.length; j++){
    if(html[j] === '{') depth++;
    else if(html[j] === '}'){ depth--; if(!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

// ── ① 휴강이 «누구에게» 걸리는가 ────────────────────────────────────
console.log(NL + '① 휴강 — 반을 안 고르면 전체, 고르면 그 반만' + NL);
{
  const days = [
    {id:'o1', date:'2026-09-21', label:'추석', classIds:[], moveTo:''},          // 전체
    {id:'o2', date:'2026-10-03', label:'개천절', classIds:['c2'], moveTo:''},     // GA1 만
    {id:'o3', date:'2026-11-05', label:'행사', classIds:[], moveTo:'2026-11-07'}, // 옮김
  ];
  const state = {offDays: {days}};
  const F = new Function('state',
    lift('offDaysAll') + NL + lift('offDayFor') + NL + lift('movedInto')
    + NL + 'return {offDaysAll, offDayFor, movedInto};')(state);

  봄('🔵 반을 안 고른 것은 «모든 반»에 걸린다', !!F.offDayFor('c1', '2026-09-21'), true);
  봄('   다른 반에도 걸린다', !!F.offDayFor('c2', '2026-09-21'), true);
  /* 🔴 여기가 틀리면 남의 반 휴강으로 내 수업이 사라진다. */
  봄('🔴 반을 고른 것은 그 반에만 걸린다', !!F.offDayFor('c2', '2026-10-03'), true);
  봄('🔴 다른 반에는 «안» 걸린다', !!F.offDayFor('c1', '2026-10-03'), false);
  봄('아무 일 없는 날은 null', F.offDayFor('c1', '2026-09-22'), null);

  봄('🔵 옮긴 날에 «보강»이 잡힌다', (F.movedInto('c1', '2026-11-07')||{}).id, 'o3');
  봄('🔴 원래 날은 여전히 휴강이다', (F.offDayFor('c1', '2026-11-05')||{}).id, 'o3');
  봄('   그리고 어디로 갔는지 들고 있다', (F.offDayFor('c1','2026-11-05')||{}).moveTo, '2026-11-07');
  봄('안 옮긴 것은 movedInto 에 안 걸린다', F.movedInto('c1', '2026-09-21'), null);

  봄('목록이 비어 있어도 안 터진다', new Function('state',
    lift('offDaysAll') + NL + lift('offDayFor') + NL + 'return offDayFor;')({}) ('c1','2026-01-01'), null);
}

// ── ② 공지가 «누구에게» 가는가 ──────────────────────────────────────
console.log(NL + '② 반별 공지 — 빈 배열은 «전체»다' + NL);
{
  const DATA = {notices: [
    {id:1, title:'전체 공지', classIds:[]},
    {id:2, title:'옛 공지'},                       // 🔴 필드 자체가 없는 옛 문서
    {id:3, title:'GA1 만', classIds:['c2']},
    {id:4, title:'두 반', classIds:['c1','c3']},
  ]};
  const F = new Function('DATA',
    lift('noticeIsForClass') + NL + lift('noticesFor') + NL
    + 'return {noticeIsForClass, noticesFor};')(DATA);

  봄('전체 공지는 누구에게나', F.noticeIsForClass(DATA.notices[0], ['c9']), true);
  /* 🔴 옛 공지에는 `classIds` 가 아예 없다 — 옮길 것 없이 «전체»가 되어야 한다. */
  봄('🔴 필드가 없는 옛 공지도 전체다', F.noticeIsForClass(DATA.notices[1], ['c9']), true);
  봄('🔴 반을 고른 공지는 그 반에게만', F.noticeIsForClass(DATA.notices[2], ['c2']), true);
  봄('🔴 남의 반에는 «안» 간다', F.noticeIsForClass(DATA.notices[2], ['c1']), false);
  봄('여러 반 중 하나만 들어도 간다', F.noticeIsForClass(DATA.notices[3], ['c3']), true);
  봄('반이 없는 학생은 전체 공지만 본다',
     F.noticesFor({classIds: []}).map(n => n.id), [1, 2]);
  봄('c2 학생이 보는 것', F.noticesFor({classIds: ['c2']}).map(n => n.id), [1, 2, 3]);
  봄('c1 학생이 보는 것', F.noticesFor({classIds: ['c1']}).map(n => n.id), [1, 2, 4]);
  봄('여러 반을 듣는 학생', F.noticesFor({classIds: ['c1','c2']}).map(n => n.id), [1, 2, 3, 4]);
  봄('ctx 가 없어도 안 터진다', F.noticesFor(null).map(n => n.id), [1, 2]);
}

// ── ③ 세는 자리가 목록과 같은가 ─────────────────────────────────────
console.log(NL + '③ 🔴 안 읽은 수도 «내 반 것»으로 센다' + NL);
{
  /* 🔴 목록은 걸러 놓고 «수»는 전체로 세면, 벨이 울려서 들어갔는데 새 것이 없다.
     화면 셋(학생 공지 목록·서브내비 숫자·홈의 벨)이 **같은 함수**를 지나야 한다. */
  const 코드 = html;
  봄('🔴 학생 공지 목록이 noticesFor 를 쓴다',
     코드.includes('const 내것 = noticesFor(stuCtx());'), true);
  봄('   그 수로 «안 읽음»을 센다',
     코드.includes("unseenCount('notice', 내것.length)"), true);
  봄('🔴 서브내비 숫자도 noticesFor 를 쓴다',
     코드.includes("notice:  unseenCount('notice', noticesFor(c).length)"), true);
  봄('🔴 홈의 벨도 내 반으로 거른다',
     코드.includes('DATA.notices.filter(n=>noticeIsForClass(n, myClassIds)).length'), true);
  /* ⚠ 「전체 개수」를 그대로 쓰는 자리가 남아 있으면 그 자리만 거짓말을 한다. */
  봄('⚠ 안 거른 DATA.notices.length 로 세는 자리가 없다',
     (코드.match(/unseenCount\('notice', DATA\.notices\.length\)/g) || []).length, 0);
}

// ── ④ 망가뜨려 무는지 ───────────────────────────────────────────────
console.log(NL + '④ ⚠ 망가뜨려 무는지 본다' + NL);
{
  /* «빈 배열 = 전체»를 빼면 반을 안 고른 공지가 아무에게도 안 간다. */
  const 지키는줄 = '  if(!대상.length) return true;                       // 반을 안 고른 것 = 전체 공지';
  봄('⚠ 「빈 배열은 전체」 줄이 실제로 있다', lift('noticeIsForClass').includes(지키는줄), true);
  const G = new Function('DATA',
    lift('noticeIsForClass').split(지키는줄).join('') + NL + 'return noticeIsForClass;')({});
  봄('⚠ 그 줄을 빼면 전체 공지가 아무에게도 안 간다(=검사가 문다)',
     G({classIds: []}, ['c1']), false);

  /* 휴강 쪽도 같은 규칙이다 — 빼면 전체 휴강이 아무 반에도 안 걸린다. */
  const 휴강줄 = "    && (!o.classIds || !o.classIds.length || o.classIds.includes(classId))) || null;";
  봄('⚠ 휴강에도 같은 줄이 있다', lift('offDayFor').includes(휴강줄), true);
  const H = new Function('state',
    lift('offDaysAll') + NL
    + lift('offDayFor').split(휴강줄).join('    && o.classIds.includes(classId)) || null;')
    + NL + 'return offDayFor;')({offDays:{days:[{id:'o1', date:'2026-09-21', classIds:[]}]}});
  봄('⚠ 그 줄을 빼면 전체 휴강이 아무 반에도 안 걸린다(=검사가 문다)',
     H('c1', '2026-09-21'), null);
}

console.log(`${NL}  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패${NL}`);
process.exit(fail ? 1 : 0);
