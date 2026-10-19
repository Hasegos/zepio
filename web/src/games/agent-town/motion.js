/**
 * 움직임 연출을 건너뛸지 알려 준다. 사용자가 "동작 줄이기"를 켰거나 matchMedia가 없으면 건너뛴다.
 *
 * @returns 건너뛰어야 하면 true
 */
export function reducedMotion() {
  return typeof matchMedia !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 요소를 짧게 좌우로 흔든다. 연출을 건너뛰는 환경이나 animate가 없는 환경에서는 아무것도 하지 않는다.
 *
 * @param el 흔들 요소
 */
export function shake(el) {
  if (!el?.animate || reducedMotion()) return;
  const at = (x) => ({ transform: `translateX(${x}px)` });
  el.animate([at(0), at(-6), at(6), at(-4), at(4), at(0)], { duration: 350 });
}