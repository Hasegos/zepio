/**
 * 칸 하나가 숫자 칸이거나 도형 칸 모양인지 확인한다.
 *
 * @param cell 칸
 * @returns 쓸 수 있으면 true
 */
function isCell(cell) {
  return Number.isInteger(cell?.n) || (typeof cell?.shape === "string" && typeof cell?.color === "string");
}

/**
 * 문제 하나가 게임이 쓸 수 있는 모양인지 확인한다.
 *
 * @param puzzle 문제
 * @returns 쓸 수 있으면 true
 */
function isPuzzle(puzzle) {
  return (
    typeof puzzle?.id === "string" &&
    (puzzle.kind === "number" || puzzle.kind === "shape") &&
    Array.isArray(puzzle.cells) &&
    puzzle.cells.length >= 2 &&
    puzzle.cells.at(-1) === null &&
    puzzle.cells.slice(0, -1).every(isCell) &&
    Array.isArray(puzzle.options) &&
    puzzle.options.length === 5 &&
    puzzle.options.every(isCell) &&
    Number.isInteger(puzzle.answer) &&
    puzzle.answer >= 0 &&
    puzzle.answer < 5 &&
    typeof puzzle.explanation === "string" &&
    puzzle.explanation.trim() !== ""
  );
}

const TIMEOUT_MS = 8000;

/**
 * 화면이 사라질 때의 취소 신호에 시간 제한을 더한다. 지원하지 않는 브라우저에서는 가진 신호만 쓴다.
 *
 * @param signal 취소 신호 또는 undefined
 * @returns 둘 중 먼저 오는 쪽으로 취소되는 신호
 */
function withTimeout(signal) {
  if (typeof AbortSignal?.timeout !== "function") return signal;
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  if (!signal) return timeout;
  return typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : signal;
}

/**
 * 날짜의 일일 문제 파일을 불러온다. 파일이 없거나 모양이 틀리거나 요청이 취소되면 null이다. 다른 문제로 대신하지 않는다.
 *
 * @param date 불러올 날짜(YYYY-MM-DD)
 * @param signal 화면이 사라질 때 요청을 취소하는 신호
 * @param fetchImpl 요청 함수(기본값은 전역 fetch)
 * @returns 그날의 문제 5개, 없으면 null
 */
export async function fetchDaily(date, signal, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`/data/daily/${date}.json`, { signal: withTimeout(signal) });
    if (!response.ok) return null;
    const data = await response.json();
    const valid =
      data?.date === date && Array.isArray(data.puzzles) && data.puzzles.length === 5 && data.puzzles.every(isPuzzle);
    return valid ? data.puzzles : null;
  } catch {
    return null;
  }
}