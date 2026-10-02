// 파서가 «흘린 글»을 찾는다. 원본 XML 의 모든 hp:t 를 순서대로 뽑아
// 추출 결과에 그 글이 들어 있는지 본다.
import fs from 'fs';
import path from 'path';
import { extractHwpx } from './hwpx-extract.mjs';

const dir = process.argv[2];
const { body, notes } = extractHwpx(dir);
const hay = body + '\n' + notes.join('\n');

const cdir = path.join(dir, 'Contents');
const xml = fs.readdirSync(cdir).filter((f) => /^section/.test(f)).sort()
  .map((f) => fs.readFileSync(path.join(cdir, f), 'utf8')).join('');

const unent = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'");

let lost = 0, tot = 0;
const samples = [];
for (const m of xml.matchAll(/<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g)) {
  const t = unent(m[1].replace(/<[^>]*>/g, '')).trim();
  if (t.length < 4) continue;                       // 조각 글자는 건너뛴다
  if (!/[가-힣]/.test(t)) continue;                  // 한글이 든 것만 (수식은 별개)
  tot++;
  if (!hay.includes(t)) { lost++; if (samples.length < 14) samples.push(t.slice(0, 90)); }
}
console.log(path.basename(dir));
console.log('  한글 글토막', tot, '· 결과에 없는 것', lost);
samples.forEach((s) => console.log('   ✗', s));
