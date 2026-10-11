# reflow.py 결과를 «표 실제 높이 + 빈 줄 글자 크기»로 다시 걸어 본다 — 왼·오른 단 k번째 문항 시작 · 단 끝.
# 쓰는 법: python3 -I sim2.py <나간 폴더>
import sys, glob, re
from lxml import etree
HP = '{http://www.hancom.co.kr/hwpml/2011/paragraph}'; HH = '{http://www.hancom.co.kr/hwpml/2011/head}'
D = sys.argv[1] + '/Contents'
H = etree.parse(D + '/header.xml')
CH = {c.get('id'): int(c.get('height')) for c in H.iter(HH + 'charPr')}
COLCAP = 66049
def sec_no(f): return int(re.search(r'section(\d+)\.xml$', f).group(1))
cols = []; cur = None
for f in sorted(glob.glob(D + '/section*.xml'), key=sec_no):
    r = etree.parse(f, etree.XMLParser(huge_tree=True)).getroot()
    if not any(c.get('colCount') == '2' for c in r.iter(HP + 'colPr')): continue
    for i, p in enumerate(r.findall(HP + 'p')):
        if i == 0 or p.get('pageBreak') == '1':
            if cols and len(cols) % 2 == 1: cols.append(None)
            cur = {'y': 0, 'probs': [], 'end': 0}; cols.append(cur)
        elif p.get('columnBreak') == '1':
            cur = {'y': 0, 'probs': [], 'end': 0}; cols.append(cur)
        tb = [c for run in p.findall(HP + 'run') for c in run if etree.QName(c).localname == 'tbl']
        if not tb:
            cp = p.find(HP + 'run').get('charPrIDRef'); cur['y'] += round(CH[cp] * 1.6); continue
        for t in tb:
            rc = (t.get('rowCnt'), t.get('colCnt')); h = int(t.find(HP + 'sz').get('height'))
            if rc == ('3', '3'):
                cur['probs'].append((int(t.find('.//' + HP + 'endNote').get('number')), cur['y'], h))
            cur['end'] = cur['y'] + h
            cur['y'] += (3412 if rc == ('2', '4') else 1695 if rc == ('1', '2') else h) + 600
bad = 0; over = 0
for i in range(0, len(cols), 2):
    L = cols[i]; R = cols[i + 1] if i + 1 < len(cols) else None
    for c in (L, R):
        if c and c['end'] > COLCAP: over += 1; print('단 넘침', c['probs'][:1], c['end'])
    if not L or not R: continue
    for (a, ya, _), (b, yb, _) in zip(L['probs'], R['probs']):
        if abs(ya - yb) > 200: bad += 1; print('어긋남', a, ya, b, yb)
print('쪽', (len(cols) + 1) // 2, '· 어긋남', bad, '· 넘침', over)
