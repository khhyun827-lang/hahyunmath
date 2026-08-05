/* ds.css ↔ 구버전 스타일 충돌 검사 —  node tools/check-css-collisions.js
   이식이 끝날 때까지 «화면을 하나 옮길 때마다» 돌린다.

   왜 필요한가 —
   두 스타일시트가 같은 클래스 이름을 쓰면 캐스케이드는 «합집합»을 취한다.
   구버전 규칙이 선언하지 않은 속성은 ds.css 것이 그대로 얹힌다.
   .field가 그랬다: ds.css의 display:flex·height:32px·border가 구버전 폼 래퍼
   102곳에 들어와 레이아웃이 무너졌다. 스코프로는 못 막고 이름을 갈라야만 한다.
   그래서 구버전 클래스에 lg- 접두사를 붙였다. 이 검사가 그 상태를 지킨다.

   나오면 안 되는 것 —
     [1] 두 쪽이 공유하는 클래스 이름
     [2] 그중 실제로 새는 속성   <- 이게 0이 아니면 실패로 끝난다

   새 화면이 ds.css 클래스를 쓰는 것은 정상이다. 문제는 «구버전 요소에 얹히는» 경우뿐이라
   검사 대상은 구버전 <style> 블록 하나로 한정한다. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ds = fs.readFileSync(path.join(ROOT, 'ds.css'), 'utf8');
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* index.html에는 <style>이 둘 있다. 앞은 «새 셸»(.app), 뒤가 «구버전»이다.
   구버전 블록만 골라야 한다 — 새 셸이 ds.css 클래스를 쓰는 것은 정상이고,
   그걸 충돌로 세면 도구가 계속 거짓 경보를 낸다. */
function legacyStyleBlock(html) {
  const re = /<style>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    // 새 셸에도 «.app .legacy{»가 있다. 구버전 블록에만 있는 «body.legacy{»로 가른다.
    if (m[1].includes('body.legacy{')) return m[1];
  }
  return '';
}
const legacyCss = legacyStyleBlock(idx);

if (!legacyCss.trim()) {
  console.log('구버전 <style> 블록이 없다 — 이식이 끝났다면 이 도구도 지우면 된다.');
  process.exit(0);
}

const classNames = (css) => new Set((css.match(/\.[a-zA-Z][\w-]*/g) || []).map((s) => s.slice(1)));
// 구버전 셀렉터에서 .legacy 접두사를 떼고 «맨» 이름만 본다
const legacyNames = new Set(
  [...(legacyCss.match(/\.[a-zA-Z][\w-]*/g) || [])].map((s) => s.slice(1)).filter((n) => n !== 'legacy')
);
const dsNames = classNames(ds);

const shared = [...dsNames].filter((n) => legacyNames.has(n)).sort();

// 각 이름에 대해 ds.css가 선언하고 구버전이 선언하지 않는 속성 = 새는 속성
function declsFor(css, name, stripLegacy) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const props = new Map();
  let m;
  while ((m = re.exec(css)) !== null) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!sel || sel.startsWith('@')) continue;
    const hit = sel.split(',').some((p) => {
      const q = stripLegacy ? p.trim().replace(/^\.legacy\s+/, '').replace(/^body\.legacy\s*/, '') : p.trim();
      return new RegExp('(^|\\s)\\.' + name + '$').test(q);
    });
    if (!hit) continue;
    m[2].split(';').forEach((d) => {
      const i = d.indexOf(':');
      if (i > -1 && d.slice(0, i).trim()) props.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
    });
  }
  return props;
}

let leaks = 0;
const leakReport = [];
shared.forEach((n) => {
  const a = declsFor(ds, n, false);
  const b = declsFor(legacyCss, n, true);
  if (!a.size) return;
  const leaked = [...a.keys()].filter((k) => !b.has(k));
  if (leaked.length) {
    leaks += leaked.length;
    leakReport.push('  .' + n + '  ->  ' + leaked.join(', '));
  }
});

console.log('[1] 두 쪽이 공유하는 클래스 이름: ' + (shared.length ? shared.join(', ') : '없음'));
console.log('[2] 실제로 새는 속성: ' + (leaks ? leaks + '개' : '없음'));
leakReport.forEach((l) => console.log(l));

// 새는 속성이 있으면 실패로 끝낸다. 공유 이름만으로는 실패시키지 않는다 —
// 새 화면이 ds.css 클래스를 쓰는 것은 정상이고, 문제는 «구버전 요소에 얹히는» 경우다.
process.exit(leaks ? 1 : 0);
