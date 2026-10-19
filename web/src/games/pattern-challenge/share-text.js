import { correctCount, formatDuration } from "./reducer.js";

/**
 * 끝난 판의 공유 글을 만든다. 문제 내용과 정답은 담지 않고 문제별 정오만 담는다.
 *
 * @param state 끝난 판의 상태
 * @param date 오늘의 도전이면 날짜(YYYY-MM-DD), 일반 모드면 비워 둔다
 * @returns 공유 글(주소 제외)
 */
export function patternShareText(state, date) {
  const title = date ? `Zepio 오늘의 도전 ${date}` : "Zepio Pattern Challenge";
  const marks = state.answers.map((answer) => (answer.correct ? "🟩" : "🟥")).join("");
  const time = formatDuration(state.finishedAt - state.startedAt);
  return `${title}\n${marks} ${correctCount(state)}/${state.puzzles.length} · ${time}`;
}