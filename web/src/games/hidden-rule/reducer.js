import { GUESS_LIMIT, scoreOf, TEST_LIMIT, testCard } from "./engine.js";

/**
 * 시작 전 상태를 만든다.
 *
 * @returns 시작 화면 상태
 */
export function initialState() {
  return {
    phase: "intro",
    rounds: [],
    index: 0,
    tests: [],
    selected: null,
    wrongs: [],
    revealed: false,
    results: [],
    startedAt: 0,
    finishedAt: 0,
  };
}

/**
 * 새 라운드를 시작할 때 라운드별 값을 비운 상태를 돌려준다.
 *
 * @param state 현재 상태
 * @returns 라운드 값을 비운 상태
 */
function clearRound(state) {
  return { ...state, tests: [], selected: null, wrongs: [], revealed: false };
}

/**
 * 한 판의 진행 상태를 전이한다. 시간은 action.now로만 받아 순수하게 유지한다.
 * 상태에 맞지 않는 action은 같은 state를 그대로 돌려준다.
 *
 * @param state 현재 상태
 * @param action start(rounds, now), test(card), select(option), submit, next(now), back 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  const playing = state.phase === "playing" && !state.revealed;
  const round = state.rounds[state.index];
  switch (action.type) {
    case "start":
      return { ...initialState(), phase: "playing", rounds: action.rounds, startedAt: action.now };
    case "test": {
      if (!playing || state.tests.length >= TEST_LIMIT) return state;
      if (!round.tray.includes(action.card) || state.tests.some((test) => test.card === action.card)) return state;
      return { ...state, tests: [...state.tests, { card: action.card, pass: testCard(round, action.card) }] };
    }
    case "select": {
      if (!playing || !Number.isInteger(action.option) || action.option < 0 || action.option >= round.candidates.length) return state;
      if (state.wrongs.includes(action.option)) return state;
      return { ...state, selected: action.option };
    }
    case "submit": {
      if (!playing || state.selected === null) return state;
      if (state.selected === round.answer) {
        const score = scoreOf(state.tests.length, state.wrongs.length, true);
        const status = state.wrongs.length === 0 ? "ok" : "retry";
        return { ...state, revealed: true, results: [...state.results, { score, status, tests: state.tests.length }] };
      }
      const wrongs = [...state.wrongs, state.selected];
      if (wrongs.length >= GUESS_LIMIT) {
        return { ...state, wrongs, selected: null, revealed: true, results: [...state.results, { score: 0, status: "fail", tests: state.tests.length }] };
      }
      return { ...state, wrongs, selected: null };
    }
    case "next": {
      if (state.phase !== "playing" || !state.revealed) return state;
      if (state.index === state.rounds.length - 1) return { ...state, phase: "result", finishedAt: action.now };
      return { ...clearRound(state), index: state.index + 1 };
    }
    case "back":
      return initialState();
    default:
      return state;
  }
}

/**
 * 끝난 라운드들의 점수 합을 구한다.
 *
 * @param state 현재 상태
 * @returns 점수 합
 */
export function totalScore(state) {
  return state.results.reduce((sum, result) => sum + result.score, 0);
}