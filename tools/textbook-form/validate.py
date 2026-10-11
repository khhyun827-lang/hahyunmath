import re,os,sys,collections
from lxml import etree
D=sys.argv[1]
HP='{http://www.hancom.co.kr/hwpml/2011/paragraph}'; HH='{http://www.hancom.co.kr/hwpml/2011/head}'
def ln(e): return etree.QName(e).localname
h=etree.parse(f'{D}/Contents/header.xml').getroot()
ids={}
for kind in ('charPr','paraPr','borderFill','style','tabPr','numbering'):
    ids[kind]={e.get('id') for e in h.iter(HH+kind)}
for g in h.iter():
    if isinstance(g.tag,str) and g.get('itemCnt') is not None:
        n=len([c for c in g if isinstance(c.tag,str)])
        if str(n)!=g.get('itemCnt'): print('itemCnt 틀림',ln(g),g.get('itemCnt'),n)
for ff in h.iter(HH+'fontface'):
    if ff.get('fontCnt')!=str(len(ff.findall(HH+'font'))): print('fontCnt 틀림')
# 머리 안 참조
for e in h.iter(HH+'charPr'):
    if e.get('borderFillIDRef') not in ids['borderFill']: print('charPr bf 없음',e.get('id'))
for e in h.iter(HH+'paraPr'):
    if e.get('tabPrIDRef') not in ids['tabPr']: print('paraPr tab 없음',e.get('id'))
man=open(f'{D}/Contents/content.hpf',encoding='utf8').read()
bins=set(re.findall(r'<opf:item id="([^"]+)" href="BinData/',man))
for b in re.findall(r'href="(BinData/[^"]+)"',man):
    if not os.path.exists(f'{D}/{b}'): print('그림 파일 없음',b)
shape_ids=collections.Counter(); inst=collections.Counter(); eninst=collections.Counter(); ennum=[]
SH={'pic','rect','equation','line','ellipse','arc','polygon','curve','container','ole','connectLine','textart','tbl'}
for f in sorted(os.listdir(f'{D}/Contents')):
    if not (f.startswith('section') or f.startswith('masterpage')): continue
    r=etree.parse(f'{D}/Contents/{f}').getroot()
    for e in r.iter():
        if not isinstance(e.tag,str): continue
        t=ln(e)
        for a,k in (('charPrIDRef','charPr'),('paraPrIDRef','paraPr'),('styleIDRef','style')):
            if e.get(a) is not None and e.get(a) not in ids[k]: print(f,'없는',k,e.get(a))
        if e.get('borderFillIDRef') is not None and e.get('borderFillIDRef') not in ids['borderFill']: print(f,'없는 bf',e.get('borderFillIDRef'))
        if e.get('binaryItemIDRef') is not None and e.get('binaryItemIDRef') not in bins: print(f,'없는 그림',e.get('binaryItemIDRef'))
        if t in SH and e.get('id') is not None and f.startswith('section'): shape_ids[e.get('id')]+=1
        if e.get('instid') is not None: inst[e.get('instid')]+=1
        if t=='endNote': eninst[e.get('instId')]+=1; ennum.append(int(e.get('number')))
        if t=='tc':
            sl=e.find(HP+'subList')
            if sl is None or sl.find(HP+'p') is None: print(f,'문단 없는 칸')
        if t=='subList' and e.find(HP+'p') is None: print(f,'문단 없는 subList')
print('개체 id 겹침',sum(v-1 for v in shape_ids.values() if v>1),'/',len(shape_ids),
      ' instid 겹침',sum(v-1 for v in inst.values() if v>1),' 미주 instId 겹침',sum(v-1 for v in eninst.values() if v>1))
print('미주',len(ennum),'차례대로' if ennum==list(range(1,len(ennum)+1)) else ennum[:20])
