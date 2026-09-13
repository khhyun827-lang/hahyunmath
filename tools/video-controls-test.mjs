// 영상 조작줄 — 유튜브 조작줄을 안 띄우고 우리가 짓는다 (2026-09-13 · K-8)
//
//   node tools/video-controls-test.mjs
//
// 🔴 **왜 재는가** — 사용자 요청: 「영상 링크 복사하는 좌측하단 버튼 막아줄 수 있어?」
//   iframe 안은 구글 도메인이라 우리 JS 로 그 안을 못 만진다. 그래서 `controls=0` 으로
//   유튜브 조작줄을 **아예 안 띄우고**, 투명한 판으로 우클릭·끝 화면 클릭을 가로채고,
//   재생·탐색·배속·소리·전체화면을 우리가 짓는다.
//
// 이 검사는 두 겹이다:
//   ① **글자로** — 임베드 주소의 매개변수, 함수가 서로를 부르는 결.
//   ② **진짜 크롬으로** — `tools/video-controls-probe.html` 을 헤드리스로 굴려
//      단추를 실제로 누르고, **투명한 판이 정말 클릭을 가로채는지** elementFromPoint 로 본다.
//      🔵 판이 «있다»와 «막는다»는 다른 말이다. 크기가 0이거나 뒤에 깔리면 글자만 멀쩡하다.
//   ⚠ 크롬이 없으면 ②는 건너뛰되 **그렇다고 소리 내어 말한다**(조용히 통과시키지 않는다).

import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
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
let pass = 0, fail = 0, skip = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ═══ ① 임베드 주소 — 유튜브 조작줄이 아예 안 뜬다 ═══ */
console.log(NL + '① 임베드 주소 — 유튜브 UI 를 안 띄운다' + NL);
{
  const embed = lift('stuVideoHTML');
  /* 🔴 **매개변수는 «주소 문자열»에서만 찾는다.**
     함수 몸통 전체에 걸었더니 바로 위에 적어 둔 **까닭 주석**이 걸렸다 —
     `&controls=0` 을 지워도 검사가 멀쩡히 통과했다. 오늘 네 번째로 밟은 같은 함정이다.
     (K-6 에서는 닻이 다른 함수의 같은 줄을, K-7 에서는 주석의 ×150 을 물었다.) */
  const src = (embed.match(/const src = ([\s\S]*?);\n/) || [])[1] || '';
  봄('주소 문자열을 떠 왔다', src.includes('youtube-nocookie.com/embed/'), true);
  봄('🔴 주소에 주석이 안 섞였다', /[«»🔴⚠]/.test(src), false);
  const 매개 = ['enablejsapi=1', 'controls=0', 'disablekb=1', 'fs=0', 'playsinline=1', 'rel=0', 'cc_load_policy=0'];
  매개.forEach(p => 봄('주소에 ' + p, src.includes(p), true));
  봄('🔴 controls=0 — 제목 띠·공유·YouTube 로고·전체화면이 통째로 안 나온다', src.includes('controls=0'), true);
  봄('🔴 playsinline=1 — 없으면 iOS 가 네이티브 전체화면으로 띄워 유튜브 UI 가 도로 나온다',
    src.includes('playsinline=1'), true);
  봄('🔴 allowfullscreen 을 뗐다 — 전체화면은 우리 상자가 진다', embed.includes('allowfullscreen'), false);
  봄('투명한 판이 우클릭을 붙든다', embed.includes('oncontextmenu="return false;"'), true);
  봄('판을 누르면 재생/멈춤', /class="vc-veil"[^>]*onclick="vcVeilTap/.test(embed), true);
  봄('조작줄이 상자 안에 붙는다', embed.includes('videoControlsHTML(v.id)'), true);
  봄('전체화면이 잡을 상자에 id 가 있다', embed.includes('id="vshell-${v.id}"'), true);
  봄('진도 칸은 그대로 남는다', embed.includes('videoProgressBlockHTML(c.sid, v.id)'), true);
  /* 확대 · 자막 (2026-09-13 · K-10) */
  봄('🔴 자막을 안 켠다 — cc_load_policy=0', src.includes('cc_load_policy=0'), true);
  봄('🔴 주소만 믿지 않는다 — 준비되면 unloadModule 로 한 번 더 끈다',
    (lift('mountVideoTrackers').match(/unloadModule\('(captions|cc)'\)/g) || []).length >= 4, true);
  봄('🔴 모듈이 뒤늦게 실려도 다시 끈다 (onApiChange)', lift('mountVideoTrackers').includes('onApiChange:'), true);
  봄('확대되는 칸이 iframe 을 감싼다', /<div class="vc-zoom" id="vzoom-\$\{v\.id\}">[\s\S]*?<iframe/.test(embed), true);
  봄('판에 id 가 있다 (손짓을 매는 자리)', embed.includes('id="vveil-${v.id}"'), true);
  봄('붙일 때 손짓을 맨다', lift('mountVideoTrackers').includes('vzBindVeil(videoId)'), true);
}

/* ═══ ② 조작줄이 render() 를 안 부른다 ═══ */
console.log(NL + '② 조작줄은 제 칸만 고쳐 그린다 (render 는 재생을 끊는다)' + NL);
{
  const 것들 = ['vcToggle', 'vcNextRate', 'vcMute', 'vcFull', 'vcPaint', 'vcBindBar', 'videoControlsHTML',
    'vzApply', 'vzSet', 'vzReset', 'vzNext', 'vzBindVeil', 'vcVeilTap'];
  const 부르는것 = 것들.filter(n => /(^|[^a-zA-Z])render\(\)/.test(lift(n)));
  봄('🔴 어느 것도 render() 를 안 부른다 — 부르면 iframe 이 새로 생겨 재생이 처음으로 간다', 부르는것, []);
  봄('붙일 때 조작줄과 손짓을 맨다 (onReady)',
    /onReady: \(\) => \{[\s\S]{0,200}?vcBindBar\(videoId\); vzBindVeil\(videoId\); vcPaint\(videoId\);/.test(html), true);
  봄('뗄 때 조작줄 타이머를 거둔다', lift('mountVideoTrackers').includes('if(prev.ui) clearInterval(prev.ui);'), true);
  봄('상태가 바뀌면 바로 다시 그린다', lift('mountVideoTrackers').includes('vcPaint(videoId);'), true);
  봄('화면을 떠나면 스스로 거둔다', /if\(e && e\.ui\)\{ clearInterval\(e\.ui\); e\.ui = null; \}/.test(lift('vcPaint')), true);
  봄('같은 값이면 DOM 을 안 건드린다 — 안 그러면 그 단추를 누를 수가 없다',
    lift('vcPaint').includes('el.dataset.ic !== name') && lift('vcPaint').includes('el.textContent !== t'), true);
}

/* ═══ ③ 시간 적기 · 배속 차례 ═══ */
console.log(NL + '③ 시간과 배속' + NL);
{
  const V = new Function('const VC_RATES = [1, 1.25, 1.5, 2];' + NL + lift('vcTime') + NL + 'return { vcTime, VC_RATES };')();
  봄('0초', V.vcTime(0), '0:00');
  봄('한 자리 분은 한 자리로', V.vcTime(65), '1:05');
  봄('59:59', V.vcTime(3599), '59:59');
  봄('한 시간을 넘으면 시가 붙고 분은 두 자리', V.vcTime(3600), '1:00:00');
  봄('1:02:03', V.vcTime(3723), '1:02:03');
  봄('없는 값은 0:00', [V.vcTime(), V.vcTime(null), V.vcTime(-5)], ['0:00', '0:00', '0:00']);
  봄('배속은 넷', V.VC_RATES, [1, 1.25, 1.5, 2]);
}

/* ═══ ④ 진짜 크롬으로 굴린다 ═══ */
console.log(NL + '④ 헤드리스 크롬 — 단추를 실제로 누르고, 판이 클릭을 가로채는지 본다' + NL);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });

if (!CHROME) {
  skip++;
  console.log('  ⚠ 크롬을 못 찾았습니다 — ④를 건너뜁니다. **판이 실제로 막는지는 안 잰 것입니다.**');
} else {
  const PORT = 8791;
  const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'serve.js'), String(PORT)],
    { cwd: ROOT, stdio: 'ignore' });
  let R = null, 왜 = '';
  try {
    await new Promise(r => setTimeout(r, 700));
    /* ⚠ **가상 시간 예산을 넉넉히 준다.** 20초로 두었더니 **두 번에 한 번꼴로** RESULT 가 안 찍혔다 —
       가상 시간은 «자원을 받는 동안» 멈췄다가 가므로, index.html 과 딸린 것들을 받는 사이에
       예산이 바닥나면 프로브는 시작도 못 한 채 덤프된다. 겉으로는 「프로브가 못 돌았습니다」로만 보여서
       엉뚱하게 index.html 을 의심하게 된다. 60초면 찬찬히 끝난다(빠르면 그만큼 일찍 끝난다). */
    const out = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
      '--virtual-time-budget=60000', '--window-size=520,760', '--dump-dom',
      'http://127.0.0.1:' + PORT + '/tools/video-controls-probe.html'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 90000 });
    const m = out.match(/RESULT (\{[\s\S]*?\})<\/pre>/) || out.match(/RESULT (\{[\s\S]*\})/);
    if (!m) 왜 = 'RESULT 줄을 못 찾았습니다';
    else R = JSON.parse(m[1]);
  } catch (e) { 왜 = String(e.message || e).slice(0, 200); }
  finally { try { server.kill(); } catch (_) {} }

  if (!R || R.err) { fail++; console.log('  🔴 프로브가 못 돌았습니다 — ' + (왜 || R.err)); }
  else {
    /* 판이 «정말» 막는가 — 이 넷이 이 판 전체의 요점이다 */
    봄('영상 상자가 제 크기로 선다', R.wrapBox, [true, true]);
    봄('🔴 투명한 판이 상자를 꽉 덮는다', R.veilCoversWrap, [true, true]);
    봄('🔴 한가운데를 누르면 유튜브가 아니라 판이 받는다', R.centerHitsVeil, true);
    /* 🔴 유튜브 단추가 «실제로 서던» 네 자리 — 제목 링크 · 공유 · 조작줄 · YouTube 로고/전체화면. */
    봄('🔴 유튜브 단추 자리 넷을 다 판이 받는다', R.buttonZonesHitVeil, [true, true, true, true]);
    봄('🔴 위·아래 띠 전체가 덮였다', [R.edgeStripAllVeil, R.edgeStripCount > 20], [true, true]);
    /* ⚠ 둥근 모서리(9px)에서는 판도 영상도 안 닿는다 — 그것은 구멍이 아니다.
       처음에 «귀퉁이 6px» 로 재서 멀쩡한 것을 흠으로 읽을 뻔했다. 그러니 그 점은 이렇게 못 박아 둔다. */
    봄('둥근 모서리로는 영상에도 안 닿는다 (거기는 구멍이 아니다)', R.cornerReachesFrame, false);
    봄('🔴 우클릭(동영상 URL 복사)이 막힌다', R.contextBlocked, true);
    봄('그래도 영상 자체는 거기 있다', R.frameIsBehind, true);
    /* 조작줄이 진짜로 작동하는가 */
    봄('처음엔 «재생» 모양', R.icon0, 'playBare');
    봄('판을 누르면 재생된다 · 모양이 «멈춤»으로', [R.state1, R.icon1], [1, 'pause']);
    봄('단추를 누르면 멈춘다 · 모양이 «재생»으로', [R.state2, R.icon2], [2, 'playBare']);
    봄('막대가 손가락으로 짚을 만큼 넓고 두껍다 (보이는 선은 5px, 짚는 칸은 18px)', R.barBox, [true, true]);
    봄('막대의 75% 자리를 누르면 450초로 간다 (10분 영상)', R.seek75, 450);
    봄('칸도 75%까지 찬다', R.fill75, '75%');
    봄('시간이 적힌다 — 지나간 것과 전체', [R.curText, R.durText], ['7:30', '10:00']);
    봄('끌면 따라온다 (25% → 150초)', R.dragTo25, 150);
    봄('배속이 다음 것으로 돈다', R.rates, ['1.25x', '1.5x', '2x', '1x', '1.25x']);
    봄('소리 끄기·켜기', [R.mute0, R.mute1, R.muted1, R.mute2, R.muted2],
      ['sound', 'mute', true, 'sound', false]);
    /* 확대 (2026-09-13 · K-10) — 판이 손가락을 먼저 받으므로 확대는 우리가 진다 */
    봄('처음엔 확대가 안 걸려 있다', R.zoom0, '');
    봄('🔴 조작줄에 확대 숫자 단추가 없다 (배속 숫자와 헷갈린다 · K-11)', R.noZoomButton, true);
    봄('🔴 2배로 두면 칸이 실제로 커진다', R.zoomAt2, true);
    봄('확대 중이면 판이 손짓을 다 받는다', R.veilZoomedClass, true);
    /* 🔴 클래스가 붙었나가 아니라 브라우저가 실제로 무엇을 하기로 했나를 본다. */
    봄('🔴 평소에는 영상 위에서도 화면이 내려간다 (pan-y)', R.touchPlain, 'pan-y');
    봄('🔴 확대한 뒤에는 손짓을 우리가 다 받는다 (none)', R.touchZoomed, 'none');
    봄('🔴 확대한 뒤에는 끌어서 옮긴다', R.panned, [-50, -30]);
    봄('🔴 오른쪽·아래로는 안 샌다 (0 을 넘지 않는다)', R.panClampHigh, [0, 0]);
    봄('🔴 왼쪽·위로도 안 샌다 (2배면 딱 한 칸까지)', R.panClampLow, [true, true]);
    봄('🔴 옮긴 직후의 클릭은 삼킨다 — 안 그러면 확대할 때마다 영상이 멈춘다', R.tapSwallowedAfterGesture, true);
    봄('🔴 두 손가락으로 벌리면 커진다 (100px → 200px = 2배)', R.pinchScale, 2);
    봄('Ctrl+휠로도 커진다 · 화면 스크롤은 안 일어난다', [R.wheelZoomed, R.wheelPrevented], [true, true]);
    봄('🔴 그냥 휠은 안 건드린다 (화면 스크롤로 둔다)', R.plainWheelIgnored, true);
    봄('되돌리면 transform 을 아예 뗀다', R.zoomReset, ['', 1, false]);
    봄('1배 아래로도, 4배 위로도 안 간다', [R.zoomMin, R.zoomMax], [1, 4]);
    봄('🔴 플레이어가 아직 없어도 안 터진다 (준비 전 · 떠난 뒤)', R.safeWithoutPlayer, null);
    봄('🔴 화면을 떠나면 조작줄 타이머를 스스로 거둔다', R.uiTimerCleared, true);
  }
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개'
  + (skip ? ' · ⚠ ' + skip + '묶음 건너뜀' : '') + NL);
process.exit(fail ? 1 : 0);
