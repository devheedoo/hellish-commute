import { type CSSProperties, useRef } from 'react';
import { type Footprint, isEdge, LENGTH, SIZE, SLOTS, STRUCTURES } from '../game/board';
import { isSlotFree } from '../game/reducer';
import { DIRS, isSelectable, movesFor } from '../game/rules';
import type { Dir, GameState, LastMove, Vehicle } from '../game/types';
import { useEscapeAnimation, useSlideAnimation } from './slideAnimation';

interface Props {
  state: GameState;
  selectedId: string | null;
  onSelect: (vehicleId: string | null) => void;
  onMove: (vehicleId: string, dir: Dir) => void;
  onPlace: (slotIndex: number) => void;
}

const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' };

/** 차량 크기만큼 그리드 칸을 차지하도록 배치 */
function area({ kind, axis, pos }: Footprint): CSSProperties {
  const len = LENGTH[kind];
  return {
    gridRow: axis === 'v' ? `${pos.r + 1} / span ${len}` : `${pos.r + 1}`,
    gridColumn: axis === 'h' ? `${pos.c + 1} / span ${len}` : `${pos.c + 1}`,
  };
}

export function Board({ state, selectedId, onSelect, onMove, onPlace }: Props) {
  const playing = state.phase === 'playing' && !state.clock.timeoutBy;
  const selected = playing ? state.vehicles.find((v) => v.id === selectedId) : undefined;
  const moves = selected ? movesFor(state, selected) : {};

  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const classes = ['cell'];
      if (isEdge({ r, c })) classes.push('edge');
      if (STRUCTURES.has(`${r},${c}`)) classes.push('structure');
      cells.push(<div key={`${r},${c}`} className={classes.join(' ')} style={{ gridRow: r + 1, gridColumn: c + 1 }} />);
    }
  }

  return (
    <div className="board">
      {cells}

      {state.phase === 'placement' &&
        SLOTS.map(
          (slot, i) =>
            isSlotFree(state, i) && (
              <button
                key={`slot${i}`}
                className={`slot team-${state.first}`}
                style={area(slot)}
                onClick={() => onPlace(i)}
                aria-label={`시작 위치 ${i + 1}`}
              />
            ),
        )}

      {state.vehicles.map((v) => (
        <VehicleTile
          key={v.id}
          vehicle={v}
          selectable={playing && isSelectable(state, v)}
          selected={v.id === selectedId}
          locked={v.owner === 'neutral' && v.id === state.lastMovedId}
          onClick={() => onSelect(v.id === selectedId ? null : v.id)}
        />
      ))}

      {state.lastMove?.escaped && <EscapingVehicle key={state.lastMove.seq} move={state.lastMove} />}

      {selected &&
        DIRS.map((dir) => {
          const res = moves[dir];
          if (!res) return null;
          return (
            <button
              key={dir}
              className={`target team-${state.turn}${res.escapes ? ' escape' : ''}`}
              style={area({ ...selected, pos: res.to })}
              onClick={() => onMove(selected.id, dir)}
              aria-label={`${dir}로 이동`}
            >
              {res.escapes ? 'EXIT' : ARROW[dir]}
            </button>
          );
        })}
    </div>
  );
}

interface VehicleTileProps {
  vehicle: Vehicle;
  selectable: boolean;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}

function VehicleTile({ vehicle, selectable, selected, locked, onClick }: VehicleTileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useSlideAnimation(ref, vehicle.pos);
  const classes = ['vehicle', vehicle.kind, vehicle.axis, vehicle.owner === 'neutral' ? 'neutral' : `team-${vehicle.owner}`];
  if (selectable) classes.push('selectable');
  if (selected) classes.push('selected');
  return (
    <button
      ref={ref}
      className={classes.join(' ')}
      style={area(vehicle)}
      disabled={!selectable}
      onClick={onClick}
      title={locked ? '직전에 움직인 중립 차량 — 이번 차례에는 움직일 수 없음' : undefined}
    >
      {locked ? '🔒' : vehicle.kind === 'bus' ? '🚌' : '🚗'}
    </button>
  );
}

/** 탈출해 상태에서 사라진 차량을 잠깐 그려 판 밖으로 빠져나가는 모습을 보여준다 */
function EscapingVehicle({ move }: { move: LastMove }) {
  const ref = useRef<HTMLDivElement>(null);
  const { vehicle, to, dir } = move;
  useEscapeAnimation(ref, vehicle.pos, to, dir, LENGTH[vehicle.kind]);
  return (
    <div
      ref={ref}
      className={`vehicle escaping ${vehicle.kind} ${vehicle.axis} team-${vehicle.owner}`}
      style={area({ ...vehicle, pos: to })}
      aria-hidden
    >
      🚗
    </div>
  );
}
