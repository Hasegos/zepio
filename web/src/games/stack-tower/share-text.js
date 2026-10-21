import { shareText } from "../_shared/share-text.js";

/**
 * 끝난 판의 공유 글을 만든다. 탑 모양은 담지 않는다.
 *
 * @param result 이번 판의 floors(층수)와 perfects(완벽 정렬 횟수)
 * @param date 오늘의 도전이면 날짜(YYYY-MM-DD), 아니면 비워 둔다
 * @returns 공유 글(주소 제외)
 */
export function stackTowerShareText(result, date) {
  return shareText("Stack Tower", `${result.floors}층 · 완벽 정렬 ${result.perfects}회`, date && { label: "오늘의 도전", date });
}