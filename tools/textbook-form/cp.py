import sys,re
from lxml import etree
HH='{http://www.hancom.co.kr/hwpml/2011/head}'
t=etree.parse(sys.argv[1]).getroot()
fonts={}
for ff in t.iter(HH+'fontface'):
    lang=ff.get('lang'); fonts[lang]={f.get('id'):f.get('face') for f in ff.findall(HH+'font')}
for cp in t.iter(HH+'charPr'):
    fr=cp.find(HH+'fontRef'); 
    sub=[etree.QName(c).localname for c in cp if etree.QName(c).localname not in('fontRef','ratio','spacing','relSz','offset','underline','strikeout','outline','shadow')]
    ul=cp.find(HH+'underline'); 
    print(cp.get('id'),'h=',cp.get('height'),'col=',cp.get('textColor'),'shade=',cp.get('shadeColor'),'bf=',cp.get('borderFillIDRef'),'han=',fonts['HANGUL'].get(fr.get('hangul')),'lat=',fonts['LATIN'].get(fr.get('latin')),'sp=',cp.find(HH+'spacing').get('hangul'),'ratio=',cp.find(HH+'ratio').get('hangul'),sub,'ul=',ul.get('type') if ul is not None else '')
