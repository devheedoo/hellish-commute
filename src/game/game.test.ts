import { describe, expect, it } from 'vitest';
import { BOUT_MS, cellsOf, inBounds, key, NEUTRAL_FOOTPRINTS, SIZE, SLOTS, STRUCTURES } from './board';
import { createInitialState, placementActor, reducer } from './reducer';
import { movesFor, slide } from './rules';
import type { GameState, Vehicle } from './types';

function startedGame(): GameState {
  let s = reducer(createInitialState(), { type: 'START', first: 'A' });
  for (let i = 0; i < 4; i++) s = reducer(s, { type: 'PLACE', slotIndex: i });
  return s;
}

const veh = (id: string, owner: Vehicle['owner'], kind: Vehicle['kind'], axis: Vehicle['axis'], r: number, c: number): Vehicle => ({
  id,
  owner,
  kind,
  axis,
  pos: { r, c },
});

describe('board layout', () => {
  const footprints = [...NEUTRAL_FOOTPRINTS, ...SLOTS];
  const cells = [...STRUCTURES, ...footprints.flatMap((f) => cellsOf(f).map(key))];

  it('has about 5 structures and 8 start slots of 2-cell cars', () => {
    expect(STRUCTURES.size).toBe(6);
    expect(SLOTS).toHaveLength(8);
    expect(SLOTS.every((s) => s.kind === 'car')).toBe(true);
  });

  it('keeps every piece in bounds without overlaps', () => {
    footprints.forEach((f) => cellsOf(f).forEach((p) => expect(inBounds(p)).toBe(true)));
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('is 180° rotationally symmetric', () => {
    const set = new Set(cells);
    for (const k of set) {
      const [r, c] = k.split(',').map(Number) as [number, number];
      expect(set.has(`${SIZE - 1 - r},${SIZE - 1 - c}`)).toBe(true);
    }
  });
});

describe('slide', () => {
  it('moves only along the vehicle axis', () => {
    const car = veh('A0', 'A', 'car', 'h', 3, 1);
    expect(slide([car], car, 'up')).toBeNull();
    expect(slide([car], car, 'down')).toBeNull();
  });

  it('slides until the leading cell is blocked', () => {
    const bus = veh('N0', 'neutral', 'bus', 'v', 7, 9);
    const car = veh('B0', 'B', 'car', 'h', 12, 9);
    // 세로 버스(7~9행)가 아래로: 12행의 차에 막혀 9~11행에서 멈춤
    expect(slide([bus, car], bus, 'down')).toEqual({ to: { r: 9, c: 9 }, escapes: false });
  });

  it('team vehicle reaching the edge escapes, neutral vehicle does not', () => {
    const team = veh('A0', 'A', 'car', 'h', 3, 1);
    expect(slide([team], team, 'left')).toEqual({ to: { r: 3, c: 0 }, escapes: true });
    const neutral = veh('N9', 'neutral', 'bus', 'v', 2, 7);
    expect(slide([neutral], neutral, 'up')).toEqual({ to: { r: 0, c: 7 }, escapes: false });
  });
});

describe('placement', () => {
  it('second team places 3 of first team cars, then first team places its last, rest auto-filled', () => {
    let s = reducer(createInitialState(), { type: 'START', first: 'A' });
    for (let i = 0; i < 3; i++) {
      expect(placementActor(s)).toBe('B');
      s = reducer(s, { type: 'PLACE', slotIndex: i });
    }
    expect(placementActor(s)).toBe('A');
    s = reducer(s, { type: 'PLACE', slotIndex: 7 });

    expect(s.phase).toBe('playing');
    expect(s.turn).toBe('A');
    expect(s.vehicles.filter((v) => v.owner === 'A')).toHaveLength(4);
    expect(s.vehicles.filter((v) => v.owner === 'B')).toHaveLength(4);
  });

  it('ignores an occupied slot', () => {
    let s = reducer(createInitialState(), { type: 'START', first: 'A' });
    s = reducer(s, { type: 'PLACE', slotIndex: 0 });
    expect(reducer(s, { type: 'PLACE', slotIndex: 0 })).toBe(s);
  });

  it('vertical center cars start boxed in; horizontal ones are stopped by neutral blockers', () => {
    const s = startedGame();
    const at = (i: number) => s.vehicles.find((v) => v.pos.r === SLOTS[i]!.pos.r && v.pos.c === SLOTS[i]!.pos.c)!;
    expect(movesFor(s, at(2))).toEqual({});
    // 슬롯 0 (5행 왼쪽 가로 차): 2열의 세로 버스에 막혀 3~4열에서 멈춤
    expect(movesFor(s, at(0))).toEqual({ left: { to: { r: 5, c: 3 }, escapes: false } });
  });
});

describe('moves', () => {
  it('cannot move opponent vehicles', () => {
    const s = startedGame();
    const b = s.vehicles.find((v) => v.owner === 'B')!;
    expect(reducer(s, { type: 'MOVE', vehicleId: b.id, dir: 'left' })).toBe(s);
  });

  it('cannot move the neutral vehicle that was moved on the previous turn', () => {
    let s = startedGame();
    // N0 = (3,4) 가로 버스를 A가 왼쪽으로 이동
    s = reducer(s, { type: 'MOVE', vehicleId: 'N0', dir: 'left' });
    expect(s.turn).toBe('B');
    expect(reducer(s, { type: 'MOVE', vehicleId: 'N0', dir: 'right' })).toBe(s);
  });

  it('first to escape 3 cars wins', () => {
    const s: GameState = {
      ...startedGame(),
      escaped: { A: 2, B: 0 },
      vehicles: [veh('A0', 'A', 'car', 'h', 3, 1), veh('B0', 'B', 'car', 'h', 10, 10)],
    };
    const after = reducer(s, { type: 'MOVE', vehicleId: 'A0', dir: 'left' });
    expect(after.escaped.A).toBe(3);
    expect(after.phase).toBe('finished');
    expect(after.winner).toBe('A');
  });
});

describe('bout clock', () => {
  it('rotates to the next runner every minute', () => {
    let s = startedGame();
    s = reducer(s, { type: 'TICK', ms: BOUT_MS - 1 });
    expect(s.clock.index).toBe(0);
    s = reducer(s, { type: 'TICK', ms: 1 });
    expect(s.clock.index).toBe(1);
    expect(s.clock.remainingMs).toBe(BOUT_MS);
  });

  it('allows only one timeout per team and freezes moves/clock during it', () => {
    let s = reducer(startedGame(), { type: 'TIMEOUT', team: 'A' });
    expect(reducer(s, { type: 'TICK', ms: 1000 })).toBe(s);
    expect(reducer(s, { type: 'MOVE', vehicleId: 'N0', dir: 'left' })).toBe(s);
    s = reducer(s, { type: 'RESUME' });
    expect(reducer(s, { type: 'TIMEOUT', team: 'A' })).toBe(s);
  });
});
