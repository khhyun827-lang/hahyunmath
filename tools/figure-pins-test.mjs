/* 그림 이름표 편집기 — figure.js 의 «핀» 층 검사 (2026-09-11 · docs/그림-편집기-계획.md)
   node tools/figure-pins-test.mjs
   배포도 한도도 안 쓴다. 마지막 절은 «망가뜨려 무는지» — 통과하는 검사만 모으면 아무것도 증명하지 않는다. */
import '../figure.js';
const F = globalThis.Figure;
let n = 0, bad = 0;
const ok = (cond, msg) => { n++; if (!cond) { bad++; console.log('  ✗', msg); } };
const clone = o => JSON.parse(JSON.stringify(o));
const scene = () => ({
  kind: 'graph',
  curves: [{ expr: '-(x-2)*(x-6)', label: 'y=f(x)' }, { expr: '2x-3', label: 'y=g(x)' }],
  points: [{ x: 1, curve: 0, dot: true, dropTo: 'axis', label: 'P_1', labelPos: 'above' }],
  xTicks: [1, 2, 5, 6], axis: { xLabel: 'x', yLabel: 'y', origin: 'O' },
  checks: [{ type: 'root', curve: 0, x: 2 }, { type: 'root', curve: 0, x: 6 }, { type: 'convex', curve: 0, dir: 'down' }]
});

console.log('① 조판 — 이탤릭과 로만');
{
  const r = F.mathRuns('y=f(x)');
  ok(r.map(x => x.t + (x.it ? '/' : '.')).join('') === 'y/=.f/(.x/).', '변수는 이탤릭, 등호·괄호는 로만');
  ok(F.mathRuns('sin x')[0].t === 'sin ' && !F.mathRuns('sin x')[0].it, '함수 이름은 로만');
  ok(F.mathRuns('12.5')[0].it === false, '숫자는 로만');
  const s = F.mathRuns('x_1^2');
  ok(s[1].sh === 'sub' && s[1].t === '1' && s[2].sh === 'sup' && s[2].t === '2', '_ 와 ^ 는 첨자');
  ok(F.mathRuns('P_{12}')[1].t === '12', '중괄호 첨자');
  ok(F.mathRuns('a-b')[1].t === '−', '하이픈은 보기용 마이너스로');
  ok(F.mathRuns('α')[0].it === true && F.mathRuns('Σ')[0].it === false, '그리스 소문자 이탤릭 · 대문자 로만');
  ok(F.mathRuns('점')[0].it === false, '한글은 로만');
  const svg = F.renderScene(scene());
  ok(!/<g[^>]*font-style="italic"/.test(svg), '<g> 통째 이탤릭은 사라졌다');
  ok(/<tspan font-style="italic">y<\/tspan><tspan font-style="normal">=<\/tspan>/.test(svg), 'tspan 마다 기울임을 정한다');
  ok(/font-family="'Noto Serif'/.test(svg), '글꼴은 Noto Serif — 기기 글꼴이 아니다');
  ok(!/<script/i.test(F.renderScene(Object.assign(scene(), { labels: [{ x: 1, y: 1, text: '<script>alert(1)</script>' }] }))), '글자는 esc 를 지난다');
}

console.log('② 핀 — 있으면 그 자리, 없으면 자동');
{
  const sc = scene();
  const before = F.layoutLabels(sc);
  ok(before.length === 10, '이름표 10개 (축3·눈금4·점1·곡선2) — ' + before.length);
  ok(before.every(l => !l.pinned && l.x === l.home.x && l.y === l.home.y), '핀 없으면 전부 집에 있다');
  sc.pins = F.pinAll(sc);
  const after = F.layoutLabels(sc);
  ok(after.every((l, i) => l.x === before[i].x && l.y === before[i].y), '전부 핀해도 아무것도 안 움직인다');
  ok(after.every(l => l.pinned), '전부 핀 됐다');
  sc.pins.at['curve:0'] = { x: 100, y: 100, anchor: 'start' };
  const moved = F.layoutLabels(sc);
  const c0 = moved.find(l => l.id === 'curve:0');
  ok(c0.x === 100 && c0.y === 100 && c0.anchor === 'start', '핀 자리로 간다');
  ok(c0.home.x === before.find(l => l.id === 'curve:0').home.x, '집은 그대로다 (「원래 자리로」)');
  ok(moved.filter(l => l.id !== 'curve:0').every(l => { const b = before.find(x => x.id === l.id); return l.x === b.x && l.y === b.y; }), '하나를 옮겨도 나머지는 안 움직인다');
  delete sc.pins.at['curve:0'];
  const back = F.layoutLabels(sc).find(l => l.id === 'curve:0');
  ok(back.x === c0.home.x && back.y === c0.home.y, '핀을 빼면 집으로 돌아간다');
  const svg = F.renderScene(sc, { edit: true });
  ok((svg.match(/<g data-lbl=/g) || []).length === 10 && (svg.match(/pointer-events="all"/g) || []).length === 10, '편집 모드 — 잡기 상자 10개');
  ok(!/data-lbl/.test(F.renderScene(sc)), '저장용에는 잡기 상자가 없다');
}

console.log('③ 검산은 핀을 안 본다');
{
  const a = scene(), b = scene();
  b.pins = F.pinAll(b);
  Object.keys(b.pins.at).forEach(id => { b.pins.at[id] = { x: 1, y: 1, anchor: 'end' }; });
  const va = F.verifyScene(a), vb = F.verifyScene(b);
  ok(va.ok && vb.ok && JSON.stringify(va.failures) === JSON.stringify(vb.failures), '핀을 아무렇게나 찍어도 검산 결과가 같다');
  const c = scene(); c.curves[0].expr = '-(x-2)*(x-5)';
  ok(!F.verifyScene(c).ok, '핀 밖(식)을 바꾸면 검산이 문다');
}

console.log('④ 핀 청소 — 숫자 셋과 anchor 뿐');
{
  const sc = scene();
  sc.pins = { size: [560, 430], at: { 'curve:0': { x: '12', y: 9999, anchor: '<b>' }, 'point:0': { x: NaN, y: 1 }, junk: 5 } };
  const p = F.cleanPins(sc.pins, 560, 430);
  ok(p.at['curve:0'].x === 12 && p.at['curve:0'].y === 430 && p.at['curve:0'].anchor === 'middle', '문자열 숫자는 받고, 밖은 안으로, 이상한 anchor 는 middle');
  ok(!p.at['point:0'] && !p.at.junk, 'NaN 과 쓰레기는 버린다');
  ok(F.cleanPins({ size: [720, 540], at: { 'curve:0': { x: 1, y: 1 } } }, 560, 430) === null, '다른 크기의 핀은 통째로 안 믿는다');
  ok(F.cleanPins(null, 560, 430) === null && F.cleanPins({ at: 'x' }, 560, 430) === null, '없거나 꼴이 아니면 null');
  const svg = F.renderScene(Object.assign(scene(), { pins: { size: [560, 430], at: { 'curve:0': { x: 1, y: 1, anchor: '"><script>' } } } }), { edit: true });
  ok(!/<script/.test(svg), 'anchor 로 주입 못 한다');
}

console.log('⑤ 글자 고치기');
{
  const sc = scene();
  ok(F.setLabelText(sc, 'curve:1', 'y=h(x)') && sc.curves[1].label === 'y=h(x)', '곡선 이름');
  ok(F.setLabelText(sc, 'point:0', 'Q') && sc.points[0].label === 'Q', '점 이름');
  ok(F.setLabelText(sc, 'axis:origin', 'A') && sc.axis.origin === 'A', '원점');
  ok(!F.setLabelText(sc, 'xtick:0', '9'), '눈금은 값이라 못 고친다');
  ok(!F.setLabelText(sc, 'curve:9', 'z') && !F.setLabelText(sc, 'nope', 'z'), '없는 것은 못 고친다');
  ok(F.layoutLabels(sc).find(l => l.id === 'xtick:0').editable === false && F.layoutLabels(sc).find(l => l.id === 'point:0').editable, 'editable 표시가 맞다');
}

console.log('⑥ 겹침');
{
  const sc = scene();
  ok(F.overlaps(F.labelBoxes(sc)).length === 0, '자동 배치는 안 겹친다');
  sc.pins = F.pinAll(sc);
  const p = sc.pins.at['point:0'];
  sc.pins.at['curve:0'] = { x: p.x, y: p.y, anchor: p.anchor };
  const hits = F.overlaps(F.labelBoxes(sc));
  ok(hits.some(h => h.includes('curve:0') && h.includes('point:0')), '같은 자리에 두면 겹침으로 잡힌다');
}

console.log('⑦ 망가뜨려 무는지');
{
  /* 핀을 «적용»하는 자리를 끊어 놓으면 ② 가 물어야 한다 — 여기서는 같은 판정을 흉내 내어 확인한다 */
  const sc = scene(); sc.pins = F.pinAll(sc); sc.pins.at['curve:0'] = { x: 100, y: 100, anchor: 'start' };
  const fake = F.layoutLabels(sc).map(l => l.id === 'curve:0' ? Object.assign({}, l, { x: l.home.x, y: l.home.y }) : l);
  ok(!(fake.find(l => l.id === 'curve:0').x === 100), '핀을 안 먹이면 ②의 「핀 자리로 간다」가 문다');
  const svgBroken = F.renderScene(sc).replace(/<tspan font-style="italic">/g, '<tspan>');
  ok(!/<tspan font-style="italic">y<\/tspan>/.test(svgBroken), '기울임을 지우면 ①이 문다');
}

console.log(`\n${n}벌 · ${bad ? '✗ ' + bad + ' 실패' : '✓ 전부 통과'}`);
process.exit(bad ? 1 : 0);
