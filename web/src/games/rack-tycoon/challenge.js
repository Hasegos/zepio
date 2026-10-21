import { hashSeed } from "../_shared/rng.js";
import { newState, starterCells } from "./engine.js";
import { SITE_IDS } from "./sites.js";

export const CHALLENGE_SECONDS = 300;
export const CHALLENGE_COINS = 400;

/**
 * 그날의 도전 조건을 구한다. 같은 날짜면 모두 같은 건물 종류와 재난 시드를 받는다.
 *
 * @param date YYYY-MM-DD
 * @returns { seed, type }
 */
export function challengeOf(date) {
  const seed = hashSeed(`rack-daily-${date}`);
  return { seed, type: SITE_IDS[seed % SITE_IDS.length] };
}

/**
 * 그날의 도전을 시작할 때의 게임 상태를 만든다. 저장된 센터와 상관없이 늘 같은 출발선이다.
 *
 * @param date YYYY-MM-DD
 * @returns 게임 상태
 */
export function challengeState(date) {
  const { type } = challengeOf(date);
  const cells = starterCells();
  return { ...newState(), coins: CHALLENGE_COINS, difficulty: "hard", type, cells, sites: [{ type, land: 0, cells }] };
}

/**
 * 남은 시간을 분:초 글자로 바꾼다.
 *
 * @param seconds 남은 초
 * @returns 예: 4:05
 */
export function clockText(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}