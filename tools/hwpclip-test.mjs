// hwpclip.js — 여러 문항 합치기 검사 (2026-10-14)
//   node tools/hwpclip-test.mjs
// 실제 한글로 붙여 본 것은 10-14 실험(구역 정의를 떼야 한 쪽에 이어지고, 번호 정의가 하나여야 001·002 로 센다).
// 여기서는 그 규칙이 지켜지는지만 본다 — 열쇠 안 겹침 · 사슬 이음 · secd/cold 뗌 · 같은 모양 접기 · 주석 안 깨짐.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const H = new Function(fs.readFileSync(path.join(ROOT, 'hwpclip.js'), 'utf8')
  + '\nreturn {hwpClipMerge, hwpClipHTML};')();

const K = n => n.toString(16).toUpperCase().padStart(24, '0');
// 한글이 내는 꼴을 줄인 것 — 문단 둘(p1→p2), 첫 문단에 secd·cold·표, 번호 정의 하나, 그림 하나
const clip = (txt) => ({
  documentPr: {}, dh: {},
  nu: { [K(1)]: { id: 1, sf: '00^1' } },
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

const m = H.hwpClipMerge([clip('하나 <a>'), clip('둘'), clip('셋')]);
// 사슬을 따라가며 글을 모은다
const 글 = [];
for (let k = m.ro.hp, n = 0; k && n < 50; k = m.ro[k].np, n++)
  for (const r of m.ro[k].ru) for (const c of r.ch) if (c.t) 글.push(c.t);
ok(글.join('|') === '하나 <a>|둘|셋', '본문 사슬이 차례대로 이어진다 — ' + 글.join('|'));
ok(!Object.values(m.cs).some(v => [1936024420, 1668246628].includes(v.ci)), '구역·단 정의(secd·cold)를 모두 뗐다');
ok(Object.values(m.cs).filter(v => v.ci === 1952607264).length === 3, '표 셋은 남았다');
ok(Object.keys(m.nu).length === 1, '번호 정의가 하나로 접혔다(001·002·003 으로 이어 세게)');
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

console.log(bad ? `\n🔴 ${bad}개 틀림` : '\n🟢 모두 맞음');
process.exit(bad ? 1 : 0);
