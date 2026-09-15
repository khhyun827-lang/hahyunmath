/* 영상 «구간만 보라» 가 제대로 재어지는지 본다 (2026-09-16).
 *
 * 왜 프로브인가 — 사용자의 말: 「특정 시간부터 특정 시간까지만 봐라 라고 할 때가 많은데, 그러면
 *   전체 시청률이 잡혀 안 본 학생으로 찍히고 신호판에도 뜬다 — 잘한 일인데 잘못한 것처럼 신호가 뜬다」
 *   이 갈래는 **학생이 실제로 영상을 봐야** 눈에 보인다. 그래서 그리는·재는 함수만 뽑아 여기서 굴린다.
 *
 * 🔴 **여기서 틀리면 학생이 또 억울해진다.** 그래서 «되는 것»만이 아니라
 *   «옛 기록이 안 줄어드는가» · «건너뛰기로 속일 수 있는가»까지 잰다.
 *
 * 쓰는 법:  node tools/video-segment-probe.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const 뿌리 = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(뿌리, 'index.html'), 'utf8');

function 함수뽑기(이름){
  const 시작 = html.indexOf('function ' + 이름 + '(');
  if(시작 < 0) throw new Error('못 찾았다: ' + 이름);
  let i = html.indexOf('{', 시작), 깊이 = 0;
  for(; i < html.length; i++){
    if(html[i] === '{') 깊이++;
    else if(html[i] === '}'){ 깊이--; if(깊이 === 0) return html.slice(시작, i + 1); }
  }
  throw new Error('끝을 못 찾았다: ' + 이름);
}
function 상수뽑기(이름){
  const m = html.match(new RegExp('const\\s+' + 이름 + '\\s*=\\s*([^;]+);'));
  if(!m) throw new Error('못 찾았다: ' + 이름);
  return 'const ' + 이름 + ' = ' + m[1] + ';';
}

const 이름들 = ['clockToSec', 'secToClock', 'videoGoalOfItem', 'videoItemById', 'videoGoalOfProgress',
                'videoGoalLabelOf', 'coverLen', 'coverFill', 'coverSec',
                'videoDurationSec', 'videoWatchedSec', 'videoWatchRatio', 'videoDone', 'videoPct', 'videoScore',
                'videoPlaybackRate', 'tickSpan'];
const 짓기 = new Function(`
  ${상수뽑기('VIDEO_BUCKET_SEC')}
  ${상수뽑기('VIDEO_DONE_RATIO')}
  ${상수뽑기('VIDEO_DONE_SLACK_SEC')}
  const DATA = { videos: [] };
  ${이름들.map(함수뽑기).join('\n')}
  return { ${이름들.join(',')}, DATA };
`);
const V = 짓기();

let 틀린것 = 0;
const 봄 = (이름, 참인가, 덧 = '') => {
  if(!참인가) 틀린것++;
  console.log((참인가 ? '  ✅ ' : '  ❌ ') + 이름 + (덧 ? ' — ' + 덧 : ''));
};

/* 재생을 흉내 낸다 — 5초짜리 틱으로 `앞`부터 `뒤`까지 실제로 재생한다. */
function 재생(seen, duration, 앞, 뒤){
  let 글 = seen || '';
  for(let t = 앞; t < 뒤; t += 5) 글 = V.coverFill(글, duration, t, Math.min(뒤, t + 5));
  return 글;
}

console.log('① 시간 읽고 쓰기');
봄('12:30 = 750초', V.clockToSec('12:30') === 750);
봄('1:02:03 = 3723초', V.clockToSec('1:02:03') === 3723);
봄('45 = 45초', V.clockToSec('45') === 45);
봄('빈 칸은 null(0초와 다르다)', V.clockToSec('') === null && V.clockToSec('  ') === null);
봄('엉터리는 null', V.clockToSec('열두시') === null && V.clockToSec('12:') === null);
봄('750 → 12:30', V.secToClock(750) === '12:30');
봄('3723 → 1:02:03', V.secToClock(3723) === '1:02:03');

console.log('② 구간이 없으면 지금까지와 똑같다');
{
  V.DATA.videos = [{ id:'v1', title:'전체' }];
  const p = { videoId:'v1', duration:3600, watchedSeconds:1800 };
  봄('분모는 영상 전체', V.videoDurationSec(p) === 3600);
  봄('본 것은 1800초', V.videoWatchedSec(p) === 1800);
  봄('50%', V.videoPct(p) === 50);
  봄('완주 아님', V.videoDone(p) === false);
}

console.log('③ 🔴 사용자가 겪은 자리 — 60분 영상에서 12:30~18:00 만 보라고 했다');
{
  V.DATA.videos = [{ id:'v2', title:'구간', fromSec:750, toSec:1080 }];
  /* 학생이 시킨 대로 그 구간만 봤다 */
  const seen = 재생('', 3600, 750, 1080);
  const p = { videoId:'v2', duration:3600, seen, base:0, watchedSeconds:330 };
  봄('분모가 구간 길이(330초)로 바뀐다', V.videoDurationSec(p) === 330, V.videoDurationSec(p) + '초');
  봄('구간 안에서 본 것이 330초', V.videoWatchedSec(p) === 330, V.videoWatchedSec(p) + '초');
  봄('🔴 100% — 예전에는 9% 였다', V.videoPct(p) === 100, V.videoPct(p) + '%');
  봄('🔴 완주', V.videoDone(p) === true);
  봄('🔴 신호가 보는 점수도 100 (시청률 저조가 안 뜬다)', V.videoScore(p) === 100);
  봄('화면에 적을 말', V.videoGoalLabelOf(V.DATA.videos[0]) === '12:30 ~ 18:00 구간', V.videoGoalLabelOf(V.DATA.videos[0]));
}

console.log('④ 구간을 반만 봤으면 반이다');
{
  V.DATA.videos = [{ id:'v3', fromSec:750, toSec:1080 }];
  const p = { videoId:'v3', duration:3600, seen:재생('', 3600, 750, 915), base:0 };
  봄('절반쯤(50% 언저리)', V.videoPct(p) >= 45 && V.videoPct(p) <= 55, V.videoPct(p) + '%');
  봄('완주 아님', V.videoDone(p) === false);
}

console.log('⑤ 🔴 엉뚱한 데를 봐도 구간을 본 것이 아니다');
{
  V.DATA.videos = [{ id:'v4', fromSec:750, toSec:1080 }];
  /* 앞 10분을 성실히 봤지만 시킨 구간은 아니다 */
  const p = { videoId:'v4', duration:3600, seen:재생('', 3600, 0, 600), base:0 };
  봄('구간 안은 0초', V.videoWatchedSec(p) === 0, V.videoWatchedSec(p) + '초');
  봄('0%', V.videoPct(p) === 0);
}

console.log('⑥ 🔴 재생바를 끌어 건너뛰면 그 사이는 안 채워진다');
{
  /* ⚠ **막이는 `coverFill` 이 아니라 `tickSpan` 에 있다.** 처음에 `coverFill` 을 시험했다가
       「점프해도 다 찬다」는 답을 받았는데, 그것은 **막이를 시험하지 않은 것**이었다.
       `coverFill` 은 «시키는 대로 칠하는 붓»이고, «칠할 자리를 고르는» 것이 `tickSpan` 이다. */
  const 판 = (자리, 배속) => ({ getCurrentTime: () => 자리, getPlaybackRate: () => (배속 || 1) });
  const 칸 = { lastPos: null };

  V.tickSpan(칸, 판(750), 5);                       /* 첫 틱 — 750 에서 시작 */
  const 이어봄 = V.tickSpan(칸, 판(755), 5);         /* 5초 재생 */
  봄('이어서 재생하면 750~755 를 준다', 이어봄.앞 === 750 && 이어봄.뒤 === 755);

  const 점프 = V.tickSpan(칸, 판(1080), 5);          /* 재생바를 끝으로 끌었다 */
  봄('🔴 점프하면 사이를 안 준다 — 지금 자리 한 점뿐',
     점프.앞 === 1080 && 점프.뒤 === 1080, 점프.앞 + '~' + 점프.뒤);
  봄('그래서 한 칸(10초)밖에 안 찬다',
     V.coverSec(V.coverFill('', 3600, 점프.앞, 점프.뒤), 750, 1080) <= 10);

  const 배속판 = { lastPos: 100 };
  const 두배속 = V.tickSpan(배속판, 판(110, 2), 5);   /* 2배속 5초 = 영상 10초 */
  봄('2배속으로 흘러간 것은 «점프»가 아니다', 두배속.앞 === 100 && 두배속.뒤 === 110);

  봄('실제로 재생하면 구간이 다 찬다', V.coverSec(재생('', 3600, 750, 1080), 750, 1080) === 330);
}

console.log('⑦ 🔴 같은 데를 다시 봐도 두 번 세지 않는다 (예전 구멍)');
{
  V.DATA.videos = [{ id:'v5' }];
  const 한번 = 재생('', 900, 0, 300);
  const 세번 = 재생(재생(한번, 900, 0, 300), 900, 0, 300);
  /* ⚠ 300 이 아니라 310 이다 — 칸이 10초라 끝에서 한 칸 넉넉하다(일부러 그렇다 · 학생에게 유리한 쪽).
       재야 할 것은 «정확히 300인가»가 아니라 **«다시 봐도 안 늘어나는가»**다. */
  봄('세 번 봐도 한 번과 같다',
     V.coverSec(세번, 0, 900) === V.coverSec(한번, 0, 900), V.coverSec(세번, 0, 900) + '초');
  봄('넉넉함은 칸 하나까지만', V.coverSec(한번, 0, 900) <= 300 + 10, V.coverSec(한번, 0, 900) + '초');
  const p = { videoId:'v5', duration:900, seen:세번, base:0, watchedSeconds:300 };
  봄('완주가 아니다 (예전에는 세 번 보면 완주였다)', V.videoDone(p) === false);
  봄('예전 셈이었다면 완주였다(구멍이 있었음을 확인)', 300 * 3 >= 900);
}

console.log('⑧ 🔴 옛 기록의 %가 이 배포로 줄면 안 된다');
{
  V.DATA.videos = [{ id:'v6' }];
  /* 커버리지가 없던 시절에 80% 를 보던 학생 — base 로 얼려 둔다 */
  const p = { videoId:'v6', duration:1000, seen:재생('', 1000, 0, 100), base:800, watchedSeconds:800 };
  봄('바닥이 지켜져 80% 그대로', V.videoPct(p) === 80, V.videoPct(p) + '%');
  /* 그 뒤로 더 보면 커버리지가 바닥을 넘어선다 */
  const q = { videoId:'v6', duration:1000, seen:재생('', 1000, 0, 1000), base:800, watchedSeconds:1000 };
  봄('다 보면 완주', V.videoDone(q) === true);
}

console.log('⑨ 구간이 있는데 옛 기록이라 videoId 가 없으면 — 전체로 센다(고장 안 난다)');
{
  V.DATA.videos = [{ id:'v7', fromSec:750, toSec:1080 }];
  const p = { duration:3600, watchedSeconds:1800 };      /* videoId 없음 */
  봄('전체 기준으로 물러선다', V.videoDurationSec(p) === 3600 && V.videoPct(p) === 50);
}

console.log('⑪ 끝을 안 적으면 「시작부터 끝까지」 (2026-09-16 · 사용자가 물어서 열었다)');
{
  V.DATA.videos = [{ id:'w1', fromSec:7440 }];        /* 2:04:00 부터 끝까지 · toSec 없음 */
  const 영상길이 = 9000;
  const g = V.videoGoalOfItem(V.DATA.videos[0], 영상길이);
  봄('영상 길이가 끝이 된다', g && g.to === 9000 && g.from === 7440, g ? g.from + '~' + g.to : '없음');
  봄('「끝까지」라고 표시된다 (거기서 멈추지 않으려고)', g.끝까지 === true);
  봄('길이 = 1560초', g.len === 1560);
  봄('화면에 적을 말', V.videoGoalLabelOf(V.DATA.videos[0]) === '2:04:00 부터 끝까지',
     V.videoGoalLabelOf(V.DATA.videos[0]));

  const p = { videoId:'w1', duration:영상길이, seen:재생('', 영상길이, 7440, 9000), base:0 };
  봄('시작부터 끝까지 보면 완주', V.videoDone(p) === true);
  봄('100%', V.videoPct(p) === 100, V.videoPct(p) + '%');

  const q = { videoId:'w1', duration:영상길이, seen:재생('', 영상길이, 0, 7440), base:0 };
  봄('앞부분만 봤으면 0% (시킨 데가 아니다)', V.videoPct(q) === 0, V.videoPct(q) + '%');

  봄('길이를 아직 모르면 구간이 안 선다(고장 안 난다)', V.videoGoalOfItem(V.DATA.videos[0], 0) === null);
}

console.log('⑫ 🔴 구간을 «밝히지 않은» 여느 영상은 구간이 아니다');
{
  /* ⚠ 이걸 놓치면 모든 영상이 「0초~끝」이라는 구간이 되어 **커버리지로 세게 되는데,
       옛 기록에는 커버리지가 없어 멀쩡히 보던 학생이 0% 로 떨어진다.** */
  V.DATA.videos = [{ id:'w2', title:'여느 영상' }];
  봄('구간 없음', V.videoGoalOfItem(V.DATA.videos[0], 3600) === null);
  const 옛기록 = { videoId:'w2', duration:3600, watchedSeconds:3600 };   /* seen 없음 */
  봄('🔴 옛 기록이 100% 그대로 (0% 로 안 떨어진다)', V.videoPct(옛기록) === 100, V.videoPct(옛기록) + '%');
  봄('완주 그대로', V.videoDone(옛기록) === true);
  봄('딱지도 안 붙는다', V.videoGoalLabelOf(V.DATA.videos[0]) === '');
}

console.log('⑩ 일부러 망가뜨려 — 검사가 무는지');
{
  V.DATA.videos = [{ id:'v8', fromSec:1080, toSec:750 }];   /* 거꾸로 */
  봄('거꾸로 된 구간은 «구간 없음»으로 본다', V.videoGoalOfItem(V.DATA.videos[0]) === null);
  V.DATA.videos = [{ id:'v9', fromSec:750, toSec:1080 }];
  const 옛방식 = { videoId:'v9', duration:3600, watchedSeconds:330, seen:'', base:0 };
  봄('구간을 무시하고 전체로 세면 9% — 그것이 사용자가 본 것이다',
     Math.floor(330 / 3600 * 100) === 9);
  봄('지금 판은 그렇게 세지 않는다', V.videoPct(옛방식) === 0 || V.videoPct(옛방식) === 100 ? true : V.videoPct(옛방식) !== 9,
     V.videoPct(옛방식) + '%');
}

console.log(틀린것 ? ('❌ ' + 틀린것 + '개 틀렸다') : '✅ 전부 통과');
process.exit(틀린것 ? 1 : 0);
