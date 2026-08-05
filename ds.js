/* ============================================================
   김하현수학연구소 — 디자인 시스템 v1 / 공용 스크립트
   아이콘 · 캔버스 피팅 · 공용 예시 데이터
   ============================================================ */

/* ---------- 아이콘 ----------
   24×24 뷰박스, 1.6 스트로크, currentColor.
   이모지를 쓰지 않는다 — 플랫폼마다 모양이 달라 제품이 흔들린다. */
var ICON_PATHS = {
  search:   '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  chevL:    '<path d="M15 5l-7 7 7 7"/>',
  chevR:    '<path d="M9 5l7 7-7 7"/>',
  chevD:    '<path d="M6 9l6 6 6-6"/>',
  check:    '<path d="M4 12.5l5.5 5.5L20 6.5"/>',
  x:        '<path d="M6 6l12 12M18 6L6 18"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  arrowR:   '<path d="M4 12h15M13 6l6 6-6 6"/>',
  user:     '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.6-3.8 3.7-6 7.5-6s6.9 2.2 7.5 6"/>',
  users:    '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c.5-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16.5 5.2a3.2 3.2 0 010 5.6M18 14.8c2.1.7 3.4 2.5 3.7 5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clock:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  phone:    '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a1.8 1.8 0 01-2 1.8C10.6 19.5 4.5 13.4 4.7 5.5a1.8 1.8 0 011.8-2z"/>',
  note:     '<path d="M4.5 4.5h11l4 4v11h-15z"/><path d="M15.5 4.5v4h4M8 13h8M8 16.5h5"/>',
  alert:    '<path d="M12 4.5L21 19.5H3z"/><path d="M12 10v4M12 17h.01"/>',
  chart:    '<path d="M4 19V9M10 19V5M16 19v-6M22 19H2"/>',
  video:    '<rect x="2.5" y="5.5" width="13" height="13" rx="2.5"/><path d="M15.5 10l6-3.5v11l-6-3.5z"/>',
  filter:   '<path d="M3.5 5.5h17l-6.5 7.5V20l-4-2.5v-4.5z"/>',
  download: '<path d="M12 4v10M7.5 10l4.5 4 4.5-4M4.5 19.5h15"/>',
  inbox:    '<path d="M3.5 13.5h4l1.5 3h6l1.5-3h4"/><path d="M6 4.5h12l3 9v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z"/>',
  book:     '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19a2 2 0 012-2h13"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-2.9 1.2v.2a2 2 0 11-4 0v-.1a1.7 1.7 0 00-3-1.2l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00-1.2-2.9h-.2a2 2 0 110-4h.1a1.7 1.7 0 001.2-3l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 002.9-1.2v-.2a2 2 0 114 0v.1a1.7 1.7 0 003 1.2l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 001.2 3h.2a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1.2z"/>',
  pin:      '<path d="M9 4.5h6l-1 5 3.5 3v1.5h-11V12.5l3.5-3z"/><path d="M12 14v5.5"/>',
  chat:     '<path d="M20.5 12.5c0 4.1-3.8 7.5-8.5 7.5a9.8 9.8 0 01-3-.45L4 21l1.3-3.4A7 7 0 013.5 12.5C3.5 8.4 7.3 5 12 5s8.5 3.4 8.5 7.5z"/>',
  megaphone:'<path d="M4 10v4a1.5 1.5 0 001.5 1.5H7l1 4.5h3l-1-4.5 8 3.5V6L10 9.5H5.5A1.5 1.5 0 004 11z"/><path d="M20 10.5v3"/>',
  archive:  '<rect x="3" y="4.5" width="18" height="4" rx="1.5"/><path d="M4.5 8.5v9A2 2 0 006.5 19.5h11a2 2 0 002-2v-9M9.5 12.5h5"/>',
  clipboard:'<path d="M9 4.5H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-11a2 2 0 00-2-2h-2"/><rect x="9" y="2.8" width="6" height="3.4" rx="1.2"/><path d="M8.5 11h7M8.5 14.5h4.5"/>',
  shield:   '<path d="M12 3.5l7 2.8v5.2c0 4-2.9 7.4-7 8.5-4.1-1.1-7-4.5-7-8.5V6.3z"/><path d="M9.3 12l1.9 1.9 3.5-3.8"/>',
  sparkle:  '<path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9-1.9 4.9-1.9-4.9-4.9-1.9 4.9-1.9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  pencil:   '<path d="M16.5 4.5l3 3L8 19H5v-3z"/><path d="M14.5 6.5l3 3"/>',
  eye:      '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>',
  home:     '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19z"/><path d="M9.5 20.5v-6h5v6"/>',
  play:     '<circle cx="12" cy="12" r="8.5"/><path d="M10.2 8.6l5.4 3.4-5.4 3.4z"/>',
  bell:     '<path d="M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6z"/><path d="M13.7 19.5a2 2 0 01-3.4 0"/>'
};

function ICON(name, size) {
  var p = ICON_PATHS[name];
  if (!p) return '';
  var s = size || 16;
  return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
    'style="flex-shrink:0;vertical-align:-.18em;">' + p + '</svg>';
}

/* ---------- 임베드 모드 ----------
   프리뷰의 iframe 안에서는 목업 뷰어 크롬(검은 띠)을 숨긴다.
   썸네일에 어두운 띠가 끼면 시스템의 톤이 깨진다. */
(function () {
  if (window.self === window.top) return;
  var ch = document.querySelector('.chrome');
  if (ch) ch.style.display = 'none';
  var st = document.getElementById('stage');
  if (st) st.style.background = '#FAF9F6';
  document.documentElement.style.background = '#FAF9F6';
})();

/* ---------- 내비게이션 ----------
   13개 화면이 각자 <nav>를 손으로 적으면 반드시 어긋난다.
   메뉴는 여기 한 곳에서만 정의하고 각 화면은 «어디에 있는지»만 알려준다. */
var NAV = [
  ['명단', '01-roster.html'],
  ['신호', '05-signals.html'],
  ['반',   '06-classes.html'],
  ['수업', '02-class.html'],
  ['오답', '04-review.html'],
  ['소통', '09-clinic.html'],
  ['설정', '13-settings.html']
];

/* 상위 메뉴 안의 갈래. 숫자는 처리 대기 건수. */
var SUBNAV = {
  /* 「학생 명단」은 01 명단으로 보낸다. 반은 거기서 필터일 뿐이고,
     같은 곳으로 가는 문을 두 개 만들지 않는다. */
  '반': [
    ['학생 명단', '01-roster.html'], ['수업 기록', '14-log.html'], ['진도', '06-classes.html'],
    ['데일리퀴즈', '15-quiz.html'], ['영상', '16-videos.html']
  ],
  '오답': [
    ['검토', '04-review.html', 12], ['시험지', '07-exams.html'], ['보충문제 창고', '08-bank.html']
  ],
  '소통': [
    ['클리닉', '09-clinic.html', 4], ['공지', '10-notice.html'],
    ['질의응답', '11-qna.html', 5], ['채팅', '12-chat.html', 3]
  ]
};

function renderNav(active) {
  var el = document.getElementById('nav');
  if (!el) return;
  el.innerHTML = NAV.map(function (n) {
    return '<a class="' + (n[0] === active ? 'on' : '') + '" href="' + n[1] + '">' + n[0] + '</a>';
  }).join('');
}

function renderSubnav(section, active, rightHTML) {
  var el = document.getElementById('subnav');
  if (!el || !SUBNAV[section]) return;
  el.innerHTML = SUBNAV[section].map(function (s) {
    return '<a class="' + (s[0] === active ? 'on' : '') + '" href="' + s[1] + '">'
      + s[0] + (s[2] ? ' <b>' + s[2] + '</b>' : '') + '</a>';
  }).join('') + (rightHTML ? '<div class="r">' + rightHTML + '</div>' : '');
}

/* ---------- 캔버스 피팅 ----------
   1440×900 캔버스를 창 너비에 맞춰 축소한다. 확대는 하지 않는다. */
function fitCanvas() {
  var st = document.getElementById('stage'), c = document.getElementById('canvas');
  if (!st || !c) return;
  var s = Math.min(1, (window.innerWidth - 48) / 1440);
  st.style.height = (900 * s) + 'px';
  c.style.transform = 'scale(' + s + ')';
  c.style.left = Math.max(0, (st.clientWidth - 1440 * s) / 2) + 'px';
}
window.addEventListener('resize', fitCanvas);
window.addEventListener('load', fitCanvas);

/* ---------- 공용 예시 데이터 ----------
   전 화면이 같은 22명을 쓴다. 화면을 옮겨다녀도 같은 학원처럼 보이게 하는 장치다.
   수치는 전부 구조 확인용 예시이며 실제 데이터가 아니다. */
var STUDENTS = [
  {n:'최유진', id:'cyj02', s:'건대부고', g:'고2', prog:72, sp:[78,84,88,91,94], att:'ok,ok,ok,ok,ok,ok,ok,ok',      pct:100, hw:'8/8', wr:'6/6', vd:96, ph:'010-2841-3097', rk:'g'},
  {n:'이서연', id:'lsy07', s:'대원여고', g:'고2', prog:72, sp:[72,79,81,85,88], att:'ok,ok,late,ok,ok,ok,ok,ok',    pct:91,  hw:'8/8', wr:'5/6', vd:88, ph:'010-3392-6614', rk:'g'},
  {n:'김민준', id:'kmj01', s:'건대부고', g:'고2', prog:72, sp:[68,71,74,79,82], att:'ok,ok,ok,late,ok,ok,ok,ok',    pct:96,  hw:'7/8', wr:'6/6', vd:74, ph:'010-4417-2280', rk:'y'},
  {n:'윤서아', id:'ysa11', s:'대원고',   g:'고2', prog:72, sp:[74,77,80,83,85], att:'ok,ok,ok,ok,leave,ok,ok,ok',   pct:95,  hw:'8/8', wr:'4/6', vd:81, ph:'010-7728-1145', rk:'g'},
  {n:'한지우', id:'hjw14', s:'건대부고', g:'고2', prog:72, sp:[70,73,76,78,80], att:'ok,ok,ok,ok,ok,late,ok,ok',    pct:92,  hw:'6/8', wr:'5/6', vd:69, ph:'010-2205-8830', rk:'y'},
  {n:'정하람', id:'jhr09', s:'동대부여고',g:'고2', prog:64, sp:[76,74,73,72,71], att:'ok,late,ok,no,ok,ok,late,ok',  pct:88,  hw:'5/8', wr:'3/6', vd:52, ph:'010-6614-9072', rk:'y'},
  {n:'임태경', id:'itk12', s:'광양고',   g:'고2', prog:64, sp:[80,78,77,77,77], att:'ok,ok,late,ok,ok,no,ok,ok',    pct:84,  hw:'6/8', wr:'4/6', vd:63, ph:'010-9031-4418', rk:'y'},
  {n:'박지호', id:'pjh03', s:'광남고',   g:'고2', prog:58, sp:[74,71,68,66,64], att:'ok,no,ok,late,no,ok,ok,late',  pct:78,  hw:'3/8', wr:'1/6', vd:38, ph:'010-5560-2274', rk:'r'},
  {n:'오세훈', id:'osh15', s:'광남고',   g:'고2', prog:58, sp:[72,70,69,67,66], att:'late,ok,no,ok,ok,no,late,ok',  pct:70,  hw:'4/8', wr:'2/6', vd:44, ph:'010-8873-1902', rk:'r'},
  {n:'강도윤', id:'kdy06', s:'가람고',   g:'고2', prog:51, sp:[70,66,63,60,58], att:'no,ok,no,no,ok,late,no,ok',    pct:62,  hw:'2/8', wr:'0/6', vd:21, ph:'010-3348-7761', rk:'r'},
  {n:'서준영', id:'sjy18', s:'건대부고', g:'고2', prog:72, sp:[81,80,79,78,77], att:'ok,ok,ok,ok,ok,ok,late,ok',    pct:94,  hw:'7/8', wr:'5/6', vd:86, ph:'010-1180-5523', rk:'g'},
  {n:'문가온', id:'mgo21', s:'광남고',   g:'고2', prog:72, sp:[75,77,78,80,82], att:'ok,ok,ok,ok,ok,ok,ok,late',    pct:93,  hw:'8/8', wr:'5/6', vd:79, ph:'010-6602-3318', rk:'g'}
];

/* ---------- 반 목록 ----------
   반 관리의 네 화면(진도·수업 기록·데일리퀴즈·영상)이 같은 좌측 목록을 쓴다.
   네 곳에 손으로 적으면 반드시 어긋난다. */
var CLASSES = [
  {n:'고2 미적분Ⅰ 정규반',  t:'월·수·금 19:00', c:22, p:72},
  {n:'고1 공통수학2 A반',   t:'화·목 16:00',    c:18, p:64},
  {n:'고3 미적분Ⅱ 실전반',  t:'월·수·금 21:10', c:14, p:81},
  {n:'고2 확률과통계 주말반',t:'토 10:00',       c:9,  p:45},
  {n:'고1 공통수학1 B반',   t:'화·목 18:00',    c:5,  p:58}
];

function renderClassList(id, active) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = CLASSES.map(function (c, i) {
    return '<div class="cl' + (i === (active || 0) ? ' on' : '') + '">'
      + '<div class="n">' + c.n + '</div>'
      + '<div class="m">' + c.t + ' · ' + c.c + '명</div>'
      + '<div class="p"><span class="bar"><i style="width:' + c.p + '%"></i></span>'
      + '<span>' + c.p + '%</span></div></div>';
  }).join('');
}

/* 5점 성적 추이 스파크라인 */
function spark(vals, w, h) {
  w = w || 110; h = h || 22;
  var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), r = (mx - mn) || 1, d = '';
  vals.forEach(function (v, i) {
    var x = (w * i / (vals.length - 1)).toFixed(1);
    var y = (h - 2 - ((v - mn) / r) * (h - 6)).toFixed(1);
    d += (i ? 'L' : 'M') + x + ' ' + y;
  });
  var down = vals[vals.length - 1] < vals[0];
  return '<svg width="' + w + '" height="' + h + '" style="vertical-align:-6px;">' +
    '<path d="' + d + '" fill="none" stroke="' + (down ? '#B03A2E' : '#3F7A4D') +
    '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}

/* 출결 8회 도트 */
function dots(att) {
  return '<span class="dots">' + att.split(',').map(function (s) {
    return '<i class="' + s + '"></i>';
  }).join('') + '</span>';
}
