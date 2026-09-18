/* 선분 고치기 — 실선↔점선 · 한쪽 끝 옮기기 · 선 더하기 (2026-09-18)
   사용자 —「실선을 점선으로 바꾸고 선 한쪽 끝을 다른곳으로 옮기고 실선이나 점선을
   추가하는 것도 가능할까?」

     node tools/figure-seg-test.mjs

   🔵 **셋 다 «장면»만 만진다** — 편집기가 SVG 를 안 건드린다는 규칙 그대로다.
     그래서 저장하면 학생 화면에도 같은 그림이 나가고 검산도 그대로 돈다.
   ⚠ 손가락으로 끄는 것(진짜 PointerEvent)은 `tools/figure-seg-probe.html` 이 잰다.
     여기서는 **장면이 옳게 바뀌는가**와 **그림에 옳게 나오는가**를 본다. */
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
await import(pathToFileURL(join(ROOT, 'figure.js')).href);
const F = globalThis.Figure;
const NL = String.fromCharCode(10);

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};
const 장면 = () => ({
  kind: 'graph',
  points: [{ x: 6, y: 4, dot: true, label: 'Q' }],
  segments: [{ from: [0, 0], to: [4, 0], label: 'AB' }, { from: [0, 0], to: [0, 3], dash: true }],
  xTicks: [2, 4, 6], yTicks: [3], axis: { xLabel: 'x', yLabel: 'y', origin: 'O' }
});

console.log(NL + '① 실선 ↔ 점선' + NL);
{
  const s = 장면();
  봄('실선을 점선으로', [F.setDash(s, 'seg:0'), !!s.segments[0].dash], [true, true]);
  봄('다시 누르면 실선으로', [F.setDash(s, 'seg:0'), !!s.segments[0].dash], [true, false]);
  봄('실선이 되면 dash 칸을 «지운다» (false 로 안 남긴다)', 'dash' in s.segments[0], false);
  봄('on 을 주면 그대로 따른다', [F.setDash(s, 'seg:0', true), !!s.segments[0].dash], [true, true]);
  /* 🔴 곡선·원도 점선이 된다 — 스키마가 셋 다 `dash` 를 지고 있다. */
  const s2 = { kind: 'graph', curves: [{ expr: 'x' }], circles: [{ c: [0, 0], r: 2 }] };
  봄('곡선도 점선이 된다', [F.setDash(s2, 'curve:0'), !!s2.curves[0].dash], [true, true]);
  봄('원도 점선이 된다', [F.setDash(s2, 'circle:0'), !!s2.circles[0].dash], [true, true]);
  /* ⚠ 없는 것은 조용히 «못 했다»를 돌려준다 — 화면이 단추를 안 세우는 근거다. */
  봄('점·다각형·눈금은 점선이 없다',
    ['point:0', 'poly:0', 'xtick:0'].map(id => F.setDash(장면(), id)), [false, false, false]);
  봄('없는 번호도 조용히 false', F.setDash(장면(), 'seg:9'), false);
  봄('canDash 가 화면에 그 답을 준다',
    [F.canDash(장면(), 'seg:0'), F.canDash(장면(), 'point:0')], [true, false]);
}

console.log(NL + '② 한쪽 끝을 옮긴다' + NL);
{
  const s = 장면();
  봄('to 만 옮긴다', [F.moveSegEnd(s, 'seg:0', 'to', 6, 4), s.segments[0].to, s.segments[0].from],
    [true, [6, 4], [0, 0]]);
  봄('from 도 된다', [F.moveSegEnd(s, 'seg:0', 'from', -1, -2), s.segments[0].from], [true, [-1, -2]]);
  봄('🔴 이름표(label)는 안 잃는다', s.segments[0].label, 'AB');
  봄('엉뚱한 쪽 이름은 안 받는다', F.moveSegEnd(장면(), 'seg:0', 'middle', 1, 1), false);
  봄('숫자가 아니면 안 받는다', F.moveSegEnd(장면(), 'seg:0', 'to', NaN, 1), false);
  봄('없는 선분도 조용히 false', F.moveSegEnd(장면(), 'seg:9', 'to', 1, 1), false);
}

console.log(NL + '③ 자석 — 이미 있는 점에 정확히 붙는다' + NL);
{
  const s = 장면();
  /* 🔵 수학 그림에서 선 끝은 대개 점 위다. 눈으로 맞추면 한두 px 이 늘 어긋난다. */
  const 가까이 = F.snapPoint(s, 6.06, 3.93, {}, { id: 'seg:0', which: 'to' });
  봄('점 Q(6,4) 가까이면 정확히 거기로', [가까이.x, 가까이.y], [6, 4]);
  봄('   무엇에 붙었는지도 말해 준다', 가까이.to, 'point:0');
  const 멀리 = F.snapPoint(s, 3.31, 1.16, {}, { id: 'seg:0', which: 'to' });
  봄('붙을 것이 없으면 반 칸(0.5) 눈금에', [멀리.x, 멀리.y], [3.5, 1]);
  봄('   그때는 붙은 데가 없다', 멀리.to, null);
  /* 🔴 자기 자신은 후보에서 뺀다 — 안 그러면 제자리에 붙어 영영 안 움직인다. */
  const 제자리 = F.snapPoint(s, 4.02, 0.02, {}, { id: 'seg:0', which: 'to' });
  봄('🔴 끌고 있는 그 끝은 자석 후보가 아니다', 제자리.to, null);
  const 안뺐으면 = F.snapPoint(s, 4.02, 0.02, {}, null);
  봄('   (빼지 않으면 제자리에 붙는다 — 그래서 빼는 것이다)', 안뺐으면.to, 'seg:0:to');
  봄('다른 선분의 끝에도 붙는다', F.snapPoint(s, 0.04, 2.95, {}, { id: 'seg:0', which: 'to' }).to, 'seg:1:to');
  /* 다각형 꼭짓점도 과녁이다 */
  const s3 = { kind: 'graph', polygons: [{ pts: [[1, 1], [5, 1], [5, 4]] }], segments: [{ from: [0, 0], to: [2, 2] }] };
  봄('다각형 꼭짓점에도 붙는다', F.snapPoint(s3, 5.03, 3.96, {}, { id: 'seg:0', which: 'to' }).to, 'poly:0:2');
}

console.log(NL + '③-2 자석 — «선»에도 붙는다 (교점 · 선 위)' + NL);
{
  /* 🔴 **사용자가 그림으로 짚은 그 자리다** (2026-09-18 저녁) —
     「파란색 표시부분에 선을 닿게 하고싶은데 저기에 아무리해도 닿질않고 그 위나 아래로 옮겨져」.
     그 자리는 **세로 점선과 사선이 만나는 자리**였다. 꼭짓점도 아니고 0.5 눈금 위도 아니라
     아침 판에서는 **늘 눈금으로 튕겨** 선 위나 아래로 떨어졌다. */
  /* 🔴 **교점을 «눈금에 안 걸리는» 자리로 잡는 것이 이 검사의 요점이다** (처음에 여기서 헛디뎠다).
     사선을 0.25x+2 로 두면 교점이 (4,3) 인데 그것은 마침 0.5 눈금 위다 — **자석이 없어도 통과한다.**
     0.3x+2 로 두면 (4,3.2) 라 눈금으로는 3.0 이나 3.5 로 튕긴다. 그래야 덫이 문다. */
  const s = {
    kind: 'graph',
    curves: [{ expr: '0.3*x+2' }],                               // 사선 — 교점이 3.2 다
    segments: [{ from: [4, 6], to: [4, 0], dash: true }, { from: [0, 0], to: [4, 0] }],  // 세로 점선
    points: [{ x: 0, y: 2, label: 'D' }], xTicks: [4], axis: {}
  };
  const 끄는것 = { id: 'seg:9', which: 'to' };                    // 장면에 없는 것 — 무엇도 안 뺀다
  const 교점 = F.snapPoint(s, 4.05, 3.26, {}, 끄는것);
  봄('🔴 점선과 사선이 만나는 자리에 «정확히» 붙는다', [교점.x, 교점.y], [4, 3.2]);
  봄('   🔴 눈금 값이 아니다 — 눈금만으로는 못 가는 자리다', [3, 3.5].indexOf(교점.y), -1);
  봄('   무엇과 무엇이 만난 자리인지도 말해 준다', 교점.to, 'seg:0×curve:0');
  봄('   조금 더 멀리서 짚어도 잡힌다 (교점은 반 뼘 넓게 본다)',
    (r => [r.x, r.y])(F.snapPoint(s, 3.92, 3.12, {}, 끄는것)), [4, 3.2]);

  /* ② 교점이 아니어도 «선 위»에는 앉는다 — 이것이 「그 위나 아래로 옮겨져」의 나머지 절반이다. */
  const 선위 = F.snapPoint(s, 2.03, 2.63, {}, 끄는것);
  봄('🔴 사선 위 아무 데나 앉는다', 선위.to, 'curve:0');
  봄('   정말 그 선 위다 (y = 0.3x + 2)', Math.abs(선위.y - (0.3 * 선위.x + 2)) < 0.02, true);
  봄('   🔴 눈금 위가 아니다 (거기로 튕겼으면 선에서 떨어진다)',
    Math.abs(선위.y - Math.round(선위.y * 2) / 2) > 1e-6, true);

  /* ③ 차례 — 꼭짓점이 맨 먼저다. 선 위에 있어도 꼭짓점이 가까우면 꼭짓점이다. */
  봄('꼭짓점이 선보다 먼저다', F.snapPoint(s, 0.05, 1.98, {}, 끄는것).to, 'point:0');
  /* ④ 아무 선도 없는 데서는 예전처럼 반 칸 눈금 */
  봄('선이 없는 데서는 반 칸 눈금 그대로', (r => [r.x, r.y, r.to])(F.snapPoint(s, 1.9, 5.2, {}, 끄는것)), [2, 5, null]);
  /* ⑤ 숨긴 선에는 안 붙는다 — 안 보이는 데 붙으면 「어디서 왔는지」 알 길이 없다 */
  봄('🔴 숨긴 선에는 안 붙는다', (() => {
    const t = JSON.parse(JSON.stringify(s)); F.setHidden(t, 'curve:0', true);
    return F.snapPoint(t, 2.03, 2.56, {}, 끄는것).to;
  })(), null);
  /* ⑥ 끌고 있는 «그 선분»에는 안 붙는다 — 제 몸에 붙으면 손이 안 떨어진다 */
  봄('🔴 끌고 있는 선분 자신에는 안 붙는다', (() => {
    const t = JSON.parse(JSON.stringify(s));
    const a = F.snapPoint(t, 4.0, 1.53, {}, { id: 'seg:0', which: 'to' });   // 그 점선 «위»의 자리
    return a.to;
  })(), null);
}

console.log(NL + '④ 선을 더한다' + NL);
{
  const s = 장면();
  봄('실선을 더하면 맨 뒤에 선다', [F.addSegment(s, [1, 1], [3, 1], false), s.segments.length], ['seg:2', 3]);
  봄('   실선이면 dash 칸을 «안» 만든다', 'dash' in s.segments[2], false);
  봄('점선도 더한다', [F.addSegment(s, [1, 2], [3, 2], true), !!s.segments[3].dash], ['seg:3', true]);
  /* 🔴 앞 번호가 안 밀리는 것이 요점이다 — checks·pins·hidden 이 번호로 가리킨다. */
  봄('🔴 앞 번호는 그대로다', [s.segments[0].label, s.segments[1].dash], ['AB', true]);
  봄('   숨김 표시도 여전히 그 선분을 가리킨다', (() => {
    const t = 장면(); F.setHidden(t, 'seg:1', true); F.addSegment(t, [0, 0], [1, 1], false);
    return [t.hidden['seg:1'], t.segments.length];
  })(), [true, 3]);
  봄('숫자를 문자로 줘도 값으로 넣는다', (() => {
    const t = 장면(); F.addSegment(t, ['1', '2'], ['3', '4'], false);
    return t.segments[2].from.concat(t.segments[2].to);
  })(), [1, 2, 3, 4]);
}

console.log(NL + '⑤ 그림에 그대로 나온다' + NL);
{
  const s = 장면();
  F.setDash(s, 'seg:0', true);
  F.moveSegEnd(s, 'seg:0', 'to', 6, 4);
  F.addSegment(s, [1, 1], [3, 1], false);
  const svg = F.renderScene(s);
  const 점선수 = (svg.match(/stroke-dasharray="7 6"/g) || []).length;
  봄('점선 둘 (seg:0 · seg:1)', 점선수, 2);
  봄('더한 실선이 그려진다', /<path d="M[\d.]+ [\d.]+L[\d.]+ [\d.]+" stroke-width="2"\/>/.test(svg), true);
  봄('🔴 검산은 그대로 돈다 (창 밖으로 안 나갔다)',
    (F.verifyScene(s).failures || []).filter(f => /선분/.test(f.msg || '')).length, 0);

  /* 🔴 **손잡이는 편집 모드에서만** — 학생 화면에 동그라미가 나가면 안 된다. */
  const 학생 = F.renderScene(s);
  const 편집 = F.renderScene(s, { edit: true });
  봄('🔴 학생 화면에는 끝 손잡이가 없다', /data-seg=/.test(학생), false);
  봄('편집 모드에는 선다 — 선분 3개 × 끝 2 = 6', (편집.match(/data-seg="/g) || []).length, 6);
  봄('숨긴 선분에는 손잡이를 안 세운다', (() => {
    const t = 장면(); F.setHidden(t, 'seg:1', true);
    return (F.renderScene(t, { edit: true }).match(/data-seg="/g) || []).length;
  })(), 2);
}

console.log(NL + '⑥ 누르면 골라진다 — 잡기 층' + NL);
{
  /* 🔴 사용자 — 「선분7 이런게 어떤선분을 말하는지 모르겠어. 결국 빼봐야 알수있기도하고
     그러니까 선을 선택하면 선분5 이렇게 자동으로 바꼈으면 좋겠고」.
     고르개의 이름만으로는 그림의 어느 것인지 알 길이 없었다 — 숨겨 봐야 알았다. */
  const s = {
    kind: 'graph',
    curves: [{ expr: '0.3*x+2' }],
    segments: [{ from: [0, 0], to: [3, 1] }, { from: [4, 6], to: [4, 0], dash: true }],
    polygons: [{ pts: [[0, 0], [2, 0], [2, 1]] }],
    circles: [{ c: [5, 1], r: 1 }],
    points: [{ x: 0, y: 2, label: 'D', dot: true }],
    axis: {}
  };
  const 편집 = F.renderScene(s, { edit: true });
  const 학생 = F.renderScene(s);
  const 잡힌것 = [...편집.matchAll(/data-el="([^"]+)"/g)].map(m => m[1]);
  봄('선·도형·점이 모두 잡힌다',
    ['curve:0', 'seg:0', 'seg:1', 'poly:0', 'circle:0', 'dot:0'].map(id => 잡힌것.indexOf(id) >= 0),
    [true, true, true, true, true, true]);
  봄('   🔴 옛 표(point:0)로는 안 잡힌다 — 동그라미와 글자를 가른 뒤라서다', 잡힌것.indexOf('point:0'), -1);
  봄('🔴 학생 화면에는 잡기 층이 없다', /data-el=/.test(학생), false);
  /* ⚠ 속이 아니라 «테두리»만 잡힌다 — 큰 도형이 제 속의 점·선을 통째로 덮으면 아무것도 못 고른다. */
  봄('🔴 다각형·원은 «테두리»만 잡는다 (속은 비켜 준다)',
    (편집.match(/pointer-events="stroke"/g) || []).length >= 4, true);
  봄('   동그라미는 통째로 잡는다 (동그라미라 테두리만이면 못 누른다)',
    /data-el="dot:0"[\s\S]{0,160}?pointer-events="all"/.test(편집), true);
  봄('잡는 폭이 실제 선보다 굵다 (2px 선을 손가락으로 짚어야 한다)',
    /stroke-width="14"/.test(편집), true);
  /* 숨긴 것에는 잡기 층도 없다 — 안 보이는 것을 고르면 「어디 있지」가 된다. */
  봄('🔴 숨긴 것에는 잡기 층이 없다', (() => {
    const t = JSON.parse(JSON.stringify(s)); F.setHidden(t, 'seg:1', true);
    return /data-el="seg:1"/.test(F.renderScene(t, { edit: true }));
  })(), false);
  /* 손잡이는 색으로 갈린다 — 도형 꼭짓점에 찍은 점과 헷갈리지 않게 */
  봄('손잡이에 제 이름표(class)가 있다 — 색을 따로 입힌다', /class="fig-handle"/.test(편집), true);
  봄('🔴 손잡이는 흰 동그라미에 검은 테두리가 아니다 (점과 헷갈리던 그 꼴)',
    /class="fig-handle"[^>]*fill="#fff"/.test(편집), false);
}

console.log(NL + '⑦ 동그라미와 글자를 «따로» 고르고 따로 숨긴다' + NL);
{
  /* 🔴 사용자 —「동그라미만 빼고 이름만 남기기 라기보단 **동그라미랑 문자랑 분리해서
     선택할 수 있도록** 해주면 좋을 것 같아」. 단추를 하나 더 다는 것이 아니라 **둘을 가르는** 일이다.
       · `dot:i`       — 동그라미만
       · `lbl:point:i` — 글자만 (이름표는 예전부터 이렇게 감췄다)
       · `point:i`     — 점을 통째로. **옛 표라 뜻을 안 바꾼다** — 이미 저장된 장면이 쓰고 있다. */
  const 짓기 = () => ({ kind: 'graph', polygons: [{ pts: [[0, 0], [4, 0], [4, 3]] }],
    points: [{ x: 4, y: 3, label: 'B', dot: true }, { x: 0, y: 0, label: 'A', dot: true }], axis: {} });
  const 동그라미 = svg => (svg.match(/<circle [^>]*r="4"[^>]*fill="currentColor"/g) || []).length;
  /* ⚠ **정규식을 «문자열»로 짓다가 당했다** — `new RegExp('[\\s\\S]')` 를 옮기는 사이 백슬래시가
       깎여 `[sS]` 가 되었고, 그러면 아무 글자도 못 찾아 **「글자가 없다」가 언제나 참**이었다.
       「글자만 감춘다」가 조용히 초록이던 까닭이 그것이다. 여기서는 «자르기»로 푼다 — 백슬래시가 없다.
       (이름표는 <text> 한 덩이 안에 tspan 조각으로 들어 있어 덩이째 봐야 한다.) */
  const 글자조각 = svg => svg.split('<text').slice(1).map(x => x.split('</text>')[0]);
  const 글자있나 = (svg, t) => 글자조각(svg).some(x => x.includes(t));

  { const s = 짓기();
    봄('처음엔 동그라미 둘 · 글자 둘', [동그라미(F.renderScene(s)), 글자있나(F.renderScene(s), 'B')], [2, true]); }

  { const s = 짓기(); F.setHidden(s, 'dot:0', true);
    const svg = F.renderScene(s);
    봄('🔴 동그라미만 감춘다 — 글자 B 는 남는다', [동그라미(svg), 글자있나(svg, 'B')], [1, true]); }

  { const s = 짓기(); F.setHidden(s, 'lbl:point:0', true);
    const svg = F.renderScene(s);
    봄('🔴 글자만 감춘다 — 동그라미는 남는다', [동그라미(svg), 글자있나(svg, 'B')], [2, false]); }

  { const s = 짓기(); F.setHidden(s, 'dot:0', true); F.setHidden(s, 'lbl:point:0', true);
    const svg = F.renderScene(s);
    봄('둘 다 감추면 그 점은 통째로 없다', [동그라미(svg), 글자있나(svg, 'B')], [1, false]);
    봄('   다른 점(A)은 그대로다', 글자있나(svg, 'A'), true); }

  { const s = 짓기(); F.setHidden(s, 'point:0', true);
    const svg = F.renderScene(s);
    봄('⚠ 옛 표(point:0)는 여전히 «통째로» 감춘다 — 저장된 장면이 안 깨진다',
      [동그라미(svg), 글자있나(svg, 'B')], [1, false]); }

  { const s = 짓기(); F.setHidden(s, 'dot:0', true);
    봄('되살릴 수 있다', (() => { F.setHidden(s, 'dot:0', false); return 동그라미(F.renderScene(s)); })(), 2); }

  /* 목록·잡기 층도 «동그라미»를 가리킨다 */
  { const s = 짓기();
    const ids = F.elements(s).map(e => e.id);
    봄('🔴 목록에 서는 것은 dot: 이다 (point: 가 아니다)',
      [ids.indexOf('dot:0') >= 0, ids.indexOf('point:0') >= 0], [true, false]);
    봄('   이름이 무엇인지 말해 준다', F.elements(s).find(e => e.id === 'dot:0').name, '점 B 의 동그라미');
    봄('누르는 자리도 dot: 이다', /data-el="dot:0"/.test(F.renderScene(s, { edit: true })), true);
    봄('   감춘 동그라미는 못 누른다', (() => {
      const t = 짓기(); F.setHidden(t, 'dot:0', true);
      return /data-el="dot:0"/.test(F.renderScene(t, { edit: true }));
    })(), false);
    /* 애초에 동그라미가 없는 점(dot:false)은 고를 거리가 아니다 — 눌러도 아무 데도 없다 */
    봄('dot:false 인 점은 목록에 안 선다', (() => {
      const t = 짓기(); t.points[0].dot = false;
      return F.elements(t).map(e => e.id).indexOf('dot:0');
    })(), -1);
    /* ⚠ **옛 표로 통째로 감춘 점**도 목록에서 빠져야 한다 — 이미 안 보이는 것을 또 「숨기기」 하면
       그림은 그대로인데 되살릴 단추만 둘로 늘어난다(「점 A ↺」 옆에 「점 A 의 동그라미 ↺」). */
    봄('🔴 옛 표(point:0)로 감춘 점의 동그라미는 목록에 안 선다', (() => {
      const t = 짓기(); F.setHidden(t, 'point:0', true);
      const ids = F.elements(t).map(e => e.id);
      return [ids.indexOf('dot:0'), ids.indexOf('dot:1') >= 0];
    })(), [-1, true]); }

  { const s = 짓기(); F.setHidden(s, 'dot:0', true);
    봄('점만 숨겨도 다각형은 그대로다', (F.renderScene(s).match(/stroke-width="2"/g) || []).length > 0, true); }
}

console.log(NL + '🪤 덫 — 옛 판으로 돌려 본다' + NL);
let 덫물림 = 0;
{
  /* ① 자기 자신을 안 빼면 제자리에 붙는다 (③에서 이미 값으로 보였다 — 여기서는 «덫»으로 센다) */
  const s = 장면();
  if (F.snapPoint(s, 4.02, 0.02, {}, null).to === 'seg:0:to') { 덫물림++; console.log('  ✓ 자기 자신을 안 빼면 제자리에 붙는다'); }
  else console.log('  🔴 안 물었다');
  /* ② 배열에서 «빼면» 뒤 번호가 밀린다 — 그래서 숨기기를 쓴다 */
  const t = 장면(); t.segments.splice(0, 1);
  if (t.segments[0].dash === true) { 덫물림++; console.log('  ✓ 배열에서 빼면 seg:0 이 딴것이 된다 — 그래서 숨긴다'); }
  else console.log('  🔴 안 물었다');
  /* ③ **«선»을 안 보던 아침 판** — 사용자가 짚은 그 자리가 눈금으로 튕기는지 직접 보인다.
     `snapPx:0` 이면 꼭짓점·교점·선 위를 다 건너뛰고 눈금만 남는다 — 그때의 셈이 그것이었다. */
  const u = { kind: 'graph', curves: [{ expr: '0.3*x+2' }],
    segments: [{ from: [4, 6], to: [4, 0], dash: true }], xTicks: [4], axis: {} };
  const 옛판 = F.snapPoint(u, 4.05, 3.26, { snapPx: 0 }, { id: 'seg:9', which: 'to' });
  if (!(옛판.x === 4 && 옛판.y === 3.2)) { 덫물림++; console.log('  ✓ 선을 안 보면 교점에 못 간다 — ' + JSON.stringify([옛판.x, 옛판.y]) + ' 로 튕긴다'); }
  else console.log('  🔴 안 물었다 — 이 검사는 아무것도 증명하지 않는다');
}

console.log(NL + (fail === 0 ? '✓ 전부 통과' : '🔴 걸린 것 ' + fail + '개') + ' · ' + (pass + fail) + '개');
console.log("🪤 덫 " + 덫물림 + "/3 물었다");
process.exit(fail === 0 && 덫물림 === 3 ? 0 : 1);
