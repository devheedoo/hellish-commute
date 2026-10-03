import { TEAM_NAME } from '../game/reducer';
import type { Team } from '../game/types';

interface Props {
  onStart: (first: Team) => void;
}

export function SetupScreen({ onStart }: Props) {
  return (
    <div className="setup">
      <h1>지옥의 출근길</h1>
      <p className="subtitle">피의 게임X 데스매치 · 2인 로컬 대전</p>

      <ul className="rules">
        <li>14×14 도로 위에서 우리 팀 자동차 <b>4대 중 3대</b>를 먼저 판 밖으로 탈출시키면 승리.</li>
        <li>내 차례에는 <b>우리 팀 차</b> 또는 <b>직전에 움직이지 않은 중립 차량</b> 하나를 골라 이동합니다.</li>
        <li>자동차는 2칸, 버스는 3칸. 차량은 <b>길이 방향(앞/뒤)으로만</b> 다른 차량이나 구조물에 막힐 때까지 미끄러집니다.</li>
        <li>가장자리에 닿은 팀 차는 탈출!</li>
        <li>시작 전, 후공 팀이 선공 팀 차 3대의 위치를 정하고 선공 팀이 자기 마지막 1대를 놓습니다.</li>
        <li>1분마다 다음 주자로 교체되며, 팀마다 한 번 타임아웃을 쓸 수 있습니다.</li>
      </ul>

      <p>머니 챌린지 상위 팀이 선공 팀을 고르세요.</p>
      <div className="row">
        {(['A', 'B'] as Team[]).map((t) => (
          <button key={t} className={`big team-${t}`} onClick={() => onStart(t)}>
            {TEAM_NAME[t]} 선공
          </button>
        ))}
      </div>
    </div>
  );
}
