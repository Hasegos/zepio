export const WIDTH = 30;
export const HEIGHT = 20;
export const VIEW_W = 15;
export const VIEW_H = 10;
export const TILE = 16;
export const GATE_TRUST = 3;
export const BOSS_TRUST = 14;

export const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const BUILDINGS = [
  { id: "library", name: "도서관", x: 2, y: 2, w: 5, h: 3, door: [4, 4], theme: "blue" },
  { id: "compact", name: "정리소", x: 9, y: 2, w: 4, h: 3, door: [11, 4], theme: "green" },
  { id: "rest", name: "쉼터", x: 2, y: 11, w: 4, h: 3, door: [3, 13], theme: "pink" },
  { id: "forge", name: "훅 대장간", x: 9, y: 11, w: 4, h: 3, door: [10, 13], theme: "gray" },
  { id: "gym", name: "작업장", x: 22, y: 1, w: 6, h: 4, door: [25, 4], theme: "orange" },
];

export const SIGNS = [{ id: "board", name: "게시판", x: 7, y: 8 }];

export const START = { x: 7, y: 9, dir: "down" };

/**
 * 시작 조건과 상관없는 지형 격자를 만든다. . 땅, , 풀숲(의뢰와 마주침), = 길, T 나무, ~ 물, # 건물, S 표지판.
 *
 * @returns 길이 HEIGHT의 문자열 배열
 */
function buildTerrain() {
  const grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill("."));
  const fill = (x, y, w, h, ch) => {
    for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) grid[j][i] = ch;
  };
  fill(0, 0, WIDTH, 1, "T");
  fill(0, HEIGHT - 1, WIDTH, 1, "T");
  fill(0, 0, 1, HEIGHT, "T");
  fill(WIDTH - 1, 0, 1, HEIGHT, "T");
  fill(15, 1, 1, 8, "T");
  fill(15, 10, 1, 9, "T");
  fill(16, 2, 6, 6, ",");
  fill(17, 11, 11, 7, ",");
  fill(22, 14, 5, 3, "~");
  fill(2, 16, 3, 2, "~");
  fill(1, 9, WIDTH - 2, 1, "=");
  fill(4, 5, 1, 4, "=");
  fill(11, 5, 1, 4, "=");
  fill(25, 5, 1, 4, "=");
  fill(7, 10, 1, 4, "=");
  fill(1, 14, 14, 1, "=");
  for (const b of BUILDINGS) fill(b.x, b.y, b.w, b.h, "#");
  for (const [x, y] of [[8, 6], [13, 6], [14, 3], [7, 16], [14, 16], [27, 12], [27, 9 + 1]]) grid[y][x] = "T";
  for (const s of SIGNS) grid[s.y][s.x] = "S";
  for (const b of BUILDINGS) grid[b.door[1]][b.door[0]] = "=";
  return grid.map((row) => row.join(""));
}

export const TERRAIN = buildTerrain();

/**
 * 칸의 지형 문자를 구한다. 지도 밖은 나무로 본다.
 *
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns 지형 문자
 */
export function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return "T";
  return TERRAIN[y][x];
}

/**
 * 어떤 조건에서 나타나는 NPC 목록을 구한다. 경비는 신뢰가 쌓이면 길을 비켜 준다.
 *
 * @param trust 신뢰 점수
 * @returns [{ id, name, x, y, kind, look }] kind는 guide, guard, trainer
 */
export function npcsFor(trust) {
  return [
    { id: "zepi", name: "제피", x: 8, y: 8, kind: "guide", look: { shirt: "#5b57d6", hair: "#2a2a6a", skin: "#f1c9a5" } },
    { id: "guard", name: "경비 로봇", x: trust >= GATE_TRUST ? 14 : 15, y: trust >= GATE_TRUST ? 8 : 9, kind: "guard", look: { shirt: "#8a93a3", hair: "#4a5160", skin: "#c5ccd6" } },
    { id: "minsu", name: "민수", x: 12, y: 8, kind: "trainer", look: { shirt: "#6aa7d9", hair: "#3b2417", skin: "#f1c9a5" } },
    { id: "hayun", name: "하은", x: 19, y: 8, kind: "trainer", look: { shirt: "#c98ad6", hair: "#1f1612", skin: "#f4d3b4" } },
    { id: "daeri", name: "이 대리", x: 6, y: 10, kind: "trainer", look: { shirt: "#9bc46a", hair: "#6b4a2b", skin: "#e8b88f" } },
    { id: "janitor", name: "청소 아저씨", x: 21, y: 10, kind: "trainer", look: { shirt: "#d9a84a", hair: "#7a7a7a", skin: "#e8b88f" } },
    { id: "redcap", name: "빨간 모자", x: 26, y: 8, kind: "trainer", look: { shirt: "#d95a5a", hair: "#1f1612", skin: "#f1c9a5" } },
  ];
}

/**
 * 한 칸 앞 좌표를 구한다.
 *
 * @param x 가로 칸
 * @param y 세로 칸
 * @param dir up, down, left, right
 * @returns [x, y]
 */
export function step(x, y, dir) {
  const [dx, dy] = DIRS[dir];
  return [x + dx, y + dy];
}

/**
 * 걸어갈 수 있는 칸인지 확인한다. 나무, 물, 건물, 표지판, NPC가 선 칸은 막힌다.
 *
 * @param x 가로 칸
 * @param y 세로 칸
 * @param trust 신뢰 점수(경비 위치가 달라진다)
 * @returns 걸을 수 있으면 true
 */
export function walkable(x, y, trust) {
  if ("T~#S".includes(tileAt(x, y))) return false;
  return !npcsFor(trust).some((npc) => npc.x === x && npc.y === y);
}

/**
 * 이 칸이 건물 입구인지 확인한다.
 *
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns 건물, 없으면 undefined
 */
export function buildingAtDoor(x, y) {
  return BUILDINGS.find((b) => b.door[0] === x && b.door[1] === y);
}

/**
 * 한 칸 앞에 상호작용할 대상이 있는지 찾는다.
 *
 * @param x 가로 칸
 * @param y 세로 칸
 * @param dir 바라보는 방향
 * @param trust 신뢰 점수
 * @returns { type: "npc" | "sign", target } 또는 null
 */
export function facing(x, y, dir, trust) {
  const [fx, fy] = step(x, y, dir);
  const npc = npcsFor(trust).find((n) => n.x === fx && n.y === fy);
  if (npc) return { type: "npc", target: npc };
  const sign = SIGNS.find((s) => s.x === fx && s.y === fy);
  return sign ? { type: "sign", target: sign } : null;
}