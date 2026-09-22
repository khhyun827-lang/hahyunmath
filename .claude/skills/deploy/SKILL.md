---
name: deploy
description: "김하현수학연구소 웹페이지를 배포한다 — 검사 · 푸시 전 검문 셋 · 커밋 · push · 배포본 대조까지. 「배포해줘」 「올려줘」 「push 해줘」 라고 하면 이것을 쓴다. 공개 저장소라 정답·열쇠가 새지 않는지 먼저 훑는다."
---

# /deploy — 배포

배포 = `git push origin main` → GitHub Pages 가 1~2분 뒤 다시 짓는다.
배포본: `https://khhyun827-lang.github.io/hahyunmath/index.html`

**순서대로 밟는다. 하나라도 빨간 것이 있으면 멈추고 사용자에게 말한다.**

## ① 검사

```bash
node tools/check-all.mjs
```

「✓ 전부 초록 · N개」가 아니면 **멈춘다.** 빨간 것을 먼저 고친다.
⏭ `review-check` · `worker-check` 는 AI 한도를 먹으므로 여기서 안 돌린다(손으로 부를 때만).

## ② 푸시 전 검문 셋

🔴 **이 저장소는 공개다**(무료 Pages 는 공개 저장소만). 한 번 올리면 히스토리에서 회수되지 않는다.
2026-09-03에 564제의 정답·해설이 푸시 직전에 발견돼 멈춘 적이 있다.

```bash
# (1) 정답·해설·열쇠가 섞였나
git diff origin/main..main | grep -iE "^\+.*(apikey|secret|password|정답|해설)" | head

# (2) 줄 수가 «내가 고친 만큼»인가 — 두 배쯤 나오면 줄끝이 뒤집힌 것이다
git diff --stat
git diff --stat --ignore-cr-at-eol      # 둘이 같아야 한다

# (3) 옆에 놓인 .js 를 고쳤으면 index.html 의 ?v= 도 올렸나
#     (figure.js · hwpx.js · game-core.js · ds.js · ds.css)
#     → 안 올리면 브라우저가 옛 파일을 그냥 쓴다. 09-15·09-18 두 번 놓쳤다.
#     → 이제 cachebust-test 가 지문으로 잡는다. tools/cachebust-stamp.json 도 함께 커밋할 것.
```

⚠ `git add -A` 를 쓰지 말 것 — 추적 안 되는 `project2/`·`백업/` 까지 쓸어 담는다. **건드린 파일만 이름으로.**
⚠ `git stash -u` 도 같은 이유로 위험하다.

## ③ 커밋

```bash
git add index.html CLAUDE.md tools/<고친 검사들>
git -c core.safecrlf=false commit -F - <<'EOF'
<무엇을 왜 바꿨나 한 줄> (2026-MM-DD · <항목 번호> · 사용자 요청/신고)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

- `core.safecrlf=false` — 줄끝 경고로 커밋이 막히지 않게(내용은 안 바뀐다).
- **작업 노트(`CLAUDE.md`)를 같이 고친다** — 「마지막 갱신」 머리 · 그 날짜 항목 · 「▶ 다음 차례」.

## ④ 푸시하고 «배포본 = 저장소» 를 눈으로 맞춘다

```bash
git push origin main

# 1~2분 뒤. 글자수가 같아질 때까지 기다렸다 센다
want=$(git show HEAD:index.html | wc -c)
for i in 1 2 3 4 5 6 7 8; do
  got=$(curl -s https://khhyun827-lang.github.io/hahyunmath/index.html | wc -c)
  [ "$got" = "$want" ] && break; sleep 15
done
echo "배포본=$got 저장소=$want"

# 이번에 넣은 것이 실제로 올라갔나 (이름 하나를 세어 본다)
curl -s https://khhyun827-lang.github.io/hahyunmath/index.html | grep -c "<새로 넣은 함수 이름>"
```

⚠ `$(curl …)` 로 받아서 세면 **끝 줄바꿈이 깎여 1자 적게** 나온다. 위처럼 파이프로 곧장 셀 것.

## ⑤ 마지막 — 말하는 법

🔴 **배포는 «올라갔다»까지다. 「됐습니다」라고 말하지 않는다.**
화면을 바꿨으면 **사용자 눈 확인이 아직**이라고 말하고, 무엇을 봐 달라고 할지 한 줄로 짚는다.
어디를 만지면 되돌릴 수 있는지(숫자 하나·커밋 하나)도 같이 적어 둔다.
