import { advance, buyStation, buyUpgrade, hireStaff, initialState as initialEconomy, assignManager, incomePerSecond, settleSales, tapValue, STATIONS, UPGRADES } from "./economy.js";
import { parseSave } from "./save.js";
import { initialSimulation, restoreSimulation, stepSimulation } from "./simulation.js";

export const AWAY_MIN_MS = 60_000;

/** 경제와 영업 상태를 만들고 시각은 호출하는 쪽에서 받는다. */
export function initialState(now) {
  const econ = initialEconomy(now);
  return { econ, sim: initialSimulation(econ), away: null, goalOpen: false, notice: "", noticeId: 0 };
}

/** 온라인과 복귀의 자동 생산을 같은 시간 기준으로 정산한다. */
function settle(state, now, offline = false) {
  const elapsed = Math.max(0, now - state.econ.lastAt);
  const result = advance(state.econ, now);
  const econ = result.state;
  const sim = stepSimulation(state.sim, econ, offline ? 0 : Math.min(elapsed, 30000)).sim;
  let away = state.away;
  if (offline && result.elapsed >= AWAY_MIN_MS && result.earned > 0) away = { earned: result.earned, ms: result.elapsed };
  return { ...state, econ, sim, away, goalOpen: state.goalOpen || (state.econ.goalAt === 0 && econ.goalAt > 0) };
}

/** 구매 결과의 안내를 갱신한다. */
function bought(state, econ, done) {
  return { ...state, econ, notice: econ === state.econ ? "코인이 모자라요" : done, noticeId: state.noticeId + 1 };
}

/** 조작과 영업 및 저장 복구를 단일 상태 전이로 처리한다. */
export function reducer(state, action) {
  switch (action.type) {
    case "load": {
      const { service, ...econ } = parseSave(action.data, action.now);
      return settle({ ...initialState(action.now), econ, sim: restoreSimulation(service, econ) }, action.now, true);
    }
    case "tick": return settle(state, action.now);
    case "resume": return settle(state, action.now, true);
    case "manager": {
      const next = settle(state, action.now);
      return { ...next, econ: assignManager(next.econ, action.id), notice: "매니저 배치를 변경했어요", noticeId: next.noticeId + 1 };
    }
    case "tap": {
      const next = settle(state, action.now);
      if (action.now - (next.econ.lastCheer || 0) < 10000) return { ...next, notice: "마을 응원은 10초마다 할 수 있어요" };
      const amount = Math.max(1, incomePerSecond(next.econ) * 5) * tapValue(next.econ);
      const econ = { ...settleSales(next.econ, amount, action.now), lastCheer: action.now };
      return { ...next, econ, goalOpen: next.goalOpen || (!next.econ.goalAt && econ.goalAt > 0), notice: "주민들의 응원! 5초 생산 보너스", noticeId: next.noticeId + 1 };
    }
    case "station": {
      const next = settle(state, action.now);
      const econ = buyStation(next.econ, action.id);
      const name = STATIONS.find((s) => s.id === action.id)?.name ?? "";
      return bought(next, econ, `${name} ${econ.levels[action.id]}레벨`);
    }
    case "hire": {
      const next = settle(state, action.now);
      const econ = hireStaff(next.econ);
      return bought(next, econ, `직원 ${econ.staff}명 고용`);
    }
    case "upgrade": {
      const next = settle(state, action.now);
      const name = UPGRADES.find((u) => u.id === action.id)?.name ?? "";
      return bought(next, buyUpgrade(next.econ, action.id), `${name} 구매`);
    }
    case "dismissAway": return { ...state, away: null };
    case "closeGoal": return { ...state, goalOpen: false };
    case "reset": return initialState(action.now);
    default: return state;
  }
}
