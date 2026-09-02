// 문항 코드 — 파일에 심기 (2026-09-02)
//
//   node tools/item-code-stamp.mjs <원본.hwpx> <매핑표.json> --out <새파일.hwpx>
//
// 미주 **맨 앞**에 `[K2-E-01-0001]` 을 넣는다. 미주 번호 바로 뒤, 「[정답]」 앞자리다.
//
// 🔴 **원본을 고치지 않는다.** 언제나 새 파일로 낸다. --out 이 이미 있으면 멈춘다.
//
// ── 왜 한글(COM)로 타이핑하지 않고 XML 을 고치는가 ──────────────────────
// project2 노트의 「한글이 튕긴다 — id·instid 가 겹쳐서」는 **표를 복제할 때** 나는 일이다.
// 여기서 하는 것은 «글자 한 조각을 더하는 것»이라 새 개체가 안 생기고, 그래서 그 함정이 없다.
// 반대로 COM 으로 미주 76 개를 하나씩 찾아 들어가는 쪽이 훨씬 미끄럽다.
// **대신 한글이 있으면 결과를 한글로 열어 확인한다** — 그게 진짜 검사다.
//
// ⚠ 두 번 돌려도 두 번 안 박힌다 (이미 있으면 건너뛴다).

import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import { execFileSync } from 'child_process';

const argv = process.argv.slice(2);
const bare = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--out', '--chapter'].includes(argv[i - 1])));
const [SRC, MAP] = bare;
const oi = argv.indexOf('--out');
const OUT = oi >= 0 ? argv[oi + 1] : '';
const ci = argv.indexOf('--chapter');
const CHAPTER = ci >= 0 ? argv[ci + 1] : '';

if (!SRC || !MAP || !OUT || !CHAPTER) {
  console.error('쓰는 법: node tools/item-code-stamp.mjs <원본.hwpx> <장부.json> --chapter 01 --out <새파일.hwpx>');
  console.error('  ⚠ 장부에는 여러 단원이 들어 있다. --chapter 로 «이 파일의 단원»을 골라야 한다.');
  process.exit(1);
}
if (fs.existsSync(OUT)) {
  console.error(`멈춘다 — 「${OUT}」 이 이미 있다. 덮어쓰지 않는다.`);
  process.exit(1);
}

// ⚠ 장부는 (과목·책) 하나에 한 파일이고 **여러 단원이 섞여 있다.**
//   이 파일에 해당하는 단원만 골라야 한다. 안 고르면 코드가 통째로 밀려 박힌다.
const mapping = JSON.parse(fs.readFileSync(MAP, 'utf8'));
const mine = mapping.items.filter((i) => i.chapter === CHAPTER).sort((a, b) => a.seq - b.seq);
if (!mine.length) {
  console.error(`멈춘다 — 장부에 ${CHAPTER} 단원이 없다. 있는 단원: ${(mapping.chapters || []).join(', ') || '(없음)'}`);
  process.exit(2);
}
const codes = mine.map((i) => i.code);

// ── 푼다 (언제나 임시 폴더. 원본 옆에 아무것도 안 남긴다) ────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
execFileSync('unzip', ['-qo', SRC, '-d', tmp]);
const cdir = path.join(tmp, 'Contents');

// ── 미주 첫 문단 맨 앞에 코드를 꽂는다 ─────────────────────────────────
// ⚠ 첫 run 안에는 미주 번호를 찍는 <hp:autoNum> ctrl 이 들어 있다.
//   그 **뒤에** 넣어야 번호가 앞에 남는다. 앞에 넣으면 번호가 코드 뒤로 밀린다.
//   (build.mjs 의 AUTONUM 주석이 말하는 그 자리다.)
function stampNote(noteXml, code) {
  if (noteXml.includes(`<hp:t>[${code}]`)) return { xml: noteXml, done: false, why: '이미 있다' };

  const runRe = /<hp:run\b[^>]*>/;
  const rm = noteXml.match(runRe);
  if (!rm) return { xml: noteXml, done: false, why: 'run 을 못 찾았다' };

  let at = rm.index + rm[0].length;
  // autoNum ctrl 이 바로 뒤에 있으면 그것을 건너뛴다
  const after = noteXml.slice(at);
  const ctrl = after.match(/^\s*<hp:ctrl>[\s\S]*?<\/hp:ctrl>/);
  if (ctrl) at += ctrl[0].length;

  // ⚠ 뒤에 공백을 붙이지 않는다 — 원본 미주가 이미 « [정답]» 처럼 공백으로 시작한다.
  //   붙이면 「[코드]  [정답]」 처럼 공백이 둘이 되고, 그건 종이에 그대로 나간다.
  return { xml: noteXml.slice(0, at) + `<hp:t>[${code}]</hp:t>` + noteXml.slice(at), done: true, why: '' };
}

const files = fs.readdirSync(cdir)
  .filter((f) => /^section\d+\.xml$/.test(f))
  .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));

let seen = 0, stamped = 0;
const skipped = [];
for (const f of files) {
  const p = path.join(cdir, f);
  let xml = fs.readFileSync(p, 'utf8');
  let out = '', last = 0;
  const re = /<hp:endNote\b[^>]*>[\s\S]*?<\/hp:endNote>/g;
  let m;
  while ((m = re.exec(xml))) {
    const code = codes[seen];
    seen++;
    if (!code) { skipped.push(`${seen}번 — 매핑표에 코드가 없다`); continue; }
    const r = stampNote(m[0], code);
    if (r.done) stamped++; else skipped.push(`${code} — ${r.why}`);
    out += xml.slice(last, m.index) + r.xml;
    last = m.index + m[0].length;
  }
  out += xml.slice(last);
  fs.writeFileSync(p, out, 'utf8');
}

if (seen !== codes.length) {
  console.error(`\n🔴 멈춘다 — 파일의 미주는 ${seen}개인데 매핑표는 ${codes.length}개다.`);
  console.error('   두 수가 같지 않으면 코드가 «엉뚱한 문항»에 박힌다. 아무것도 안 냈다.');
  process.exit(2);
}

// ── 다시 묶는다 ────────────────────────────────────────────────────────
// ⚠ mimetype 은 «맨 앞에 · 압축 없이». (project2 tools/zip.mjs 와 같은 규칙)
const all = [];
(function walk(d, rel) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f), r = rel ? rel + '/' + f : f;
    if (fs.statSync(p).isDirectory()) walk(p, r); else all.push([r, p]);
  }
})(tmp, '');
all.sort((a, b) => (a[0] === 'mimetype' ? -1 : b[0] === 'mimetype' ? 1 : a[0].localeCompare(b[0])));

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const locals = [], central = [];
let off = 0;
for (const [name, full] of all) {
  const data = fs.readFileSync(full);
  const store = name === 'mimetype';
  const comp = store ? data : zlib.deflateRawSync(data, { level: 9 });
  const nameB = Buffer.from(name, 'utf8');
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
  lh.writeUInt16LE(store ? 0 : 8, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12);
  lh.writeUInt32LE(crc32(data), 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22);
  lh.writeUInt16LE(nameB.length, 26); lh.writeUInt16LE(0, 28);
  locals.push(lh, nameB, comp);
  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
  ch.writeUInt16LE(store ? 0 : 8, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0, 14);
  ch.writeUInt32LE(crc32(data), 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(nameB.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
  ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(off, 42);
  central.push(ch, nameB);
  off += lh.length + nameB.length + comp.length;
}
const cd = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(all.length, 8); eocd.writeUInt16LE(all.length, 10);
eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
fs.writeFileSync(OUT, Buffer.concat([...locals, cd, eocd]));

console.log(`\n  미주 ${seen}개 · 코드를 심은 것 ${stamped}개`);
if (skipped.length) { console.log('  ⚠ 건너뛴 것 ' + skipped.length + '건'); skipped.slice(0, 8).forEach((s) => console.log('     ' + s)); }
console.log(`  냈다 → ${OUT}  (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)}MB · 파일 ${all.length}개)`);
console.log(`  원본 「${path.basename(SRC)}」 는 한 글자도 안 고쳤다.\n`);
