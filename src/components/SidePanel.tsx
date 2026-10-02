import type { Dispatch } from 'react';
import { CARS_PER_TEAM, ESCAPES_TO_WIN, other } from '../game/board';
import { placementActor, TEAM_NAME } from '../game/reducer';
import type { Action, GameState, Team } from '../game/types';

interface Props {
  state: GameState;
  dispatch: Dispatch<Action>;
}

const TEAMS: Team[] = ['A', 'B'];

function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function SidePanel({ state, dispatch }: Props) {
  const { clock } = state;

  return (
    <aside className="panel">
      <Status state={state} />

      <section className="scores">
        {TEAMS.map((t) => (
          <div key={t} className={`score team-${t}`}>
            <span className="team-label">
              {TEAM_NAME[t]} {t === state.first ? '(선공)' : '(후공)'}
            </span>
            <span className="pips" aria-label={`${state.escaped[t]}대 탈출`}>
              {Array.from({ length: CARS_PER_TEAM }, (_, i) => (
                <span key={i} className={`pip${i < state.escaped[t] ? ' on' : ''}${i === ESCAPES_TO_WIN - 1 ? ' goal' : ''}`} />
              ))}
            </span>
          </div>
        ))}
      </section>

      {(state.phase === 'playing' || state.phase === 'finished') && (
        <section className="clock">
          <div className="clock-time">{formatMs(clock.remainingMs)}</div>
          <div className="clock-sub">{clock.index + 1}번째 주자 출전 중</div>
          {state.phase === 'playing' && (
            <div className="row">
              {clock.timeoutBy ? (
                <button onClick={() => dispatch({ type: 'RESUME' })}>타임아웃 종료</button>
              ) : (
                <>
                  <button onClick={() => dispatch({ type: 'TOGGLE_CLOCK' })}>
                    {clock.running ? '일시정지' : '재개'}
                  </button>
                  {TEAMS.map((t) => (
                    <button
                      key={t}
                      className={`team-${t}`}
                      disabled={state.timeoutUsed[t]}
                      onClick={() => dispatch({ type: 'TIMEOUT', team: t })}
                    >
                      {TEAM_NAME[t]} 타임아웃
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </section>
      )}

      <section className="log">
        <h3>기록</h3>
        <ol>
          {state.log
            .slice(-10)
            .reverse()
            .map((line, i) => (
              <li key={state.log.length - i}>{line}</li>
            ))}
        </ol>
      </section>

      <button className="reset" onClick={() => confirm('처음부터 다시 시작할까요?') && dispatch({ type: 'RESET' })}>
        처음으로
      </button>
    </aside>
  );
}

function Status({ state }: { state: GameState }) {
  switch (state.phase) {
    case 'placement': {
      const actor = placementActor(state);
      const target = actor === state.first ? '자기 팀의 마지막 자동차 1대' : `${TEAM_NAME[state.first]} 자동차 3대`;
      return (
        <div className={`status team-${actor}`}>
          <strong>{TEAM_NAME[actor]}</strong> 차례 — {target}를 놓을 시작 위치를 고르세요.
          <small>남은 자리는 {TEAM_NAME[other(state.first)]} 자동차로 자동 배치됩니다.</small>
        </div>
      );
    }
    case 'playing':
      if (state.clock.timeoutBy) {
        return (
          <div className={`status team-${state.clock.timeoutBy}`}>
            <strong>{TEAM_NAME[state.clock.timeoutBy]} 타임아웃</strong> — 모든 팀원이 소통할 수 있습니다.
          </div>
        );
      }
      return (
        <div className={`status team-${state.turn}`}>
          <strong>{TEAM_NAME[state.turn]}</strong> 차례 — 자기 팀 차 또는 중립 차를 골라 이동하세요.
        </div>
      );
    case 'finished':
      return (
        <div className={`status ${state.winner ? `team-${state.winner}` : ''}`}>
          <strong>{state.winner ? `${TEAM_NAME[state.winner]} 승리!` : '교착 — 무승부'}</strong>
        </div>
      );
    default:
      return null;
  }
}
