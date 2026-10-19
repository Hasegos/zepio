import { advance, buyStation, buyUpgrade, hireStaff, initialState as initialEconomy, settleSales, STATIONS, UPGRADES } from "./economy.js";
import { parseSave } from "./save.js";
import { assistSimulation, initialSimulation, restoreSimulation, stepSimulation } from "./simulation.js";

export const AWAY_MIN_MS = 60_000;

/** 경제와 영업 상태를 만들고 시각은 호출하는 쪽에서 받는다. */
export function initialState(now) {
  const econ = initialEconomy(now);
  return { econ, sim: initialSimulation(econ), away: null, goalOpen: false, notice: "", noticeId: 0 };
}

/** 온라인은 전달 완료 주문만, 복귀는 오프라인 수익을 한 번만 정산한다. */
function settle(state, now, offline = false) {
  const elapsed = Math.max(0, now - state.econ.lastAt);
  let econ;
  let sim = state.sim;
  let away = state.away;
  if (offline || elapsed > 30000) {
    const result = advance(state.econ, now);
    econ = result.state;
    if (result.elapsed >= AWAY_MIN_MS && result.earned > 0) away = { earned: result.earned, ms: result.elapsed };
    if (elapsed >= AWAY_MIN_MS) {
      sim = { ...initialSimulation(econ), served: sim.served, tips: sim.tips, lost: sim.lost, revenue: sim.revenue, nextId: sim.nextId };
    }
  } else {
    const result = stepSimulation(sim, state.econ, elapsed);
    sim = result.sim;
    econ = { ...settleSales(state.econ, result.earned, now), lastAt: now };
  }
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
    case "priority": {
      const next = settle(state, action.now);
      if (!next.sim.guests.some((g) => g.id === action.id && g.status === "waiting")) return next;
      return { ...next, sim: { ...next.sim, guests: next.sim.guests.map((g) => ({ ...g, priority: g.id === action.id })) }, notice: `${action.id}번 주문을 다음에 처리해요`, noticeId: next.noticeId + 1 };
    }
    case "tap": {
      const next = settle(state, action.now);
      const busy = next.sim.workers.some((w) => w.phase !== "idle");
      return { ...next, sim: assistSimulation(next.sim, next.econ), notice: busy ? "작업을 도왔어요" : "손님이 오면 주인이 자동으로 주문을 받아요", noticeId: next.noticeId + 1 };
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
