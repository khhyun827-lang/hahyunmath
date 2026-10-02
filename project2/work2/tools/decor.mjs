// 원본 교재의 «쪽 장식»을 가려낸다 (STEP 배너 · 옆줄 딱지 · 리본).
// ⚠ 빌더와 검사기가 «같은 판정»을 써야 한다. 규칙이 두 벌이면 검사기가
//    「그림이 모자라다」고 거짓 경고를 낸다. 그래서 이 파일 하나에만 둔다.
//
// 근거 둘 —
//  ① 원본 «한 권 안에서 여러 문항이 함께 쓰는» 그림이면 장식이다.
//     (문제 그림은 그 문항에만 쓰인다. 27문항이 함께 쓰는 것까지 있었다)
//  ② 유난히 가로로 긴 것(비율 6 이상)은 배너다.
// ⚠ 수직선 그림도 가로로 길다. 실측 최대가 4.8 이라 6 을 문턱으로 잡았다
//    (A-057·B-043·B-077·C-130 의 수직선이 걸리지 않는 것을 확인했다).

export function findDecorations(RICH) {
  const use = new Map();
  for (const c of Object.keys(RICH)) {
    RICH[c].forEach((rc, i) => {
      for (const rs of [...rc.paras, ...rc.answer]) {
        for (const r of rs) {
          if (r.t !== 'img') continue;
          const k = c + '/' + r.bin;
          const sz = /orgSz width="(\d+)" height="(\d+)"/.exec(r.xml);
          if (!use.has(k)) use.set(k, { ids: new Set(), ratio: sz && +sz[2] ? +sz[1] / +sz[2] : 0 });
          use.get(k).ids.add(i);
        }
      }
    });
  }
  const decor = new Set();
  for (const [k, v] of use) if (v.ids.size >= 2 || v.ratio >= 6) decor.add(k);
  return decor;
}

// 그 문항에서 «실제로 옮겨질» 그림만 센다
export const realImages = (rc, book, decor) =>
  [...rc.paras, ...rc.answer].flat()
    .filter((r) => r.t === 'img' && !decor.has(book + '/' + r.bin)).length;
