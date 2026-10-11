# 모든 xml 의 선언을 한글 꼴(큰따옴표·한 줄)로 맞추고 hwpx 로 묶는다. mimetype 은 맨 앞·무압축.
import sys, os, re, zipfile
D, OUTF = sys.argv[1], sys.argv[2]
for root, _, files in os.walk(D):
    for f in files:
        if f.endswith(('.xml', '.hpf', '.rdf')):
            p = os.path.join(root, f); b = open(p, 'rb').read()
            b2 = re.sub(rb"^<\?xml[^>]*\?>\s*", b'<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>', b, count=1)
            if b2 != b: open(p, 'wb').write(b2)
order = ['mimetype', 'version.xml', 'Contents/header.xml']
allf = []
for root, _, files in os.walk(D):
    for f in files: allf.append(os.path.relpath(os.path.join(root, f), D).replace(os.sep, '/'))
allf.sort(key=lambda x: (order.index(x) if x in order else 99, x))
with zipfile.ZipFile(OUTF, 'w') as z:
    for rel in allf:
        data = open(os.path.join(D, rel), 'rb').read()
        if rel == 'mimetype': z.writestr(zipfile.ZipInfo('mimetype'), data, compress_type=zipfile.ZIP_STORED)
        else: z.writestr(rel, data, compress_type=zipfile.ZIP_DEFLATED)
print(OUTF, os.path.getsize(OUTF) // 1024, 'KB', len(allf), 'files')
