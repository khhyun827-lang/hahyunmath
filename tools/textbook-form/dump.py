import sys
from lxml import etree
HP='{http://www.hancom.co.kr/hwpml/2011/paragraph}'
def ln(e): return etree.QName(e).localname
out=[]
def short(s,n=80):
    s=s.replace('\n',' ')
    return s if len(s)<=n else s[:n]+'…'
def dump_p(p,ind):
    a=p.attrib
    flags=''
    if a.get('pageBreak')=='1': flags+=' PB'
    if a.get('columnBreak')=='1': flags+=' CB'
    head=f"{ind}P#{a.get('id')} pp={a.get('paraPrIDRef')} st={a.get('styleIDRef')}{flags}:"
    parts=[]
    subs=[]
    for r in p:
        if ln(r)!='run':
            continue
        cp=r.get('charPrIDRef')
        for c in r:
            t=ln(c)
            if t=='t':
                txt=''.join(c.itertext())
                # also markers
                inner=[ln(x) for x in c]
                parts.append(f"[c{cp}]{short(txt,120)!r}"+(f"{{{','.join(inner)}}}" if inner else ''))
            elif t=='equation':
                sc=c.find(HP+'script')
                parts.append(f"[c{cp}]EQ({short(sc.text or '',60)!r} w={c.find(HP+'sz').get('width') if c.find(HP+'sz') is not None else ''} treat={c.find(HP+'pos').get('treatAsChar') if c.find(HP+'pos') is not None else ''} id={c.get('id')})")
            elif t=='tbl':
                pos=c.find(HP+'pos'); sz=c.find(HP+'sz')
                parts.append(f"[c{cp}]TBL(r={c.get('rowCnt')} c={c.get('colCnt')} bf={c.get('borderFillIDRef')} w={sz.get('width')} h={sz.get('height')} treat={pos.get('treatAsChar')} ha={pos.get('horzAlign')} id={c.get('id')})")
                subs.append(('tbl',c))
            elif t=='pic':
                img=c.find('.//{http://www.hancom.co.kr/hwpml/2011/core}img')
                pos=c.find(HP+'pos'); sz=c.find(HP+'sz')
                sc=c.find(HP+'shapeComment'); cmt=short(sc.text or '',40) if sc is not None else ''
                parts.append(f"[c{cp}]PIC({img.get('binaryItemIDRef') if img is not None else ''} w={sz.get('width')} h={sz.get('height')} treat={pos.get('treatAsChar')} ha={pos.get('horzAlign')} cmt={cmt!r})")
            elif t=='ctrl':
                for cc in c:
                    k=ln(cc)
                    if k=='endNote' or k=='footNote':
                        parts.append(f"[c{cp}]{k.upper()}(num={cc.get('number')} inst={cc.get('instId')})")
                        subs.append(('note',cc))
                    elif k in ('colPr',):
                        parts.append(f"COLPR(cnt={cc.get('colCount')} type={cc.get('type')} layout={cc.get('layout')})")
                    else:
                        parts.append(f"CTRL:{k}"+str({kk:vv for kk,vv in cc.attrib.items() if kk in('type','name','instid','id')}))
            elif t=='secPr':
                parts.append('SECPR')
            elif t in ('rect','container','line','ellipse','textart'):
                parts.append(f"[c{cp}]{t.upper()}")
                subs.append(('shape',c))
            else:
                parts.append(f"<{t}>")
    out.append(head+' '+' '.join(parts))
    for kind,c in subs:
        if kind=='tbl':
            for tr in c.findall(HP+'tr'):
                for tc in tr.findall(HP+'tc'):
                    ca=tc.find(HP+'cellAddr'); csz=tc.find(HP+'cellSz'); cm=tc.find(HP+'cellMargin')
                    out.append(f"{ind}  CELL r{ca.get('rowAddr')}c{ca.get('colAddr')} bf={tc.get('borderFillIDRef')} w={csz.get('width')} h={csz.get('height')} margin={dict(cm.attrib) if cm is not None else ''}")
                    sl=tc.find(HP+'subList')
                    for pp in sl.findall(HP+'p'):
                        dump_p(pp,ind+'    ')
        elif kind=='note':
            sl=c.find(HP+'subList')
            for pp in sl.findall(HP+'p'):
                dump_p(pp,ind+'    N| ')
        elif kind=='shape':
            for sl in c.iter(HP+'subList'):
                for pp in sl.findall(HP+'p'):
                    dump_p(pp,ind+'    S| ')
tree=etree.parse(sys.argv[1])
for p in tree.getroot().findall(HP+'p'):
    dump_p(p,'')
print('\n'.join(out))
