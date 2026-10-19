import { accuracy } from "./reducer.js";

/**
 * 끝난 판의 공유 글을 만든다.
 *
 * @param state 끝난 판의 상태
 * @returns 공유 글(주소 제외)
 */
export function colorClashShareText(state) {
  return `Zepio Color Clash\n${state.correct}점 · 정확도 ${accuracy(state)}%`;
}