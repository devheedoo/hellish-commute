import { cellsOf, inBounds, isEdge, key, STRUCTURES } from './board';
import type { Axis, Dir, GameState, Pos, Team, Vehicle } from './types';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export const DIRS_BY_AXIS: Record<Axis, readonly Dir[]> = { h: ['left', 'right'], v: ['up', 'down'] };

const DELTA: Record<Dir, Pos> = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};

export interface SlideResult {
  /** 이동 후 차량의 기준 칸(pos) */
  to: Pos;
  /** 팀 차량이 가장자리에 도달해 판 밖으로 탈출하는지 */
  escapes: boolean;
}

/** 모든 차량·구조물이 차지한 칸. exceptId 차량은 제외 */
export function occupiedCells(vehicles: readonly Vehicle[], exceptId?: string): Set<string> {
  const set = new Set(STRUCTURES);
  for (const v of vehicles) {
    if (v.id !== exceptId) cellsOf(v).forEach((p) => set.add(key(p)));
  }
  return set;
}

/**
 * 차량은 자기 길이 방향(앞/뒤)으로만, 다른 차량·구조물·판 끝에 막히기 전까지 직선으로 미끄러진다.
 * 방향이 축과 맞지 않거나 한 칸도 움직일 수 없으면 null.
 */
export function slide(vehicles: readonly Vehicle[], vehicle: Vehicle, dir: Dir): SlideResult | null {
  if (!DIRS_BY_AXIS[vehicle.axis].includes(dir)) return null;
  const occupied = occupiedCells(vehicles, vehicle.id);
  const d = DELTA[dir];
  let pos = vehicle.pos;
  for (;;) {
    const next = { r: pos.r + d.r, c: pos.c + d.c };
    const fits = cellsOf({ ...vehicle, pos: next }).every((p) => inBounds(p) && !occupied.has(key(p)));
    if (!fits) break;
    pos = next;
  }
  if (pos.r === vehicle.pos.r && pos.c === vehicle.pos.c) return null;
  const escapes = vehicle.owner !== 'neutral' && cellsOf({ ...vehicle, pos }).some(isEdge);
  return { to: pos, escapes };
}

/** 자기 팀 차량, 또는 직전에 움직이지 않은 중립 차량만 고를 수 있다. */
export function isSelectable(state: GameState, vehicle: Vehicle, team: Team = state.turn): boolean {
  if (vehicle.owner === team) return true;
  return vehicle.owner === 'neutral' && vehicle.id !== state.lastMovedId;
}

export function movesFor(state: GameState, vehicle: Vehicle): Partial<Record<Dir, SlideResult>> {
  const out: Partial<Record<Dir, SlideResult>> = {};
  for (const dir of DIRS_BY_AXIS[vehicle.axis]) {
    const res = slide(state.vehicles, vehicle, dir);
    if (res) out[dir] = res;
  }
  return out;
}

export function hasAnyMove(state: GameState, team: Team): boolean {
  return state.vehicles.some(
    (v) => isSelectable(state, v, team) && DIRS_BY_AXIS[v.axis].some((dir) => slide(state.vehicles, v, dir)),
  );
}
