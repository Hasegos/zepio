import { shareText } from "../_shared/share-text.js";

/**
 * 끝난 방의 공유 글을 만든다. 방 이름과 별만 담는다.
 *
 * @param level 방
 * @param stars 받은 별(0~3)
 * @param daily 오늘의 방이면 날짜, 아니면 null
 * @returns 공유 글(주소 제외)
 */
export function fortressShareText(level, stars, daily = null) {
  const mark = "★".repeat(stars) + "☆".repeat(3 - stars);
  return shareText("프롬프트 요새", `${level.title} ${mark}`, daily && { label: "오늘의 방", date: daily });
}