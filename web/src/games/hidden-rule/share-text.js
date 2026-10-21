import { shareText } from "../_shared/share-text.js";
import { MAX_SCORE } from "./record.js";
import { totalScore } from "./reducer.js";

const MARKS = { ok: "🟩", retry: "🟨", fail: "🟥" };

/**
 * 끝난 판의 공유 글을 만든다. 규칙 내용은 담지 않고 라운드별 결과와 점수만 담는다.
 *
 * @param state 끝난 판의 상태
 * @param date 오늘의 도전이면 날짜(YYYY-MM-DD), 아니면 비워 둔다
 * @returns 공유 글(주소 제외)
 */
export function hiddenRuleShareText(state, date) {
  const marks = state.results.map((result) => MARKS[result.status]).join("");
  return shareText("Hidden Rule", `${marks} ${totalScore(state)}/${MAX_SCORE}점`, date && { label: "오늘의 도전", date });
}