// 만든 hwpx 가 «한글이 열 수 있는 모양»인지 본다.
// 한글을 띄울 수 없으므로, 열리지 않게 만드는 조건들을 직접 검사한다.
import fs from 'fs';
import path from 'path';

const D = process.argv[2] || 'build/verify';
let bad = 0;
const say = (ok, msg) => { console.log((ok ? '  OK  ' : '  ✗   ') + msg); if (!ok) bad++; };

// 1) 모든 XML 이 태그 짝이 맞는가
for (const f of ['Contents/header.xml', 'Contents/section0.xml', 'Contents/section1.xml',
  'Contents/section2.xml', 'Contents/content.hpf', 'META-INF/manifest.xml']) {
  const p = path.join(D, f);
  if (!fs.existsSync(p)) { say(false, f + ' 없음'); continue; }
  const x = fs.readFileSync(p, 'utf8');
  const stack = [];
  let err = null;
  for (const m of x.matchAll(/<(\/?)([a-zA-Z][\w:.-]*)([^>]*?)(\/?)>/g)) {
    const [all, close, tag, attr, self] = m;
    if (all.startsWith('<?') || all.startsWith('<!')) continue;
    if (self) continue;
    if (close) {
      if (stack.pop() !== tag) { err = `${tag} 닫힘이 어긋남 (${x.slice(Math.max(0, m.index - 60), m.index + 20)})`; break; }
    } else stack.push(tag);
  }
  if (!err && stack.length) err = '안 닫힌 태그 ' + stack.slice(-3).join('>');
  say(!err, `${f} 태그 짝 ${err ? '— ' + err.slice(0, 120) : '맞음'}`);
}

// ⚠ 문항 수를 코드에 박아 두지 않는다. 교재에서 문항을 빼면 검사기가 거짓 경고를 낸다.
const N = JSON.parse(fs.readFileSync('../analysis2/keep_list.json', 'utf8')).length;

// 2) section2 내용
const s2 = fs.readFileSync(path.join(D, 'Contents/section2.xml'), 'utf8');
const notes = (s2.match(/<hp:endNote[\s>]/g) || []).length;
say(notes === N, `미주(문항) ${notes}개 = ${N}`);
// ⚠ 문제번호는 «비어 있어야» 맞다 — 사용자가 한글의 문단 번호로 직접 매긴다.
say(!/<hp:run charPrIDRef="27"><hp:t>\d/.test(s2), '문제번호는 비어 있다 (한글 문단번호로 매긴다)');
say(!/<hp:t>문제<\/hp:t>/.test(s2), '틀의 「문제」 자리표시 글자가 지워졌다');
const srcs = [...s2.matchAll(/<hp:markpenBegin color="#FF0000"\/>([^<]+)<hp:markpenEnd\/>/g)].map((m) => m[1]);
say(srcs.length === N, `출처 표기 ${srcs.length}개 = ${N}`);
say(!srcs.some((s) => s === '절대등급'), `템플릿 예시 출처가 남아 있지 않다`);
const scenes = (s2.match(/styleIDRef="9"/g) || []).length;
say(scenes === 3, `SCENE 표 ${scenes}개 = 3`);

// 2-B) ⚠ 문단이 하나도 없는 subList(표 칸)가 있으면 한글이 파일을 «못 연다».
//      태그 짝은 멀쩡해서 다른 검사로는 안 잡힌다. 빈 문단을 정리하다 실제로 만들었다.
{
  let empty = 0, tot = 0;
  const stack = [];
  for (const m of s2.matchAll(/<hp:subList(\s[^>]*?)?(\/?)>|<\/hp:subList>|<hp:p[\s>]/g)) {
    if (m[0].startsWith('</hp:subList')) { const n = stack.pop(); tot++; if (!n) empty++; continue; }
    if (m[0].startsWith('<hp:subList')) { if (!m[2]) stack.push(0); continue; }
    if (stack.length) stack[stack.length - 1]++;
  }
  say(empty === 0, `문단이 없는 표 칸 ${empty}개 (subList ${tot}개 중) — 있으면 파일이 안 열린다`);
}

// 3) 그림이 실제로 있는가
const refs = [...new Set([...s2.matchAll(/binaryItemIDRef="([^"]+)"/g)].map((m) => m[1]))];
const hpf = fs.readFileSync(path.join(D, 'Contents/content.hpf'), 'utf8');
const missing = refs.filter((r) => !hpf.includes(`id="${r}"`));
say(!missing.length, `그림 참조 ${refs.length}개 · content.hpf 에 없는 것 ${missing.length} ${missing.slice(0, 4).join(',')}`);
const files = fs.readdirSync(path.join(D, 'BinData')).map((f) => f.replace(/\.[^.]+$/, ''));
const nofile = refs.filter((r) => !files.includes(r));
say(!nofile.length, `BinData 파일 없는 참조 ${nofile.length} ${nofile.slice(0, 4).join(',')}`);

// 4) 본문이 실제로 들어갔는가 (문항마다 글이 있는지)
const blocks = s2.split(/<hp:run charPrIDRef="27"><hp:t>\d{3}<\/hp:t>/).slice(1);
const empty = blocks.filter((b) => {
  const upto = b.slice(0, b.indexOf('<hp:run charPrIDRef="27">') + 1 || undefined);
  const txt = [...upto.matchAll(/<hp:t>([^<]*)<\/hp:t>/g)].map((m) => m[1]).join('');
  return txt.replace(/[\s문제①②③④⑤]/g, '').length < 12;
}).length;
say(empty === 0, `본문이 비어 보이는 문항 ${empty}개`);
// ⚠ 스크립트 태그에는 속성이 붙는다(xml:space="preserve"). 속성 없는 것만 세면 0 이 나온다.
const eqs = (s2.match(/<hp:script[\s>]/g) || []).length;
say(eqs > 500, `수식 ${eqs}개`);

console.log(bad ? `\n✗ 문제 ${bad}건` : '\n전부 통과');
