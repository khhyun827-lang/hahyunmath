# 단원 PDF 여러 개를 «책 한 권» PDF 로 — 단원명 쪽은 늘 홀수 쪽(오른쪽)에 오게 도비라를 끼운다.
#   규칙(사용자): 앞 단원이 짝수 쪽에서 끝나면 다음 단원명 쪽이 바로 이어진다.
#                 홀수 쪽에서 끝나면 도비라 한 쪽을 끼운다. 차례는 첫 단원 파일에만 남긴다.
# 쓰는 법
#   python3 -I book.py plan  6.pdf 7.pdf 8.pdf 9.pdf 10.pdf [--skip 7.pdf:2 ...]
#       → 단원마다 첫 쪽 번호·단원명 쪽·도비라 여부. 한글 파일에 넣을 «첫 쪽 번호»를 알려 준다.
#   python3 -I book.py make  <나갈.pdf> --dobira 예시.pdf:2  6.pdf 7.pdf ... [--skip 7.pdf:2 ...]
#   python3 -I book.py number <풀린 hwpx 폴더> <첫 쪽 번호>
#       → 첫 구역의 «쪽 번호 시작»을 그 값으로, 중간의 «새 쪽 번호»는 걷는다(번호가 책 전체로 이어지게).
#   --skip 파일:n  = 그 파일 앞 n쪽을 버린다(둘째 단원부터의 차례 쪽). 버린 쪽도 번호는 먹으므로
#                    number 에는 «첫 쪽 번호 − n» 을 넣는다(plan 이 그 값을 같이 찍는다).
import sys, os, re, subprocess, tempfile, glob, shutil

def pages(pdf):
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    return int(re.search(r'^Pages:\s+(\d+)', out, re.M).group(1))

def parse(argv):
    units, skip, dob = [], {}, None
    it = iter(argv)
    for a in it:
        if a == '--skip':
            f, n = next(it).rsplit(':', 1); skip[os.path.abspath(f)] = int(n)
        elif a == '--dobira':
            f, n = next(it).rsplit(':', 1); dob = (f, int(n))
        else: units.append(a)
    return units, skip, dob

def plan(units, skip):
    rows, total = [], 0
    for i, u in enumerate(units):
        n = pages(u); s = skip.get(os.path.abspath(u), 0); keep = n - s
        assert keep > 0, f'{u}: 남는 쪽이 없다'
        dob = i > 0 and total % 2 == 1          # 앞 단원이 홀수 쪽에서 끝났다
        if dob: total += 1
        first = total + 1                        # 이 파일에서 남기는 첫 쪽의 책 쪽 번호
        rows.append(dict(u=u, n=n, skip=s, dob=dob, dob_page=total if dob else None,
                         first=first, last=total + keep, hwp_start=first - s))
        total += keep
    return rows, total

def show(rows, total):
    for r in rows:
        d = f'도비라 {r["dob_page"]}쪽 · ' if r['dob'] else ''
        sk = f' (앞 {r["skip"]}쪽 버림)' if r['skip'] else ''
        print(f'{os.path.basename(r["u"])}: {d}{r["first"]}~{r["last"]}쪽{sk} · 한글 «쪽 번호 시작» = {r["hwp_start"]}')
    print('전체', total, '쪽', '(짝수 — 인쇄 판 그대로)' if total % 2 == 0 else '(홀수 — 마지막에 빈 쪽 하나 생김)')

def make(out, units, skip, dob):
    rows, total = plan(units, skip)
    assert dob or not any(r['dob'] for r in rows), '도비라가 필요한데 --dobira 가 없다'
    tmp = tempfile.mkdtemp()
    try:
        seq = []
        def split(pdf, tag):
            d = os.path.join(tmp, tag); os.mkdir(d)
            subprocess.run(['pdfseparate', pdf, os.path.join(d, 'p%04d.pdf')], check=True)
            return sorted(glob.glob(d + '/p*.pdf'))
        dp = None
        if dob:
            dp = split(dob[0], 'dobira')[dob[1] - 1]
        for i, r in enumerate(rows):
            if r['dob']: seq.append(dp)
            seq += split(r['u'], f'u{i}')[r['skip']:]
        assert len(seq) == total
        subprocess.run(['pdfunite', *seq, out], check=True)
    finally:
        shutil.rmtree(tmp)
    show(rows, total)
    assert pages(out) == total
    print('→', out)

def number(D, start):
    from lxml import etree
    HP = '{http://www.hancom.co.kr/hwpml/2011/paragraph}'
    secs = sorted(glob.glob(D + '/Contents/section*.xml'), key=lambda f: int(re.search(r'section(\d+)', f).group(1)))
    gone = 0
    for k, f in enumerate(secs):
        T = etree.parse(f, etree.XMLParser(huge_tree=True))
        for sn in T.iter(HP + 'startNum'):
            sn.set('page', str(start) if k == 0 else '0')     # 뒤 구역은 이어서
        for nn in list(T.iter(HP + 'newNum')):
            if nn.get('numType') == 'PAGE':
                c = nn.getparent(); c.remove(nn); gone += 1
                if len(c) == 0:                                  # 빈 ctrl 도 걷는다
                    c.getparent().remove(c)
        T.write(f, xml_declaration=True, encoding='UTF-8', standalone=True)
    print(f'첫 쪽 번호 {start} · 걷은 «새 쪽 번호» {gone}')

if __name__ == '__main__':
    cmd, rest = sys.argv[1], sys.argv[2:]
    if cmd == 'plan':
        u, s, _ = parse(rest); show(*plan(u, s))
    elif cmd == 'make':
        u, s, d = parse(rest[1:]); make(rest[0], u, s, d)
    elif cmd == 'number':
        number(rest[0], int(rest[1]))
