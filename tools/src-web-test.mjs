// 브라우저가 «딱지에서» 코드를 매기는 길 — node 로 그대로 재 본다 (2026-09-06)
//
//   node tools/src-web-test.mjs ["<주기나 교재.hwpx>"]
//
// 사용자 요청 — 「브라우저에서도 되게 만든다」. 여태 모의고사 기출(②꼴 `1230928UP01`)은
// node 도구 두 줄로만 담겼다. 웹에서 올려도 같은 코드가 나와야 한다.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** hwpx.js 와 index.html 에서 그대로 떠 온다 —
//   옮겨 적으면 검사는 통과하는데 화면은 틀리는 일이 생긴다(firestore-probe 가 그랬다).
// ⚠ 실제 hwpx 를 안 주면 «파일 없이 되는 것»만 재고 넘어간다 — 그때는 그렇다고 말한다.

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { sectionDocs, loadHwpxRules } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

function lift(name){
  const at = html.indexOf('function ' + name + '(');
  if(at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for(let j = html.indexOf('{', at); j < html.length; j++){
    if(html[j] === '{') depth++;
    else if(html[j] === '}'){ depth--; if(!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
function 떠오기(시작, 끝표){
  const a = html.indexOf(시작);
  if(a < 0) throw new Error('못 찾음: ' + 시작);
  const b = html.indexOf(끝표, a);
  return html.slice(a, b + 끝표.length);
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

// ── 화면 함수를 떠 온다 ────────────────────────────────────────────────
const 화면 = new Function('UNIT_CHAPTER_DEFS', 'CODE_SUBJECTS',
  lift('codeOfSubjectName') + NL + lift('srcChapterFromFileName') + NL +
  'return { srcChapterFromFileName };')(
  new Function(떠오기('const UNIT_CHAPTER_DEFS = {', NL + '};') + ' return UNIT_CHAPTER_DEFS;')(),
  new Function(떠오기('const CODE_SUBJECTS = {', '};') + ' return CODE_SUBJECTS;')());

console.log(NL + '① 파일 이름에서 단원을 읽는다 (node 의 source-code.mjs 와 같은 규칙)' + NL);
{
  const f = 화면.srcChapterFromFileName;
  const r = f('[2026][주기나][1-2중간][1.평면좌표].hwpx');
  봄('평면좌표를 읽는다', [r.ok, r.subject, r.chapter], [true, 'K2', '01']);
  봄('단원 이름은 «우리 단원표»의 것', r.chapterName, '평면좌표');
  /* 🔴 여기가 09-06에 잡은 자리 — node 쪽 정규식에 백슬래시가 빠져 있어 «글자 s»를 지우고
     있었다. 그래서 띄어쓰기가 다른 단원은 전부 「안 맞는다」로 멈췄다. 01 만 우연히 통과했다. */
  봄('🔴 띄어쓰기가 달라도 같은 단원이다', 화면.srcChapterFromFileName('[2026][주기나][1-2중간][2.직선의방정식].hwpx').chapter, '02');
  봄('🔴 03 도', 화면.srcChapterFromFileName('[2026][주기나][1-2중간][3.원의방정식].hwpx').chapter, '03');
  봄('🔴 04 도', 화면.srcChapterFromFileName('[2026][주기나][1-2중간][4.도형의이동].hwpx').chapter, '04');
  봄('마지막 대괄호를 본다', 화면.srcChapterFromFileName('[1.평면좌표][2026][5.집합].hwpx').chapter, '05');
  봄('🔴 우리 단원표에 없으면 멈춘다', 화면.srcChapterFromFileName('[2026][9.틀린단원].hwpx').ok, false);
  봄('🔴 번호.이름 칸이 없어도 멈춘다', 화면.srcChapterFromFileName('[2026][주기나].hwpx').ok, false);
  봄('멈출 때는 까닭을 말한다', 화면.srcChapterFromFileName('[2026][주기나].hwpx').흠.length > 10, true);
}

// ── 실제 파일로 맞대 본다 ──────────────────────────────────────────────
const SRC = process.argv[2] || '';
if(!SRC){
  console.log(NL + '② 실제 hwpx 는 안 줬다 — 딱지 읽기는 건너뛴다' + NL);
  console.log('    쓰는 법: node tools/src-web-test.mjs "<주기나 교재.hwpx>"');
} else {
  console.log(NL + '② 실제 파일 — 브라우저가 하는 그대로 (SHA-256 → 딱지 → 코드 → 문항)' + NL);
  const R = loadHwpxRules();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'srcweb-'));
  execFileSync('unzip', ['-qo', SRC, '-d', tmp]);
  /* ⚠ 브라우저는 `content.hpf` 에 적힌 그림을 «다 » 읽어 SHA-256 을 뜬다. 여기서도 그대로 한다 —
     문항이 가리키는 것만 읽으면 딱지를 못 알아본다(딱지는 떠 있는 개체라 목록에 안 들어올 수 있다). */
  const hpf = fs.readFileSync(path.join(tmp, 'Contents', 'content.hpf'), 'utf8');
  const 해시표 = {};
  for(const m of hpf.matchAll(/id="([^"]+)"[^>]*href="([^"]+)"/g)){
    const f = path.join(tmp, decodeURIComponent(m[2]));
    if(fs.existsSync(f) && fs.statSync(f).isFile())
      해시표[m[1]] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 32);
  }
  const docs = sectionDocs(SRC);
  const 딱지 = R.hwpxSourceBadges(docs, r => 해시표[r] || '');
  const r = R.hwpxMakeSourceCodes(딱지);
  봄('미주·출처·딱지가 셋 다 같은 수', [딱지.셈.미주, 딱지.셈.출처, 딱지.셈.딱지], [71, 71, 71]);
  봄('코드를 냈다', r.ok, true);
  봄('코드 71개', r.codes.length, 71);
  /* 🔴 `codesAll` 은 «미주 차례»에 맞춘 줄이다 — `codes` 를 그대로 쓰면 목차가 섞이는 파일에서 밀린다. */
  봄('🔵 미주 차례에 맞춘 줄도 71개', r.codesAll.length, 71);

  const { problems, watermarkedCount, watermarked } = R.hwpxProblemsFromDocs(docs, { codes: r.codesAll });
  봄('🔴 워터마크 2문항은 걸러진다', watermarkedCount, 2);
  /* 🔵 **덩이는 70이고 코드가 붙는 것은 69다** — 교재 맨 앞의 목차·표지가 첫 미주보다 앞이라
     한 덩이가 «미주 없이» 잡힌다(09-05에 다섯 파일 전부에서 본 그것이다).
     🔴 **이 한 칸이 이 검사의 핵심이다.** 목차에 코드가 붙는 순간 그 뒤가 통째로 밀린다. */
  봄('덩이 70개 (맨 앞 목차 한 덩이 포함)', problems.length, 70);
  봄('🔴 맨 앞 목차에는 코드가 «안» 붙는다', problems[0].itemCode, '');
  봄('🔴 나머지 69개에 전부 붙었다', problems.filter(p => p.itemCode).length, 69);
  /* 🔴 걸러지는 것이 앞에 섞여 있으니, 붙이는 자리가 «거르기 뒤»였으면 여기서 밀렸을 것이다.
     걸린 문항의 이름을 댈 수 있는 것도 코드가 먼저 붙었기 때문이다. */
  봄('🔵 걸린 문항의 «이름»을 댄다', watermarked, ['1230928NC01', '1140927UP01']);

  const 장부 = JSON.parse(fs.readFileSync(path.join(ROOT, 'codes/K2-J.json'), 'utf8')).items.map(i => i.code);
  봄('🔴 장부와 코드 대 코드로 같다', r.codes, 장부);
  const 난것 = problems.map(p => p.itemCode).filter(Boolean);
  봄('🔴 문항에 붙은 코드도 장부 차례 그대로 (걸린 둘만 빠진다)',
     난것, 장부.filter(c => c !== '1230928NC01' && c !== '1140927UP01'));
  봄('본문이 빈 문항은 없다', problems.filter(p => !p.content || !p.content.trim()).length, 0);

  /* 🔵 **코드가 이미 심겨 있으면 딱지가 이기지 못한다** — 미주에서 읽은 것이 언제나 먼저다. */
  const 다른줄 = r.codesAll.map(() => '9999999OR');
  const 심긴것 = R.hwpxProblemsFromDocs(docs, { codes: 다른줄 });
  봄('밖에서 준 줄을 그대로 쓴다 (목차 다음이 첫 문항)', 심긴것.problems[1].itemCode, '9999999OR');
  const 그냥 = R.hwpxProblemsFromDocs(docs);
  봄('🔵 코드를 안 주면 예전 그대로 (붙는 코드 0개)', 그냥.problems.filter(p => p.itemCode).length, 0);
  봄('🔵 코드를 안 줘도 덩이 수는 그대로', 그냥.problems.length, 70);

  /* 🔴 수가 하나라도 다르면 아예 안 붙인다 — 짐작한 코드는 없는 것보다 나쁘다. */
  const 짧은줄 = r.codesAll.slice(0, 70);
  봄('🔴 수가 다르면 한 개도 안 붙인다',
     R.hwpxProblemsFromDocs(docs, { codes: 짧은줄 }).problems.filter(p => p.itemCode).length, 0);
}

// ── 창고 목록이 장부와 창고를 «둘 다» 보는가 ────────────────────────────
console.log(NL + '③ 창고 목록 — 브라우저로 올린 기출이 목록에 서는가' + NL);
{
  const 짐 = 떠오기('const ITEM_CODE_RE', NL) + NL +
             떠오기('const SRC_CODE_RE', "DW:'하향' };") + NL +
             lift('srcCodeInfo') + NL + lift('chapterInfoFromItemCode') + NL +
             lift('itemOfCode') + NL + lift('storeItems') + NL +
             lift('storeSubjectCode') + NL + lift('storeMatches');
  const 만들기 = (state) => new Function('state', 'CODE_SUBJECTS', 'chapterNameOfNo', 'BOOK_OF_CODE',
    짐 + NL + 'return { storeItems, storeSubjectCode, storeMatches };')(
    state, { K2: '공통수학2' }, () => '평면좌표', { E: '엔딩크레딧', J: '모의고사 기출' });

  const 장부 = { 'K2-01-E-0001': { code: 'K2-01-E-0001', subject: 'K2', chapter: '01', source: { book: '엔딩크레딧' } } };
  const 창고 = {
    'K2-01-E-0001': { code: 'K2-01-E-0001', content: '본문' },       // 장부에도 있는 것 — 한 번만 세야 한다
    '1230928OR':    { code: '1230928OR', content: '본문', subject: 'K2', chapter: '01',
                      chapterName: '평면좌표', badge: 'OR', source: { book: '모의고사 기출' } },
    '1230928NC01':  { code: '1230928NC01', content: '본문', subject: 'K2', chapter: '01',
                      chapterName: '평면좌표', badge: 'NC', source: { book: '모의고사 기출' } },
    'kv:something': { code: 'kv:something' },                        // 코드 꼴이 아닌 것
  };
  const F = 만들기({ itemByCode: 장부, itemBody: 창고 });
  const 목록 = F.storeItems();
  /* 🔴 여기가 09-06에 고친 자리 — 목록이 장부만 보고 있어서, 브라우저로 올린 기출은
     **담기는 됐는데 목록에 안 떴다.** 사람에게는 「안 담겼다」로 읽힌다. */
  봄('🔴 창고에만 있는 기출도 목록에 선다', 목록.map(x => x.code).sort(), ['1230928NC01', '1230928OR', 'K2-01-E-0001']);
  봄('🔴 장부와 창고에 다 있는 것은 한 번만', 목록.filter(x => x.code === 'K2-01-E-0001').length, 1);
  봄('⚠ 코드 꼴이 아닌 열쇠는 안 들인다', 목록.some(x => x.code === 'kv:something'), false);
  봄('②꼴도 과목이 K2 로 잡힌다', 목록.filter(x => F.storeSubjectCode(x) === 'K2').length, 3);
  /* 🔴 `chapter` 가 이름('평면좌표')이면 여기서 0개가 나온다 — 단원을 고르면 통째로 사라진다. */
  봄('🔴 단원 01 로 걸러도 셋 다 남는다', 목록.filter(x => F.storeMatches(x, 'K2', '01')).length, 3);
  봄('🔵 「모의고사 기출」로 거르면 둘', 목록.filter(x => (x.source || {}).book === '모의고사 기출').length, 2);
  봄('장부가 비어 있어도 창고만으로 선다', 만들기({ itemByCode: {}, itemBody: 창고 }).storeItems().length, 3);
}

console.log(`${NL}  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패${NL}`);
process.exit(fail ? 1 : 0);
