import {
  BOUT_MS,
  CARS_PER_TEAM,
  ESCAPES_TO_WIN,
  initialNeutralCars,
  other,
  PLACED_BY_OPPONENT,
  SLOTS,
} from './board';
import { hasAnyMove, isSelectable, slide } from './rules';
import type { Action, Car, Dir, GameState, Team } from './types';

export const TEAM_NAME: Record<Team, string> = { A: '레드팀', B: '블루팀' };
const DIR_NAME: Record<Dir, string> = { up: '위로', down: '아래로', left: '왼쪽으로', right: '오른쪽으로' };

export function createInitialState(): GameState {
  return {
    phase: 'setup',
    first: 'A',
    cars: initialNeutralCars(),
    turn: 'A',
    lastMovedId: null,
    escaped: { A: 0, B: 0 },
    winner: null,
    clock: { index: 0, remainingMs: BOUT_MS, running: false, timeoutBy: null },
    timeoutUsed: { A: false, B: false },
    log: [],
  };
}

/**
 * 배치 단계에서 지금 슬롯을 지정할 팀.
 * 후공 팀이 선공 팀 자동차 3대를 먼저 놓고, 이어서 선공 팀이 자기 마지막 1대를 놓는다.
 */
export function placementActor(state: GameState): Team {
  const placed = state.cars.filter((c) => c.owner === state.first).length;
  return placed < PLACED_BY_OPPONENT ? other(state.first) : state.first;
}

export function isSlotFree(state: GameState, slotIndex: number): boolean {
  const slot = SLOTS[slotIndex];
  return !!slot && !state.cars.some((c) => c.pos.r === slot.r && c.pos.c === slot.c);
}

function place(state: GameState, slotIndex: number): GameState {
  const slot = SLOTS[slotIndex];
  if (state.phase !== 'placement' || !slot || !isSlotFree(state, slotIndex)) return state;

  const actor = placementActor(state);
  const n = state.cars.filter((c) => c.owner === state.first).length;
  let cars: Car[] = [...state.cars, { id: `${state.first}${n}`, owner: state.first, pos: slot }];
  const log = [...state.log, `${TEAM_NAME[actor]}: ${TEAM_NAME[state.first]} 자동차 배치`];

  if (n + 1 < CARS_PER_TEAM) return { ...state, cars, log };

  // 선공 팀 4대가 모두 놓이면 남은 슬롯은 자동으로 후공 팀 차지
  const second = other(state.first);
  const occupied = new Set(cars.map((c) => `${c.pos.r},${c.pos.c}`));
  const rest = SLOTS.filter((s) => !occupied.has(`${s.r},${s.c}`));
  cars = [...cars, ...rest.map((pos, i): Car => ({ id: `${second}${i}`, owner: second, pos }))];

  return {
    ...state,
    phase: 'playing',
    cars,
    turn: state.first,
    clock: { ...state.clock, running: true },
    log: [...log, `남은 자리에 ${TEAM_NAME[second]} 자동차 자동 배치 — 게임 시작!`],
  };
}

function move(state: GameState, carId: string, dir: Dir): GameState {
  if (state.phase !== 'playing' || state.clock.timeoutBy) return state;
  const car = state.cars.find((c) => c.id === carId);
  if (!car || !isSelectable(state, car)) return state;
  const res = slide(state.cars, car, dir);
  if (!res) return state;

  const mover = state.turn;
  const escaped = { ...state.escaped };
  let cars: Car[];
  let entry = `${TEAM_NAME[mover]}: ${car.owner === 'neutral' ? '중립 차' : '자기 차'} ${DIR_NAME[dir]} 이동`;
  if (res.escapes) {
    cars = state.cars.filter((c) => c.id !== carId);
    escaped[mover] += 1;
    entry += ` → 탈출! (${escaped[mover]}/${ESCAPES_TO_WIN})`;
  } else {
    cars = state.cars.map((c) => (c.id === carId ? { ...c, pos: res.to } : c));
  }

  let next: GameState = {
    ...state,
    cars,
    escaped,
    lastMovedId: carId,
    turn: other(mover),
    log: [...state.log, entry],
  };

  if (escaped[mover] >= ESCAPES_TO_WIN) {
    return {
      ...next,
      phase: 'finished',
      winner: mover,
      clock: { ...next.clock, running: false },
      log: [...next.log, `${TEAM_NAME[mover]} 승리!`],
    };
  }

  // 다음 팀이 움직일 수 있는 타일이 없으면 차례를 넘기고, 양 팀 모두 없으면 교착
  if (!hasAnyMove(next, next.turn)) {
    if (!hasAnyMove(next, mover)) {
      return {
        ...next,
        phase: 'finished',
        winner: null,
        clock: { ...next.clock, running: false },
        log: [...next.log, '양 팀 모두 움직일 수 없음 — 교착(무승부)'],
      };
    }
    next = {
      ...next,
      turn: mover,
      log: [...next.log, `${TEAM_NAME[next.turn]}: 움직일 수 있는 타일이 없어 차례를 넘김`],
    };
  }
  return next;
}

function tick(state: GameState, ms: number): GameState {
  const { clock } = state;
  if (state.phase !== 'playing' || !clock.running || clock.timeoutBy) return state;
  const remainingMs = clock.remainingMs - ms;
  if (remainingMs > 0) return { ...state, clock: { ...clock, remainingMs } };
  return {
    ...state,
    clock: { ...clock, index: clock.index + 1, remainingMs: BOUT_MS },
    log: [...state.log, `1분 경과 — ${clock.index + 2}번째 주자로 교체`],
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START':
      return {
        ...createInitialState(),
        phase: 'placement',
        first: action.first,
        turn: action.first,
        log: [`${TEAM_NAME[action.first]} 선공. ${TEAM_NAME[other(action.first)]}이 상대 자동차 3대의 위치를 정합니다.`],
      };
    case 'PLACE':
      return place(state, action.slotIndex);
    case 'MOVE':
      return move(state, action.carId, action.dir);
    case 'TICK':
      return tick(state, action.ms);
    case 'TOGGLE_CLOCK':
      if (state.phase !== 'playing' || state.clock.timeoutBy) return state;
      return { ...state, clock: { ...state.clock, running: !state.clock.running } };
    case 'TIMEOUT':
      if (state.phase !== 'playing' || state.timeoutUsed[action.team] || state.clock.timeoutBy) return state;
      return {
        ...state,
        clock: { ...state.clock, timeoutBy: action.team },
        timeoutUsed: { ...state.timeoutUsed, [action.team]: true },
        log: [...state.log, `${TEAM_NAME[action.team]} 타임아웃 — 팀원 전원 소통 가능`],
      };
    case 'RESUME':
      if (!state.clock.timeoutBy) return state;
      return { ...state, clock: { ...state.clock, timeoutBy: null }, log: [...state.log, '타임아웃 종료'] };
    case 'RESET':
      return createInitialState();
  }
}
