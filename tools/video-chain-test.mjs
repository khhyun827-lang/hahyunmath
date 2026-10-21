// 이어 보기 (2026-10-22 · 사용자 — 「한 개념을 한 번에 수업한 영상이 없을 때 두 영상에서 필요한 부분만 이어서 한 카드로」)
//
//   node tools/video-chain-test.mjs
//
// 링크 여럿을 «이어 보기»로 보내면 문서는 링크마다 하나(chain·part) — 학생 화면이 카드 하나로 묶고,
// 앞 구간이 끝나면 다음 구간으로 넘긴다(vcChainNext). 시청 기록은 구간마다 따로라 시청률은 그대로다.

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

/* 학생 강의 탭과 재생기 쪽을 한 판에 싣는다 — 재생기·저장은 가짜 */
function 판(videos, progress, stuVideoId){
  const 바깥 = {
    state: { stuVideoId, currentUser: { studentId: 's1' }, ytPlayers: {} },
    DATA: { videos },
    렌더: 0, 토스트: [], 부순것: [], 적은틱: [],
  };
  const 몸 = [
    lift('videoChainParts'), lift('vcChainNext'), lift('vcPref'), lift('stuVideoHTML'),
    lift('videoGoalLabelOf'), lift('secToClock'), lift('videoLocked'),
  ].join(NL);
  const f = new Function('바깥', `
    const state = 바깥.state, DATA = 바깥.DATA;
    const TAP = '';
    const todayStr = () => '2026-10-22';
    const markSeen = () => {};
    const escHtml = s => String(s == null ? '' : s);
    const iconSvg = () => '';
    const videoGoalMarkHTML = () => '';
    const stuDday = () => null;
    const videoCounted = v => !v.noTrack;
    const videoPct = p => (p && p.pct) || 0;
    const videoSeen = p => !!(p && p.pct);
    const videoDone = p => !!(p && p.pct >= 90);
    const videoEmbedHTML = v => '[재생기 ' + v.id + ']';
    const videoItemById = id => DATA.videos.find(v => v.id === id) || null;
    const render = () => { 바깥.렌더++; };
    const showToast = t => 바깥.토스트.push(t);
    const flushWatchTick = (e, sid, vid) => 바깥.적은틱.push(vid);
    ${몸}
    return { stuVideoHTML, vcChainNext, videoChainParts, vcPref };
  `);
  const 함수 = f(바깥);
  const c = { sid: 's1', rec: { videoProgress: progress }, videos: videos, videosAll: videos };
  return { 바깥, 함수, 그림: () => 함수.stuVideoHTML(c) };
}

const 묶음 = [
  { id: 'v2', title: '함수 개념 (2)', chainTitle: '함수 개념', chain: 'c1', part: 1, url: 'B', fromSec: 180, toSec: 540, studentId: 's1' },
  { id: 'v1', title: '함수 개념 (1)', chainTitle: '함수 개념', chain: 'c1', part: 0, url: 'A', fromSec: 750, toSec: 1080, studentId: 's1' },
  { id: 'v3', title: '따로 영상', url: 'C' },
];

console.log(NL + '① 학생 강의 탭 — 묶음은 카드 하나' + NL);
{
  const { 그림 } = 판(묶음, {}, null);
  const h = 그림();
  봄('카드 수 = 묶음 1 + 따로 1', (h.match(/class="mc /g) || []).length, 2);
  봄('🔴 «전체 강의» 수도 카드 수로', h.includes('전체 강의 <span class="mono">2<'), true);
  봄('묶음 카드 제목은 묶음 이름', h.includes('>함수 개념</span>'), true);
  봄('구간 제목 «(1)»은 카드에 안 선다', h.includes('함수 개념 (1)'), false);
  봄('«이어서 봅니다» 안내', h.includes('영상 2개의 필요한 부분을 <b>이어서</b>'), true);
  봄('🔴 닫힌 카드를 누르면 첫 구간(part 0)부터', h.includes(`state.stuVideoId='v1'; render()`), true);
}
{
  const { 그림 } = 판(묶음, { v1: { pct: 100 } }, null);
  봄('첫 구간을 다 봤으면 누를 때 둘째 구간부터', 그림().includes(`state.stuVideoId='v2'; render()`), true);
}
{
  const { 그림 } = 판(묶음, { v1: { pct: 100 }, v2: { pct: 40 } }, null);
  봄('진도는 구간들의 평균 (100+40)/2 = 70%', 그림().includes('70%'), true);
}
{
  const { 그림 } = 판(묶음, {}, 'v2');
  const h = 그림();
  봄('열면 둘째 구간 재생기 하나만', [h.includes('[재생기 v2]'), h.includes('[재생기 v1]')], [true, false]);
  봄('구간 고르개 단추 둘 (1 · 12:30~18:00 / 2 · 3:00~9:00)', [h.includes('12:30 ~ 18:00'), h.includes('3:00 ~ 9:00')], [true, true]);
  봄('열린 카드는 하나뿐(go)', (h.match(/class="mc go"/g) || []).length, 1);
}

console.log(NL + '② 구간 끝 → 다음 구간' + NL);
{
  const { 바깥, 함수 } = 판(묶음, {}, 'v1');
  let 부숨 = 0;
  바깥.state.ytPlayers.v1 = { timer: null, ui: null, player: { destroy(){ 부숨++; } } };
  함수.vcPref('v1').rate = 1.5;
  봄('넘겼다', 함수.vcChainNext('v1'), true);
  봄('열린 것이 둘째 구간', 바깥.state.stuVideoId, 'v2');
  봄('🔴 둘째 구간은 바로 튼다(vcAutoplay)', 바깥.state.vcAutoplay, 'v2');
  봄('🔴 옛 플레이어: 틱을 적고 · 부수고 · 지운다', [바깥.적은틱, 부숨, 'v1' in 바깥.state.ytPlayers], [['v1'], 1, false]);
  봄('배속을 물려준다', 함수.vcPref('v2').rate, 1.5);
  봄('다시 그렸다', 바깥.렌더, 1);
  봄('마지막 구간에선 안 넘긴다(멈추고 「여기까지」)', 함수.vcChainNext('v2'), false);
}
{
  const { 바깥, 함수 } = 판(묶음, {}, null);
  봄('🔴 학생 강의 탭에 열린 영상이 아니면 손대지 않는다(질문 카드·강사 화면)', 함수.vcChainNext('v1'), false);
  봄('따로 영상은 넘길 데가 없다', (바깥.state.stuVideoId = 'v3', 함수.vcChainNext('v3')), false);
}
{
  const 남 = 묶음.concat([{ id: 'v9', chain: 'c1', part: 1, studentId: 's2', url: 'B' }]);
  const { 함수 } = 판(남, {}, null);
  봄('🔴 같은 묶음을 받은 다른 학생 것은 안 섞인다', 함수.videoChainParts(남[1]).map(v => v.id), ['v1', 'v2']);
}

console.log(NL + '③ 이어 줄 자리' + NL);
{
  const 등록 = lift('addVideo');
  봄('등록이 chain·part·chainTitle 을 단다', /chain: 'c' \+ 도장, part: i, chainTitle: title/.test(등록), true);
  봄('링크가 하나면 안 묶는다', /줄들\.length > 1 && /.test(등록), true);
  봄('폼에 «이어 보기» 상자(기본 켜짐)', html.includes('id="video-chain" checked'), true);
  봄('vcPaint 가 구간 끝에서 넘긴다', /cur >= g\.to && vcChainNext\(vid\)/.test(lift('vcPaint')), true);
  const 틱 = lift('mountVideoTrackers');
  봄('5초 틱은 넘길 데가 없을 때만 멈춘다', 틱.includes('자리.뒤 >= 구간.to && !vcChainNext(videoId)'), true);
  봄('끝까지 구간은 영상이 끝나면 넘긴다', 틱.includes('ENDED && vcChainNext(videoId)'), true);
  봄('넘어온 구간을 튼다', 틱.includes('state.vcAutoplay === videoId'), true);
}

console.log(NL + (fail ? `🔴 ${fail}개 실패 · ${pass + fail}개` : `✓ 전부 통과 · ${pass}개`));
process.exit(fail ? 1 : 0);
