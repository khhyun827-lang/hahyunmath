// 🔴 검토 화면의 키보드 — «보이는 것»에만 손대는가 (2026-09-06)
//    사용자가 짚었다 — 「내용없음 애들은 키보드로 편한데 검토대기로 넘어가면 그게 없어져버려」.
//    까닭: 「검토 대기」에는 두 갈래가 «한 줄로 섞여» 그려지는데(AI 변형 + 시험지 문항)
//    키보드는 시험지 문항만 보고 있었다. AI 변형을 고르면 reviewSelectedId 가 null 이 되고,
//    🔴 `reviewSelected(list)` 가 **list[0] 을 돌려줘 «안 보이는» 문항이 승인됐다.**

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL2 = String.fromCharCode(10);
const lift = (n) => { const at = html.indexOf('function ' + n + '('); let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); } } };
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇 + NL2 + '      나온 것: ' + JSON.stringify(나온것) + NL2 + '      나와야:  ' + JSON.stringify(나와야)); }
};

console.log(NL2 + '검토 화면 — 키보드가 «보이는 것»을 따라가는가' + NL2);

/* 화면이 그리는 차례와 «같은» 목록을 쓰는지 본다. */
const F = (state, autos, bank) => new Function('state', 'pendingVariants', 'reviewQueueList',
  lift('reviewWalkList') + NL2 + lift('reviewWalkCur') + NL2 + 'return { reviewWalkList, reviewWalkCur };')(
  state, () => autos, () => bank);

const autos = [{ code: 'K2-01-E-0001-N01' }, { code: 'K2-01-E-0002-N01' }];
const bank = [{ id: 'pb1' }, { id: 'pb2' }];

{
  const R = F({ reviewQueue: 'pending', reviewVariantCode: '', reviewSelectedId: null }, autos, bank);
  봄('🔵 AI 변형이 «먼저» 온다 — 화면에 그리는 차례 그대로',
     R.reviewWalkList().map(x => x.key), ['K2-01-E-0001-N01', 'K2-01-E-0002-N01', 'pb1', 'pb2']);
}
/* 🔴 이 검사가 붙드는 자리 — AI 변형을 고른 채 E 를 누르면 «그것»이어야 한다. */
{
  const R = F({ reviewQueue: 'pending', reviewVariantCode: 'K2-01-E-0002-N01', reviewSelectedId: null }, autos, bank);
  const 지금 = R.reviewWalkCur();
  봄('🔴 AI 변형을 골랐으면 «그것»이 지금 것이다', [지금.auto, 지금.key], [true, 'K2-01-E-0002-N01']);
  봄('🔴 시험지 문항이 아니다 (옛 흠: list[0] 이 승인됐다)', 지금.b === undefined, true);
}
{
  const R = F({ reviewQueue: 'pending', reviewVariantCode: '', reviewSelectedId: 'pb2' }, autos, bank);
  const 지금 = R.reviewWalkCur();
  봄('시험지 문항을 골랐으면 그것', [지금.auto, 지금.key], [false, 'pb2']);
}
{
  /* 다른 큐에는 AI 변형이 없다 — 예전과 똑같이 돈다. */
  const R = F({ reviewQueue: 'empty', reviewVariantCode: '', reviewSelectedId: 'pb1' }, autos, bank);
  봄('⚠ 「내용 없음」 큐에는 AI 변형이 안 섞인다', R.reviewWalkList().map(x => x.key), ['pb1', 'pb2']);
}

/* 🔵 키 처리가 «화면과 같은 잣대»를 쓰는지 — 글로 확인한다(누르는 것은 못 흉내 낸다). */
{
  const 손 = html.slice(html.indexOf('/* 키보드 — 검토 화면에서만 듣는다'));
  const 끝 = 손.indexOf('});');
  /* ⚠ 주석을 걷어내고 본다 — 「옛 방식을 왜 버렸는지」를 주석에 적어 두면 그것이 걸린다. */
  const 글 = 손.slice(0, 끝).replace(/[/][*][^]*?[*][/]/g, '');
  봄('🔴 키 처리가 reviewWalkCur 을 쓴다', 글.includes('reviewWalkCur()'), true);
  봄('🔴 옛 reviewSelected(list) 는 안 쓴다', 글.includes('reviewSelected(list)'), false);
  봄('AI 변형에서 E 는 통과', 글.includes('approveAutoVariant'), true);
  봄('AI 변형에서 X 는 버리기', 글.includes('discardAutoVariant'), true);
}
{
  /* 🔵 키가 되는 줄을 «단추에 적어» 두었는가 — 안 적혀 있으면 아무도 안 쓴다. */
  const 판 = lift('autoVariantWorkHTML');
  봄('🔵 통과 단추에 E 가 적혀 있다', /class="k">E</.test(판), true);
  봄('🔵 버리기 단추에 X 가 적혀 있다', /class="k">X</.test(판), true);
  봄('🔵 J·K 안내도 있다', 판.includes('kbd">J') && 판.includes('kbd">K'), true);
}

console.log(NL2 + '  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패' + NL2);
process.exit(fail ? 1 : 0);
