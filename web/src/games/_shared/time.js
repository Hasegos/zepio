/**
 * 밀리초를 mm:ss 문자열로 바꾼다.
 *
 * @param ms 경과 시간(밀리초), 음수는 0으로 본다
 * @returns mm:ss 문자열
 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
