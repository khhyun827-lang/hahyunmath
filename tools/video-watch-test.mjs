// 영상 «얼마나 봤나»의 잣대 — 70% 완주 (2026-09-13 · K-7)
//
//   node tools/video-watch-test.mjs
//
// 🔴 **왜 재는가** — 사용자 신고 둘:
//   ① 「테스트학생으로 끝으로 돌린결과 완주로 나왔고」 — 재생바를 끝으로 끌면 유튜브가 ENDED 를 띄우고,
//      그것이 `completed` 로 그대로 들어가 있었다. 벽시계로 세도록 바꾼 까닭(2026-07-29)이 뒷문으로 무너졌다.
//   ② 「반별로 33퍼 라고떠있는게 무슨의미인지도 모르겠어」 — 재원 전체의 평균 시청률이었는데
//      «무엇의 33인지»가 화면에 없었다.
//   그리고 사용자가 정했다 — 「전체 영상시간의 70퍼센트 정도를 영상시청하면 완주」.
//
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.
// 🔵 ③은 **화면을 실제로 그려서** 본다. 글자만 보는 검사는 「if(false)」도 통과시킨다(09-13에 두 번 밟았다).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if (html.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
/* 상수 한 줄을 그대로 떠 온다 — 0.7 을 여기 적으면 잣대가 두 곳이 된다. */
function liftConst(name) {
  const m = html.match(new RegExp('^const ' + name + ' = .*$', 'm'));
  if (!m) throw new Error(name + ' 를 못 찾았습니다');
  return m[0];
}
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ⚠ **이 목록은 잣대가 깊어질 때마다 같이 자라야 한다** (2026-09-17에 한 번 밟았다).
   09-15 의 「구간만 보라」(K-11)로 `videoDurationSec` 이 `videoGoalOfProgress`
   → `videoItemById`·`videoGoalOfItem` 을, `videoWatchedSec` 이 `coverSec`(→ `VIDEO_BUCKET_SEC`)을
   부르게 됐다. 목록이 안 따라와 이 검사가 ReferenceError 로 통째로 터져 있었다. */
const 잣대 = ['VIDEO_DONE_RATIO', 'VIDEO_GOAL_PCT', 'VIDEO_DONE_SLACK_SEC', 'VIDEO_BUCKET_SEC'].map(liftConst).join(NL) + NL +
  ['videoGoalOfItem', 'videoItemById', 'videoGoalOfProgress', 'coverLen', 'coverFill', 'coverSec',
   'videoDurationSec', 'videoWatchedSec', 'videoWatchRatio', 'videoDone', 'videoPct',
   'videoSeen', 'videoGoalLabel', 'videoScore', 'videoGoalMarkHTML'].map(lift).join(NL);
const V = new Function(잣대 + NL +
  'return { VIDEO_DONE_RATIO, VIDEO_GOAL_PCT, VIDEO_DONE_SLACK_SEC, videoWatchRatio, videoPct, videoDone, videoSeen, videoScore, videoGoalLabel, videoGoalMarkHTML };')();

/* ═══ ① 잣대 — 끝까지 봐야 완주 ═══ */
console.log(NL + '① 잣대 — 영상을 끝까지 실제로 재생해야 완주' + NL);
{
  봄('🔴 완주선은 100% 다 (K-9에서 70 → 100)', [V.VIDEO_DONE_RATIO, V.VIDEO_GOAL_PCT], [1, 100]);
  const p = (sec, dur) => ({ watchedSeconds: sec, duration: dur });
  봄('다 보면 100% · 완주', [V.videoPct(p(600, 600)), V.videoDone(p(600, 600))], [100, true]);
  봄('🔴 10분짜리를 7분 보면 «시청 중»이다 (예전 잣대로는 완주였다)',
    [V.videoPct(p(420, 600)), V.videoDone(p(420, 600))], [70, false]);
  봄('90%도 아직 아니다', [V.videoPct(p(540, 600)), V.videoDone(p(540, 600))], [90, false]);
  /* 몇 초 여유 — 끝까지 본 학생이 99%에서 멈추면 그것은 고장으로 보인다 */
  봄('🔴 2초까지는 봐준다 (598초 = 완주)', [V.videoPct(p(598, 600)), V.videoDone(p(598, 600))], [100, true]);
  봄('🔴 3초가 모자라면 아직이다 (597초)', [V.videoPct(p(597, 600)), V.videoDone(p(597, 600))], [99, false]);
  봄('짧은 영상은 여유도 짧다 — 60초짜리는 2%인 1.2초까지만',
    [V.videoDone(p(58.9, 60)), V.videoDone(p(58.7, 60))], [true, false]);
  봄('🔴 «100%인데 시청 중»도 «99%인데 완주»도 안 나온다',
    [400, 540, 596, 597, 598, 599, 600].map(s => (V.videoPct(p(s, 600)) === 100) === V.videoDone(p(s, 600))),
    [true, true, true, true, true, true, true]);
  봄('아무것도 안 봤으면 0 · 미시청', [V.videoPct(p(0, 600)), V.videoDone(p(0, 600)), V.videoSeen(p(0, 600))], [0, false, false]);
  봄('기록이 아예 없으면 0 · 미시청', [V.videoPct(null), V.videoDone(null), V.videoSeen(null)], [0, false, false]);
  봄('🔴 %를 부풀리지 않는다 — 40%를 봤으면 40%다 (예전엔 ×1.5 로 60% 였다)', V.videoPct(p(240, 600)), 40);
  봄('길이보다 오래 세어도 100을 안 넘는다', V.videoPct(p(9999, 600)), 100);
  봄('집계용도 같은 말을 한다 (완주 100 · 아니면 실측)',
    [V.videoScore(p(600, 600)), V.videoScore(p(420, 600)), V.videoScore(p(300, 600))], [100, 70, 50]);
  /* 길이를 모르는 아주 옛 기록 */
  봄('길이를 모르면 저장된 값으로 물러선다',
    [V.videoPct({ percent: 42, completed: true }), V.videoDone({ percent: 42, completed: true })], [42, true]);
  봄('완주를 말로 적는 자리가 하나다', V.videoGoalLabel(), '영상을 끝까지 실제로 재생');
  봄('🔴 완주선이 100% 면 막대에 선을 안 긋는다 (오른쪽 끝이 곧 완주선이다)', V.videoGoalMarkHTML(), '');
}

/* ═══ ② 끝으로 끌기 — 더는 완주가 아니다 ═══ */
console.log(NL + '② 재생바를 끝으로 끌어도 완주가 아니다' + NL);
{
  const 만들기 = () => {
    const rec = { videoProgress: {} };
    const 저장 = [];
    const F = new Function('loadRecord', 'saveRecord', 'document', 잣대 + NL + lift('noteVideoWatchTime') + NL +
      'return { noteVideoWatchTime };')(
      async () => rec, async () => { 저장.push(1); }, { getElementById: () => null });
    return { rec, 저장, F };
  };
  /* 3초만 재생하고 끝으로 끌었다 — 예전에는 ENDED 하나로 completed 가 됐다 */
  const a = 만들기();
  await a.F.noteVideoWatchTime('s1', 'v1', 3, 600);
  봄('🔴 3초 보고 끝으로 끌어도 완주가 아니다',
    [V.videoDone(a.rec.videoProgress.v1), V.videoPct(a.rec.videoProgress.v1)], [false, 0]);
  /* 🔴 **재려던 것은 «`ended` 라는 뒷문이 없다»다** — 예전에는 유튜브의 ENDED 하나로 완주가 됐다.
     ⚠ 09-16 에 「어느 대목을 봤나」가 들어오며 `앞자리·뒷자리` 둘이 «정당하게» 붙었는데,
       서명을 통째로 맞대 놓아서 이 줄이 그때부터 거짓이 됐다. 뒷문이 열린 것이 아니었다.
     🔵 그래서 **서명을 적어 두되 `ended` 가 없다는 것을 따로 못 박는다** — 새 칸이 붙으면
       여기서 한 번 걸리고(적어 두라는 뜻이다), 뒷문이 돌아오면 아래 줄이 문다. */
  const 서명 = (lift('noteVideoWatchTime').match(/function noteVideoWatchTime\(([^)]*)\)/) || [])[1] || '';
  봄('🔴 noteVideoWatchTime 이 받는 것 — 여기에 ended 는 없다 (뒷문이 닫혔다)',
    서명.split(',').map(s => s.trim()),
    ['studentId', 'videoId', 'addSeconds', 'duration', '앞자리', '뒷자리']);
  봄('🔴 몸 어디에도 ended 를 안 읽는다', /\bended\b/.test(lift('noteVideoWatchTime')), false);
  봄('🔴 flushWatchTick 도 ended 를 안 넘긴다', lift('flushWatchTick').includes('ended'), false);
  봄('🔴 어디에서도 ENDED 를 완주의 근거로 안 쓴다', /PlayerState\.ENDED/.test(html), false);
  /* 5초 틱으로 끝까지 재생하면 완주 — 실제 화면이 쌓는 모양 그대로다 */
  const b = 만들기();
  for (let i = 0; i < 120; i++) await b.F.noteVideoWatchTime('s1', 'v1', 5, 600);   // 5초 × 120 = 600초
  봄('끝까지 실제로 재생하면 완주',
    [b.rec.videoProgress.v1.watchedSeconds, V.videoDone(b.rec.videoProgress.v1)], [600, true]);
  봄('🔴 7분만 재생하면 아직이다 (같은 틱으로)', await (async () => {
    const c = 만들기();
    for (let i = 0; i < 84; i++) await c.F.noteVideoWatchTime('s1', 'v1', 5, 600);  // 420초
    return [c.rec.videoProgress.v1.watchedSeconds, V.videoDone(c.rec.videoProgress.v1)];
  })(), [420, false]);
  봄('🔴 마지막 조각이 조금 덜 실려도 완주다 (598초 — 여유 2초)', await (async () => {
    const c = 만들기();
    for (let i = 0; i < 119; i++) await c.F.noteVideoWatchTime('s1', 'v1', 5, 600); // 595초
    await c.F.noteVideoWatchTime('s1', 'v1', 3, 600);                               // 598초
    return [c.rec.videoProgress.v1.watchedSeconds, V.videoDone(c.rec.videoProgress.v1)];
  })(), [598, true]);
  /* 🔵 **문서에 남는 칸을 못 박아 둔다** — 여기서 걸리면 «칸이 하나 늘었다»는 뜻이고,
     늘릴 때는 까닭이 코드에 적혀 있어야 한다. 09-16 에 셋이 늘었고 셋 다 까닭이 있다:
       · `seen`    — 어느 «대목»을 봤나(10초 칸 하나에 글자 하나). 구간만 보라는 배정을 재려면 필요하다.
       · `base`    — 커버리지가 없던 시절의 값을 한 번만 얼린 바닥. 없으면 옛 기록의 %가 뚝 떨어진다.
       · `videoId` — `p` 는 제 id 를 몰라서 배정(구간)을 못 찾는다. 그래서 쓸 때 같이 남긴다.
     ⚠ `percent`·`completed` 는 «그때 무엇으로 봤나»의 자취다 — **화면은 이 둘을 안 믿는다.** */
  봄('문서에 남는 칸 — 여덟 (09-16에 seen·base·videoId 가 늘었다)',
    Object.keys(b.rec.videoProgress.v1).sort(),
    ['base', 'completed', 'duration', 'percent', 'seen', 'updatedAt', 'videoId', 'watchedSeconds']);
  봄('문서에 적어 둔 percent·completed 도 새 잣대를 따른다',
    [b.rec.videoProgress.v1.percent, b.rec.videoProgress.v1.completed], [100, true]);
  봄('길이를 모르면 아무것도 안 쓴다', await (async () => {
    const c = 만들기(); await c.F.noteVideoWatchTime('s1', 'v1', 10, 0); return Object.keys(c.rec.videoProgress).length;
  })(), 0);

  /* 옛 기록이 스스로 고쳐진다 — 끌어서 완주로 찍혀 있던 것 */
  const 옛것 = { watchedSeconds: 12, duration: 600, percent: 3, completed: true };
  봄('🔴 예전에 «끌어서» 완주로 찍힌 기록도 이제 완주가 아니다',
    [V.videoDone(옛것), V.videoPct(옛것)], [false, 2]);
  const 옛부푼것 = { watchedSeconds: 240, duration: 600, percent: 60, completed: false };
  봄('🔴 1.5배 부풀어 저장된 percent 도 실측으로 고쳐 읽는다 (60 → 40)', V.videoPct(옛부푼것), 40);
}

/* ═══ ③ 배속 ═══ */
console.log(NL + '③ 2배속으로 다 보면 완주다' + NL);
{
  const 더한것 = [];
  /* 🔴 **`tickSpan` 을 안 넘겨 주면 이 대목이 «조용히» 거짓이 된다** (2026-09-17에 밟았다) —
     `flushWatchTick` 의 몸이 통째로 `try{}catch(err){}` 안이라, 없는 이름을 부르면
     터지지도 않고 그냥 아무것도 안 더한다. 셋이 나란히 `undefined` 로 나온 까닭이다.
     ⚠ 09-16 에 「어느 대목을 봤나」(구간)가 들어오면서 붙은 이름이다. */
  const F = new Function('noteVideoWatchTime',
    lift('videoPlaybackRate') + NL + lift('tickSpan') + NL + lift('flushWatchTick') + NL +
    'return { flushWatchTick, videoPlaybackRate };')(
    (sid, vid, add, dur) => 더한것.push(Math.round(add)));
  const 가짜 = rate => ({ getDuration: () => 600, getPlaybackRate: () => rate });
  const 틱 = (rate, sec) => { 더한것.length = 0; F.flushWatchTick({ lastTick: Date.now() - sec * 1000 }, 's1', 'v1', 가짜(rate)); return 더한것[0]; };
  봄('1배속 10초는 10초', 틱(1, 10), 10);
  봄('🔴 2배속 10초는 영상 20초다', 틱(2, 10), 20);
  봄('1.5배속도 센다', 틱(1.5, 10), 15);
  봄('말도 안 되는 배속은 안 믿는다', [F.videoPlaybackRate({ getPlaybackRate: () => 99 }), F.videoPlaybackRate({ getPlaybackRate: () => 0 })], [1, 1]);
  봄('배속을 못 물으면 1배속으로 친다', F.videoPlaybackRate({}), 1);
  봄('한 틱의 상한은 20초다 (백그라운드 탭)', 틱(1, 600), 20);
}

/* ═══ ④ 화면 — 「33%」가 무슨 수인지 말하는가 ═══ */
console.log(NL + '④ 반 › 영상 탭을 실제로 그려 본다' + NL);
{
  const roster = [
    { studentId: 's1', name: '가나다', classId: 'c1' },
    { studentId: 's2', name: '라마바', classId: 'c1' },
    { studentId: 's3', name: '사아자', classId: 'c1' },
  ];
  const DATA = {
    videos: [{ id: 'v1', classId: 'c1', title: '수학(상) 4강', unit: '대수 3단원', url: 'https://youtu.be/aaaaaaaa', dueDate: '' }],
    classes: [{ id: 'c1', name: '고1GA1' }],
    students: roster,
  };
  /* 하나는 완주(끝까지), 하나는 30%에서 멈춤, 하나는 미시청 — 예전 화면이 「33%」라고만 하던 꼴이다. */
  const allRecords = {
    s1: { videoProgress: { v1: { watchedSeconds: 600, duration: 600 } } },
    s2: { videoProgress: { v1: { watchedSeconds: 180, duration: 600 } } },
    s3: { videoProgress: {} },
  };
  const state = { allRecords, allRecordsLoaded: true, allRecordsLoading: false, videoAdding: false, videoSelectedId: 'v1' };
  /* ⚠ 2026-09-16 에 «영상 머리 카드»(`videoHeroHTML`)와 알림 띠가 붙었다 — 띠는 이 검사가 볼 것이
     아니라 빈 것으로 세우고, 머리 카드와 구간 딱지(`videoGoalLabelOf`)는 그대로 뜬다. */
  const C = new Function('DATA', 'state', 'loadAllRecordsIfNeeded', 'classRoster', 'escHtml', 'todayStr', 'iconSvg',
    'vidNoticeBarHTML', 'extractYouTubeId', 'stuDday', 'setVideoDue', 'deleteVideo', 'render',
    잣대 + NL + lift('secToClock') + NL + lift('videoGoalLabelOf') + NL + lift('videoHeroHTML')
      + NL + lift('chubVideoHTML') + NL + 'return chubVideoHTML;')(
    DATA, state, () => {}, () => roster,
    s => (s === null || s === undefined) ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    () => '2026-09-13', () => '',
    () => '', () => 'yt', () => null, () => {}, () => {}, () => {});
  const 그림 = C('c1');

  봄('🔴 목록이 «완주 1/3» 이라고 말한다 (예전엔 「33%」 한 줄이었다)', 그림.includes('<b>완주 1/3</b>'), true);
  봄('🔴 그래도 평균은 안 잃는다 — tooltip 에 있다', /반 평균 시청률 43%/.test(그림), true);
  봄('tooltip 이 완주의 뜻을 적는다', /완주 = 영상을 끝까지 실제로 재생/.test(그림), true);
  봄('머리말이 완주선을 밝힌다', 그림.includes('완주 = 영상을 끝까지 실제로 재생'), true);
  /* ⚠ 평균이 43인 것 — (100 + 30 + 0)/3. 안 본 학생도 0%로 함께 센다. */
  봄('이탈 지점 머리에 재원·완주·평균이 함께 선다', /재원 3명 · 완주 1 · 평균 43%/.test(그림), true);

  /* 이탈 히스토그램 — 0~90 열 칸 + 완주.
     🔵 완주선이 100% 로 올라가면서(K-9) 칸이 다시 열하나가 된다 — 70·80·90 도 «멈춘 자리»라 이제 뜻이 있다. */
  const 축 = [...그림.matchAll(/<div class="vd-dax">([\s\S]*?)<\/div>/g)][0][1]
    .match(/<span>([^<]*)<\/span>/g).map(x => x.replace(/<\/?span>/g, ''));
  봄('🔴 구간이 완주선에서 끊긴다 (지금은 100% 라 0~90 + 완주)',
    축, ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '완주']);
  /* ⚠ 칸이 모자라도 «터지지» 말고 틀렸다고 말해야 한다 — 터지면 어느 덫이 문 것인지 안 보인다. */
  const 막대 = [...그림.matchAll(/title="([^"]*?) · (\d+)명"/g)].map(m => [m[1], +m[2]]);
  const 칸 = i => 막대[i] || ['(칸 없음)', -1];
  봄('칸이 열하나다', 막대.length, 11);
  봄('완주 칸에 한 명', 칸(10), ['완주 (영상을 끝까지 실제로 재생)', 1]);
  봄('30%에서 멈춘 한 명은 30~39 칸에', 칸(3), ['30~39%에서 멈춤', 1]);
  봄('미시청 한 명은 0~9 칸에', 칸(0), ['0~9%에서 멈춤', 1]);
  봄('나머지 칸은 비었다', [1, 2, 4, 5, 6, 7, 8, 9].map(i => 칸(i)[1]), [0, 0, 0, 0, 0, 0, 0, 0]);

  /* 학생별 진행 */
  봄('완주한 학생은 «완주» 딱지 · 100%',
    /가나다<\/b>[\s\S]*?<span class="pct">100%<\/span>[\s\S]*?<span class="badge ok">완주<\/span>/.test(그림), true);
  봄('30%에서 멈춘 학생은 «시청 중»', /라마바<\/b>[\s\S]*?<span class="pct">30%<\/span>[\s\S]*?시청 중/.test(그림), true);
  /* ⚠ 2026-09-16(`7a090bd` · 「보기·관리하기 좋게 다듬었다」)에 «—» 를 «0%» 로 바꿨다 —
     안 본 것은 «못 잰 것»이 아니라 진짜 0이다(반 평균도 0으로 함께 센다고 tooltip 이 말한다).
     딱지는 그대로 «미시청» 이라 「0% 인데 아직 안 튼 것」임이 한 줄에서 읽힌다. */
  봄('미시청은 «0%» 와 «미시청» 딱지', /사아자<\/b>[\s\S]*?<span class="pct">0%<\/span>[\s\S]*?<span class="badge">미시청<\/span>/.test(그림), true);
  봄('🔴 90%에서 멈춘 학생은 «100%»로 적히지 않는다 (내림이라 99가 천장이다)', await (async () => {
    allRecords.s2.videoProgress.v1 = { watchedSeconds: 597, duration: 600 };
    const 다시 = C('c1');
    allRecords.s2.videoProgress.v1 = { watchedSeconds: 180, duration: 600 };
    return /라마바<\/b>[\s\S]*?<span class="pct">99%<\/span>[\s\S]*?시청 중/.test(다시);
  })(), true);
  봄('학생별 진행 머리에 완주 1/3 · 미시청 1', /완주 <b class="mono">1\/3<\/b> · 미시청 <b class="mono">1<\/b>/.test(그림), true);
  봄('🔴 완주선이 100% 면 막대에 선을 안 긋는다', (그림.match(/<em class="g"/g) || []).length, 0);
}

/* ═══ ⑤ 잣대가 한 벌인가 — 시청률을 세는 자리 전부 ═══ */
console.log(NL + '⑤ 시청률을 세는 자리가 다 같은 잣대를 쓰는가' + NL);
{
  봄('학생 홈 시청률', lift('stuVideoAvg').includes('videoScore(c.rec.videoProgress[v.id])'), true);
  봄('강사 학생상세 요약', lift('studentVideoSummary').includes('sumPercent += videoScore(p)'), true);
  봄('신호(rosterStats)', /sum \+ videoScore\(rec\.videoProgress && rec\.videoProgress\[v\.id\]\)/.test(html), true);
  봄('리포트', /videoSeen\(vp\[v\.id\]\)/.test(html) && /n \+ videoScore\(vp\[v\.id\]\)/.test(html), true);
  봄('반 평균', lift('chubVideoHTML').includes('videoScore(rec && rec.videoProgress && rec.videoProgress[v.id])'), true);
  /* 🔴 옛 잣대가 한 톨도 안 남았는가 */
  /* ⚠ 닻을 html 전체에 걸면 **까닭을 적어 둔 주석**이 물린다 — 함수 몸통만 본다.
     (09-13에 이미 한 번 밟았다: 닻이 다른 함수의 같은 줄을 쳤다.) */
  봄('🔴 ×150 이 셈에서 사라졌다',
    /150/.test(lift('noteVideoWatchTime')) || /150/.test(lift('videoPct')) || /150/.test(lift('videoWatchRatio')), false);
  봄('🔴 그래도 «왜 그랬는지»는 코드에 남아 있다 (같은 곱을 또 넣지 않도록)', html.includes('duration*150'), true);
  봄('🔴 percent>=95 로 완주를 판정하던 자리가 없다', /percent\s*>=\s*95/.test(html), false);
  봄('🔴 저장된 completed 를 그대로 믿는 자리가 없다',
    /\bp\.completed\s*\?|\.completed\s*\?\s*100|!\(\(.*\|\|\{\}\)\.completed\)/.test(html), false);
  봄('🔴 저장된 percent 를 그대로 그리는 자리가 없다', /videoProgress\[[^\]]*\]\s*\|\|\s*\{\}\)\.percent/.test(html), false);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
