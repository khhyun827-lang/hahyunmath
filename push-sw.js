/* 선생님 폰 알림 — FCM 이 보낸 것을 받아 띄운다 (2026-09-24 · N-4).
 *
 * 워커(/push-ping)가 FCM 에 «data 만» 실어 보낸다 — { title, body, go, tag }.
 * Firebase SDK 를 여기 싣지 않는다: 받는 일은 표준 push 이벤트 하나면 된다.
 * 누르면 그 탭(#teacher/qna 등)으로 연다. 이미 열린 창이 있으면 그 창을 앞으로 부르고 탭만 옮긴다.
 * ⚠ 이 파일은 index.html 옆에 있어야 한다 — 범위(scope)가 이 파일이 놓인 폴더다.
 */
self.addEventListener('push', (e) => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j.notification || j; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || '김하현수학연구소', {
    body: d.body || '',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { go: d.go || '' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const go = (e.notification.data || {}).go || '';
  const url = new URL('index.html' + (go ? '#teacher/' + go : ''), self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find((c) => c.url.startsWith(self.registration.scope));
    if (w) { w.postMessage({ pushGo: go }); return w.focus(); }
    return self.clients.openWindow(url);
  })());
});
