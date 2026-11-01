/* 로컬 정적 서버 — 시안과 실서비스를 브라우저로 확인할 때 쓴다.
   file://로 열면 iframe 썸네일이 막히고, Windows Store 파이썬 스텁은 동작하지 않는다.

     node tools/serve.js          -> http://127.0.0.1:8777
     node tools/serve.js 9000     -> 포트 지정

   루트는 저장소 루트다. 열어볼 곳은 CLAUDE.md 0-A 참고. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
/* tools/fake-today.mjs 의 FAKE_CLOCK 과 같은 글 — 여기는 CommonJS 라 import 를 못 해 글자로 떠 온다 */
const fakeClock = T => new Function('T', fs.readFileSync(path.join(__dirname, 'fake-today.mjs'), 'utf8')
  .match(/export const FAKE_CLOCK = T => ([\s\S]*?);\r?\n/)[1].replace(/^/, 'return '))(T);
const PORT = Number(process.argv[2]) || 8777;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  // ⚠ 모듈은 MIME이 JS가 아니면 브라우저가 통째로 거절한다 ("Failed to fetch dynamically imported module")
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, p);
    // 루트 밖으로 나가는 경로는 거절한다
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('forbidden');
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404);
        return res.end('not found');
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      /* KHM_TODAY 가 있으면 페이지 시계를 그 날로 (check-all --today · tools/fake-today.mjs) */
      if (process.env.KHM_TODAY && path.extname(file).toLowerCase() === '.html') {
        const 시계 = '<script>' + fakeClock(process.env.KHM_TODAY) + '</script>';
        const s = buf.toString('utf8'), at = s.search(/<head[^>]*>/i);
        return res.end(at < 0 ? 시계 + s : s.replace(/<head[^>]*>/i, m => m + 시계));
      }
      res.end(buf);
    });
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log('serving ' + ROOT);
    console.log('  http://127.0.0.1:' + PORT + '/index.html            실서비스');
    console.log('  http://127.0.0.1:' + PORT + '/design-v1/preview.html  관리자 시안 16개');
    console.log('  http://127.0.0.1:' + PORT + '/landing-v2/preview.html 랜딩');
  });
