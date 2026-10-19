import { BASE_SCORE, MIN_SCORE, PUZZLES, WRONG_PENALTY } from "./puzzles.js";

export const TITLES = [
  [1100, "전설의 탐정"],
  [900, "베테랑 탐정"],
  [600, "믿음직한 탐정"],
  [0, "수습 탐정"],
];

/**
 * 퍼즐 하나의 처음 입력 상태를 만든다. 고르기는 빈 목록, 순서 놓기는 주어진 순서, 범인 고르기는 빈 칸 하나, 격자는 분류마다 빈 표다.
 *
 * @param puzzle 퍼즐
 * @returns 입력 상태
 */
export function initialInput(puzzle) {
  if (puzzle.kind === "find") return [];
  if (puzzle.kind === "liars") return [null];
  if (puzzle.kind === "grid") return puzzle.cats.map(() => Array(puzzle.slots.length ** 2).fill(0));
  return puzzle.items.map((_, i) => i);
}

/**
 * 답을 다 채웠는지 확인한다. 고르기는 하나 이상, 범인 고르기는 빈칸 없이, 격자는 분류마다 줄당 ●가 하나씩 있어야 한다.
 *
 * @param puzzle 퍼즐
 * @param input 입력 상태
 * @returns 결정할 수 있으면 true
 */
export function isComplete(puzzle, input) {
  if (puzzle.kind === "find") return input.length > 0;
  if (puzzle.kind === "order") return true;
  if (puzzle.kind === "grid") {
    const n = puzzle.slots.length;
    return input.every((cells) => [...Array(n).keys()].every((slot) => cells.slice(slot * n, slot * n + n).filter((v) => v === 2).length === 1));
  }
  return !input.includes(null);
}

/**
 * 입력이 정답인지 확인한다.
 *
 * @param puzzle 퍼즐
 * @param input 입력 상태
 * @returns 정답이면 true
 */
export function checkAnswer(puzzle, input) {
  if (puzzle.kind === "find") {
    const picked = [...input].sort((a, b) => a - b);
    return picked.length === puzzle.answer.length && picked.every((v, i) => v === puzzle.answer[i]);
  }
  if (puzzle.kind === "grid") {
    const n = puzzle.slots.length;
    return puzzle.answer.every((options, c) => input[c].filter((v) => v === 2).length === n && options.every((option, slot) => input[c][slot * n + option] === 2));
  }
  return input.length === puzzle.answer.length && input.every((v, i) => v === puzzle.answer[i]);
}

/**
 * 오답 횟수에 따른 점수를 구한다. 한 번에 맞히면 만점이고 오답마다 깎인다.
 *
 * @param wrong 오답 횟수
 * @returns 점수
 */
export function scoreFor(wrong) {
  return Math.max(MIN_SCORE, BASE_SCORE - WRONG_PENALTY * wrong);
}

/**
 * 퍼즐이 열려 있는지 확인한다. 풀지 않은 퍼즐은 앞에서부터 세 개까지 열리고, 마지막 퍼즐은 나머지를 모두 풀어야 열린다.
 *
 * @param solved 푼 퍼즐 { id: { score, wrong } }
 * @param index 퍼즐 순서(0부터)
 * @returns 열려 있으면 true
 */
export function isOpen(solved, index) {
  if (solved[PUZZLES[index].id]) return true;
  if (index === PUZZLES.length - 1) return PUZZLES.slice(0, -1).every((p) => solved[p.id]);
  const unsolvedBefore = PUZZLES.slice(0, index).filter((p) => !solved[p.id]).length;
  return unsolvedBefore < 3;
}

/**
 * 푼 퍼즐의 점수 합을 구한다.
 *
 * @param solved 푼 퍼즐
 * @returns 합계
 */
export function totalScore(solved) {
  return Object.values(solved).reduce((sum, entry) => sum + entry.score, 0);
}

/**
 * 합계 점수에 맞는 칭호를 구한다.
 *
 * @param total 점수 합계
 * @returns 칭호
 */
export function titleFor(total) {
  return TITLES.find(([min]) => total >= min)[1];
}