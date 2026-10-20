const STRAIGHT = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONAL = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * 격자 안에서 지나갈 수 있는 칸인지 확인한다.
 *
 * @param blocked 막힌 칸 번호(y * width + x)의 집합
 * @param width 가로 칸 수
 * @param height 세로 칸 수
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns 격자 안이고 막히지 않았으면 true
 */
export function isFree(blocked, width, height, x, y) {
  return x >= 0 && y >= 0 && x < width && y < height && !blocked.has(y * width + x);
}

/**
 * 한 칸에서 갈 수 있는 이웃 칸을 구한다. 대각선은 양옆 두 칸이 모두 비어 있을 때만 지나가서 모서리를 베지 않는다.
 *
 * @param blocked 막힌 칸 번호의 집합
 * @param width 가로 칸 수
 * @param height 세로 칸 수
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns [x, y] 목록
 */
function neighbors(blocked, width, height, x, y) {
  const out = [];
  for (const [dx, dy] of STRAIGHT) {
    if (isFree(blocked, width, height, x + dx, y + dy)) out.push([x + dx, y + dy]);
  }
  for (const [dx, dy] of DIAGONAL) {
    if (
      isFree(blocked, width, height, x + dx, y + dy) &&
      isFree(blocked, width, height, x + dx, y) &&
      isFree(blocked, width, height, x, y + dy)
    ) {
      out.push([x + dx, y + dy]);
    }
  }
  return out;
}

/**
 * 시작 칸에서 도착 칸까지 가장 짧은 길(8방향, 너비 우선 탐색)을 구한다.
 *
 * @param blocked 막힌 칸 번호(y * width + x)의 집합
 * @param width 가로 칸 수
 * @param height 세로 칸 수
 * @param from [x, y] 시작 칸
 * @param to [x, y] 도착 칸
 * @returns 시작 칸을 뺀 [x, y] 목록, 갈 수 없으면 null, 이미 도착해 있으면 빈 배열
 */
export function findPath(blocked, width, height, from, to) {
  if (!isFree(blocked, width, height, to[0], to[1])) return null;
  if (from[0] === to[0] && from[1] === to[1]) return [];
  const start = from[1] * width + from[0];
  const goal = to[1] * width + to[0];
  const came = new Map([[start, -1]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (current === goal) break;
    const x = current % width;
    const y = (current - x) / width;
    for (const [nx, ny] of neighbors(blocked, width, height, x, y)) {
      const id = ny * width + nx;
      if (!came.has(id)) {
        came.set(id, current);
        queue.push(id);
      }
    }
  }
  if (!came.has(goal)) return null;
  const path = [];
  for (let id = goal; id !== start; id = came.get(id)) path.push([id % width, Math.floor(id / width)]);
  return path.reverse();
}

/**
 * 막힌 칸(랙 등)에 붙어 있는 빈 칸 중 시작 칸에서 가장 가까운 곳으로 가는 길을 구한다.
 *
 * @param blocked 막힌 칸 번호의 집합
 * @param width 가로 칸 수
 * @param height 세로 칸 수
 * @param from [x, y] 시작 칸
 * @param target [x, y] 가려는 막힌 칸
 * @returns 시작 칸을 뺀 [x, y] 목록, 갈 수 없으면 null
 */
export function findPathBeside(blocked, width, height, from, target) {
  let best = null;
  for (const [dx, dy] of STRAIGHT) {
    const path = findPath(blocked, width, height, from, [target[0] + dx, target[1] + dy]);
    if (path && (best === null || path.length < best.length)) best = path;
  }
  return best;
}