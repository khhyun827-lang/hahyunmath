// hwpclip.js — 여러 문항 합치기 검사 (2026-10-14)
//   node tools/hwpclip-test.mjs
// 실제 한글로 붙여 본 것은 10-14 실험(구역 정의를 떼야 한 쪽에 이어지고, 번호 정의가 하나여야 001·002 로 센다).
// 여기서는 그 규칙이 지켜지는지만 본다 — 열쇠 안 겹침 · 사슬 이음 · secd/cold 뗌 · 같은 모양 접기 · 주석 안 깨짐.
import fs from 'fs';
import path from 'path';
import { 가짜원본, 가짜변형, CI } from './hwpclip-fake.mjs';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const H = new Function(fs.readFileSync(path.join(ROOT, 'hwpclip.js'), 'utf8')
  + '\nreturn {hwpClipMerge, hwpClipHTML, latexToHwpEq, hwpClipFromVariant, hwpPointNames};')();

const K = n => n.toString(16).toUpperCase().padStart(24, '0');
// 한글이 내는 꼴을 줄인 것 — 문단 둘(p1→p2), 첫 문단에 secd·cold·표, 번호 정의 하나, 그림 하나
const clip = (txt) => ({
  documentPr: {}, dh: {},
  nu: { [K(1)]: { id: 1, sn: 1, ph: [{ st: 1, sf: '00^1' }, { st: 1, sf: '^2.' }] } },
  pp: { [K(2)]: { id: 0, hi: K(1) } },
  st: { [K(3)]: { id: 0, pp: K(2), ns: K(3) } },
  cs: { [K(4)]: { cc: 2, ci: 1936024420 }, [K(5)]: { cc: 2, ci: 1668246628 }, [K(6)]: { cc: 11, ci: 1952607264 } },
  ro: { hp: K(7),
        [K(7)]: { np: K(8), pp: K(2), si: K(3), ru: [{ ch: [{ cc: 2, co: K(4) }, { cc: 2, co: K(5) }, { cc: 11, co: K(6) }] }] },
        [K(8)]: { np: '', pp: K(2), si: K(3), ru: [{ ch: [{ t: txt }] }] } },
  sl: {},
  bi: [{ ty: 'image/png', sr: K(9) + '.png' }],
  bidt: { [K(9) + '.png']: 'iVBOR' + txt },
});

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('✗', m); } else console.log('✓', m); };

const 셋째 = clip('셋');   // 다른 단원 — 시작 번호도 번호 모양도 다르다
Object.assign(Object.values(셋째.nu)[0], { sn: 431, ph: [{ st: 431, sf: '^1' }, { st: 1, sf: '^2.' }] });
셋째.nu[K(10)] = { id: 2, sn: 1, ph: [{ st: 1, sf: '^1.' }] };   // 문항 번호가 아닌 목록 번호 — 안 건드린다
Object.values(셋째.pp)[0].ah = 3;   // 번호 문단 모양이 정렬만 달라도 한글은 따로 센다(10-15 · 1·2·1·3) — 하나로 접혀야 한다
const m = H.hwpClipMerge([clip('하나 <a>'), clip('둘'), 셋째]);
// 사슬을 따라가며 글을 모은다
const 글 = [];
for (let k = m.ro.hp, n = 0; k && n < 50; k = m.ro[k].np, n++)
  for (const r of m.ro[k].ru) for (const c of r.ch) if (c.t) 글.push(c.t);
ok(글.join('|') === '하나 <a>|둘|셋', '본문 사슬이 차례대로 이어진다 — ' + 글.join('|'));
ok(!Object.values(m.cs).some(v => [1936024420, 1668246628].includes(v.ci)), '구역·단 정의(secd·cold)를 모두 뗐다');
ok(Object.values(m.cs).filter(v => v.ci === 1952607264).length === 3, '표 셋은 남았다');
ok(Object.keys(m.nu).length === 2, '문항 번호 정의가 하나로 접혔다(이어 세게) — 시작 번호·모양이 다른 단원이 섞여도');
const 번호 = Object.values(m.nu).filter(v => v.ph[0].sf !== '^1.');
ok(번호.length === 1 && 번호[0].sn === 1 && 번호[0].ph[0].st === 1, '묶음은 1번부터 센다(수준 시작값까지)');
ok(번호[0].ph[0].sf === '^1', '번호 모양은 1·2·3 (교재의 00^1·0^1 자리 맞춤은 한 정의로 못 한다)');
ok(Object.values(m.nu).some(v => v.ph[0].sf === '^1.'), '목록 번호(^1.)는 그대로 남는다');
ok(Object.keys(m.pp).length === 1 && Object.keys(m.st).length === 1, '같은 문단 모양·스타일도 하나로');
ok(Object.values(m.st)[0].ns === Object.keys(m.st)[0], '스타일의 «다음 스타일»은 제 열쇠를 가리킨다');
ok(m.bi.length === 3 && m.bi.every(b => m.bidt[b.sr]), '그림 셋이 제 바이트와 이어진다');
ok(new Set(m.bi.map(b => b.sr)).size === 3, '그림 열쇠가 안 겹친다');
const 참조 = JSON.stringify({ ...m, bidt: 0 }).match(/[0-9A-F]{24}/g);
const 정의 = new Set([...Object.keys(m.ro), ...Object.keys(m.cs), ...Object.keys(m.nu), ...Object.keys(m.pp), ...Object.keys(m.st), ...Object.keys(m.bidt).map(k => k.slice(0, 24))]);
ok(참조.every(k => 정의.has(k)), '가리키는 열쇠가 모두 있다(지운 것을 가리키지 않는다)');

const h = H.hwpClipHTML(m);
const js = h.match(/<!--\[data-hwpjson\]([\s\S]*?)-->/)[1];
ok(!/[<>&']/.test(js), 'JSON 안의 <>&\' 를 \\u 로 바꿔 주석이 안 깨진다');
ok(JSON.parse(js).ro.hp === m.ro.hp, '바꾼 JSON 도 그대로 읽힌다');
ok(+h.match(/data-jsonlen="(\d+)"/)[1] === Buffer.byteLength(js), 'data-jsonlen = UTF-8 바이트 수');

// LaTeX → 한글 수식 (10-15 · 짝은 한글로 그려 보고 정했다 — eqprobe.py)
const E = H.latexToHwpEq;
const 같다 = (a, b) => ok(E(a) === b, 'LaTeX ' + a + ' → ' + E(a));
같다('x^2-7x', 'x ^{2} - 7 x');                        // 첨자는 묶는다(한글은 띄어쓰기까지 첨자)
같다('x+it', 'x + i t');                                // 글자는 한 자씩(it 이 명령으로 먹힌다)
const R = String.raw;                                   // 역슬래시를 글자 그대로
같다(R`\frac12`, '{{1} over {2}}');
같다(R`\dfrac{a+1}{b}`, '{{a + 1} over {b}}');
같다(R`\sqrt[3]{x}`, 'root {3} of {x}');
같다(R`\left\{x \middle| x\in A\right\}`, 'LEFT lbrace x | x in A RIGHT rbrace');
같다(R`\angle C=90^\circ`, 'angle C = 90 DEG');
같다(R`O^{\prime}A'`, 'O prime A prime');
같다(R`500\text{ m}`, '500 {rm " m"}');
같다(R`f_{\max}`, 'f _{{rm "max"}}');
같다(R`A \setminus B`, 'A - B');
같다(R`\{2\} \not\subset X`, 'lbrace 2 rbrace notsubset X');
같다(R`\begin{pmatrix}0&1\\2&3\end{pmatrix}`, 'pmatrix{0 & 1 # 2 & 3}');
같다(R`\underbrace{A}_{A가~2개}`, 'UNDERBRACE{A "가" ~ 2 "개"}{A}');
같다(R`2\!:\!1`, '2 : 1');
// 점 이름은 바로 선 글자 · 집합·원·최댓값 등은 기울임 (10-15 · 사용자 — 「점이름은 rm으로 다만 집합이나 이런건 다시 이탤릭체로」)
const 점 = c => [...H.hwpPointNames({ content: c })].sort().join('');
const 점글 = R`세 점 $A(4, -1)$, $B$, $C$에 대하여 $\overline{PQ}$, $\triangle DEF$, $\angle G$, 중점 $M$, 원 $K$, 최댓값 $N$`;
ok(점(점글) === 'ABCDEFGMPQ', '점 이름 — 좌표·쉼표로 이어짐·선분·삼각형·각·중점 (원 K·최댓값 N 은 아님) — ' + 점(점글));
ok(점(R`집합 $X, Y$에 대하여 $X \triangle Y$, $P(A, B)$, $_{7}\mathrm{C}_{2}$, $A \cap B$`) === '', '집합 문항엔 점이 없다(대칭차·함수 P(A, B)·조합 C)');
ok(E(R`A(1, 2)x`, undefined, new Set(['A'])) === '{rm A} ( 1 , 2 ) x', '점 이름만 {rm } 으로 묶는다(뒤 x 는 기울임)');
const 놓침 = []; E(R`\foo x`, 놓침);
ok(놓침.join() === 'foo', '모르는 명령은 miss 에 담는다');

// AI 변형 → 조각 (10-15) — 가짜 원본·변형은 hwpclip-fake.mjs (브라우저 검사 hwpcopy-test 와 같이 쓴다)
const 원본 = 가짜원본, 변형 = 가짜변형;
const 알림 = {};
const V = H.hwpClipFromVariant(원본(), 변형, null, 알림);
const VP = { ...V.ro, ...V.sl };
const 사슬 = hp => { const a = []; for (let k = hp; k && VP[k]; k = VP[k].np) a.push(VP[k]); return a; };
const 글자 = p => p.ru[0].ch.map(c => c.t !== undefined ? c.t : V.cs[c.co] && V.cs[c.co].eq ? '$' + V.cs[c.co].eq.sc + '$' : '[' + (V.cs[c.co] || {}).ci + ']').join('');
const 본문칸 = 사슬(V.sl[K(50)].hp);
ok(글자(본문칸[0]) === '새 본문 $x ^{2}$', '본문 문단을 변형 글로 — ' + 글자(본문칸[0]));
ok(본문칸.length === 2 && 본문칸[1].ru[0].ch[0].co === K(13), '선지 표 문단은 남고 그림 문단은 뗐다(그림 없는 변형)');
const 칸 = n => 글자(사슬(V.sl[K(60 + n)].hp)[0]);
ok([1, 3, 5, 7, 9].map(칸).join('|') === '$1$|$2$|3|4|${{1} over {2}}$', '선지 표 값 칸만 갈았다(④ 뒤 제어 글자도) — ' + [1, 3, 5, 7, 9].map(칸).join('|'));
ok(칸(0) === '①', '선지 표 번호 칸은 그대로');
ok(알림.선지 === '표' && 알림.그림 === '뗌', 'info — 선지 표·그림 뗌');
ok(글자(사슬(V.sl[K(20)].hp)[0]) === `[${CI.en}]`, '출처 딱지는 떼고 미주 기호만 둔다 — ' + 글자(사슬(V.sl[K(20)].hp)[0]));
const 미주 = 사슬(V.sl[K(30)].hp);
ok(글자(미주[0]) === `[${CI.atno}][${CI.tcmt}] [정답] ②`, '미주 첫 문단 = 자동번호·숨은 설명 + [정답] ② — ' + 글자(미주[0]));
ok(미주.length === 3 && 글자(미주[1]) === '1. 첫 줄 $a$', '해설은 줄마다 문단');
ok(글자(사슬(V.sl[K(40)].hp)[0]) === '[ORIG-N01]', '숨은 설명의 코드를 변형 코드로');
ok(!JSON.stringify(V).includes('[ORIG]'), '원본 코드가 어디에도 안 남았다(수식 설명 sc 까지)');
ok(!V.cs[K(14)] && !V.cs[K(11)] && V.bi.length === 0 && !Object.keys(V.bidt).length, '뗀 그림 개체·그림 바이트를 걷었다(본문·옛 해설 둘 다)');
const V참조 = JSON.stringify({ ...V, bidt: 0 }).match(/[0-9A-F]{24}/g);
const V정의 = new Set([...Object.keys(V.ro), ...Object.keys(V.sl), ...Object.keys(V.cs), ...Object.keys(V.pp), ...Object.keys(V.st), ...Object.keys(V.cp)]);
ok(V참조.every(k => V정의.has(k)), '변형 조각도 가리키는 열쇠가 다 있다');
const VF = H.hwpClipFromVariant(원본(), 변형, { b64: 'NEW', w: 200, h: 100 });
const 그림 = Object.values(VF.cs).find(o => o.ci === CI.gso);
ok(그림 && VF.bidt[그림.rc.img.bi] === 'NEW' && /\.png$/.test(그림.rc.img.bi) && VF.bi.length === 1, '그림을 주면 원본 그림 자리에 PNG 로');
ok(그림.she === 500 && 그림.rc.oh === 50, '그림 크기 — 폭은 원본대로 · 높이는 비율대로');
ok(H.hwpClipHTML(H.hwpClipMerge([V, VF])).includes('data-hwpjson'), '변형 조각도 합쳐진다');

console.log(bad ? `\n🔴 ${bad}개 틀림` : '\n🟢 모두 맞음');
process.exit(bad ? 1 : 0);
