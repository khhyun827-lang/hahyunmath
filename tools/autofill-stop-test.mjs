// 자동채우기가 «멈추면 단추도 풀리는가» (2026-09-07)
//
// 🔴 사용자가 짚었다 — 「멈추거나 한도가꽉차서 종료되면 자동채우기 버튼이 풀렸으면 좋겠는데
//   계속 눌려진 상태가 돼」. 멈추는 길이 여섯인데 «끄는 줄»을 세 곳에만 적어 두었다.
//   나머지는 고리는 서는데 단추만 눌린 채 남아 **「돌고 있다」고 거짓말**을 했다.
//
// 🔵 그래서 끄는 일을 `autoFillStop` «한 곳»으로 모았다. 이 검사는 두 가지를 잰다 —
//   ① 멈추는 길이 모두 그 문을 지나는가 (날것 st.on = false 가 남아 있지 않은가)
//   ② 그 문이 실제로 셋을 다 하는가 (상태 · 저장된 값 · 타이머)
// ⚠ 「끈다」를 세 줄로 베껴 두면 다음에 길이 하나 늘 때 또 빠뜨린다. 그것이 이번 흠이었다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));
const NL = String.fromCharCode(10);
const 뜨기 = (머리) => {
  const a = html.indexOf(머리);
  if (a < 0) throw new Error('못 찾음: ' + 머리);
  return html.slice(a, html.indexOf(NL + '}' + NL, a) + 3);
};

let 잼 = 0, 흠 = 0;
const 봄 = (이름, 났다, 바람) => {
  잼++;
  if (JSON.stringify(났다) === JSON.stringify(바람)) return;
  흠++;
  console.log('🔴 ' + 이름 + NL + '   나온 것: ' + JSON.stringify(났다) + NL + '   바란 것: ' + JSON.stringify(바람));
};

const 문 = 뜨기('function autoFillStop(msg){');
const 고리 = html.slice(html.indexOf('async function autoFillTick()'), html.indexOf('/* 🔵 **검토를 통과시킨다**'));

// ① 문이 셋을 다 하는가 — 하나라도 빠지면 «껐는데 도로 돈다»
봄('상태를 끈다', 문.includes('st.on = false'), true);
봄('저장된 값도 끈다', 문.includes("localStorage.setItem(AUTOFILL_KEY, '0')"), true);
봄('타이머를 끊는다', 문.includes('clearTimeout(autoFillTimer)'), true);
봄('하던 일 표시도 지운다', /st\.busy = ''/.test(문), true);

// ② 끄는 일이 «한 곳»에서만 일어나는가
const 날것 = (html.match(/st\.on = false/g) || []).length;
봄('날것으로 끄는 곳이 문 하나뿐이다', 날것, 1);
const 날것키 = (html.match(/localStorage\.setItem\(AUTOFILL_KEY, '0'\)/g) || []).length;
봄('저장된 값을 끄는 곳도 하나뿐이다', 날것키, 1);

// ③ 🔴 예전에 «안 끄고» 지나가던 두 길이 이제 문을 지나는가
봄('더 볼 것이 없으면 끈다', /if\(!list\.length\)\{[\s\S]{0,300}?autoFillStop\(/.test(고리), true);
봄('오늘 몫을 다 쓰면 끈다', /used >= AI_DAILY_LIMIT\)\{[\s\S]{0,400}?autoFillStop\(/.test(고리), true);
봄('워커가 「한도 끝」이라 해도 끈다', /twin\.quotaExceeded\)\{ autoFillStop\(/.test(고리), true);

// ④ 멈추는 길이 모두 문을 지나는가 — 개수로 못 박는다
const 문쓰임 = (고리.match(/autoFillStop\(/g) || []).length;
봄('고리 안의 멈추는 길이 여섯이다', 문쓰임, 6);

// ⑤ 켜져 있을 때만 다음 바퀴를 돈다
봄('꺼졌으면 다음 바퀴를 안 건다', 고리.includes('if(st.on) autoFillLater();'), true);

// ⑥ 죽은 상수를 안 남긴다 — 남기면 다음 사람이 «쓰이는 줄» 알고 고친다
봄('쓰지 않는 AUTOFILL_IDLE 을 지웠다', html.includes('AUTOFILL_IDLE'), false);

console.log(흠 ? '🔴 ' + 흠 + '개 어긋남 (' + 잼 + '개 중)' : '통과 ' + 잼 + '개');
process.exit(흠 ? 1 : 0);
