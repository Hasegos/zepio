import { KIND_IDS, VILLAGERS } from "./village.js";
import { TURNS } from "./sim.js";
import { evaluate, PICKS, ROUNDS, validPlan } from "./engine.js";

/**
 * 시작 전 상태를 만든다.
 *
 * @returns 시작 화면 상태
 */
export function initialState() {
  return {
    phase: "intro",
    rounds: [],
    round: 0,
    kind: KIND_IDS[0],
    picks: [],
    outcome: null,
    turn: 0,
    results: [],
    startedAt: 0,
    finishedAt: 0,
  };
}

/**
 * 한 판의 진행 상태를 전이한다. 시간은 action.now로만 받아 순수하게 유지한다.
 * 상태에 맞지 않는 action은 같은 state를 그대로 돌려준다.
 *
 * @param state 현재 상태
 * @param action start(rounds, now), pick(person), kind(kind), launch, tick, skip, next(now), back 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  const round = state.rounds[state.round];
  switch (action.type) {
    case "start":
      return { ...initialState(), phase: "plan", rounds: action.rounds, startedAt: action.now };
    case "pick": {
      if (state.phase !== "plan" || !Number.isInteger(action.person) || action.person < 0 || action.person >= VILLAGERS) return state;
      if (state.picks.includes(action.person)) return { ...state, picks: state.picks.filter((person) => person !== action.person) };
      if (state.picks.length >= PICKS || (round.type === "stop" && round.starters.includes(action.person))) return state;
      return { ...state, picks: [...state.picks, action.person] };
    }
    case "kind":
      return state.phase === "plan" && round.type === "spread" && KIND_IDS.includes(action.kind) ? { ...state, kind: action.kind } : state;
    case "launch": {
      const plan = { kind: state.kind, picks: state.picks };
      if (state.phase !== "plan" || !validPlan(round, plan)) return state;
      return { ...state, phase: "play", outcome: evaluate(round, plan), turn: 0 };
    }
    case "tick":
      return state.phase === "play" && state.turn < TURNS ? { ...state, turn: state.turn + 1 } : state;
    case "skip":
      return state.phase === "play" ? { ...state, turn: TURNS } : state;
    case "next": {
      if (state.phase !== "play" || state.turn < TURNS) return state;
      const results = [...state.results, { kind: state.kind, picks: state.picks, value: state.outcome.value, stars: state.outcome.stars }];
      if (state.round === ROUNDS - 1) return { ...state, results, phase: "result", finishedAt: action.now };
      return { ...state, results, phase: "plan", round: state.round + 1, kind: KIND_IDS[0], picks: [], outcome: null, turn: 0 };
    }
    case "back":
      return initialState();
    default:
      return state;
  }
}

/**
 * 지금까지 얻은 별의 합을 센다.
 *
 * @param state 현재 상태
 * @returns 별 개수
 */
export function totalStars(state) {
  return state.results.reduce((sum, result) => sum + result.stars, 0);
}