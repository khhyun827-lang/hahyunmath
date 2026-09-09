// hwpx 를 풀고 다시 묶는다 (2026-09-09에 item-code-stamp.mjs 에서 빼냈다)
//
// hwpx 는 zip 이다. 안의 `Contents/section*.xml` 을 고치고 도로 묶으면 한글이 읽는다.
//
// 🔴 **여기 있던 것이 item-code-stamp.mjs 안에만 있었다.** 지문을 박는 도구가 같은 일을 하게 되어
//    빼냈다 — 두 벌로 두면 한쪽만 고쳐진다(이 노트가 여러 번 물린 자리다).
//
// ⚠ **mimetype 은 맨 앞에 · 압축 없이** 넣어야 한다. 이걸 어기면 한글이 파일을 못 연다.
//    (project2 tools/zip.mjs 와 같은 규칙)
import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import { execFileSync } from 'child_process';

/* 🔴 **푼 폴더는 프로그램이 끝날 때 스스로 지운다** (2026-09-10에 디스크를 채우고 나서 넣었다).
   여태 아무도 안 지웠다. hwpx 하나가 풀리면 80MB 남짓인데 검사와 훑기가 파일마다 한 번씩
   부르니, 하루 돌려 보는 사이에 **임시 폴더 933개 · 79GB 가 쌓여 C: 가 100% 로 찼다.**
   (그 자리에서 「No space left on device」로 검사가 넘어졌다.)
   🔵 부르는 쪽에 «지워라»를 맡기지 않는다 — 부르는 곳이 여럿이고, 한 곳만 잊어도 다시 샌다.
     여기서 목록을 들고 있다가 끝날 때 한꺼번에 지운다.
   ⚠ 낸 파일(`묶는다`)은 임시 폴더 «밖»에 쓰이므로 이 청소에 안 걸린다. */
const 푼것들 = [];
let 청소걸었나 = false;
function 청소를건다(){
  if(청소걸었나) return;
  청소걸었나 = true;
  const 쓸다 = () => {
    for(const d of 푼것들.splice(0)) { try{ fs.rmSync(d, { recursive:true, force:true }); }catch(e){} }
  };
  process.on('exit', 쓸다);
  /* ⚠ Ctrl+C 로 멈춰도 지운다 — 사람이 멈춘 날에만 새면 그게 제일 안 보인다. */
  for(const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { 쓸다(); process.exit(130); });
}

/* 임시 폴더에 푼다. **원본 옆에는 아무것도 안 남긴다.** */
export function 푼다(src){
  청소를건다();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hwpx-'));
  푼것들.push(tmp);
  execFileSync('unzip', ['-qo', src, '-d', tmp]);
  return { tmp, cdir: path.join(tmp, 'Contents') };
}

/* 다 쓴 것을 «지금» 지운다 — 한 프로그램이 파일 여럿을 훑을 때 쓴다.
   🔵 안 불러도 끝날 때 지워지지만, 다섯 파일을 도는 동안 400MB 를 들고 있을 까닭이 없다. */
export function 치운다(것){
  const tmp = 것 && 것.tmp ? 것.tmp : 것;
  if(!tmp) return;
  const i = 푼것들.indexOf(tmp);
  if(i >= 0) 푼것들.splice(i, 1);
  try{ fs.rmSync(tmp, { recursive:true, force:true }); }catch(e){}
}

/* `Contents/section0.xml`, `section1.xml` … 을 번호 차례로. */
export function 섹션들(cdir){
  return fs.readdirSync(cdir)
    .filter((f) => /^section\d+\.xml$/.test(f))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]))
    .map((f) => path.join(cdir, f));
}

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf){
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* 폴더를 통째로 hwpx 하나로 묶는다. 낸 파일 수를 돌려준다. */
export function 묶는다(tmp, out){
  const all = [];
  (function walk(d, rel) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f), r = rel ? rel + '/' + f : f;
      if (fs.statSync(p).isDirectory()) walk(p, r); else all.push([r, p]);
    }
  })(tmp, '');
  all.sort((a, b) => (a[0] === 'mimetype' ? -1 : b[0] === 'mimetype' ? 1 : a[0].localeCompare(b[0])));

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
  fs.writeFileSync(out, Buffer.concat([...locals, cd, eocd]));
  return all.length;
}
