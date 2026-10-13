// 워커 — 잠근 파일 내주기(/file) · 지우기 막이(/delete) · 올리기(/upload) (2026-10-13 · 보안 1·2단계)
//
//   node tools/worker-file-test.mjs
//
// 사용자 — 「내가 올려주는 자료에 보안을 좀 더 신경 쓰고 싶어」.
// 🔴 막이는 «돌려서» 잰다 — 글자가 있는지가 아니라, 아닌 사람이 실제로 막히는지.
//   함수를 떠서 가짜 fetch(드라이브·Firestore)로 돌린다. 워커를 실제로 부르지 않는다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const worker = fs.readFileSync(path.join(ROOT, 'worker/gemini-proxy.js'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);
let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇 + (같다 ? '' : NL + '      나온 것: ' + JSON.stringify(잰것) + NL + '      나와야:  ' + JSON.stringify(바란것)));
};
function 떠내기(이름) {
  const at = worker.search(new RegExp('^(async )?function ' + 이름 + '\\(', 'm'));
  if (at < 0) throw new Error(이름 + ' 를 못 찾았습니다');
  let d = 0;
  for (let j = worker.indexOf('{', at); j < worker.length; j++) {
    if (worker[j] === '{') d++;
    else if (worker[j] === '}') { d--; if (!d) return worker.slice(at, j + 1); }
  }
}

/* 가짜 세상 — 강사 T · 학생 S1(반 c1) · 반 c1 자료에 F_MAT · 학교 파일 F_SCH · 학생이 올린 F_MINE · 남의 F_OTHER */
function 세상() {
  const 부름 = [];
  const 문서 = {
    'students/S1': { classId: 'c1' },
    'kv/material:c1': [{ fileId: 'F_MAT_0000001' }],
    'kv/material:c2': [{ fileId: 'F_MAT_0000002' }],
  };
  const 파일속성 = { F_MINE_000001: { uid: 'S1' }, F_OTHER_00001: { uid: 'S9' }, F_OLD_0000001: {} };
  const fetch = async (url, opt = {}) => {
    부름.push([opt.method || 'GET', url]);
    if (/alt=media/.test(url)) return new Response('PDF바이트', { headers: { 'Content-Type': 'application/pdf' } });
    const m = /files\/([^/?]+)\?fields=appProperties/.exec(url);
    if (m) return 파일속성[m[1]] ? new Response(JSON.stringify({ appProperties: 파일속성[m[1]] })) : new Response('', { status: 404 });
    if (opt.method === 'DELETE') return new Response(null, { status: 204 });
    return new Response('{}');
  };
  const 곁 = {
    fetch,
    isTeacherOrStaff: async (env, uid) => uid === 'T',
    getDriveAccessToken: async () => 'tok',
    fsValue: async (env, p) => (p in 문서 ? 문서[p] : null),
    env: { FIREBASE_SA: '{}' },
  };
  const F = new Function(...Object.keys(곁), 떠내기('fileJson') + NL + 떠내기('handleFile') + NL + 떠내기('handleDelete')
    + NL + 'return { handleFile: (b, who) => handleFile({ json: async () => b }, env, {}, who), handleDelete: (b, who) => handleDelete({ json: async () => b }, env, {}, who) };')(...Object.values(곁));
  return { F, 부름 };
}
const 학생 = { uid: 'S1', provider: 'password' }, 강사 = { uid: 'T', provider: 'password' }, 익명 = { uid: 'A', provider: 'anonymous' };

console.log(NL + '① /file — 잠근 파일은 자격이 있을 때만' + NL);
{
  const { F } = 세상();
  const 상태 = async (b, who) => (await F.handleFile(b, who)).status;
  봄('🔵 강사는 학교 파일(시험지·분석)을 받는다', await 상태({ fileId: 'F_SCH_0000001', scope: 'school' }, 강사), 200);
  봄('   받은 것은 파일 그 자체(내용·종류)', await (async () => { const r = await F.handleFile({ fileId: 'F_SCH_0000001', scope: 'school' }, 강사);
    return [await r.text(), r.headers.get('Content-Type'), r.headers.get('Cache-Control')]; })(), ['PDF바이트', 'application/pdf', 'private, no-store']);
  봄('🔵 학생은 «제 반 · 그 반 목록에 있는» 자료를 받는다', await 상태({ fileId: 'F_MAT_0000001', scope: 'material', classId: 'c1' }, 학생), 200);
  봄('🔴 학생이 학교 파일을 달라면 막힌다', await 상태({ fileId: 'F_SCH_0000001', scope: 'school' }, 학생), 403);
  봄('🔴 남의 반(c2) 자료는 막힌다 — 그 반 목록에 있어도', await 상태({ fileId: 'F_MAT_0000002', scope: 'material', classId: 'c2' }, 학생), 403);
  봄('🔴 제 반이라고 우겨도 목록에 없는 파일은 막힌다 (시험지 번호를 c1 자료라고 속이기)', await 상태({ fileId: 'F_SCH_0000001', scope: 'material', classId: 'c1' }, 학생), 403);
  봄('🔴 익명은 막힌다', await 상태({ fileId: 'F_MAT_0000001', scope: 'material', classId: 'c1' }, 익명), 403);
  봄('   이상한 번호는 400', await 상태({ fileId: '../x', scope: 'school' }, 강사), 400);
}

console.log(NL + '② /delete — 강사·조교 아니면 «제가 올린 것»만' + NL);
{
  const { F, 부름 } = 세상();
  const 지움 = () => 부름.filter(x => x[0] === 'DELETE').map(x => x[1].split('/').pop());
  봄('🔵 학생은 제가 올린 사진을 지운다', [(await F.handleDelete({ fileId: 'F_MINE_000001' }, 학생)).status, 지움()], [200, ['F_MINE_000001']]);
  봄('🔴 남이 올린 파일은 못 지운다', [(await F.handleDelete({ fileId: 'F_OTHER_00001' }, 학생)).status, 지움().length], [403, 1]);
  봄('🔴 올린 사람이 안 적힌 옛 파일(강사 자료 등)도 학생은 못 지운다', [(await F.handleDelete({ fileId: 'F_OLD_0000001' }, 학생)).status, 지움().length], [403, 1]);
  봄('🔵 강사는 무엇이든 지운다', [(await F.handleDelete({ fileId: 'F_OTHER_00001' }, 강사)).status, 지움().length], [200, 2]);
  봄('🔴 익명은 못 지운다', (await F.handleDelete({ fileId: 'F_MINE_000001' }, 익명)).status, 403);
  봄('   이미 없는 파일은 «됐다»(정리 작업이 엉키지 않게)', (await F.handleDelete({ fileId: 'F_GONE_000001' }, 학생)).status, 200);
}

console.log(NL + '③ /upload — 익명 막기 · 올린 사람 적기 · 잠금' + NL);
{
  const 몸 = 떠내기('handleUpload');
  봄('🔵 올린 사람 uid 를 파일 속성에 적는다', /appProperties: \{ uid: \(who && who\.uid\) \|\| '' \}/.test(몸), true);
  /* 돌려서 — private 이면 «누구나» 권한을 안 붙인다 */
  const 돌리기 = async (잠금) => {
    const 부름 = [];
    const form = new FormData();
    form.append('file', new Blob(['x'], { type: 'application/pdf' }), 'a.pdf');
    if (잠금) form.append('private', '1');
    const H = new Function('fetch', 'getDriveAccessToken', 'crypto', 'env', 몸 + '; return handleUpload;')(
      async (url, opt = {}) => { 부름.push(url); return new Response(JSON.stringify({ id: 'NEWFILE_000001' })); },
      async () => 'tok', { randomUUID: () => 'u' }, { DRIVE_FOLDER_ID: 'D' });
    await H({ formData: async () => form }, { DRIVE_FOLDER_ID: 'D' }, {}, 학생);
    return 부름.some(u => /\/permissions/.test(u));
  };
  봄('🔴 잠금(private=1)이면 «링크 있는 누구나» 권한을 안 붙인다', await 돌리기(true), false);
  봄('   잠금이 아니면(학생 사진 등) 예전처럼 붙인다', await 돌리기(false), true);
  봄('🔴 익명 업로드는 한도 세기 «전에» 막는다', /if \(url\.pathname === '\/upload'\) \{\s*\n(\s*\/\*[\s\S]*?\*\/\s*\n)?\s*if \(who\.provider === 'anonymous'\) return fileJson\(/.test(worker), true);
  봄('🔴 /file 은 AI 한도를 안 먹는다 (catch-all 에서 빠짐)', /startsWith\('\/admin\/'\) && url\.pathname !== '\/file'/.test(worker), true);
  봄('   옛 파일 잠그기는 강사만(adminGate) · 한 번에 15개', [/handleAdminLockFiles[\s\S]{0,200}adminGate\(/.test(떠내기('handleAdminLockFiles')), /ids\.length > 15/.test(떠내기('handleAdminLockFiles'))], [true, true]);
}

console.log(틀림 ? NL + '  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패' + NL : NL + '  ✅ ' + 통과 + ' 통과 · 0 실패' + NL);
process.exit(틀림 ? 1 : 0);
