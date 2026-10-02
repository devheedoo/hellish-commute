import { describe, expect, it } from 'vitest';
import { BOUT_MS, LAYOUT, SIZE, SLOTS } from './board';
import { createInitialState, placementActor, reducer } from './reducer';
import { slide } from './rules';
import type { Car, GameState } from './types';

function startedGame(): GameState {
  let s = reducer(createInitialState(), { type: 'START', first: 'A' });
  for (let i = 0; i < 4; i++) s = reducer(s, { type: 'PLACE', slotIndex: i });
  return s;
}

describe('board layout', () => {
  it('is 14x14 and 180° rotationally symmetric', () => {
    expect(LAYOUT).toHaveLength(SIZE);
    LAYOUT.forEach((row, r) => {
      expect(row).toHaveLength(SIZE);
      expect(row).toBe([...LAYOUT[SIZE - 1 - r]!].reverse().join(''));
    });
  });

  it('has 8 start slots', () => {
    expect(SLOTS).toHaveLength(8);
  });
});

describe('slide', () => {
  const car = (id: string, r: number, c: number, owner: Car['owner'] = 'A'): Car => ({ id, owner, pos: { r, c } });

  it('slides until blocked by another car', () => {
    const cars = [car('A0', 10, 1), car('N0', 10, 3, 'neutral')];
    // (10,3)은 LAYOUT상 중립 차 자리지만 여기서는 cars 배열만 기준으로 판정
    expect(slide(cars, cars[0]!, 'right')).toEqual({ to: { r: 10, c: 2 }, escapes: false });
  });

  it('team car reaching the edge escapes, neutral car does not', () => {
    const team = car('A0', 3, 1);
    expect(slide([team], team, 'left')).toEqual({ to: { r: 3, c: 0 }, escapes: true });
    const neutral = car('N9', 3, 1, 'neutral');
    expect(slide([neutral], neutral, 'left')).toEqual({ to: { r: 3, c: 0 }, escapes: false });
  });

  it('returns null when it cannot move at all', () => {
    // (5,6) 슬롯: 왼쪽 (5,5)는 구조물
    const a = car('A0', 5, 6);
    expect(slide([a], a, 'left')).toBeNull();
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
    expect(s.cars.filter((c) => c.owner === 'A')).toHaveLength(4);
    expect(s.cars.filter((c) => c.owner === 'B')).toHaveLength(4);
  });

  it('ignores an occupied slot', () => {
    let s = reducer(createInitialState(), { type: 'START', first: 'A' });
    s = reducer(s, { type: 'PLACE', slotIndex: 0 });
    expect(reducer(s, { type: 'PLACE', slotIndex: 0 })).toBe(s);
  });
});

describe('moves', () => {
  it('cannot move opponent cars', () => {
    const s = startedGame();
    const bCar = s.cars.find((c) => c.owner === 'B')!;
    expect(reducer(s, { type: 'MOVE', carId: bCar.id, dir: 'up' })).toBe(s);
  });

  it('cannot move the neutral car that was moved on the previous turn', () => {
    let s = startedGame();
    // N2 = (2,6) 중립 차를 A가 왼쪽으로 이동
    s = reducer(s, { type: 'MOVE', carId: 'N2', dir: 'left' });
    expect(s.turn).toBe('B');
    expect(reducer(s, { type: 'MOVE', carId: 'N2', dir: 'right' })).toBe(s);
  });

  it('first to escape 3 cars wins', () => {
    const s: GameState = {
      ...startedGame(),
      escaped: { A: 2, B: 0 },
      cars: [{ id: 'A0', owner: 'A', pos: { r: 3, c: 1 } }, { id: 'B0', owner: 'B', pos: { r: 10, c: 10 } }],
    };
    const after = reducer(s, { type: 'MOVE', carId: 'A0', dir: 'left' });
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
    expect(reducer(s, { type: 'MOVE', carId: 'N2', dir: 'left' })).toBe(s);
    s = reducer(s, { type: 'RESUME' });
    expect(reducer(s, { type: 'TIMEOUT', team: 'A' })).toBe(s);
  });
});
