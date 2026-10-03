import type { Axis, Kind, Pos, Team, Vehicle } from './types';

export const SIZE = 14;
export const CARS_PER_TEAM = 4;
export const ESCAPES_TO_WIN = 3;
export const BOUT_MS = 60_000;
/** 후공 팀이 지정하는 선공 팀 자동차 수 */
export const PLACED_BY_OPPONENT = 3;

export const LENGTH: Record<Kind, number> = { car: 2, bus: 3 };

/** 차량의 위치·모양. pos는 맨 위(세로) 또는 맨 왼쪽(가로) 칸 */
export interface Footprint {
  kind: Kind;
  axis: Axis;
  pos: Pos;
}

export const key = (p: Pos) => `${p.r},${p.c}`;
export const inBounds = (p: Pos) => p.r >= 0 && p.r < SIZE && p.c >= 0 && p.c < SIZE;
export const isEdge = (p: Pos) => p.r === 0 || p.c === 0 || p.r === SIZE - 1 || p.c === SIZE - 1;

export function cellsOf({ kind, axis, pos }: Footprint): Pos[] {
  return Array.from({ length: LENGTH[kind] }, (_, i) =>
    axis === 'h' ? { r: pos.r, c: pos.c + i } : { r: pos.r + i, c: pos.c },
  );
}

/** 판 중심 기준 180° 회전 */
function rotate(f: Footprint): Footprint {
  const len = LENGTH[f.kind];
  const pos =
    f.axis === 'h'
      ? { r: SIZE - 1 - f.pos.r, c: SIZE - f.pos.c - len }
      : { r: SIZE - f.pos.r - len, c: SIZE - 1 - f.pos.c };
  return { ...f, pos };
}

const h = (kind: Kind, r: number, c: number): Footprint => ({ kind, axis: 'h', pos: { r, c } });
const v = (kind: Kind, r: number, c: number): Footprint => ({ kind, axis: 'v', pos: { r, c } });

/*
 * 방송의 실제 배치도는 공개 자료로 확인되지 않아 자체 설계한 맵.
 * 공정성을 위해 절반만 정의하고 나머지는 180° 회전으로 만든다.
 */

/**
 * 중앙 4×4 구역의 시작 위치 8곳 (모두 2칸 자동차)
 *
 *        c5 c6 c7 c8
 *   r5   ←0 ←0 1→ 1→
 *   r6   2↕ 3↕ 4↕ 5↕
 *   r7   2↕ 3↕ 4↕ 5↕
 *   r8   ←6 ←6 7→ 7→
 *
 * 세로 4대는 위아래가 가로 차에 막혀 있어 처음엔 움직일 수 없다.
 */
export const SLOTS: readonly Footprint[] = [
  h('car', 5, 5),
  h('car', 5, 7),
  v('car', 6, 5),
  v('car', 6, 6),
  v('car', 6, 7),
  v('car', 6, 8),
  h('car', 8, 5),
  h('car', 8, 7),
];

const HALF_NEUTRALS: Footprint[] = [
  h('bus', 3, 4), // 5·6열 위쪽 출구 차단
  h('car', 2, 7), // 7·8열 위쪽 출구 차단
  v('bus', 4, 2), // 5행 왼쪽 출구 차단
  v('car', 7, 1), // 8행 왼쪽 출구 차단
  h('car', 1, 2),
  v('bus', 9, 4),
];

const HALF_STRUCTURES: Pos[] = [
  { r: 1, c: 6 },
  { r: 6, c: 4 },
  { r: 10, c: 1 },
];

export const NEUTRAL_FOOTPRINTS: readonly Footprint[] = [...HALF_NEUTRALS, ...HALF_NEUTRALS.map(rotate)];

export const STRUCTURES: ReadonlySet<string> = new Set(
  [...HALF_STRUCTURES, ...HALF_STRUCTURES.map((p) => ({ r: SIZE - 1 - p.r, c: SIZE - 1 - p.c }))].map(key),
);

export function initialNeutrals(): Vehicle[] {
  return NEUTRAL_FOOTPRINTS.map((f, i) => ({ id: `N${i}`, owner: 'neutral', ...f }));
}

export const other = (t: Team): Team => (t === 'A' ? 'B' : 'A');
