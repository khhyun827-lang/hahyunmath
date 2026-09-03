// hwpx 를 node 에서 읽는다 — **규칙은 웹과 같은 것을 쓴다** (2026-09-05)
//
// 🔴 **여기에 «문항을 가르는 규칙»을 적지 않는다.** 그것은 루트 `hwpx.js` 하나뿐이고,
//    이 파일이 하는 일은 딱 둘이다:
//      ① hwpx(zip)를 풀어 구역 XML 을 꺼낸다
//      ② 브라우저의 DOMParser 자리를 메울 **작은 XML 셈**을 준다
//    규칙을 여기에 한 줄이라도 베껴 적는 순간 웹과 도구가 다른 답을 내기 시작한다.
//
// ⚠ **셈이 흉내 내는 DOM 은 여섯 가지뿐이다** —
//    `childNodes` · `nodeType` · `localName` · `textContent` · `getAttribute` ·
//    `getElementsByTagNameNS`.
//    `hwpx.js` 가 일곱 번째를 쓰기 시작하면 **여기도 같이 고쳐야 한다.**
//    (그래서 hwpx.js 머리말에도 같은 말을 적어 두었다.)

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// ── hwpx.js 를 «글자»로 읽어 한 번에 부른다 ────────────────────────────
// hwpx.js 는 일부러 평범한 스크립트다(모듈이 아니다). 브라우저는 <script src> 로 읽고
// node 는 이렇게 읽는다 — 빌드 단계 없이 한 파일을 둘이 같이 쓰는 값이다.
const RULE_NAMES = [
  'HP_NS', 'HWP_CORE_NS', 'HWP_CODE_RE', 'HWP_WATERMARK_PATTERNS',
  'convertHwpEq', 'cleanHwpPlainText', 'hwpWalkParagraphs',
  'stripScoreMarks', 'fixBareSqrt',
  'hwpEndnoteParts', 'hwpEndnoteText', 'hwpCellToBlock', 'hwpParseBlocks',
  'hwpxMarkDecorPics', 'hwpxProblemsFromDocs',
];
export function loadHwpxRules() {
  const src = fs.readFileSync(path.join(ROOT, 'hwpx.js'), 'utf8');
  try {
    return new Function(src + '\nreturn {' + RULE_NAMES.join(',') + '};')();
  } catch (e) {
    throw new Error('hwpx.js 를 부르지 못했습니다 — ' + e.message
      + '\n  (이름이 바뀌었으면 tools/hwpx-node.mjs 의 RULE_NAMES 도 같이 고쳐야 합니다)');
  }
}

// ── 작은 XML 셈 ───────────────────────────────────────────────────────
const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
function unesc(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (all, body) => {
    if (body[0] === '#') {
      const n = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : all;
    }
    return ENT[body] !== undefined ? ENT[body] : all;
  });
}

function textOf(node) {
  if (node.nodeType === 3) return node.data;
  let s = '';
  for (const c of node.childNodes) s += textOf(c);
  return s;
}
function collect(node, ns, local, out) {
  for (const c of node.childNodes) {
    if (c.nodeType !== 1) continue;
    if (c.localName === local && c.namespaceURI === ns) out.push(c);
    collect(c, ns, local, out);
  }
  return out;
}

function makeElement(prefix, local, ns, attrs) {
  return {
    nodeType: 1,
    prefix, localName: local, namespaceURI: ns,
    nodeName: prefix ? prefix + ':' + local : local,
    attrs, childNodes: [],
    get textContent() { return textOf(this); },
    getAttribute(name) {
      if (this.attrs[name] !== undefined) return this.attrs[name];
      // hwpx 는 접두사 없는 속성이 대부분이지만, 있는 경우를 위해 뒤 이름으로도 한 번 본다
      const bare = name.includes(':') ? name.slice(name.indexOf(':') + 1) : null;
      return bare && this.attrs[bare] !== undefined ? this.attrs[bare] : null;
    },
    getElementsByTagNameNS(ns2, local2) { return collect(this, ns2, local2, []); },
  };
}

/* 태그 하나를 읽는다. **따옴표 안의 `>` 를 태그 끝으로 읽지 않는다** —
   hwpx 속성에는 `>` 가 실제로 들어 있다(수식 스크립트가 속성으로 붙는 자리가 있다). */
function tagEnd(text, from) {
  let q = null;
  for (let j = from; j < text.length; j++) {
    const c = text[j];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '>') return j;
  }
  return text.length;
}

export function parseXml(text) {
  const doc = {
    nodeType: 9, childNodes: [], documentElement: null,
    getElementsByTagNameNS(ns, local) { return collect(this, ns, local, []); },
  };
  const stack = [doc];
  const nsStack = [Object.create(null)];
  let i = 0;

  const top = () => stack[stack.length - 1];
  const pushText = (raw) => {
    if (!raw) return;
    top().childNodes.push({ nodeType: 3, data: raw, childNodes: [] });
  };

  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt < 0) { pushText(unesc(text.slice(i))); break; }
    if (lt > i) pushText(unesc(text.slice(i, lt)));

    if (text.startsWith('<!--', lt)) { const e = text.indexOf('-->', lt); i = e < 0 ? text.length : e + 3; continue; }
    if (text.startsWith('<![CDATA[', lt)) {
      const e = text.indexOf(']]>', lt);
      pushText(text.slice(lt + 9, e < 0 ? text.length : e));
      i = e < 0 ? text.length : e + 3; continue;
    }
    if (text.startsWith('<?', lt)) { const e = text.indexOf('?>', lt); i = e < 0 ? text.length : e + 2; continue; }
    if (text.startsWith('<!', lt)) { i = tagEnd(text, lt + 1) + 1; continue; }

    const gt = tagEnd(text, lt + 1);
    const inner = text.slice(lt + 1, gt);
    i = gt + 1;

    if (inner[0] === '/') {                       // 닫는 태그
      if (stack.length > 1) { stack.pop(); nsStack.pop(); }
      continue;
    }
    const selfClose = inner.endsWith('/');
    const body = selfClose ? inner.slice(0, -1) : inner;
    const nameMatch = body.match(/^([^\s/>]+)/);
    if (!nameMatch) continue;
    const qname = nameMatch[1];

    const attrs = Object.create(null);
    const nsmap = Object.create(nsStack[nsStack.length - 1]);
    const are = /([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let am;
    while ((am = are.exec(body.slice(qname.length)))) {
      const key = am[1];
      const val = unesc(am[3] !== undefined ? am[3] : am[4]);
      if (key === 'xmlns') nsmap[''] = val;
      else if (key.startsWith('xmlns:')) nsmap[key.slice(6)] = val;
      else attrs[key.includes(':') ? key.slice(key.indexOf(':') + 1) : key] = val;
    }

    const ci = qname.indexOf(':');
    const prefix = ci < 0 ? '' : qname.slice(0, ci);
    const local = ci < 0 ? qname : qname.slice(ci + 1);
    const ns = nsmap[prefix] !== undefined ? nsmap[prefix] : null;

    const el = makeElement(prefix, local, ns, attrs);
    top().childNodes.push(el);
    if (doc.documentElement === null) doc.documentElement = el;
    if (!selfClose) { stack.push(el); nsStack.push(nsmap); }
  }
  return doc;
}

// ── hwpx(zip) 를 풀어 구역 XML 을 차례대로 준다 ────────────────────────
// ⚠ 푸는 곳은 언제나 임시 폴더다. 원본 옆에 아무것도 안 남긴다.
//   (item-code.mjs 와 같은 방식이다 — 이 컴퓨터에는 `unzip` 이 있다.)
export function contentsDir(p) {
  if (fs.statSync(p).isDirectory()) return path.join(p, 'Contents');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hwpx-'));
  execFileSync('unzip', ['-qo', p, '-d', tmp]);
  return path.join(tmp, 'Contents');
}

export function sectionDocs(fileOrDir) {
  return sectionDocsFrom(contentsDir(fileOrDir));
}
/* ⚠ 이미 풀어 둔 Contents 를 다시 안 풀려고 갈라 두었다 — 3~8MB 짜리를 두 번 푸는 것은 낭비다. */
export function sectionDocsFrom(cdir) {
  // ⚠ 차례는 파일 이름의 «숫자»다 — section10 이 section2 보다 뒤여야 한다.
  const names = fs.readdirSync(cdir)
    .filter((f) => /^section\d+\.xml$/.test(f))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));
  if (!names.length) throw new Error('올바른 hwpx 가 아닙니다 (구역 XML 이 없습니다): ' + fileOrDir);
  return names.map((f) => parseXml(fs.readFileSync(path.join(cdir, f), 'utf8')));
}

/* 그림 참조 → «내용 열쇠». 한글은 같은 딱지를 여러 벌로 저장하므로 **이름으로는 못 묶는다** —
   md5 로 묶어야 `image10`·`image23`·`image18` 이 한 그림으로 보인다 (hwpx.js 의 hwpxMarkDecorPics 참고). */
function picKeyMap(cdir) {
  const key = {};
  const hpfPath = path.join(cdir, 'content.hpf');
  if (!fs.existsSync(hpfPath)) return key;
  const hpf = fs.readFileSync(hpfPath, 'utf8');
  const root = path.dirname(cdir);
  for (const m of hpf.matchAll(/<opf:item[^>]*id="([^"]+)"[^>]*href="([^"]+)"/g)) {
    const f = path.join(cdir, m[2]);
    const g = fs.existsSync(f) ? f : path.join(root, m[2]);
    if (!fs.existsSync(g)) continue;
    try { key[m[1]] = crypto.createHash('md5').update(fs.readFileSync(g)).digest('hex'); } catch (e) {}
  }
  return key;
}

/* 파일 하나 → 문항 목록. **가르는 일은 hwpx.js 가 한다.**
   그림 바이트는 안 붙는다 — 여기서 가져가는 것은 «글»뿐이다.
   다만 **어느 그림이 장식인지는 가려 준다** — 그건 파일을 쥔 이쪽만 알 수 있다. */
export function problemsFromHwpx(fileOrDir, rules = loadHwpxRules()) {
  const cdir = contentsDir(fileOrDir);
  const r = rules.hwpxProblemsFromDocs(sectionDocsFrom(cdir));
  const key = picKeyMap(cdir);
  rules.hwpxMarkDecorPics(r.problems, ref => key[ref] || ref);
  return r;
}
