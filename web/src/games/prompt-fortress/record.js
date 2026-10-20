import { LEVELS } from "./levels.js";
import { isObject } from "../_shared/validate.js";


/**
 * 저장소 값을 안전한 모양으로 다듬는다. 모르는 방과 범위를 벗어난 별은 버린다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns { v, stars, muted } stars는 방 id별 최고 별(1~3), muted는 소리 끔 설정
 */
export function readData(raw) {
  const valid = raw?.v === 1;
  const stars = {};
  if (valid && isObject(raw.stars)) {
    for (const level of LEVELS) {
      const n = raw.stars[level.id];
      if (Number.isInteger(n) && n >= 1 && n <= 3) stars[level.id] = n;
    }
  }
  return { v: 1, stars, muted: valid && raw.muted === true };
}

/**
 * 저장할 데이터를 만든다. 방별 별은 이미 저장된 값보다 낮아지지 않는다.
 *
 * @param prev 읽은 저장 데이터
 * @param stars 지금 상태의 방별 최고 별
 * @returns 저장할 데이터
 */
export function mergeStars(prev, stars) {
  const old = readData(prev);
  const merged = { ...old.stars };
  for (const [id, n] of Object.entries(stars)) if (n >= 1 && n > (merged[id] ?? 0)) merged[id] = n;
  return readData({ v: 1, stars: merged, muted: old.muted });
}

/**
 * 홈 카드에 보여 줄 한 줄 요약을 만든다.
 *
 * @param data 저장된 데이터
 * @returns 요약 문구, 기록이 없으면 빈 문자열
 */
export function summarize(data) {
  const { stars } = readData(data);
  const cleared = Object.keys(stars).length;
  if (!cleared) return "";
  const sum = Object.values(stars).reduce((a, b) => a + b, 0);
  return `${cleared}/${LEVELS.length}방 · ★${sum}`;
}