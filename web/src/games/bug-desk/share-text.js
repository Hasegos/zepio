import { shareText } from "../_shared/share-text.js";
import { endingOf, PER_DAY } from "./engine.js";
import { MAX_SCORE } from "./record.js";
import { totalScore } from "./reducer.js";

/**
 * 끝난 판의 공유 글을 만든다. 하루마다 맞힘(🟩)과 틀림(🟥)을 한 줄로 적고, 정책이나 접수 내용은 담지 않는다.
 *
 * @param state 끝난 판의 상태
 * @param date 오늘의 도전이면 날짜(YYYY-MM-DD), 아니면 비워 둔다
 * @returns 공유 글(주소 제외)
 */
export function bugDeskShareText(state, date) {
  const score = totalScore(state);
  const rows = state.days.map((_, day) =>
    `${day + 1}일 ${state.results
      .slice(day * PER_DAY, (day + 1) * PER_DAY)
      .map((result) => (result.ok ? "🟩" : "🟥"))
      .join("")}`,
  );
  const ending = endingOf(score, state.trust, state.energy);
  return shareText("버그 접수처", `${score}/${MAX_SCORE}건 · ${ending.title}\n${rows.join("\n")}`, date && { label: "오늘의 도전", date });
}