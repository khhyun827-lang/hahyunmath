/* 조교 화면 — 출결·성적·과제 탭과 출석 도장 (2026-09-19)
   사용자 —「조교도 출결이랑 과제체크 성적입력 해야할 때가 있어서 과제탭 출결탭 성적탭 열어줘야할 것
   같아 그리고 조교도 게임할 수 있도록 게임 하루에한번 할 수 있는거 열어줄 수 있어?」

     node tools/ta-tabs-test.mjs

   🔵 **화면은 강사 것을 그대로 쓴다** — 조교 화면의 첫 규칙이다(두 벌로 두면 앞으로 모든 변경을
     두 번 해야 하고 반드시 한쪽만 고쳐진다). 그래서 여기서 재는 것은 «무엇을 뺐나»다.
   🔴 **뺀 자리에는 까닭이 하나씩 있다** — 규칙이 조교에게 안 열어 준 것들이다:
     · 시험 만들기·문항 등록·시험 삭제 → `exams` 쓰기
     · 과제 등록·고치기·삭제         → `assignments` 쓰기
     · 결석 보충 영상 링크           → `videos` 쓰기
     눌러도 아무 일 없는 단추는 거짓말이므로 «안 세운다». 점수·출결·과제확인은 기록(records)이라 된다.
   ⚠ 함수는 베끼지 않는다 — index.html 에서 그대로 뜬다. */
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
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

console.log(NL + '① 맡은 반만 본다' + NL);
{
  const 곁 = {
    DATA: { classes: [{ id: 'c1', name: '고1 A' }, { id: 'c2', name: '고1 B' }, { id: 'c3', name: '고2' }] },
    state: { currentUser: null },
    assistantClassIds: a => a.classIds || [],
  };
  const F = new Function(...Object.keys(곁),
    [lift('isAssistantNow'), lift('myClassList')].join(NL) + NL + 'return { isAssistantNow, myClassList };'
  )(...Object.values(곁));
  곁.state.currentUser = { type: 'teacher' };
  봄('강사는 반 전부', F.myClassList().map(c => c.id), ['c1', 'c2', 'c3']);
  곁.state.currentUser = { type: 'assistant', classIds: ['c2'] };
  봄('🔴 조교는 맡은 반만', F.myClassList().map(c => c.id), ['c2']);
  곁.state.currentUser = { type: 'assistant', classIds: [] };
  봄('맡은 반이 없으면 빈 목록 (설정으로 보내면 안 된다 — 못 들어간다)', F.myClassList(), []);
}

console.log(NL + '② 탭 — 넷 + 도장' + NL);
{
  const 탭 = html.match(/const ASSISTANT_TABS = \[[\s\S]*?\];/)[0];
  봄('🔴 출결·성적·과제가 열렸다', ['sessions', 'scores', 'homework'].map(t => 탭.includes(`'${t}'`)), [true, true, true]);
  봄('명단도 그대로 있다', 탭.includes("'students'"), true);
  봄('🔴 출석 도장도 있다', 탭.includes("'checkin'"), true);
  /* ⚠ 강사만의 탭이 새어 들어가면 조교가 상담·수업기록을 보게 된다 */
  봄('🔴 상담·수업기록·진도·퀴즈·영상·자료는 «안» 연다',
    ['consult', 'log', 'progress', 'quiz', 'video', 'material'].filter(t => 탭.includes(`'${t}'`)), []);
  const 셸 = lift('assistantHTML');
  봄('탭을 옮기면 학생 상세를 닫는다', lift('goAssistantTab').includes('state.studentDetailId = null'), true);
  봄('명단 밖의 탭은 강사 화면을 그대로 쓴다', 셸.includes('teacherClassHubHTML()'), true);
  봄('모르는 탭이 들어와도 명단으로 떨어진다', /ASSISTANT_TABS\.some\([\s\S]{0,80}'students'/.test(셸), true);
}

console.log(NL + '③ 뺀 것 — 규칙이 안 열어 준 자리' + NL);
{
  const 성적 = lift('chubScoresHTML');
  봄('🔴 시험 추가는 조교에게 안 보인다', /isAssistantNow\(\) \? '' : `<button[^`]*시험 추가/.test(성적), true);
  봄('🔴 문항 등록·시험 삭제도 안 보인다', /isAssistantNow\(\) \? ''\s*\/\* 문항 등록/.test(성적), true);
  봄('🔴 만점 칸은 «글자»로 보인다 (고치면 exams 를 써야 한다)',
    /isAssistantNow\(\)[\s\S]{0,120}examTotalOf\(ex\)[\s\S]{0,40}문항/.test(성적), true);
  봄('   점수 저장(전체 저장)은 그대로 있다', /saveClassScores\('\$\{classId\}'\)/.test(성적), true);

  const 저장 = lift('saveClassScores');
  봄('🔴 만점 칸이 없으면 «적혀 있는 만점»으로 센다 (없으면 조교는 하나도 못 넣는다)',
    /if\(!el && examTotalOf\(ex\) > 0\)\{ totals\[ex\.id\] = examTotalOf\(ex\); continue; \}/.test(저장), true);

  const 과제 = lift('teacherClassDailyHomeworkHTML');
  봄('🔴 과제 등록은 조교에게 안 보인다', /isAssistantNow\(\) \? '' : `<button[^`]*hwCloseEdit/.test(과제), true);
  봄('🔴 과제 고치기·삭제도 안 보인다', /isAssistantNow\(\) \? '' : `<button[^`]*hwOpenEdit/.test(과제), true);
  봄('   제출 확인은 그대로 있다 (기록이라 조교도 쓴다)', /homeworkDetailId/.test(과제), true);

  /* ⚠ 출결을 «넣는» 칸은 `chubAttendanceHTML` 이 아니라 그것이 여는 **날짜 드로어**에 있다.
     처음에 엉뚱한 함수를 뒤져 한 번 빨개졌다 — 재는 자리를 이름으로 못 박아 둔다. */
  const 드로어 = lift('attDateDrawerHTML');
  봄('🔴 보충 영상 칸은 조교에게 안 보인다 (videos 쓰기)', /gone && !isAssistantNow\(\)/.test(드로어), true);
  봄('   출결 그 자체는 조교도 넣는다', /setAttStatus/.test(드로어), true);
  봄('   수업 화면의 같은 칸도 함께 막았다', /flag && !isAssistantNow\(\)/.test(lift('sessionAttHTML')), true);

  봄('반 만들기(설정으로 가기)도 조교에게는 안 보인다',
    /isAssistantNow\(\) \? '' : `<button[^`]*settingsSubTab='classes'/.test(lift('chubClassListHTML')), true);
}

console.log(NL + '④ 게임 — 조교도 하루 한 판' + NL);
{
  const 곁 = {
    state: { currentUser: null },
    DATA: { students: [{ studentId: 'st01', name: '가나', classId: 'c1' }] },
    authUid: () => 'UID-ta01',
    classNameOf: id => ({ c1: '고1 A' })[id] || '',
  };
  const F = new Function(...Object.keys(곁),
    [lift('isAssistantNow'), lift('gameSid'), lift('gameClassLabel')].join(NL)
    + NL + 'return { gameSid, gameClassLabel };')(...Object.values(곁));
  곁.state.currentUser = { type: 'student', studentId: 'st01' };
  봄('학생은 학번으로 센다 (예전 그대로)', [F.gameSid(), F.gameClassLabel('st01')], ['st01', '고1 A']);
  곁.state.currentUser = { type: 'assistant', name: '조교하나' };
  봄('🔴 조교는 «제 uid» 로 센다 (규칙이 제 기록만 열어 준다)', F.gameSid(), 'UID-ta01');
  봄('🔴 순위의 반 자리에는 「조교」가 선다', F.gameClassLabel('UID-ta01'), '조교');
  곁.state.currentUser = null;
  봄('아무도 안 들어왔으면 빈 값 (게임이 안 열린다)', F.gameSid(), '');

  /* 문이 둘 다 같은 열쇠를 쓰는가 — 하나만 고치면 «열 때»와 «끝낼 때»가 갈린다 */
  봄('🔴 여는 문도 끝내는 문도 같은 열쇠를 쓴다',
    [lift('openGame').includes('const sid = gameSid()'), lift('finishGame').includes('const sid = gameSid()')], [true, true]);
  봄('   순위에 올릴 때도 그 이름표를 쓴다', lift('finishGame').includes('gameClassLabel(sid)'), true);
  봄('조교 화면이 «학생과 같은 카드»를 쓴다', lift('assistantCheckinHTML').includes('ckCardHTML('), true);
  봄('   기록을 한 번만 읽는다', /ckMyRecordAsked === sid/.test(lift('ckEnsureMyRecord')), true);
}

console.log(NL + '🪤 덫 — 규칙과 화면이 어긋나면 무는가' + NL);
{
  let 물었다 = 0;
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
  const 덩이 = 이름 => {
    const at = rules.indexOf('match /' + 이름 + '/');
    if (at < 0) return '';
    const end = rules.indexOf(NL + '    }', at);
    return end < 0 ? rules.slice(at) : rules.slice(at, end);
  };
  /* ① 화면에서 뺀 셋은 규칙에서도 조교에게 «닫혀» 있어야 한다 — 열려 있으면 뺄 까닭이 없어진다 */
  {
    const 닫힘 = ['exams', 'assignments', 'videos'].every(c => !/isStaff\(\)/.test(덩이(c)));
    if (닫힘) 물었다++;
    console.log('  ' + (닫힘 ? '✓' : '🔴') + ' exams·assignments·videos 는 조교에게 닫혀 있다 (그래서 단추를 뺐다)');
  }
  /* ② 기록은 열려 있어야 한다 — 닫히면 출결·성적·과제확인이 통째로 안 된다 */
  {
    const 열림 = /isStaff\(\)/.test(덩이('records'));
    if (열림) 물었다++;
    console.log('  ' + (열림 ? '✓' : '🔴') + ' records 는 조교에게 열려 있다 (출결·성적·과제확인이 전부 여기다)');
  }
  /* ③ 조교의 도장은 «제 문서»라 isMine 으로 열린다 — 그 조건이 사라지면 게임이 저장을 못 한다 */
  {
    const 제것 = /isMine\(uid\)/.test(덩이('records'));
    if (제것) 물었다++;
    console.log('  ' + (제것 ? '✓' : '🔴') + ' records 에 isMine 이 살아 있다 (조교의 도장이 제 uid 문서다)');
  }
  console.log(NL + '🪤 덫 ' + 물었다 + '/3 물었다');
  if (물었다 !== 3) fail++;
}

console.log(NL + (fail ? '🔴 걸린 것 ' + fail + '개 · ' + (pass + fail) + '개' : '✓ 전부 통과 · ' + pass + '개') + NL);
process.exit(fail ? 1 : 0);
