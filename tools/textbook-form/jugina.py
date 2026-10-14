# 주기나(기출 변형) 2025 판 단원 hwpx → 2026 「[2026][주기나][1-2기말][2.명제]」 양식으로.
# 쓰는 법: python3 -I jugina.py <양식 풀린 폴더> <2025 풀린 폴더> <나갈 폴더> --unit 7 --name 함수 --start 104 --title-page 35
#   · 양식 파일을 통째로 복사해 차례(구역0)·단원명 쪽(구역1)·바탕쪽·쪽 설정은 그대로 두고, 단원 이름만 바꾼다
#   · 문항은 양식의 문항 틀(번호 상자 · 미주+유형 딱지 · 출처 · 본문)에 2025 의 출처·정답·본문을 옮겨 담는다
#   · 한 단에 든 문항은 2025 판 그대로(단·쪽 나눔을 그대로 옮긴다) — 두세 문항 단은 문항 밑 빈자리를 고르게
#   · 본문 글꼴은 양식(KoPubWorld돋움체 Medium · 장평 100)으로, 표 테두리 0.25mm → 0.3mm(양식 값)
#   · 문항 번호 = --start 부터 이어서(문단 번호) · 미주 번호도 같은 수
import sys, os, re, copy, glob, shutil, json, math, hashlib, argparse
from lxml import etree

ap = argparse.ArgumentParser()
ap.add_argument('tpl'); ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--unit', type=int, required=True); ap.add_argument('--name', required=True)
ap.add_argument('--start', type=int, required=True); ap.add_argument('--title-page', type=int, required=True)
A = ap.parse_args()

HP = '{http://www.hancom.co.kr/hwpml/2011/paragraph}'; HH = '{http://www.hancom.co.kr/hwpml/2011/head}'
HC = '{http://www.hancom.co.kr/hwpml/2011/core}'; OPF = '{http://www.idpf.org/2007/opf/}'
def ln(e): return etree.QName(e).localname
def parse(p): return etree.parse(p, etree.XMLParser(remove_blank_text=False, huge_tree=True))
REPORT = []
def note(*a): REPORT.append(' '.join(str(x) for x in a))
def sec_no(f): return int(re.search(r'section(\d+)\.xml$', f).group(1))

if os.path.exists(A.out): shutil.rmtree(A.out)
shutil.copytree(A.tpl, A.out)
D = A.out + '/Contents'
TH = parse(D + '/header.xml'); TR = TH.getroot()
SH = parse(A.src + '/Contents/header.xml'); SR = SH.getroot()
def group(root, tag):
    for g in root.iter():
        if isinstance(g.tag, str) and ln(g) == tag: return g
def canon(el):
    e = copy.deepcopy(el); e.attrib.pop('id', None)
    return re.sub(r' xmlns:\w+="[^"]*"', '', etree.tostring(e, encoding='unicode'))
def add_item(grp, el):
    ids = [int(x.get('id')) for x in grp]
    el.set('id', str(max(ids) + 1)); grp.append(el); grp.set('itemCnt', str(len(grp)))
    return el.get('id')
def by_id(root, tag): return {e.get('id'): e for e in root.iter(HH + tag)}

# ───────────── 머리 서식 옮기기 (같은 정의가 양식에 있으면 그것) ─────────────
GRP = {'borderFill': 'borderFills', 'charPr': 'charProperties', 'paraPr': 'paraProperties', 'tabPr': 'tabProperties'}
SRC = {k: by_id(SR, k) for k in GRP}
MAP = {k: {} for k in GRP}
TCP4 = by_id(TR, 'charPr')['4']                         # 양식 본문 글자(KoPubWorld돋움체 Medium 11pt)
def imp(kind, sid, fix):
    if sid in MAP[kind]: return MAP[kind][sid]
    e = copy.deepcopy(SRC[kind][sid]); fix(e)
    g = group(TR, GRP[kind]); key = canon(e)
    for x in g:
        if canon(x) == key: MAP[kind][sid] = x.get('id'); return x.get('id')
    MAP[kind][sid] = add_item(g, e); return MAP[kind][sid]
def fix_bf(e):
    for b in e:
        if ln(b) in ('leftBorder', 'rightBorder', 'topBorder', 'bottomBorder') and b.get('width') == '0.25 mm':
            b.set('width', '0.3 mm')                       # 양식의 상자·[보기] 테두리 굵기
def fix_char(e):
    for k in ('fontRef', 'ratio'):
        old = e.find(HH + k); new = copy.deepcopy(TCP4.find(HH + k)); e.replace(old, new)
    if e.get('borderFillIDRef'): e.set('borderFillIDRef', bf_id(e.get('borderFillIDRef')))
def fix_tab(e): pass
def fix_para(e):
    if e.get('tabPrIDRef'): e.set('tabPrIDRef', imp('tabPr', e.get('tabPrIDRef'), fix_tab))
    hd = e.find(HH + 'heading')
    if hd is not None and hd.get('type') != 'NONE': raise SystemExit('본문 문단에 번호 머리 — 손으로 볼 것')
    for b in e.iter(HH + 'border'):
        if b.get('borderFillIDRef'): b.set('borderFillIDRef', bf_id(b.get('borderFillIDRef')))
def bf_id(s): return imp('borderFill', s, fix_bf)
def cp_id(s): return imp('charPr', s, fix_char)
def pp_id(s): return imp('paraPr', s, fix_para)

# ───────────── 그림 옮기기 ─────────────
THPF = parse(D + '/content.hpf'); TMAN = THPF.getroot().find('.//' + OPF + 'manifest')
SMAN = {it.get('id'): it for it in parse(A.src + '/Contents/content.hpf').iter(OPF + 'item')}
def next_img():
    ns = [int(m.group(1)) for it in TMAN for m in [re.match(r'image(\d+)$', it.get('id') or '')] if m]
    return max(ns) + 1
IMG = {}
def img_id(sid):
    if sid in IMG: return IMG[sid]
    it = SMAN[sid]; ext = os.path.splitext(it.get('href'))[1]; n = next_img(); nid = f'image{n}'
    shutil.copy(A.src + '/' + it.get('href'), A.out + f'/BinData/{nid}{ext}')
    ni = copy.deepcopy(it); ni.set('id', nid); ni.set('href', f'BinData/{nid}{ext}'); TMAN.append(ni)
    IMG[sid] = nid; return nid

# ───────────── 새 id (개체 id 겹침 막기) ─────────────
NEXT = [1900000000]
def nid():
    NEXT[0] += 1; return str(NEXT[0])
def renew_ids(el):
    for e in el.iter():
        if not isinstance(e.tag, str): continue
        if ln(e) in ('tbl', 'pic', 'equation', 'container', 'rect', 'line', 'ellipse') and e.get('id'): e.set('id', nid())
        if e.get('instid'): e.set('instid', nid())
        if e.get('instId'): e.set('instId', nid())

# ───────────── 2025 본문 옮기기(서식 번호 바꾸기 · 표 폭 줄이기) ─────────────
W_OLD, W_NEW = 29050, 27491
TPL_W = {'box': 27071, 'bogi': 26925, 'choice': 26755}
def tkind(t):
    txt = ''.join(t.itertext())
    if '[보기]' in txt or '보기' in txt and t.get('rowCnt') == '3': return 'bogi'
    if '①' in txt: return 'choice'
    if t.get('rowCnt') == '1' and t.get('colCnt') == '1': return 'box'
    return 'other'
def scale_tbl(t, k):
    sz = t.find(HP + 'sz'); sz.set('width', str(round(int(sz.get('width')) * k)))
    for tc in t.findall(HP + 'tr/' + HP + 'tc'):
        cs = tc.find(HP + 'cellSz'); cs.set('width', str(round(int(cs.get('width')) * k)))
        for inner in tc.iter(HP + 'tbl'):
            if inner is t: continue
            iw = int(inner.find(HP + 'sz').get('width'))
            if iw > int(cs.get('width')): scale_tbl(inner, int(cs.get('width')) / iw)
def convert(el, top):
    """2025 문단(또는 그 안)을 양식 머리 번호로. top = 본문 칸 바로 아래 문단"""
    for e in el.iter():
        if not isinstance(e.tag, str): continue
        k = ln(e)
        if k == 'p':
            e.set('paraPrIDRef', pp_id(e.get('paraPrIDRef')))
            e.set('styleIDRef', '3' if (e.getparent() is not None and e.getparent().get('_body') == '1') else '0')
        elif k == 'run': e.set('charPrIDRef', cp_id(e.get('charPrIDRef')))
        elif k in ('tbl', 'tc') and e.get('borderFillIDRef'): e.set('borderFillIDRef', bf_id(e.get('borderFillIDRef')))
        elif k == 'img': e.set('binaryItemIDRef', img_id(e.get('binaryItemIDRef')))
    return el
def fit_objects(body_paras):
    """본문 바로 아래 표는 양식 폭으로, 그림은 넘치면 줄인다 → (표, 배율) 목록"""
    out = []
    for p in body_paras:
        for run in p.findall(HP + 'run'):
            for c in run:
                if ln(c) == 'tbl':
                    w = int(c.find(HP + 'sz').get('width')); kd = tkind(c)
                    if w > 20000:
                        nw = TPL_W.get(kd, round(w * W_NEW / W_OLD)); k = nw / w
                        scale_tbl(c, k); out.append((c, k))
                elif ln(c) == 'pic':
                    w = int(c.find(HP + 'sz').get('width'))
                    if w > TPL_W['box']: raise SystemExit('본문 그림이 칸보다 넓다 — 손으로 볼 것')
    return out

# ───────────── 높이 어림(2025 의 실제 줄 수 + 글자 폭 모형의 «차이») ─────────────
def tw(s, ratio):
    w = 0
    for ch in s:
        if '가' <= ch <= '힣' or 'ㄱ' <= ch <= 'ㆎ' or ch in '①②③④⑤': w += 1000
        elif ch == ' ': w += 350
        elif ch in '()[],.': w += 450
        else: w += 620
    return w * ratio * 1.1 * 0.95
def model_lines(p, avail, ratio):
    w = 0
    for run in p.findall(HP + 'run'):
        for c in run:
            k = ln(c)
            if k == 't': w += tw(''.join(c.itertext()), ratio)
            elif k == 'equation': w += int(c.find(HP + 'sz').get('width'))
            elif k in ('tbl', 'pic', 'container'): return None
    return max(1, math.ceil(w / (avail * 0.95) - 0.02))
def para_delta(p, aold, anew):
    """이 문단이 새 폭에서 늘어나는 높이(어림)"""
    n_old = model_lines(p, aold, 0.95)
    if n_old is not None:
        segs = p.findall(HP + 'linesegarray/' + HP + 'lineseg')
        pitch = (int(segs[-1].get('vertsize')) + int(segs[-1].get('spacing'))) if segs else 1760
        return max(0, model_lines(p, anew, 1.0) - n_old) * pitch
    d = 0
    for run in p.findall(HP + 'run'):
        for c in run:
            if ln(c) == 'tbl': d += tbl_delta(c)
    return d
def tbl_delta(t):
    rows = {}
    for tc in t.findall(HP + 'tr/' + HP + 'tc'):
        a = tc.find(HP + 'cellAddr'); w = int(tc.find(HP + 'cellSz').get('width'))
        k = float(tc.get('_k', '1'))
        dd = sum(para_delta(p, w / k, w) for p in tc.find(HP + 'subList').findall(HP + 'p'))
        rows[a.get('rowAddr')] = max(rows.get(a.get('rowAddr'), 0), dd)
    return sum(rows.values())

# ───────────── 양식 문항 틀(유형 딱지마다 하나) ─────────────
def cells(t):
    out = {}
    for tc in t.findall(HP + 'tr/' + HP + 'tc'):
        a = tc.find(HP + 'cellAddr'); out[(int(a.get('rowAddr')), int(a.get('colAddr')))] = tc
    return out
T_BADGE = {'image8': 'OR', 'image9': 'NC', 'image11': 'UP', 'image12': 'DW'}
PROTO = {}
TSEC = {sec_no(f): parse(f) for f in glob.glob(D + '/section*.xml')}
for s in (2, 3):
    for t in TSEC[s].getroot().iter(HP + 'tbl'):
        if t.get('rowCnt') != '4' or t.find('.//' + HP + 'endNote') is None: continue
        for pic in cells(t)[(0, 1)].iter(HP + 'pic'):
            b = T_BADGE.get(pic.find('.//' + HC + 'img').get('binaryItemIDRef'))
            if b and b not in PROTO: PROTO[b] = t
assert sorted(PROTO) == ['DW', 'NC', 'OR', 'UP'], sorted(PROTO)
HEAD_H, BODY_MIN = 4414, 10814          # 양식: 위 두 줄 + 띄움 줄 · 본문 칸 최소 높이

# 번호 문단 — 양식의 «^1» 번호를 시작 번호만 바꿔 하나 더
NUMS = group(TR, 'numberings'); PARAS = group(TR, 'paraProperties')
n5 = [n for n in NUMS if n.get('id') == '5'][0]; nn = copy.deepcopy(n5)
nn.set('start', str(A.start)); nn.find(HH + 'paraHead').set('start', str(A.start)); NUM_ID = add_item(NUMS, nn)
p10 = [p for p in PARAS if p.get('id') == '10'][0]; np_ = copy.deepcopy(p10); np_.find(HH + 'heading').set('idRef', NUM_ID)
NUM_PP = add_item(PARAS, np_)

# ───────────── 2025 읽기: 단 → 문항 ─────────────
S_BADGE = {'4a8cee': 'OR', 'c9b93f': 'NC', '9ea117': 'UP', 'a5d0fa': 'DW'}
def md5(sid): return hashlib.md5(open(A.src + '/' + SMAN[sid].get('href'), 'rb').read()).hexdigest()[:6]
SS = sorted(glob.glob(A.src + '/Contents/section*.xml'), key=sec_no)
assert len(SS) == 1, SS
SROOT = parse(SS[0]).getroot()
cols = []; cur = None; prev = None; page_left = True
for i, p in enumerate(SROOT.findall(HP + 'p')):
    segs = p.findall(HP + 'linesegarray/' + HP + 'lineseg')
    vp = int(segs[0].get('vertpos')) if segs else 0
    if i == 0: brk = 'start'
    elif p.get('pageBreak') == '1': brk = 'PB'
    elif p.get('columnBreak') == '1' or (prev is not None and vp < prev): brk = 'CB'
    else: brk = None
    if brk:
        if brk == 'PB' and cols and len(cols) % 2 == 1: cols.append({'probs': [], 'pad': True})   # 오른 단을 비우고 넘긴 쪽
        cur = {'probs': [], 'pad': False}; cols.append(cur)
    for run in p.findall(HP + 'run'):
        for c in run:
            k = ln(c)
            if k == 'tbl':
                if c.find('.//' + HP + 'endNote') is None: raise SystemExit('문항 아닌 표가 단에')
                cur['probs'].append(c)
            elif k == 't':
                if ''.join(c.itertext()).strip(): raise SystemExit('표 밖 글: ' + ''.join(c.itertext())[:30])
            elif k == 'ctrl':
                if [ln(x) for x in c] not in (['colPr'], ['newNum']): raise SystemExit('모르는 컨트롤 ' + str([ln(x) for x in c]))
            elif k != 'secPr': raise SystemExit('표 밖 개체 ' + k)
    prev = int(segs[-1].get('vertpos')) if segs else vp
while cols and not cols[-1]['probs']: cols.pop()

def read_prob(t):
    cs = cells(t)
    en = t.find('.//' + HP + 'endNote')
    badge = None
    for pic in cs[(0, 2)].iter(HP + 'pic'):
        badge = S_BADGE.get(md5(pic.find('.//' + HC + 'img').get('binaryItemIDRef')))
    if badge is None: raise SystemExit(f'유형 딱지를 모름 {en.get("number")}')
    src = ''
    for p in cs[(0, 1)].find(HP + 'subList').findall(HP + 'p'):
        if p.find('.//' + HP + 'endNote') is None: src += ''.join(''.join(x.itertext()) for x in p.iter(HP + 't'))
    src = src.strip()
    m = re.fullmatch(r'\[(.*)\]', src)
    body = cs[(1, 0)].find(HP + 'subList').findall(HP + 'p')
    used = max(int(l.get('vertpos')) + int(l.get('vertsize')) for p in body for l in p.findall(HP + 'linesegarray/' + HP + 'lineseg'))
    return dict(num=int(en.get('number')), en=en, badge=badge, source=m.group(1) if m else src, body=body, used=used)

probs = [read_prob(t) for c in cols for t in c['probs']]
# 출처 꼴 — 양식처럼 달은 두 자리(「6월」→「06월」), 변형 문항(빈 출처)은 앞 원본의 출처를 그대로
last = ''
for pr in probs:
    s_ = re.sub(r'(?<![0-9])([1-9])월', r'0\1월', pr['source'])
    if s_: last = s_
    else:
        if not last: raise SystemExit(f'출처 없는 첫 문항 {pr["num"]}')
        s_ = last; pr['inherited'] = True
    pr['source'] = s_
nums = [p['num'] for p in probs]
assert nums == list(range(nums[0], nums[0] + len(nums))), '2025 번호가 이어지지 않는다'
note(f'2025 문항 {len(probs)} ({nums[0]}~{nums[-1]}) → {A.start}~{A.start + len(probs) - 1}')
note('단', len(cols), '· 문항 수별', {k: sum(1 for c in cols if len(c['probs']) == k) for k in range(4)})

# ───────────── 문항 짓기 ─────────────
def build(pr, newnum, first):
    t = copy.deepcopy(PROTO[pr['badge']]); renew_ids(t); cs = cells(t)
    # 번호 상자
    inner = cs[(0, 0)].find('.//' + HP + 'tbl'); ic = cells(inner)
    ic[(0, 0)].find(HP + 'subList').find(HP + 'p').set('paraPrIDRef', NUM_PP)
    # 미주(정답) — 양식 꼴: 자동 번호 + 「[정답] …」 (글자 모양 0)
    en = cs[(0, 1)].find('.//' + HP + 'endNote'); en.set('number', str(newnum)); en.set('instId', nid())
    tp = en.find(HP + 'subList/' + HP + 'p'); runs = tp.findall(HP + 'run')
    an = copy.deepcopy(runs[0].find(HP + 'ctrl')); an.find(HP + 'autoNum').set('num', str(newnum))
    for r in runs: tp.remove(r)
    r0 = etree.Element(HP + 'run', charPrIDRef='0'); r0.append(an); tp.insert(0, r0); at = 1
    for sp in pr['en'].find(HP + 'subList').findall(HP + 'p'):
        for run in sp.findall(HP + 'run'):
            nr = etree.Element(HP + 'run', charPrIDRef='0')
            for c in run:
                if ln(c) in ('t', 'equation'):
                    cc = copy.deepcopy(c); renew_ids(cc); nr.append(cc)
            if len(nr): tp.insert(at, nr); at += 1
    if first:
        c = etree.Element(HP + 'ctrl'); etree.SubElement(c, HP + 'newNum', num=str(newnum), numType='ENDNOTE')
        en.getparent().getparent().insert(0, c)
    # 출처
    ts = list(cs[(1, 1)].iter(HP + 't')); ts[0].text = pr['source']
    for x in ts[1:]: x.text = ''
    # 본문
    sl = cs[(3, 0)].find(HP + 'subList'); sl.set('_body', '1')
    for p in sl.findall(HP + 'p'): sl.remove(p)
    fitted = []
    for p in pr['body']:
        q = copy.deepcopy(p); renew_ids(q); sl.append(q); convert(q, True)
    for q in sl.findall(HP + 'p'):
        for tb, k in fit_objects([q]):
            for tc in tb.iter(HP + 'tc'): tc.set('_k', str(k))
    delta = sum(para_delta(q, W_OLD - 56, W_NEW) for q in sl.findall(HP + 'p'))
    for e in sl.iter():
        if isinstance(e.tag, str) and '_k' in e.attrib: del e.attrib['_k']
    del sl.attrib['_body']
    H = HEAD_H + max(BODY_MIN, pr['used'] + delta)
    t.find(HP + 'sz').set('height', str(H))
    pr['H'] = H; pr['delta'] = delta; pr['new'] = newnum
    return t

k = A.start
for c in cols:
    c['new'] = []
    for t in c['probs']:
        pr = probs[k - A.start]; c['new'].append((build(pr, k, k == A.start), pr)); k += 1

# ───────────── 단 짓기 ─────────────
CAP = 84475; BLANK = 1600
SAFE = 3000          # 높이는 어림이라 단 끝에 남기는 여유
def scale_pic(c, k):
    for tag in ('sz', 'curSz'):
        e = c.find(HP + tag)
        for a in ('width', 'height'): e.set(a, str(round(int(e.get(a)) * k)))
    ri = c.find(HP + 'rotationInfo')
    if ri is not None:
        for a in ('centerX', 'centerY'): ri.set(a, str(round(int(ri.get(a)) * k)))
    sm = c.find(HP + 'renderingInfo/' + HC + 'scaMatrix')
    if sm is not None:
        for a in ('e1', 'e5'): sm.set(a, f'{float(sm.get(a)) * k:.6g}')
for c in cols:
    items = c['new']
    if not items: continue
    tot = sum(pr['H'] for _, pr in items) + (len(items) - 1) * BLANK
    over = tot - (CAP - SAFE)
    if over <= 0: continue
    pics = [(t, pr, pc) for t, pr in items for pc in cells(t)[(3, 0)].find(HP + 'subList').findall(HP + 'p/' + HP + 'run/' + HP + 'pic')]
    ph = sum(int(pc.find(HP + 'sz').get('height')) for _, _, pc in pics)
    k = max(0.85, 1 - over / ph) if ph else 1
    for t, pr, pc in pics:
        h0 = int(pc.find(HP + 'sz').get('height')); scale_pic(pc, k)
        d = h0 - int(pc.find(HP + 'sz').get('height')); pr['H'] -= d
        t.find(HP + 'sz').set('height', str(pr['H']))
    tot2 = sum(pr['H'] for _, pr in items) + (len(items) - 1) * BLANK
    note('그림 줄임', [pr['num'] for _, pr in items], f'{k:.2f}배', '어림 높이', tot, '→', tot2, '' if tot2 <= CAP - SAFE else '⚠ 그래도 빠듯')
s2p = TSEC[2].getroot().findall(HP + 'p'); s3p = TSEC[3].getroot().findall(HP + 'p')
FRAME_PROB = s3p[1]                       # 문항 문단(단 나눔)
FRAME_BLANK = [p for p in s3p if not len(p.findall('.//' + HP + 'tbl')) and p.get('columnBreak') == '0' and not ''.join(p.itertext()).strip()][0]
def put_tbl(frame, t):
    p = copy.deepcopy(frame)
    old = [c for r in p.findall(HP + 'run') for c in r if ln(c) == 'tbl']     # 문단 바로 아래 표(머리말 속 표 말고)
    assert len(old) == 1; old[0].getparent().replace(old[0], t); return p
def blank(cb=False):
    p = copy.deepcopy(FRAME_BLANK); p.set('columnBreak', '1' if cb else '0'); p.set('pageBreak', '0'); return p
def col_paras(c, frame0):
    out = []
    items = c['new']
    if not items:
        return [blank()]
    n = len(items); tot = sum(pr['H'] for _, pr in items)
    gap = max(BLANK, (CAP - 1500 - tot) / n) if n > 1 else 0
    if n > 1 and tot + (n - 1) * BLANK > CAP: note('⚠ 넘칠 수 있는 단', [pr['num'] for _, pr in items], '어림 높이', tot)
    for j, (t, pr) in enumerate(items):
        out.append(put_tbl(frame0 if j == 0 else FRAME_PROB, t))
        if j < n - 1:
            for _ in range(max(1, round(gap / BLANK))): out.append(blank())
    for p in out[1:]:
        if any(ln(c) == 'tbl' for r in p.findall(HP + 'run') for c in r): p.set('columnBreak', '0')
    return out

secA, secB = [], []
for ci, c in enumerate(cols):
    if ci == 0: frame = s2p[0]
    elif ci == 2: frame = s2p[2]
    elif ci == 4: frame = s3p[0]
    else: frame = FRAME_PROB
    ps = col_paras(c, frame)
    if not c['new'] and ci in (0, 2, 4): raise SystemExit('구역 첫 단이 비었다')
    ps[0].set('columnBreak', '0' if ci in (0, 4) else '1'); ps[0].set('pageBreak', '0')
    (secA if ci < 4 else secB).extend(ps)
    c['n'] = len(c['new'])

for s, paras_ in ((2, secA), (3, secB)):
    root = TSEC[s].getroot()
    for p in root.findall(HP + 'p'): root.remove(p)
    for p in paras_: root.append(p)

# ───────────── 단원 이름 · 쪽 번호 ─────────────
CH2 = f'{A.unit:02d}'; CH1 = f'{A.unit}. {A.name}'
def swap_text(root, pairs, where):
    n = 0
    for t in root.iter(HP + 't'):
        if t.text in pairs: t.text = pairs[t.text]; n += 1
    note(where, '바꿈', n)
for t in TSEC[1].getroot().iter(HP + 't'): pass
swap_text(TSEC[1].getroot(), {'06': CH2, '명제': A.name}, '단원명 쪽')
hdr = [h for h in TSEC[2].getroot().iter(HP + 'header') if h.get('id') == '1'][0]
swap_text(hdr, {'06': CH2, '명제': A.name}, '첫 쪽 머리말')
for m in ('masterpage4.xml', 'masterpage6.xml'):
    T = parse(D + '/' + m); swap_text(T.getroot(), {'6. 명제': CH1}, m); T.write(D + '/' + m, xml_declaration=True, encoding='UTF-8', standalone=True)
nn0 = [x for x in TSEC[0].getroot().iter(HP + 'newNum') if x.get('numType') == 'PAGE'][0]
nn0.set('num', str(A.title_page - 2))
note('차례 쪽 번호', A.title_page - 2, '→ 단원명 쪽', A.title_page)

for s, T in TSEC.items(): T.write(D + f'/section{s}.xml', xml_declaration=True, encoding='UTF-8', standalone=True)
TH.write(D + '/header.xml', xml_declaration=True, encoding='UTF-8', standalone=True)
THPF.write(D + '/content.hpf', xml_declaration=True, encoding='UTF-8', standalone=True)
note('옮긴 그림', len(IMG), '· 새 글자 모양', len(set(MAP['charPr'].values()) - set()), '· 새 문단 모양', len(set(MAP['paraPr'].values())))
rep = dict(notes=REPORT, cols=[[pr['num'] for _, pr in c['new']] for c in cols],
           probs=[dict(old=pr['num'], H=pr['H'], delta=pr['delta'], badge=pr['badge'], src=pr['source']) for pr in probs])
json.dump(rep, open(A.out + '.jugina.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('\n'.join(REPORT))
