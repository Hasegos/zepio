/**
 * 방향을 누른 것으로 기록한다. 이미 눌려 있으면 가장 최근 입력으로 옮긴다.
 *
 * @param ref 눌린 방향을 오래된 순서로 담은 배열의 ref
 * @param dir up, down, left, right
 */
export function holdDir(ref, dir) {
  ref.current = [...ref.current.filter((d) => d !== dir), dir];
}

/**
 * 방향 입력을 뗀 것으로 기록한다.
 *
 * @param ref 눌린 방향 배열의 ref
 * @param dir up, down, left, right
 */
export function releaseDir(ref, dir) {
  ref.current = ref.current.filter((d) => d !== dir);
}

/**
 * 눌린 방향을 모두 지운다. 창이 포커스를 잃거나 대화가 열려 뗀 입력을 놓칠 수 있을 때 쓴다.
 *
 * @param ref 눌린 방향 배열의 ref
 */
export function clearHeld(ref) {
  ref.current = [];
}

/**
 * 가장 최근에 누른 방향을 돌려준다.
 *
 * @param ref 눌린 방향 배열의 ref
 * @returns 방향, 눌린 것이 없으면 null
 */
export function topDir(ref) {
  return ref.current[ref.current.length - 1] ?? null;
}