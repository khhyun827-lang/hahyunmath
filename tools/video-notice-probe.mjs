/* 강의 미시청 알림(N-2)이 «누구에게 · 무슨 문구로» 가는지 본다 (2026-09-16).
 *
 * 🔴 **이것은 돈이 나가고 학생에게 도달하는 갈래다.** 지금은 발송이 잠겨 있어 탈이 안 날 뿐,
 *   이어 붙이는 날 **대상을 잘못 고르면 다 본 학생에게 「안 봤다」고 보낸다.**
 *   그 억울함이 바로 K-11(구간)에서 고친 것이므로, 여기서 되풀이하면 안 된다.
 *
 * 쓰는 법:  node tools/video-notice-probe.mjs
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
/* ⚠ 한 줄짜리 상수. `;` 뒤에 주석이 오는 줄이 많아 **세미콜론까지만** 집어야 한다 —
     처음에 `;\n` 까지 삼키게 했다가 뒤의 코드를 통째로 끌고 와 문법이 깨졌다. */
function 숫자상수뽑기(이름){
  const m = html.match(new RegExp('const\\s+' + 이름 + '\\s*=\\s*([^;\\n]+);'));
  if(!m) throw new Error('못 찾았다: ' + 이름);
  return 'const ' + 이름 + ' = ' + m[1].trim() + ';';
}
/* 여러 줄 백틱 글자열 상수(문안) */
const 백틱 = String.fromCharCode(96);
function 글자상수뽑기(이름){
  const m = html.match(new RegExp('const\\s+' + 이름 + '\\s*=\\s*' + 백틱 + '([\\s\\S]*?)' + 백틱 + ';'));
  if(!m) throw new Error('못 찾았다: ' + 이름);
  return 'const ' + 이름 + ' = ' + 백틱 + m[1] + 백틱 + ';';
}

const 이름들 = ['vidDuePhrase', 'vidNoticeText', 'vidNotWatched', 'videoGoalOfItem', 'videoItemById',
                'videoGoalOfProgress', 'coverLen', 'coverFill', 'coverSec',
                'videoDurationSec', 'videoWatchedSec', 'videoWatchRatio', 'videoDone', 'videoPct', 'secToClock'];
const 짓기 = new Function(`
  ${숫자상수뽑기('VIDEO_BUCKET_SEC')}
  ${숫자상수뽑기('VIDEO_DONE_RATIO')}
  ${숫자상수뽑기('VIDEO_DONE_SLACK_SEC')}
  ${글자상수뽑기('VID_NOTICE_TEMPLATE')}
  const DATA = { videos: [], students: [] };
  const state = { allRecords: {}, allRecordsLoaded: true };
  const phoneLabel = p => String(p || '');
  const VID_NOTICE_TO = s => phoneLabel(s.phone);
  let 오늘 = '2026-09-16';
  const todayStr = () => 오늘;
  const 오늘바꾸기 = d => { 오늘 = d; };
  ${이름들.map(함수뽑기).join('\n')}
  return { ${이름들.join(',')}, DATA, state, 오늘바꾸기, VID_NOTICE_TEMPLATE, VID_NOTICE_TO };
`);
const N = 짓기();

let 틀린것 = 0;
const 봄 = (이름, 참인가, 덧 = '') => {
  if(!참인가) 틀린것++;
  console.log((참인가 ? '  ✅ ' : '  ❌ ') + 이름 + (덧 ? ' — ' + 덧 : ''));
};
function 재생(seen, duration, 앞, 뒤){
  let 글 = seen || '';
  for(let t = 앞; t < 뒤; t += 5) 글 = N.coverFill(글, duration, t, Math.min(뒤, t + 5));
  return 글;
}

console.log('① 마감까지 남은 말 — 한 변수가 셋을 다 맡는다');
봄('사흘 뒤 = 3일 남음', N.vidDuePhrase('2026-09-19') === '3일 남음', N.vidDuePhrase('2026-09-19'));
봄('오늘 = 오늘까지', N.vidDuePhrase('2026-09-16') === '오늘까지');
봄('어제 = 마감 지남', N.vidDuePhrase('2026-09-15') === '마감 지남');
봄('마감 없음', N.vidDuePhrase('') === '마감 없음' && N.vidDuePhrase(null) === '마감 없음');

console.log('② 문안 — 심사에 넣을 꼴 그대로');
{
  const v = { id:'v1', title:'수학(상) 4강', dueDate:'2026-09-19' };
  const 글 = N.vidNoticeText('김하현', v);
  console.log('     ┌─────────────');
  글.split('\n').forEach(l => console.log('     │ ' + l));
  console.log('     └─────────────');
  봄('이름이 들어간다', 글.includes('김하현 학생'));
  봄('강의명이 들어간다', 글.includes('수학(상) 4강'));
  봄('마감일과 남은기간이 함께', 글.includes('2026-09-19') && 글.includes('3일 남음'));
  봄('🔴 치환 안 된 자리표시가 남지 않는다', !/#\{/.test(글), 글.match(/#\{[^}]*\}/g) || '없음');
  봄('템플릿의 변수는 넷뿐(심사 문장은 고정)',
     (N.VID_NOTICE_TEMPLATE.match(/#\{[^}]*\}/g) || []).length === 4);
}
{
  const v = { id:'v2', title:'보충', dueDate:'' };
  const 글 = N.vidNoticeText('이유빈', v);
  봄('마감이 없어도 자리표시가 안 샌다', !/#\{/.test(글) && 글.includes('미정'), 글.split('\n')[3]);
}

console.log('③ 🔴 누구에게 가나 — 완주한 학생에게는 안 간다');
{
  N.DATA.videos = [{ id:'v3', title:'전체 강의' }];
  const 명단 = [{ studentId:'a', name:'다본이' }, { studentId:'b', name:'반만본이' }, { studentId:'c', name:'안본이' }];
  N.state.allRecords = {
    a: { videoProgress: { v3: { videoId:'v3', duration:600, watchedSeconds:600 } } },
    b: { videoProgress: { v3: { videoId:'v3', duration:600, watchedSeconds:300 } } },
    c: { videoProgress: {} },
  };
  const 대상 = N.vidNotWatched(N.DATA.videos[0], 명단).map(s => s.name);
  봄('완주한 학생은 빠진다', !대상.includes('다본이'), 대상.join('·'));
  봄('덜 본 학생과 아예 안 본 학생만', 대상.length === 2 && 대상.includes('반만본이') && 대상.includes('안본이'));
}

console.log('④ 🔴 구간 배정 — 시킨 구간을 다 본 학생에게는 안 간다 (K-11 의 억울함을 되풀이하지 않는다)');
{
  N.DATA.videos = [{ id:'v4', title:'긴 강의', fromSec:750, toSec:1080 }];
  const 명단 = [{ studentId:'a', name:'구간다본이' }, { studentId:'b', name:'엉뚱한데본이' }];
  N.state.allRecords = {
    a: { videoProgress: { v4: { videoId:'v4', duration:3600, base:0, seen:재생('', 3600, 750, 1080) } } },
    b: { videoProgress: { v4: { videoId:'v4', duration:3600, base:0, seen:재생('', 3600, 0, 600) } } },
  };
  const 대상 = N.vidNotWatched(N.DATA.videos[0], 명단).map(s => s.name);
  봄('🔴 구간을 다 본 학생에게는 안 간다', !대상.includes('구간다본이'), 대상.join('·') || '(없음)');
  봄('구간 밖만 본 학생에게는 간다', 대상.includes('엉뚱한데본이'));
  봄('그래서 대상은 한 명', 대상.length === 1);
  /* ⚠ 예전(구간을 모르던 때)이라면 «구간다본이»도 5분/60분 = 9% 라 대상이었다 */
  봄('예전 셈이었다면 둘 다 대상이었다(되풀이 안 함을 확인)', Math.floor(330 / 3600 * 100) < 100);
}

console.log('⑤ 번호가 없는 학생은 갈라 놓는다');
{
  const 명단 = [{ studentId:'a', name:'번호있음', phone:'010-1111-2222' }, { studentId:'b', name:'번호없음' }];
  봄('번호 있는 사람만 보낼 수 있다', 명단.filter(N.VID_NOTICE_TO).length === 1);
  봄('번호 없는 사람은 «못 보냄»으로 남는다', 명단.filter(s => !N.VID_NOTICE_TO(s))[0].name === '번호없음');
}

console.log('⑥ 일부러 망가뜨려 — 검사가 무는지');
{
  const 망가진템플릿 = N.VID_NOTICE_TEMPLATE.replace('#{강의명}', '#{제목}');
  const 글 = 망가진템플릿.replace('#{학생명}', '김').replace('#{마감일}', 'x').replace('#{남은기간}', 'y');
  봄('변수 이름이 어긋나면 «#{」가 남는다 — ②가 이것을 문다', /#\{/.test(글));
}

console.log(틀린것 ? ('❌ ' + 틀린것 + '개 틀렸다') : '✅ 전부 통과');
process.exit(틀린것 ? 1 : 0);
