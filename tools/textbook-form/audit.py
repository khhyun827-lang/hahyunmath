import sys,re
from lxml import etree
HP='{http://www.hancom.co.kr/hwpml/2011/paragraph}'
def ln(e): return etree.QName(e).localname
def sig(el):
    """글자 + 수식 원문 (공백·표지 무시)"""
    out=[]
    for e in el.iter():
        if not isinstance(e.tag,str): continue
        t=ln(e)
        if t=='endNote': continue
        if t=='t':
            # endNote 안은 제외
            if any(ln(a)=='endNote' for a in e.iterancestors()): continue
            out.append(''.join(e.itertext()))
        elif t=='script':
            if any(ln(a)=='endNote' for a in e.iterancestors()): continue
            out.append('$'+(e.text or '')+'$')
    s=''.join(out)
    s=s.replace('<보기>','[보기]').replace('<보 기>','').replace('오른쪽그림','다음그림').replace('오른쪽 그림','다음 그림')
    s=re.sub(r'SCENE\s*\d','',s)
    s=re.sub(r'[\s①②③④⑤]','',s)
    s=re.sub(r'\[보기\]','',s)
    s=re.sub(r'([ㄱㄴㄷㄹㅁ])\.',r'\1',s)
    return s
def notesig(en):
    return re.sub(r'\s','',''.join((e.text or '') if ln(e)=='script' else ''.join(e.itertext()) for e in en.iter() if isinstance(e.tag,str) and ln(e) in ('t','script'))).replace('<보기>','[보기]')
# 원본
w=etree.parse(sys.argv[1]+'/Contents/section0.xml').getroot()
wprobs=[]; cur=None
for p in w.findall(HP+'p'):
    if p.find('.//'+HP+'endNote') is not None:
        cur=[p]; wprobs.append(cur); continue
    txt=''.join(''.join(t.itertext()) for t in p.findall(HP+'run/'+HP+'t'))
    runs=[r.get('charPrIDRef') for r in p.findall(HP+'run')]
    if ('3' in runs or '8' in runs) and txt.strip(): cur=None; continue
    if cur is not None: cur.append(p)
W={}
for ps in wprobs:
    en=ps[0].find('.//'+HP+'endNote')
    key=''.join(en.find('.//'+HP+'hiddenComment').itertext()).strip()
    s=''.join(sig(p) for p in ps)
    # rect 안의 중복 문단(바깥 rect 가 안쪽 rect 를 품음)은 sig 가 한 번만 센다
    W[key]=(s,notesig(en))
# 새 것
N={}
for f in [sys.argv[2]+'/Contents/section0.xml',sys.argv[2]+'/Contents/section1.xml']:
    r=etree.parse(f).getroot()
    for tbl in r.iter(HP+'tbl'):
        if tbl.get('rowCnt')=='3' and tbl.get('colCnt')=='3' and tbl.find(HP+'sz').get('width')=='22680':
            tcs=tbl.findall(HP+'tr/'+HP+'tc')
            en=tbl.find('.//'+HP+'endNote')
            key=''.join(en.find('.//'+HP+'hiddenComment').itertext()).strip()
            body=[tc for tc in tcs if tc.find(HP+'cellAddr').get('rowAddr')=='2'][0]
            N[key]=(sig(body),notesig(en))
print('원본',len(W),'새',len(N))
bad=0
for k,(s,ns) in W.items():
    if k not in N: print('없음',k); bad+=1; continue
    s2,ns2=N[k]
    if s!=s2:
        bad+=1
        i=next((i for i in range(min(len(s),len(s2))) if s[i]!=s2[i]),min(len(s),len(s2)))
        print('본문 다름',k,'\n  원',s[max(0,i-40):i+60],'\n  새',s2[max(0,i-40):i+60])
    if ns!=ns2: bad+=1; print('미주 다름',k)
print('다른 것',bad)
