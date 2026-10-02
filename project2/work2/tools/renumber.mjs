// 문서 전체의 «개체 번호»를 다시 매긴다.
// ⚠ 왜 필요한가 — 템플릿의 표(tbl4·Take·SCENE)를 수십~백여 번 복제하는데,
//    그 안에 박힌 그림·상자가 id·instid 를 그대로 물고 온다. 한글은 개체를 instid 로
//    찾으므로 같은 번호가 여럿이면 «그 개체를 편집할 때 튕긴다».
const SHAPES = 'pic|rect|equation|line|ellipse|arc|polygon|curve|container|ole|connectLine|textart';

export function renumber(xml, start = 500000000) {
  let gid = start;
  let out = xml.replace(/\binstid="\d+"/g, () => `instid="${++gid}"`);
  const re = new RegExp('(<hp:(?:' + SHAPES + ')\\b[^>]*?\\s)id="\\d+"', 'g');
  out = out.replace(re, (all, head) => `${head}id="${++gid}"`);
  return out;
}

// 중복이 남았는지 세어 보는 검사기
export function dupCount(xml) {
  const ids = [...xml.matchAll(new RegExp('<hp:(?:' + SHAPES + ')\\b[^>]*?\\sid="(\\d+)"', 'g'))].map((m) => m[1]);
  const inst = [...xml.matchAll(/\binstid="(\d+)"/g)].map((m) => m[1]);
  return { ids: ids.length - new Set(ids).size, inst: inst.length - new Set(inst).size, n: ids.length };
}
