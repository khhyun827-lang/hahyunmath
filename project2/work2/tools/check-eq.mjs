// 추출된 평문 안의 $…$ 수식이 구조적으로 온전한지 훑는다.
// (KaTeX 가 없으므로 «반드시 깨지는» 조건만 본다 — 괄호짝 · left/right 짝 · 남은 키워드)
import fs from 'fs';

let tot = 0, bad = 0;
const samples = [];
const leftover = {};

for (const f of fs.readdirSync('text')) {
  const s = fs.readFileSync('text/' + f, 'utf8');
  for (const m of s.matchAll(/\$([^$]*)\$/g)) {
    tot++;
    const e = m[1];
    const ob = (e.match(/(?<!\\)\{/g) || []).length;
    const cb = (e.match(/(?<!\\)\}/g) || []).length;
    const l = (e.match(/\\left/g) || []).length;
    const r = (e.match(/\\right/g) || []).length;
    if (ob !== cb || l !== r) {
      bad++;
      if (samples.length < 8) samples.push(`[${f}] ${e.slice(0, 100)}`);
    }
    // 변환이 안 된 채 남은 대문자 덩어리 = 내가 놓친 키워드
    for (const w of e.match(/(?<!\\)\b[A-Z]{3,}\b/g) || []) leftover[w] = (leftover[w] || 0) + 1;
  }
}
console.log('수식 총', tot, '· 구조가 깨진 것', bad, `(${(bad / tot * 100).toFixed(2)}%)`);
samples.forEach((x) => console.log('  ', x));
const lo = Object.entries(leftover).sort((a, b) => b[1] - a[1]);
console.log('변환 안 된 대문자 토큰', lo.length, ':', lo.slice(0, 25).map(([k, v]) => k + ':' + v).join(' '));
