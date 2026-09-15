/* 질의응답 — 답을 여러 번 다는 것이 제대로 그려지는지 본다 (2026-09-16).
 *
 * 왜 프로브인가 — 이 갈래는 **답이 이미 달린 질문**이 있어야 눈에 보인다. 배포본에서 만들어 보려면
 * 학생 계정으로 묻고 강사로 답하고 또 답해야 하는데, 그 사이 읽기 한도를 쓴다.
 * 그래서 `index.html` 에서 **그리는 함수만 뽑아** 여기서 굴린다.
 *
 * 쓰는 법:  node tools/qna-answers-probe.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const 뿌리 = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(뿌리, 'index.html'), 'utf8');

/* 이름으로 함수 한 덩이를 뽑는다 — 중괄호를 세어 끝을 찾는다. */
function 함수뽑기(이름){
  const 시작 = html.indexOf('function ' + 이름 + '(');
  if(시작 < 0) throw new Error('못 찾았다: ' + 이름 + ' — 이름이 바뀌었나?');
  let i = html.indexOf('{', 시작), 깊이 = 0;
  for(; i < html.length; i++){
    if(html[i] === '{') 깊이++;
    else if(html[i] === '}'){ 깊이--; if(깊이 === 0) return html.slice(시작, i + 1); }
  }
  throw new Error('끝을 못 찾았다: ' + 이름);
}

const 이름들 = ['qnaMoreAnswersOf', 'qnaHasAnyAnswer', 'qnaAnswerBubblesHTML', 'qnaAnswerFormHTML', 'qnaAnswerNotesHTML'];
const 받침 = `
  const escHtml = s => String(s == null ? '' : s);
  const imgSrcOf = x => (x && x.src) || '';
  const state = { qnaAnswerImage: {} };
  const qnaImageFieldHTML = () => '<사진칸>';
`;
const 짓기 = new Function(받침 + 이름들.map(함수뽑기).join('\n') +
  '\nreturn {' + 이름들.join(',') + '};');
const H = 짓기();

let 틀린것 = 0;
const 봄 = (이름, 참인가) => { if(!참인가) 틀린것++; console.log((참인가 ? '  ✅ ' : '  ❌ ') + 이름); };

/* ── ① 아직 답이 없다 ── */
{
  const q = { id:'qn1', question:'왜 이렇게 되나요?' };
  const 칸 = H.qnaAnswerFormHTML(q), 학생 = H.qnaAnswerNotesHTML(q);
  console.log('① 답이 없는 질문');
  봄('학생에게 「아직 답변이 등록되지 않았습니다」', 학생.includes('아직 답변이 등록되지 않았습니다'));
  봄('강사 칸 이름은 「답변」', /<span>답변<\/span>/.test(칸));
  봄('강사 말풍선은 없다', H.qnaAnswerBubblesHTML(q) === '');
}

/* ── ② 답이 하나 — 예전에는 여기서 칸이 사라졌다 ── */
{
  const q = { id:'qn2', question:'묻습니다', answer:'이렇게 푸는 거예요', answeredAt:'2026-09-16' };
  const 칸 = H.qnaAnswerFormHTML(q);
  console.log('② 답이 하나 (고친 자리)');
  봄('🔴 답이 있어도 강사 칸이 남는다', 칸.includes('<textarea id="answer-qn2"'));
  봄('칸 이름이 「답변 더 달기」', 칸.includes('답변 더 달기'));
  봄('말풍선 하나', (H.qnaAnswerBubblesHTML(q).match(/qn-msg me/g) || []).length === 1);
  봄('아직 「답변 추가」 딱지는 없다', !H.qnaAnswerBubblesHTML(q).includes('답변 추가'));
  봄('학생에게 답이 보인다', H.qnaAnswerNotesHTML(q).includes('이렇게 푸는 거예요'));
}

/* ── ③ 답을 둘 더 달았다 ── */
{
  const q = { id:'qn3', question:'묻습니다', answer:'첫 답', answeredAt:'2026-09-16',
              moreAnswers:[{text:'덧붙이면', image:null, at:'2026-09-16'},
                           {text:'그리고 또', image:{src:'x.png'}, at:'2026-09-17'}] };
  const 풍선 = H.qnaAnswerBubblesHTML(q), 학생 = H.qnaAnswerNotesHTML(q);
  console.log('③ 답이 셋');
  봄('강사 말풍선 셋', (풍선.match(/qn-msg me/g) || []).length === 3);
  봄('그중 둘에 「답변 추가」 딱지', (풍선.match(/답변 추가/g) || []).length === 2);
  봄('차례가 첫 답 → 덧붙이면 → 그리고 또',
     풍선.indexOf('첫 답') < 풍선.indexOf('덧붙이면') && 풍선.indexOf('덧붙이면') < 풍선.indexOf('그리고 또'));
  봄('학생도 셋 다 본다', ['첫 답','덧붙이면','그리고 또'].every(s => 학생.includes(s)));
  봄('더 단 답의 사진도 나온다', 학생.includes('x.png'));
  봄('「아직 답변이…」는 안 뜬다', !학생.includes('아직 답변이'));
}

/* ── ④ 추가 질문 문서도 똑같이 쌓인다 ── */
{
  const f = { id:'qf1', kind:'followup', parentId:'qn3', question:'그래도 모르겠어요' };
  봄('④ 추가 질문의 빈 칸 이름은 「추가 질문에 답변」', H.qnaAnswerFormHTML(f).includes('추가 질문에 답변'));
  f.answer = '이 부분을 보세요';
  봄('④ 답이 달리면 「답변 더 달기」로 바뀐다', H.qnaAnswerFormHTML(f).includes('답변 더 달기'));
}

/* ── ⑤ 일부러 망가뜨려 — 검사가 무는지 ── */
{
  const 망가진 = { id:'x', answer:'하나', moreAnswers:'배열이 아니다' };
  봄('⑤ moreAnswers 가 배열이 아니면 무시한다(안 터진다)',
     H.qnaAnswerBubblesHTML(망가진).includes('하나') && !H.qnaAnswerBubblesHTML(망가진).includes('배열이'));
}

console.log(틀린것 ? ('❌ ' + 틀린것 + '개 틀렸다') : '✅ 전부 통과');
process.exit(틀린것 ? 1 : 0);
