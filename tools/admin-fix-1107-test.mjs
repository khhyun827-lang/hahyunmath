// 11-07 코덱스 검토 빠른 수정 — 문항 요청 재처리 · 일괄 대상 · 그림 교체 순서.
// 함수는 index.html 에서 그대로 떠 온다.
import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function lift(name){
  let at = html.indexOf('function ' + name + '(');
  if(at < 0) throw new Error(name);
  if(html.slice(at - 6, at) === 'async ') at -= 6;
  let d = 0;
  for(let j = html.indexOf('{', at); ; j++){
    if(html[j] === '{') d++;
    else if(html[j] === '}' && !--d) return html.slice(at, j + 1);
  }
}
const box = (names, args, vals) => new Function(...args, names.map(lift).join('\n') + `\nreturn {${names}};`)(...vals);
const noop = () => {};

/* ① 일부만 실패 → 줄은 섰어도 실패한 학생의 부름이 남고, 다시 세우면 끝난다 */
{
  const ask = { examId:'e1', qkey:'0-3', at:'2026-11-01' };
  const recs = { a:{ bankAsks:[ask], wrongHomework:[] }, b:{ bankAsks:[ask], wrongHomework:[] } };
  const state = { allRecords: recs };
  let 막힌 = 'b';
  const DATA = { exams:[{ id:'e1', title:'t', questions:[{ no:3, qkey:'0-3', itemCode:'X' }] }], problemBank:[] };
  const F = box(['bankAsksOf','bankAskPending','bankAskAccept'],
    ['DATA','state','showToast','render','examRootId','splitItemCode','storeEnsure','findBankEntry','codeVariantFor','dbSetDoc','loadRecord','saveRecordAsTeacher','logAudit','notifyWrongReady','bankAskLabelOf','todayStr'],
    [DATA, state, noop, noop, x=>x, ()=>null, async()=>true, () => DATA.problemBank[0], ()=>null, async()=>true,
     async s => recs[s], async s => s !== 막힌, async()=>{}, noop, ()=>'', ()=>'d']);
  await F.bankAskAccept('e1','0-3');
  assert.equal(DATA.problemBank.length, 1);
  assert.deepEqual(F.bankAskPending().map(g => g.who), [['b']], '실패한 학생만 남는다');
  assert.equal(recs.b.wrongHomework.length, 0, '실패한 학생 메모리는 되돌린다');
  막힌 = '';
  await F.bankAskAccept('e1','0-3');
  assert.equal(F.bankAskPending().length, 0);
  assert.equal(recs.b.wrongHomework.length, 1);
  assert.equal(DATA.problemBank.length, 1, '줄을 또 세우지 않는다');
}

/* ② AI 일치 통과는 지금 칸의 것만 */
{
  const vs = [{ code:'A', 칸:'agree' }, { code:'B', 칸:'fig' }];
  const state = { reviewSub:'agree', reviewQueue:'pending' };
  const 쓴것 = [];
  globalThis.confirm = () => true;
  const F = box(['reviewAutos','approveAgreedVariants'],
    ['state','pendingVariants','reviewSubOf','agreedPassable','render','showToast','dbSetDoc','nowStamp','fillEmptyFromStore'],
    [state, () => vs, v => v.칸, l => l, noop, noop, async (c, id) => { 쓴것.push(id); return true; }, ()=>'n', async()=>({})]);
  await F.approveAgreedVariants();
  assert.deepEqual(쓴것, ['A']);
}

/* ③ 그림 교체 — 저장이 실패하면 옛 파일을 안 지운다 · 성공하면 저장 뒤에 지운다 */
{
  const run = async (dbSet, dbSetDoc) => {
    const 차례 = [];
    const b = { id:'p', hasVariantImage:true };
    const F = box(['putVariantFigure'],
      ['state','dbGet','dbSet','dbSetDoc','deleteFromDrive','imgFileIdOf','pbImgCacheKey'],
      [{ pbImageCache:{} }, async()=>({ fileId:'old' }),
       async()=>{ 차례.push('set'); return dbSet; }, async()=>{ 차례.push('doc'); return dbSetDoc; },
       id => 차례.push('del:' + id), x => x && x.fileId, ()=>'k']);
    let 던짐 = false;
    await F.putVariantFigure(b, { fileId:'new' }).catch(() => { 던짐 = true; });
    return { 차례, 던짐, b };
  };
  const ok = await run(true, true);
  assert.deepEqual(ok.차례, ['set','doc','del:old']);
  const bad = await run(null, true);
  assert.deepEqual(bad.차례, ['set']); assert.ok(bad.던짐); assert.ok(bad.b.hasVariantImage);
}
console.log('✓ admin-fix-1107');
