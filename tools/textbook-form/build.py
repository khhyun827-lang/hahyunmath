# 엔딩크레딧 «작업중» hwpx → 「양식 및 예시」 틀로 다시 짓는다.
# 쓰는 법: python3 -I build.py <양식 풀린 폴더> <작업 풀린 폴더> <나갈 폴더> <단원 번호> <단원 이름>
import sys, os, re, copy, shutil, math, json
from lxml import etree

TPL, WRK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
CHN, CHNAME = sys.argv[4], sys.argv[5]
NS = {
    'hp': 'http://www.hancom.co.kr/hwpml/2011/paragraph',
    'hh': 'http://www.hancom.co.kr/hwpml/2011/head',
    'hc': 'http://www.hancom.co.kr/hwpml/2011/core',
    'hs': 'http://www.hancom.co.kr/hwpml/2011/section',
    'opf': 'http://www.idpf.org/2007/opf/',
}
HP = '{%s}' % NS['hp']; HH = '{%s}' % NS['hh']; HC = '{%s}' % NS['hc']
def ln(e): return etree.QName(e).localname
def parse(p): return etree.parse(p, etree.XMLParser(remove_blank_text=False, huge_tree=True))

REPORT = []
def note(*a): REPORT.append(' '.join(str(x) for x in a))

# ───────────────────────── 1. 머리(header) 서식 합치기 ─────────────────────────
th = parse(f'{TPL}/Contents/header.xml'); troot = th.getroot()
wh = parse(f'{WRK}/Contents/header.xml'); wroot = wh.getroot()

def group(root, tag):  # borderFills / charProperties / ...
    return root.find('.//' + HH + tag)

def canon(el):
    e = copy.deepcopy(el); e.attrib.pop('id', None)
    return etree.tostring(e, encoding='unicode')

fontmap = {}  # (lang, workid) -> tmplid
def font_id(lang, wid):
    k = (lang, wid)
    if k in fontmap: return fontmap[k]
    wff = [f for f in wroot.iter(HH + 'fontface') if f.get('lang') == lang][0]
    tff = [f for f in troot.iter(HH + 'fontface') if f.get('lang') == lang][0]
    wf = [f for f in wff.findall(HH + 'font') if f.get('id') == wid][0]
    for f in tff.findall(HH + 'font'):
        if f.get('face') == wf.get('face'):
            fontmap[k] = f.get('id'); return f.get('id')
    nf = copy.deepcopy(wf); nid = str(len(tff.findall(HH + 'font'))); nf.set('id', nid)
    tff.append(nf); tff.set('fontCnt', str(len(tff.findall(HH + 'font'))))
    fontmap[k] = nid; return nid

LANGS = {'hangul': 'HANGUL', 'latin': 'LATIN', 'hanja': 'HANJA', 'japanese': 'JAPANESE',
         'other': 'OTHER', 'symbol': 'SYMBOL', 'user': 'USER'}
maps = {'borderFill': {}, 'charPr': {}, 'tabPr': {}, 'paraPr': {}, 'numbering': {}}
GROUP = {'borderFill': 'borderFills', 'charPr': 'charProperties', 'tabPr': 'tabProperties',
         'paraPr': 'paraProperties', 'numbering': 'numberings'}

def imp(kind, wid, fix=None):
    """작업 머리의 kind#wid 를 양식 머리로 옮긴 id. 같은 정의가 있으면 그것을 쓴다."""
    if wid in maps[kind]: return maps[kind][wid]
    src = [e for e in group(wroot, GROUP[kind]).findall(HH + kind) if e.get('id') == wid]
    if not src: raise SystemExit(f'머리에 없는 {kind} {wid}')
    e = copy.deepcopy(src[0])
    if fix: fix(e)
    tg = group(troot, GROUP[kind])
    c = canon(e)
    for t in tg.findall(HH + kind):
        if canon(t) == c:
            maps[kind][wid] = t.get('id'); return t.get('id')
    nid = str(max([int(t.get('id')) for t in tg.findall(HH + kind)] + [-1]) + 1)
    e.set('id', nid); tg.append(e); tg.set('itemCnt', str(len(tg.findall(HH + kind))))
    maps[kind][wid] = nid; note(f'머리에 {kind} {nid} 를 더함 (작업 {wid})')
    return nid

def fix_char(e):
    fr = e.find(HH + 'fontRef')
    for a, lang in LANGS.items():
        if fr.get(a) is not None: fr.set(a, font_id(lang, fr.get(a)))
    if e.get('borderFillIDRef'): e.set('borderFillIDRef', imp('borderFill', e.get('borderFillIDRef')))

def fix_para(e):
    if e.get('tabPrIDRef') is not None: e.set('tabPrIDRef', imp('tabPr', e.get('tabPrIDRef')))
    h = e.find(HH + 'heading')
    if h is not None and h.get('type') != 'NONE' and h.get('idRef') not in (None, '0'):
        h.set('idRef', imp('numbering', h.get('idRef')))
    for b in e.iter(HH + 'border'):
        b.set('borderFillIDRef', imp('borderFill', b.get('borderFillIDRef')))

# 미주 안의 글자 모양 — 작업 0·2 = 바탕 10pt(양식 0), 작업 1 = [정답] 11pt(양식 31)
CHAR_FIXED = {'0': '0', '2': '0', '1': '31'}
def char_id(w):
    if w in CHAR_FIXED: return CHAR_FIXED[w]
    return imp('charPr', w, fix_char)
def para_id(w): return imp('paraPr', w, fix_para)
def bf_id(w): return imp('borderFill', w)

# ───────────────────────── 2. 양식 조각 떼기 ─────────────────────────
s2 = parse(f'{TPL}/Contents/section2.xml'); s3 = parse(f'{TPL}/Contents/section3.xml')
s2p = s2.getroot().findall(HP + 'p'); s3p = s3.getroot().findall(HP + 'p')

def top_text(p):
    return ''.join((t.text or '') for r in p.findall(HP + 'run') for t in r.findall(HP + 't'))
def first_tbl(p):
    for r in p.findall(HP + 'run'):
        t = r.find(HP + 'tbl')
        if t is not None: return t
    return None

FIRST_S1 = s2p[0]            # secPr + SCENE 1 머리 (+ 쪽 머리말 «유리함수»)
FIRST_S2 = s3p[0]            # secPr + SCENE 2 머리
SCENE3_P = None; TYPE_P = None; PROB_T = None
for p in s3p:
    t = first_tbl(p)
    if t is None: continue
    txt = ''.join(t.itertext())
    if SCENE3_P is None and t.get('rowCnt') == '2' and t.get('colCnt') == '4' and 'SCENE' in txt and '3' in txt and p is not FIRST_S2:
        SCENE3_P = p
    if TYPE_P is None and t.get('rowCnt') == '1' and t.get('colCnt') == '2':
        TYPE_P = p
for p in s2p:   # 1행 선지가 든 보통 문항 표 (높이 18351)
    t = first_tbl(p)
    if t is not None and t.get('rowCnt') == '3' and t.find(HP + 'sz').get('height') == '18351':
        PROB_T = t; break
labels = {}
for i, p in enumerate(s3p):
    tt = top_text(p).strip()
    if tt in ('1행객관식', '2행객관식', '3행객관식', '5행객관식', '보기틀', '조건틀'):
        labels[tt] = first_tbl(s3p[i + 1])
FRAME = {1: labels['1행객관식'], 2: labels['2행객관식'], 3: labels['3행객관식'], 5: labels['5행객관식']}
BOGI_T = labels['보기틀']; COND_T = labels['조건틀']
assert SCENE3_P is not None and TYPE_P is not None and PROB_T is not None

def LSEG():
    return etree.fromstring('<hp:linesegarray xmlns:hp="%s"><hp:lineseg textpos="0" vertpos="0" vertsize="1000" '
        'textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="22680" flags="393216"/></hp:linesegarray>' % NS['hp'])

def mk(tag, **attrs):
    e = etree.Element(HP + tag)
    for k, v in attrs.items(): e.set(k, v)
    return e

def new_p(pp='0', st='0', cb=False):
    p = mk('p', id='2147483648', paraPrIDRef=pp, styleIDRef=st, pageBreak='0',
           columnBreak='1' if cb else '0', merged='0')
    return p

def finish_p(p):
    for l in p.findall(HP + 'linesegarray'): p.remove(l)
    if not p.findall(HP + 'run'): p.append(mk('run', charPrIDRef='0'))
    p.append(LSEG()); return p

def blank_p(cb=False):
    p = new_p('0', '0', cb); p.append(mk('run', charPrIDRef='0')); return finish_p(p)

def tbl_p(tbl, pp='0', st='6', cb=False, cp='1'):
    p = new_p(pp, st, cb); r = mk('run', charPrIDRef=cp); r.append(tbl); p.append(r)
    r2 = mk('run', charPrIDRef=cp); r2.append(mk('t')); p.append(r2)
    return finish_p(p)

def cells(tbl):
    out = {}
    for tc in tbl.findall(HP + 'tr/' + HP + 'tc'):   # ⚠ 바로 아래 칸만 (안쪽 선지 표 칸을 집으면 안 된다)
        a = tc.find(HP + 'cellAddr'); out[(int(a.get('rowAddr')), int(a.get('colAddr')))] = tc
    return out

def set_cell(tc, paras):
    sl = tc.find(HP + 'subList')
    for p in sl.findall(HP + 'p'): sl.remove(p)
    for p in paras: sl.append(finish_p(p))

# ───────────────────────── 3. 작업 파일 읽기 ─────────────────────────
wsec = parse(f'{WRK}/Contents/section0.xml'); wps = wsec.getroot().findall(HP + 'p')

def run_children(p):
    for r in p.findall(HP + 'run'):
        for c in r: yield r.get('charPrIDRef'), c

def has(p, tag): return p.find('.//' + HP + tag) is not None
def ptext(p): return ''.join(t.text or '' for t in p.iter(HP + 't')) + ''.join((x.tail or '') for t in p.iter(HP + 't') for x in t)

units = []   # [(번호, 제목)]
probs = []   # dict
cur_unit = None; cur_scene = None; cur = None
for p in wps:
    kids = list(run_children(p))
    cprs = {c for c, _ in kids}
    txt = ''.join(''.join(e.itertext()) for c, e in kids if ln(e) == 't').strip()
    is_note = any(ln(e) == 'ctrl' and e.find(HP + 'endNote') is not None for _, e in kids)
    if '3' in cprs and txt and not is_note:          # 유형 머리 / scene3
        if txt.lower() == 'scene3':
            cur_scene = 3; cur = None; continue
        m = re.match(r'^\s*(?:(\d+)\s*[.,])?\s*(.+?)\s*$', txt)
        assert m, txt
        units.append((len(units) + 1, m.group(2))); cur_unit = len(units) - 1; cur = None; continue
    if is_note:   # 미주 문단 맨 앞의 'SCENE3' + 줄바꿈 표지
        tt = [e for _, e in kids if ln(e) == 't']
        if tt and re.match(r'^\s*SCENE\s*3\s*$', ''.join(tt[0].itertext()) or ''):
            for x in list(tt[0]): tt[0].remove(x)
            tt[0].text = ''; cur_scene = 3
    if not is_note and re.match(r'^SCENE\s*\d$', txt):
        cur_scene = int(txt[-1]); cur = None; continue
    if is_note:
        cur = {'unit': cur_unit if cur_scene != 3 else None, 'scene': cur_scene, 'paras': []}
        probs.append(cur)
    if cur is not None: cur['paras'].append(p)
note(f'작업 파일 — 유형 {len(units)}개 · 문항 {len(probs)}개')

# ───────────────────────── 4. 문항 하나를 조각으로 ─────────────────────────
CIRC = '①②③④⑤'
def is_empty_p(p):
    for _, e in run_children(p):
        t = ln(e)
        if t == 't' and ''.join(e.itertext()).strip(): return False
        if t in ('equation', 'pic', 'rect', 'tbl', 'container'): return False
        if t == 'ctrl' and e.find(HP + 'endNote') is not None: return False
    return True

def tokens_of(elems):
    """run 안 요소들 → [('t',글) | ('eq',el) | ('br',)] (tab·lineBreak 는 br)"""
    out = []
    for e in elems:
        t = ln(e)
        if t == 't':
            if e.text: out.append(('t', e.text))
            for x in e:
                if ln(x) in ('tab', 'lineBreak'): out.append(('br',))
                elif ln(x) in ('fwSpace', 'nbSpace'): out.append(('t', ' '))
                if x.tail: out.append(('t', x.tail))
        elif t == 'equation': out.append(('eq', e))
    return out

def runs_from_tokens(toks, cp='1'):
    """토큰 → 한 run (글자 모양 cp)"""
    r = mk('run', charPrIDRef=cp)
    for k in toks:
        if k[0] == 't':
            if not k[1]: continue
            t = mk('t'); t.text = k[1]; r.append(t)
        elif k[0] == 'eq': r.append(copy.deepcopy(k[1]))
    if len(r) == 0 or ln(r[-1]) == 'equation': r.append(mk('t'))
    return r

def trim(toks):
    toks = [k for k in toks if k[0] != 'br']
    while toks and toks[0][0] == 't' and not toks[0][1].strip(): toks.pop(0)
    while toks and toks[-1][0] == 't' and not toks[-1][1].strip(): toks.pop()
    if toks and toks[0][0] == 't': toks[0] = ('t', toks[0][1].lstrip())
    if toks and toks[-1][0] == 't': toks[-1] = ('t', toks[-1][1].rstrip())
    return toks

def split_marks(toks, marks):
    """글자 토큰 안의 표지(①… / ㄱ. …)로 가른다. 표지 앞의 것은 버린다."""
    groups = []; curg = None
    for k in toks:
        if k[0] != 't':
            if curg is not None: curg.append(k)
            continue
        s = k[1]; i = 0
        while i < len(s):
            m = marks.search(s, i)
            if not m:
                if curg is not None: curg.append(('t', s[i:]))
                break
            if curg is not None and m.start() > i: curg.append(('t', s[i:m.start()]))
            curg = []; groups.append((m.group(1), curg)); i = m.end()
    return [(lab, trim(g)) for lab, g in groups]

CHO_RE = re.compile(r'([①②③④⑤])\s*')
BOGI_RE = re.compile(r'([ㄱㄴㄷㄹㅁㅂ])\.\s*')

def text_w(s):
    w = 0
    for ch in s:
        if '가' <= ch <= '힣' or 'ㄱ' <= ch <= 'ㆎ': w += 1000
        elif ch == ' ': w += 330
        elif ch in '①②③④⑤': w += 1000
        else: w += 520
    return w
def eq_wh(e):
    sz = e.find(HP + 'sz'); return int(sz.get('width')), int(sz.get('height'))
def toks_w(toks):
    return sum(text_w(k[1]) if k[0] == 't' else eq_wh(k[1])[0] for k in toks if k[0] != 'br')

def fill_frame(nrow, choices):
    tbl = copy.deepcopy(FRAME[nrow]); cs = cells(tbl)
    order = {1: [(0, 1), (0, 3), (0, 5), (0, 7), (0, 9)],
             2: [(0, 1), (0, 3), (0, 5), (1, 1), (1, 3)],
             3: [(0, 1), (0, 3), (1, 1), (1, 3), (2, 1)],
             5: [(0, 1), (1, 1), (2, 1), (3, 1), (4, 1)]}[nrow]
    for (lab, toks), rc in zip(choices, order):
        p = new_p('0', '6'); p.append(runs_from_tokens(toks)); set_cell(cs[rc], [p])
    return tbl

def choose_frame(choices):
    ws = [toks_w(t) for _, t in choices]
    eqs = [k[1] for _, t in choices for k in t if k[0] == 'eq']
    scripts = ' '.join((e.find(HP + 'script').text or '') for e in eqs)
    hangul = ''.join(k[1] for _, t in choices for k in t if k[0] == 't')
    only_gnd = all(re.fullmatch(r'[ㄱㄴㄷㄹㅁ,\s]*', ''.join(k[1] for k in t if k[0] == 't')) and not any(k[0] == 'eq' for k in t) for _, t in choices)
    long_text = any(len(re.sub(r'[\sㄱㄴㄷㄹㅁ,]', '', ''.join(k[1] for k in t if k[0] == 't'))) > 0 for _, t in choices)
    mx = max(ws)
    if only_gnd: return 2 if mx <= 5600 else 3
    if mx > 9200: return 5
    if long_text: return 2 if mx <= 5600 else 3
    if mx <= 2100 and not re.search(r'sqrt|root', scripts, re.I): return 1
    if mx <= 5600: return 2
    return 3

def para_lines_h(toks, avail=22680):
    """한 문단(토큰) 높이 어림"""
    lines = [[]]
    for k in toks:
        if k[0] == 'br' and k is not None and getattr(k, '_lb', False): lines.append([])
        else: lines[-1].append(k)
    h = 0
    for L in lines:
        w = toks_w(L); n = max(1, math.ceil(w / avail))
        eh = max([eq_wh(k[1])[1] for k in L if k[0] == 'eq'] + [1000])
        h += n * (max(1000, eh) + 600)
    return h

def frame_h(nrow, choices):
    eh = max([eq_wh(k[1])[1] for _, t in choices for k in t if k[0] == 'eq'] + [1000])
    row = {1: 1283, 2: 1665, 3: 1665, 5: 1595}[nrow]
    rows = {1: 1, 2: 2, 3: 3, 5: 5}[nrow]
    return rows * max(row, eh + 566) + 600

def scrub_pic(pic):
    sc = pic.find(HP + 'shapeComment')
    if sc is not None and sc.text and '장은영' in sc.text:
        sc.text = '그림입니다.'; note('그림 설명문의 사람 이름을 지움')

def body_pic(pic):
    pic = copy.deepcopy(pic); scrub_pic(pic)
    for im in pic.iter(HC + 'img'): im.set('binaryItemIDRef', new_img(im.get('binaryItemIDRef')))
    pos = pic.find(HP + 'pos')
    pos.set('treatAsChar', '1'); pos.set('vertRelTo', 'PARA'); pos.set('horzRelTo', 'PARA')
    pos.set('vertAlign', 'TOP'); pos.set('horzAlign', 'LEFT'); pos.set('vertOffset', '0'); pos.set('horzOffset', '0')
    pic.set('textWrap', 'TOP_AND_BOTTOM')
    return pic

def box_lines(box_paras, kind):
    """보기·조건 상자 안 문단 → 줄 토큰 목록"""
    out = []
    for p in box_paras:
        if has(p, 'rect'): continue
        toks = tokens_of([e for _, e in run_children(p)])
        txt = ''.join(k[1] for k in toks if k[0] == 't')
        if re.sub(r'\s', '', txt) in ('<보기>', '<보기>', '<보 기>', '<보기>'.replace(' ', '')) or re.sub(r'\s', '', txt) == '<보기>':
            continue
        if not any(k[0] == 'eq' for k in toks) and not txt.strip(): continue
        out.append(toks)
    if kind == 'bogi':   # ㄱ. ㄴ. … 을 한 줄에 하나씩
        allt = []
        for t in out: allt += t + [('br',)]
        items = split_marks(allt, BOGI_RE)
        return [[('t', f'{lab}. ')] + t for lab, t in items]
    # 조건 상자: 문단의 원래 요소를 그대로 (앞 tab 살림 · 끝 lineBreak 만 걷음)
    raw = []
    for p in box_paras:
        if has(p, 'rect'): continue
        els = [copy.deepcopy(e) for _, e in run_children(p) if ln(e) in ('t', 'equation')]
        for e in els:
            if ln(e) == 't':
                for x in list(e):
                    if ln(x) == 'lineBreak':
                        prev = x.getprevious()
                        if x.tail:
                            if prev is not None: prev.tail = (prev.tail or '') + x.tail
                            else: e.text = (e.text or '') + x.tail
                        e.remove(x)
        if not els: continue
        raw.append(els)
    return raw

def scale_pic(pic, k):
    def mul(el, *attrs):
        for a in attrs:
            v = int(el.get(a)); v = v - 2**32 if v > 2**31 else v
            el.set(a, str(round(v * k)) if v >= 0 else str(2**32 + round(v * k)))
    mul(pic.find(HP + 'curSz'), 'width', 'height'); mul(pic.find(HP + 'sz'), 'width', 'height')
    mul(pic.find(HP + 'offset'), 'x', 'y'); mul(pic.find(HP + 'rotationInfo'), 'centerX', 'centerY')
    ri = pic.find(HP + 'renderingInfo')
    tm = ri.find(HC + 'transMatrix'); tm.set('e3', str(float(tm.get('e3')) * k).rstrip('0').rstrip('.')); tm.set('e6', str(float(tm.get('e6')) * k).rstrip('0').rstrip('.'))
    sm = ri.find(HC + 'scaMatrix')
    for a in ('e1', 'e3', 'e5', 'e6'): sm.set(a, ('%.6f' % (float(sm.get(a)) * k)).rstrip('0').rstrip('.'))

def fit_pictbl(tbl, W):
    """그림 선지 표를 단 폭에 맞춘다 — 표지 칸은 그대로, 그림 칸만 줄이고 그림도 줄인다"""
    tcs = tbl.findall(HP + 'tr/' + HP + 'tc')
    ncol = int(tbl.get('colCnt')); colw = {}
    for tc in tcs: colw[int(tc.find(HP + 'cellAddr').get('colAddr'))] = int(tc.find(HP + 'cellSz').get('width'))
    lab = [c for c in range(ncol) if colw[c] < 3000]; picc = [c for c in range(ncol) if c not in lab]
    pw = (W - sum(colw[c] for c in lab)) // len(picc)
    rowh = {}
    for tc in tcs:
        a = tc.find(HP + 'cellAddr'); c = int(a.get('colAddr')); r = int(a.get('rowAddr'))
        cs = tc.find(HP + 'cellSz'); m = tc.find(HP + 'cellMargin')
        if c in picc: cs.set('width', str(pw))
        h = 0
        for pic in tc.iter(HP + 'pic'):
            sz = pic.find(HP + 'sz'); w = int(sz.get('width'))
            k = min(1.0, (pw - int(m.get('left')) - int(m.get('right')) - 200) / w)
            if k < 1: scale_pic(pic, k)
            h = max(h, int(pic.find(HP + 'sz').get('height')))
        need = h + int(m.get('top')) + int(m.get('bottom')) + 200 if h else 0
        rowh[r] = max(rowh.get(r, 0), need, 3337)
    for tc in tcs:
        r = int(tc.find(HP + 'cellAddr').get('rowAddr')); tc.find(HP + 'cellSz').set('height', str(rowh[r]))
    sz = tbl.find(HP + 'sz'); sz.set('width', str(W)); sz.set('height', str(sum(rowh.values())))
    note(f'그림 선지 표를 폭 {W} 로 맞춤 (높이 {sum(rowh.values())})')

def build_problem(pr, num):
    paras = [p for p in pr['paras']]
    note_el = None; src = None
    items = []   # ('text', toks) | ('pic', el) | ('bogi', lines) | ('cond', lines) | ('choices', list)
    cho_start = None
    for i, p in enumerate(paras):
        toks = tokens_of([e for _, e in run_children(p)])
        txt = ''.join(k[1] for k in toks if k[0] == 't').strip()
        if cho_start is None and txt.startswith('①') and not has(p, 'rect') and not has(p, 'tbl'):
            cho_start = i
    body = paras if cho_start is None else paras[:cho_start]
    for p in body:
        cur_toks = []
        def flush():
            nonlocal cur_toks
            if cur_toks and any(ln(e) == 'equation' or ''.join(e.itertext()).strip() for _, e in cur_toks):
                items.append(('text', cur_toks))
            cur_toks = []
        for cp, e in run_children(p):
            t = ln(e)
            if t == 'ctrl':
                en = e.find(HP + 'endNote')
                if en is not None: note_el = en
                continue
            if t in ('t', 'equation'):
                cur_toks.append(('el', e)); continue
            if t == 'pic':   # 글 가운데 박힌 그림(48번 «오[그림]른쪽»)도 글을 끊지 않는다
                items.append(('pic', e)); continue
            if t == 'rect':
                flush()
                inner = [x for x in e.iter(HP + 'p')]
                is_bogi = '보기' in ''.join(e.itertext())
                items.append(('bogi' if is_bogi else 'cond', box_lines(inner, 'bogi' if is_bogi else 'cond'))); continue
            if t == 'tbl' and e.find('.//' + HP + 'pic') is not None and '①' in ''.join(e.itertext()):
                flush(); items.append(('pictbl', e)); continue   # 그림 선지 표 — 그대로 옮긴다
            if t == 'tbl':
                flush()
                assert '보' in ''.join(e.itertext()) and '기' in ''.join(e.itertext()), '모르는 표'
                cs = cells(e); inner = list(cs[(2, 0)].iter(HP + 'p'))
                items.append(('bogi', box_lines(inner, 'bogi'))); continue
            if t in ('secPr',): continue
            note(f'문항 {num}: 모르는 요소 {t} 를 건너뜀')
        flush()
    # 'el' 토큰은 원래 요소를 그대로 들고 간다 (tab·lineBreak 살림)
    if cho_start is not None:
        ctoks = tokens_of([e for p in paras[cho_start:] for _, e in run_children(p)])
        choices = split_marks(ctoks, CHO_RE)
        if [c[0] for c in choices] != list(CIRC):
            note(f'⚠ 문항 {num}: 선지 표지가 {[c[0] for c in choices]}');
        items.append(('choices', choices))
        for p in paras[cho_start:]:
            for _, e in run_children(p):
                if ln(e) == 'pic': items.append(('pic', e)); note(f'문항 {num}: 선지 뒤 그림을 선지 앞으로'); continue
                if ln(e) not in ('t', 'equation'): note(f'⚠ 문항 {num}: 선지 문단에 {ln(e)}')
    assert note_el is not None
    hc = note_el.find('.//' + HP + 'hiddenComment')
    src = ''.join(hc.itertext()).strip()
    book = re.match(r'^(고쟁이|유형반복R|올림포스유형편|절대등급)', src)
    assert book, src
    tag = {'고쟁이': '[고쟁이]', '유형반복R': '[유형반복R]', '올림포스유형편': '[올유]', '절대등급': '[절대등급]'}[book.group(1)]

    # 그림은 «본문 글» 다음, 첫 상자/선지 앞으로
    pics = [it for it in items if it[0] == 'pic']; rest = [it for it in items if it[0] != 'pic']
    k = next((i for i, it in enumerate(rest) if it[0] in ('bogi', 'cond', 'choices', 'pictbl')), len(rest))
    items = rest[:k] + pics + rest[k:]

    # ── 칸 문단 짓기 ──
    out = []; est = 0; first_text = True
    for kind, val in items:
        if kind == 'text':
            p = new_p('0', '6'); r = mk('run', charPrIDRef='1')
            for _, e in val:
                c = copy.deepcopy(e)
                if ln(c) == 't':
                    if first_text:   # 미주 뒤 공백 한 칸을 걷는다
                        if c.text and c.text.strip(): c.text = c.text.lstrip(); first_text = False
                        elif c.text: c.text = ''
                    if c.text: c.text = c.text.replace('<보기>', '[보기]')
                    for x in c:
                        if x.tail: x.tail = x.tail.replace('<보기>', '[보기]')
                    if not c.text and len(c) == 0: continue
                else:
                    first_text = False
                r.append(c)
            first_text = False
            # 이웃한 맨글 조각을 합친다 (48번 «오»+«른쪽») — 그 뒤에 «오른쪽 그림» → «다음 그림»
            kids = list(r)
            for a_, b_ in zip(kids, kids[1:]):
                if ln(a_) == 't' and ln(b_) == 't' and len(a_) == 0 and len(b_) == 0 and b_.getparent() is r:
                    b_.text = (a_.text or '') + (b_.text or ''); r.remove(a_)
            for t_ in r.findall(HP + 't'):
                if t_.text and '오른쪽 그림' in t_.text:
                    t_.text = t_.text.replace('오른쪽 그림', '다음 그림'); note(f'문항 {num}: 오른쪽 그림 → 다음 그림')
            if len(r) == 0 or ln(r[-1]) == 'equation': r.append(mk('t'))
            p.append(r); out.append(p)
            tk = tokens_of([e for _, e in val]); est += para_lines_h(tk)
        elif kind == 'pic':
            p = new_p('1', '6'); r = mk('run', charPrIDRef='1'); r.append(body_pic(val)); r.append(mk('t')); p.append(r); out.append(p)
            est += int(val.find(HP + 'sz').get('height')) + 600
        elif kind in ('bogi', 'cond'):
            if kind == 'bogi':
                tbl = copy.deepcopy(BOGI_T); cell = cells(tbl)[(2, 0)]
                sl = cell.find(HP + 'subList'); proto = sl.findall(HP + 'p')[0]
                ctrl_run = copy.deepcopy(proto.find(HP + 'run'))   # 단 설정 ctrl 이 든 run
                for x in list(ctrl_run):
                    if ln(x) != 'ctrl': ctrl_run.remove(x)
                ps = []
                for j, lt in enumerate(val):
                    p = new_p('0', '6')
                    if j == 0 and len(ctrl_run): p.append(ctrl_run)
                    p.append(runs_from_tokens(lt)); ps.append(p)
                set_cell(cell, ps); out.append(tbl_p(tbl, '0', '6'))
                est += 564 + 283 + 566 + sum(para_lines_h(t, 21208) for t in val) + 600
            else:
                tbl = copy.deepcopy(COND_T); cell = cells(tbl)[(0, 0)]
                ps = []
                for els in val:
                    p = new_p('0', '6'); r = mk('run', charPrIDRef='1')
                    for e2 in els: r.append(e2)
                    if len(r) == 0 or ln(r[-1]) == 'equation': r.append(mk('t'))
                    p.append(r); ps.append(p)
                set_cell(cell, ps); out.append(tbl_p(tbl, '1', '6'))
                est += 566 * 2 + 568 + sum(para_lines_h(tokens_of(els), 21411) for els in val) + 600
        elif kind == 'pictbl':
            c = copy.deepcopy(val); fix_refs(c, True)
            pos = c.find(HP + 'pos'); pos.set('treatAsChar', '1')
            fit_pictbl(c, 22228)
            out.append(tbl_p(c, '1', '6'))
            est += int(c.find(HP + 'sz').get('height')) + 600
            pr['frame'] = 'pic'
        elif kind == 'choices':
            nrow = choose_frame(val)
            out.append(tbl_p(fill_frame(nrow, val), '0', '6'))
            est += frame_h(nrow, val)
            pr['frame'] = nrow
    pr['est'] = est
    return out, note_el, tag, src

# 텍스트 조각: tokens_of 는 ('el', e) 를 모른다 → 감싸 준다
_old_tokens_of = tokens_of
def tokens_of(elems):
    flat = []
    for e in elems:
        if isinstance(e, tuple): flat.append(e[1])
        else: flat.append(e)
    return _old_tokens_of(flat)

# ───────────────────────── 5. 미주 옮기기 ─────────────────────────
img_map = {}   # 작업 binaryItemIDRef → 새 id
wman = parse(f'{WRK}/Contents/content.hpf').getroot()
wimg = {i.get('id'): i.get('href') for i in wman.iter('{%s}item' % NS['opf'])}
def new_img(wid):
    if wid not in img_map:
        img_map[wid] = 'image' + str(100 + int(re.sub(r'\D', '', wid)))
    return img_map[wid]

def fix_refs(el, in_note):
    for e in el.iter():
        if not isinstance(e.tag, str): continue
        if e.get('paraPrIDRef') is not None and in_note: e.set('paraPrIDRef', para_id(e.get('paraPrIDRef')))
        if e.get('charPrIDRef') is not None and in_note: e.set('charPrIDRef', char_id(e.get('charPrIDRef')))
        if e.get('styleIDRef') is not None and in_note: e.set('styleIDRef', '0')
        if ln(e) in ('tbl', 'tc') and e.get('borderFillIDRef') is not None and in_note:
            e.set('borderFillIDRef', bf_id(e.get('borderFillIDRef')))
        if e.get('binaryItemIDRef') is not None: e.set('binaryItemIDRef', new_img(e.get('binaryItemIDRef')))
        if ln(e) == 'pic': scrub_pic(e)
        if ln(e) == 't':   # 해설 안의 <보기> 도 [보기] 로
            if e.text: e.text = e.text.replace('<보기>', '[보기]')
            for x in e:
                if x.tail: x.tail = x.tail.replace('<보기>', '[보기]')

# ───────────────────────── 6. SCENE 별로 다시 세우기 ─────────────────────────
order = []
for sc in (1, 2, 3):
    for u in range(len(units)):
        for pr in probs:
            if pr['scene'] == sc and (sc == 3 or pr['unit'] == u):
                if pr not in order: order.append(pr)
    if sc == 3:
        for pr in probs:
            if pr['scene'] == 3 and pr not in order: order.append(pr)
assert len(order) == len(probs)

COLCAP = 66049
SCENE_MAX = {1: 3, 2: 2, 3: 1}
H_SCENE, H_TYPE, H_BLANK = 3130 + 600, 1413 + 600, 1600

def type_p(n, title, cb):
    p = copy.deepcopy(TYPE_P)
    p.set('columnBreak', '1' if cb else '0'); p.set('pageBreak', '0')
    t = first_tbl(p); cs = cells(t)
    num_t = [x for x in cs[(0, 0)].iter(HP + 't') if (x.text or '').strip()][0]; num_t.text = str(n)
    ttl = [x for x in cs[(0, 1)].iter(HP + 't') if (x.text or '').strip()][0]; ttl.text = ' ' + title
    for q in p.iter(HP + 'p'): finish_p(q)
    return p

note_no = 0
built = []
for pr in order:
    note_no += 1
    out, en, tag, src = build_problem(pr, note_no)
    pr.update(cell=out, note=en, tag=tag, src=src, num=note_no)
    pr['h'] = 2080 + 1000 + max(15271, pr['est']) + 600

def problem_p(pr, cb):
    tbl = copy.deepcopy(PROB_T); cs = cells(tbl)
    # 번호 칸
    np_ = cs[(0, 0)].find(HP + 'subList').find(HP + 'p')
    np_.set('paraPrIDRef', '11' if pr['num'] <= 9 else '28'); np_.set('styleIDRef', '4')
    set_cell(cs[(0, 0)], [np_])
    # 출처 + 미주 칸
    p = new_p('0', '6'); r = mk('run', charPrIDRef='34')
    if pr['num'] == 1:
        c = mk('ctrl'); c.append(mk('newNum', num='1', numType='ENDNOTE')); r.append(c)
    en = copy.deepcopy(pr['note']); en.set('number', str(pr['num']))
    for an in en.iter(HP + 'autoNum'): an.set('num', str(pr['num']))
    fix_refs(en, True)
    for q in en.iter(HP + 'p'): finish_p(q)
    c = mk('ctrl'); c.append(en); r.append(c)
    t = mk('t'); mb = mk('markpenBegin', color='#FF0000'); mb.tail = pr['tag']; t.append(mb); t.append(mk('markpenEnd'))
    r.append(t); p.append(r)
    set_cell(cs[(0, 1)], [p])
    # 본문 칸 (높이는 같은 줄 맞은편 문항과 맞춘다)
    set_cell(cs[(2, 0)], pr['cell'])
    ch = 15271   # 표는 양식 높이 그대로 (내용이 길면 한글이 늘린다)
    cs[(2, 0)].find(HP + 'cellSz').set('height', str(ch))
    tbl.find(HP + 'sz').set('height', str(2080 + 1000 + ch))
    for q in tbl.iter(HP + 'p'):
        if q.find(HP + 'linesegarray') is None: finish_p(q)
    return tbl_p(tbl, '0', '0', cb, cp='0')


# ── 쪽 배치 — 양식의 문항 위치(예시 파일의 실제 조판 좌표)를 따른다 ──
#   단 맨 위 문항은 T0 에서 시작(SCENE 머리 4012 + 유형 머리 2295 = 6307 · 예시와 같다)
#   문항 사이 최소 간격: SCENE1 빈 줄 1개(1600) · SCENE2 빈 줄 5개(8000) — 예시 그대로
#   같은 쪽 왼·오른 단의 k번째 문항은 «같은 높이»에서 시작하도록 빈 줄로 맞추고, 표 높이도 둘 중 큰 쪽으로 맞춘다.
T0 = {1: 6307, 2: 6307, 3: 4012}
GAP = {1: 1600, 2: 8000, 3: 0}
H_SCENE_HDR, H_TYPE_HDR = 4012, 2295
SPACERS = [(1600, '0'), (1440, '3'), (1280, '12'), (1120, '36'), (640, '33'), (160, '22')]  # (줄 높이, 글자 모양)

def spacer_lines(D):
    """높이 D 를 빈 줄로 — 대부분 1600 줄, 나머지는 작은 줄. 160 단위로 가장 가깝게"""
    D = max(0, int(D)); out = []
    n = D // 1600; out += ['0'] * n; rem = D - n * 1600
    best = (rem, [])
    def rec(r, used, i):
        nonlocal best
        if abs(r) < abs(best[0]) or (abs(r) == abs(best[0]) and len(used) < len(best[1])): best = (r, used[:])
        if r <= 0 or len(used) >= 7: return
        for j in range(i, len(SPACERS)):
            used.append(SPACERS[j][1]); rec(r - SPACERS[j][0], used, j); used.pop()
    rec(rem, [], 1)
    return out + best[1]

def spacer_paras(D):
    ps = []
    for cp in spacer_lines(D):
        p = new_p('0', '0'); p.append(mk('run', charPrIDRef=cp)); ps.append(finish_p(p))
    return ps

def col_layout(col, scene, T, ys_fixed=None):
    """단 하나의 문항 시작 높이. ys_fixed 를 주면 그대로. → (ys, 끝)"""
    if ys_fixed is not None:
        ys = ys_fixed
    else:
        ys = []
        for k, pr in enumerate(col):
            ys.append(T if k == 0 else ys[-1] + col[k - 1]['H'] + 600 + natural_gap(pr, scene))
    end = (ys[-1] + col[-1]['H']) if col else 0     # 마지막 표 아래 줄 간격은 단 밖으로 넘어가도 된다(예시 65224)
    return ys, end

def natural_gap(pr, scene):
    return max(GAP[scene], 1600 + (H_TYPE_HDR if pr['hdr'] else 0))

def top_need(col, first_of_scene, scene):
    return (H_SCENE_HDR if first_of_scene else 0) + (H_TYPE_HDR if col and col[0]['hdr'] else 0)

def align(L, R, scene, T):
    """표 높이는 그대로 두고, 간격(빈 줄)만 늘려 같은 줄의 문항 시작을 맞춘다"""
    yL, yR = [], []
    for k in range(max(len(L), len(R))):
        cands = {}
        if k < len(L): cands['L'] = T if k == 0 else yL[-1] + L[k - 1]['H'] + 600 + natural_gap(L[k], scene)
        if k < len(R): cands['R'] = T if k == 0 else yR[-1] + R[k - 1]['H'] + 600 + natural_gap(R[k], scene)
        y = max(cands.values())
        if 'L' in cands: yL.append(y)
        if 'R' in cands: yR.append(y)
    _, eL = col_layout(L, scene, T, yL); _, eR = col_layout(R, scene, T, yR)
    return yL, yR, eL, eR

def take(q, i, scene, T):
    n = 0
    while i + n < len(q) and n < SCENE_MAX[scene]:
        _, e = col_layout(q[i:i + n + 1], scene, T)
        if n > 0 and e > COLCAP: break
        n += 1
    return n

def page_try(q, i, scene, first_page):
    """씬 머리가 있는 쪽만 위를 내리고(6307), 나머지 쪽은 맨 위에서. 단 맨 위에 유형 머리가 있으면 그만큼만."""
    T = top_need(q[i:i + 1], first_page, scene)
    for _ in range(4):
        nL = take(q, i, scene, T); nR = take(q, i + nL, scene, T)
        T2 = max(top_need(q[i:i + 1], first_page, scene), top_need(q[i + nL:i + nL + 1], False, scene))
        if T2 == T: break
        T = T2
    while True:
        L = q[i:i + nL]; R = q[i + nL:i + nL + nR]
        yL, yR, eL, eR = align(L, R, scene, T)
        if eL <= COLCAP and eR <= COLCAP: break
        if eR > COLCAP and nR > 1: nR -= 1; continue
        if eL > COLCAP and nL > 1: nL -= 1; nR = take(q, i + nL, scene, T); continue
        break
    return (L, R, yL, yR, T)

def layout_scene(q, scene, start_right=False):
    pages = []; i = 0
    while i < len(q):
        if start_right and not pages:
            T = top_need(q[i:i + 1], True, scene); nR = take(q, i, scene, T); R = q[i:i + nR]; i += nR
            pages.append(([], R, [], col_layout(R, scene, T)[0], T)); continue
        r = page_try(q, i, scene, first_page=(not pages))
        pages.append(r); i += len(r[0]) + len(r[1])
    return pages

def emit_col(col, ys, scene, top_hdr_paras, brk):
    """단 하나의 문단들. brk: 'CB' | 'PB' | '' — 첫 문단에 건다"""
    out = list(top_hdr_paras)
    y = H_SCENE_HDR * len(top_hdr_paras)
    for k, pr in enumerate(col):
        hdr = pr['hdr']
        target = ys[k] - (H_TYPE_HDR if hdr else 0)
        out += spacer_paras(target - y)
        if hdr: out.append(type_p(pr['unit'] + 1, units[pr['unit']][1], False))
        out.append(problem_p(pr, False))
        y = ys[k] + pr['H'] + 600
    if out and brk:
        out[0].set('columnBreak', '1' if brk == 'CB' else '0'); out[0].set('pageBreak', '1' if brk == 'PB' else '0')
    return out

for pr in order:
    pr['H'] = 3080 + max(15271, pr['est'])
last_u = None
for pr in order:
    pr['hdr'] = pr['scene'] != 3 and (pr['unit'], pr['scene']) != last_u
    last_u = (pr['unit'], pr['scene'])

def first_para(proto):
    p = copy.deepcopy(proto)
    for q in p.iter(HP + 'p'): finish_p(q)
    return p

# 쪽 머리말 — 첫 쪽에만 큰 머리말(id 7)을, 둘째 쪽에서 빈 머리말(id 3)로 끈다 (양식 그대로)
first1 = first_para(FIRST_S1)
h7 = first1.find('.//' + HP + 'header')
hc7 = {tc.find(HP + 'cellAddr').get('colAddr'): tc for tc in h7.iter(HP + 'tc')}
ts = [t for t in hc7['1'].iter(HP + 't') if (t.text or '').strip()]
ts[0].text, ts[1].text = CHN.zfill(2)[0], CHN.zfill(2)[1]
[t for t in hc7['3'].iter(HP + 't') if (t.text or '').strip()][0].text = CHNAME
H3 = None
for p in s2p:
    for c in p.iter(HP + 'ctrl'):
        h = c.find(HP + 'header')
        if h is not None and h.get('id') == '3': H3 = c
assert H3 is not None

# 구역 1 의 secPr(바탕쪽 6·7) 과 SCENE 2 머리
f2 = first_para(FIRST_S2)
sec_run = f2.findall(HP + 'run')[0]; f2.remove(sec_run)          # secPr + 단 설정
s2hdr = f2
t2 = first_tbl(s2hdr); c2 = cells(t2)
for (rc, st, cp) in (((0, 0), '9', '15'), ((0, 1), '10', '16')):   # SCENE 2 전용 스타일
    for q in c2[rc].iter(HP + 'p'):
        q.set('styleIDRef', st)
        for r in q.findall(HP + 'run'): r.set('charPrIDRef', cp)
s3hdr = first_para(SCENE3_P)

q1 = [pr for pr in order if pr['scene'] == 1]
q2 = [pr for pr in order if pr['scene'] == 2]
q3 = [pr for pr in order if pr['scene'] == 3]
P1 = layout_scene(q1, 1); P2 = layout_scene(q2, 2)
P3 = layout_scene(q3, 3, start_right=(len(P2[-1][1]) == 0))
if len(P2[-1][1]) == 0: P2[-1] = P2[-1]   # 마지막 쪽 오른 단이 비면 SCENE 3 이 거기서 시작
assert len(P1) > 2

def emit_pages(pages, scene, hdr_para, first_brk):
    out_pages = []
    for pi, (L, R, yL, yR, T) in enumerate(pages):
        cols = []
        if L:
            top = [hdr_para] if pi == 0 else []
            cols.append(emit_col(L, yL, scene, top, first_brk if pi == 0 else 'CB'))
        if R:
            top = [hdr_para] if (pi == 0 and not L) else []
            cols.append(emit_col(R, yR, scene, top, first_brk if (pi == 0 and not L) else 'CB'))
        out_pages.append(cols)
        for col, side in ((L, 'L'), (R, 'R')):
            for k, pr in enumerate(col): pr['place'] = (scene, pi, side, k, T)
    return out_pages

E1 = emit_pages(P1, 1, first1, '')
E2 = emit_pages(P2, 2, s2hdr, 'PB')
E3 = emit_pages(P3, 3, s3hdr, 'CB')
# 둘째 쪽 첫 문단에 빈 머리말
p2 = E1[1][0][0]
r = mk('run', charPrIDRef='0'); r.append(copy.deepcopy(H3)); p2.insert(0, r)
flat = lambda E: [p for page in E for col in page for p in col]
sec1_children = flat(E1[:2])
rest = flat(E1[2:]) + flat(E2) + flat(E3)
rest[0].set('columnBreak', '0'); rest[0].set('pageBreak', '0')   # 새 구역 = 새 쪽
rest[0].insert(0, sec_run)
sec2_children = rest
for pr in order:
    pr['col_start'] = None
# ───────────────────────── 7. 구역 파일 쓰기 ─────────────────────────
def write_section(proto_tree, children, path, cont_endnote=True):
    root = copy.deepcopy(proto_tree.getroot())
    for p in root.findall(HP + 'p'): root.remove(p)
    for c in children: root.append(c)
    if path.endswith('section0.xml'):
        root.find('.//' + HP + 'startNum').set('page', '2')
    for num in root.iter(HP + 'endNotePr'):
        n = num.find(HP + 'numbering'); n.set('type', 'CONTINUOUS'); n.set('newNum', '1')
    etree.ElementTree(root).write(path, xml_declaration=True, encoding='UTF-8', standalone=True)
    return root

if os.path.exists(OUT): shutil.rmtree(OUT)
shutil.copytree(TPL, OUT)
for f in ('section0.xml', 'section1.xml', 'section2.xml', 'section3.xml', 'masterpage0.xml', 'masterpage1.xml', 'masterpage2.xml', 'masterpage3.xml'):
    os.remove(f'{OUT}/Contents/{f}')
r1 = write_section(s2, sec1_children, f'{OUT}/Contents/section0.xml')
r2 = write_section(s3, sec2_children, f'{OUT}/Contents/section1.xml')

# 홀수 쪽 바탕쪽의 단원 이름
mp = open(f'{OUT}/Contents/masterpage5.xml', encoding='utf8').read()
assert mp.count('01. 평면좌표') == 1
open(f'{OUT}/Contents/masterpage5.xml', 'w', encoding='utf8').write(mp.replace('01. 평면좌표', CHN.zfill(2) + '. ' + CHNAME))

# 개체 번호 다시 매기기 (복제한 틀의 id 가 겹치면 한글이 튕긴다)
gid = [1300000000]
SHAPES = {'pic', 'rect', 'equation', 'line', 'ellipse', 'arc', 'polygon', 'curve', 'container', 'ole', 'connectLine', 'textart', 'tbl'}
for path in (f'{OUT}/Contents/section0.xml', f'{OUT}/Contents/section1.xml'):
    t = parse(path)
    for e in t.getroot().iter():
        if not isinstance(e.tag, str): continue
        if ln(e) in SHAPES and e.get('id') is not None:
            gid[0] += 1; e.set('id', str(gid[0]))
        if e.get('instid') is not None:
            gid[0] += 1; e.set('instid', str(gid[0]))
    t.write(path, xml_declaration=True, encoding='UTF-8', standalone=True)

# 머리 쓰기
hd = troot.find('.')
troot.set('secCnt', '2')
th.write(f'{OUT}/Contents/header.xml', xml_declaration=True, encoding='UTF-8', standalone=True)

# ───────────────────────── 8. 그림 · 꾸러미 목록 ─────────────────────────
used_bin = set()
for f in os.listdir(f'{OUT}/Contents'):
    if f.endswith('.xml'):
        used_bin |= set(re.findall(r'binaryItemIDRef="([^"]+)"', open(f'{OUT}/Contents/{f}', encoding='utf8').read()))
man = parse(f'{OUT}/Contents/content.hpf'); mroot = man.getroot()
OPF = '{%s}' % NS['opf']
manifest = mroot.find(OPF + 'manifest'); spine = mroot.find(OPF + 'spine')
for it in list(manifest):
    i = it.get('id')
    if i in ('section2', 'section3', 'masterpage0', 'masterpage1', 'masterpage2', 'masterpage3', 'section0', 'section1'):
        manifest.remove(it); continue
    if it.get('href', '').startswith('BinData/') and i not in used_bin:
        os.remove(f'{OUT}/{it.get("href")}'); manifest.remove(it)
# 구역 둘
for sid in ('section0', 'section1'):
    e = etree.SubElement(manifest, OPF + 'item'); e.set('id', sid); e.set('href', f'Contents/{sid}.xml'); e.set('media-type', 'application/xml')
for ir in list(spine):
    if ir.get('idref') in ('section2', 'section3'): spine.remove(ir)
for sid in ('section0', 'section1'):
    if not any(ir.get('idref') == sid for ir in spine):
        e = etree.SubElement(spine, OPF + 'itemref'); e.set('idref', sid); e.set('linear', 'yes')
# 작업 그림
MT = {'bmp': 'image/bmp', 'png': 'image/png', 'jpg': 'image/jpg', 'jpeg': 'image/jpg', 'gif': 'image/gif'}
for wid, nid in img_map.items():
    href = wimg[wid]; ext = href.rsplit('.', 1)[1].lower()
    nh = f'BinData/{nid}.{ext}'
    shutil.copy(f'{WRK}/{href}', f'{OUT}/{nh}')
    e = etree.SubElement(manifest, OPF + 'item'); e.set('id', nid); e.set('href', nh); e.set('media-type', MT[ext]); e.set('isEmbeded', '1')
man.write(f'{OUT}/Contents/content.hpf', xml_declaration=True, encoding='UTF-8', standalone=True)

# 미리보기 글 · 커서
prv = []
for pr in order[:12]:
    prv.append(''.join(''.join(e.itertext()) for p in pr['cell'][:1] for e in p.iter(HP + 't')))
open(f'{OUT}/Preview/PrvText.txt', 'w', encoding='utf8').write('\r\n'.join(prv)[:1000])
st = open(f'{OUT}/settings.xml', encoding='utf8').read()
st = re.sub(r'<ha:CaretPosition [^>]*/>', '<ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>', st)
open(f'{OUT}/settings.xml', 'w', encoding='utf8').write(st)

# 보고
summary = []
for pr in order:
    summary.append({'num': pr['num'], 'scene': pr['scene'], 'unit': (pr['unit'] + 1) if pr['unit'] is not None else None,
                    'src': pr['src'], 'tag': pr['tag'], 'frame': pr.get('frame'), 'est': pr['est'], 'H': pr['H'], 'cellH': pr.get('cellH'), 'place': pr.get('place')})
json.dump({'units': units, 'probs': summary, 'notes': REPORT}, open(f'{OUT}/../build-report.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('\n'.join(REPORT[:60]))
print('문항', len(order), '· 그림', len(img_map))
