// 복습용 영상 · 구간 칸의 자판 · 전체화면 대비책 (2026-09-20 · 사용자 요청 셋)
//
//   node tools/video-notrack-test.mjs
//
// ① **복습용** — 「영상을 특정 몇문제 복습용으로 받아보는 학생들이 있어서 이런경우에는
//    시청안했다고 하기가 뭐해서」. 봐도 되고 안 봐도 되는 자료라 **세는 목록에서 뺀다.**
//    🔴 재는 것은 «잣대가 하나인가»가 아니라 **«세는 자리마다 그 잣대가 걸렸는가»**다 —
//      한 곳만 빠뜨리면 그 화면에서만 시청률이 깎이고, 그 어긋남은 아무도 못 찾는다.
//    ⚠ `videoDone`·`videoScore` 는 일부러 안 고쳤다 — 한 번도 안 본 학생에게는 기록이 아예
//      없어 그 함수에 «어느 영상인지»가 안 닿는다. 거기서 갈랐으면 0 이 그대로 평균에 실린다.
//
// ② **구간 칸의 자판** — 「모바일로 … 시작 구간 정하는 부분을 누르면 … ":"을 입력할 수 없어」.
//    숫자 자판에 쌍점이 없다. `inputmode` 로는 못 고친다 — 안 주는 것이 답이다.
//
// ③ **전체화면** — 「아이패드로 영상을 볼 때 전체화면모드가 안된다」. 옛 판은 API 가 없으면
//    `function(){}` 를 불러 **아무 일도 아무 말도 없었다.** 안 되면 우리가 덮는다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

function lift(name){
  const at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇
    + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ═══ ① 잣대 그 자체 ═══ */
console.log(NL + '① 복습용이라는 잣대' + NL);
{
  const V = new Function(lift('videoCounted') + NL + 'return videoCounted;')();
  봄('여느 영상은 «센다»', V({ id: 'v1' }), true);
  봄('🔴 복습용은 안 센다', V({ id: 'v1', noTrack: true }), false);
  봄('⚠ 옛 영상에는 그 칸이 없다 — 예전 그대로 «세는» 영상이다', V({ id: 'v1' }), true);
  봄('   false 로 적힌 것도 센다', V({ id: 'v1', noTrack: false }), true);
  봄('   영상이 아예 없으면 세는 쪽으로 — 없는 영상 때문에 숫자가 조용히 바뀌면 안 된다', V(null), true);
}

/* ═══ ② 세는 자리마다 그 잣대가 걸렸는가 ═══ */
console.log(NL + '② 시청률을 세는 자리 다섯 곳 · 할 일 · 재촉' + NL);
{
  const 걸렸나 = (이름) => lift(이름).includes('videoCounted');
  봄('🔴 학생 홈 시청률 (stuVideoAvg)', 걸렸나('stuVideoAvg'), true);
  봄('🔴 학생 홈 할 일 (stuTodo) — 복습용은 «밀린 일»이 아니다', 걸렸나('stuTodo'), true);
  봄('🔴 강사 학생상세 요약 (studentVideoSummary)', 걸렸나('studentVideoSummary'), true);
  봄('🔴 신호판 (rosterStats)', 걸렸나('rosterStats'), true);
  봄('🔴 달 리포트 (monthlyReportData)', 걸렸나('monthlyReportData'), true);
  봄('🔴 「아직 안 본 학생」 재촉 (vidNotWatched) — 복습용은 재촉하지 않는다', 걸렸나('vidNotWatched'), true);
  /* 🔵 **반 › 영상 화면은 «일부러» 안 거른다** — 누가 봤는지는 강사가 봐야 한다.
     거기서 거르면 보낸 영상이 목록에서 사라져 「보냈는데 왜 없지」가 된다. */
  봄('🔵 반 › 영상 목록은 복습용도 그대로 보여 준다 (누가 봤는지는 봐야 한다)',
     /DATA\.videos\.filter\(v=>!v\.studentId && \(!v\.classId \|\| v\.classId===classId\)\)/.test(lift('chubVideoHTML')), true);
}

/* ═══ ③ 정말로 평균에서 빠지는가 — 함수를 돌려 본다 ═══ */
console.log(NL + '③ 돌려 본다 — 안 본 복습용이 시청률을 안 깎는다' + NL);
{
  const 잣대 = ['VIDEO_DONE_RATIO', 'VIDEO_GOAL_PCT', 'VIDEO_DONE_SLACK_SEC', 'VIDEO_BUCKET_SEC'].map(n => {
    const m = html.match(new RegExp('^const ' + n + ' = .*$', 'm'));
    if (!m) throw new Error(n + ' 를 못 찾았습니다');
    return m[0];
  }).join(NL) + NL + ['videoGoalOfItem', 'videoItemById', 'videoGoalOfProgress', 'coverLen', 'coverSec',
    'videoDurationSec', 'videoWatchedSec', 'videoWatchRatio', 'videoDone', 'videoPct', 'videoSeen',
    'videoScore', 'videoCounted', 'stuVideoAvg'].map(lift).join(NL);
  const A = new Function('DATA', 잣대 + NL + 'return stuVideoAvg;')({ videos: [] });

  const rec = { videoProgress: { a: { watchedSeconds: 600, duration: 600 } } };   /* a 만 봤다 */
  const c = (vs) => ({ rec, videos: vs });
  봄('영상 하나를 다 봤으면 100%', A(c([{ id: 'a' }])), 100);
  봄('🔴 안 본 영상이 하나 더 있으면 50% — 안 본 것은 0 으로 함께 센다',
     A(c([{ id: 'a' }, { id: 'b' }])), 50);
  봄('🔴 그 영상이 «복습용»이면 다시 100% 다 (이번 요청의 알맹이)',
     A(c([{ id: 'a' }, { id: 'b', noTrack: true }])), 100);
  봄('🔴 복습용만 있으면 «시청률이 없다»(null) — 0% 가 아니다. 셀 것이 없는 것과 못 한 것은 다르다',
     A(c([{ id: 'b', noTrack: true }])), null);
  봄('   영상이 아예 없을 때와 같은 답이다', A(c([])), null);
}

/* ═══ ④ 강사가 그것을 켤 수 있는가 · 학생이 그 사실을 아는가 ═══ */
console.log(NL + '④ 폼과 딱지' + NL);
{
  const 폼 = lift('chubVideoHTML');
  봄('🔴 등록 폼에 복습용 상자가 있다', 폼.includes('id="video-notrack"'), true);
  봄('🔴 켠 것만 적는다 (addVideo)', /notrackEl\.checked\) 기본\.noTrack = true/.test(lift('addVideo')), true);
  봄('🔴 보내고 나면 상자를 도로 끈다 — 안 끄면 다음 영상까지 조용히 복습용이 된다',
     lift('addVideo').includes('notrackEl.checked = false'), true);
  봄('🔴 묶음 열쇠가 복습용 여부를 본다 — 세는 것과 안 세는 것이 한 줄로 묶이면 안 된다',
     폼.includes("v.noTrack?'R':''"), true);
  /* 2026-09-23 — 반 전체·개인 배정 줄이 딱지를 한 함수(딱지들)로 찍고, 머리 카드가 하나 더 찍는다. */
  봄('   목록 줄과 머리 카드에 «복습용» 딱지가 선다',
     [(폼.match(/복습용<\/span>/g) || []).length >= 1, lift('videoHeroHTML').includes('복습용</span>')], [true, true]);
  봄('🔴 학생 화면에도 적힌다 — 안 적으면 「안 보면 깎이나」로 읽는다',
     lift('stuVideoHTML').includes('복습용'), true);
  봄('🔴 진도 칸이 복습용에는 «완주»를 안 말한다',
     lift('videoProgressBlockHTML').includes('videoCounted(videoItemById(videoId))'), true);
}

/* ═══ ⑤ 구간 칸 — 숫자 자판을 걷었다 ═══ */
console.log(NL + '⑤ 구간 칸에 쌍점을 칠 수 있는가 (모바일)' + NL);
{
  const 폼 = lift('chubVideoHTML');
  const 칸 = (id) => (폼.match(new RegExp('<input id="' + id + '"[^>]*>')) || [''])[0];
  봄('🔴 구간 시작 칸에 숫자 자판 힌트가 없다 — 숫자 자판에는 «:» 이 없다',
     /inputmode/.test(칸('video-from')), false);
  봄('🔴 구간 끝 칸도 마찬가지', /inputmode/.test(칸('video-to')), false);
  봄('   칸 자체는 그대로 있다', [!!칸('video-from'), !!칸('video-to')], [true, true]);
  봄('   본보기 글은 남아 있다 — 무엇을 치는지는 그것이 말한다',
     칸('video-from').includes('placeholder="12:30"'), true);
  봄('⚠ 새로 낸 «옮긴 날 시간» 칸에도 같은 함정을 안 판다',
     /id="od-move-time"[^>]*inputmode/.test(html), false);
  /* 받는 쪽은 그대로다 — 자판을 걷었다고 꼴까지 느슨해지면 안 된다. */
  const K = new Function(lift('clockToSec') + NL + 'return clockToSec;')();
  봄('   「12:30」은 750초', K('12:30'), 750);
  봄('   「2:04:00」은 7440초', K('2:04:00'), 7440);
  봄('🔴 꼴이 틀리면 여전히 null — 자판만 바꿨지 받는 잣대는 그대로다', [K('12시30분'), K('')], [null, null]);
}

/* ═══ ⑥ 전체화면 — 안 되면 우리가 덮는다 ═══ */
console.log(NL + '⑥ 전체화면 (아이패드·아이폰)' + NL);
{
  const 몸 = lift('vcFull');
  /* 🔴 **여는 길**이 빈 함수로 물러서면 안 된다 — 그것이 이번에 고친 흠이다.
     ⚠ **닫는 길**의 `|| function(){}` 은 일부러 남겼다. 켠 적이 없으면 닫을 것도 없어
       아무 일도 안 하는 것이 «맞는» 답이고, 그 자리는 `.call` 이 터지는 것만 막는다. */
  봄('🔴 여는 길이 «아무 일도 안 하는» 빈 함수로 물러서지 않는다 (옛 흠)',
     /[Rr]equestFullscreen \|\| function\(\)\{\}/.test(몸), false);
  봄('⚠ 닫는 길의 빈 함수는 그대로 — 켠 적이 없으면 닫을 것도 없다',
     /[Ee]xitFullscreen \|\| function\(\)\{\}/.test(몸), true);
  봄('🔴 API 가 없으면 가짜 전체화면으로 덮는다', 몸.includes("classList.add('fsfake')"), true);
  봄('🔴 거절당해도(promise reject) 덮는다', /\.catch\(가짜로\)/.test(몸), true);
  봄('🔴 아무 말 없이 안 켜지는 판도 잡는다 — 잠깐 뒤에 «정말 켜졌나»를 본다', 몸.includes('setTimeout('), true);
  봄('   한 번 더 누르면 걷힌다', 몸.includes("classList.remove('fsfake')"), true);
  봄('🔴 render() 를 안 부른다 — 부르면 iframe 이 새로 생겨 재생이 처음으로 간다',
     /(^|[^a-zA-Z])render\(\)/.test(몸), false);
  봄('🔴 단추 그림도 가짜를 «켜진 것»으로 센다 — 아니면 덮여 있는데 「크게」라고 말한다',
     lift('vcPaint').includes("classList.contains('fsfake')"), true);
  /* CSS — 진짜와 «같은 모양»이라야 한다. 한쪽만 고치면 가짜에서만 조작줄이 떠 있다. */
  봄('가짜도 화면을 꽉 채운다', /\.vc-shell\.fsfake\{[^}]*position:fixed;inset:0/.test(html), true);
  봄('가짜도 영상 칸이 늘어난다',
     html.includes('.vc-shell.fsfake .sap-vwrap{flex:1;min-height:0;aspect-ratio:auto;border-radius:0;}'), true);
  봄('가짜도 조작줄 모서리를 편다', html.includes('.vc-shell.fsfake .vc{border-radius:0;}'), true);
  봄('🔴 가짜에서도 손짓을 우리가 받는다 (내릴 화면이 없다)',
     html.includes('.vc-shell.fsfake .vc-veil{touch-action:none;}'), true);
  봄('⚠ 진짜 전체화면 규칙은 그대로 남아 있다',
     /\.vc-shell:fullscreen\{/.test(html) && /-webkit-full-screen\{/.test(html), true);
}

/* ═══ 🪤 덫 — 망가뜨리면 정말 무는가 ═══ */
console.log(NL + '🪤 덫 — 일부러 망가뜨려 본다' + NL);
{
  let 물음 = 0;
  const 재본다 = (이름, 잰다) => {
    let 걸렸다 = false;
    try { 걸렸다 = !잰다(); } catch (e) { 걸렸다 = true; }
    if (걸렸다) { 물음++; pass++; } else fail++;
    console.log((걸렸다 ? '  ✓ ' : '  🔴 ') + 이름 + (걸렸다 ? '' : ' — 안 물었다'));
  };
  재본다('복습용을 «센다»로 뒤집으면 문다', () => {
    const 글 = lift('videoCounted').replace('!(v && v.noTrack)', 'true');
    return new Function(글 + NL + 'return videoCounted;')()({ noTrack: true }) === false;
  });
  재본다('학생 홈 시청률에서 거르개를 빼면 문다',
    () => lift('stuVideoAvg').replace('.filter(videoCounted)', '').includes('videoCounted'));
  재본다('전체화면 대비책을 걷으면 문다',
    () => lift('vcFull').split("classList.add('fsfake')").join('void 0').includes("classList.add('fsfake')"));
  console.log(NL + '🪤 덫 ' + 물음 + '/3 물었다');
}

console.log(NL + (fail ? '🔴 ' + fail + '개 틀렸다 · ' + pass + '개 통과'
                       : '✓ 전부 통과 · ' + pass + '개') + NL);
process.exit(fail ? 1 : 0);
