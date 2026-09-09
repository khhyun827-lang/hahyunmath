// node 도구가 Firestore 에 닿는 «하나뿐인 문» (2026-09-09)
//
// 🔴 **왜 생겼나** — 2026-09-08에 인증 구멍을 닫으면서 익명에게 20개 컬렉션이 전부 막혔다.
//    그게 옳은 상태다(docs/인증-옮기기.md). 그런데 **node 도구는 전부 익명으로 붙고 있었다** —
//    `items-push` · `item-bodies` · `backup` · `items-repair` … 그래서 그날 이후로
//    **도구가 하나도 안 돈다.** 규칙에 `items` 는 읽기 `realAccount()` · 쓰기 `isTeacher()` 다.
//    🔵 웹은 멀쩡하다. 강사가 진짜 계정으로 로그인해 있기 때문이다.
//
// ▶ **그래서 도구도 강사로 로그인한다.** 열쇠는 `.keys/firebase.json` 에 둔다:
//
//      { "email": "강사계정@…", "password": "…" }
//
//    ⚠ `.keys/` 는 `.gitignore` 에 들어 있다 — **저장소에 안 올라간다.**
//    ⚠ 환경변수로도 받는다: `HM_EMAIL` · `HM_PW` (CI 나 한 번만 쓸 때).
//
// 🔴 **익명으로 조용히 되돌아가지 않는다.** 되돌아가면 403 이 «빈 창고»로 보이고,
//    빈 창고를 보면 판정이 564제를 통째로 «새 문항»이라고 말한다 — 09-04에 «비었다»와
//    «못 읽었다»를 못 갈라서 기록을 지운 그 사고와 **같은 꼴**이다. 그래서 **멈춘다.**

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');

/* 열쇠는 index.html 에서 읽는다 — 두 곳에 적어 두면 한쪽만 바뀐다. */
export function firebaseConfig() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
  const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
  if (!apiKey || !projectId) throw new Error('index.html 에서 firebase 설정을 못 읽었습니다.');
  return { apiKey, projectId };
}

function 계정() {
  if (process.env.HM_EMAIL && process.env.HM_PW)
    return { email: process.env.HM_EMAIL, password: process.env.HM_PW };
  const p = path.join(ROOT, '.keys', 'firebase.json');
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (j && j.email && j.password) return { email: j.email, password: j.password };
  } catch (e) { throw new Error('.keys/firebase.json 을 못 읽었습니다 — ' + e.message); }
  return null;
}

const 안내 = [
  '🔴 강사 계정이 없어 Firestore 에 못 붙습니다.',
  '',
  '   2026-09-08에 인증 구멍을 닫으면서 «익명»은 아무것도 못 읽습니다(그게 맞습니다).',
  '   도구도 강사로 로그인해야 합니다 — 아래 파일을 만들어 주세요:',
  '',
  '     .keys/firebase.json',
  '     { "email": "강사계정 이메일", "password": "비밀번호" }',
  '',
  '   ⚠ .keys/ 는 .gitignore 에 있어 저장소에 안 올라갑니다.',
  '   ⓘ 한 번만 쓸 것이면 환경변수로도 됩니다:  HM_EMAIL=… HM_PW=… node tools/…',
].join('\n');

/* 강사로 로그인해 토큰과 주소를 돌려준다. 못 하면 **멈춘다** (조용히 익명으로 안 간다). */
export async function 강사로로그인() {
  const { apiKey, projectId } = firebaseConfig();
  const 것 = 계정();
  if (!것) { console.error('\n' + 안내 + '\n'); process.exit(2); }
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + apiKey, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 것.email, password: 것.password, returnSecureToken: true }),
  });
  if (!r.ok) {
    const 말 = (await r.text()).slice(0, 200);
    console.error('\n🔴 로그인 실패 (http ' + r.status + ') — ' + 말
      + '\n   .keys/firebase.json 의 이메일·비밀번호를 봐주세요.\n');
    process.exit(2);
  }
  const j = await r.json();
  return {
    token: j.idToken,
    uid: j.localId,
    email: 것.email,
    BASE: 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents',
    H: { Authorization: 'Bearer ' + j.idToken },
  };
}
