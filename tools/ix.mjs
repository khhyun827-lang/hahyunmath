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

// 버전 문서(kv/itemsVer · kv/variantsVer)를 웹 verBump 와 같은 꼴 {t, del, full} 로 올린다 (2026-10-25 · 검색 구조 5단계).
// 🔵 도구도 `_t` 를 적으니(창고칸) 웹은 «바뀐 것만» 받으면 된다 — 글자 버전을 올리면 기기마다 통째로 다시 읽었다.
//    dels = 지운 문서 id — 웹이 재운 것에서 뺀다. 버전을 못 읽으면 예전처럼 글자로 올린다(통째로 다시 읽게 — 남의 del 을 덮지 않게).
export async function 버전올림(BASE, H, key, dels = []) {
  const now = Date.now(), 칸 = (v) => JSON.stringify({ fields: { value: { stringValue: JSON.stringify(v) } } });
  const r = await fetch(BASE + '/kv/' + key, { headers: H });
  let cur = null;
  if (r.ok) { try { cur = JSON.parse((await r.json()).fields.value.stringValue); } catch (e) {} }
  else if (r.status !== 404) cur = undefined;
  const v = cur === undefined ? String(now) : (cur && typeof cur === 'object') ? cur : { full: now };
  if (typeof v === 'object') {
    v.t = now;
    v.del = (v.del || []).filter((d) => now - d[1] < 3 * 864e5).concat(dels.map((id) => [id, now]));
  }
  const w = await fetch(BASE + '/kv/' + key, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: 칸(v) });
  return w.ok ? null : w.status;
}
