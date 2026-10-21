import { shareText } from "../_shared/share-text.js";
import { endingOf } from "./engine.js";
import { MAX_SCORE } from "./record.js";
import { totalStars } from "./reducer.js";

/**
 * 끝난 판의 공유 글을 만든다. 라운드마다 종류와 별만 적고, 어느 마을에서 누구를 골랐는지는 담지 않는다.
 *
 * @param state 끝난 판의 상태
 * @param date 오늘의 도전이면 날짜(YYYY-MM-DD), 아니면 비워 둔다
 * @returns 공유 글(주소 제외)
 */
export function rumorShareText(state, date) {
  const stars = totalStars(state);
  const rows = state.rounds.map((round, i) => {
    const got = state.results[i]?.stars ?? 0;
    return `${round.type === "spread" ? "퍼뜨리기" : "막기"} ${"★".repeat(got)}${"☆".repeat(3 - got)}`;
  });
  return shareText("소문 한 마디", `별 ${stars}/${MAX_SCORE}개 · ${endingOf(stars).title}\n${rows.join("\n")}`, date && { label: "오늘의 도전", date });
}