// 창고 색인 칸 — 도구가 items·variants 를 쓸 때 웹(dbSetDoc)과 같은 칸을 붙인다 (2026-10-22 · 검색 구조 1단계)
//
//   import { 창고칸 } from './ix.mjs';
//   body: JSON.stringify({ fields: 창고칸(collection, id, data) })
//
// 🔴 칸을 정하는 함수는 index.html 의 ixFieldsOf 를 «글자로» 떠 온다 — 두 벌로 두면 웹과 도구가 다른 단원을 적는다.
//    장부는 웹과 같은 것(codes/*.json)을 같은 차례로 읽는다.
// 🔵 `_t`(쓴 시각)도 같이 적는다 — 웹은 이것으로 «바뀐 것만» 받는다(도구가 안 적어서 그날은 통째로 읽었다).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const at = html.indexOf('function ixFieldsOf(');
if (at < 0) throw new Error('index.html 에 ixFieldsOf 가 없습니다');
let 끝 = -1;
for (let j = html.indexOf('{', at), d = 0; j < html.length; j++) {
  if (html[j] === '{') d++;
  else if (html[j] === '}' && !--d) { 끝 = j + 1; break; }
}
const ixFieldsOf = new Function(html.slice(at, 끝) + '\nreturn ixFieldsOf;')();

const 장부 = {};
const 목록 = JSON.parse(fs.readFileSync(path.join(ROOT, 'codes/index.json'), 'utf8')).ledgers || [];
for (const L of 목록)
  for (const it of (JSON.parse(fs.readFileSync(path.join(ROOT, 'codes', L.file), 'utf8')).items || [])) 장부[it.code] = it;

export function 창고칸(collection, id, data) {
  const f = { value: { stringValue: JSON.stringify(data) } };
  if (collection !== 'items' && collection !== 'variants') return f;
  return { ...f, _t: { integerValue: String(Date.now()) }, ...ixFieldsOf(collection, id, data, 장부) };
}
