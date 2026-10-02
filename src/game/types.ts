export type Team = 'A' | 'B';
export type Owner = Team | 'neutral';
export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Pos {
  r: number;
  c: number;
}

export interface Car {
  id: string;
  owner: Owner;
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
  cars: Car[];
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
  | { type: 'MOVE'; carId: string; dir: Dir }
  | { type: 'TICK'; ms: number }
  | { type: 'TOGGLE_CLOCK' }
  | { type: 'TIMEOUT'; team: Team }
  | { type: 'RESUME' }
  | { type: 'RESET' };
