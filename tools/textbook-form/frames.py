# 문항마다 객관식 선지 틀(1·2·3·5행)이 규칙에 맞는지 본다 — 규칙은 build.py choose_frame 과 같다.
#   1행 = 숫자 하나·둘 길이(루트 없음 · 세 자리 수 없음 · 가장 긴 선지 ≤ 2100) / 2행 = 그보다 길 때(≤ 5600) · ㄱㄴㄷ 조합 /
#   3행 = 2행이 모자랄 때 / 5행 = 줄글 선지 · 3행도 모자랄 때(> 9200)
# 쓰는 법: python3 -I frames.py <풀린 폴더> [--fix <나갈 폴더>]
import sys, re, glob, copy, os, shutil
from lxml import etree
HP = '{http://www.hancom.co.kr/hwpml/2011/paragraph}'
def ln(e): return etree.QName(e).localname
SHAPE = {('1', '10'): 1, ('2', '6'): 2, ('3', '4'): 3, ('5', '2'): 5}
ORDER = {1: [(0, 1), (0, 3), (0, 5), (0, 7), (0, 9)],
         2: [(0, 1), (0, 3), (0, 5), (1, 1), (1, 3)],
         3: [(0, 1), (0, 3), (1, 1), (1, 3), (2, 1)],
         5: [(0, 1), (1, 1), (2, 1), (3, 1), (4, 1)]}
LABELS = '①②③④⑤'

def text_w(s):
    w = 0
    for ch in s:
        if '가' <= ch <= '힣' or 'ㄱ' <= ch <= 'ㆎ': w += 1000
        elif ch == ' ': w += 330
        elif ch in LABELS: w += 1000
        else: w += 520
    return w
def cells(tbl):
    out = {}
    for tc in tbl.findall(HP + 'tr/' + HP + 'tc'):
        a = tc.find(HP + 'cellAddr'); out[(int(a.get('rowAddr')), int(a.get('colAddr')))] = tc
    return out
def cell_info(tc):
    """(너비, 글, 수식 스크립트, 그림 있나)"""
    w = 0; txt = ''; scr = ''; pic = False
    for p in tc.find(HP + 'subList').findall(HP + 'p'):
        for r in p.findall(HP + 'run'):
            for c in r:
                k = ln(c)
                if k == 't':
                    s = ''.join(c.itertext()); txt += s; w += text_w(s)
                elif k == 'equation':
                    w += int(c.find(HP + 'sz').get('width')); scr += ' ' + (c.find(HP + 'script').text or '')
                elif k in ('pic', 'container', 'rect'): pic = True
    return w, txt, scr, pic

def want_frame(infos):
    ws = [i[0] for i in infos]; mx = max(ws)
    texts = [re.sub(r'[①②③④⑤]', '', i[1]).strip() for i in infos]
    scripts = ' '.join(i[2] for i in infos)
    only_gnd = all(re.fullmatch(r'[ㄱㄴㄷㄹㅁ,\s]*', t) and not i[2].strip() for t, i in zip(texts, infos))
    long_text = any(len(re.sub(r'[\sㄱㄴㄷㄹㅁ,]', '', t)) > 0 for t in texts)
    if only_gnd: return 2          # ㄱㄴㄷ 조합 선지는 2행 (사용자 규칙)
    if mx > 9200: return 5
    if long_text: return 2 if mx <= 5600 else 3
    # 세 자리 이상 수가 하나라도 있으면 2행 (사용자 — 「2행 기준은 보통 숫자 세 개부터」)
    if any(re.search(r'\d{3}', i[1] + i[2]) for i in infos) and mx <= 5600: return 2
    if mx <= 2100 and not re.search(r'sqrt|root', scripts, re.I): return 1
    if mx <= 5600: return 2
    return 3

def choice_tables(prob):
    for t in prob.iter(HP + 'tbl'):
        if t is prob: continue
        rc = (t.get('rowCnt'), t.get('colCnt'))
        if rc in SHAPE and LABELS[0] in ''.join(t.itertext()): yield t, SHAPE[rc]

def scan(D):
    out = []
    for f in sorted(glob.glob(D + '/Contents/section*.xml')):
        T = etree.parse(f, etree.XMLParser(huge_tree=True))
        for prob in T.iter(HP + 'tbl'):
            if not (prob.get('rowCnt') == '3' and prob.get('colCnt') == '3' and prob.find(HP + 'sz').get('width') == '22680'): continue
            en = prob.find('.//' + HP + 'endNote'); num = en.get('number') if en is not None else '?'
            for t, cur in choice_tables(prob):
                cs = cells(t)
                infos = [cell_info(cs[rc]) for rc in ORDER[cur] if rc in cs]
                if any(i[3] for i in infos): continue        # 그림 선지는 따로
                if not any(i[0] for i in infos): continue
                w = want_frame(infos)
                out.append(dict(f=f, T=T, num=num, tbl=t, cur=cur, want=w, ws=[i[0] for i in infos],
                                show=[(re.sub(r'\s+', ' ', i[1]).strip() + ('〔' + i[2].strip()[:25] + '〕' if i[2].strip() else '')) for i in infos]))
    return out

NSHP = 'http://www.hancom.co.kr/hwpml/2011/paragraph'
def LSEG():
    return etree.fromstring(f'<hp:linesegarray xmlns:hp="{NSHP}"><hp:lineseg textpos="0" vertpos="0" vertsize="1000" '
                            'textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="22680" flags="393216"/></hp:linesegarray>')
def used_h(tc):
    m = 0
    for p in tc.find(HP + 'subList').findall(HP + 'p'):
        for l in p.iter(HP + 'lineseg'):
            if l.getparent().getparent() is p: m = max(m, int(l.get('vertpos')) + int(l.get('vertsize')))
    return m
STD_W = {1: '22108', 2: '22227', 3: '22228', 5: '22156'}

def refit(r, protos):
    """선지 표를 맞는 틀로 갈아 끼운다. 선지 칸의 문단은 그대로 옮긴다. → 높이 차"""
    old = r['tbl']; new = copy.deepcopy(protos[r['want']])
    ocs = cells(old); ncs = cells(new)
    for rc, tc in ncs.items():          # 틀의 선지 칸·빈 칸은 비우고, 번호 칸(①…)은 그대로
        sl = tc.find(HP + 'subList')
        lab = ''.join(tc.itertext()).strip()
        if lab in LABELS: continue
        for p in sl.findall(HP + 'p'): sl.remove(p)
        q = etree.SubElement(sl, HP + 'p', id='2147483648', paraPrIDRef='0', styleIDRef='0', pageBreak='0', columnBreak='0', merged='0')
        etree.SubElement(q, HP + 'run', charPrIDRef='1'); q.append(LSEG())
    for orc, nrc in zip(ORDER[r['cur']], ORDER[r['want']]):
        osl = ocs[orc].find(HP + 'subList'); nsl = ncs[nrc].find(HP + 'subList')
        for p in nsl.findall(HP + 'p'): nsl.remove(p)
        for p in osl.findall(HP + 'p'):
            for l in p.findall(HP + 'linesegarray'): p.remove(l)
            p.append(LSEG()); nsl.append(p)
    new.set('id', old.get('id'))
    for k in ('zOrder',):
        if old.get(k) is not None: new.set(k, old.get(k))
    dh = int(new.find(HP + 'sz').get('height')) - int(old.find(HP + 'sz').get('height'))
    old.getparent().replace(old, new); r['tbl'] = new
    return dh

def fix(D, OUT):
    if os.path.exists(OUT): shutil.rmtree(OUT)
    shutil.copytree(D, OUT)
    res = scan(OUT)
    protos = {}
    for r in res:      # 같은 파일 안의 «규칙에 맞게 쓰인» 틀을 본으로 (글꼴·테두리 번호가 파일마다 달라서)
        if r['cur'] == r['want'] and r['cur'] not in protos and r['tbl'].find(HP + 'sz').get('width') == STD_W[r['cur']]:
            protos[r['cur']] = copy.deepcopy(r['tbl'])
    done = []; trees = {}
    for r in res:
        if r['cur'] == r['want']: continue
        assert r['want'] in protos, f"본 틀 없음 {r['want']}행"
        prob = [a for a in r['tbl'].iterancestors() if ln(a) == 'tbl' and a.get('rowCnt') == '3' and a.find(HP + 'sz').get('width') == '22680'][0]
        cell = cells(prob)[(2, 0)]; used = used_h(cell)
        dh = refit(r, protos)
        # 칸 높이(cellSz)는 «최소»다 — 실제 높이는 표 높이(sz)에 있고 = 위 두 줄(2080+1000) + 본문이 쓴 높이
        sz = prob.find(HP + 'sz'); oldh = int(sz.get('height'))
        mn = int(cell.find(HP + 'cellSz').get('height'))
        newh = 3080 + max(mn, used + dh) if used else oldh
        sz.set('height', str(newh))
        done.append((r['num'], r['cur'], r['want'], dh, oldh, newh)); trees[r['f']] = r['T']
    for f, T in trees.items(): T.write(f, xml_declaration=True, encoding='UTF-8', standalone=True)
    for d in done: print(f'{d[0]}: {d[1]}행 → {d[2]}행 (틀 높이 {d[3]:+}) · 문항 표 {d[4]} → {d[5]}')
    print('갈아 끼움', len(done))

if __name__ == '__main__':
    D = sys.argv[1]
    if len(sys.argv) > 3 and sys.argv[2] == '--fix': fix(D, sys.argv[3]); sys.exit()
    res = scan(D)
    bad = [r for r in res if r['cur'] != r['want']]
    for r in bad:
        print(f"{r['num']}: {r['cur']}행 → {r['want']}행  최장 {max(r['ws'])}  {r['show']}")
    print('선지 틀', len(res), '· 맞지 않음', len(bad))
