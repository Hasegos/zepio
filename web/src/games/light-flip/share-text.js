import { totals } from "./reducer.js";
import { shareText } from "../_shared/share-text.js";
import { formatDuration } from "../_shared/time.js";

/**
 * 끝난 판의 공유 글을 만든다. 격자 배치는 담지 않는다.
 *
 * @param state 끝난 판의 상태
 * @param date 오늘의 도전이면 날짜(YYYY-MM-DD), 아니면 비워 둔다
 * @returns 공유 글(주소 제외)
 */
export function lightFlipShareText(state, date) {
  const { moves, par } = totals(state);
  const time = formatDuration(state.finishedAt - state.startedAt);
  return shareText("Light Flip", `이동 ${moves}/최소 ${par} · ${time}`, date && { label: "오늘의 도전", date });
}