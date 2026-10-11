# 이미 「양식」 꼴로 지어진 엔딩크레딧 hwpx 를 다시 배치한다 (2026-10-11 · 6~10단원).
#   · 문항 표 높이는 한글이 저장한 «실제 높이»(tbl sz)를 쓴다 — 어림이 아니다
#   · 줄 맞춤은 build.py 와 같은 규칙: 표는 그대로, 왼·오른 단 k번째 문항은 빈 줄로 같은 높이에서 시작
#   · 번호 칸(문항 표 첫 칸)은 가운데 정렬 · 문단 번호는 --start 부터 이어지게 · 미주 번호도 문항 번호와 같게
#   · 첫 구역 = 첫 두 쪽 · SCENE 머리 있는 쪽만 위를 내린다 · 쪽 머리말 컨트롤은 «원래 있던 쪽»의 첫 문단으로
# 쓰는 법: python3 -I reflow.py <풀린 폴더> <나갈 폴더> --start 301 [--mode rules|keep]
#   rules = 한 단 SCENE1 3 · SCENE2 2 · SCENE3 1 규칙으로 다시 나눈다
#   keep  = 지금 단에 든 문항은 그대로 두고 간격만 맞춘다 (사용자가 손본 판)
import sys, os, re, copy, glob, shutil, json, argparse
from lxml import etree

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--start', type=int, required=True)
ap.add_argument('--mode', choices=('rules', 'keep'), default='rules')
A = ap.parse_args()

HP = '{http://www.hancom.co.kr/hwpml/2011/paragraph}'
HH = '{http://www.hancom.co.kr/hwpml/2011/head}'
NSHP = 'http://www.hancom.co.kr/hwpml/2011/paragraph'
def ln(e): return etree.QName(e).localname
def parse(p): return etree.parse(p, etree.XMLParser(remove_blank_text=False, huge_tree=True))
REPORT = []
def note(*a): REPORT.append(' '.join(str(x) for x in a))

if os.path.exists(A.out): shutil.rmtree(A.out)
shutil.copytree(A.src, A.out)
D = A.out + '/Contents'

# ───────────── 머리(header.xml) ─────────────
H = parse(D + '/header.xml'); HR = H.getroot()
def group(tag):
    for g in HR.iter():
        if isinstance(g.tag, str) and ln(g) == tag: return g
CHARS = group('charProperties'); PARAS = group('paraProperties'); NUMS = group('numberings')
def add_item(grp, el):
    ids = [int(x.get('id')) for x in grp]
    el.set('id', str(max(ids) + 1)); grp.append(el); grp.set('itemCnt', str(len(grp)))
    return el.get('id')
def canon(el, skip=('id',)):
    e = copy.deepcopy(el)
    for k in skip:
        if k in e.attrib: del e.attrib[k]
    return etree.tostring(e)

# 빈 줄용 글자 모양 (글자 크기 → 줄 높이 ×1.6). 0 번과 같고 크기만 다른 것을 찾거나 만든다
cp0 = [c for c in CHARS if c.get('id') == '0'][0]
assert cp0.get('height') == '1000'
def char_of_height(h):
    want = copy.deepcopy(cp0); want.set('height', str(h)); key = canon(want)
    for c in CHARS:
        if canon(c) == key: return c.get('id')
    return add_item(CHARS, want)
SPACERS = [(1600, '0')] + [(int(h * 1.6), char_of_height(h)) for h in (900, 800, 700, 400, 100)]

# ───────────── 몸 구역 · 문단 훑기 ─────────────
def sec_no(f): return int(re.search(r'section(\d+)\.xml$', f).group(1))
BODY = []
for f in sorted(glob.glob(D + '/section*.xml'), key=sec_no):
    T = parse(f)
    if any(c.get('colCount') == '2' for c in T.iter(HP + 'colPr')): BODY.append((f, T))
assert len(BODY) == 2, [b[0] for b in BODY]

def tkind(t):
    rc = (t.get('rowCnt'), t.get('colCnt')); w = t.find(HP + 'sz').get('width'); txt = ''.join(t.itertext())
    if rc == ('2', '4') and 'SCENE' in txt: return 'SCENE', int(re.search(r'SCENE\s*(\d)', txt).group(1))
    if rc == ('1', '2'): return 'TYPE', None
    if rc == ('3', '3') and w == '22680': return 'PROB', None
    raise SystemExit(f'모르는 표 {rc} w{w}: {txt[:40]}')

items = []        # 순서대로: SCENE / TYPE / PROB
page_ctrls = {}   # 전체 쪽 번호 → [ctrl 요소] (쪽 머리말 등)
lead = []         # 구역마다 첫 문단의 secPr 런
orig_cols = []    # keep 모드: 문항이 원래 든 (전체 쪽, 단)
gpage_base = 0
SEQ = [0]
def seq(): SEQ[0] += 1; return SEQ[0]
for si, (f, T) in enumerate(BODY):
    root = T.getroot(); paras = root.findall(HP + 'p')
    page = 0; col = 0; prev = None
    sec_lead = None
    pending_shapes = []
    for i, p in enumerate(paras):
        ls = p.find(HP + 'linesegarray')
        vps = [int(l.get('vertpos')) for l in ls] if ls is not None and len(ls) else [0]
        if i > 0:
            if p.get('pageBreak') == '1': page += 1; col = 0
            elif p.get('columnBreak') == '1' or (prev is not None and vps[0] < prev): col += 1
            if col == 2: page += 1; col = 0
        gp = gpage_base + page
        for r in p.findall(HP + 'run'):
            cp = r.get('charPrIDRef')
            for c in list(r):
                k = ln(c)
                if k == 'secPr':
                    assert i == 0; sec_lead = sec_lead if sec_lead is not None else etree.Element(HP + 'run', charPrIDRef=cp)
                    sec_lead.append(c)
                elif k == 'ctrl':
                    kids = [ln(y) for y in c]
                    if kids == ['colPr'] and i == 0:
                        sec_lead.append(c)
                    elif kids == ['newNum'] and c[0].get('numType') == 'ENDNOTE':
                        pass   # 미주 번호는 새로 단다
                    else:
                        page_ctrls.setdefault(gp, []).append((cp, c, seq()))
                elif k == 'tbl':
                    kind, sc = tkind(c)
                    items.append(dict(k=kind, scene=sc, tbl=c, shapes=pending_shapes, cp=cp, seq=seq(),
                                      pp=p.get('paraPrIDRef'), st=p.get('styleIDRef'), gpage=gp, col=col, vp=vps[0]))
                    pending_shapes = []
                elif k == 't':
                    if ''.join(c.itertext()).strip(): raise SystemExit(f'본문 글이 표 밖에: {"".join(c.itertext())[:40]}')
                elif k in ('rect', 'pic', 'line', 'ellipse', 'container', 'equation', 'polygon', 'curve', 'arc'):
                    pending_shapes.append((cp, c))   # 같은 문단의 표에 붙어 있던 떠 있는 개체 → 그 표와 함께
                else:
                    raise SystemExit(f'모르는 것 {k}')
        if pending_shapes and not any(ln(c) == 'tbl' for r in p.findall(HP + 'run') for c in r):
            raise SystemExit('표 없는 문단의 떠 있는 개체')
        for a, b in zip(vps, vps[1:]):
            if b < a:
                col += 1
                if col == 2: page += 1; col = 0
        prev = vps[-1]
    lead.append(sec_lead)
    gpage_base += page + 1

# 장면·유형 머리 붙이기
scene = None; hdr = None; probs = []
for it in items:
    if it['k'] == 'SCENE': scene = it['scene']; it['_scene_hdr'] = True; last_scene = it; continue
    if it['k'] == 'TYPE': hdr = it; continue
    it['scene'] = scene; it['hdr'] = hdr; it['scene_hdr'] = None; hdr = None
    probs.append(it)
for it in items:     # SCENE 머리 → 그 SCENE 첫 문항에
    pass
sc_hdrs = {it['scene']: it for it in items if it['k'] == 'SCENE'}
assert sorted(sc_hdrs) == [1, 2, 3], sorted(sc_hdrs)
assert all(not (it['k'] == 'TYPE' and it is items[-1]) for it in items)
def cells_of(tbl):
    out = {}
    for tc in tbl.findall(HP + 'tr/' + HP + 'tc'):
        a = tc.find(HP + 'cellAddr'); out[(int(a.get('rowAddr')), int(a.get('colAddr')))] = tc
    return out
SOLVE_MIN = 2400     # SCENE1 을 줄일 때도 본문 밑에 남기는 풀이 칸
PIC_MIN = 0.8        # 그림은 80% 까지만
for pr in probs:
    pr['H'] = pr['Horig'] = int(pr['tbl'].find(HP + 'sz').get('height'))
    cs = cells_of(pr['tbl']); body = cs[(2, 0)]
    pr['Hhead'] = int(cs[(0, 0)].find(HP + 'cellSz').get('height')) + int(cs[(1, 0)].find(HP + 'cellSz').get('height'))
    used = 0
    for q in body.find(HP + 'subList').findall(HP + 'p'):
        for l in q.findall(HP + 'linesegarray/' + HP + 'lineseg'):
            used = max(used, int(l.get('vertpos')) + int(l.get('vertsize')))
    mg = body.find(HP + 'cellMargin') if body.get('hasMargin') == '1' else pr['tbl'].find(HP + 'inMargin')
    m = int(mg.get('top')) + int(mg.get('bottom')) if mg is not None else 0
    # 본문에 글자처럼 든 그림 — SCENE1 이 세 문제 안 들어가면 PIC_MIN 배까지 줄인다
    pr['pics'] = [c for q in body.find(HP + 'subList').findall(HP + 'p') for r in q.findall(HP + 'run') for c in r
                  if ln(c) == 'pic' and c.find(HP + 'pos').get('treatAsChar') == '1']
    picsum = sum(int(c.find(HP + 'sz').get('height')) for c in pr['pics'])
    pr['Hmin1'] = min(pr['H'], pr['Hhead'] + used + m + SOLVE_MIN)          # 빈 풀이 칸만 줄여서
    pr['Hmin'] = pr['Hmin1'] - int((1 - PIC_MIN) * picsum)                  # 그림까지 줄여서
    pr['picsum'] = picsum
note('문항', len(probs), '· SCENE별', [sum(1 for p in probs if p['scene'] == s) for s in (1, 2, 3)])

# ───────────── 번호 칸 · 문단 번호 ─────────────
def cells(tbl):
    out = {}
    for tc in tbl.findall(HP + 'tr/' + HP + 'tc'):
        a = tc.find(HP + 'cellAddr'); out[(int(a.get('rowAddr')), int(a.get('colAddr')))] = tc
    return out
PP = {p.get('id'): p for p in PARAS}
NUMBY = {n.get('id'): n for n in NUMS}
def num_head(nid):
    return [h for h in NUMBY[nid].findall(HH + 'paraHead') if h.get('level') == '1'][0]

# 번호 칸 문단 모양들 — 지금 쓰는 번호 목록(heading idRef)과 그 꼴
cell_pp = []
for pr in probs:
    tc = cells(pr['tbl'])[(0, 0)]
    ps = tc.find(HP + 'subList').findall(HP + 'p')
    assert len(ps) == 1, 'number cell paras'
    pid = ps[0].get('paraPrIDRef'); hd = PP[pid].find(HH + 'heading')
    assert hd.get('type') == 'NUMBER', pid
    cell_pp.append((ps[0], pid, hd.get('idRef')))

def center_pp(pid, nid):
    """pid 와 같고 가운데 정렬 · 번호 목록 nid 인 문단 모양"""
    want = copy.deepcopy(PP[pid])
    want.find(HH + 'align').set('horizontal', 'CENTER'); want.find(HH + 'heading').set('idRef', nid)
    key = canon(want)
    for p in PARAS:
        if canon(p) == key: return p.get('id')
    nid_ = add_item(PARAS, want); PP[nid_] = want; return nid_

# 번호 목록: 1~9 «00^1» · 10~99 «0^1» · 100~ «^1» (6단원이 쓰는 꼴). 목록마다 시작 번호가 정해진다
fmts = {}
def numbering_for(fmt, start):
    key = (fmt, start)
    if key in fmts: return fmts[key]
    base = [n for n in NUMS if num_head(n.get('id')).get('charPrIDRef') not in (None, '4294967295')]
    assert base, '번호 칸용 번호 목록이 없다'
    n = copy.deepcopy(base[0]); n.set('start', str(start))
    h = [x for x in n.findall(HH + 'paraHead') if x.get('level') == '1'][0]
    h.set('start', str(start)); h.text = fmt
    key2 = canon(n)
    for m in NUMS:
        if canon(m) == key2: fmts[key] = m.get('id'); return m.get('id')
    fmts[key] = add_item(NUMS, n); NUMBY[fmts[key]] = n
    return fmts[key]
def fmt_of(k): return '00^1' if k < 10 else ('0^1' if k < 100 else '^1')
seg_start = {}
for i, pr in enumerate(probs):
    k = A.start + i; pr['num'] = k
    f = fmt_of(k)
    if f not in seg_start: seg_start[f] = k
for i, (p, pid, _) in enumerate(cell_pp):
    k = probs[i]['num']; f = fmt_of(k)
    nid = numbering_for(f, seg_start[f])
    p.set('paraPrIDRef', center_pp(pid, nid))
note('번호', probs[0]['num'], '~', probs[-1]['num'], '· 목록', {f: (s, fmts[(f, s)]) for f, s in seg_start.items()})

# 미주 번호 = 문항 번호 (구역 첫 문항에 새 번호) — 표 안의 옛 «새 번호»는 걷는다
for pr in probs:
    for c in list(pr['tbl'].iter(HP + 'ctrl')):
        if len(c) == 1 and ln(c[0]) == 'newNum' and c[0].get('numType') == 'ENDNOTE': c.getparent().remove(c)
for pr in probs:
    for en in pr['tbl'].iter(HP + 'endNote'):
        en.set('number', str(pr['num']))
        for an in en.iter(HP + 'autoNum'): an.set('num', str(pr['num']))

# ───────────── 정리: 사람 이름 · <보기> · 오타 ─────────────
fix = {'name': 0, 'bogi': 0}
for f, T in BODY:
    for sc in T.iter(HP + 'shapeComment'):
        if (sc.text or '').strip() == '장은영': sc.text = ''; fix['name'] += 1
    for t in T.iter(HP + 't'):
        if any(ln(a) == 'endNote' for a in t.iterancestors()): pass
        for node in [t] + list(t):
            for attr in ('text', 'tail'):
                v = getattr(node, attr)
                if v and '<보기>' in v: setattr(node, attr, v.replace('<보기>', '[보기]')); fix['bogi'] += 1
typo = 0
for it in items:
    if it['k'] != 'TYPE': continue
    for t in it['tbl'].iter(HP + 't'):
        if t.text and '합섬함수' in t.text: t.text = t.text.replace('합섬함수', '합성함수'); typo += 1
note('설명문 이름 지움', fix['name'], '· <보기>→[보기]', fix['bogi'], '· 유형 머리 오타(합섬→합성)', typo)

# ───────────── 배치 ─────────────
COLCAP = 66049
SCENE_MAX = {1: 3, 2: 2, 3: 1}
GAP = {1: 1600, 2: 8000, 3: 0}
H_SCENE_HDR, H_TYPE_HDR, LINE_GAP = 4012, 2295, 600

def natural_gap(pr, scene): return max(GAP[scene], 1600 + (H_TYPE_HDR if pr['hdr'] is not None else 0))
def top_need(col, scene_top):
    return (H_SCENE_HDR if scene_top else 0) + (H_TYPE_HDR if col and col[0]['hdr'] is not None else 0)
def col_ys(col, scene, T):
    ys = []
    for k, pr in enumerate(col):
        ys.append(T if k == 0 else ys[-1] + col[k - 1]['H'] + LINE_GAP + natural_gap(pr, scene))
    return ys
def col_end(col, ys): return (ys[-1] + col[-1]['H']) if col else 0
def align(L, R, scene, T):
    yL, yR = [], []
    for k in range(max(len(L), len(R))):
        c = {}
        if k < len(L): c['L'] = T if k == 0 else yL[-1] + L[k - 1]['H'] + LINE_GAP + natural_gap(L[k], scene)
        if k < len(R): c['R'] = T if k == 0 else yR[-1] + R[k - 1]['H'] + LINE_GAP + natural_gap(R[k], scene)
        y = max(c.values())
        if 'L' in c: yL.append(y)
        if 'R' in c: yR.append(y)
    return yL, yR, col_end(L, yL), col_end(R, yR)
def take(q, i, scene, T):
    n = 0
    while i + n < len(q) and n < SCENE_MAX[scene]:
        seg = q[i:i + n + 1]
        if n > 0 and col_end(seg, col_ys(seg, scene, T)) > COLCAP: break
        n += 1
    return n
def fit_floor(L, R, scene, T):
    """SCENE1 — 두 단이 들어가는 가장 큰 바닥 높이 F 로 문항 높이를 고른다(원래보다 크게는 안 한다)"""
    grp = L + R
    CAP = COLCAP - 200          # 빈 줄 높이 반올림 몫
    def setF(F, key):
        for pr in grp: pr['H'] = max(pr[key], min(pr['Horig'], F))
    def ok(): return all(e <= CAP for e in align(L, R, scene, T)[2:])
    hi0 = max(pr['Horig'] for pr in grp)
    setF(hi0, 'Hmin1')
    if ok(): return
    for key in ('Hmin1', 'Hmin'):      # 빈 풀이 칸부터 줄이고, 그래도 모자라면 그림까지
        setF(0, key)
        if not ok() and key == 'Hmin1': continue
        lo, hi = 0, hi0
        while hi - lo > 50:
            mid = (lo + hi) // 2; setF(mid, key)
            if ok(): lo = mid
            else: hi = mid
        setF(lo, key); return
def page_rules(q, i, scene, scene_top):
    if scene == 1:
        for pr in q[i:]: pr['H'] = pr['Hmin']      # 줄여서 몇 개 드나부터 본다
    T = top_need(q[i:i + 1], scene_top)
    for _ in range(4):
        nL = take(q, i, scene, T); nR = take(q, i + nL, scene, T)
        T2 = max(top_need(q[i:i + 1], scene_top), top_need(q[i + nL:i + nL + 1], False))
        if T2 == T: break
        T = T2
    while True:
        L = q[i:i + nL]; R = q[i + nL:i + nL + nR]
        T = max(top_need(L, scene_top), top_need(R, False))   # 나눔이 바뀌면 위 여백도 다시
        yL, yR, eL, eR = align(L, R, scene, T)
        if eL <= COLCAP and eR <= COLCAP: break
        if eR > COLCAP and nR > 1: nR -= 1; continue
        if eL > COLCAP and nL > 1: nL -= 1; nR = take(q, i + nL, scene, T); continue
        break
    if scene == 1:
        # 줄일 수 있는 데까지 줄인 높이로, 한 쪽에 가장 많이 드는 (왼, 오른) 나눔을 찾는다
        best = None; rest = len(q) - i
        for a in range(min(3, rest), 0, -1):
            for b in range(min(3, rest - a), -1, -1):
                if b == 0 and rest > a: continue
                L2 = q[i:i + a]; R2 = q[i + a:i + a + b]
                T2 = max(top_need(L2, scene_top), top_need(R2, False))
                e = align(L2, R2, scene, T2)[2:]
                if all(x <= COLCAP - 200 for x in e):
                    key = (a + b, a, -abs(a - b))
                    if best is None or key > best[0]: best = (key, L2, R2, T2)
        if best: _, L, R, T = best
        fit_floor(L, R, scene, T); yL, yR, eL, eR = align(L, R, scene, T)
    if scene == 2: yL, yR = balance2(L, R, yL, yR, T)
    return dict(L=L, R=R, yL=yL, yR=yR, T=T, scene=scene, scene_top=scene_top)
def balance2(L, R, yL, yR, T):
    """SCENE2 두 문항 단 — 첫 문항 밑 빈자리와 둘째 문항 밑 빈자리를 같게"""
    cols = [(c, y) for c, y in ((L, yL), (R, yR)) if len(c) == 2]
    if not cols: return yL, yR
    want = []; lo = 0; hi = COLCAP
    for c, y in cols:
        h2 = H_TYPE_HDR if c[1]['hdr'] is not None else 0
        want.append((y[0] + c[0]['H'] + h2 + COLCAP - c[1]['H']) / 2)
        lo = max(lo, y[0] + c[0]['H'] + LINE_GAP + natural_gap(c[1], 2)); hi = min(hi, COLCAP - c[1]['H'])
    if lo > hi: return yL, yR
    y2 = int(max(lo, min(hi, sum(want) / len(want))))
    yL = yL[:1] + [y2] + yL[2:] if len(L) == 2 else yL
    yR = yR[:1] + [y2] + yR[2:] if len(R) == 2 else yR
    return yL, yR

def layout_rules(q, scene, start_right=False):
    pages = []; i = 0
    while i < len(q):
        if start_right and not pages:
            if scene == 1:
                for pr in q[i:]: pr['H'] = pr['Hmin']
            T = top_need(q[i:i + 1], True); n = take(q, i, scene, T); R = q[i:i + n]; i += n
            if scene == 1: fit_floor([], R, scene, T)
            yR = col_ys(R, scene, T)
            if scene == 2: _, yR = balance2([], R, [], yR, T)
            pages.append(dict(L=[], R=R, yL=[], yR=yR, T=T, scene=scene, scene_top=True)); continue
        pg = page_rules(q, i, scene, scene_top=(not pages)); pages.append(pg); i += len(pg['L']) + len(pg['R'])
    return pages

def layout_keep(q, scene):
    """원래 (쪽, 단) 묶음 그대로. 한 쪽 두 단이 같은 SCENE 일 때만 서로 맞춘다"""
    groups = []
    for pr in q:
        key = (pr['gpage'], pr['col'])
        if not groups or groups[-1][0] != key: groups.append((key, [pr]))
        else: groups[-1][1].append(pr)
    pages = []; gi = 0
    while gi < len(groups):
        (gp, c), col = groups[gi]
        if c == 0:
            L = col; R = []
            if gi + 1 < len(groups) and groups[gi + 1][0] == (gp, 1): R = groups[gi + 1][1]; gi += 1
        else:
            L = []; R = col
        gi += 1
        first = not pages
        T = max(top_need(L, first and bool(L)), top_need(R, first and not L)) if L or R else 0
        if L and R:
            yL, yR, eL, eR = align(L, R, scene, T)
            if eL > COLCAP or eR > COLCAP:
                note('keep: 맞추면 넘침 → 그대로', scene, gp)
                yL = col_ys(L, scene, top_need(L, first)); yR = col_ys(R, scene, top_need(R, False))
        else:
            yL = col_ys(L, scene, T); yR = col_ys(R, scene, T)
        pages.append(dict(L=L, R=R, yL=yL, yR=yR, T=T, scene=scene, scene_top=first))
    return pages

Q = {s: [p for p in probs if p['scene'] == s] for s in (1, 2, 3)}
if A.mode == 'rules':
    # 앞 SCENE 마지막 쪽 오른 단이 비면 다음 SCENE 은 거기서 시작한다
    P1 = layout_rules(Q[1], 1); P2 = layout_rules(Q[2], 2, start_right=(len(P1[-1]['R']) == 0))
    P3 = layout_rules(Q[3], 3, start_right=(len(P2[-1]['R']) == 0))
else:
    P1 = layout_keep(Q[1], 1); P2 = layout_keep(Q[2], 2); P3 = layout_keep(Q[3], 3)
assert len(P1) >= 2

# 줄인 문항 표 높이를 표에 적는다 (본문 칸 «최소 높이»와 표 높이)
HC = '{http://www.hancom.co.kr/hwpml/2011/core}'
def scale_pic(c, k):
    for tag in ('sz', 'curSz'):
        e = c.find(HP + tag)
        for a in ('width', 'height'): e.set(a, str(round(int(e.get(a)) * k)))
    ri = c.find(HP + 'rotationInfo')
    if ri is not None:
        for a in ('centerX', 'centerY'): ri.set(a, str(round(int(ri.get(a)) * k)))
    sm = c.find(HP + 'renderingInfo/' + HC + 'scaMatrix')
    for a in ('e1', 'e5'): sm.set(a, f'{float(sm.get(a)) * k:.6g}')
    # 그 문단의 줄 높이도 (한글이 다시 재지만 이 값으로 높이를 셈하므로)
picscaled = []
shrunk = 0
for pr in probs:
    if pr['H'] != pr['Horig']:
        assert pr['H'] < pr['Horig']
        pr['tbl'].find(HP + 'sz').set('height', str(pr['H']))
        cellSz = cells_of(pr['tbl'])[(2, 0)].find(HP + 'cellSz'); cellSz.set('height', str(pr['H'] - pr['Hhead']))
        shrunk += 1
        need = pr['Hmin1'] - pr['H']               # 빈 칸만으로 모자란 만큼 그림을 줄인다
        if need > 0:
            k = max(PIC_MIN, 1 - need / pr['picsum']); picscaled.append((pr['num'], round(k, 2)))
            for c in pr['pics']: scale_pic(c, k)
note('SCENE1 줄인 문항', shrunk, '· 그림 줄임', picscaled)

# ───────────── 문단 짓기 ─────────────
def LSEG(h=1000):
    return etree.fromstring(f'<hp:linesegarray xmlns:hp="{NSHP}"><hp:lineseg textpos="0" vertpos="0" vertsize="{h}" '
                            f'textheight="{h}" baseline="850" spacing="600" horzpos="0" horzsize="22680" flags="393216"/></hp:linesegarray>')
def mk(tag, **a):
    e = etree.Element(HP + tag)
    for k, v in a.items(): e.set(k, v)
    return e
def new_p(pp='0', st='0'):
    return mk('p', id='2147483648', paraPrIDRef=pp, styleIDRef=st, pageBreak='0', columnBreak='0', merged='0')
def finish(p):
    for l in p.findall(HP + 'linesegarray'): p.remove(l)
    if not p.findall(HP + 'run'): p.append(mk('run', charPrIDRef='0'))
    p.append(LSEG()); return p
def spacer_lines(D_):
    D_ = max(0, int(D_)); out = ['0'] * (D_ // 1600); rem = D_ - 1600 * len(out)
    best = (rem, [])
    def rec(r, used, i):
        nonlocal best
        if abs(r) < abs(best[0]) or (abs(r) == abs(best[0]) and len(used) < len(best[1])): best = (r, used[:])
        if r <= 0 or len(used) >= 7: return
        for j in range(i, len(SPACERS)):
            used.append(SPACERS[j][1]); rec(r - SPACERS[j][0], used, j); used.pop()
    rec(rem, [], 1)
    return out + best[1]
def spacers(D_):
    ps = []
    for cp in spacer_lines(D_):
        p = new_p(); p.append(mk('run', charPrIDRef=cp)); ps.append(finish(p))
    return ps
def item_p(it):
    p = new_p(it['pp'], it['st'])
    for cp, s in it.get('shapes', []):
        r = mk('run', charPrIDRef=cp); r.append(s); p.append(r)
    r = mk('run', charPrIDRef=it['cp']); r.append(it['tbl']); p.append(r)
    r2 = mk('run', charPrIDRef=it['cp']); r2.append(mk('t')); p.append(r2)
    return finish(p)

def emit_col(col, ys, scene, scene_hdr):
    out = []; y = 0
    if scene_hdr is not None: out.append(item_p(scene_hdr)); y = H_SCENE_HDR
    for k, pr in enumerate(col):
        target = ys[k] - (H_TYPE_HDR if pr['hdr'] is not None else 0)
        out += spacers(target - y)
        if pr['hdr'] is not None: out.append(item_p(pr['hdr']))
        out.append(item_p(pr))
        y = ys[k] + pr['H'] + LINE_GAP
    return out

pages_out = []   # [ [col paras, ...] ]
def emit(pages, scene, start_brk):
    for pi, pg in enumerate(pages):
        cols = []
        first = pi == 0
        if pg['L']:
            cols.append(emit_col(pg['L'], pg['yL'], scene, sc_hdrs[scene] if first else None))
        if pg['R']:
            cols.append(emit_col(pg['R'], pg['yR'], scene, sc_hdrs[scene] if (first and not pg['L']) else None))
        brk = start_brk if first else 'PB'
        cols[0][0].set('pageBreak', '1' if brk == 'PB' else '0')
        cols[0][0].set('columnBreak', '1' if brk == 'CB' else '0')
        for c in cols[1:]: c[0].set('columnBreak', '1')
        pages_out.append(dict(cols=cols, right_only=(not pg['L']), scene=scene))
        for side, col in (('L', pg['L']), ('R', pg['R'])):
            for k, pr in enumerate(col): pr['place'] = (len(pages_out) - 1, side, k)
emit(P1, 1, '')
for PS in (P2, P3):
    n0 = len(pages_out); emit(PS, PS[0]['scene'], 'PB')
    if pages_out[n0]['right_only'] and len(pages_out[n0 - 1]['cols']) == 1 and not pages_out[n0 - 1]['right_only']:
        # 앞 SCENE 마지막 쪽 오른 단에서 시작 → 같은 쪽으로 친다
        b = pages_out.pop(n0); a = pages_out[n0 - 1]
        b['cols'][0][0].set('pageBreak', '0'); b['cols'][0][0].set('columnBreak', '1')
        a['cols'] += b['cols']
        for pr in probs:
            if pr.get('place') and pr['place'][0] >= n0: pr['place'] = (pr['place'][0] - 1,) + pr['place'][1:]

# 쪽 머리말 컨트롤을 원래 쪽의 첫 문단에
#   원래 순서를 지킨다: 그 문단의 표보다 먼저 있던 것은 표 앞, 뒤에 있던 것은 표 뒤 (같은 쪽에 머리말이 여럿이면 뒤엣것이 이긴다)
SEQ_OF = {id(it['tbl']): it['seq'] for it in items}
for gp, ctrls in sorted(page_ctrls.items()):
    tgt = pages_out[min(gp, len(pages_out) - 1)]['cols'][0][0]
    trun = [r for r in tgt.findall(HP + 'run') if r.find(HP + 'tbl') is not None]
    tseq = SEQ_OF[id(trun[0].find(HP + 'tbl'))] if trun else None
    before = [x for x in ctrls if tseq is None or x[2] < tseq]; after = [x for x in ctrls if tseq is not None and x[2] > tseq]
    first_run = tgt.findall(HP + 'run')[0]; idx = list(tgt).index(first_run)
    host_cp = first_run.get('charPrIDRef')    # 빈 줄 문단이면 그 줄 높이를 바꾸지 않게 같은 글자 모양으로
    for cp, c, _ in before:
        r = mk('run', charPrIDRef=host_cp); r.append(c); tgt.insert(idx, r); idx += 1
    if after:
        idx = list(tgt).index(trun[0]) + 1
        for cp, c, _ in after:
            r = mk('run', charPrIDRef=host_cp); r.append(c); tgt.insert(idx, r); idx += 1

# 구역: 첫 두 쪽 / 나머지
flat = lambda pgs: [p for pg in pgs for c in pg['cols'] for p in c]
secA = flat(pages_out[:2]); secB = flat(pages_out[2:])
for paras_, ld in ((secA, lead[0]), (secB, lead[1])):
    paras_[0].set('pageBreak', '0'); paras_[0].set('columnBreak', '0')
    paras_[0].insert(0, ld)

# 미주 새 번호: 구역마다 첫 문항
def first_prob_in(paras_):
    for p in paras_:
        for t in p.iter(HP + 'tbl'):
            for pr in probs:
                if pr['tbl'] is t: return pr
for paras_ in (secA, secB):
    pr = first_prob_in(paras_)
    c01 = cells(pr['tbl'])[(0, 1)]
    for p in c01.find(HP + 'subList').findall(HP + 'p'):
        r = [r for r in p.findall(HP + 'run') if any(ln(x) == 'ctrl' and x.find(HP + 'endNote') is not None for x in r)]
        if r:
            c = mk('ctrl'); c.append(mk('newNum', num=str(pr['num']), numType='ENDNOTE'))
            r[0].insert(0, c); break
    else: raise SystemExit('미주 칸 못 찾음')

for (f, T), paras_ in zip(BODY, (secA, secB)):
    root = T.getroot()
    for p in root.findall(HP + 'p'): root.remove(p)
    for p in paras_: root.append(p)
    T.write(f, xml_declaration=True, encoding='UTF-8', standalone=True)
H.write(D + '/header.xml', xml_declaration=True, encoding='UTF-8', standalone=True)

# 보고
rep = dict(notes=REPORT, pages=[], probs=[])
for pi, pg in enumerate(pages_out):
    rep['pages'].append([sum(1 for p in c for t in p.iter(HP + 'tbl') if any(pr['tbl'] is t for pr in probs)) for c in pg['cols']])
for pr in probs: rep['probs'].append(dict(num=pr['num'], scene=pr['scene'], H=pr['H'], place=pr.get('place')))
json.dump(rep, open(A.out + '.reflow.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('\n'.join(REPORT)); print('쪽', len(pages_out), '· 첫 구역', 2)
