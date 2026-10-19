import { checkAnswer, initialInput, isComplete, isOpen, scoreFor, totalScore } from "./logic.js";
import { PUZZLES, SPOTS, START_COINS } from "./puzzles.js";

const MEMO_COLORS = 4;
const MAX_HINTS = 3;
const MAX_WRONG = 99;

/**
 * 처음 상태를 만든다.
 *
 * @returns 사무소 화면 상태
 */
export function initialState() {
  return {
    phase: "office",
    coins: START_COINS,
    found: {},
    solved: {},
    hints: {},
    wrong: {},
    puzzle: null,
    notice: "",
    saveTick: 0,
  };
}

function puzzleOf(id) {
  return PUZZLES.find((p) => p.id === id);
}

function withInput(state, input) {
  return { ...state, puzzle: { ...state.puzzle, input, result: null } };
}

function submit(state) {
  const { puzzle } = state;
  const def = puzzleOf(puzzle.id);
  if (!isComplete(def, puzzle.input)) {
    return { ...state, notice: def.kind === "grid" ? "모든 줄에 ●를 하나씩 놓아 주세요." : "답을 먼저 골라 주세요." };
  }
  if (!checkAnswer(def, puzzle.input)) {
    if (state.solved[def.id]) return { ...state, notice: "", puzzle: { ...puzzle, result: { ok: false } } };
    const wrong = { ...state.wrong, [def.id]: Math.min(MAX_WRONG, (state.wrong[def.id] ?? 0) + 1) };
    return { ...state, wrong, notice: "", puzzle: { ...puzzle, result: { ok: false } }, saveTick: state.saveTick + 1 };
  }
  if (state.solved[def.id]) return { ...state, puzzle: { ...puzzle, result: { ok: true, score: state.solved[def.id].score, bonus: 0 } } };
  const wrongCount = state.wrong[def.id] ?? 0;
  const score = scoreFor(wrongCount);
  const bonus = wrongCount === 0 ? 1 : 0;
  return {
    ...state,
    coins: state.coins + bonus,
    solved: { ...state.solved, [def.id]: { score, wrong: wrongCount } },
    puzzle: { ...puzzle, result: { ok: true, score, bonus } },
    saveTick: state.saveTick + 1,
  };
}

/**
 * 게임 상태를 바꾼다.
 *
 * @param state 현재 상태
 * @param action 행동
 * @returns 새 상태
 */
export function reducer(state, action) {
  const inPuzzle = state.phase === "puzzle" && state.puzzle;
  switch (action.type) {
    case "open": {
      const index = PUZZLES.findIndex((p) => p.id === action.id);
      if (state.phase !== "office" || index < 0 || !isOpen(state.solved, index)) return state;
      const def = PUZZLES[index];
      return { ...state, phase: "puzzle", notice: "", puzzle: { id: def.id, input: initialInput(def), memo: {}, showMemo: false, result: null } };
    }
    case "leave":
      return inPuzzle ? { ...state, phase: "office", puzzle: null } : state;
    case "toggle": {
      if (!inPuzzle || puzzleOf(state.puzzle.id).kind !== "find") return state;
      const { input } = state.puzzle;
      return withInput(state, input.includes(action.i) ? input.filter((v) => v !== action.i) : [...input, action.i]);
    }
    case "move": {
      if (!inPuzzle || puzzleOf(state.puzzle.id).kind !== "order") return state;
      const { input } = state.puzzle;
      const to = action.i + action.dir;
      if (to < 0 || to >= input.length) return state;
      const next = [...input];
      [next[action.i], next[to]] = [next[to], next[action.i]];
      return withInput(state, next);
    }
    case "choose": {
      const def = inPuzzle && puzzleOf(state.puzzle.id);
      if (!def || def.kind !== "liars") return state;
      if (!Number.isInteger(action.i) || action.i < 0 || action.i >= state.puzzle.input.length) return state;
      const { option } = action;
      if (option !== null && (!Number.isInteger(option) || option < 0 || option >= def.options.length)) return state;
      const next = [...state.puzzle.input];
      next[action.i] = option;
      return withInput(state, next);
    }
    case "cell": {
      const def = inPuzzle && puzzleOf(state.puzzle.id);
      if (!def || def.kind !== "grid") return state;
      const n = def.slots.length;
      const valid = (v, max) => Number.isInteger(v) && v >= 0 && v < max;
      if (!valid(action.c, def.cats.length) || !valid(action.slot, n) || !valid(action.opt, n)) return state;
      const at = action.slot * n + action.opt;
      const next = state.puzzle.input.map((cells, c) => (c === action.c ? cells.map((v, i) => (i === at ? (v + 1) % 3 : v)) : cells));
      return withInput(state, next);
    }
    case "memo": {
      if (!inPuzzle) return state;
      const color = ((state.puzzle.memo[action.i] ?? 0) + 1) % MEMO_COLORS;
      return { ...state, puzzle: { ...state.puzzle, memo: { ...state.puzzle.memo, [action.i]: color } } };
    }
    case "showMemo":
      return inPuzzle ? { ...state, puzzle: { ...state.puzzle, showMemo: !state.puzzle.showMemo } } : state;
    case "reset":
      return inPuzzle ? { ...state, puzzle: { ...state.puzzle, input: initialInput(puzzleOf(state.puzzle.id)), memo: {}, result: null } } : state;
    case "hint": {
      if (!inPuzzle) return state;
      const id = state.puzzle.id;
      const opened = state.hints[id] ?? 0;
      if (opened >= MAX_HINTS) return state;
      if (state.coins < 1) return { ...state, notice: "힌트 코인이 없어요. 사무소를 뒤져 보세요." };
      return { ...state, coins: state.coins - 1, hints: { ...state.hints, [id]: opened + 1 }, notice: "", saveTick: state.saveTick + 1 };
    }
    case "submit":
      return inPuzzle && !state.puzzle.result ? submit(state) : state;
    case "closeResult": {
      if (!inPuzzle || !state.puzzle.result) return state;
      if (!state.puzzle.result.ok) return { ...state, puzzle: { ...state.puzzle, result: null } };
      if (PUZZLES.every((p) => state.solved[p.id])) return { ...state, phase: "ending", puzzle: null, saveTick: state.saveTick + 1 };
      return { ...state, phase: "office", puzzle: null };
    }
    case "spot": {
      const spot = SPOTS.find((s) => s.id === action.id);
      if (state.phase !== "office" || !spot) return state;
      if (state.found[spot.id]) return { ...state, notice: "이미 힌트 코인을 가져왔다." };
      if (!spot.coin) return { ...state, notice: spot.empty };
      return { ...state, coins: state.coins + 1, found: { ...state.found, [spot.id]: true }, notice: spot.found, saveTick: state.saveTick + 1 };
    }
    case "resume":
      return state.phase === "ending" ? { ...state, phase: "office" } : state;
    default:
      return state;
  }
}

/**
 * 끝난 게임의 결과를 요약한다.
 *
 * @param state 게임 상태
 * @returns { total, wrong } 점수 합계와 오답 총 횟수
 */
export function summary(state) {
  return { total: totalScore(state.solved), wrong: Object.values(state.solved).reduce((s, e) => s + e.wrong, 0) };
}