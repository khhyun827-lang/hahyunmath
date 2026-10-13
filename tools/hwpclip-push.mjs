// 한글 붙여넣기 원본을 창고 옆 `hwpclip/{코드}` 에 올린다 (2026-10-14)
//
//   node tools/hwpclip-push.mjs <폴더>          ← 재보기만(크기·개수)
//   node tools/hwpclip-push.mjs <폴더> --go     ← 강사로 로그인해 올린다
//
// <폴더> 에는 `<코드>.json` 이 문항마다 하나 — 한글이 복사할 때 싣는 data-hwpjson 그대로
// (수식 미리보기 그림만 뗀 것). 교재에서 뽑는 일은 한글이 있어야 해서 저장소 밖 스크립트가 한다.
// 🔴 정답·해설이 든 원본이다 — 이 폴더를 저장소에 넣지 말 것(공개 저장소). 규칙은 강사·조교만 읽게 했다.
// ⚠ Firestore 문서 한도 1MiB — 넘는 문항은 건너뛰고 이름을 댄다.

import fs from 'fs';
import path from 'path';
import { 강사로로그인 } from './fb-login.mjs';

const [dir, ...rest] = process.argv.slice(2);
const go = rest.includes('--go');
if (!dir) { console.error('폴더를 주세요'); process.exit(1); }
const files = fs.readdirSync(dir).filter(f => /^\d{7}[A-Z]?(-[A-Z]\d\d)?\.json$/.test(f));
const 한도 = 1_000_000;
const 큰것 = [];
const 할것 = files.map(f => {
  const j = fs.readFileSync(path.join(dir, f), 'utf8');
  JSON.parse(j);                                   // 깨진 파일이면 여기서 멈춘다
  const value = '{"at":' + Date.now() + ',"j":' + j + '}';
  const n = Buffer.byteLength(value);
  if (n > 한도) 큰것.push(f + ' ' + n);
  return { code: f.slice(0, -5), value, n };
}).filter(x => x.n <= 한도);
console.log('문항', files.length, '· 올릴 것', 할것.length, '· 합', Math.round(할것.reduce((s, x) => s + x.n, 0) / 1024), 'KB');
if (큰것.length) console.log('🔴 1MB 넘어 건너뜀:', 큰것.join(', '));
if (!go) { console.log('(재보기만 — 올리려면 --go)'); process.exit(0); }

const { BASE, H } = await 강사로로그인();
let ok = 0;
const 실패 = [];
for (let i = 0; i < 할것.length; i += 6) {
  await Promise.all(할것.slice(i, i + 6).map(async x => {
    const r = await fetch(BASE + '/hwpclip/' + encodeURIComponent(x.code), {
      method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { value: { stringValue: x.value } } }),
    });
    if (r.ok) ok++; else 실패.push(x.code + ' http ' + r.status);
  }));
  if (i % 60 === 0) console.log(' …', ok);
}
console.log('올림', ok, '/', 할것.length, 실패.length ? '· 실패 ' + 실패.join(', ') : '');
if (실패.length) process.exit(1);

// 화면은 이 목록에 든 코드에만 «한글» 단추를 단다 — 있던 목록에 더한다(다른 교재 것을 안 지운다)
const kv = BASE + '/kv/hwpclip-codes';
const 옛 = await fetch(kv, { headers: H });
if (!옛.ok && 옛.status !== 404) { console.error('🔴 kv/hwpclip-codes 읽기 실패 http ' + 옛.status); process.exit(1); }
const 있던 = 옛.ok ? JSON.parse((await 옛.json()).fields.value.stringValue) : [];
const 목록 = [...new Set([...있던, ...할것.map(x => x.code)])].sort();
const w = await fetch(kv, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(목록) } } }) });
console.log('kv/hwpclip-codes', w.ok ? 목록.length + '개' : '🔴 http ' + w.status);
if (!w.ok) process.exit(1);
