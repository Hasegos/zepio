const UNITS = [
  [1e12, "조"],
  [1e8, "억"],
  [1e4, "만"],
  [1e3, "천"],
];

/**
 * 코인 수를 한국어 단위로 줄여 쓴다(천, 만, 억, 조). 소수 첫째 자리까지 내림하고 .0은 생략한다.
 *
 * @param value 코인 수(음수나 숫자가 아니면 0으로 본다)
 * @returns 예: 1.2천, 12.3만, 3억, 5.6조
 */
export function formatCompact(value) {
  const n = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  for (const [size, unit] of UNITS) {
    if (n >= size) return `${Math.floor((n * 10) / size) / 10}${unit}`;
  }
  return String(n);
}

/**
 * 코인 수를 화면에 크게 보여줄 모양으로 바꾼다. 1만 미만은 쉼표를 넣은 정수, 그 이상은 한국어 단위로 줄인다.
 *
 * @param value 코인 수
 * @returns 예: 1,240 또는 1.2만
 */
export function formatCoins(value) {
  const n = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  return n < 1e4 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : formatCompact(n);
}

/**
 * 초당 수익을 보여줄 모양으로 바꾼다. 10 미만은 소수 첫째 자리까지 내림하고, 1천 이상은 한국어 단위로 줄인다.
 *
 * @param value 코인/초
 * @returns 예: 0.5, 12, 1.2천
 */
export function formatRate(value) {
  const r = Number.isFinite(value) && value > 0 ? value : 0;
  if (r < 10) return String(Math.floor(r * 10) / 10);
  return formatCompact(r);
}

/**
 * 밀리초를 사람이 읽는 시간으로 바꾼다.
 *
 * @param ms 시간(밀리초), 음수는 0으로 본다
 * @returns 1시간 이상은 "2시간 34분", 1분 이상은 "5분", 그 미만은 "42초"
 */
export function formatSpan(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분`;
  return `${total}초`;
}