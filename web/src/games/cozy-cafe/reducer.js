import {
  advance,
  buyStation,
  buyUpgrade,
  hireStaff,
  initialState as initialEconomy,
  STATIONS,
  tap,
  UPGRADES,
} from "./economy.js";
import { parseSave } from "./save.js";

/** 이 시간(밀리초) 이상 지난 만큼의 수익은 "자리를 비운 동안의 수익"으로 알린다. */
export const AWAY_MIN_MS = 60_000;

/**
 * 화면 상태를 만든다. econ만 저장되고 나머지는 화면에서만 쓰는 값이다.
 *
 * @param now 현재 시각(밀리초)
 * @returns { econ, away, goalOpen, notice, noticeId }
 */
export function initialState(now) {
  return { econ: initialEconomy(now), away: null, goalOpen: false, notice: "", noticeId: 0 };
}

/**
 * 시간 경과를 반영하고, 오래 비운 만큼이면 안내를 띄우며, 목표에 처음 이르면 목표 카드를 연다.
 * 모든 동작이 이 한 경로로 시간을 지급하므로 같은 시간이 두 번 지급되지 않는다.
 *
 * @param state 화면 상태
 * @param now 현재 시각
 * @returns 시간이 반영된 화면 상태
 */
function settle(state, now) {
  const { state: econ, earned, elapsed } = advance(state.econ, now);
  const away = elapsed >= AWAY_MIN_MS && earned > 0 ? { earned, ms: elapsed } : state.away;
  const goalOpen = state.goalOpen || (state.econ.goalAt === 0 && econ.goalAt > 0);
  return { ...state, econ, away, goalOpen };
}

/**
 * 구매 결과를 화면 상태에 반영하고 낭독용 안내를 남긴다.
 *
 * @param state 구매 전 화면 상태
 * @param econ 구매 뒤 진행 상황(같은 객체이면 구매 실패)
 * @param done 성공했을 때의 안내
 * @returns 새 화면 상태
 */
function bought(state, econ, done) {
  const text = econ === state.econ ? "코인이 모자라요" : done;
  return { ...state, econ, notice: text, noticeId: state.noticeId + 1 };
}

/**
 * 화면 상태를 전이한다. 시간은 action.now로만 받아 순수하게 유지한다.
 *
 * @param state 현재 상태
 * @param action load(data), tick, tap, station(id), hire, upgrade(id), dismissAway, closeGoal, reset 중 하나. 모두 now를 가진다
 * @returns 다음 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "load":
      return settle({ ...initialState(action.now), econ: parseSave(action.data, action.now) }, action.now);
    case "tick":
      return settle(state, action.now);
    case "tap": {
      const settled = settle(state, action.now);
      const econ = tap(settled.econ, action.now);
      return { ...settled, econ, goalOpen: settled.goalOpen || (settled.econ.goalAt === 0 && econ.goalAt > 0) };
    }
    case "station": {
      const settled = settle(state, action.now);
      const name = STATIONS.find((s) => s.id === action.id)?.name ?? "";
      const econ = buyStation(settled.econ, action.id);
      return bought(settled, econ, `${name} ${econ.levels[action.id]}레벨`);
    }
    case "hire": {
      const settled = settle(state, action.now);
      const econ = hireStaff(settled.econ);
      return bought(settled, econ, `직원 ${econ.staff}명 고용`);
    }
    case "upgrade": {
      const settled = settle(state, action.now);
      const name = UPGRADES.find((u) => u.id === action.id)?.name ?? "";
      return bought(settled, buyUpgrade(settled.econ, action.id), `${name} 구매`);
    }
    case "dismissAway":
      return { ...state, away: null };
    case "closeGoal":
      return { ...state, goalOpen: false };
    case "reset":
      return initialState(action.now);
    default:
      return state;
  }
}