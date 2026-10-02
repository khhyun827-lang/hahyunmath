// 사람이 읽을 산출물 (Markdown) 을 낸다.
import fs from 'fs';
import { TYPES } from './canon.mjs';
const R = (f) => JSON.parse(fs.readFileSync('../analysis2/' + f, 'utf8'));
const W = (f, s) => fs.writeFileSync('../analysis2/' + f, s, 'utf8');
const db = R('problem_database.json');
const keep = R('keep_list.json'), del = R('delete_list.json'), rev = R('review_list.json');
const smap = R('source_map.json');
const s1 = R('step1_list.json'), s2 = R('step2_list.json'), s3 = R('step3_list.json');
const BOOKS = ['고쟁이', '올림포스', '유형반복R', '절대등급'];
const bookOf = (id) => ({ A: '고쟁이', B: '올림포스', C: '유형반복R', D: '절대등급' }[id[0]]);

const del2 = R('delete_list_2nd.json');

// delete_list_2nd.md — 2차 압축은 «1차에서 남긴 이유»와 나란히 놓아야 검토가 된다
let m2 = `# 2차 압축 삭제 목록 — ${del2.length}제\n\n`;
m2 += `1차는 «같은 문제인가»를 물었고, 2차는 «이 문제를 추가로 풀 필요가 있는가»를 물었다.\n`;
m2 += `1차에서 남겼던 이유를 나란히 두었으니, 그 근거가 더 강하다고 보이면 되살리면 된다.\n\n`;
m2 += `| 문항 | 출처 | 유형 | 1차에서 남긴 이유 | 2차에서 지운 이유 |\n|---|---|---|---|---|\n`;
for (const p of del2.sort((a, b) => a.canon.localeCompare(b.canon) || a.id.localeCompare(b.id)))
  m2 += `| ${p.id} | ${p.source} | ${p.canon} | ${p.일차_유지사유} | ${p.reason} |\n`;
W('delete_list_2nd.md', m2);

// delete_list.md — 삭제 이유가 핵심이다
let m = `# 삭제 목록 — ${del.length}제\n\n`;
m += `«무엇으로 대체되는가»를 반드시 적었다. 이유가 «동일»이면 학습 요소가 같다는 뜻이고,\n`;
m += `«완전 중복»이면 수치까지 같은 문항이라는 뜻이다.\n\n`;
m += `| 문항 | 출처 | 유형 | 삭제 이유 |\n|---|---|---|---|\n`;
for (const p of del.sort((a, b) => a.canon.localeCompare(b.canon) || a.id.localeCompare(b.id)))
  m += `| ${p.id} | ${p.source} | ${p.canon} | ${p.reason} |\n`;
W('delete_list.md', m);

// review_list.md
m = `# 검토(REVIEW) 목록 — ${rev.length}제\n\n확신이 서지 않아 «지우지 않고» 남긴 것들이다. 사람의 판단이 필요하다.\n\n`;
for (const p of rev) m += `### ${p.id} · ${p.source} · ${p.canon} ${p.canon_name}\n${p.reason}\n\n`;
W('review_list.md', m);

// keep_list.md (STEP 별)
m = `# 유지 목록 — ${keep.length}제\n\n`;
for (const [name, L] of [['SCENE 1 (기본 유형)', s1], ['SCENE 2 (발전 유형)', s2], ['SCENE 3 (실전)', s3]]) {
  m += `\n## ${name} — ${L.length}제\n\n| ${name.startsWith('SCENE 3') ? '차례' : '유형'} | 문항 | 출처 | 선정 이유 |\n|---|---|---|---|\n`;
  for (const p of L) {
    const left = name.startsWith('SCENE 3') ? String(p.step3_order) : `${p.canon} ${p.canon_name}`;
    m += `| ${left} | ${p.id} | ${p.source} | ${p.reason} |\n`;
  }
}
W('keep_list.md', m);

// source_map.md — 출처 관리
m = `# 출처 지도\n\n최종 교재의 모든 문항에 대해 «원출처»와 «이 문항이 대표하는 유사문항»을 남긴다.\n\n`;
for (const s of smap.sort((a, b) => (a.step - b.step) || a.canon.localeCompare(b.canon))) {
  m += `### ${s.id} — SCENE ${s.step} · ${s.canon} ${s.canon_name}\n`;
  m += `- 대표 출처: **${s.대표출처}**\n`;
  if (s.유사문항.length) m += `- 유사 문항: ${s.유사문항.join(' / ')}\n`;
  m += `- 대표로 선정한 이유: ${s.선정이유}\n\n`;
}
W('source_map.md', m);

// type_clusters.md
const cl = R('type_clusters.json').filter((c) => c.size > 1);
m = `# 유형 묶음 — 2제 이상 ${cl.length}묶음\n\n구조 서명과 개념 태그가 겹쳐 «같이 놓고 봐야 하는» 문항들이다.\n\n`;
for (const c of cl) {
  m += `**${c.cluster}** · ${c.canon} ${c.canon_name} · ${c.size}제 · ${c.books.join(', ')}\n`;
  m += c.members.map((x) => `${x.id}(${x.book} ${x.no}번, 난이도 ${x.d})`).join(' · ') + '\n\n';
}
W('type_clusters.md', m);

// 최종 보고
const pct = (n, d) => (n / d * 100).toFixed(0) + '%';
m = `# 프로젝트2 — 4권 압축 분석 보고서 (집합)\n\n`;
m += `> 최종 교재 제작 «전»의 분석 결과입니다. 아직 hwpx 는 만들지 않았습니다.\n\n`;
m += `## 1. 전체 현황\n\n| | |\n|---|---|\n`;
m += `| 4권 총 문항 수 | **470제** |\n`;
for (const b of BOOKS) m += `| ㆍ${b} | ${db.filter((p) => p.source_book === b).length}제 |\n`;
m += `| 분석 완료 문항 수 | **470제 (100%)** |\n| 표준 유형 수 | **23개** |\n`;
m += `| 유사문항 묶음(2제 이상) | ${cl.length}묶음 (${cl.reduce((s, c) => s + c.size, 0)}제) |\n`;
m += `| 명백한 중복(수치까지 같음) | 3쌍 — A-095=C-170, A-100≒C-160, C-020≒D-002 |\n`;
m += `| **1차 삭제** (중복 제거) | ${del.length}제 |\n| **2차 삭제** (교육적 압축) | ${del2.length}제 |\n`;
m += `| **유지 예정** | **${keep.length}제** |\n| **REVIEW** | ${rev.length}제 |\n`;
m += `| 예상 최종 문항 수 | **${keep.length}제** (REVIEW 를 모두 살리면 ${keep.length + rev.length}) |\n`;
m += `| 예상 압축률 | **${((1 - keep.length / 470) * 100).toFixed(1)}%** (470 → ${keep.length}) |\n\n`;
m += `## 2. STEP(SCENE)별 예상 문항 수\n\n| | 문항 수 | 고쟁이 | 올림포스 | 유형반복R | 절대등급 |\n|---|---|---|---|---|---|\n`;
for (const [n, L] of [['STEP 1 · 기본 유형', s1], ['STEP 2 · 발전 유형', s2], ['STEP 3 · 실전', s3]])
  m += `| ${n} | **${L.length}제** | ${BOOKS.map((b) => L.filter((p) => bookOf(p.id) === b).length).join(' | ')} |\n`;
m += `\n## 3. 교재별 최종 출처 분포\n\n| 교재 | 원본 | 채택 | 채택률 | 최종 교재 내 비중 |\n|---|---|---|---|---|\n`;
for (const b of BOOKS) {
  const t = db.filter((p) => p.source_book === b).length;
  const k = keep.filter((p) => bookOf(p.id) === b).length;
  m += `| ${b} | ${t}제 | **${k}제** | ${pct(k, t)} | ${pct(k, keep.length)} |\n`;
}
m += `\n## 4. 유형 커버리지 (23개 전부 살아 있는지)\n\n| 유형 | 유지 | S1 | S2 | S3 |\n|---|---|---|---|---|\n`;
for (const [T, name] of Object.entries(TYPES)) {
  const g = keep.filter((p) => p.canon === T);
  m += `| ${T} ${name} | ${g.length} | ${g.filter((p) => p.step === 1).length} | ${g.filter((p) => p.step === 2).length} | ${g.filter((p) => p.step === 3).length} |\n`;
}
W('REPORT.md', m);
console.log('analysis/ 에 저장:', fs.readdirSync('../analysis').join('  '));
