// 영상 — 배속과 보던 자리가 «다시 서도» 살아남는가 (2026-09-23 · V-3)
//
//   node tools/video-rate-keep-test.mjs
//
// 🔴 **사용자 신고** — 「학생들이 영상볼때 정지했다가 다시재생하면 배속설정해둔게 바뀐다」.
//   뿌리는 배속이 아니었다: `render()` 한 번이면 `mountVideoTrackers` 가 옛 플레이어를 destroy 하고
//   **새 iframe 에 새 플레이어**를 세운다 — 새 플레이어는 배속 1x · 자리 0 이다.
//   멈추면 `flushWatchTick` → 저장이 막히면 `warnDbBlocked` → `showToast` → **`render()`** 로 이어졌다.
//   (tools/yt-rate-probe.html 이 「유튜브 자체는 멈췄다 켜도 배속을 지킨다」를 브라우저에서 보였다 —
//    그러니 푸는 쪽은 우리였다.)
//
// 그래서 셋을 잰다:
//   ① 토스트가 더는 `render()` 를 안 부른다 (제 칸 `#app-toast` 만 고쳐 그린다)
//   ② 배속 단추를 누르면 그 값이 «기억»에 남고, 다시 선 플레이어에 도로 걸린다
//   ③ 보던 자리도 도로 돌아간다 — 다만 구간 배정의 «밖»이면 안 돌아간다
//
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

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
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ═══ ① 토스트가 화면을 통째로 다시 그리지 않는다 ═══ */
console.log(NL + '① 말 한마디 때문에 영상이 죽지 않는다' + NL);
{
  const 토스트 = lift('showToast');
  봄('🔴 showToast 가 render() 를 안 부른다 (이것이 영상을 죽이던 길이다)', /\brender\(\)/.test(토스트), false);
  봄('   대신 제 칸만 고쳐 그린다', (토스트.match(/toastPaint\(\)/g) || []).length, 2);
  const 그리기 = lift('toastPaint');
  봄('🔴 토스트 칸은 `.app` «밖»에 산다 — innerHTML 갈이를 안 탄다',
    그리기.includes("document.body.appendChild(el)") && 그리기.includes("id = 'app-toast'"), true);
  봄('   말이 없으면 칸을 거둔다', 그리기.includes('el.remove()'), true);
  봄('   `.app` 클래스를 입힌다 (안 입히면 서식이 안 닿는다 — 드로어 층과 같은 까닭)',
    그리기.includes("el.className = 'app'"), true);
  /* 🪤 render() 가 토스트를 «또» 그리면 두 개가 겹친다 */
  봄('🔴 render() 는 토스트를 더 안 그린다', /html \+= `<div style="position:fixed;bottom:24px/.test(html), false);

  /* 돌려 본다 — 말을 띄우고 지우는 동안 render 가 한 번도 안 불린다 */
  let render횟수 = 0, 그린것 = [];
  const st = {};
  const T = new Function('state', 'setTimeout', 'render', 'toastPaint',
    lift('showToast') + NL + 'return showToast;')(
    st, (f) => f(), () => { render횟수++; }, () => { 그린것.push(st.toast); });
  T('안녕');
  봄('🔴 돌려 봐도 render 는 0 번', render횟수, 0);
  봄('   띄울 때와 지울 때 두 번 그린다', 그린것, ['안녕', '']);
}

/* ═══ ② 배속 — 단추가 기억에 적고, 다시 선 플레이어에 도로 걸린다 ═══ */
console.log(NL + '② 배속이 살아남는다' + NL);
{
  const 상태 = {};
  const 판 = (지금배속) => {
    const 걸린것 = [];
    const p = { getPlaybackRate: () => 지금배속, setPlaybackRate: (r) => { 지금배속 = r; 걸린것.push(r); } };
    const F = new Function('state', 'vcPaint',
      'const VC_RATES = [1, 1.25, 1.5, 2];' + NL + lift('vcPref') + NL + lift('vcPlayer') + NL +
      lift('vcAsk') + NL + lift('vcNextRate') + NL + 'return { vcNextRate, vcPref };')(상태, () => {});
    상태.ytPlayers = { v1: { player: p } };
    return { F, 걸린것, 지금: () => 지금배속 };
  };
  const a = 판(1);
  a.F.vcNextRate('v1');
  봄('단추 한 번 — 1 다음은 1.25', a.걸린것, [1.25]);
  봄('🔴 그 값이 «기억»에 남는다 (플레이어가 죽어도 이건 안 죽는다)', 상태.videoPrefs.v1.rate, 1.25);
  a.F.vcNextRate('v1'); a.F.vcNextRate('v1');
  봄('   돌고 돈다 — 1.25 → 1.5 → 2', 상태.videoPrefs.v1.rate, 2);
  a.F.vcNextRate('v1');
  봄('   2 다음은 1 로 돌아온다', 상태.videoPrefs.v1.rate, 1);

  /* 다시 선 플레이어 — 배속이 1 인데 기억은 2 다. 재생이 시작되면 도로 걸려야 한다. */
  const 몸 = lift('mountVideoTrackers');
  봄('🔴 재생이 시작될 때 «정해 둔 배속»과 견준다',
    /const 정한배속 = vcPref\(videoId\)\.rate;[\s\S]{0,220}?setPlaybackRate\(정한배속\)/.test(몸), true);
  봄('🔴 다시 선 플레이어(onReady)에도 도로 건다',
    /if\(기억\.rate\)\{ try\{ player\.setPlaybackRate\(기억\.rate\); \}catch/.test(몸), true);
  봄('   정해 둔 적이 없으면 손대지 않는다 (유튜브·기기 기본값을 존중)',
    /if\(정한배속 && Math\.abs\(/.test(몸), true);
}

/* ═══ ③ 보던 자리 ═══ */
console.log(NL + '③ 보던 자리로 돌아온다 — 구간 밖이면 안 돌아간다' + NL);
{
  const 상태 = {};
  const P = new Function('state', lift('vcPref') + NL + 'return vcPref;')(상태);
  P('v1').pos = 42;
  봄('기억에 자리가 적힌다', 상태.videoPrefs.v1.pos, 42);
  const 몸 = lift('mountVideoTrackers');
  봄('🔴 vcPaint 가 0.25초마다 자리를 적어 둔다',
    lift('vcPaint').includes('if(cur > 0) vcPref(vid).pos = cur;'), true);
  봄('🔴 되돌리는 잣대가 셋이다 — 0 이 아니고 · 끝자락이 아니고 · 구간 안이다',
    [/기억\.pos > 1/.test(몸), /기억\.pos < 길이 - 2/.test(몸), /기억\.pos >= 구간\.from/.test(몸)], [true, true, true]);

  /* 잣대를 실제로 돌려 본다 — 주석이 아니라 «식»이 맞는지 */
  const 판단 = new Function('기억', '길이', '구간',
    'return !!(' + (몸.match(/const 안쪽 = ([\s\S]*?);\n/) || [])[1] + ');');
  봄('한가운데면 되돌린다', 판단({pos: 300}, 1200, null), true);
  봄('🔴 아직 시작도 안 했으면(0초) 안 건드린다', 판단({pos: 0}, 1200, null), false);
  봄('🔴 끝자락이면 안 되돌린다 — 다 본 영상이 열리자마자 끝으로 가면 안 된다', 판단({pos: 1199}, 1200, null), false);
  const 구간 = { from: 750, to: 1080, 끝까지: false };
  봄('구간 안이면 되돌린다', 판단({pos: 900}, 1200, 구간), true);
  봄('🔴 구간 앞이면 안 되돌린다 (구간 시작으로 간 것을 무르면 안 된다)', 판단({pos: 100}, 1200, 구간), false);
  봄('🔴 구간 뒤도 안 되돌린다', 판단({pos: 1100}, 1200, 구간), false);
  봄('「…부터 끝까지」면 뒤쪽 잣대가 없다', 판단({pos: 1100}, 1200, { from: 120, to: 0, 끝까지: true }), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
