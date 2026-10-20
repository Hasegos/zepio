export const GRID_WIDTH = 12;
export const GRID_HEIGHT = 9;
export const START = [6, 4];
export const TERMINAL = [11, 4];
export const COOLER_PADS = [
  [5, 2],
  [6, 2],
  [5, 6],
  [6, 6],
];

/**
 * 랙을 놓을 수 있는 자리 16곳을 만든다. 위아래 두 줄에 통로를 사이에 두고 네 칸씩 두 무리로 놓인다.
 *
 * @returns [x, y] 목록
 */
function buildPads() {
  const pads = [];
  for (const y of [2, 6]) {
    for (const x of [1, 2, 3, 4, 7, 8, 9, 10]) pads.push([x, y]);
  }
  return pads;
}

export const PADS = buildPads();

/**
 * 가운데에 가까운 자리부터 열리도록 자리 번호를 정렬한다.
 *
 * @returns 자리 번호 목록
 */
function buildUnlockOrder() {
  const distance = ([x, y]) => Math.abs(x - 5.5) + Math.abs(y - 4);
  return PADS.map((_, i) => i).sort((a, b) => distance(PADS[a]) - distance(PADS[b]) || a - b);
}

export const UNLOCK_ORDER = buildUnlockOrder();
export const UNLOCK_RANK = PADS.map((_, i) => UNLOCK_ORDER.indexOf(i));

export const NEIGHBORS = PADS.map(([x, y], i) =>
  PADS.flatMap(([ox, oy], j) => (j !== i && Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1 ? [j] : [])),
);

export const COOLER_DISTANCE = COOLER_PADS.map(([cx, cy]) => PADS.map(([x, y]) => Math.max(Math.abs(cx - x), Math.abs(cy - y))));