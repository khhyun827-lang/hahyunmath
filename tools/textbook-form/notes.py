import sys
from lxml import etree
HP='{http://www.hancom.co.kr/hwpml/2011/paragraph}'
tree=etree.parse(sys.argv[1])
for en in tree.iter(HP+'endNote'):
    hc=en.find('.//'+HP+'hiddenComment')
    htxt=''
    if hc is not None:
        htxt=' / '.join(''.join(p.itertext()).strip() for p in hc.iter(HP+'p'))
    sl=en.find(HP+'subList')
    ps=sl.findall(HP+'p')
    first=ps[0]
    # first para text excluding hiddenComment
    def ptext(p):
        out=[]
        for r in p.findall(HP+'run'):
            for c in r:
                tag=etree.QName(c).localname
                if tag=='t': out.append(''.join(c.itertext()))
                elif tag=='equation': out.append('$'+(c.find(HP+'script').text or '')+'$')
        return ''.join(out)
    print(en.get('number'), 'HIDDEN=',repr(htxt), 'FIRST=',repr(ptext(first)[:80]), 'np=',len(ps))
