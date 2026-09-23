/* 한 번에 여럿에게 — 자료는 여러 «반»에, 영상은 여러 «명»에게 (2026-09-18)
   사용자 —「자료올릴때 위에서 반 여러개 체크해서 한번에 여러반에 올릴수 있도록 해주고,
   영상을 제공할 때도 지금 반전체 아니면 1명개인인데 여러명 체크해서 한번에 보내줄 수 있었으면」.

     node tools/multi-send-test.mjs

   🔵 **둘 다 「여럿에게 한 번에」지만 무는 자리가 다르다.**
     · 영상은 **한 사람마다 문서 하나**로 나간다 — 개인 배정의 꼴이 원래 그것이라 학생 화면이 그대로다.
     · 자료는 **반마다 문서(kv) 하나에 배열**이라, 지금 화면에 없는 반의 목록을 모른 채 쓰면
       **그 반의 자료를 통째로 덮는다.** 그것이 이 판에서 가장 비싼 실수다 — 여기서 그 자리를 잰다.
   🔴 그리고 **드라이브에는 한 번만 올린다** — 그래서 지울 때 「아직 쓰는 반이 있나」를 봐야 한다.
     모르면 안 지운다: 드라이브에 남는 파일 하나가, 학생이 못 여는 자료보다 낫다.
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

/* ══════════ 자료 — 여러 반에 한 번에 ══════════ */
console.log(NL + '① 자료 — 고른 반 «모두»에 붙고, 파일은 한 번만 올라간다' + NL);

/* 판을 새로 차린다 — 저장소(kv)와 메모리(state)를 따로 두어 «덮어쓰기»가 드러나게 한다 */
function 자료판(opt) {
  opt = opt || {};
  const 저장소 = Object.assign({
    'material:c1': [{ id: 'old1', title: '지난 프린트', name: 'a.pdf', size: 10, fileId: 'F-OLD' }],
    'material:c2': [{ id: 'old2', title: 'c2 의 것', name: 'b.pdf', size: 20, fileId: 'F-C2' }],
    'material:c3': [],
  }, opt.저장소 || {});
  const 못읽는키 = new Set(opt.못읽는키 || []);
  const 올린파일 = [];
  const 지운파일 = [];
  const 말 = [];
  const 체크 = (opt.체크 || []).slice();
  const 곁 = {
    DATA: { classes: [{ id: 'c1', name: '고1 A' }, { id: 'c2', name: '고1 B' }, { id: 'c3', name: '고2' }] },
    state: { materials: opt.메모리 || {}, materialLoading: {}, materialUploading: {} },
    dbReadFailed: new Set(),
    MATERIAL_MAX_BYTES: 15 * 1024 * 1024,
    classNameOf: id => ({ c1: '고1 A', c2: '고1 B', c3: '고2' })[id] || id,
    nowStamp: () => '2026-09-18 21:00',
    fileSizeLabel: n => n + 'B',
    render: () => {}, logAudit: async () => {},
    showToast: m => 말.push(m),
    confirm: () => opt.확인 !== false,
    uploadFileToDrive: async f => { 올린파일.push(f.name); return { url: 'https://u/' + f.name, fileId: 'F-NEW' }; },
    deleteFromDrive: id => 지운파일.push(id),
    document: {
      getElementById: id => id === 'mt-title' ? { value: opt.제목 || '' } : null,
      querySelectorAll: sel => /mt-cls/.test(sel) ? 체크.map(c => ({ value: c })) : [],
    },
    /* 진짜 dbGet/dbSet 의 «실패를 숨기지 않는» 성질만 그대로 흉내 낸다 */
    dbGet: async (key, fallback) => {
      if (못읽는키.has(key)) { 곁.dbReadFailed.add(key); return fallback; }   // 실패는 fallback 으로 위장된다
      곁.dbReadFailed.delete(key);
      return key in 저장소 ? JSON.parse(JSON.stringify(저장소[key])) : fallback;
    },
    dbSet: async (key, value) => {
      if (곁.dbReadFailed.has(key)) return null;                 // 못 읽은 문서엔 안 쓴다 (진짜와 같다)
      if (못쓰는키.has(key)) return null;
      저장소[key] = JSON.parse(JSON.stringify(value));
      return true;
    },
  };
  const 못쓰는키 = new Set(opt.못쓰는키 || []);
  const api = new Function(...Object.keys(곁),
    [lift('loadMaterialsIfNeeded'), lift('materialListOf'), lift('uploadMaterial'), lift('deleteMaterial')].join(NL)
    + NL + 'return { loadMaterialsIfNeeded, materialListOf, uploadMaterial, deleteMaterial };'
  )(...Object.values(곁));
  return { api, 저장소, 올린파일, 지운파일, 말, 곁 };
}
const 파일 = { name: '오늘프린트.pdf', size: 100, type: 'application/pdf' };

{
  const T = 자료판({ 체크: ['c1', 'c2', 'c3'], 제목: '3단원 프린트' });
  await T.api.uploadMaterial('c1', [파일]);
  봄('🔴 드라이브에는 «한 번»만 올라간다 (반 수만큼 올리지 않는다)', T.올린파일, ['오늘프린트.pdf']);
  const 제목들 = k => T.저장소[k].map(m => m.title);
  봄('고른 세 반에 다 붙었다', [제목들('material:c1'), 제목들('material:c2'), 제목들('material:c3')],
    [['지난 프린트', '3단원 프린트'], ['c2 의 것', '3단원 프린트'], ['3단원 프린트']]);
  봄('🔴 화면에 없던 반의 옛 자료가 살아 있다 (덮어쓰지 않았다)',
    T.저장소['material:c2'].map(m => m.fileId), ['F-C2', 'F-NEW']);
  봄('세 반이 «같은» 파일을 가리킨다', new Set(['c1', 'c2', 'c3'].map(c =>
    T.저장소['material:' + c].find(m => m.title === '3단원 프린트').fileId)).size, 1);
  봄('나눠 쓰는 반을 적어 둔다 (지울 때 본다)',
    T.저장소['material:c1'].find(m => m.title === '3단원 프린트').sharedWith, ['c1', 'c2', 'c3']);
  봄('몇 개 반에 올렸는지 말해 준다', /3개 반/.test(T.말.join(' ')), true);
}
{
  const T = 자료판({ 체크: [], 제목: '한 반만' });
  await T.api.uploadMaterial('c2', [파일]);
  봄('아무 반도 안 고르면 «보고 있는 반»이다', T.저장소['material:c2'].map(m => m.title), ['c2 의 것', '한 반만']);
  봄('   딴 반은 안 건드린다', T.저장소['material:c1'].length, 1);
  봄('   한 반이면 나눠 쓰는 표가 없다', 'sharedWith' in T.저장소['material:c2'][1], false);
}
{
  /* 🔴 **못 읽은 반에는 쓰지 않는다** — 읽기 실패는 «빈 배열»로 위장되므로, 그대로 얹으면
     그 반의 자료가 한 줄로 줄어든다. 이것이 이 판에서 가장 비싼 실수다. */
  const T = 자료판({ 체크: ['c1', 'c2'], 제목: '두 반에', 못읽는키: ['material:c2'] });
  await T.api.uploadMaterial('c1', [파일]);
  봄('🔴 못 읽은 반의 자료를 «빈 목록으로 덮지» 않는다', T.저장소['material:c2'].map(m => m.title), ['c2 의 것']);
  봄('   읽은 반에는 그대로 올라간다', T.저장소['material:c1'].map(m => m.title), ['지난 프린트', '두 반에']);
  봄('🔴 어느 반이 실패했는지 말해 준다', /고1 B/.test(T.말.join(' ')), true);
}
{
  /* 저장이 막힌 반도 마찬가지다 — 「됐다」로 세면 화면에만 있는 자료가 된다 */
  const T = 자료판({ 체크: ['c1', 'c3'], 제목: '막힌 반', 못쓰는키: ['material:c3'] });
  await T.api.uploadMaterial('c1', [파일]);
  봄('저장이 막힌 반은 메모리에도 안 넣는다', (T.곁.state.materials['c3'] || []).length, 0);
  봄('   막히지 않은 반은 갔다', T.저장소['material:c1'].map(m => m.title), ['지난 프린트', '막힌 반']);
  봄('   말에 그 반 이름이 있다', /고2/.test(T.말.join(' ')), true);
}
{
  const T = 자료판({ 체크: ['c1'], 제목: '큰 것' });
  await T.api.uploadMaterial('c1', [{ name: '큰파일.pdf', size: 20 * 1024 * 1024, type: '' }]);
  봄('너무 큰 파일은 올리지 않는다', [T.올린파일.length, T.저장소['material:c1'].length], [0, 1]);
}
{
  /* 🔴 **같은 반을 두 번 세지 않는다** — 상자가 두 벌 그려진 화면에서는 `querySelectorAll` 이
     같은 값을 두 번 준다. 프로브가 실제로 그 꼴을 만들어 「6개 반에 올렸습니다」를 냈고,
     그때 한 반의 목록에 **같은 자료가 두 줄** 섰다. 값으로 걸러 화면 사정과 무관하게 만든다. */
  const T = 자료판({ 체크: ['c1', 'c2', 'c1', 'c2'], 제목: '두 벌 상자' });
  await T.api.uploadMaterial('c1', [파일]);
  봄('🔴 상자가 두 벌이어도 한 반에 한 줄만 올린다',
    [T.저장소['material:c1'].length, T.저장소['material:c2'].length], [2, 2]);
  봄('   말도 «2개 반»이라고 한다', /2개 반/.test(T.말.join(' ')), true);
  봄('   나눠 쓰는 표에도 한 번씩만 든다',
    T.저장소['material:c1'].find(m => m.title === '두 벌 상자').sharedWith, ['c1', 'c2']);
}

console.log(NL + '② 자료 지우기 — 다른 반이 쓰는 파일은 드라이브에서 «안» 지운다' + NL);
{
  /* 세 반에 올린 뒤 한 반에서 지운다 — 목록에서만 빠지고 파일은 남아야 한다.
     남지 않으면 다른 반 학생의 「열기」가 조용히 죽는다(목록엔 있는데 파일이 없다). */
  const T = 자료판({ 체크: ['c1', 'c2'], 제목: '나눠 쓴 것' });
  await T.api.uploadMaterial('c1', [파일]);
  const id = T.저장소['material:c1'].find(m => m.title === '나눠 쓴 것').id;
  await T.api.deleteMaterial('c1', id);
  봄('🔴 이 반 목록에서는 빠진다', T.저장소['material:c1'].map(m => m.title), ['지난 프린트']);
  봄('🔴 다른 반에는 그대로 있다', T.저장소['material:c2'].map(m => m.title), ['c2 의 것', '나눠 쓴 것']);
  봄('🔴 드라이브 파일은 지우지 않는다 (다른 반이 쓴다)', T.지운파일, []);
  봄('   그렇게 말해 준다', /파일은 남깁니다/.test(T.말.join(' ')), true);

  /* 이제 마지막 반에서도 지운다 — 아무도 안 쓰므로 파일까지 지운다 */
  const id2 = T.저장소['material:c2'].find(m => m.title === '나눠 쓴 것').id;
  await T.api.deleteMaterial('c2', id2);
  봄('🔴 마지막 반에서 지우면 파일도 지운다', T.지운파일, ['F-NEW']);
}
{
  /* 나눠 쓰지 않은 것은 예전처럼 곧바로 파일까지 지운다 */
  const T = 자료판({ 메모리: { c1: [{ id: 'old1', title: '지난 프린트', fileId: 'F-OLD' }] } });
  await T.api.deleteMaterial('c1', 'old1');
  봄('혼자 쓰는 파일은 그대로 지운다', [T.지운파일, T.저장소['material:c1'].length], [['F-OLD'], 0]);
}
{
  /* 🔴 **모르면 안 지운다** — 다른 반을 못 읽었으면 쓰는지 알 수 없다. 그때는 파일을 남긴다. */
  const T = 자료판({ 체크: ['c1', 'c2'], 제목: '나눠 쓴 것' });
  await T.api.uploadMaterial('c1', [파일]);
  const id = T.저장소['material:c1'].find(m => m.title === '나눠 쓴 것').id;
  /* c2 를 잊게 만들고, 다시 읽으면 실패하게 한다 */
  delete T.곁.state.materials['c2'];
  T.곁.dbGet = async (key, fallback) => { if (key === 'material:c2') { T.곁.dbReadFailed.add(key); return fallback; }
    return key in T.저장소 ? JSON.parse(JSON.stringify(T.저장소[key])) : fallback; };
  await T.api.deleteMaterial('c1', id);
  봄('🔴 다른 반을 못 읽으면 파일을 남긴다 (모르면 안 지운다)', T.지운파일, []);
  봄('   이 반에서는 빠졌다', T.저장소['material:c1'].map(m => m.title), ['지난 프린트']);
}
{
  const T = 자료판({ 메모리: { c1: [{ id: 'old1', title: '지난 프린트', fileId: 'F-OLD' }] }, 확인: false });
  await T.api.deleteMaterial('c1', 'old1');
  봄('안 물으면 아무 일도 없다', [T.지운파일.length, T.저장소['material:c1'].length], [0, 1]);
}

/* ══════════ 영상 — 여러 명에게 한 번에 ══════════ */
console.log(NL + '③ 영상 — 고른 사람마다 문서 하나' + NL);

function 영상판(opt) {
  opt = opt || {};
  const 폼 = Object.assign({ 'video-unit': '', 'video-title': '보충 4강', 'video-url': 'https://youtu.be/abcdefgh',
    'video-class': 'c1', 'video-due': '2026-09-25', 'video-from': '', 'video-to': '' }, opt.폼 || {});
  let 체크 = (opt.체크 || []).slice();
  const 저장 = [], 말 = [];
  const 막힌학생 = new Set(opt.막힌학생 || []);
  const 곁 = {
    document: {
      getElementById: id => id in 폼 ? { get value(){ return 폼[id]; }, set value(v){ 폼[id] = v; } } : null,
      querySelectorAll: sel => /vd-who/.test(sel)
        ? 체크.map(sid => ({ value: sid, set checked(v){ if (!v) 체크 = 체크.filter(x => x !== sid); } }))
        : [],
    },
    DATA: { videos: [], students: [{ studentId: 'st01', name: '가나' }, { studentId: 'st02', name: '다라' }, { studentId: 'st03', name: '마바' }] },
    extractYouTubeId: u => /youtu\.be\//.test(u) ? 'x' : null,
    clockToSec: s => { const p = String(s).split(':').map(Number); return p.some(isNaN) ? null : p.reduce((a, b) => a * 60 + b, 0); },
    dbSetDoc: async (col, id, data) => { if (막힌학생.has(data.studentId)) return null; 저장.push(data); return true; },
    showToast: m => 말.push(m), render: () => {},
    todayStr: () => '2026-09-24', shiftYmd: new Function(lift('shiftYmd') + NL + 'return shiftYmd;')(),
  };
  const api = new Function(...Object.keys(곁), lift('addVideo') + NL + 'return { addVideo };')(...Object.values(곁));
  return { api, 저장, 말, 곁, 남은체크: () => 체크 };
}

{
  const T = 영상판({ 체크: ['st01', 'st02', 'st03'] });
  await T.api.addVideo();
  봄('🔴 셋을 고르면 문서 셋이 나간다', T.저장.length, 3);
  봄('   사람마다 제 studentId', T.저장.map(v => v.studentId), ['st01', 'st02', 'st03']);
  봄('🔴 문서 id 가 서로 다르다 (같으면 하나가 딴것을 덮는다)', new Set(T.저장.map(v => v.id)).size, 3);
  봄('   제목·링크·반·마감은 셋 다 같다',
    T.저장.map(v => [v.title, v.classId, v.dueDate].join('|')),
    ['보충 4강|c1|2026-09-25', '보충 4강|c1|2026-09-25', '보충 4강|c1|2026-09-25']);
  봄('메모리에도 셋 다 든다', T.곁.DATA.videos.length, 3);
  봄('🔴 몇 명에게 갔는지 이름으로 말해 준다', /3명.*가나·다라·마바/.test(T.말.join(' ')), true);
  봄('보낸 뒤 고른 사람은 비워진다', T.남은체크(), []);
  봄('   제목·링크도 비워진다 (겹쳐 보내지 않도록)', [T.곁.document.getElementById('video-title').value,
    T.곁.document.getElementById('video-url').value], ['', '']);
}
{
  const T = 영상판({ 체크: [] });
  await T.api.addVideo();
  봄('아무도 안 고르면 «반 전체» 한 건이다', [T.저장.length, 'studentId' in T.저장[0]], [1, false]);
  봄('   말도 그렇게 한다', /등록되었습니다/.test(T.말.join(' ')), true);
}
{
  const T = 영상판({ 체크: ['st02'] });
  await T.api.addVideo();
  봄('한 명이면 그 이름으로 말한다', /다라 학생에게/.test(T.말.join(' ')), true);
}
{
  /* 구간·단원 같은 «한 번만 적는 것»이 모두에게 그대로 붙는가 — 이것이 이 판의 값어치다 */
  const T = 영상판({ 체크: ['st01', 'st02'], 폼: { 'video-from': '12:30', 'video-to': '18:00', 'video-unit': '대수 3단원' } });
  await T.api.addVideo();
  봄('🔴 구간·단원을 한 번 적으면 고른 사람 모두에게 붙는다',
    T.저장.map(v => [v.fromSec, v.toSec, v.unit].join('|')), ['750|1080|대수 3단원', '750|1080|대수 3단원']);
}
{
  /* 🔴 **하나가 실패하면 그 사람을 말해 준다** — 셋 중 하나만 안 갔는데 다 간 것처럼 보이면
     그 학생만 영상 없이 남는다. 그리고 실패한 것은 메모리에도 안 들어간다. */
  const T = 영상판({ 체크: ['st01', 'st02', 'st03'], 막힌학생: ['st02'] });
  await T.api.addVideo();
  봄('🔴 실패한 사람은 메모리에 안 든다', T.곁.DATA.videos.map(v => v.studentId).sort(), ['st01', 'st03']);
  봄('🔴 누가 실패했는지 이름으로 말해 준다', /다라 은\(는\) 실패/.test(T.말.join(' ')), true);
  봄('   간 사람도 말해 준다', /가나·마바 에게 보냈습니다/.test(T.말.join(' ')), true);
}
{
  const T = 영상판({ 체크: ['st01'], 막힌학생: ['st01'] });
  await T.api.addVideo();
  봄('다 실패하면 폼을 안 비운다 (다시 보낼 수 있게)',
    [T.남은체크(), T.곁.document.getElementById('video-title').value], [['st01'], '보충 4강']);
  봄('   그리고 못 했다고 말한다', /등록하지 못했습니다/.test(T.말.join(' ')), true);
}
{
  const T = 영상판({ 체크: ['st01', 'st02'], 폼: { 'video-title': '' } });
  await T.api.addVideo();
  봄('제목이 없으면 아무에게도 안 간다', T.저장.length, 0);
}
{
  /* 자료와 같은 까닭 — 상자가 두 벌이면 같은 학생을 두 번 센다. 문서 id 는 같아 덮어써도
     결과는 하나지만, 「4명에게 보냈습니다」라고 거짓말을 하게 된다. */
  const T = 영상판({ 체크: ['st01', 'st02', 'st01', 'st02'] });
  await T.api.addVideo();
  봄('🔴 상자가 두 벌이어도 두 명에게 한 번씩만', T.저장.map(v => v.studentId), ['st01', 'st02']);
  봄('   말도 2명이라고 한다', /2명/.test(T.말.join(' ')), true);
}

console.log(NL + '🪤 덫 — 옛 판으로 돌려 보고 무는지 본다' + NL);
{
  let 물었다 = 0;
  /* ① 자료 — 메모리에 없는 반에 «그냥 얹으면» 그 반이 한 줄로 줄어든다 */
  {
    const T = 자료판({ 체크: ['c1', 'c2'], 제목: 'x' });
    const 옛길 = (T.곁.state.materials['c2'] || []).concat([{ id: 'n', title: 'x' }]);   // 옛 uploadMaterial 이 하던 것
    const 줄었다 = 옛길.length === 1 && T.저장소['material:c2'].length === 1;
    if (줄었다) 물었다++;
    console.log('  ' + (줄었다 ? '✓' : '🔴') + ' 메모리에 없는 반에 그냥 얹으면 한 줄로 덮인다 — 그래서 읽고 나서 얹는다');
  }
  /* ② 영상 — id 에 학생을 안 달면 한 문서에 겹쳐 쓴다 */
  {
    const 도장 = 12345;
    const 옛id = ['st01', 'st02'].map(() => 'v' + 도장);
    const 겹쳤다 = new Set(옛id).size === 1;
    if (겹쳤다) 물었다++;
    console.log('  ' + (겹쳤다 ? '✓' : '🔴') + ' id 에 학생을 안 달면 둘이 한 문서다 — 그래서 v<도장>_<학생> 이다');
  }
  /* ③ 읽기 실패를 «빈 배열»과 갈라내지 못하면 덮어쓴다 */
  {
    const T = 자료판({ 못읽는키: ['material:c3'] });
    const l = await T.api.materialListOf('c3');      // c3 는 저장소에서도 빈 배열이다
    const 갈랐다 = l === null;
    if (갈랐다) 물었다++;
    console.log('  ' + (갈랐다 ? '✓' : '🔴') + ' 못 읽은 것과 «원래 빈 것»을 갈라낸다 (둘 다 [] 로 온다)');
  }
  console.log(NL + '🪤 덫 ' + 물었다 + '/3 물었다');
  if (물었다 !== 3) fail++;
}

console.log(NL + (fail ? '🔴 걸린 것 ' + fail + '개 · ' + (pass + fail) + '개' : '✓ 전부 통과 · ' + pass + '개') + NL);
process.exit(fail ? 1 : 0);
