// 검토 시험지 «이어받기» 검사 — 토큰을 한 개도 안 쓰고 잰다
//
// 🔵 왜 검사가 필요한가 — SCENE 3 은 한 건이 3700토큰이라 하루 20만 토큰(TPD)으로
//   54제밖에 못 본다. 60제 시험지를 이틀에 나눠 끝내려면 «어제 받은 답»을 다시 써야 하는데,
//   그 자리가 조용히 틀리면 점수가 통째로 거짓이 된다. 그래서 셋을 못 박는다:
//   ① --resume 을 붙여도 모델 이름을 안 잃는가
//   ② 기록에서 «답»만 이어받고 «못 잰 것»(흠)은 안 이어받는가
//   ③ 하루 토큰이 바닥난 429 를 알아보고, 그냥 붐빈 429 와는 가르는가
//
// ⚠ 검사는 «망가뜨려» 문다 — 조각을 실제 소스에서 떼어 쓴다. 베껴 쓰면 소스가 바뀌어도 통과한다.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'tools', 'review-bench.mjs'), 'utf8').replace(/\r\n/g, '\n');
let 틀림 = 0;
const 본다 = (이름, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  if (!같다) 틀림++;
  console.log((같다 ? '  ✅ ' : '  🔴 ') + 이름
    + (같다 ? '' : '\n       바란 것 ' + JSON.stringify(바란것) + '\n       잰 것   ' + JSON.stringify(잰것)));
};

/* ── ① 손잡이 셈 — --resume 뒤에 온 모델을 잃지 않는가 ───────────── */
{
  const 시작 = src.indexOf('const 인자 = process.argv.slice(2);');
  const 끝 = src.indexOf('\n', src.indexOf('홀손잡이.has(인자[i - 1])));', 시작));
  const 조각 = src.slice(시작, 끝).replace('process.argv.slice(2)', '준인자');
  const 고르기 = new Function('준인자', 조각 + '; return 모델들;');

  본다('--n 뒤의 값은 모델이 아니다', 고르기(['groq:a', '--n', '60']), ['groq:a']);
  본다('--resume 뒤의 모델은 살아남는다', 고르기(['--resume', 'groq:a']), ['groq:a']);
  본다('--resume 은 그 자체가 모델이 아니다', 고르기(['groq:a', '--resume']), ['groq:a']);
  본다('섞여 있어도 모델 둘만 고른다',
    고르기(['--resume', 'groq:a', 'cerebras:b', '--scene', '3', '--n', '60']), ['groq:a', 'cerebras:b']);
}

/* ── ② 이어받기 — 기록에서 무엇을 가져오나 ────────────────────────── */
{
  const 시작 = src.indexOf('const 이어 = process.argv.includes');
  const 끝 = src.indexOf('/* ── 돌린다', 시작);
  if (시작 < 0 || 끝 < 0) { console.log('  🔴 이어받기 조각을 못 찾았다'); 틀림++; }
  else {
    const 조각 = src.slice(시작, 끝)
      .replace("process.argv.includes('--resume')", '준이어')
      .replace(/console\.log\([^;]*\);/g, '');
    const 방 = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-resume-'));
    const 적기 = (파일, 줄들) => fs.writeFileSync(path.join(방, 파일),
      줄들.map((r) => JSON.stringify(r)).join('\n') + '\n');
    적기('2026-09-06.jsonl', [
      { model: 'groq:m', code: 'A-1', 정답: '②', 낸답: '②' },
      { model: 'groq:m', code: 'A-2', 정답: '3', 낸답: null, 흠: 'http 429 tokens per day' },
      { model: 'groq:m', code: 'A-3', 정답: '5', 낸답: '4' },
      // ⚠ 흠인데 답이 «적혀 있는» 줄 — 지금 도구는 이런 줄을 안 남기지만, 막는 자리가
      //   `!r.낸답` 하나뿐이면 나중에 도구가 답을 같이 남기는 순간 조용히 새어 든다.
      //   그래서 검사에 일부러 둔다(이 줄이 없으면 `r.흠 ||` 를 지워도 검사가 안 문다).
      { model: 'groq:m', code: 'A-5', 정답: '9', 낸답: '9', 흠: 'http 429 tokens per minute' },
      { model: 'cerebras:m', code: 'A-1', 정답: '②', 낸답: '①' },
    ]);
    적기('2026-09-07.jsonl', [
      { model: 'groq:m', code: 'A-1', 정답: '②', 낸답: '③' },   // 같은 자리를 다시 쟀다
      { model: 'groq:m', code: 'A-4', 정답: '7', 낸답: '7' },
    ]);
    const 읽기 = new Function('fs', 'path', '기록', '준이어', 조각 + '; return { 이어, 받아둔 };');
    const 켬 = 읽기(fs, path, path.join(방, '2026-09-07.jsonl'), true);
    const 끔 = 읽기(fs, path, path.join(방, '2026-09-07.jsonl'), false);

    본다('--resume 없이는 아무것도 안 읽는다', 끔.받아둔, {});
    본다('흠은 이어받지 않는다 (A-2 가 빠진다)',
      Object.keys(켬.받아둔['groq:m']).sort(), ['A-1', 'A-3', 'A-4']);
    본다('같은 자리를 다시 쟀으면 «나중 것»이 이긴다', 켬.받아둔['groq:m']['A-1'].낸답, '③');
    본다('다른 곳(cerebras)의 답은 groq 에 섞이지 않는다',
      켬.받아둔['cerebras:m']['A-1'].낸답, '①');
    fs.rmSync(방, { recursive: true, force: true });
  }
}

/* ── ③ 바닥난 429 와 그냥 붐빈 429 를 가르는가 ───────────────────── */
//
// 🔴 이 자리가 09-07 에 한 번 죽어 있었다 — 판정을 «90자로 자른 흠 글자»에서 했는데
//   `on tokens per day (TPD)` 는 그 뒤에 나온다. 그래서 바닥이 나도 영영 못 물고,
//   90초 쉬기를 세 번씩 되풀이하며 남은 문항을 전부 「못 잼」으로 갈아 버렸다.
//   그래서 여기서 둘을 다 못 박는다 — ⓐ 온 말로 가리는가 ⓑ 자른 값을 다시 안 보는가.
{
  const 줄 = src.split('\n').find((t) => t.includes('const 바닥 = ') && t.includes('test(t)'));
  if (!줄) { console.log('  🔴 바닥 가리는 자리를 못 찾았다'); 틀림++; }
  else {
    const 재는가 = new Function('t', 'return !!(' + 줄.trim().replace(/^const 바닥 = /, '').replace(/;$/, '') + ');');
    const 진짜말 = '{"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization'
      + ' `org_01m1vfpm15ef3a0sp7wpmdd883` service tier `on_demand` on tokens per day (TPD):'
      + ' Limit 200000, Used 199658, Requested 1410. Please try again in 7m41.376s.';
    본다('Groq 의 «온» 하루 한도 말을 알아본다', 재는가(진짜말), true);
    본다('🔴 90자로 잘라도 알아보는가 — 자른 값으로는 못 문다(그래서 자르기 «전»에 가린다)',
      재는가(진짜말.replace(/\s+/g, ' ').slice(0, 90)), false);
    본다('분당 한도(TPM)는 바닥이 아니다 — 기다리면 풀린다',
      재는가('Rate limit reached ... on tokens per minute (TPM): Limit 8000, Used 7900'), false);
    본다('붐빔(503)도 바닥이 아니다', 재는가('{"error":{"message":"service unavailable"}}'), false);
  }
  본다('멈추는 셈이 «자른 글자»를 보지 않는다',
    /if \(r\.바닥\) \{/.test(src) && !/test\(r\.흠\)/.test(src), true);
}

console.log(틀림 ? '\n  🔴 ' + 틀림 + '개 틀렸다\n' : '\n  ✅ 전부 통과\n');
process.exit(틀림 ? 1 : 0);
