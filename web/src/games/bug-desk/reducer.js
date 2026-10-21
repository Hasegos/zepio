import { ACTION_IDS } from "./rules.js";
import { DAYS, judge, MAX_METER, PER_DAY } from "./engine.js";

/**
 * 시작 전 상태를 만든다.
 *
 * @returns 시작 화면 상태
 */
export function initialState() {
  return {
    phase: "intro",
    days: [],
    day: 0,
    index: 0,
    chosen: null,
    trust: MAX_METER,
    energy: MAX_METER,
    results: [],
    startedAt: 0,
    finishedAt: 0,
  };
}

/**
 * 게이지를 0 이상 최댓값 이하로 맞춘다.
 *
 * @param value 게이지 값
 * @returns 맞춘 값
 */
function clamp(value) {
  return Math.max(0, Math.min(MAX_METER, value));
}

/**
 * 한 판의 진행 상태를 전이한다. 시간은 action.now로만 받아 순수하게 유지한다.
 * 상태에 맞지 않는 action은 같은 state를 그대로 돌려준다.
 *
 * @param state 현재 상태
 * @param action start(days, now), open, choose(action), next(now), continue, back 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "start":
      return { ...initialState(), phase: "brief", days: action.days, startedAt: action.now };
    case "open":
      return state.phase === "brief" ? { ...state, phase: "playing", index: 0, chosen: null } : state;
    case "choose": {
      if (state.phase !== "playing" || state.chosen !== null || !ACTION_IDS.includes(action.action)) return state;
      const report = state.days[state.day][state.index];
      const outcome = judge(report, action.action, state.day + 1);
      return {
        ...state,
        chosen: action.action,
        trust: clamp(state.trust + outcome.trust),
        energy: clamp(state.energy + outcome.energy),
        results: [...state.results, { id: report.id, chosen: action.action, correct: outcome.correct, ok: outcome.ok }],
      };
    }
    case "next": {
      if (state.phase !== "playing" || state.chosen === null) return state;
      if (state.index < PER_DAY - 1) return { ...state, index: state.index + 1, chosen: null };
      if (state.day === DAYS - 1) return { ...state, phase: "result", finishedAt: action.now };
      return { ...state, phase: "summary" };
    }
    case "continue":
      return state.phase === "summary" ? { ...state, phase: "brief", day: state.day + 1, index: 0, chosen: null } : state;
    case "back":
      return initialState();
    default:
      return state;
  }
}

/**
 * 맞힌 접수 건의 개수를 센다.
 *
 * @param state 현재 상태
 * @returns 맞힌 개수
 */
export function totalScore(state) {
  return state.results.filter((result) => result.ok).length;
}

/**
 * 한 날의 맞힌 개수를 센다.
 *
 * @param state 현재 상태
 * @param day 날짜 번호(0부터)
 * @returns 맞힌 개수
 */
export function dayScore(state, day) {
  return state.results.slice(day * PER_DAY, (day + 1) * PER_DAY).filter((result) => result.ok).length;
}