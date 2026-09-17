// 검사를 한 번에 돌린다 (2026-09-17)
//
//   node tools/check-all.mjs           ← 전부
//   node tools/check-all.mjs 영상      ← 이름에 그 글자가 든 것만
//
// 🔴 **왜 지었나** — 09-17에 열어 보니 **여섯이 며칠째 빨갰다.** 그 가운데 넷은 같은 병이었다:
//   `lift()` 하네스가 새로 생긴 의존을 안 넘겨 주어 **ReferenceError 로 통째로 터진다.**
//   고침은 멀쩡했고 검사가 안 따라온 것이었다. 그런데 **아무도 몰랐다** — 한 번에 도는 길이 없어서다.
//   하나는 심지어 «초록인데 주석을 읽고 통과»하고 있었고, 하나(`--no-bg`)는 **진짜 버그**를 물고 있었다.
//
// 🔵 **검사(test)와 점검(check)을 가른다** —
//   · 검사 = `tools/*-test.mjs`. 하나라도 빨가면 빨갛다. 예외 없다.
//   · 점검 = 규칙·오래된 사파리. 「미뤄 두기로 한 것」이 있어서 셈이 다르다(아래).
//   · 망(網)을 타는 것(`review-check`·`worker-check`)은 «안» 돌린다 — 한도를 먹고 느리다. 손으로 부른다.

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const 거르개 = process.argv[2] || '';

/* 🔴 **오래된 사파리 — «미뤄 두기로 한 것»이 있다.** `hwpx.js` 41개는 2026-09-16에
   일부러 남겼다(CLAUDE.md) — 학생 화면은 그 파일을 안 부르고, 강사가 오래된 사파리로 열면
   시험지 만들기만 안 된다(딴 파일이라 본체는 산다).
   ⚠ 그래서 «0이면 초록»으로 두면 이 줄은 **영영 빨갛고, 영영 빨간 줄은 아무도 안 본다.**
     대신 **「hwpx.js 말고 다른 데서 나오면 빨갛다」**로 잰다 — 새로 스며드는 것은 그날 문다. */
const 미뤄둔파일 = new Set(['hwpx.js']);

const 검사들 = readdirSync(join(ROOT, 'tools'))
  .filter(f => f.endsWith('-test.mjs')).sort();
const 점검들 = ['rules-check.mjs', 'old-safari-check.mjs'];

const 돌리기 = (f) => {
  const r = spawnSync(process.execPath, [join('tools', f)], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const 이름 = f => basename(f, '.mjs');
const 줄 = (표, n, 말) => console.log('  ' + 표 + ' ' + n.padEnd(26) + ' ' + (말 || ''));

let 빨강 = 0, 초록 = 0;

console.log('\n검사 — tools/*-test.mjs\n');
for (const f of 검사들) {
  const n = 이름(f);
  if (거르개 && !n.includes(거르개)) continue;
  const { code, out } = 돌리기(f);
  if (code === 0) {
    초록++;
    const m = out.match(/(\d+)\s*개/g);
    줄('✓', n, m ? m[m.length - 1] : '');
  } else {
    빨강++;
    /* 왜 빨간지 «한 줄»은 여기서 보여 준다 — 다시 돌려 보게 만들면 안 본다. */
    const 터짐 = out.match(/^\s*(\w*Error: .*)$/m);
    const 실패 = out.match(/^.*(?:🔴|❌|✗).*$/m);
    줄('🔴', n, (터짐 ? 터짐[1] : (실패 ? 실패[0].trim() : '')).slice(0, 88));
  }
}

console.log('\n점검 — 규칙 · 오래된 사파리\n');
for (const f of 점검들) {
  const n = 이름(f);
  if (거르개 && !n.includes(거르개)) continue;
  const { code, out } = 돌리기(f);
  if (n === 'old-safari-check') {
    /* 어느 «파일»에서 나왔는지만 본다 — 미뤄 둔 것 밖이면 빨갛다.
       ⚠ **`u` 깃발이 없으면 이모지가 안 물린다** — 처음에 `[🔴🟠]` 라고만 적었다가
         41개를 «없다»로 읽고 초록을 켰다. 내가 방금 욕한 바로 그 «가짜 초록»이다.
         그래서 아래 «말이 되나» 한 줄을 둔다 — 걸렸다는데 한 건도 못 읽었으면 빨갛다. */
    const 난곳 = new Map();
    for (const m of out.matchAll(/^[\u{1F534}\u{1F7E0}]\s+(\S+?):\d+/gmu))
      난곳.set(m[1], (난곳.get(m[1]) || 0) + 1);
    if (code !== 0 && 난곳.size === 0) {
      빨강++;
      줄('🔴', n, '걸렸다는데 한 건도 못 읽었다 — 이 파일의 «읽는 줄»이 낡았다(직접 돌려 볼 것)');
      continue;
    }
    const 새것 = [...난곳.keys()].filter(x => !미뤄둔파일.has(x));
    const 적기 = [...난곳].map(([k, v]) => k + ' ' + v).join(' · ') || '없다';
    if (새것.length) { 빨강++; 줄('🔴', n, '미뤄 둔 곳 밖에서 나왔다 — ' + 새것.join(' · ')); }
    else { 초록++; 줄('✓', n, 적기 + (난곳.size ? '  (미뤄 두기로 한 것 · CLAUDE.md 2006줄)' : '')); }
    continue;
  }
  if (code === 0) { 초록++; 줄('✓', n, ''); }
  else { 빨강++; 줄('🔴', n, (out.match(/^.*(?:🔴|❌|✗).*$/m) || [''])[0].trim().slice(0, 88)); }
}

console.log('\n⏭ 망을 타는 것은 «안» 돌렸다 — 손으로 부른다 (한도를 먹는다):');
console.log('   node tools/review-check.mjs   ·   node tools/worker-check.mjs\n');
/* ⚠ 한 개도 안 돌았는데 «전부 초록»이라고 하면 안 된다 — 거르개 오타가 «통과»로 읽힌다. */
if (초록 + 빨강 === 0) {
  console.log('🔴 돌린 것이 하나도 없다 — 거르개 「' + 거르개 + '」 에 맞는 검사가 없다.\n');
  process.exit(1);
}
console.log((빨강 === 0 ? '✓ 전부 초록' : '🔴 빨간 것 ' + 빨강 + '개') + ' · ' + (초록 + 빨강) + '개\n');
process.exit(빨강 === 0 ? 0 : 1);
