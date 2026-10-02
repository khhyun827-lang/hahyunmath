// 복습테스트용 «중복 문항 풀» 을 SCENE 별로 정리한다.
//
// 삭제할 때 «무엇으로 대체되는가»를 전부 적어 뒀으므로, 그 대응을 뒤집으면
// 「이 문항과 같은 학습 요소를 묻는 다른 문항들」 목록이 된다.
// ⚠ 사유가 «또 다른 삭제 문항»을 가리키는 경우가 있다 (A-020 → B-065 → D-015).
//    사슬을 끝까지 따라가 «유지 문항»에 붙인다.
import fs from 'fs';

import { POOL_EXCLUDE } from './decisions6.mjs';
const A = (n) => JSON.parse(fs.readFileSync('../analysis/' + n, 'utf8'));
const keep = A('keep_list.json');
// ⚠ v2 재판정에는 «1차/2차» 구분이 없다 — 한 번에 「대표가 이것을 덮는가」로 판정했다.
//    옛 delete_list_2nd.json 을 같이 읽으면 이미 지운 판정이 섞여 개수가 부풀었다.
const del = [...A('delete_list.json').map((p) => ({ ...p, pass: '삭제' })),
  ...A('excluded_list.json').map((p) => ({ ...p, pass: '교재에서 뺌' }))]
  // ⚠ 교육과정 밖(가우스)·모의고사 문항은 복습테스트에도 못 쓴다
  .filter((p) => !POOL_EXCLUDE[p.id]);
const order = ['step1', 'step2', 'step3'].flatMap((n) => A(`${n}_list.json`));
const db = Object.fromEntries(A('problem_database.json').map((p) => [p.id, p]));

const keptIds = new Set(keep.map((p) => p.id));
const delById = Object.fromEntries(del.map((p) => [p.id, p]));
const noOf = Object.fromEntries(order.map((p, i) => [p.id, i + 1]));   // 통번호

// 사유에서 가리키는 문항 -> 유지 문항까지 따라간다
const ID = /[ABCD]-\d{3}/g;
function resolve(id, seen = new Set()) {
  if (keptIds.has(id)) return id;
  if (seen.has(id) || !delById[id]) return null;
  seen.add(id);
  for (const t of delById[id].reason.match(ID) || []) {
    const r = resolve(t, seen);
    if (r) return r;
  }
  return null;
}

const pool = {};              // 유지문항 id -> [삭제문항...]
const byType = {};            // 유형만 가리킨 것
for (const p of del) {
  const target = (p.reason.match(ID) || []).map((t) => resolve(t)).find(Boolean);
  if (target) (pool[target] ||= []).push(p);
  else (byType[p.canon] ||= []).push(p);
}

// ── SCENE 별 파일 ──────────────────────────────────────────────────────
const SCENE = { 1: '기본 유형', 2: '발전 유형', 3: '실전' };
let total = 0;
for (const sn of [1, 2, 3]) {
  const list = order.filter((p) => p.step === sn);
  let m = `# 복습테스트 문항 풀 — SCENE ${sn} (${SCENE[sn]})\n\n`;
  m += `교재에 실린 ${list.length}문항 각각에 대해, **같은 학습 요소를 묻지만 압축 과정에서 뺀 문항**을 모았다.\n`;
  m += `복습테스트는 여기서 골라 내면 «배운 것과 같은 것을 묻되 문제는 다른» 시험지가 된다.\n\n`;
  m += `- **원 문항** = 교재에 실린 것 (학생이 이미 푼 것)\n`;
  m += `- **복습 후보** = 뺀 문항. 「사유」가 곧 «어떤 점에서 같은가»이다\n\n---\n\n`;
  let n = 0;
  for (const p of list) {
    const cand = (pool[p.id] || []).sort((a, b) => a.difficulty - b.difficulty);
    n += cand.length;
    m += `## ${String(noOf[p.id]).padStart(3, '0')}. ${p.canon} ${p.canon_name}\n`;
    m += `**원 문항** ${p.source} (\`${p.id}\`, 난이도 ${p.difficulty})\n`;
    m += `> ${p.reason}\n\n`;
    if (!cand.length) { m += `복습 후보 **없음** — 이 문항은 대체할 유사문항 없이 홀로 남았다.\n\n`; continue; }
    m += `복습 후보 **${cand.length}개**\n\n| 문항 | 출처 | 난이도 | 뺀 차수 | 어떤 점에서 같은가 |\n|---|---|---|---|---|\n`;
    for (const c of cand) m += `| \`${c.id}\` | ${c.source} | ${c.difficulty} | ${c.pass} | ${c.reason} |\n`;
    m += '\n';
  }
  fs.writeFileSync(`../analysis/복습풀_SCENE${sn}.md`, m, 'utf8');
  total += n;
  console.log(`SCENE ${sn}: 교재 ${list.length}문항 · 복습 후보 ${n}개 · 후보 없는 문항 ${list.filter((p) => !(pool[p.id] || []).length).length}`);
}

// ── 어느 문항에도 못 붙은 것 ───────────────────────────────────────────
const orphan = Object.entries(byType).sort();
let m = `# 복습테스트 문항 풀 — 유형에만 붙는 것\n\n`;
m += `삭제 사유가 «특정 문항»이 아니라 «그 유형은 다른 곳이 담당한다»였던 것들이다.\n`;
m += `그 유형의 교재 문항 아무거나와 짝지어 쓰면 된다.\n\n`;
for (const [T, ps] of orphan) {
  const owners = order.filter((p) => p.canon === T).map((p) => `${String(noOf[p.id]).padStart(3, '0')}(${p.id})`);
  m += `## ${T} ${db[ps[0].id]?.canon_name || ''} — ${ps.length}개\n`;
  m += `교재의 해당 유형 문항: ${owners.join(' · ') || '없음'}\n\n| 문항 | 출처 | 난이도 | 사유 |\n|---|---|---|---|\n`;
  for (const p of ps.sort((a, b) => a.difficulty - b.difficulty)) m += `| \`${p.id}\` | ${p.source} | ${p.difficulty} | ${p.reason} |\n`;
  m += '\n';
}
fs.writeFileSync('../analysis/복습풀_유형별.md', m, 'utf8');
const orphanN = orphan.reduce((s, [, v]) => s + v.length, 0);
console.log(`유형에만 붙는 것: ${orphanN}개 (${orphan.length}개 유형)`);
console.log(`합계 ${total + orphanN} / 삭제 ${del.length}`);

// 기계가 읽을 판도 함께
fs.writeFileSync('../analysis/review_pool.json', JSON.stringify({
  byProblem: order.map((p) => ({
    통번호: noOf[p.id], scene: p.step, id: p.id, 출처: p.source,
    유형: `${p.canon} ${p.canon_name}`,
    복습후보: (pool[p.id] || []).map((c) => ({ id: c.id, 출처: c.source, 난이도: c.difficulty, 차수: c.pass, 사유: c.reason })),
  })),
  byType: byType,
}, null, 1), 'utf8');
