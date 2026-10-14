# jugina.py 결과 확인 — 2025 원본·양식과 견준다.
# 쓰는 법: python3 -I jugina_check.py <양식 풀린 폴더> <2025 풀린 폴더> <나간 폴더>
import sys, re, glob, json, collections
from lxml import etree
HP = '{http://www.hancom.co.kr/hwpml/2011/paragraph}'; HH = '{http://www.hancom.co.kr/hwpml/2011/head}'
HC = '{http://www.hancom.co.kr/hwpml/2011/core}'; OPF = '{http://www.idpf.org/2007/opf/}'
def ln(e): return etree.QName(e).localname
def parse(p): return etree.parse(p, etree.XMLParser(huge_tree=True))
def sec_no(f): return int(re.search(r'section(\d+)\.xml$', f).group(1))
TPL, SRC, OUT = sys.argv[1:4]
bad = []
def chk(ok, msg):
    if not ok: bad.append(msg)

def problems(D):
    out = []
    for f in sorted(glob.glob(D + '/Contents/section*.xml'), key=sec_no):
        r = parse(f).getroot()
        for t in r.iter(HP + 'tbl'):
            if t.find('.//' + HP + 'endNote') is None: continue
            if any(ln(a) == 'tbl' for a in t.iterancestors()): continue
            out.append(t)
    return out
def cells(t):
    return {(int(tc.find(HP + 'cellAddr').get('rowAddr')), int(tc.find(HP + 'cellAddr').get('colAddr'))): tc
            for tc in t.findall(HP + 'tr/' + HP + 'tc')}
def content(el):
    """글자와 수식 스크립트만 차례대로 (서식은 안 본다)"""
    out = []
    for e in el.iter():
        if not isinstance(e.tag, str): continue
        if ln(e) == 't': out.append(''.join(x for x in e.itertext()))
        elif ln(e) == 'script': out.append('⟨' + (e.text or '') + '⟩')
        elif ln(e) == 'img': out.append('⟦그림⟧')
    return re.sub(r'\s+', ' ', ''.join(out)).strip()
def endnote_text(t):
    en = t.find('.//' + HP + 'endNote')
    return re.sub(r'\s+', ' ', content(en)).strip()

S = problems(SRC); O = problems(OUT)
EXP_SRC = []; last = ''
for s_ in S:
    sc_ = cells(s_)
    raw = content(sc_[(0, 1)]).replace(endnote_text(s_), '').strip().strip('[]').strip()
    raw = re.sub(r'(?<![0-9])([1-9])월', r'0\1월', raw)
    last = raw or last; EXP_SRC.append(last)
chk(len(S) == len(O), f'문항 수 {len(S)} → {len(O)}')
rep = json.load(open(OUT + '.jugina.json', encoding='utf8'))
start = rep['probs'][0]['old']
nums = [int(t.find('.//' + HP + 'endNote').get('number')) for t in O]
chk(nums == list(range(nums[0], nums[0] + len(nums))), '미주 번호가 이어지지 않는다')
for k, (s, o) in enumerate(zip(S, O)):
    sc, oc = cells(s), cells(o)
    sb = ''.join(content(p) for p in sc[(1, 0)].find(HP + 'subList').findall(HP + 'p'))
    ob = ''.join(content(p) for p in oc[(3, 0)].find(HP + 'subList').findall(HP + 'p'))
    chk(sb == ob, f'본문 다름 #{nums[k]}')
    chk(endnote_text(s) == endnote_text(o), f'정답 다름 #{nums[k]}: {endnote_text(s)} / {endnote_text(o)}')
    chk(content(oc[(1, 1)]) == EXP_SRC[k], f'출처 다름 #{nums[k]}: {EXP_SRC[k]} / {content(oc[(1, 1)])}')
    # 그림 개수
    chk(len(list(sc[(1, 0)].iter(HC + 'img'))) == len(list(oc[(3, 0)].iter(HC + 'img'))), f'본문 그림 수 다름 #{nums[k]}')

# 머리 번호가 다 있나
H = parse(OUT + '/Contents/header.xml').getroot()
ids = {k: {e.get('id') for e in H.iter(HH + k)} for k in ('charPr', 'paraPr', 'borderFill', 'style', 'tabPr', 'numbering')}
man = {it.get('id') for it in parse(OUT + '/Contents/content.hpf').iter(OPF + 'item')}
idc = collections.Counter(); inst = collections.Counter()
for f in glob.glob(OUT + '/Contents/*.xml'):
    if f.endswith('header.xml'): continue
    for e in parse(f).iter():
        if not isinstance(e.tag, str): continue
        for a, k in (('charPrIDRef', 'charPr'), ('paraPrIDRef', 'paraPr'), ('borderFillIDRef', 'borderFill'), ('styleIDRef', 'style')):
            v = e.get(a)
            if v is not None and v not in ids[k]: bad.append(f'없는 {k} {v} ({f.split("/")[-1]})')
        if ln(e) == 'img' and e.get('binaryItemIDRef') not in man: bad.append('없는 그림 ' + e.get('binaryItemIDRef'))
        if ln(e) in ('tbl', 'pic', 'equation', 'container') and e.get('id'): idc[e.get('id')] += 1
for e in H.iter(HH + 'paraPr'):
    hd = e.find(HH + 'heading')
    if hd is not None and hd.get('type') == 'NUMBER' and hd.get('idRef') not in ids['numbering']: bad.append('없는 번호 ' + hd.get('idRef'))
dup = [i for i, n in idc.items() if n > 1]
tdup = collections.Counter()
for f in glob.glob(TPL + '/Contents/*.xml'):
    for e in parse(f).iter():
        if isinstance(e.tag, str) and ln(e) in ('tbl', 'pic', 'equation', 'container') and e.get('id'): tdup[e.get('id')] += 1
newdup = [i for i in dup if tdup[i] <= 1]
chk(not newdup, f'새로 생긴 개체 id 겹침 {len(newdup)}')

# 양식에서 안 바뀌어야 하는 것
def norm(f, swaps=()):
    s = open(f, encoding='utf8').read()
    for a, b in swaps: s = s.replace(a, b)
    return s
rep_name = rep.get('name')
for m in sorted(glob.glob(TPL + '/Contents/masterpage*.xml')):
    a = open(m, encoding='utf8').read(); b = open(m.replace(TPL, OUT), encoding='utf8').read()
    if a != b:
        diff = set(re.findall(r'<hp:t>([^<]*)</hp:t>', a)) ^ set(re.findall(r'<hp:t>([^<]*)</hp:t>', b))
        chk(len(a) - len(b) == len(re.sub('.', '', '')) or diff, '')
        print('바탕쪽 글만 다름', m.split('/')[-1], sorted(diff))
for s in (0, 1):
    a = parse(TPL + f'/Contents/section{s}.xml').getroot(); b = parse(OUT + f'/Contents/section{s}.xml').getroot()
    sa = [ln(e) for e in a.iter() if isinstance(e.tag, str)]; sb = [ln(e) for e in b.iter() if isinstance(e.tag, str)]
    chk(sa == sb, f'구역{s} 짜임이 바뀜')
    ta = [x.text for x in a.iter(HP + 't')]; tb = [x.text for x in b.iter(HP + 't')]
    print(f'구역{s} 글 바뀐 것', [(x, y) for x, y in zip(ta, tb) if x != y])
for s in (2, 3):
    a = parse(TPL + f'/Contents/section{s}.xml').getroot(); b = parse(OUT + f'/Contents/section{s}.xml').getroot()
    pa = etree.tostring(a.find('.//' + HP + 'secPr')); pb = etree.tostring(b.find('.//' + HP + 'secPr'))
    chk(pa == pb, f'구역{s} 쪽 설정(secPr) 바뀜')
    ha = [etree.tostring(h) for h in a.iter(HP + 'header')]; hb = [etree.tostring(h) for h in b.iter(HP + 'header')]
    chk(len(ha) == len(hb), f'구역{s} 머리말 수 바뀜')
print('문항', len(O), '· 번호', nums[0], '~', nums[-1])
print('문제 없음' if not bad else '\n'.join(['❌ ' + b for b in bad if b]))
