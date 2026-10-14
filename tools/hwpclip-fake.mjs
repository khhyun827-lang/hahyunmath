// 가짜 한글 원본 조각 — 엔크 원본 뼈를 줄인 것 (2026-10-15 · hwpclip-test · hwpcopy-test 가 같이 쓴다)
// 진짜 조각엔 정답·해설이 들어 있어 저장소(공개)에 못 둔다 → 뼈만 흉내 낸다:
//   맨 위 [secd][상자 표] · 상자 칸 둘: [출처 칸 — 미주(자동번호·숨은 설명 «[ORIG]»·[정답] 15·옛 해설+그림)]
//   [본문 칸 — 글+수식(설명에 «[ORIG]») → 선지 표 ①│a│②│b… (④ 뒤 제어 글자) → 그림]
export const K = n => n.toString(16).toUpperCase().padStart(24, '0');
export const CI = { tbl: 1952607264, en: 1701716000, eq: 1701930340, gso: 1735618336, atno: 1635020399, tcmt: 1952673140 };
const 문단 = (np, ch) => ({ np, id: 0, pp: K(2), si: K(3), bf: 0, ru: [{ cp: K(1), ch }] });
const 개 = (k, ci) => ({ cc: 11, ci, co: K(k) });
export function 가짜원본(){
  const o = { documentPr: {}, dh: {}, pp: { [K(2)]: { id: 0 } }, st: { [K(3)]: { id: 0 } }, cp: { [K(1)]: { id: 0 } },
    cs: { [K(4)]: { cc: 2, ci: 1936024420 }, [K(6)]: { cc: 11, ci: CI.tbl },
      [K(7)]: { cc: 17, ci: CI.en, en: { so: K(30) } }, [K(8)]: { cc: 18, ci: CI.atno }, [K(9)]: { cc: 23, ci: CI.tcmt, hc: { so: K(40) } },
      [K(10)]: { cc: 11, ci: CI.eq, id: 3, sc: '수식입니다.', eq: { sc: '15' } },
      [K(11)]: { cc: 11, ci: CI.gso, id: 4, swi: 500, she: 500, rc: { ow: 50, oh: 50, img: { bi: K(91) + '.png' } } },
      [K(12)]: { cc: 11, ci: CI.eq, id: 5, sc: '수식입니다. [ORIG]', eq: { sc: 'x' } },
      [K(13)]: { cc: 11, ci: CI.tbl },
      [K(14)]: { cc: 11, ci: CI.gso, id: 6, swi: 1000, she: 1000, rc: { ow: 100, oh: 100, cw: 1000, ch: 1000, img: { bi: K(90) + '.jpg' } } } },
    ro: { hp: K(15), [K(15)]: 문단(K(16), [{ cc: 2, co: K(4) }, 개(6, CI.tbl), { t: '' }]), [K(16)]: 문단('', [{ t: '' }]) },
    sl: {
      [K(20)]: { co: K(6), tc: { ar: 0, ac: 0 }, hp: K(21) }, [K(21)]: 문단('', [{ cc: 17, ci: CI.en, co: K(7) }, { t: '[출처]' }]),
      [K(30)]: { co: K(7), hp: K(31) }, [K(31)]: 문단(K(32), [{ cc: 18, ci: CI.atno, co: K(8) }, { cc: 23, ci: CI.tcmt, co: K(9) }, { t: ' [정답] ' }, 개(10, CI.eq), { t: '' }]),
      [K(32)]: 문단('', [{ t: '옛 해설 ' }, 개(11, CI.gso)]),
      [K(40)]: { co: K(9), hp: K(41) }, [K(41)]: 문단('', [{ t: '[ORIG]' }]),
      [K(50)]: { co: K(6), tc: { ar: 1, ac: 0 }, hp: K(51) }, [K(51)]: 문단(K(52), [{ t: '옛 본문 아주 긴 글 ' }, 개(12, CI.eq), { t: '' }]),
      [K(52)]: 문단(K(53), [개(13, CI.tbl), { t: '' }]), [K(53)]: 문단('', [개(14, CI.gso), { t: '' }]),
    },
    bi: [{ ty: 'image/jpg', sr: K(90) + '.jpg' }, { ty: 'image/png', sr: K(91) + '.png' }],
    bidt: { [K(90) + '.jpg']: 'JPG', [K(91) + '.png']: 'PNG' } };
  '①a②b③c④\u001fd⑤e'.match(/[①-⑤]\u001f?|[a-e]/g).forEach((t, n) => {   // 선지 표: ①│a│②│b… (④ 뒤 제어 글자 — 한글이 싣는다)
    o.sl[K(60 + n)] = { co: K(13), tc: { ar: 0, ac: n }, hp: K(80 + n) };
    o.sl[K(80 + n)] = 문단('', [{ t }]);
  });
  return o;
}
// 그 원본의 변형 하나 — 선지 다섯(셋은 수식) · 정답 ② · 해설 두 줄
export const 가짜변형 = { code: 'ORIG-N01', originCode: 'ORIG', answer: '②', solution: '1. 첫 줄 $a$\n2. 둘째',
  content: '새 본문 $x^2$\n\n① $1$ ② $2$ ③ 3\n④ 4 ⑤ $' + String.fromCharCode(92) + 'frac12$' };
