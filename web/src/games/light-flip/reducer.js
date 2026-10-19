import { CELLS, isSolved, toggle } from "./puzzle.js";

/**
 * 시작 전 상태를 만든다.
 *
 * @returns 시작 화면 상태
 */
export function initialState() {
  return {
    phase: "intro",
    stages: [],
    index: 0,
    board: [],
    history: [],
    solved: false,
    done: [],
    startedAt: 0,
    finishedAt: 0,
  };
}

/**
 * 한 판의 진행 상태를 전이한다. 시간은 action.now로만 받아 순수하게 유지한다.
 * 상태에 맞지 않는 action은 같은 state를 그대로 돌려준다.
 *
 * @param state 현재 상태
 * @param action start(stages, now), press(cell), undo, restart, next(now) 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "start":
      return {
        ...initialState(),
        phase: "playing",
        stages: action.stages,
        board: action.stages[0].board,
        startedAt: action.now,
      };
    case "press": {
      if (state.phase !== "playing" || state.solved) return state;
      if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell >= CELLS) return state;
      const board = toggle(state.board, action.cell);
      return { ...state, board, history: [...state.history, action.cell], solved: isSolved(board) };
    }
    case "undo": {
      if (state.phase !== "playing" || state.solved || state.history.length === 0) return state;
      const last = state.history.at(-1);
      return { ...state, board: toggle(state.board, last), history: state.history.slice(0, -1) };
    }
    case "restart":
      if (state.phase !== "playing" || state.solved || state.history.length === 0) return state;
      return { ...state, board: state.stages[state.index].board, history: [] };
    case "next": {
      if (state.phase !== "playing" || !state.solved) return state;
      const done = [...state.done, { moves: state.history.length, par: state.stages[state.index].par }];
      if (state.index === state.stages.length - 1) {
        return { ...state, done, phase: "result", finishedAt: action.now };
      }
      const index = state.index + 1;
      return { ...state, done, index, board: state.stages[index].board, history: [], solved: false };
    }
    case "back":
      return initialState();
    default:
      return state;
  }
}

/**
 * 끝난 판들의 총 이동 횟수와 최소 이동 횟수 합, 그 차이(추가 이동)를 구한다.
 *
 * @param state 현재 상태
 * @returns { moves, par, extra } 추가 이동은 0 이상이다
 */
export function totals(state) {
  const moves = state.done.reduce((sum, stage) => sum + stage.moves, 0);
  const par = state.done.reduce((sum, stage) => sum + stage.par, 0);
  return { moves, par, extra: moves - par };
}

/**
 * 밀리초를 mm:ss 문자열로 바꾼다.
 *
 * @param ms 경과 시간(밀리초), 음수는 0으로 본다
 * @returns mm:ss 문자열
 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}