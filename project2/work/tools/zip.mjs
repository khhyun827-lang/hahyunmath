// hwpx 로 묶는다. ⚠ mimetype 은 «맨 앞에 · 압축 없이» 들어가야 한다 (ODF/EPUB 규칙).
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const SRC = 'build/hwpx';
const OUT = process.argv[2] || 'build/[2026][엔딩크레딧]집합_압축본.hwpx';

const files = [];
(function walk(d, rel) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f), r = rel ? rel + '/' + f : f;
    if (fs.statSync(p).isDirectory()) walk(p, r); else files.push([r, p]);
  }
})(SRC, '');
files.sort((a, b) => (a[0] === 'mimetype' ? -1 : b[0] === 'mimetype' ? 1 : a[0].localeCompare(b[0])));

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
for (const [name, full] of files) {
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
eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
fs.writeFileSync(OUT, Buffer.concat([...locals, cd, eocd]));
console.log('만들었다:', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + 'MB ·', files.length, '개 파일');
