import { inBounds, isEdge, key, STRUCTURES } from './board';
import type { Car, Dir, GameState, Pos, Team } from './types';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

const DELTA: Record<Dir, Pos> = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};

export interface SlideResult {
  to: Pos;
  /** 팀 자동차가 가장자리에 도달해 판 밖으로 탈출하는지 */
  escapes: boolean;
}

/**
 * 자동차는 다른 자동차·구조물·판 끝에 막히기 전까지 직선으로 미끄러진다.
 * 한 칸도 움직일 수 없으면 null.
 */
export function slide(cars: readonly Car[], car: Car, dir: Dir): SlideResult | null {
  const occupied = new Set(cars.filter((c) => c.id !== car.id).map((c) => key(c.pos)));
  const d = DELTA[dir];
  let cur = car.pos;
  for (;;) {
    const next = { r: cur.r + d.r, c: cur.c + d.c };
    if (!inBounds(next) || STRUCTURES.has(key(next)) || occupied.has(key(next))) break;
    cur = next;
  }
  if (cur.r === car.pos.r && cur.c === car.pos.c) return null;
  return { to: cur, escapes: car.owner !== 'neutral' && isEdge(cur) };
}

/** 자기 팀 자동차, 또는 직전에 움직이지 않은 중립 자동차만 고를 수 있다. */
export function isSelectable(state: GameState, car: Car, team: Team = state.turn): boolean {
  if (car.owner === team) return true;
  return car.owner === 'neutral' && car.id !== state.lastMovedId;
}

export function movesFor(state: GameState, car: Car): Partial<Record<Dir, SlideResult>> {
  const out: Partial<Record<Dir, SlideResult>> = {};
  for (const dir of DIRS) {
    const res = slide(state.cars, car, dir);
    if (res) out[dir] = res;
  }
  return out;
}

export function hasAnyMove(state: GameState, team: Team): boolean {
  return state.cars.some(
    (car) => isSelectable(state, car, team) && DIRS.some((dir) => slide(state.cars, car, dir)),
  );
}
