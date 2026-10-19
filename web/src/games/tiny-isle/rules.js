export const SIZE = 8;
export const CELLS = SIZE * SIZE;
export const LAND = "g";
export const WATER = "w";
export const ROCK = "r";

export const BUILDINGS = [
  { id: "house", name: "집", rule: "기본 1 · 공원 옆 +2 · 가게나 숲 옆 +1 · 공장 옆 −2", coast: false },
  { id: "farm", name: "농장", rule: "기본 1 · 농장 옆 +1 · 풍차 옆 +2 · 공장 옆 −1", coast: false },
  { id: "windmill", name: "풍차", rule: "기본 0 · 농장 옆 +3", coast: false },
  { id: "park", name: "공원", rule: "기본 1 · 물 옆 +1 · 집 옆 +1 · 공장 옆 −1", coast: false },
  { id: "shop", name: "가게", rule: "기본 2 · 다른 종류 건물 옆 종류마다 +1 (최대 4)", coast: false },
  { id: "factory", name: "공장", rule: "기본 5 · 부두 옆 +1 (이웃 집·공원·농장이 깎여요)", coast: false },
  { id: "lighthouse", name: "등대", rule: "기본 0 · 물 옆 한 칸마다 +2", coast: false },
  { id: "dock", name: "부두", rule: "물가에만 · 기본 2 · 가게·공장 옆 +1", coast: true },
  { id: "school", name: "학교", rule: "기본 1 · 두 칸 안의 집마다 +1 (최대 6)", coast: false },
  { id: "forest", name: "숲", rule: "기본 1 · 두 칸 안의 다른 숲마다 +1 (최대 4)", coast: false },
];
export const BUILDING_IDS = BUILDINGS.map((building) => building.id);

/**
 * 칸 번호의 위·아래·왼쪽·오른쪽 이웃 칸 번호를 구한다.
 *
 * @param i 칸 번호
 * @returns 이웃 칸 번호 목록
 */
function neighborsOf(i) {
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  const out = [];
  if (y > 0) out.push(i - SIZE);
  if (x > 0) out.push(i - 1);
  if (x < SIZE - 1) out.push(i + 1);
  if (y < SIZE - 1) out.push(i + SIZE);
  return out;
}

/**
 * 맨해튼 거리 두 칸 안(자기 자신 제외)의 칸 번호를 구한다.
 *
 * @param i 칸 번호
 * @returns 칸 번호 목록
 */
function nearOf(i) {
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  const out = [];
  for (let j = 0; j < CELLS; j += 1) {
    const d = Math.abs((j % SIZE) - x) + Math.abs(Math.floor(j / SIZE) - y);
    if (d > 0 && d <= 2) out.push(j);
  }
  return out;
}

export const NEIGHBORS = Array.from({ length: CELLS }, (_, i) => neighborsOf(i));
export const NEAR = Array.from({ length: CELLS }, (_, i) => nearOf(i));

/**
 * 건물 하나가 지금 주는 점수를 구한다. 점수는 판 전체에서 매번 다시 계산하는 값이라 순서에 상관없다.
 *
 * @param terrain 길이 64의 지형 배열(g 땅, w 물, r 바위)
 * @param board 길이 64의 건물 id 배열(빈 칸은 null)
 * @param i 칸 번호
 * @returns 점수(음수일 수 있다), 빈 칸이면 0
 */
export function scoreAt(terrain, board, i) {
  const id = board[i];
  if (!id) return 0;
  const around = NEIGHBORS[i];
  const adj = (type) => around.filter((n) => board[n] === type).length;
  const water = around.filter((n) => terrain[n] === WATER).length;
  const near = (type) => NEAR[i].filter((n) => board[n] === type).length;
  switch (id) {
    case "house":
      return 1 + 2 * adj("park") + adj("shop") + adj("forest") - 2 * adj("factory");
    case "farm":
      return 1 + adj("farm") + 2 * adj("windmill") - adj("factory");
    case "windmill":
      return 3 * adj("farm");
    case "park":
      return 1 + water + adj("house") - adj("factory");
    case "shop":
      return 2 + Math.min(4, new Set(around.map((n) => board[n]).filter((b) => b && b !== "shop")).size);
    case "factory":
      return 5 + adj("dock");
    case "lighthouse":
      return 2 * water;
    case "dock":
      return 2 + adj("shop") + adj("factory");
    case "school":
      return 1 + Math.min(6, near("house"));
    case "forest":
      return 1 + Math.min(4, near("forest"));
    default:
      return 0;
  }
}

/**
 * 판 전체의 건물 점수 합을 구한다.
 *
 * @param terrain 지형 배열
 * @param board 건물 배열
 * @returns 점수 합
 */
export function scoreBoard(terrain, board) {
  let sum = 0;
  for (let i = 0; i < CELLS; i += 1) sum += scoreAt(terrain, board, i);
  return sum;
}

/**
 * 건물 종류별로 점수를 모아 구한다.
 *
 * @param terrain 지형 배열
 * @param board 건물 배열
 * @returns { 건물 id: { count, score } }
 */
export function breakdown(terrain, board) {
  const out = {};
  for (let i = 0; i < CELLS; i += 1) {
    const id = board[i];
    if (!id) continue;
    out[id] ??= { count: 0, score: 0 };
    out[id].count += 1;
    out[id].score += scoreAt(terrain, board, i);
  }
  return out;
}

/**
 * 이 칸에 건물을 놓을 수 있는지 확인한다. 땅이고 비어 있어야 하고, 부두는 물가여야 한다.
 *
 * @param terrain 지형 배열
 * @param board 건물 배열
 * @param id 놓을 건물 id
 * @param i 칸 번호
 * @returns 놓을 수 있으면 true
 */
export function canBuild(terrain, board, id, i) {
  if (terrain[i] !== LAND || board[i]) return false;
  if (id === "dock") return NEIGHBORS[i].some((n) => terrain[n] === WATER);
  return true;
}

/**
 * 한 칸의 건물이 바뀔 때 점수가 달라지는 칸들을 구한다. 바뀐 칸에서 두 칸 안만 영향을 받는다.
 *
 * @param terrain 지형 배열
 * @param board 건물 배열
 * @param i 바뀌는 칸 번호
 * @param id 놓을 건물 id, 철거면 null
 * @returns 총 변화량(delta)과 점수가 달라지는 칸 목록(changes: i, before, after)
 */
export function change(terrain, board, i, id) {
  const spots = [i, ...NEAR[i]];
  const before = spots.map((n) => scoreAt(terrain, board, n));
  const next = [...board];
  next[i] = id;
  const changes = [];
  let delta = 0;
  spots.forEach((n, k) => {
    const after = scoreAt(terrain, next, n);
    delta += after - before[k];
    if (after !== before[k]) changes.push({ i: n, before: before[k], after });
  });
  return { delta, changes };
}