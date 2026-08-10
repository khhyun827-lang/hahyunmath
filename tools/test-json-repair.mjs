/* 워커의 JSON 복구 함수(parseModelJson)만 떼어 내 돌린다 — 배포 없이 여기서 판정할 수 있다.
   무엇을 지키는 시험인가는 worker/gemini-proxy.js의 「모델이 낸 JSON 읽기」 머리말에 있다.
   요지는 둘이다 — "$\alpha$"는 파싱이 터지고, "$\frac{}{}$"는 **안 터지고 조용히 깨진다.**
   뒤쪽이 더 나빠서(검토를 지나 학생에게 간다) 옛 동작까지 재현해 확인한다.

   쓰는 법:  node tools/test-json-repair.mjs        (저장소 어디서 돌려도 된다) */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(join(HERE, '..', 'worker', 'gemini-proxy.js'), 'utf8');
const start = src.indexOf('const MANGLED');
const end = src.indexOf('/* =================== 기존 Gemini');
if (start < 0 || end < 0) { console.error('함수를 못 찾았다'); process.exit(1); }
const mod = src.slice(start, end) + '\nexport { repairJsonEscapes, parseModelJson };';
const { parseModelJson } = await import('data:text/javascript,' + encodeURIComponent(mod));

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log((ok ? 'ok  ' : 'FAIL') + '  ' + name +
    (ok ? '' : '\n      got  ' + JSON.stringify(got) + '\n      want ' + JSON.stringify(want)));
};

const BS = '\\';          // 역슬래시 한 개
const FORMFEED = '\u000C', TAB = '\u0009';

// ① 제대로 이스케이프한 응답은 손대지 않는다
t('정상 응답은 그대로',
  parseModelJson('{"problem":"$' + BS + BS + 'alpha+' + BS + BS + 'beta$","answer":"6"}'),
  { problem: '$' + BS + 'alpha+' + BS + 'beta$', answer: '6' });

// ② 터지던 쪽 — \a 는 JSON에 없는 이스케이프 (2026-08-11에 실제로 겪은 502)
t('터지던 것을 살린다 (' + BS + 'alpha)',
  parseModelJson('{"problem":"해는 $' + BS + 'alpha< x < ' + BS + 'beta$이다","answer":"20"}'),
  { problem: '해는 $' + BS + 'alpha< x < ' + BS + 'beta$이다', answer: '20' });

// ③ 조용히 깨지던 쪽 — \f 가 폼피드로 읽혀 파싱은 통과한다
const silent = '{"problem":"$' + BS + 'frac{1}{2}$와 $' + BS + 'times$","answer":"3"}';
t('옛 동작 확인 — 안 터지고 깨진다', JSON.parse(silent).problem,
  '$' + FORMFEED + 'rac{1}{2}$와 $' + TAB + 'imes$');
t('조용히 깨지던 것을 고친다', parseModelJson(silent),
  { problem: '$' + BS + 'frac{1}{2}$와 $' + BS + 'times$', answer: '3' });

// ④ figureSpec의 줄바꿈은 살아 있어야 한다 (역슬래시가 깨진 응답 안에서도)
t('줄바꿈 보존',
  parseModelJson('{"figureSpec":"1. $' + BS + 'alpha$' + BS + 'n2. 둘"}').figureSpec,
  '1. $' + BS + 'alpha$\n2. 둘');

// ⑤ 문자열 안의 따옴표를 잘못 읽으면 문자열 끝을 놓친다
t('이스케이프된 따옴표',
  parseModelJson('{"problem":"그는 ' + BS + '"$' + BS + 'sqrt{2}$' + BS + '"라 했다"}').problem,
  '그는 "$' + BS + 'sqrt{2}$"라 했다');

// ⑥ \uXXXX 는 유니코드로, \underline 은 LaTeX로 — 둘을 갈라야 한다
t(BS + 'u 구분',
  parseModelJson('{"a":"' + BS + 'u00e9","b":"$' + BS + 'underline{AB}$"}'),
  { a: 'é', b: '$' + BS + 'underline{AB}$' });

// ⑦ 실제로 502가 났던 응답의 모양 (figureSpec까지 있는 전체)
t('실제 실패 응답 모양',
  parseModelJson('{"mode":"figure","problem":"$' + BS + 'alpha+' + BS + 'beta$의 값은?",' +
    '"answer":"20","solution":"1. $f(x)<0$의 해는 $x<-2$","figureSpec":"1. 달라지는 것: $x$절편이 $-4, 2$' + BS + 'n2. 그대로: 축"}').figureSpec,
  '1. 달라지는 것: $x$절편이 $-4, 2$\n2. 그대로: 축');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
