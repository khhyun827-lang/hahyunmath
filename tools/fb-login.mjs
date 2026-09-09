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
//      { "id": "웹에 치는 그 아이디", "password": "웹에 치는 그 비밀번호" }
//
//    🔵 **웹에 치는 것을 그대로 적으면 된다.** 앱에는 이메일 칸이 없다 —
//      아이디 뒤에 도메인을 붙여 쓰기 때문이다(`아이디@teacher.hahyunmath.invalid`).
//      그 도메인은 **`index.html` 에서 읽는다** — 여기 적어 두면 한쪽만 바뀐다.
//      (2026-09-10에 사용자가 실제로 여기서 헷갈렸다. 아이디를 email 칸에 적어 두셨는데,
//       그것이 옳은 감각이라 **도구를 아이디에 맞췄다.** `email` 로 적어도 그대로 받는다.)
//    ⚠ `.keys/` 는 `.gitignore` 에 들어 있다 — **저장소에 안 올라간다.**
//    ⚠ 환경변수로도 받는다: `HM_ID`(또는 `HM_EMAIL`) · `HM_PW` (CI 나 한 번만 쓸 때).
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

/* 🔵 **강사 아이디와 도메인은 «물을 것»이 아니다 — index.html 이 이미 알고 있다.**
   앱은 강사 아이디를 `admin` 하나로 못 박아 두었고(`TEACHER_ID`), 그래서 로그인 화면이
   비밀번호만 묻는다. 도구도 똑같이 해야 한다 — 사용자가 «웹에 없는 것»을 적게 하면 안 된다.
   ⚠ 여기 값을 베껴 적지 않는다. 베껴 두면 앱에서 바꾼 날 도구만 옛 값을 든다. */
function 앱이아는것() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const id = (html.match(/TEACHER_ID\s*=\s*'([^']+)'/) || [])[1];
  const dom = (html.match(/teacher:\s*'([^']+)'/) || [])[1];
  if (!id || !dom) throw new Error('index.html 에서 강사 아이디(TEACHER_ID)나 도메인(AUTH_도메인)을 못 읽었습니다.');
  return { id, dom };
}
/* 아이디만 왔으면 도메인을 붙인다. 안 왔으면 앱이 쓰는 아이디를 쓴다. 이메일이면 그대로. */
function 이메일로(값) {
  const { id, dom } = 앱이아는것();
  const s = String(값 == null ? '' : 값).trim();
  if (s.includes('@')) return s;
  /* ⚠ 한글이 섞였으면 «아이디»가 아니다 — 안내문을 그대로 두신 것이다(2026-09-10에 실제로 그랬다).
     그런 값은 조용히 쓰면 INVALID_EMAIL 만 뜨고 까닭을 알 수 없으니, 앱이 쓰는 아이디로 간다. */
  const 쓸만한가 = /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/.test(s);
  return (쓸만한가 ? s.toLowerCase() : id) + '@' + dom;
}

function 계정() {
  const envId = process.env.HM_ID || process.env.HM_EMAIL;
  if (process.env.HM_PW) return { email: 이메일로(envId), password: process.env.HM_PW };
  const p = path.join(ROOT, '.keys', 'firebase.json');
  if (!fs.existsSync(p)) return null;
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); }
  catch (e) { throw new Error('.keys/firebase.json 을 못 열었습니다 — ' + e.message); }
  /* ⚠ 메모장이 붙이는 BOM 을 걷는다 — 안 걷으면 JSON.parse 가 첫 글자에서 넘어진다. */
  raw = raw.replace(/^﻿/, '');
  let j;
  try { j = JSON.parse(raw); }
  catch (e) {
    /* 🔵 **무엇이 틀렸는지 말해 준다.** 2026-09-10에 사용자가 바깥 중괄호를 빠뜨렸고,
       그때 나온 말은 「Unexpected non-whitespace character at position 7」뿐이었다 —
       그것만 보고는 무엇을 고쳐야 하는지 알 길이 없다. */
    const 힌트 = !/^\s*\{/.test(raw)
      ? '\n   ▶ 바깥 중괄호 { } 가 빠진 것 같습니다. 파일 전체가 이 꼴이어야 합니다:\n'
        + '     { "id": "아이디", "password": "비밀번호" }'
      : '';
    throw new Error('.keys/firebase.json 이 JSON 이 아닙니다 — ' + e.message + 힌트);
  }
  const 비번 = j && (j.password || j.pw || j.비밀번호);
  /* 🔵 아이디는 없어도 된다 — 앱이 `admin` 으로 못 박아 두었다. 비밀번호만 있으면 선다. */
  if (비번) return { email: 이메일로(j.id || j.email || j.아이디), password: String(비번) };
  return null;
}

const 안내 = [
  '🔴 강사 계정이 없어 Firestore 에 못 붙습니다.',
  '',
  '   2026-09-08에 인증 구멍을 닫으면서 «익명»은 아무것도 못 읽습니다(그게 맞습니다).',
  '   도구도 강사로 로그인해야 합니다 — 아래 파일을 만들어 주세요:',
  '',
  '     .keys/firebase.json',
  '     { "password": "관리자 비밀번호" }',
  '',
  '   🔵 **웹 로그인 화면에 치는 그 비밀번호 하나면 됩니다.** 아이디는 안 적으셔도 됩니다 —',
  '      앱이 admin 으로 못 박아 두었고(그래서 화면도 비밀번호만 묻습니다) 도구가 그걸 읽습니다.',
  '   ⚠ 바깥 중괄호 { } 를 빠뜨리지 마세요 — 파일 «전체»가 위 한 줄 꼴이어야 합니다.',
  '   ⚠ .keys/ 는 .gitignore 에 있어 저장소에 안 올라갑니다.',
  '   ⓘ 한 번만 쓸 것이면 환경변수로도 됩니다:  HM_PW=… node tools/…',
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
