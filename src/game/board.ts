import type { Car, Pos, Team } from './types';

export const SIZE = 14;
export const CARS_PER_TEAM = 4;
export const ESCAPES_TO_WIN = 3;
export const BOUT_MS = 60_000;
/** 후공 팀이 지정하는 선공 팀 자동차 수 */
export const PLACED_BY_OPPONENT = 3;

/**
 * 방송의 실제 배치도는 공개 자료로 확인되지 않아 자체 설계한 맵.
 * 공정성을 위해 판 중심 기준 180° 회전 대칭으로 구성했다. (board.test.ts에서 검증)
 *
 *   .  빈 칸
 *   #  고정 구조물
 *   N  중립 자동차
 *   S  팀 자동차 시작 위치(8곳, 중앙 구역)
 */
export const LAYOUT: readonly string[] = [
  '..............',
  '...#...#...N..',
  '.N....N....#..',
  '....#.....N...',
  '..N.....#.....',
  '.....#SS#...N.',
  '..N..S##S..#..',
  '..#..S##S..N..',
  '.N...#SS#.....',
  '.....#.....N..',
  '...N.....#....',
  '..#....N....N.',
  '..N...#...#...',
  '..............',
];

export const key = (p: Pos) => `${p.r},${p.c}`;
export const inBounds = (p: Pos) => p.r >= 0 && p.r < SIZE && p.c >= 0 && p.c < SIZE;
export const isEdge = (p: Pos) => p.r === 0 || p.c === 0 || p.r === SIZE - 1 || p.c === SIZE - 1;

function scan(ch: string): Pos[] {
  const out: Pos[] = [];
  LAYOUT.forEach((row, r) => {
    [...row].forEach((cell, c) => {
      if (cell === ch) out.push({ r, c });
    });
  });
  return out;
}

export const STRUCTURES: ReadonlySet<string> = new Set(scan('#').map(key));
export const SLOTS: readonly Pos[] = scan('S');

export function initialNeutralCars(): Car[] {
  return scan('N').map((pos, i) => ({ id: `N${i}`, owner: 'neutral', pos }));
}

export const other = (t: Team): Team => (t === 'A' ? 'B' : 'A');
