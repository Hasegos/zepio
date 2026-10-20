import { LEVELS } from "./levels.js";

/**
 * 그날의 방 번호를 구한다. 날짜를 하루씩 세어 12일 주기로 방이 돌아간다.
 *
 * @param date YYYY-MM-DD
 * @returns 방 id
 */
export function dailyLevelId(date) {
  const [year, month, day] = date.split("-").map(Number);
  const days = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  return LEVELS[((days % LEVELS.length) + LEVELS.length) % LEVELS.length].id;
}