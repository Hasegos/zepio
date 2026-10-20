import { totals } from "./reducer.js";
import { formatDuration } from "../_shared/time.js";

/**
 * 끝난 판의 공유 글을 만든다. 격자 배치는 담지 않는다.
 *
 * @param state 끝난 판의 상태
 * @returns 공유 글(주소 제외)
 */
export function lightFlipShareText(state) {
  const { moves, par } = totals(state);
  const time = formatDuration(state.finishedAt - state.startedAt);
  return `Zepio Light Flip\n이동 ${moves}/최소 ${par} · ${time}`;
}