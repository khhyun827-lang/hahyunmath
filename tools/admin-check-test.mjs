// 관리자 «점검» 칸 — 평소엔 접혀 있고, 이상하면 저절로 펴지는가 (2026-09-04)
//
//   node tools/admin-check-test.mjs
//
// 사용자가 물었다 — 「저장통로, 읽기아끼기, 데이터정리 … 계속 필요한 것들이야?」
// 답은 «필요하지만 평소에 보일 필요는 없다»여서 셋을 하나로 접었다.
//
// 🔴 **접는 순간 이 자리가 죽으면 안 된다.** 이 줄이 존재하는 까닭은 조용한 실패 때문이다 —
//    Firestore 규칙에 컬렉션이 없으면 저장이 «조용히» 실패하고, 그때 답을 준 것이 이 줄이었다
//    (variants 한 번, items 한 번). 그래서 **이상이 있으면 저절로 펴져야** 한다.
//    접힌 채로 조용히 있으면, 접기 전보다 나빠진다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function lift(name) {
  const at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, ok, 곁) => {
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇 + (곁 ? '\n      ' + 곁 : '')); }
};

/* 화면을 실제로 그려 본다. 바깥 것들은 스텁으로 갈아 끼운다. */
function 그리기({ 막힘 = [], 캐시 = 'cache', 열림 = '' } = {}) {
  const rows = ['variants', 'items'].map(n => ({ name: n, status: 막힘.includes(n) ? '막힘' : '열림' }));
  const state = { settingsForm: 열림, collCheck: { running: false, rows } };
  return new Function(
    'state', 'stSec', 'escHtml', 'checkCollections', 'itemsCacheStatHTML',
    'teacherCleanupHTML', 'ITEMS_CACHE_KEY', 'localStorage', 'itemsCacheHit',
    'NEEDED_COLLECTIONS', 'iconSvg',
    lift('teacherSettingsAdminHTML') + '\nreturn teacherSettingsAdminHTML();'
  )(state,
    (o) => `<section data-t="${o.title}">${o.desc || ''}${o.body || ''}</section>`,
    (s) => String(s == null ? '' : s),
    () => {}, () => '<div id="캐시칸"></div>', () => '<div id="정리칸"></div>',
    'k', { getItem: () => null }, 캐시, ['variants', 'items'], () => '');
}

console.log('\n관리자 점검 칸 — 평소엔 접히고, 이상하면 펴진다\n');

{ // 평소
  const h = 그리기({});
  봄('평소에는 «이상 없습니다»', h.includes('이상 없습니다'));
  봄('🔵 평소에는 세 덩이가 접혀 있다', !h.includes('id="캐시칸"'));
  봄('여는 단추가 있다', h.includes('열기'));
  봄('🔵 매일 쓰는 «관리자»가 위에 있다',
     h.indexOf('data-t="관리자"') >= 0 && h.indexOf('data-t="관리자"') < h.indexOf('점검'));
}
{ // 🔴 저장이 막혔을 때 — 이 자리의 존재 이유
  const h = 그리기({ 막힘: ['variants'] });
  봄('🔴 막히면 제목이 빨갛게 바뀐다', h.includes('봐주셔야 할 것이 있습니다'));
  봄('🔴 막히면 저절로 펴진다 (접힌 채로 조용히 있으면 안 된다)', h.includes('id="캐시칸"'));
  봄('🔴 푸는 법(규칙)을 그 자리에서 보여 준다', h.includes('match /variants/'));
  봄('접는 단추를 안 준다 — 접어 두면 안 되는 상태다', !/이상이 있습니다[\s\S]{0,200}>열기</.test(h));
}
{ // 캐시가 낡았을 때도 이상이다
  const h = 그리기({ 캐시: 'stale' });
  봄('🔴 낡은 캐시를 쓰는 중이면 그것도 이상이다', h.includes('봐주셔야 할 것이 있습니다'));
  봄('그때도 저절로 펴진다', h.includes('id="캐시칸"'));
}
{ // 사람이 열었을 때
  const h = 그리기({ 열림: 'check' });
  봄('열면 세 덩이가 다 보인다', h.includes('id="캐시칸"'));
  봄('저장 통로 · 읽기 아끼기 · 데이터 정리 머리가 다 있다',
     h.includes('저장 통로') && h.includes('읽기 아끼기') && h.includes('데이터 정리'));
}
{ // ⚠ 정리 도구를 열면 점검도 열려 있어야 한다
  const h = 그리기({ 열림: 'cleanup' });
  봄('⚠ 정리 도구를 열어도 점검이 안 접힌다', h.includes('id="정리칸"'));
}

console.log('\n  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패\n');
process.exit(fail ? 1 : 0);
