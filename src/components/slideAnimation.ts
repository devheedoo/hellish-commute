import { type RefObject, useLayoutEffect, useRef } from 'react';
import type { Dir, Pos } from '../game/types';

/*
 * 차량은 grid-area로 배치되므로 CSS transition으로는 위치 변화를 애니메이션할 수 없다.
 * 대신 FLIP 방식으로, 새 위치에 렌더된 뒤 이전 위치만큼 transform으로 되돌렸다가 0으로 미끄러뜨린다.
 */

const EASING = 'cubic-bezier(0.25, 0.8, 0.3, 1)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 칸 수에 비례하되 너무 길어지지 않게 */
const durationFor = (cells: number) => Math.min(120 + cells * 45, 480);

/** 그리드 한 칸 간격(셀 크기 + gap) px */
function pitchOf(el: HTMLElement): number {
  const grid = el.parentElement;
  if (!grid) return 0;
  const cs = getComputedStyle(grid);
  return parseFloat(cs.gridTemplateColumns) + parseFloat(cs.columnGap);
}

/** pos가 바뀌면 이전 위치에서 새 위치로 미끄러지는 애니메이션 */
export function useSlideAnimation(ref: RefObject<HTMLElement | null>, pos: Pos) {
  const prev = useRef(pos);
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = pos;
    const el = ref.current;
    const dr = from.r - pos.r;
    const dc = from.c - pos.c;
    if (!el || (dr === 0 && dc === 0) || reducedMotion()) return;
    const pitch = pitchOf(el);
    el.animate([{ transform: `translate(${dc * pitch}px, ${dr * pitch}px)` }, { transform: 'none' }], {
      duration: durationFor(Math.abs(dr) + Math.abs(dc)),
      easing: EASING,
    });
    // pos 객체가 매 렌더 새로 만들어져도 좌표가 같으면 다시 실행하지 않는다
  }, [pos.r, pos.c]);
}

const DELTA: Record<Dir, Pos> = { up: { r: -1, c: 0 }, down: { r: 1, c: 0 }, left: { r: 0, c: -1 }, right: { r: 0, c: 1 } };

/** 탈출하는 차량: 출발 위치에서 가장자리까지 미끄러진 뒤 그대로 판 밖으로 빠져나가며 사라진다 */
export function useEscapeAnimation(ref: RefObject<HTMLElement | null>, from: Pos, to: Pos, dir: Dir, length: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.style.opacity = '0';
      return;
    }
    const pitch = pitchOf(el);
    const cells = Math.abs(from.r - to.r) + Math.abs(from.c - to.c);
    const slideMs = durationFor(cells);
    const exitMs = 260;
    const d = DELTA[dir];
    const out = length + 1;
    el.animate(
      [
        { transform: `translate(${(from.c - to.c) * pitch}px, ${(from.r - to.r) * pitch}px)`, opacity: 1, easing: 'linear' },
        { transform: 'none', opacity: 1, offset: slideMs / (slideMs + exitMs), easing: 'ease-out' },
        { transform: `translate(${d.c * out * pitch}px, ${d.r * out * pitch}px)`, opacity: 0 },
      ],
      { duration: slideMs + exitMs, fill: 'forwards' },
    );
    // 마운트 시 한 번만 재생 (이동마다 key가 바뀌어 새로 마운트된다)
  }, []);
}
