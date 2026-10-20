export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 16;
export const AREA = GRID_WIDTH * GRID_HEIGHT;
export const TERMINAL = [13, 7];
export const START = [12, 8];
export const LANDS = [
  { name: "기본 부지", w: 8, h: 6, cost: 0 },
  { name: "증축 부지", w: 12, h: 10, cost: 5000 },
  { name: "확장 부지", w: 16, h: 12, cost: 80000 },
].map((land) => ({ ...land, x: (GRID_WIDTH - land.w) / 2, y: (GRID_HEIGHT - land.h) / 2 }));

/**
 * 칸의 가로, 세로 위치를 칸 번호로 바꾼다.
 *
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns 칸 번호(y * 가로 칸 수 + x)
 */
export function tileOf(x, y) {
  return y * GRID_WIDTH + x;
}

/**
 * 부지 단계 안에 있는 칸인지 확인한다.
 *
 * @param land 부지 단계
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns 부지 안이면 true
 */
export function inLand(land, x, y) {
  const area = LANDS[land];
  return x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h;
}

export const TERMINAL_TILE = tileOf(TERMINAL[0], TERMINAL[1]);