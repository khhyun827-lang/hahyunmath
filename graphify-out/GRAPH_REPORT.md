# Graph Report - claude work  (2026-09-19)

## Corpus Check
- Large corpus: 485 files · ~1,805,100 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2697 nodes · 4284 edges · 203 communities (192 shown, 11 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 239 edges (avg confidence: 0.85)
- Token cost: 933,609 input · 0 output

## Community Hubs (Navigation)
- Worker Gemini Proxy & Auth
- Season Import Tests
- Code Hiding & Comment Scrub
- Textbook Build (work2)
- Decision Scripts (work2)
- Check-in Stamp Game Drafts
- AI Review Bench
- Textbook Build (work)
- Item Code Ledger
- Audit Log & Clinic Tests
- Exams · Clinic · Notice Screens
- Decision Scripts (work)
- Equation Check & Skeleton
- Code Audit Tool
- Video Due Tests
- Items Push to Firestore
- Sept 2026 Log · Render & State
- Source Code Ledger
- Item Code Re-run Tests
- Review Worker Check
- Finalize v2 (work2)
- Figure Draft · AI Twin · Bank Fill
- HWPX Extract & DB (work2)
- Zip Writer
- HWPX Extract & DB (work)
- CLAUDE.md Rules & Pipeline
- hwpx.js Parser
- Auth Migration & Roles
- Student Mobile App Design
- Wrong-Answer Review & Bank
- HWPX XML Builders
- Contact Repair
- Figure Editor Plan & Labels
- Video Controls & Zoom
- Cache-bust & Item Figures
- Class Session · Log · Login Design
- Design Principles · Student Detail · Signals
- Figure Edit Actions
- Date Utils · Student Home · Plans
- Similarity Analysis (work2)
- Similarity Analysis (work)
- Review Pool (work)
- Finalize v2 (work)
- Autofill & Old Safari Tests
- Game Duck Gap Test
- HWPX Push
- Book Covers & Mockups
- Brand Colors · Runner Game · SPA
- Roster · Classes · Videos Design
- Homework & Figure Probes
- Answer Key Parser
- Figure Undo Test
- Similar Items Tool
- figure.js Segment Ops
- Problem Set Compression (v1)
- Audit & Decor (work2)
- Review Pool (work2)
- Report (work2)
- Audit & Decor (work)
- Report (work)
- Groq Pool Test
- Firestore Concepts
- fs
- contentCells
- audit
- item-code-stamp
- 주기나 Mock Exam PDF
- 셸을 지나면 백슬래시가 깎인다
- 전체 재렌더링
- 출석률 정의
- Character Sprites & Stamp
- addVideo
- ref_module
- att-names-test
- backup
- review-ui-test
- Class Concepts
- Design Concepts
- check-answers
- check-answers
- exam-type-test
- myplan-ime-probe
- reset-test-data
- source-store-test
- student-calendar-test
- Fonts & Figures
- 문항 코드를 교재에 심기
- build
- Four Source Books
- Problem Types (T09…)
- ref_node_url
- hwpx-node
- teacher-doc
- video-dup-repair
- video-notice-probe
- parseExpr
- Review Test Pool
- dq-face-test
- eq-test
- game-hit-test
- items-cache-test
- room-plan-test
- Book Set Mockup
- addLabel
- validate
- AUTONUM
- validate
- ref_node_child_process
- cal-dots-test
- exam-plan-test
- fb-login
- game-plays-test
- item-bodies
- items-repair
- pending-variant-test
- rank-submit-test
- report-move-test
- student-dup-repair
- student-key-test
- student-skin-test
- ta-account-test
- upload-together-test
- variant-edit-test
- video-segment-probe
- Public Landing
- cluster
- extract-parts
- cluster
- extract-parts
- v2-t11-basics
- att-save-test
- backup-diff
- bench-grade-test
- book-request-test
- coll-cache-test
- figure-axis-test
- figure-preview
- ic-fill-gate-test
- item-answers-test
- items-wipe
- multi-send-test
- next-visit-test
- plan-export-test
- qna-answers-probe
- qna-followup-test
- record-guard-test
- review-key-test
- study-tab-test
- twin-layout-test
- who-col-test
- Firebase
- addSegment
- convertHwpEq
- answer-match-test
- auditlog-recent-test
- auth-bridge-test
- autofill-stop-test
- body-render-test
- class-edit-test
- class-prog-test
- figure-branches
- grade-one-test
- read-cost
- student-bulk-delete-test
- video-watch-test
- 읽기는 «누가 들어온 뒤에»
- 이미 코드가 있는 문항은 코드가 진실이고, 코드 없는 문항에만 번호를 준
- Brand Logo
- v2-t01-t04
- v2-t05-t08
- v2-t10-t15
- v2-t18-t08-t04-t07
- v2-t23-t14-t20-t13
- ref_http
- admin-check-test
- exam-rows-test
- phone-test
- season-start-test
- Daily Quiz
- 빈 결과 상태
- openPhoto
- rich
- rich
- skeleton
- v2-t21-t16-t09
- hw-session-test
- hw-signal-test
- offday-notice-test
- repair-test
- store-merge-test
- pill(사용자 조작) vs badge(시스템 부여)
- v2-t09-t12
- v2-t12-t17
- v2-t19
- v2-t22
- worker-order-test
- v2-t13
- v2-t10
- v2-t15
- renumber
- node:fs/promises
- tools/pdfjs/pdf
- dbGet

## God Nodes (most connected - your core abstractions)
1. `디자인 시스템 v1 문서` - 37 edges
2. `loadHwpxRules()` - 27 edges
3. `ds.css — 디자인 토큰·공용 컴포넌트` - 27 edges
4. `21 출석 도장 — 시안 A·B·C·D` - 26 edges
5. `ICON()` - 25 edges
6. `fetch()` - 23 edges
7. `20 학생 마이페이지 (11 screens · 4 tabs)` - 22 edges
8. `build()` - 21 edges
9. `STUDENTS (공용 예시 학생 데이터)` - 21 edges
10. `fitCanvas()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `fitAll()` --semantically_similar_to--> `fitCanvas()`  [INFERRED] [semantically similar]
  design-v1/18-assistant.html → ds.js
- `fitThumbs() — 1488×900 iframe 축소` --semantically_similar_to--> `fitCanvas()`  [INFERRED] [semantically similar]
  design-v1/preview.html → ds.js
- `line(vals,w,h) — 성적 추이 SVG` --semantically_similar_to--> `spark()`  [INFERRED] [semantically similar]
  design-v1/20-student-app.html → ds.js
- `attDots(o,l,lv,n)` --semantically_similar_to--> `dots()`  [INFERRED] [semantically similar]
  design-v1/14-log.html → ds.js
- `run-sprite.png — 달리기 스프라이트 시트 (12프레임)` --semantically_similar_to--> `game-char.webp (게임 캐릭터)`  [INFERRED] [semantically similar]
  run-sprite.png → design-v1/21-checkin.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **오답 파이프라인 — 시험지 → AI 쌍둥이 → 검토 → 창고 → 학생 오답숙제** — design_v1_07_exams, design_v1_04_review, design_v1_08_bank, design_v1_04_review_twin_item, design_v1_13_settings_ai_quota, design_v1_20_student_app_wrong [EXTRACTED 1.00]
- **공용 STUDENTS 데이터로 그리는 화면들 — 화면끼리 숫자가 어긋나면 신뢰를 잃는다** — design_v1_01_roster, design_v1_02_class, design_v1_03_student, design_v1_05_signals, design_v1_07_exams, design_v1_09_clinic, design_v1_10_notice, design_v1_11_qna, design_v1_12_chat, design_v1_15_quiz, design_v1_16_videos, design_v1_18_assistant, ds_students [EXTRACTED 1.00]
- **ds.css 이름 충돌 회피 — 접두사 격리 (lo- / as- / gm- / .body·.row·.ph 사고)** — design_v1_14_log_css_collision, design_v1_17_login_lo_prefix, design_v1_18_assistant_as_prefix, design_v1_21_checkin_gm_prefix, design_v1_20_student_app_row_collision, ds_css [INFERRED 0.95]
- **문항 코드 → 장부 → 창고 판정 파이프라인 (hwpx.js 한 곳의 규칙을 웹과 도구가 같이 쓴다)** — hwpx_js, hwpx_hwpitemverdicts, hwpx_hwpverdictblockers, tools_items_push, tools_store_diff, index_icfillbodies, index_icfillcommit, docs_record_2026_09_codes_ledger, docs_code_hiding_verdict_table [EXTRACTED 1.00]
- **그림 장면 → 검산 → 이름표 편집 → 저장 흐름 (SVG 는 언제나 renderScene 의 산물)** — docs_figure_editor_plan_scene_pins, figure_renderscene, figure_verifyscene, index_figuredrafthtml, index_acceptfiguredraft, docs_figure_editor_plan_no_svg_editor [EXTRACTED 1.00]
- **인증 구멍 닫기 — Firebase Auth · uid 문서 · teachers/staff 문서 · firestore.rules · rules-check** — docs_auth_migration_firebase_auth_email, docs_auth_migration_uid_doc_id, docs_auth_migration_teachers_doc, claude_staff_role, firestore_rules, tools_rules_check, tools_fb_login [EXTRACTED 1.00]
- **hwpx 빌드·검사 파이프라인 (finalize2 → review-pool → build → audit → check-answers → zip → validate)** — project2_worknote_finalize2, project2_worknote_review_pool_tool, project2_worknote_build, project2_worknote_audit, project2_worknote_check_answers, project2_worknote_zip, project2_worknote_validate [EXTRACTED 1.00]
- **4권(고쟁이·올림포스·유형반복R·절대등급) → 집합 압축본** — project2_work_text_gojaengi, project2_work_text_olympus, project2_work_text_type_repeat_r, project2_work_text_absolute_grade, project2_worknote_unit05_sets, project2_worknote_output_sets_hwpx [EXTRACTED 1.00]
- **옛 v1 판정 흐름 (유형 묶음 → 1차 삭제 → 2차 삭제 → 유지 120 → 출처 지도)** — project2_analysis_type_clusters, project2_analysis_delete_list, project2_analysis_old_v1_delete_list_2nd, project2_analysis_keep_list, project2_analysis_source_map, project2_analysis_report [INFERRED 0.85]
- **index.html을 iframe에 띄워 eval로 조작하는 프로브 하네스들** — tools_att_names_probe_harness, tools_att_save_probe_harness, tools_class_prog_probe_harness, tools_figure_edit_probe_harness, tools_figure_seg_probe_harness, tools_multi_send_probe_harness, tools_notice_edit_probe_harness, tools_plan_image_probe_harness, tools_qna_followup_probe_harness, tools_qna_zoom_probe_harness, tools_report_margin_probe_harness, tools_review_edit_probe_harness, tools_screen_shot_tool, tools_store_ask_probe_harness, tools_student_bulk_probe_harness, tools_student_home_probe_harness, tools_variant_figure_probe_harness, tools_video_controls_probe_harness, tools_who_col_probe_harness, tools_figure_edit_probe_iframe_eval_pattern [EXTRACTED 1.00]
- **실 DB 0줄 — 저장·읽기·감사 함수를 갈아 끼우는 프로브들** — tools_att_names_probe_harness, tools_att_save_probe_harness, tools_class_prog_probe_harness, tools_multi_send_probe_harness, tools_store_ask_probe_harness, tools_student_bulk_probe_harness, tools_variant_figure_probe_harness, tools_who_col_probe_harness, index_dbset, index_dbget, index_dbsetdoc, index_dbgetdoc, index_dbdeletedoc, index_logaudit, tools_class_prog_probe_real_db_zero_rule [EXTRACTED 1.00]
- **그림 파이프라인 (B) — 장면 → 검산 → 편집기 → v.image → 학생 얼굴** — tools_figure_edit_probe_harness, tools_figure_seg_probe_harness, tools_variant_figure_probe_harness, tools_store_ask_probe_harness, figure_renderscene, figure_verifyscene, index_figuredrafthtml, index_requestfiguredraft, index_acceptfiguredraft, index_applytwintobank, index_dqfaces [INFERRED 0.85]
- **김하현수학연구소 브랜드 자산 (교재 표지·로고·강사 사진)** — book_set, book_mockup, profile_photo, book_set_brand_logo [INFERRED 0.75]
- **학생 화면 게임화 자산 (캐릭터·스프라이트·칭찬 도장)** — game_char, run_sprite, stamp [INFERRED 0.65]
- **김하현수학연구소 교재 3종 라인업 (개념서·엔딩크레딧·주기나)** — series_gaenyeom, series_ending_credit, series_jugina, brand_kimhahyun_math_lab [INFERRED 0.85]
- **주기나 표지 하나에서 나온 목업 세 벌** — tools_cover_jugina, tools_mock_jugina, book_cover_mockupea_export, book_cover_mockupea_export_1 [INFERRED 0.95]
- **로고 3종 세트(1=풀컬러, 2=흰색 리버스 추정, 3=검정 단색) × 가로/세로 레이아웃** — logo_horizontal_1, logo_horizontal_2, logo_horizontal_3, logo_vertical_1, logo_vertical_2, logo_vertical_3 [INFERRED 0.75]

## Communities (203 total, 11 thin omitted)

### Community 0 - "Worker Gemini Proxy & Auth"
Cohesion: 0.07
Nodes (56): api, html, ROOT, adminGate(), adminJson(), authenticate(), b64urlToBytes(), b64urlToJson() (+48 more)

### Community 1 - "Season Import Tests"
Cohesion: 0.06
Nodes (25): html, ROOT, 떠내기(), 세상(), html, ROOT, SEASONS, 떠내기() (+17 more)

### Community 2 - "Code Hiding & Comment Scrub"
Cohesion: 0.10
Nodes (31): 망가뜨린다(), rules, 뜰, 숨김, 앞코드, ROOT, rules, 낸것 (+23 more)

### Community 3 - "Textbook Build (work2)"
Cohesion: 0.07
Nodes (30): BOGI, BOOKNAME, CHOICE_LOG, COND, DECOR, EQ, foldBogi(), FRAMES (+22 more)

### Community 4 - "Decision Scripts (work2)"
Cohesion: 0.08
Nodes (22): DEC4, TYPE_FIX4, DEC5, TYPE_FIX5, DEC6, TYPE_FIX6, DROP2, STEP3_TO_2 (+14 more)

### Community 5 - "Check-in Stamp Game Drafts"
Cohesion: 0.16
Nodes (32): 21 출석 도장 — 시안 A·B·C·D, 시안 A · 도장 찍기 (A, drawA, hitA), 시안 B · 카드 뽑기 (B, STICKERS, drawB, hitB), 시안 C · 오늘의 한 문제 (C, drawC, hitC), 캔버스는 #app 밖에, 캐릭터 기준점 = 색 픽셀 무게중심 (CHAR_ANCHOR .479) · 오른쪽으로 갈 때 뒤집기, 시안 D · 똥피하기 (D, drawD, openGame, startGame, closeGame, endGame), 난이도 세 축 (낙하 속도 · 생성 간격 · 한 번에 떨어지는 개수) (+24 more)

### Community 6 - "AI Review Bench"
Cohesion: 0.09
Nodes (30): ROOT, 갈래(), 값꼴(), 걸음, 결과, 곳들, 기록, 단원 (+22 more)

### Community 7 - "Textbook Build (work)"
Cohesion: 0.07
Nodes (24): BOGI, BOOKNAME, CHOICE_LOG, COND, DECOR, EQ, FRAMES, headEnd (+16 more)

### Community 8 - "Item Code Ledger"
Cohesion: 0.07
Nodes (27): AGAIN, argv, BOOK, BOOK_NAME, byBook, byKind, cdir, CHAPTER (+19 more)

### Community 9 - "Audit Log & Clinic Tests"
Cohesion: 0.07
Nodes (15): ref_url, html, ROOT, ROOT, src, html, NL, ROOT (+7 more)

### Community 10 - "Exams · Clinic · Notice Screens"
Cohesion: 0.12
Nodes (27): 화면별 <style>에는 배치만, GROUPS — 위험·주의·관찰 세 등급, 07 시험지 (Exams), 오답률 막대를 «행»으로 눕힘, EXAMS — 시험지 목록, QS — 문항별 오답률, 제출 현황을 같은 화면에, UNSUB — 오답숙제 미제출 학생 (+19 more)

### Community 11 - "Decision Scripts (work)"
Cohesion: 0.10
Nodes (18): DEC2, DEC3, STEP_FIX, DEC4, DEC4_DROP, STEP3_TO_2, DEC, TYPE_FIX (+10 more)

### Community 12 - "Equation Check & Skeleton"
Cohesion: 0.08
Nodes (17): leftover, lo, samples, by, db, h, KEEP, out (+9 more)

### Community 13 - "Code Audit Tool"
Cohesion: 0.13
Nodes (18): ref_node_crypto, auditFile(), HERE, ROOT, 고친것, 기본, 망친것, 박은것 (+10 more)

### Community 14 - "Video Due Tests"
Cohesion: 0.08
Nodes (23): api, api2, api3, c, chubVideo, dates, html, MAKEUP (+15 more)

### Community 15 - "Items Push to Firestore"
Cohesion: 0.09
Nodes (20): 파서를 고친 뒤에는 «수식 다시 훑기»를 먼저 돌리고 대조한다, argv, d0, rules, v, 막이, 막힘, { 문항, 파일별 } (+12 more)

### Community 16 - "Sept 2026 Log · Render & State"
Cohesion: 0.13
Nodes (25): 기록 — 2026년 9월 (09-01 ~ 09-05), 잣대는 «미주 수 == 코드 붙은 수» — 늘 뜨는 경고는 아무도 안 본다, const state 선언보다 위에서 state.x 를 쓰면 스크립트가 통째로 죽는다, adminDeleteUser, DATA (classes/students/records/notices/qnas), dbDeleteDoc, index.html homeHTML — 공개 홈(랜딩) 합류본, noticeEditClose (+17 more)

### Community 17 - "Source Code Ledger"
Cohesion: 0.08
Nodes (20): argv, CHAPTER, DEFS, ledger, NL, OUT, R, SRC (+12 more)

### Community 18 - "Item Code Re-run Tests"
Cohesion: 0.09
Nodes (16): ref_child_process, ref_os, ROOT, 교재폴더, 뜰, 새, 세번째, 옛 (+8 more)

### Community 19 - "Review Worker Check"
Cohesion: 0.10
Nodes (19): H, 문항, 재볼까, ROOT, src, 가짜(), 가짜응답, 만들기 (+11 more)

### Community 20 - "Finalize v2 (work2)"
Cohesion: 0.11
Nodes (17): DEC2, TYPE_FIX2, DEC3, TYPE_FIX3, BOOKS, byType(), db, FIX (+9 more)

### Community 21 - "Figure Draft · AI Twin · Bank Fill"
Cohesion: 0.14
Nodes (22): index.html acceptFigureDraft — svg + scene(핀 포함) 저장, approveAutoVariant (통과), autoFillTick (자동 채우기), index.html dbSetDoc — Firestore REST 쓰기, index.html dqFaces — 데일리퀴즈 카드 두 얼굴(원본·변형), fetchFigureSceneViaAI (워커 장면 요청), generateTwinViaAI (Gemini/Groq 쌍둥이 생성), index.html getAIQuotaUsed — 워커 /quota (실패를 0으로 삼킨다) (+14 more)

### Community 22 - "HWPX Extract & DB (work2)"
Cohesion: 0.13
Nodes (17): all, BOOKS, buildBook(), isTable(), ENT, eqToLatex(), extractHwpx(), KW (+9 more)

### Community 23 - "Zip Writer"
Cohesion: 0.10
Nodes (15): cd, central, crcTable, eocd, files, locals, cd, central (+7 more)

### Community 24 - "HWPX Extract & DB (work)"
Cohesion: 0.13
Nodes (17): all, BOOKS, buildBook(), isTable(), ENT, eqToLatex(), extractHwpx(), KW (+9 more)

### Community 25 - "CLAUDE.md Rules & Pipeline"
Cohesion: 0.12
Nodes (21): AI 한도의 진실은 워커 하나뿐, 오답 파이프라인 (시험지 등록 → 오답 → 쌍둥이 생성 → 3단계 검토 → 오답숙제 → 데일리퀴즈), 해시 기반 라우팅 (#teacher/home, #student/quiz, #assistant/students), KaTeX 0.16.11 수식 렌더링 ($...$), 랜딩 「생각의 흐름」 — 주인공은 수학강사 김하현, 빌드 도구 없음 — 일부러, TEACHER_NAV / TEACHER_SUBNAV — 상단바를 손으로 적지 않는다, 같은 영상을 여러 명에게 보내면 화면에서 한 줄로 묶는다 (+13 more)

### Community 26 - "hwpx.js Parser"
Cohesion: 0.15
Nodes (16): cleanHwpPlainText(), HWP_WATERMARK_PATTERNS, hwpCellToBlock(), hwpParseBlocks(), hwpWalkParagraphs(), hwpxAnswerKeyFromDocs(), hwpxGradeOfMonth(), hwpxMakeSourceCodes() (+8 more)

### Community 27 - "Auth Migration & Roles"
Cohesion: 0.11
Nodes (17): 못 읽는 컬렉션은 «묻지 않는다» — 규칙을 여는 게 아니다, 조교 자리 staff/<uid> — isStaff(), 조교 화면은 강사 화면을 그대로 쓴다, 인증 옮기기 — 계획과 진행 (2026-09-07 시작 · 09-08 끝), ranks/{주}__{uid} — 순위를 문서마다 갈랐다, 규칙은 맨 마지막에 게시한다, teachers/{uid} 문서가 있으면 강사 — isTeacher(), 워커 관리자 권한 (FIREBASE_SA) — 비번 재설정·계정 삭제 (+9 more)

### Community 28 - "Student Mobile App Design"
Cohesion: 0.17
Nodes (20): 선택·hover·포커스 규칙, 학생 마이페이지 — 같은 토큰, 밀도만 다름, NOTICES — 공지 목록 (읽음/대상), 20 학생 마이페이지 (11 screens · 4 tabs), 출석 달력, 채팅, 클리닉 신청, 탭 11개 → 4개 (+12 more)

### Community 29 - "Wrong-Answer Review & Bank"
Cohesion: 0.13
Nodes (20): 다중 선택 일괄 작업 (actbar), 오늘 남은 일 (todo), 04 오답 검토 (Review), 원본 ↔ AI 쌍둥이 2열 비교, AI 풀이 기본 접힘, 키보드 우선 (J/K 이동 · E 승인 · R 수정 · X 반려 · S 보류), Q — 검토 큐 데이터, 큐는 오답 전용 (+12 more)

### Community 30 - "HWPX XML Builders"
Cohesion: 0.17
Nodes (20): AUTONUM(), bodyParas(), boxed(), contentCells(), dropFrameParagraph(), eqXml(), esc(), fillBodyCell() (+12 more)

### Community 31 - "Contact Repair"
Cohesion: 0.11
Nodes (16): HERE, html, { phoneDigits, phoneLabel }, 덮는다, 머리말썩음, 명단, 못찾음, 쓴다 (+8 more)

### Community 32 - "Figure Editor Plan & Labels"
Cohesion: 0.11
Nodes (13): 그림 편집기 계획 — 장면을 SVG 로 그린 «뒤» 이름표를 옮긴다, 그림 글꼴을 기기 글꼴이 아니라 Noto Serif(KR) 로 — 원인을 없앤다, AI 에게 «겹치니 다시 놓아라»고 안 시킨다, SVG 편집기를 만들지 않는다 — 자리 잡기 편집기만, 장면 핀 (scene.pins) — 이름표 자리만 담는다, viewBox 560×430 은 약속이다, Figure (figure.js 장면 렌더 객체), labelBoxes() (+5 more)

### Community 33 - "Video Controls & Zoom"
Cohesion: 0.12
Nodes (16): vcBindBar, vcMute, vcNextRate, vcPaint, vcToggle, videoControlsHTML (영상 조작줄), vzBindVeil (판 핀치·휠 확대), vzReset (+8 more)

### Community 34 - "Cache-bust & Item Figures"
Cohesion: 0.11
Nodes (13): ref_crypto, NL, ROOT, 문서들, H, html, ROOT, 교재폴더 (+5 more)

### Community 35 - "Class Session · Log · Login Design"
Cohesion: 0.15
Nodes (18): CLAUDE.md, 02 수업 진행 (Class), STATE — 출결 입력 상태 맵, 단계형 워크플로 (지난 수업 확인 → 출결 → 진도 → 과제 → 메모), 단원 체크리스트 — 목록 idiom, 14 수업 기록 (Class Log), ds.css 이름 충돌 (.body), 한 행 = 한 회차 (06과 같은 목록 idiom) (+10 more)

### Community 36 - "Design Principles · Student Detail · Signals"
Cohesion: 0.14
Nodes (18): A3 「학생 도시에」 기준 언어, 무엇을 버렸는가, 주요(올리브) 버튼은 화면당 하나, 화면의 역할 먼저 정의, 같은 곳으로 가는 문은 하나, VIEWS — 저장된 뷰, 03 학생 상세 (Student), 우측 컨텍스트 (연락처·반·빠른 작업·고정 메모) (+10 more)

### Community 37 - "Figure Edit Actions"
Cohesion: 0.14
Nodes (18): 첫 손길에 모든 이름표를 핀한다, 이름표 글자 고치기 — 1판에 넣었다 (추가·삭제 없음), setHidden(), figDownload (SVG/PNG 내려받기), figEditAddLabel, figEditAddSeg (선 더하기), figEditDash (실선↔점선), figEditHide (+10 more)

### Community 38 - "Date Utils · Student Home · Plans"
Cohesion: 0.15
Nodes (18): curSeasonKey, dateShift, dqEnsureToday (학생 화면 그리며 저장), index.html emptyRecord — 빈 기록의 모양 한 곳, ensureHtml2CanvasLoaded, planClassCanvas (반별 일정표 그림 굽기), planClassTableHTML, planPostOpen (일정표 공지 판) (+10 more)

### Community 39 - "Similarity Analysis (work2)"
Cohesion: 0.14
Nodes (12): all, bookLen, FINE, pairs, slim, typeCountOf, canonFromContent(), OVERRIDE (+4 more)

### Community 40 - "Similarity Analysis (work)"
Cohesion: 0.14
Nodes (12): all, bookLen, FINE, pairs, slim, typeCountOf, canonFromContent(), OVERRIDE (+4 more)

### Community 41 - "Review Pool (work)"
Cohesion: 0.12
Nodes (16): DROP, POOL_EXCLUDE, A(), byType, db, del, delById, keep (+8 more)

### Community 42 - "Finalize v2 (work)"
Cohesion: 0.14
Nodes (13): BOOKS, byType(), db, FIX, JUDGE, keep, s1, s2 (+5 more)

### Community 43 - "Autofill & Old Safari Tests"
Cohesion: 0.12
Nodes (12): ref_node_vm, BLOCK, html, ROOT, 본문(), 가르기(), 볼것, 뿌리 (+4 more)

### Community 44 - "Game Duck Gap Test"
Cohesion: 0.13
Nodes (14): ref_node_zlib, ROOT, RUN, SEQ, sheet, SRC, 머리끝(), 뽑기() (+6 more)

### Community 45 - "HWPX Push"
Cohesion: 0.11
Nodes (14): H, html, NL, { problems, watermarkedCount, watermarked }, R, ROOT, SRC, W (+6 more)

### Community 46 - "Book Covers & Mockups"
Cohesion: 0.24
Nodes (17): 캐릭터.png — 파란 티셔츠 소년 캐릭터 스프라이트 시트 (달리기·점프·넘어짐 17컷), mockupea_export.png — 주기나 기출변형 목업 (Mockupea 내보내기, (1)과 동일 구도), mockupea_export4.png — N딩 크레딧 목업 (Mockupea 내보내기), mockupea_export (1).png — 주기나 기출변형 목업 (Mockupea 내보내기, 넓은 흰 배경), mockupea_export (3).png — 개념서 목업 (Mockupea 내보내기, 비스듬한 각도), 김하현수학연구소 (KIM HA HYUN MATH) 브랜드 로고, 엔딩크레딧 (N딩 크레딧) 시리즈 — 공통수학 1, 개념서 시리즈 (+9 more)

### Community 47 - "Brand Colors · Runner Game · SPA"
Cohesion: 0.15
Nodes (17): 브랜드 와인색을 UI 강조색으로 쓰지 않는다, 출석 도장 — 학생 홈의 «똥피하기» 하루 한 판, 디자인 시스템 ds.css — 로고 차콜 #3F3537 주조, 다크 vs 라이트 — 라이트 유지로 확정, 달리기 게임 (3레인 러너) — 손으로 해 보고 여덟 판을 고쳤다, game-core.js?v=날짜 — 캐시 깨기 (두 파일 다 올린다), game-core.js Game.mount — 게임 엔진 (MODE_RUNNER · MODE_DODGE), game.html done — 끝난 뒤 다시 하기 / 모드 바꾸기 (+9 more)

### Community 48 - "Roster · Classes · Videos Design"
Cohesion: 0.21
Nodes (16): 01 명단 (Roster), 고밀도 표 · 40px 고정 행, 06 반 관리 · 진도 (Classes), UNITS — 미적분Ⅰ 단원 순서, attDots(o,l,lv,n), sessRow(s), 16 영상 (Videos), 이탈 지점이 존재 이유 (+8 more)

### Community 49 - "Homework & Figure Probes"
Cohesion: 0.12
Nodes (12): ref_node_fs, ref_node_path, H, html, 과제들, 뿌리, 이름들, cards (+4 more)

### Community 50 - "Answer Key Parser"
Cohesion: 0.18
Nodes (13): buildAnswerKey(), circleOf(), codesInOrder(), flattenKey(), parseAnswerKey(), ROOT, 교재폴더, 규칙 (+5 more)

### Community 51 - "Figure Undo Test"
Cohesion: 0.13
Nodes (12): E, html, NL, ROOT, 뜨기(), 여럿, 열기(), 이름들 (+4 more)

### Community 52 - "Similar Items Tool"
Cohesion: 0.12
Nodes (12): html, items, NL2, ROOT, 묶음, 보기수, 뼈, 뼈대() (+4 more)

### Community 53 - "figure.js Segment Ops"
Cohesion: 0.21
Nodes (12): canDash(), dashTarget(), dataOf(), elements(), fmt(), mapper(), nearEdges(), segCross() (+4 more)

### Community 54 - "Problem Set Compression (v1)"
Cohesion: 0.16
Nodes (16): 삭제 목록 — 249제 (1차 · 같은 문제인가), 삭제 사유에 대체 문항을 명시하는 원칙, 유지 목록 — 120제 (SCENE1 41 · SCENE2 63 · SCENE3 16), 2차 압축 삭제 목록 — 98제 (옛 v1), 2차 기준 — 이 문제를 추가로 풀 필요가 있는가, 2차 삭제 — 교육적 압축 98제, 출처 지도 — 최종 문항별 원출처·유사문항, 유형 묶음 — 2제 이상 52묶음 (G001~G052) (+8 more)

### Community 55 - "Audit & Decor (work2)"
Cohesion: 0.14
Nodes (13): bad, blocks, DECOR, keep, marks, order, R, s1 (+5 more)

### Community 56 - "Review Pool (work2)"
Cohesion: 0.13
Nodes (15): project2_work2_tools_decisions6_pool_exclude, A(), byType, db, del, delById, keep, keptIds (+7 more)

### Community 57 - "Report (work2)"
Cohesion: 0.12
Nodes (11): BOOKS, cl, db, del, del2, keep, rev, s1 (+3 more)

### Community 58 - "Audit & Decor (work)"
Cohesion: 0.14
Nodes (13): bad, blocks, DECOR, keep, marks, order, R, s1 (+5 more)

### Community 59 - "Report (work)"
Cohesion: 0.12
Nodes (11): BOOKS, cl, db, del, del2, keep, rev, s1 (+3 more)

### Community 60 - "Groq Pool Test"
Cohesion: 0.13
Nodes (12): api, envWith(), GROQ_TWIN_COST, html, NL, REVIEW_DAILY_LIMIT, ROOT, src (+4 more)

### Community 61 - "Firestore Concepts"
Cohesion: 0.15
Nodes (15): Firestore 데이터 구조 — 컬렉션 + kv/ 문서, Firestore 를 SDK 가 아닌 REST + fetch 로 직접 호출, index.html dbGetDoc — Firestore REST 읽기, index.html deleteExam — 시험지와 거기서 나온 것 넷을 함께 턴다, ensureAttDraft, goSessionStep (수업 단계 옮김 · 저절로 저장), loadAllRecordsIfNeeded, index.html loadRecord — kv/record 읽기 (+7 more)

### Community 62 - "fs"
Cohesion: 0.13
Nodes (5): r, H, t0, 걸린, 재볼까

### Community 63 - "contentCells"
Cohesion: 0.18
Nodes (15): contentCells(), dropFrameParagraph(), esc(), fillFrame(), foldBogi(), hasContent(), pickFrame(), problemBlock() (+7 more)

### Community 64 - "audit"
Cohesion: 0.15
Nodes (15): audit.mjs — 원본과 문항별 대조, build.mjs — hwpx 본문 생성, check-answers.mjs — 정답·해설 대조, decisions.mjs~decisions6.mjs — 옛 판정 (TYPE_FIX만 쓰임), decor.mjs — 쪽 장식 판정 (빌더·검사기 공유 규칙), 미주 채우는 순서 — 본문 먼저, 미주 나중, finalize2.mjs — SCENE 배정·산출물, 검사 4종 — 고칠 때마다 다 돌릴 것 (+7 more)

### Community 65 - "item-code-stamp"
Cohesion: 0.13
Nodes (13): argv, bare, bi, ci, codes, files, mapping, mine (+5 more)

### Community 66 - "주기나 Mock Exam PDF"
Cohesion: 0.16
Nodes (14): [2026][주기나][1-1][1.다항식의연산] — 공통수학1 1단원 모의고사 기출 문항 샘플 (045~048), 모의고사 출처 표기 (예: 2012년 9월 28번), [2026][개념서] 앞표지 (A4 이미지 PDF), 개념서 시리즈 (2026), [2026][엔딩크레딧][1-1][표지] (펼침 표지 벡터 PDF), 엔딩크레딧 시리즈 (4권 압축 교재 · 1-1 = 고1 1학기), [2026][주기나][1-1][표지] (펼침 표지 벡터 PDF), 주기나 시리즈 (모의고사 기출 교재 · 1-1) (+6 more)

### Community 67 - "셸을 지나면 백슬래시가 깎인다"
Cohesion: 0.14
Nodes (14): 셸을 지나면 백슬래시가 깎인다, 다시 밟지 말 것 — 함정 목록, 검사 통과를 «봤다»로 읽지 말 것 — 배포본에서 눈으로, 로그아웃이 흉내만 냈다 — 판단하는 자리를 옮기면 지우는 자리도 같이, 숨긴 것이 복사되면 조용히 따라간다 — 보이는 것이 스스로 고쳐진다, 코드를 개체 설명문(shapeComment)에 숨겼다 — 미주가 이긴다, 기록 — 2026년 8월 (08-31 이전), 화면을 옮기면 «빌려 쓰던 서식»이 끊긴다 (+6 more)

### Community 68 - "전체 재렌더링"
Cohesion: 0.15
Nodes (12): 전체 재렌더링 — render() 가 #app 을 innerHTML 로 통째로 다시 그린다, 입력칸은 한글로 쳐 본다 — 조합 중 render() 0회, tools/ 개발 도구 모음 (검사·프로브·서버), 끌 때 render() 를 안 부른다 — pointerup 에 한 번, index.html isMultipleChoice / answerInputHTML — 답안칸 종류, index.html normalizeTwinAnswer — $155$ 의 $ 를 벗긴다, NL, ROOT (+4 more)

### Community 69 - "출석률 정의"
Cohesion: 0.16
Nodes (14): 출석률 정의 — 「퇴원」을 뺀 기록 중 「결석」이 아닌 비율, 홈 대시보드를 지웠다 — 담고 있던 것은 제 자리로, kv/signal-mutes — 신호 «해제» {학생id: 날짜까지}, 같은 곳으로 가는 문은 하나만 — 진입점 통합, sticky 헤더와 가로 스크롤은 같이 못 쓴다, index.html rosterModel — 명단 데이터, index.html rosterSignal, index.html rosterStats — 명단 열 계산 (신호·진도·출석률·과제·오답·시청률) (+6 more)

### Community 70 - "Character Sprites & Stamp"
Cohesion: 0.15
Nodes (13): game-char.webp (따낸 캐릭터 스프라이트), CHAR_IMG, Game, MODE_DODGE, MODE_RUNNER, RUN_IMG, RUN_SEQ, clip=main — 상자가 가장 큰 조각 밖을 지운다 (+5 more)

### Community 71 - "addVideo"
Cohesion: 0.18
Nodes (14): addVideo, index.html applyTwinToBank — 다시 생성하면 붙여 뒀던 그림을 버린다, index.html attDateDrawerHTML — 출결을 «넣는» 날짜 드로어, index.html chubAttendanceHTML — 반 관리 출결 격자, chubMaterialHTML (반 관리 자료 폼), chubVideoHTML (반 관리 영상 폼), dbSet, index.html teacherClassHubHTML — 반 관리 (진도·수업 기록·퀴즈·영상 · 조교도 이것을 쓴다) (+6 more)

### Community 72 - "ref_module"
Cohesion: 0.15
Nodes (12): ref_module, H, html, { hwpxRepairEqText }, katex, ROOT, 고칠까, 문항 (+4 more)

### Community 73 - "att-names-test"
Cohesion: 0.16
Nodes (12): ATT_STATUSES, escHtml(), html, lift(), NL, ROOT, SESSION_SEG, 명단 (+4 more)

### Community 74 - "backup"
Cohesion: 0.14
Nodes (10): H, html, kv, kv키, ROOT, students, 기록, 요약 (+2 more)

### Community 75 - "review-ui-test"
Cohesion: 0.14
Nodes (12): { REVIEW_VERDICT }, ROOT, tagFn, web, wrk, 몸통, 배지, 보냄 (+4 more)

### Community 76 - "Class Concepts"
Cohesion: 0.17
Nodes (13): 클래스 이름 충돌 — 같은 사고를 여섯 번 냈다, 좌표평면 위의 함수 그래프면 무조건 (B) — 그 밖은 C→A→B, 기록 — 리디자인 이식 (2026-08-06 ~ 08-09 · 0-B), kv/classnote:{반id} — 수업 메모 {날짜: 글}, 그림 문항 갈래 (A) figureFree · (B) needsFigure · (C) reuseFigure, hwpx 파싱 — 양쪽으로 다 읽어 미주 수와 맞는 쪽을 고른다, 이행 발판 — 두 CSS 공존 장치 (body.legacy · lg- 접두사 · MIGRATED_VIEWS · TEACHER_TABS_DS), index.html addHomework(prefix) — 과제 폼 두 화면 공유 (+5 more)

### Community 77 - "Design Concepts"
Cohesion: 0.23
Nodes (13): 디자인 시스템 v1 문서, 출결 5상태 (출석·지각·조퇴·결석·퇴원), C1 (기본 팔레트 스와치 데이터), C2 (출결 5상태 스와치 데이터), 인라인 SVG 아이콘 한 벌 (24×24, stroke 1.6, currentColor), 색 — 웜 페이퍼 · 로고 차콜 주조, 출결 4상태 세그먼트 (퇴원 제외), preview — 관리자 화면 v1 목록 (+5 more)

### Community 78 - "check-answers"
Cohesion: 0.17
Nodes (8): blocks, diff, fromParas(), fromRuns(), marks, order, R, x

### Community 79 - "check-answers"
Cohesion: 0.17
Nodes (8): blocks, diff, fromParas(), fromRuns(), marks, order, R, x

### Community 80 - "exam-type-test"
Cohesion: 0.17
Nodes (11): { findBankEntry }, html, { hwpxExamKeyFromText, hwpxLooksExamKey }, key, lift(), NL, NLL, { qLabelOf } (+3 more)

### Community 81 - "myplan-ime-probe"
Cohesion: 0.15
Nodes (7): html, 뿌리, 옛_망가진기기, 옛_제대로, 짐, 짓기, 화면

### Community 82 - "reset-test-data"
Cohesion: 0.17
Nodes (12): H, html, m, ROOT, 백업소스, 살릴kv, 살릴컬렉션, 이름들() (+4 more)

### Community 83 - "source-store-test"
Cohesion: 0.15
Nodes (8): byCode, F, HTML, NL, R, 기출만, 다, 짐

### Community 84 - "student-calendar-test"
Cohesion: 0.15
Nodes (5): html, ROOT, 갈래표, 결과, 조각

### Community 85 - "Fonts & Figures"
Cohesion: 0.20
Nodes (12): Noto Serif KR은 대상의 이름에만, 13 설정 (Settings), AI 쌍둥이 문항 한도 (20건/일 · 유사도 하한 0.85 · 자동 배포 끔), 조교 계정 · 권한, LOGS — 감사 로그, 토글마다 설명, 학생 폼이 곧 화면 — 문 셋을 동등하게 두지 않음, 18 조교 (2 screens) (+4 more)

### Community 86 - "문항 코드를 교재에 심기"
Cohesion: 0.23
Nodes (12): 문항 코드를 교재에 심기 — 해마다 고쳐 올려도 창고가 안 어긋나게, 지문(해시 8자리)판 — 지었다 접었다, 코드 없는 문항이 하나라도 있으면 안 올린다 — 유일한 잠금, 창고 본문과 대조한다 — 지문(해시)은 안 박는다, 창고에 쓰는 문이 셋 — items-push · 웹 icFill · 시험지 등록, 판정표 여덟 갈래 — 파일 하나 × 창고 (복사됨·그대로·고쳤다·모르는 코드·코드 잃음·새 문항·겹침·빠짐), hwpItemFpText(), hwpItemVerdicts() (+4 more)

### Community 87 - "build"
Cohesion: 0.27
Nodes (11): build(), inkBox(), lab(), textBox(), clamp(), cleanPins(), esc(), n() (+3 more)

### Community 88 - "Four Source Books"
Cohesion: 0.30
Nodes (12): 4권 압축 분석 보고서 (집합) — 옛 판정 470→120, 1차 삭제 — 중복 제거 249제, 검토(REVIEW) 목록 — 0제, 절대등급 공통수학2 · 4.집합 (원문 텍스트, 83제, 문항 ID D-), ⟪ANS:n⟫ 문항 구분 표식, 고쟁이 공통수학2 · 5.집합 (원문 텍스트, 106제, 문항 ID A-), 올림포스 유형편 공통수학2 · 4.집합 (원문 텍스트, 110제, 문항 ID B-), 유형반복R 공통수학2 · 집합 (원문 텍스트, 171제, 문항 ID C-) (+4 more)

### Community 89 - "Problem Types (T09…)"
Cohesion: 0.24
Nodes (12): T09 부분집합의 개수, T10 조건이 있는 부분집합의 개수, T11 부분집합의 원소의 합·곱, T15 벤다이어그램, T16 집합의 연산 법칙 (드모르간 포함), T18 새로 약속된 연산, T19 배수·약수의 집합, T21 원소의 개수 공식 (+4 more)

### Community 90 - "ref_node_url"
Cohesion: 0.18
Nodes (8): ref_node_url, NL, ROOT, end, HERE, src, start, t()

### Community 91 - "hwpx-node"
Cohesion: 0.21
Nodes (11): collect(), ENT, HERE, makeElement(), parseXml(), picKeyMap(), ROOT, RULE_NAMES (+3 more)

### Community 92 - "teacher-doc"
Cohesion: 0.18
Nodes (11): H, html, ROOT, uid, 값, 들어갔나, 막혔다고말한다(), 목록 (+3 more)

### Community 93 - "video-dup-repair"
Cohesion: 0.17
Nodes (5): GO, videos, 겹친것, 계획, 묶음

### Community 94 - "video-notice-probe"
Cohesion: 0.17
Nodes (6): html, N, 백틱, 뿌리, 이름들, 짓기

### Community 95 - "parseExpr"
Cohesion: 0.38
Nodes (9): parseExpr(), atom(), eat(), expr(), peek(), power(), term(), unary() (+1 more)

### Community 96 - "Review Test Pool"
Cohesion: 0.25
Nodes (11): 복습테스트 풀 — 같은 학습 요소를 묻되 문제는 다른 뺀 문항, 복습테스트 문항 풀 — SCENE 1 (46문항), 복습테스트 문항 풀 — SCENE 2 (159문항), 복습테스트 문항 풀 — SCENE 3 (69문항), 대표 문항 ↔ 유사 문항 매핑, 아직 손 안 댄 것 — 보기틀·문단번호 재매김·복습 후보 없는 185문항·그림 크기·쪽 나눔, review-pool.mjs — 복습테스트 문항 풀 (집합만), SCENE1 기본유형 (+3 more)

### Community 97 - "dq-face-test"
Cohesion: 0.18
Nodes (7): { dqPickFace }, html, N만, ROOT, 검사, 넉넉, 원본만

### Community 98 - "eq-test"
Cohesion: 0.18
Nodes (5): B, { convertHwpEq, hwpxBalanceLeftRight }, html, { problemHTML }, ROOT

### Community 99 - "game-hit-test"
Cohesion: 0.24
Nodes (7): FIX, ROOT, SRC, 놓기(), 돌리기(), 지나간뒤옮기기(), 판()

### Community 100 - "items-cache-test"
Cohesion: 0.18
Nodes (5): BLOCK, html, makeWorld(), ROOT, 본문564

### Community 101 - "room-plan-test"
Cohesion: 0.18
Nodes (5): html, NL, ROOT, 요일, 요일글

### Community 102 - "Book Set Mockup"
Cohesion: 0.29
Nodes (10): 책목업.png — 교재 2권 입체 목업 (책상 위 렌더), book-set.jpg — 교재 3권 표지 세트 (평면 목업), 김하현수학연구소 로고 (KIM HA HYUN MATH, 무한 곡선 심볼), 주문하신 기출변형 나왔습니다 (공통수학1 교재 표지), N딩 크레딧 (공통수학1 교재 표지), 빨간 자음 표지 (김하현수학연구소 로고 교재), profile.jpg — 강사 프로필 사진 (빨간 배경), 강사 프로필 사진 (검정 자켓·흰 티, 정면 반신) (+2 more)

### Community 103 - "addLabel"
Cohesion: 0.29
Nodes (10): addLabel(), autoWindow(), compileCurves(), dist(), hasShapes(), pointY(), polyArea(), snapLines() (+2 more)

### Community 104 - "validate"
Cohesion: 0.20
Nodes (8): blocks, files, hpf, missing, nofile, refs, s2, srcs

### Community 105 - "AUTONUM"
Cohesion: 0.27
Nodes (10): AUTONUM(), bodyParas(), boxed(), eqXml(), imgXml(), noteParas(), para(), replaceParaAt() (+2 more)

### Community 106 - "validate"
Cohesion: 0.20
Nodes (8): blocks, files, hpf, missing, nofile, refs, s2, srcs

### Community 107 - "ref_node_child_process"
Cohesion: 0.20
Nodes (6): ref_node_child_process, HERE, ROOT, 검사들, 미뤄둔파일, 점검들

### Community 108 - "cal-dots-test"
Cohesion: 0.20
Nodes (5): ds, F, html, NL, ROOT

### Community 109 - "exam-plan-test"
Cohesion: 0.27
Nodes (7): html, lift(), NL, ROOT, 떠오기(), 만들기(), 뼈대()

### Community 110 - "fb-login"
Cohesion: 0.29
Nodes (9): firebaseConfig(), HERE, ROOT, 강사로로그인(), 계정(), 안내, 앱이아는것(), 이메일로() (+1 more)

### Community 111 - "game-plays-test"
Cohesion: 0.20
Nodes (5): G, html, NL, ROOT, 표

### Community 112 - "item-bodies"
Cohesion: 0.33
Nodes (9): emitBodies(), firebaseConfig(), HERE, pushBodies(), putDoc(), ROOT, signInAnonymously(), stamp() (+1 more)

### Community 113 - "items-repair"
Cohesion: 0.20
Nodes (8): H, html, { hwpxRepairEqText }, ROOT, 쓸것, 쓸까, 있던것, 절반

### Community 114 - "pending-variant-test"
Cohesion: 0.20
Nodes (7): api, dq, html, hw, ROOT, state, 창고

### Community 115 - "rank-submit-test"
Cohesion: 0.20
Nodes (5): db, html, __ls, ROOT, 쓴것

### Community 116 - "report-move-test"
Cohesion: 0.22
Nodes (7): html, lift(), NL, ROOT, rules, 닫기판(), 잣대

### Community 117 - "student-dup-repair"
Cohesion: 0.20
Nodes (6): contacts, GO, records, 겹친것, 계획, 묶음

### Community 118 - "student-key-test"
Cohesion: 0.20
Nodes (7): api, html, lines, NL, ROOT, 곁, 저장된

### Community 119 - "student-skin-test"
Cohesion: 0.20
Nodes (4): ds, html, NL, ROOT

### Community 120 - "ta-account-test"
Cohesion: 0.22
Nodes (6): html, lift(), NL, ROOT, 판(), 곁

### Community 121 - "upload-together-test"
Cohesion: 0.20
Nodes (5): html, { icKeyLooksRowMajor }, ROOT, 소스, 쓰는쪽

### Community 122 - "variant-edit-test"
Cohesion: 0.20
Nodes (7): ds, html, NL, ROOT, 저장, 창, 폭

### Community 123 - "video-segment-probe"
Cohesion: 0.20
Nodes (5): html, V, 뿌리, 이름들, 짓기

### Community 124 - "Public Landing"
Cohesion: 0.22
Nodes (9): 공개 홈 랜딩 (.lp), 목업 바탕은 --paper 단색 (그라디언트 금지), make-book-mockup (교재 목업 배치 페이지), 랜딩 척추(.l-spine) x좌표 정렬 검사, measure-landing (랜딩 DOM 기하 측정), tools/mock-ending.png (엔딩크레딧 목업), tools/mock-gaenyeom.png (개념서 목업), tools/mock-jugina.png (주기나 기출변형 목업) (+1 more)

### Community 125 - "cluster"
Cohesion: 0.22
Nodes (8): by, clusters, db, find(), groups, pairs, parent, sizes

### Community 126 - "extract-parts"
Cohesion: 0.25
Nodes (8): block(), enI, eq, eqI, picI, s, tbls, tblStarts

### Community 127 - "cluster"
Cohesion: 0.22
Nodes (8): by, clusters, db, find(), groups, pairs, parent, sizes

### Community 128 - "extract-parts"
Cohesion: 0.25
Nodes (8): block(), enI, eq, eqI, picI, s, tbls, tblStarts

### Community 129 - "v2-t11-basics"
Cohesion: 0.22
Nodes (6): V2_T01, V2_T02, V2_T03, V2_T05, V2_T06, V2_T11

### Community 130 - "att-save-test"
Cohesion: 0.28
Nodes (7): html, lift(), NL, ROOT, 이름들, 자동판(), 판()

### Community 131 - "backup-diff"
Cohesion: 0.25
Nodes (6): ha, hb, 센다(), [옛, 새], 이름, 합()

### Community 132 - "bench-grade-test"
Cohesion: 0.22
Nodes (8): BS, ROOT, src, 값검사, 것들, { 맞나, 값꼴, 보기들 }, 보, 조각

### Community 133 - "book-request-test"
Cohesion: 0.22
Nodes (4): html, NL, ROOT, 장부

### Community 134 - "coll-cache-test"
Cohesion: 0.28
Nodes (6): html, lift(), liftConst(), NL, ROOT, 판()

### Community 135 - "figure-axis-test"
Cohesion: 0.22
Nodes (6): NL, out, paths, r, scene, 이름표

### Community 136 - "figure-preview"
Cohesion: 0.22
Nodes (5): BUILTIN, cards, HERE, outPath, ROOT

### Community 137 - "ic-fill-gate-test"
Cohesion: 0.22
Nodes (5): html, ROOT, rules, state, 판

### Community 138 - "item-answers-test"
Cohesion: 0.28
Nodes (7): html, { itemAnswerToKeep }, lift(), makeWorld(), ROOT, 넣기(), 파일()

### Community 139 - "items-wipe"
Cohesion: 0.22
Nodes (7): H, html, 가리킴, 쓸까, 인자, 지울문항, 지울변형

### Community 140 - "multi-send-test"
Cohesion: 0.28
Nodes (7): html, lift(), NL, ROOT, 영상판(), 자료판(), 파일

### Community 141 - "next-visit-test"
Cohesion: 0.22
Nodes (3): html, NL, ROOT

### Community 142 - "plan-export-test"
Cohesion: 0.28
Nodes (6): html, lift(), liftConst(), NL, ROOT, 판()

### Community 143 - "qna-answers-probe"
Cohesion: 0.22
Nodes (5): H, html, 뿌리, 이름들, 짓기

### Community 144 - "qna-followup-test"
Cohesion: 0.25
Nodes (6): html, lift(), NL, ROOT, rules, 판()

### Community 145 - "record-guard-test"
Cohesion: 0.25
Nodes (5): html, lift(), makeWorld(), ROOT, w0

### Community 146 - "review-key-test"
Cohesion: 0.25
Nodes (7): autos, bank, F(), html, lift(), NL2, ROOT

### Community 147 - "study-tab-test"
Cohesion: 0.22
Nodes (4): html, N, NL, ROOT

### Community 148 - "twin-layout-test"
Cohesion: 0.22
Nodes (7): BS, html, NL, { normalizeTwinBlanks, variantLayoutProblem }, ROOT, wrk, 조각

### Community 149 - "who-col-test"
Cohesion: 0.22
Nodes (4): CSS, html, NL, ROOT

### Community 150 - "Firebase"
Cohesion: 0.25
Nodes (8): Firebase Auth compat SDK v10.12.2, 열쇠를 옮기면 «쓰는 자리»를 글자로 전부 세고 검사를 남긴다, 학번 → 가짜 이메일 <학번>@students.hahyunmath.invalid, Firebase Auth 이메일/비밀번호 — 비밀번호가 Firestore 를 떠난다, 계정 만들기는 두 번째 Firebase 앱 인스턴스로, 문서 id 는 Auth uid (학번이 아니라), index.html authSignIn — Firebase Auth 로그인 (student/teacher/assistant), index.html studentKeyOfSid — 학번 → 문서 열쇠(uid)

### Community 151 - "addSegment"
Cohesion: 0.32
Nodes (8): addSegment(), inkLine(), mathRuns(), classify(), emit(), push(), overlaps(), tokenize()

### Community 152 - "convertHwpEq"
Cohesion: 0.36
Nodes (8): convertHwpEq(), convertOverToFrac(), findMatchingBrace(), fixBareSqrt(), hwpxBalanceBraces(), hwpxBalanceLeftRight(), hwpxRepairEqText(), replaceBalancedKeyword()

### Community 153 - "answer-match-test"
Cohesion: 0.29
Nodes (5): html, itemByCode, lift(), makeWorld(), ROOT

### Community 154 - "auditlog-recent-test"
Cohesion: 0.29
Nodes (4): html, lift(), makeWorld(), ROOT

### Community 155 - "auth-bridge-test"
Cohesion: 0.25
Nodes (6): { authIdOk, authIdWhyBad, authEmailOf, authWhoOf }, html, ROOT, 끝, 조각, 처음

### Community 156 - "autofill-stop-test"
Cohesion: 0.25
Nodes (5): html, NL, ROOT, 고리, 문

### Community 157 - "body-render-test"
Cohesion: 0.25
Nodes (6): html, lines, NL, ROOT, 창고, 칸

### Community 158 - "class-edit-test"
Cohesion: 0.29
Nodes (5): html, lift(), NL, ROOT, 판()

### Community 159 - "class-prog-test"
Cohesion: 0.29
Nodes (6): html, lift(), NL, ROOT, 이름들, 판()

### Community 160 - "figure-branches"
Cohesion: 0.32
Nodes (5): pb줄, 그림원본, 날짜맞나(), 변형전부, 변형줄

### Community 161 - "grade-one-test"
Cohesion: 0.25
Nodes (4): G, html, NL, ROOT

### Community 162 - "read-cost"
Cohesion: 0.25
Nodes (6): FH, html, ROOT, 낱건, 컬렉션, 큰것

### Community 163 - "student-bulk-delete-test"
Cohesion: 0.29
Nodes (6): html, lift(), NL, ROOT, 이름들, 판()

### Community 164 - "video-watch-test"
Cohesion: 0.25
Nodes (4): html, NL, ROOT, V

### Community 165 - "읽기는 «누가 들어온 뒤에»"
Cohesion: 0.29
Nodes (7): 읽기는 «누가 들어온 뒤에» — dbReadClear, 학생은 제 것만 읽는다 — students 제 문서 하나 · contacts/auditlog 안 읽음 · clinics/qnas uid 로 거름, 창고가 둘이고 일부러다 — 원본은 codes/*.json 파일, 변형은 Firestore variants, index.html dbReadClear — 사람이 바뀔 때 못 읽음 표시를 지운다, index.html loadAllData — 컬렉션 일괄 읽기 (역할별 갈래), index.html loadCollectionCached — 큰 컬렉션 캐시 읽기, index.html loadItemStoreIfNeeded — 창고를 쓰는 화면에서만 받는다

### Community 166 - "이미 코드가 있는 문항은 코드가 진실이고, 코드 없는 문항에만 번호를 준"
Cohesion: 0.29
Nodes (7): 이미 코드가 있는 문항은 코드가 진실이고, 코드 없는 문항에만 번호를 준다, codes/K2-E.json 장부 — 코드의 «진실», 문항 코드 (예: K2-01-E-0001) — «누구인가», 일련번호는 (과목·책) 통으로 세고 단원을 가로지른다, hwpEndnoteParts(), hwpEndnoteText(), index.html icClassify — 코드가 아니라 미주로 문항을 가른다

### Community 167 - "Brand Logo"
Cohesion: 0.67
Nodes (7): 김하현수학연구소 브랜드 아이덴티티 — 필기체 흐름의 무한대/파도형 심볼(다크 브라운→와인레드 그라데이션, 붉은 점), 워드마크 김하현(적색)+수학연구소(회색), 영문 KIM HA HYUN MATH, 로고 가로형(1) — 풀컬러 (그라데이션 심볼 + 붉은 김하현 + 회색 수학연구소, KIM HA HYUN MATH), 로고 가로형(2) — 흰색(리버스) 버전으로 추정, 흰 배경에서 보이지 않음, 로고 가로형(3) — 단색 검정 버전, 로고 세로형(1) — 풀컬러, 심볼 위 / 워드마크 아래 (붉은 김하현 + 회색 수학연구소, KIM HA HYUN MATH), 로고 세로형(2) — 흰색(리버스) 버전으로 추정, 흰 배경에서 보이지 않음, 로고 세로형(3) — 단색 검정 버전

### Community 168 - "v2-t01-t04"
Cohesion: 0.29
Nodes (4): V2_T01, V2_T02, V2_T03, V2_T04

### Community 169 - "v2-t05-t08"
Cohesion: 0.29
Nodes (4): V2_T05, V2_T06, V2_T07, V2_T08

### Community 170 - "v2-t10-t15"
Cohesion: 0.29
Nodes (4): V2_T10, V2_T11, V2_T14, V2_T15

### Community 171 - "v2-t18-t08-t04-t07"
Cohesion: 0.29
Nodes (4): V2_T04, V2_T07, V2_T08, V2_T18

### Community 172 - "v2-t23-t14-t20-t13"
Cohesion: 0.29
Nodes (4): V2_T13, V2_T14, V2_T20, V2_T23

### Community 173 - "ref_http"
Cohesion: 0.29
Nodes (6): ref_http, fs, http, MIME, path, ROOT

### Community 174 - "admin-check-test"
Cohesion: 0.33
Nodes (5): html, lift(), NL, ROOT, 그리기()

### Community 175 - "exam-rows-test"
Cohesion: 0.29
Nodes (4): html, ROOT, 끝, 처음

### Community 176 - "phone-test"
Cohesion: 0.29
Nodes (4): html, NL, P, ROOT

### Community 177 - "season-start-test"
Cohesion: 0.38
Nodes (5): html, ROOT, 떠내기(), 세상(), 열쇠()

### Community 178 - "Daily Quiz"
Cohesion: 0.33
Nodes (6): 데일리퀴즈 — 학생별 오답 간격 반복 (DQ_PER_DAY=3 · DQ_STEPS=[3,7,14]), 시험 시즌과 범위 — kv/season · SEASON_SPLIT · kv/exam-ranges[학교][학년][과목], KaTeX 함정 — 자르는 상자도 position:relative 여야 한다, index.html dqAnswerable — 학생이 칠 수 있는 정답인가, index.html dqRoll — 복습 카드 뽑기·간격 진행, index.html guessChapter — 문항 단원 초안 (낱말 대조)

### Community 179 - "빈 결과 상태"
Cohesion: 0.60
Nodes (6): 빈 결과 상태 (「지금 조건에 맞는 학생이 없습니다」 + 조건 지우기), 시안/명단-새것.png — 학생 명단 UI (새것), 시안/명단-기존.png — 학생 명단 UI (기존), 새것 시안 변경점: 빈 상태 중앙 배치·학부모 번호 전체 표시·숫자 열 구분선, 신호 배지 (위험·주의) + D-12 시험 카운트다운, 학생 명단 표 (신호·반 진도·성적 추이·출결 8회·출석률·과제·오답·시청률·학부모)

### Community 180 - "openPhoto"
Cohesion: 0.40
Nodes (6): openPhoto (.hw-view 사진 확대), splitQnaFollowups, submitFollowup (추가 질문), teacherQnaHTML (강사 질의응답), qna-followup-probe (질의응답 추가 질문 프로브), qna-zoom-probe (질의응답 사진 확대 프로브)

### Community 181 - "rich"
Cohesion: 0.73
Nodes (5): BOOKDIR, paraRuns(), richBook(), runsOf(), slice()

### Community 182 - "rich"
Cohesion: 0.73
Nodes (5): BOOKDIR, paraRuns(), richBook(), runsOf(), slice()

### Community 183 - "skeleton"
Cohesion: 0.33
Nodes (5): h, KEEP, out, s, st

### Community 184 - "v2-t21-t16-t09"
Cohesion: 0.33
Nodes (3): V2_T09, V2_T16, V2_T21

### Community 185 - "hw-session-test"
Cohesion: 0.33
Nodes (3): html, NL, ROOT

### Community 186 - "hw-signal-test"
Cohesion: 0.33
Nodes (3): html, NL, ROOT

### Community 187 - "offday-notice-test"
Cohesion: 0.33
Nodes (3): html, NL, ROOT

### Community 188 - "repair-test"
Cohesion: 0.40
Nodes (5): B, { hwpxRepairEqText, convertHwpEq }, NL, 같나(), 봄()

### Community 189 - "store-merge-test"
Cohesion: 0.33
Nodes (3): html, lines, ROOT

### Community 190 - "pill(사용자 조작) vs badge(시스템 부여)"
Cohesion: 0.50
Nodes (5): pill(사용자 조작) vs badge(시스템 부여), signal(r) — 행 안의 신호 규칙, 규칙 기반 자동 트리아지, 신호 규칙 (연속 결석 2 · 성적 급락 8 · 오답 미제출 7일 · 시청률 12%p · 과제 누락 3), W — 학생별 시청률

### Community 201 - "tools/pdfjs/pdf"
Cohesion: 0.67
Nodes (3): tools/pdfjs/pdf.mjs (pdf.js), 헤드리스 virtual-time-budget은 워커 시간을 안 돌린다, render-pdf-cover (pdf.js로 PDF 표지 캔버스 렌더)

## Ambiguous Edges - Review These
- `엔딩크레딧 시리즈 (4권 압축 교재 · 1-1 = 고1 1학기)` → `개념서 시리즈 (2026)`  [AMBIGUOUS]
  책표지/[2026][개념서] 앞표지.pdf · relation: conceptually_related_to
- `엔딩크레딧 시리즈 (4권 압축 교재 · 1-1 = 고1 1학기)` → `주기나 시리즈 (모의고사 기출 교재 · 1-1)`  [AMBIGUOUS]
  책표지/[2026][엔딩크레딧][1-1][표지].pdf · relation: conceptually_related_to
- `캐릭터.png — 파란 티셔츠 소년 캐릭터 스프라이트 시트 (달리기·점프·넘어짐 17컷)` → `김하현수학연구소 (KIM HA HYUN MATH) 브랜드 로고`  [AMBIGUOUS]
  책표지/캐릭터.png · relation: conceptually_related_to
- `캐릭터.png — 파란 티셔츠 소년 캐릭터 스프라이트 시트 (달리기·점프·넘어짐 17컷)` → `엔딩크레딧 (N딩 크레딧) 시리즈 — 공통수학 1`  [AMBIGUOUS]
  책표지/캐릭터.png · relation: conceptually_related_to
- `로고 가로형(2) — 흰색(리버스) 버전으로 추정, 흰 배경에서 보이지 않음` → `김하현수학연구소 브랜드 아이덴티티 — 필기체 흐름의 무한대/파도형 심볼(다크 브라운→와인레드 그라데이션, 붉은 점), 워드마크 김하현(적색)+수학연구소(회색), 영문 KIM HA HYUN MATH`  [AMBIGUOUS]
  로고/가로형(2).png · relation: implements
- `로고 세로형(2) — 흰색(리버스) 버전으로 추정, 흰 배경에서 보이지 않음` → `김하현수학연구소 브랜드 아이덴티티 — 필기체 흐름의 무한대/파도형 심볼(다크 브라운→와인레드 그라데이션, 붉은 점), 워드마크 김하현(적색)+수학연구소(회색), 영문 KIM HA HYUN MATH`  [AMBIGUOUS]
  로고/세로형(2).png · relation: implements

## Knowledge Gaps
- **1119 isolated node(s):** `CHAR_IMG`, `RUN_IMG`, `RUN_SEQ`, `MODE_RUNNER`, `HWP_WATERMARK_PATTERNS` (+1114 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1560 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `엔딩크레딧 시리즈 (4권 압축 교재 · 1-1 = 고1 1학기)` and `개념서 시리즈 (2026)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `엔딩크레딧 시리즈 (4권 압축 교재 · 1-1 = 고1 1학기)` and `주기나 시리즈 (모의고사 기출 교재 · 1-1)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `캐릭터.png — 파란 티셔츠 소년 캐릭터 스프라이트 시트 (달리기·점프·넘어짐 17컷)` and `김하현수학연구소 (KIM HA HYUN MATH) 브랜드 로고`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `캐릭터.png — 파란 티셔츠 소년 캐릭터 스프라이트 시트 (달리기·점프·넘어짐 17컷)` and `엔딩크레딧 (N딩 크레딧) 시리즈 — 공통수학 1`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `로고 가로형(2) — 흰색(리버스) 버전으로 추정, 흰 배경에서 보이지 않음` and `김하현수학연구소 브랜드 아이덴티티 — 필기체 흐름의 무한대/파도형 심볼(다크 브라운→와인레드 그라데이션, 붉은 점), 워드마크 김하현(적색)+수학연구소(회색), 영문 KIM HA HYUN MATH`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **What is the exact relationship between `로고 세로형(2) — 흰색(리버스) 버전으로 추정, 흰 배경에서 보이지 않음` and `김하현수학연구소 브랜드 아이덴티티 — 필기체 흐름의 무한대/파도형 심볼(다크 브라운→와인레드 그라데이션, 붉은 점), 워드마크 김하현(적색)+수학연구소(회색), 영문 KIM HA HYUN MATH`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **Why does `f()` connect `Code Hiding & Comment Scrub` to `Cache-bust & Item Figures`, `backup-diff`, `AI Review Bench`, `validate`, `validate`, `ref_node_child_process`, `Homework & Figure Probes`, `student-skin-test`, `Zip Writer`, `Contact Repair`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._