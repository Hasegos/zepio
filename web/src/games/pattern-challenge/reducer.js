/**
 * 시작 전 상태를 만든다.
 *
 * @returns 시작 화면 상태
 */
export function initialState() {
  return {
    phase: "intro",
    puzzles: [],
    index: 0,
    selected: null,
    revealed: false,
    answers: [],
    startedAt: 0,
    questionStartedAt: 0,
    finishedAt: 0,
  };
}

/**
 * 한 판의 진행 상태를 전이한다. 시간은 action.now로만 받아 순수하게 유지한다.
 * 상태에 맞지 않는 action은 같은 state를 그대로 돌려준다.
 *
 * @param state 현재 상태
 * @param action start, select, submit, next 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "start":
      return {
        ...initialState(),
        phase: "playing",
        puzzles: action.puzzles,
        startedAt: action.now,
        questionStartedAt: action.now,
      };
    case "select": {
      if (state.phase !== "playing" || state.revealed) return state;
      const count = state.puzzles[state.index].options.length;
      if (!Number.isInteger(action.option) || action.option < 0 || action.option >= count) {
        return state;
      }
      return { ...state, selected: action.option };
    }
    case "submit": {
      if (state.phase !== "playing" || state.revealed || state.selected === null) return state;
      const puzzle = state.puzzles[state.index];
      const answer = {
        selected: state.selected,
        correct: state.selected === puzzle.answer,
        ms: action.now - state.questionStartedAt,
      };
      return { ...state, revealed: true, answers: [...state.answers, answer] };
    }
    case "next": {
      if (state.phase !== "playing" || !state.revealed) return state;
      if (state.index === state.puzzles.length - 1) {
        return { ...state, phase: "result", finishedAt: action.now };
      }
      return {
        ...state,
        index: state.index + 1,
        selected: null,
        revealed: false,
        questionStartedAt: action.now,
      };
    }
    case "back":
      return initialState();
    default:
      return state;
  }
}

/**
 * 맞힌 문제 수를 센다.
 *
 * @param state 현재 상태
 * @returns 맞힌 문제 수
 */
export function correctCount(state) {
  return state.answers.filter((answer) => answer.correct).length;
}
