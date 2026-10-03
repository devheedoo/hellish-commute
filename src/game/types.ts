export type Team = 'A' | 'B';
export type Owner = Team | 'neutral';
export type Dir = 'up' | 'down' | 'left' | 'right';
/** 자동차 2칸, 버스 3칸 */
export type Kind = 'car' | 'bus';
/** h: 가로로 놓여 좌우로만, v: 세로로 놓여 상하로만 이동 */
export type Axis = 'h' | 'v';

export interface Pos {
  r: number;
  c: number;
}

export interface Vehicle {
  id: string;
  owner: Owner;
  kind: Kind;
  axis: Axis;
  /** 맨 위(세로) 또는 맨 왼쪽(가로) 칸 */
  pos: Pos;
}

export type Phase = 'setup' | 'placement' | 'playing' | 'finished';

export interface BoutClock {
  /** 0부터 시작하는 출전 순번. 1분이 지날 때마다 다음 주자로 교체된다. */
  index: number;
  remainingMs: number;
  running: boolean;
  /** 타임아웃을 건 팀. null이면 타임아웃 중이 아님. */
  timeoutBy: Team | null;
}

export interface GameState {
  phase: Phase;
  /** 선공 팀 */
  first: Team;
  vehicles: Vehicle[];
  turn: Team;
  /** 직전 차례에 움직인 타일. 중립 타일은 직전에 움직였다면 다시 움직일 수 없다. */
  lastMovedId: string | null;
  escaped: Record<Team, number>;
  /** null + phase 'finished' 이면 교착(무승부) */
  winner: Team | null;
  clock: BoutClock;
  timeoutUsed: Record<Team, boolean>;
  log: string[];
}

export type Action =
  | { type: 'START'; first: Team }
  | { type: 'PLACE'; slotIndex: number }
  | { type: 'MOVE'; vehicleId: string; dir: Dir }
  | { type: 'TICK'; ms: number }
  | { type: 'TOGGLE_CLOCK' }
  | { type: 'TIMEOUT'; team: Team }
  | { type: 'RESUME' }
  | { type: 'RESET' };
