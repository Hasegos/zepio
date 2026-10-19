import { formatDuration, MAX_ROUND } from "./reducer.js";

/**
 * 끝난 판의 공유 글을 만든다.
 *
 * @param state 끝난 판의 상태
 * @returns 공유 글(주소 제외)
 */
export function memoryShareText(state) {
  const time = formatDuration(state.finishedAt - state.startedAt);
  const rounds = `${state.cleared}/${MAX_ROUND} 라운드${state.won ? " 완주" : ""}`;
  return `Zepio Memory Sequence\n${rounds} · ${time}`;
}