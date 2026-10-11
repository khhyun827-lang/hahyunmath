# 출력 구역을 걸으며 (내 어림 높이로) 문항 표 시작 y 를 단마다 모은다 — 좌우 정렬 확인용
from lxml import etree
import json, sys
HH={p['num']:p['H'] for p in json.load(open(sys.argv[1]+'/../build-report.json'))['probs']}
HP='{http://www.hancom.co.kr/hwpml/2011/paragraph}'
CH={'0':1000,'3':900,'12':800,'36':700,'33':400,'22':100}
cols=[]; cur=None
for f in [sys.argv[1]+'/Contents/section0.xml',sys.argv[1]+'/Contents/section1.xml']:
    r=etree.parse(f).getroot()
    newsec=True
    for p in r.findall(HP+'p'):
        if newsec or p.get('columnBreak')=='1' or p.get('pageBreak')=='1':
            if p.get('pageBreak')=='1' and cur is not None and len(cols)%2==1: cols.append(None)
            cur={'y':0,'probs':[]}; cols.append(cur); newsec=False
        t=None
        for run in p.findall(HP+'run'):
            if run.find(HP+'tbl') is not None: t=run.find(HP+'tbl')
        if t is None:
            cp=p.find(HP+'run').get('charPrIDRef'); cur['y']+=CH.get(cp,1000)*1.6; continue
        rc=(t.get('rowCnt'),t.get('colCnt')); h=int(t.find(HP+'sz').get('height'))
        if rc==('2','4'): cur['y']+=3412+600
        elif rc==('1','2'): cur['y']+=1695+600
        else:
            num=t.find('.//'+HP+'endNote').get('number'); cur['probs'].append((int(num),int(cur['y']))); cur['y']+=HH[int(num)]+600
# 쪽 = 단 둘 (구역 시작 · 쪽 나누기에서 다시 맞춤은 위에서 None 으로)
bad=0
for i in range(0,len(cols)-1,2):
    L,R=cols[i],cols[i+1]
    if not L or not R: continue
    for (a,ya),(b,yb) in zip(L['probs'],R['probs']):
        if abs(ya-yb)>100: bad+=1; print('어긋남',a,ya,b,yb)
print('단',len(cols),'어긋남',bad)
print([ [y for _,y in c['probs']] for c in cols if c][:8])
print('최대 끝', max(c['y'] for c in cols if c))
