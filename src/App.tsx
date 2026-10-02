import { useCallback, useEffect, useReducer, useState } from 'react';
import { Board } from './components/Board';
import { SetupScreen } from './components/SetupScreen';
import { SidePanel } from './components/SidePanel';
import { createInitialState, reducer } from './game/reducer';
import type { Dir } from './game/types';

const KEY_DIR: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ticking = state.phase === 'playing' && state.clock.running && !state.clock.timeoutBy;
  useEffect(() => {
    if (!ticking) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'TICK', ms: now - last });
      last = now;
    }, 200);
    return () => clearInterval(id);
  }, [ticking]);

  const move = useCallback((carId: string, dir: Dir) => {
    dispatch({ type: 'MOVE', carId, dir });
    setSelectedId(null);
  }, []);

  // 선택된 차가 있으면 방향키로도 이동
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setSelectedId(null);
      const dir = KEY_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      move(selectedId, dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, move]);

  if (state.phase === 'setup') {
    return <SetupScreen onStart={(first) => dispatch({ type: 'START', first })} />;
  }

  return (
    <div className="game">
      <Board
        state={state}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={move}
        onPlace={(slotIndex) => dispatch({ type: 'PLACE', slotIndex })}
      />
      <SidePanel
        state={state}
        dispatch={(action) => {
          if (action.type === 'RESET') setSelectedId(null);
          dispatch(action);
        }}
      />
    </div>
  );
}
