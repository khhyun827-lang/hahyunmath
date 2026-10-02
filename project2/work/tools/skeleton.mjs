// 섹션 XML 의 뼈대를 들여쓰기해서 찍는다 (구조 파악용)
import fs from 'fs';
const dir = process.argv[2], sec = process.argv[3] || 'section2';
const s = fs.readFileSync(`${dir}/Contents/${sec}.xml`, 'utf8');
const h = fs.readFileSync(`${dir}/Contents/header.xml`, 'utf8');
const st = {};
for (const m of h.matchAll(/<hh:style id="(\d+)"[^>]*name="([^"]*)"/g)) st[m[1]] = m[2];

const KEEP = new Set(['hp:p', 'hp:tbl', 'hp:tr', 'hp:tc', 'hp:run', 'hp:t', 'hp:rect',
  'hp:pic', 'hp:endNote', 'hp:subList', 'hp:equation', 'hp:img', 'hp:sz', 'hp:pos']);
let d = 0;
const out = [];
for (const m of s.matchAll(/<(\/?)(h[phc]:[a-zA-Z]+)([^>]*?)(\/?)>|([^<]+)/g)) {
  const [, c, tag, attr, sc, txt] = m;
  if (txt !== undefined) { if (txt.trim()) out.push('  '.repeat(d) + '"' + txt.trim().slice(0, 46) + '"'); continue; }
  if (!KEEP.has(tag)) continue;
  if (c) { d = Math.max(0, d - 1); continue; }
  let a = '';
  const sid = (attr.match(/styleIDRef="(\d+)"/) || [])[1];
  const cid = (attr.match(/charPrIDRef="(\d+)"/) || [])[1];
  const pid = (attr.match(/paraPrIDRef="(\d+)"/) || [])[1];
  if (sid !== undefined) a += ' [' + (st[sid] ?? sid) + ']';
  if (pid !== undefined) a += ' pp' + pid;
  if (cid !== undefined) a += ' cp' + cid;
  const rc = attr.match(/rowCnt="(\d+)" colCnt="(\d+)"/); if (rc) a += ` ${rc[1]}행${rc[2]}열`;
  const ad = attr.match(/colAddr="(\d+)" rowAddr="(\d+)"/); if (ad) a += ` (r${ad[2]}c${ad[1]})`;
  const bi = attr.match(/binaryItemIDRef="([^"]+)"/); if (bi) a += ' bin=' + bi[1];
  const wh = attr.match(/width="(\d+)" height="(\d+)"/); if (wh && tag === 'hp:sz') a += ` ${wh[1]}x${wh[2]}`;
  out.push('  '.repeat(d) + '<' + tag + a + (sc ? '/' : ''));
  if (!sc) d++;
}
const from = +(process.argv[4] || 0), to = +(process.argv[5] || 80);
console.log(out.slice(from, to).join('\n'));
console.log(`\n... 총 ${out.length} 줄`);
