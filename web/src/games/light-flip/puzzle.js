export const SIZE = 5;
export const CELLS = SIZE * SIZE;

export const STAGE_RANGES = [
  [2, 3],
  [4, 5],
  [6, 7],
  [8, 9],
  [10, 11],
];

const ATTEMPTS = 500;
const AUG = 1 << CELLS;

/**
 * 칸을 눌렀을 때 뒤집히는 칸 번호(자기 자신과 위아래좌우)를 돌려준다.
 *
 * @param cell 칸 번호(0부터, 행 우선)
 * @returns 뒤집히는 칸 번호 목록
 */
function neighbors(cell) {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const list = [cell];
  if (row > 0) list.push(cell - SIZE);
  if (row < SIZE - 1) list.push(cell + SIZE);
  if (col > 0) list.push(cell - 1);
  if (col < SIZE - 1) list.push(cell + 1);
  return list;
}

/** 칸마다 뒤집히는 칸들을 비트로 나타낸 값 */
const EFFECT = Array.from({ length: CELLS }, (_, cell) => neighbors(cell).reduce((mask, j) => mask | (1 << j), 0));

/**
 * 비트가 1인 개수를 센다.
 *
 * @param value 음이 아닌 정수
 * @returns 1인 비트 수
 */
function popcount(value) {
  let count = 0;
  for (let v = value; v; v &= v - 1) count += 1;
  return count;
}

/**
 * 칸을 눌러 자기 자신과 위아래좌우를 뒤집은 새 판을 만든다. 같은 칸을 두 번 누르면 원래대로 돌아온다.
 *
 * @param board 길이 CELLS의 0(꺼짐) 또는 1(켜짐) 배열
 * @param cell 누른 칸 번호
 * @returns 새 판
 */
export function toggle(board, cell) {
  const next = board.slice();
  for (const j of neighbors(cell)) next[j] = next[j] ? 0 : 1;
  return next;
}

/**
 * 모든 불이 꺼졌는지 확인한다.
 *
 * @param board 판
 * @returns 모두 꺼졌으면 true
 */
export function isSolved(board) {
  return board.every((value) => !value);
}

/**
 * 판을 모두 끄는 데 필요한 최소 이동 횟수와 그 이동을 구한다. GF(2) 가우스 소거로 풀고,
 * 해가 여러 개이면(5x5는 16개) 가장 짧은 것을 고른다.
 *
 * @param board 판
 * @returns { count, presses } 누를 칸 번호 목록과 그 개수, 풀 수 없으면 null
 */
function solveMin(board) {
  const rows = Array.from({ length: CELLS }, (_, r) => {
    let mask = board[r] ? AUG : 0;
    for (let j = 0; j < CELLS; j += 1) if ((EFFECT[j] >> r) & 1) mask |= 1 << j;
    return mask;
  });
  const pivotCol = [];
  let rank = 0;
  for (let col = 0; col < CELLS; col += 1) {
    const found = rows.findIndex((row, r) => r >= rank && (row >> col) & 1);
    if (found < 0) continue;
    [rows[rank], rows[found]] = [rows[found], rows[rank]];
    for (let r = 0; r < CELLS; r += 1) if (r !== rank && (rows[r] >> col) & 1) rows[r] ^= rows[rank];
    pivotCol.push(col);
    rank += 1;
  }
  if (rows.slice(rank).some((row) => row & AUG)) return null;

  let base = 0;
  for (let r = 0; r < rank; r += 1) if (rows[r] & AUG) base |= 1 << pivotCol[r];
  const free = Array.from({ length: CELLS }, (_, col) => col).filter((col) => !pivotCol.includes(col));
  const nullVectors = free.map((f) => {
    let vector = 1 << f;
    for (let r = 0; r < rank; r += 1) if ((rows[r] >> f) & 1) vector |= 1 << pivotCol[r];
    return vector;
  });

  let best = base;
  for (let subset = 1; subset < 1 << nullVectors.length; subset += 1) {
    let candidate = base;
    nullVectors.forEach((vector, k) => {
      if ((subset >> k) & 1) candidate ^= vector;
    });
    if (popcount(candidate) < popcount(best)) best = candidate;
  }
  const presses = Array.from({ length: CELLS }, (_, cell) => cell).filter((cell) => (best >> cell) & 1);
  return { count: presses.length, presses };
}

/**
 * 꺼진 판에서 서로 다른 칸을 눌러 섞은 판을 만든다. 되돌릴 수 있는 이동으로만 섞으므로 항상 풀린다.
 *
 * @param random 0 이상 1 미만의 수를 돌려주는 함수
 * @param presses 누를 칸 수
 * @returns 섞인 판
 */
function scramble(random, presses) {
  const cells = Array.from({ length: CELLS }, (_, cell) => cell);
  let board = new Array(CELLS).fill(0);
  for (let i = 0; i < presses; i += 1) {
    const pick = i + Math.floor(random() * (CELLS - i));
    [cells[i], cells[pick]] = [cells[pick], cells[i]];
    board = toggle(board, cells[i]);
  }
  return board;
}

/**
 * 최소 이동 횟수가 범위 안에 드는 판을 만든다. 범위에 맞는 판이 나오지 않으면 마지막 시도를 돌려준다.
 *
 * @param random 0 이상 1 미만의 수를 돌려주는 함수
 * @param min 최소 이동 횟수의 하한
 * @param max 최소 이동 횟수의 상한
 * @returns { board, par } 섞인 판과 그 최소 이동 횟수
 */
function makeStage(random, min, max) {
  let stage = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const board = scramble(random, min + Math.floor(random() * (max - min + 1)));
    stage = { board, par: solveMin(board).count };
    if (stage.par >= min && stage.par <= max) break;
  }
  return stage;
}

/**
 * 한 판의 5단계를 만든다.
 *
 * @param random 0 이상 1 미만의 수를 돌려주는 함수
 * @returns 단계별 { board, par } 목록
 */
export function makeStages(random = Math.random) {
  return STAGE_RANGES.map(([min, max]) => makeStage(random, min, max));
}