// 새벽에 남은 AI 한도를 쓴다 (2026-10-21) — .github/workflows/nightrun.yml 이 05시쯤 부른다.
// 일은 전부 index.html 의 nightRun() 이 한다(자동 채우기 → 검토 → 셋째 AI). 여기는 열고·로그인시키고·건수만 찍는다.
// 🔴 저장소가 공개라 실행 기록도 공개다 — 찍는 것은 nightRun 이 돌려준 건수 한 줄뿐.
//   ADMIN_PW=... node tools/nightrun.mjs        (SITE=... 로 다른 주소)
import fs from 'fs';
import { chromium } from 'playwright';

const PW = process.env.ADMIN_PW;
if (!PW) { console.log('ADMIN_PW 가 없습니다 — 저장소 Settings › Secrets › Actions 에 넣어 주세요.'); process.exit(1); }
const SITE = process.env.SITE || 'https://khhyun827-lang.github.io/hahyunmath/index.html';
const ASIDE = '.night/aside.json';   // «넘겨 둔 문항» — 워크플로가 실행 사이에 캐시로 이어 준다

let aside = '{}';
try { aside = fs.readFileSync(ASIDE, 'utf8'); } catch (e) {}

const 브라우저 = await chromium.launch();
const page = await 브라우저.newPage();
page.on('dialog', d => d.dismiss());
await page.goto(SITE);
await page.waitForFunction(() => typeof nightRun === 'function', null, { timeout: 120000 });
const r = await page.evaluate(([pw, aside]) => nightRun(pw, aside), [PW, aside]);
await 브라우저.close();

if (r.aside) { fs.mkdirSync('.night', { recursive: true }); fs.writeFileSync(ASIDE, r.aside); }
console.log(r.summary);
process.exit(r.ok ? 0 : 1);
