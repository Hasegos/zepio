/**
 * 일반 객체(배열과 null 제외)인지 확인한다. 저장소에서 읽은 값을 검증할 때 쓴다.
 *
 * @param value 확인할 값
 * @returns 일반 객체이면 true
 */
export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * 정수이면서 범위 안인지 확인한다.
 *
 * @param n 확인할 값
 * @param min 최솟값(포함)
 * @param max 최댓값(포함)
 * @returns 범위 안의 정수이면 true
 */
export function isInt(n, min, max) {
  return Number.isInteger(n) && n >= min && n <= max;
}

/**
 * 유한한 수이면서 범위 안인지 확인한다. 정수가 아니어도 되는 값(밀리초 등)에 쓴다.
 *
 * @param n 확인할 값
 * @param min 최솟값(포함)
 * @param max 최댓값(포함)
 * @returns 범위 안의 수이면 true
 */
export function isNum(n, min, max) {
  return Number.isFinite(n) && n >= min && n <= max;
}