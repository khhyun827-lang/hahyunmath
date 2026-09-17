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
