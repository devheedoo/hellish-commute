import { isEdge, key, SIZE, SLOTS, STRUCTURES } from '../game/board';
import { isSlotFree } from '../game/reducer';
import { DIRS, isSelectable, movesFor } from '../game/rules';
import type { Car, Dir, GameState } from '../game/types';

interface Props {
  state: GameState;
  selectedId: string | null;
  onSelect: (carId: string | null) => void;
  onMove: (carId: string, dir: Dir) => void;
  onPlace: (slotIndex: number) => void;
}

const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' };

export function Board({ state, selectedId, onSelect, onMove, onPlace }: Props) {
  const carAt = new Map<string, Car>(state.cars.map((c) => [key(c.pos), c]));
  const slotAt = new Map<string, number>(SLOTS.map((s, i) => [key(s), i]));
  const playing = state.phase === 'playing' && !state.clock.timeoutBy;

  const selected = playing ? state.cars.find((c) => c.id === selectedId) : undefined;
  const targets = new Map<string, { dir: Dir; escapes: boolean }>();
  if (selected) {
    const moves = movesFor(state, selected);
    for (const dir of DIRS) {
      const res = moves[dir];
      if (res) targets.set(key(res.to), { dir, escapes: res.escapes });
    }
  }

  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const k = `${r},${c}`;
      const car = carAt.get(k);
      const slotIndex = slotAt.get(k);
      const target = targets.get(k);
      const placeable = state.phase === 'placement' && slotIndex !== undefined && isSlotFree(state, slotIndex);

      const classes = ['cell'];
      if (isEdge({ r, c })) classes.push('edge');
      if (STRUCTURES.has(k)) classes.push('structure');
      if (slotIndex !== undefined) classes.push('slot');
      if (placeable) classes.push(`placeable team-${state.first}`);

      cells.push(
        <div
          key={k}
          className={classes.join(' ')}
          onClick={placeable ? () => onPlace(slotIndex) : undefined}
        >
          {car && (
            <CarTile
              car={car}
              selectable={playing && isSelectable(state, car)}
              selected={car.id === selectedId}
              locked={car.owner === 'neutral' && car.id === state.lastMovedId}
              onClick={() => onSelect(car.id === selectedId ? null : car.id)}
            />
          )}
          {target && selected && (
            <button
              className={`target team-${state.turn}${target.escapes ? ' escape' : ''}`}
              onClick={() => onMove(selected.id, target.dir)}
              aria-label={`${target.dir}로 이동`}
            >
              {target.escapes ? 'EXIT' : ARROW[target.dir]}
            </button>
          )}
        </div>,
      );
    }
  }

  return <div className="board">{cells}</div>;
}

interface CarTileProps {
  car: Car;
  selectable: boolean;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}

function CarTile({ car, selectable, selected, locked, onClick }: CarTileProps) {
  const classes = ['car', car.owner === 'neutral' ? 'neutral' : `team-${car.owner}`];
  if (selectable) classes.push('selectable');
  if (selected) classes.push('selected');
  return (
    <button
      className={classes.join(' ')}
      disabled={!selectable}
      onClick={onClick}
      title={locked ? '직전에 움직인 중립 차 — 이번 차례에는 움직일 수 없음' : undefined}
    >
      {locked ? '🔒' : '🚗'}
    </button>
  );
}
