// 유사쌍 / 유형 묶음을 사람이 읽을 수 있게 찍는다.
import fs from 'fs';
const db = JSON.parse(fs.readFileSync('../analysis/problem_database.json', 'utf8'));
const by = Object.fromEntries(db.map((p) => [p.id, p]));
const cut = (s, n) => (s || '').replace(/\n+/g, ' ⏎ ').slice(0, n);

const mode = process.argv[2];
if (mode === 'pairs') {
  const pairs = JSON.parse(fs.readFileSync('../analysis/similarity_analysis.json', 'utf8'));
  const from = +(process.argv[3] || 0), to = +(process.argv[4] || 10);
  for (const q of pairs.slice(from, to)) {
    const a = by[q.a], b = by[q.b];
    console.log(`\n━━ ${q.type} ${a.canon_name} · 유사 ${q.score} (구조 ${q.skel_sim}/개념 ${q.tag_sim}) ${q.cross_book ? '[교차]' : '[같은책]'}`);
    console.log(`  ${a.id} ${a.source_book}#${a.original_problem_number} 난이도${a.difficulty}  ${cut(a.body, 200)}`);
    console.log(`  ${b.id} ${b.source_book}#${b.original_problem_number} 난이도${b.difficulty}  ${cut(b.body, 200)}`);
  }
} else if (mode === 'type') {
  const T = process.argv[3];
  const g = db.filter((p) => p.canon === T).sort((x, y) => x.difficulty - y.difficulty);
  console.log(`━━ ${T} ${g[0]?.canon_name} — ${g.length}제`);
  for (const p of g) {
    console.log(`\n[${p.id}] ${p.source_book}#${p.original_problem_number} 난이도${p.difficulty} ${p.canon_src}${p.choice ? ' 객관식' : ''}${p.descriptive ? ' 서술' : ''}${p.figure ? ' 그림' : ''}`);
    console.log('   ' + cut(p.body, +(process.argv[4] || 230)));
  }
} else if (mode === 'ids') {
  for (const id of process.argv.slice(3)) {
    const p = by[id];
    console.log(`\n[${p.id}] ${p.source_book}#${p.original_problem_number} ${p.canon} 난이도${p.difficulty}`);
    console.log('본문: ' + cut(p.body, 420));
    console.log('해설: ' + cut(p.answer, 300));
  }
}
