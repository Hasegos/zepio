import { advance, buy, collect, newGame, starsOf } from "./engine.js";

/**
 * 시작 전 상태를 만든다.
 *
 * @returns 시작 화면 상태
 */
export function initialState() {
  return { phase: "intro", run: null, sim: null, startedAt: 0, finishedAt: 0 };
}

/**
 * 한 판의 진행 상태를 전이한다. 시간은 action.now로만 받아 순수하게 유지한다.
 * 상태에 맞지 않는 action은 같은 state를 그대로 돌려준다.
 *
 * @param state 현재 상태
 * @param action start(run, now), launch(ai, start, diff), buy(id), collect(id), tick(now), back 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "start":
      return { ...initialState(), phase: "setup", run: action.run, startedAt: action.now };
    case "launch": {
      if (state.phase !== "setup") return state;
      const sim = newGame(state.run, action.ai, action.start, action.diff);
      return sim ? { ...state, phase: "play", sim } : state;
    }
    case "buy": {
      if (state.phase !== "play") return state;
      const sim = buy(state.sim, action.id);
      return sim === state.sim ? state : { ...state, sim };
    }
    case "collect": {
      if (state.phase !== "play") return state;
      const sim = collect(state.sim, action.id);
      return sim === state.sim ? state : { ...state, sim };
    }
    case "tick": {
      if (state.phase !== "play") return state;
      const sim = advance(state.run, state.sim);
      return sim.over ? { ...state, sim, phase: "result", finishedAt: action.now } : { ...state, sim };
    }
    case "back":
      return initialState();
    default:
      return state;
  }
}

/**
 * 끝난 판의 별 개수를 돌려준다.
 *
 * @param state 현재 상태
 * @returns 0~3, 아직 끝나지 않았으면 0
 */
export function resultStars(state) {
  return state.sim ? starsOf(state.sim) : 0;
}