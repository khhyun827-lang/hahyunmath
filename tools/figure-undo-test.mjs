/* 편집기 — 한 단계 실행취소 (2026-09-18)
   사용자 —「편집기에서 이전으로 되돌리기(실행취소) 기능 추가 해줘 전체 처음으로 되돌리는거 말고
   한단계 실행취소하는거!」

     node tools/figure-undo-test.mjs

   🔵 **짓는 법** — 손질 «전»의 장면을 통째로 떠서 쌓는다. 손질마다 «거꾸로 가는 길»을 따로 짓지 않는다.
     숨기기 하나가 창을 바꾸고 핀을 지우는 판이라, 열 가지 손질의 역함수를 짓는 쪽이 훨씬 잘 틀린다.
   🔴 여기서 재는 것은 **되돌린 장면이 손질 전과 «글자 하나까지» 같은가**다 — 「대충 비슷하다」로는
     이름표 핀·hidden 표·창이 슬쩍 달라진 것을 못 잡는다.
   ⚠ 실행취소는 index.html 의 함수들이다(장면 문법이 아니다). 그래서 거기서 «떠서» 진짜로 돌린다 —
     `report-move-test.mjs` 와 같은 길이다. 문법만 훑으면 「부르기를 빠뜨린 자리」를 못 본다. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
await import(pathToFileURL(join(ROOT, 'figure.js')).href);
const Figure = globalThis.Figure;
const NL = String.fromCharCode(10);

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ── index.html 에서 편집기 함수를 뜬다 ── */
const html = fs.readFileSync(join(ROOT, 'index.html'), 'utf8')
  .split(String.fromCharCode(13) + String.fromCharCode(10)).join(NL);
const 뜨기 = (머리) => {
  const a = html.indexOf(머리);
  if (a < 0) throw new Error('못 찾음: ' + 머리);
  const b = html.indexOf(NL + '}' + NL, a);
  if (b < 0) throw new Error('끝을 못 찾음: ' + 머리);
  return html.slice(a, b + 3);
};
/* ⚠ 한 줄에 다 쓴 함수(figEditDraft)는 «다음 } 줄»로 끝을 찾으면 아래를 통째로 삼킨다. 줄로 뜬다. */
const 한줄 = (머리) => {
  const a = html.indexOf(머리);
  if (a < 0) throw new Error('못 찾음: ' + 머리);
  return html.slice(a, html.indexOf(NL, a));
};
const 여럿 = ['figEditPush', 'figEditUndo', 'figEditRedraw', 'figEditPin',
  'figEditHide', 'figEditDash', 'figEditAddSeg', 'figEditAddLabel', 'figEditRemoveLabel',
  'figEditText', 'figEditHome', 'figEditReset'];
const 이름들 = ['figEditDraft'].concat(여럿);
/* 한도도 실서비스의 그 값을 그대로 쓴다 — 여기 숫자를 따로 적으면 둘이 갈린다 */
const 한도줄 = 한줄('const FIG_UNDO_MAX');
const 한도 = +(/=\s*(\d+)/.exec(한도줄) || [])[1];
const 조각 = [한도줄, 한줄('function figEditDraft(')].concat(여럿.map(n => 뜨기('function ' + n + '('))).join(NL);
const 토스트 = [];
/* 화면은 없다 — 「글자 더하기」가 입력칸에 커서를 주려고 DOM 을 찾는다. 없다고 답해 준다. */
const E = new Function('state', 'Figure', 'render', 'showToast', 'document',
  조각 + NL + 'return { ' + 이름들.join(', ') + ' };'
)(globalThis.state = {}, Figure, () => {}, m => 토스트.push(m), { querySelector: () => null });

const 장면 = () => ({
  kind: 'graph',
  points: [{ x: 6, y: 4, dot: true, label: 'Q' }],
  segments: [{ from: [0, 0], to: [4, 0], label: 'AB' }, { from: [0, 0], to: [0, 3], dash: true }],
  polygons: [{ pts: [[0, 0], [4, 0], [4, 3]] }],
  xTicks: [2, 4, 6], yTicks: [3], axis: { xLabel: 'x', yLabel: 'y', origin: 'O' }
});
const 열기 = () => {
  const scene = 장면();
  globalThis.state.figureDraft = { bankId: 'pb1', scene, svg: Figure.renderScene(scene), ok: true, failures: [], saved: true };
  globalThis.state.figureSel = null;
  globalThis.state.figureElSel = null;
  return globalThis.state.figureDraft;
};
const 찍기 = d => JSON.stringify(d.scene);
/* ⚠ `figEditPin` 은 «핀을 적는 손»일 뿐이라 스스로 뜨지 않는다 — 뜨는 것은 부르는 쪽(끌기를 놓을 때·
   화살표를 누를 때)이다. 그 둘은 진짜 손길이 있어야 하니 여기서는 같은 차례를 손으로 짓는다.
   ⚠ 그래서 «부르는 쪽이 정말 뜨는가»는 아래 ⑧에서 그 함수의 글로 따로 잰다. */
const 끌기 = (d, id, x, y) => { E.figEditPush(); E.figEditPin(d, id, x, y, 'middle'); };

console.log(NL + '① 손질마다 한 단계씩 — 그리고 되돌리면 글자 하나까지 같다' + NL);
{
  /* 🔴 손질을 하나씩 하고, 그때마다 «전»의 장면을 따로 적어 둔다. 되돌린 뒤 그것과 견준다. */
  const 손질들 = [
    ['숨기기', d => E.figEditHide('seg:1')],
    ['되살리기', d => E.figEditHide('seg:1', false)],
    ['점선으로', d => E.figEditDash('seg:0')],
    ['선 더하기', d => E.figEditAddSeg(false)],
    ['점선 더하기', d => E.figEditAddSeg(true)],
    ['글자 더하기', d => E.figEditAddLabel()],
    ['글자 고치기', d => { globalThis.state.figureSel = 'label:0'; E.figEditText('P'); }],
    ['이름표 옮기기', d => 끌기(d, 'point:0', 100, 100)],
    ['이 글자 빼기', d => { globalThis.state.figureSel = 'point:0'; E.figEditRemoveLabel(); }],
    ['동그라미 숨기기', d => E.figEditHide('dot:0')],
  ];
  const d = 열기();
  const 전들 = [];
  손질들.forEach(([이름, 하기]) => { 전들.push(찍기(d)); 하기(d); });

  봄('열 번 손질하면 열 단계다', d.undo.length, 10);
  봄('그림도 따라왔다 (svg 를 다시 그린다)', d.svg === Figure.renderScene(d.scene), true);

  /* 뒤에서부터 하나씩 되돌린다 — 매번 «그 손질 직전»과 같아야 한다 */
  let 다같나 = true, 어디 = null;
  for (let i = 손질들.length - 1; i >= 0; i--) {
    E.figEditUndo();
    if (찍기(d) !== 전들[i] && 다같나) { 다같나 = false; 어디 = 손질들[i][0]; }
  }
  봄('🔴 한 단계씩 되돌리면 매번 그 손질 «직전»이다', [다같나, 어디], [true, null]);
  봄('다 되돌리면 단계가 없다', d.undo.length, 0);
  봄('🔴 처음 장면으로 돌아왔다', 찍기(d), JSON.stringify(장면()));
  봄('그림도 처음으로 돌아왔다', d.svg === Figure.renderScene(장면()), true);
  /* 없는데 또 누르면 — 조용히 아무 일도 없으면 「눌렀는데 왜 안 되지」가 된다. 말해 준다. */
  토스트.length = 0;
  E.figEditUndo();
  봄('더 되돌릴 것이 없으면 말해 준다', [토스트.length > 0, 찍기(d) === JSON.stringify(장면())], [true, true]);
}

console.log(NL + '② 실행취소는 «한 단계»다 — 전부 되돌리기가 아니다' + NL);
{
  const d = 열기();
  E.figEditHide('seg:1');
  E.figEditHide('poly:0');
  E.figEditHide('xtick:0');
  봄('세 번 숨겼다', Object.keys(d.scene.hidden || {}).length, 3);
  E.figEditUndo();
  봄('🔴 한 번 되돌리면 «둘»이 남는다 (셋 다 풀리지 않는다)',
    [Object.keys(d.scene.hidden).length, !!d.scene.hidden['seg:1'], !!d.scene.hidden['poly:0']], [2, true, true]);
  봄('남은 단계도 둘이다', d.undo.length, 2);
}

console.log(NL + '③ 화살표 한 벌은 «한 번»으로 센다' + NL);
{
  /* 🔵 화살표로 1px 씩 다섯 번 민 것은 사람에게 «한 번»의 손질이다.
     표(tag)가 같으면 안 쌓는다 — 맨 앞의 것이 이미 몸짓 전이다. */
  const d = 열기();
  const 처음 = 찍기(d);
  for (let i = 0; i < 5; i++) { E.figEditPush('arrow:point:0'); E.figEditPin(d, 'point:0', 100 + i, 100, 'middle'); }
  봄('🔴 다섯 번 밀어도 한 단계다', d.undo.length, 1);
  E.figEditUndo();
  봄('   한 번에 다 돌아온다', 찍기(d), 처음);

  /* 딴 이름표로 가면 거기서 새 단계가 열린다 — 표가 달라진다 */
  E.figEditPush('arrow:point:0'); E.figEditPin(d, 'point:0', 100, 100, 'middle');
  E.figEditPush('arrow:label:0'); E.figEditPin(d, 'label:0', 50, 50, 'middle');
  봄('딴 것을 밀면 새 단계다', d.undo.length, 2);
  /* 다른 손질이 끼면 그 뒤의 화살표도 새 단계다 (표를 지운다) */
  E.figEditHide('seg:1');
  E.figEditPush('arrow:point:0'); E.figEditPin(d, 'point:0', 7, 7, 'middle');
  봄('손질이 끼면 그 뒤 화살표도 새 단계다', d.undo.length, 4);
}

console.log(NL + '④ 아무 일도 없었으면 단계를 안 쌓는다' + NL);
{
  /* ⚠ 못 고치는 글자(값)·점선이 없는 것(점·다각형)은 손질이 «안 된다».
     그때 단계가 쌓이면 실행취소를 눌러도 그림이 안 달라져 「고장났다」로 읽힌다. */
  const d = 열기();
  globalThis.state.figureSel = 'point:0';      // 점 이름표 — 값이 아니라 글자라 고쳐진다
  E.figEditText('R');
  봄('고쳐지는 글자는 한 단계다', d.undo.length, 1);
  const 전 = 찍기(d);
  globalThis.state.figureSel = 'xtick:0';      // 눈금 이름표 — «값»이라 못 고친다
  E.figEditText('아무거나');
  봄('🔴 못 고치는 글자는 단계를 안 쌓는다', d.undo.length, 1);
  봄('   장면도 그대로다', 찍기(d), 전);
  E.figEditDash('poly:0');                     // 다각형에는 점선이 없다
  봄('🔴 점선이 없는 것도 단계를 안 쌓는다', d.undo.length, 1);
  봄('   장면도 그대로다', 찍기(d), 전);
}

console.log(NL + '⑤ 「이름표 자리 되돌리기」도 한 손질이다' + NL);
{
  /* 사용자가 갈라 달라고 한 그 둘이다 — 전부 되돌리기를 «실행취소로» 되돌릴 수 있어야 한다. */
  const d = 열기();
  끌기(d, 'point:0', 100, 100);
  끌기(d, 'label:0', 40, 40);                     // 핀이 붙은 상태
  const 핀붙은장면 = 찍기(d);
  const 단계 = d.undo.length;
  E.figEditReset();
  봄('전부 되돌리면 핀이 없다', !!d.scene.pins, false);
  봄('그것도 한 단계 늘었다', d.undo.length - 단계, 1);
  E.figEditUndo();
  봄('🔴 실행취소로 핀이 통째로 돌아온다', 찍기(d), 핀붙은장면);
}

console.log(NL + '⑥ 고르개도 그때로 돌아온다' + NL);
{
  /* ⚠ 되돌렸는데 엉뚱한 것이 골라져 있으면 다음 단추가 «딴것»을 민다. */
  const d = 열기();
  globalThis.state.figureElSel = 'seg:1';
  E.figEditDash('seg:1');
  E.figEditUndo();
  봄('되돌린 그것이 골라진 채다 (무엇이 돌아왔는지 눈으로 보인다)', globalThis.state.figureElSel, 'seg:1');

  /* 🔴 **없어진 것을 가리켜서는 안 된다** — 「＋ 실선」은 새 선분을 곧바로 고른다.
     그것을 되돌리면 그 선분은 «없다». 고르개가 그대로 가리키면 「점선으로」가 빈자리를 민다. */
  globalThis.state.figureElSel = 'seg:0';
  E.figEditAddSeg(false);
  const 새것 = globalThis.state.figureElSel;
  E.figEditUndo();
  봄('🔴 더한 선을 되돌리면 고르개가 «없어진 것»을 안 가리킨다',
    [새것, globalThis.state.figureElSel, d.scene.segments.length], ['seg:2', 'seg:0', 2]);
}

console.log(NL + '⑦ 쌓이는 데 끝이 있다 — 그리고 초안에만 산다' + NL);
{
  const d = 열기();
  for (let i = 0; i < 한도 + 20; i++) { E.figEditHide('seg:1', i % 2 === 0); }
  봄('🔴 한도(' + 한도 + ')를 넘지 않는다', d.undo.length, 한도);
  /* 오래된 것부터 버린다 — 「방금 한 것」을 못 되돌리면 쓸모가 없다 */
  E.figEditUndo();
  봄('   방금 한 것은 되돌려진다', !!d.scene.hidden['seg:1'], true);

  /* 🔴 **저장되는 것은 d.scene 뿐이다** — 실행취소 꾸러미가 DB 로 나가면 문서가 40배로 커진다.
     장면 안에 숨어들지 않았는지 본다. */
  봄('🔴 실행취소 꾸러미는 «장면»에 안 들어간다',
    [JSON.stringify(d.scene).includes('undo'), Array.isArray(d.undo)], [false, true]);
  /* 초안을 닫으면 같이 사라진다 — figEditDraft 가 null 을 주니 아무 일도 안 한다 */
  globalThis.state.figureDraft = null;
  토스트.length = 0;
  E.figEditUndo();
  봄('초안을 닫으면 되돌릴 것도 없다', [토스트.length, globalThis.state.figureDraft], [0, null]);
}

console.log(NL + '⑧ 손길이 있어야 도는 자리 — 거기서도 뜨는가 (글로 잰다)' + NL);
{
  /* 🔴 끌어 놓는 것과 화살표는 진짜 PointerEvent·KeyboardEvent 가 있어야 돈다(그것은 프로브가 잰다).
     여기서는 **뜨기를 빠뜨리지 않았는가**만 그 함수의 글에서 본다 — 빠뜨리면 「끌었는데 못 되돌린다」다. */
  const 놓기 = 뜨기('function figEditEnd(');
  const 자리 = (글, 먼저, 나중) => { const a = 글.indexOf(먼저), b = 글.indexOf(나중); return a >= 0 && b >= 0 && a < b; };
  봄('🔴 이름표를 놓을 때 뜬다', 자리(놓기, 'figEditPush()', 'figEditPin('), true);
  봄('🔴 선분 끝을 놓을 때도 뜬다 — 그 전에 뜬다', 자리(놓기, 'figEditPush()', 'Figure.moveSegEnd('), true);
  봄('   끌지 «않았으면» 안 뜬다 (눌러만 본 것은 손질이 아니다)',
    (놓기.match(/figEditPush\(\)/g) || []).length, 2);

  /* 화살표 — 문서에 위임으로 단 손길이라 함수가 아니다. 그 덩이를 글로 뜬다. */
  const 키 = html.slice(html.indexOf("document.addEventListener('keydown'", html.indexOf('function figEditEnd(')));
  const 키덩이 = 키.slice(0, 키.indexOf('});') + 3);
  봄('🔴 화살표도 뜬다 — 그리고 «표»를 달고 뜬다(한 벌을 한 번으로)',
    /figEditPush\('arrow:'/.test(키덩이), true);
  봄('   밀기 전에 뜬다', 자리(키덩이, 'figEditPush(', 'figEditPin('), true);
  봄('🔴 Ctrl+Z 로도 되돌린다', /(ctrlKey \|\| e\.metaKey)[\s\S]{0,200}figEditUndo\(\)/.test(키덩이), true);
  봄('   입력칸 안에서는 안 가로챈다 (거기서는 글자 되돌리기가 맞다)',
    자리(키덩이, "tag === 'INPUT'", 'ctrlKey'), true);

  /* 단추도 서야 한다 — 남은 단계가 있을 때만 */
  const 편집기 = 뜨기('function figEditorHTML(');
  봄('🔴 실행취소 단추가 편집기에 선다', /figEditUndo\(\)/.test(편집기), true);
  봄('   되돌릴 것이 없으면 안 선다', /d\.undo && d\.undo\.length\) \?/.test(편집기), true);
  봄('   「이름표 자리 되돌리기」와 다른 단추다', /이름표 자리 되돌리기/.test(편집기) && /실행취소/.test(편집기), true);
}

console.log(NL + '🪤 덫 — 실행취소를 «없애» 보고 무는지 본다' + NL);
{
  let 물었다 = 0;
  /* ① 뜨는 자리가 «고친 뒤»면 — 되돌려도 고친 그것이 돌아온다 */
  {
    const d = 열기();
    const 처음 = 찍기(d);
    Figure.setHidden(d.scene, 'seg:1', true);       // 먼저 고치고
    E.figEditPush();                                 // 뒤늦게 뜬다 (틀린 차례)
    E.figEditUndo();
    if (찍기(d) !== 처음) 물었다++;
    console.log('  ' + (찍기(d) !== 처음 ? '✓' : '🔴') + ' 고친 뒤에 뜨면 못 돌아온다 — 뜨는 자리는 «직전»이다');
  }
  /* ② 얕게 뜨면 — 같은 배열을 들고 있어 되돌려도 따라 바뀐다 */
  {
    const d = 열기();
    const 얕은것 = Object.assign({}, d.scene);      // 깊은 복사가 «아니다»
    d.scene.segments[0].to = [9, 9];
    const 같이바뀜 = JSON.stringify(얕은것.segments[0].to) === JSON.stringify([9, 9]);
    if (같이바뀜) 물었다++;
    console.log('  ' + (같이바뀜 ? '✓' : '🔴') + ' 얕게 뜨면 같이 바뀐다 — 그래서 통째로(JSON) 뜬다');
  }
  /* ③ 표를 안 지우면 — 딴 손질 뒤의 화살표가 한 단계에 묻힌다 */
  {
    const d = 열기();
    E.figEditPush('arrow:point:0');
    E.figEditHide('seg:1');                          // 여기서 표가 지워져야 한다
    const 단계 = d.undo.length;
    E.figEditPush('arrow:point:0');
    const 열렸다 = d.undo.length === 단계 + 1;
    if (열렸다) 물었다++;
    console.log('  ' + (열렸다 ? '✓' : '🔴') + ' 딴 손질이 표를 지운다 — 안 지우면 화살표가 그 단계에 묻힌다');
  }
  console.log(NL + '🪤 덫 ' + 물었다 + '/3 물었다');
}

console.log(NL + (fail ? '🔴 걸린 것 ' + fail + '개 · ' + (pass + fail) + '개' : '✓ 전부 통과 · ' + pass + '개') + NL);
process.exit(fail ? 1 : 0);
