import { formatDuration } from "../_shared/time.js";
import { LEVELS } from "./engine.js";

/**
 * 이긴 판의 공유 글을 만든다. 버그 위치는 담지 않는다.
 *
 * @param result 이번 판의 level(난이도), seconds(걸린 초), date(오늘의 판이면 날짜, 아니면 null)
 * @returns 공유 글(주소 제외)
 */
export function bugSweeperShareText(result) {
  const daily = result.date ? ` · 오늘의 판 ${result.date}` : "";
  return `Zepio Bug Sweeper\n${LEVELS[result.level].name} · ${formatDuration(result.seconds * 1000)}${daily}`;
}