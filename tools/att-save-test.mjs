// 수업 › 출결 — 저장한 것이 «화면으로» 돌아오는가 (2026-09-13 · A-1)
//
//   node tools/att-save-test.mjs
//
// 🔴 **왜 재는가** — 사용자 신고: 「출결 저장이 잘안되는것 같아. 저장버튼을 눌러도 초기화 되는경우가
//   있는것 같고, 그리고 과제검사로 넘어가면 알아서 저장되었으면 좋겠어」.
//   재 보니 **서버에는 잘 저장되고 있었다. 화면만 못 따라왔다.**
//
//   `loadAllRecordsIfNeeded` 는 **기록 문서가 있는 학생만** `state.allRecords` 에 담는다(`if(rec)`).
//   그런데 `saveClassAttendance` 가 `if(state.allRecords[sid])` 일 때만 방금 쓴 것을 얹고 있었다 —
//   그래서 **기록이 아직 없는 학생**(갓 만든 계정 · 엑셀로 막 올린 학생)은 저장해도 칸이 끝내 비었다.
//   그 하나가 세 얼굴로 나타났다:
//     ① 「안 넣은 변경 n명분」이 저장 뒤에도 안 사라진다 → 단계를 옮길 때마다 또 저장하고 토스트가 또 뜬다
//     ② 「지난 수업 확인」·수업 기록이 그 학생을 계속 «미입력»으로 본다
//     ③ 🔴 **반·날짜를 옮겼다 돌아오면 `ensureAttDraft` 가 빈 칸에서 다시 그려 화면이 초기화된다**
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 그대로 떠 온다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

function lift(name){
  let at = html.indexOf('function ' + name + '(');
  if(at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if(html.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for(let j = html.indexOf('{', at); j < html.length; j++){
    if(html[j] === '{') depth++;
    else if(html[j] === '}'){ depth--; if(!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

const 이름들 = ['attClassOf','attOn','ensureAttDraft','setAttStatus',
  'sessionUnsavedCount','sessionSavedSummary','saveClassAttendance'];

const CID = 'c1', DATE = '2026-09-14';

/* 화면 밖의 것을 흉내 낸다. «서버»는 통 하나다 — 저장이 진짜로 갔는지는 거기서 본다. */
function 판(opts){
  const o = opts || {};
  const 서버 = Object.assign({
    /* 있던이만 옛 기록이 있다. 새내기는 문서가 아예 없다. */
    old1: { attendance:[{date:'2026-09-09', status:'출석', classId:CID}], scores:[], wrongHomework:[] },
  }, o.서버 || {});
  const 장부 = [], 말 = [];
  const roster = [
    { studentId:'old1', name:'있던이', classId:CID },
    { studentId:'new1', name:'새내기', classId:CID },
  ];
  const DATA = { students: roster.map(x=>Object.assign({}, x)), videos: [] };
  const state = { allRecords: {}, attDraft: {}, attDraftKey: null, allRecordsLoaded: true };
  /* 🔵 **진짜와 같은 길로 채운다** — `loadAllRecordsIfNeeded` 가 하는 그 한 줄(`if(rec)`)을 그대로. */
  for(const s of roster){ const rec = 서버[s.studentId]; if(rec) state.allRecords[s.studentId] = JSON.parse(JSON.stringify(rec)); }

  const DATA_records = {};
  const F = new Function('DATA','state','서버','DATA_records','classRoster','studentMainClassId',
    'loadRecord','saveRecord','logAudit','showToast','render','extractYouTubeId','dbSetDoc','장부','말',
    이름들.map(lift).join(NL) + NL + 'return {' + 이름들.join(',') + '};')(
    DATA, state, 서버, DATA_records,
    () => DATA.students,
    (s) => s.classId,
    async (sid) => {
      /* loadRecord 와 같은 결 — 없으면 빈 기록을 만들어 잡아 둔다. */
      if(!DATA_records[sid]) DATA_records[sid] = 서버[sid]
        ? JSON.parse(JSON.stringify(서버[sid]))
        : { attendance:[], scores:[], wrongHomework:[] };
      if(!DATA_records[sid].attendance) DATA_records[sid].attendance = [];
      return DATA_records[sid];
    },
    async (sid) => { 서버[sid] = JSON.parse(JSON.stringify(DATA_records[sid])); return true; },
    async (a,b,c,d) => 장부.push(a + '|' + b + '|' + d),
    (m) => 말.push(m),
    () => {},
    () => 'yt',
    async () => true,
    장부, 말);
  return { F, DATA, state, 서버, 장부, 말, DATA_records };
}

console.log(NL + '── 시작 자리 — 기록 없는 학생은 allRecords 에 «없다» ──');
{
  const { state } = 판();
  봄('있던이만 담긴다 (loadAllRecordsIfNeeded 가 하는 그대로)', Object.keys(state.allRecords), ['old1']);
}

console.log(NL + '── 저장하면 서버에 간다 ──');
{
  const { F, state, 서버 } = 판();
  F.ensureAttDraft(CID, DATE);
  F.setAttStatus('old1','출석');
  F.setAttStatus('new1','출석');
  봄('둘 다 안 넣은 변경으로 잡힌다', F.sessionUnsavedCount(CID, DATE), 2);
  await F.saveClassAttendance(CID, DATE);
  봄('있던이가 서버에 남는다', !!서버.old1.attendance.find(a=>a.date===DATE), true);
  봄('🔵 새내기도 서버에 남는다 (여기는 원래 멀쩡했다)', !!서버.new1.attendance.find(a=>a.date===DATE), true);
  봄('옛 줄은 안 없어진다', !!서버.old1.attendance.find(a=>a.date==='2026-09-09'), true);
}

console.log(NL + '── 🔴 그리고 «화면»으로도 돌아와야 한다 ──');
{
  const { F, state } = 판();
  F.ensureAttDraft(CID, DATE);
  F.setAttStatus('old1','출석');
  F.setAttStatus('new1','지각');
  await F.saveClassAttendance(CID, DATE);
  /* ① 저장했는데도 「안 넣은 변경」이 남으면, 단계를 옮길 때마다 또 저장하고 토스트가 또 뜬다. */
  봄('① 저장 뒤 「안 넣은 변경」이 0 이 된다', F.sessionUnsavedCount(CID, DATE), 0);
  봄('🔴 기록 없던 학생도 allRecords 에 얹힌다', !!state.allRecords.new1, true);
  /* ② 지난 수업 확인·수업 기록이 보는 값. */
  봄('② 요약이 둘 다 «입력됨»으로 센다', F.sessionSavedSummary(CID, DATE),
     { total:2, filled:2, cnt:{ 출석:1, 지각:1 } });
  /* ③ 반·날짜를 옮겼다 돌아온 것과 같은 일 — 여기가 「초기화」의 자리다. */
  state.attDraftKey = null;
  F.ensureAttDraft(CID, DATE);
  봄('🔴 ③ 돌아와도 화면이 «초기화» 안 된다',
     { 있던이:(state.attDraft.old1||{}).status, 새내기:(state.attDraft.new1||{}).status },
     { 있던이:'출석', 새내기:'지각' });
}

console.log(NL + '── 고친 뒤에도 지켜야 할 것 ──');
{
  const { F, state, 서버, 말 } = 판();
  F.ensureAttDraft(CID, DATE);
  F.setAttStatus('new1','결석');
  await F.saveClassAttendance(CID, DATE);
  봄('안 찍은 학생은 건너뛴다 (빈 줄을 만들지 않는다)',
     (서버.old1.attendance || []).filter(a=>a.date===DATE).length, 0);
  봄('안 찍은 학생은 요약에도 안 센다', F.sessionSavedSummary(CID, DATE).filled, 1);
  봄('한 마디만 한다', 말.length, 1);
}
{
  /* 🔴 같은 날 두 번 저장해도 줄이 겹쳐 쌓이면 안 된다. */
  const { F, 서버 } = 판();
  F.ensureAttDraft(CID, DATE);
  F.setAttStatus('old1','출석');
  await F.saveClassAttendance(CID, DATE);
  F.setAttStatus('old1','결석');
  await F.saveClassAttendance(CID, DATE);
  봄('같은 날 줄은 하나뿐이다', 서버.old1.attendance.filter(a=>a.date===DATE).length, 1);
  봄('나중 값이 이긴다', 서버.old1.attendance.find(a=>a.date===DATE).status, '결석');
}
{
  /* 반이 다르면 같은 날이라도 «다른 줄»이다 (E-1에서 세운 규칙 — 덮어쓰면 기록이 사라진다). */
  const { F, 서버, DATA } = 판();
  DATA.students[0].classId = CID;
  서버.old1.attendance.push({ date:DATE, status:'출석', classId:'특강' });
  F.ensureAttDraft(CID, DATE);
  F.setAttStatus('old1','지각');
  await F.saveClassAttendance(CID, DATE);
  const 그날 = 서버.old1.attendance.filter(a=>a.date===DATE);
  봄('같은 날 두 반이 나란히 산다', 그날.length, 2);
  봄('특강 줄은 안 건드린다', 그날.find(a=>a.classId==='특강').status, '출석');
  봄('정규 줄만 바뀐다', 그날.find(a=>a.classId===CID).status, '지각');
}

console.log(NL + '── 「과제 검사로」가 «저절로» 저장하는가 (진짜로 불러 본다) ──');
{
  /* 🔴 **글자로만 보면 못 잡는다** — `if(false) await sessionAutoSaveAtt();` 도 그 글자를 갖고 있다.
     그래서 `sessionAutoSave` 를 떠 와서 **실제로 부르고**, 출결 저장이 닿았는지 본다. */
  const 부른것 = [];
  const 자동 = new Function('state','sessionAutoSaveAtt','sessionAutoSaveScores','sessionAutoSaveProg',
    lift('sessionAutoSave') + NL + 'return sessionAutoSave;')(
    {}, async () => 부른것.push('att'), async () => 부른것.push('score'), async () => 부른것.push('prog'));
  await 자동();
  봄('🔴 단계를 옮기면 출결 저장이 «실제로» 불린다', 부른것.indexOf('att') >= 0, true);
  봄('진도·점수도 함께 불린다', 부른것.sort(), ['att','prog','score']);
}
{
  /* `sessionAutoSaveAtt` 자체도 불러 본다 — 출결 단계에서만, 바뀐 것이 있을 때만. */
  function 자동판(opts){
    const o = opts || {};
    const 저장된 = [];
    const state = { sessionStep: o.step === undefined ? 'att' : o.step, allRecordsLoaded: o.loaded !== false, sessionDate: DATE };
    const f = new Function('state','todayStr','sessionCurrentClassId','sessionUnsavedCount','saveClassAttendance',
      lift('sessionAutoSaveAtt') + NL + 'return sessionAutoSaveAtt;')(
      state, () => DATE, () => o.classId === undefined ? CID : o.classId,
      () => o.unsaved === undefined ? 1 : o.unsaved,
      async (c, d) => 저장된.push(c + '|' + d));
    return { f, 저장된 };
  }
  let r = 자동판(); await r.f();
  봄('출결 단계 + 바뀐 것 있음 → 저장한다', r.저장된, [CID + '|' + DATE]);
  r = 자동판({ step:'hwcheck' }); await r.f();
  봄('다른 단계에서는 안 한다', r.저장된, []);
  r = 자동판({ unsaved:0 }); await r.f();
  봄('바뀐 것이 없으면 안 한다 (같은 값을 되풀이해 쓰지 않는다)', r.저장된, []);
  r = 자동판({ loaded:false }); await r.f();
  봄('기록을 아직 못 받았으면 안 한다', r.저장된, []);
}

console.log(NL + '── 화면이 이 값을 실제로 쓰는가 ──');
{
  /* 🔴 **`saveClassAttendance` «안»만 본다** — `state.allRecords[s.studentId] = rec;` 는
     시험지 삭제 쪽에도 있어서, 파일 전체를 글자로 보면 엉뚱한 곳을 보고 안심하게 된다
     (이 검사를 망가뜨려 보다가 실제로 그 함정을 밟았다). */
  const 몸통 = lift('saveClassAttendance');
  봄('🔴 가드가 되살아나지 않았다',
     몸통.indexOf('if(state.allRecords[s.studentId])') < 0, true);
  봄('🔴 방금 쓴 것을 조건 없이 얹는다',
     몸통.indexOf('state.allRecords[s.studentId] = rec;') >= 0, true);
  봄('안 찍은 학생은 건너뛴다는 줄이 그대로 있다',
     몸통.indexOf('if(!d || !d.status) return;') >= 0, true);
  봄('「과제 검사로」 단추가 단계를 옮긴다', html.indexOf("goSessionStep('hwcheck')") >= 0, true);
}

console.log(NL + (fail ? `🔴 ${fail}개 넘어짐 (통과 ${pass})` : `✅ 전부 통과 (${pass}가지)`));
process.exit(fail ? 1 : 0);
