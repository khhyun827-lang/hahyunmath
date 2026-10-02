// ③단계 — 유사쌍을 이어 «묶음»으로 만든다 (연결 요소).
// 묶음 = 사람이 한 번에 놓고 볼 단위. 홑문항은 그 자체로 후보 대표다.
import fs from 'fs';
const db = JSON.parse(fs.readFileSync('../analysis/problem_database.json', 'utf8'));
const pairs = JSON.parse(fs.readFileSync('../analysis/similarity_analysis.json', 'utf8'));
const by = Object.fromEntries(db.map((p) => [p.id, p]));

const parent = {};
const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
for (const p of db) parent[p.id] = p.id;
for (const q of pairs) { const a = find(q.a), b = find(q.b); if (a !== b) parent[a] = b; }

const groups = {};
for (const p of db) (groups[find(p.id)] ||= []).push(p);
const clusters = Object.values(groups)
  .map((g) => g.sort((a, b) => a.difficulty - b.difficulty))
  .sort((a, b) => b.length - a.length);

const sizes = {};
for (const c of clusters) sizes[c.length] = (sizes[c.length] || 0) + 1;
console.log('묶음', clusters.length, '개 · 크기 분포:',
  Object.entries(sizes).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}제×${v}`).join('  '));
console.log('홑문항', (sizes[1] || 0), '· 2제 이상 묶음', clusters.filter((c) => c.length > 1).length,
  '(총', clusters.filter((c) => c.length > 1).reduce((s, c) => s + c.length, 0), '문항)');

fs.writeFileSync('../analysis/type_clusters.json', JSON.stringify(
  clusters.map((c, i) => ({
    cluster: 'G' + String(i + 1).padStart(3, '0'),
    canon: c[0].canon, canon_name: c[0].canon_name, size: c.length,
    books: [...new Set(c.map((p) => p.source_book))],
    members: c.map((p) => ({ id: p.id, book: p.source_book, no: p.original_problem_number, d: p.difficulty, canon: p.canon })),
  })), null, 1), 'utf8');

// 사람이 읽을 판
if (process.argv[2] === 'print') {
  const only = process.argv[3];
  const cut = (s, n) => (s || '').replace(/\n+/g, ' ⏎ ').slice(0, n);
  for (const [i, c] of clusters.entries()) {
    if (c.length < 2) continue;
    if (only && c[0].canon !== only) continue;
    console.log(`\n━━━ G${String(i + 1).padStart(3, '0')} · ${c[0].canon} ${c[0].canon_name} · ${c.length}제 · ${[...new Set(c.map((p) => p.source_book))].join(',')}`);
    for (const p of c) console.log(`  [${p.id}] ${p.source_book}#${p.original_problem_number} d${p.difficulty}${p.choice ? ' 객' : ''}${p.descriptive ? ' 서술' : ''}${p.figure ? ' 그림' : ''} ${cut(p.body, +(process.argv[4] || 175))}`);
  }
}
