// 변형 그림의 «원점 O 두 번» 걷기 (2026-10-25) — figure.js 가 이제 원점에 O 점이 있으면 축의 O 를 안 찍는다.
// 학생 화면은 «저장된 SVG» 를 쓰므로 해당 변형만 새 figure.js 로 다시 그려 바꿔 쓴다.
//   node tools/fig-origin-fix.mjs [--go] [--checked]   ← --checked: «O 말고도 달라지는 것»까지 쓴다(옛 그리기 꼴 → 요즘 꼴) — 나란히 찍어(fig-compare-shot) 눈으로 본 뒤에만
// 🔴 안전 문: 새 그림 == «옛 그림에서 축의 O(text-anchor=end 인 O) 하나만 뺀 것» 일 때만 바꾼다.
//    그 사이 figure.js 의 다른 변화로 그림이 달라진 것은 건드리지 않고 이름만 알린다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 강사로로그인 } from './fb-login.mjs';
import { 창고칸 } from './ix.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
new Function(fs.readFileSync(path.join(HERE, '..', 'figure.js'), 'utf8'))();
const Figure = globalThis.Figure;
const 쓸까 = process.argv.includes('--go'), 본것 = process.argv.includes('--checked');
const { BASE, H } = await 강사로로그인();

const 원점O = sc => (sc.points || []).some(p => p && Math.abs(+p.x) < 1e-9 && Math.abs(+p.y) < 1e-9 && String(p.label || '').trim() === 'O');
const 축O = /<text [^>]*text-anchor="end"[^>]*><tspan font-style="italic">O<\/tspan><\/text>/;
let tok = '', 바꿀 = [], 다름 = [];
do {
  const r = await fetch(`${BASE}/variants?pageSize=300${tok ? '&pageToken=' + tok : ''}`, { headers: H });
  if (!r.ok) throw new Error('읽기 실패 ' + r.status);
  const j = await r.json();
  for (const d of j.documents || []) {
    const id = d.name.split('/').pop(), v = JSON.parse(d.fields.value.stringValue), im = v.image;
    if (!im || im.mdraw || !im.scene || !im.svg || !원점O(im.scene)) continue;
    const 새 = Figure.renderScene(im.scene);
    if (새 === im.svg.replace(축O, '')) 바꿀.push({ id, v, 새 });
    else { 다름.push(id); if (본것) 바꿀.push({ id, v, 새 }); }
  }
  tok = j.nextPageToken || '';
} while (tok);
console.log('바꿀 것', 바꿀.length, 바꿀.map(x => x.id).join(' '));
if (다름.length) console.log('⚠ 다시 그리면 O 말고도 달라지는 것(--checked 면 씀 · 아니면 손 안 댐)', 다름.length, 다름.join(' '));
if (!쓸까) { console.log('재보기만 — 쓰려면 --go'); process.exit(0); }
let 됨 = 0;
for (const { id, v, 새 } of 바꿀) {
  const nv = { ...v, image: { ...v.image, svg: 새 } };
  const w = await fetch(`${BASE}/variants/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: 창고칸('variants', id, nv) }) });
  if (w.ok) 됨++; else console.log('🔴', id, w.status);
}
await fetch(`${BASE}/kv/variantsVer`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: 창고칸('kv', 'variantsVer', String(Date.now())) }) });
console.log('바꿔 썼습니다', 됨);
