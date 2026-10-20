export const VIEW_W = 15;
export const VIEW_H = 10;
export const TILE = 16;
export const GATE_TRUST = 3;
export const BOSS_TRUST = 14;
export const FOREST_GYM_TRUST = 22;
export const HARBOR_GYM_TRUST = 26;
export const CAVE_GYM_TRUST = 30;
export const LEAGUE_GYM_TRUST = 34;
export const LEAGUE_BADGES = ["town", "forest", "harbor", "cave"];

const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const START = { x: 7, y: 9, dir: "down" };
export const START_MAP = "town";

function grid(width, height, ch) {
  const rows = Array.from({ length: height }, () => Array(width).fill(ch));
  const fill = (x, y, w, h, c) => {
    for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) rows[j][i] = c;
  };
  return { rows, fill };
}

/**
 * 마을 지형을 만든다. . 땅, , 풀숲(의뢰와 마주침), = 길, T 나무, ~ 물, # 건물, S 표지판, W 다른 지역으로 가는 입구.
 *
 * @param buildings 마을 건물
 * @param signs 마을 표지판
 * @returns 지형 문자열 배열
 */
function buildTown(buildings, signs) {
  const W = 30;
  const H = 20;
  const { rows, fill } = grid(W, H, ".");
  fill(0, 0, W, 1, "T");
  fill(0, H - 1, W, 1, "T");
  fill(0, 0, 1, H, "T");
  fill(W - 1, 0, 1, H, "T");
  fill(15, 1, 1, 8, "T");
  fill(15, 10, 1, 9, "T");
  fill(16, 2, 6, 6, ",");
  fill(17, 11, 11, 7, ",");
  fill(22, 14, 5, 3, "~");
  fill(2, 16, 3, 2, "~");
  fill(1, 9, W - 2, 1, "=");
  fill(4, 5, 1, 4, "=");
  fill(11, 5, 1, 4, "=");
  fill(25, 5, 1, 4, "=");
  fill(7, 10, 1, 4, "=");
  fill(1, 14, 14, 1, "=");
  fill(7, 15, 1, 4, "=");
  for (const b of buildings) fill(b.x, b.y, b.w, b.h, "#");
  for (const [x, y] of [[8, 6], [13, 6], [14, 3], [14, 16], [27, 12], [27, 10]]) rows[y][x] = "T";
  for (const s of signs) rows[s.y][s.x] = "S";
  for (const b of buildings) rows[b.door[1]][b.door[0]] = "=";
  rows[9][W - 1] = "W";
  rows[H - 1][7] = "W";
  rows[0][20] = "W";
  return rows.map((row) => row.join(""));
}

/**
 * 레거시 숲 지형을 만든다. 빽빽한 나무 사이로 길이 나 있고, 짙은 풀숲(f)에서 숲 의뢰가 나온다.
 *
 * @param buildings 숲 건물
 * @param signs 숲 표지판
 * @returns 지형 문자열 배열
 */
function buildForest(buildings, signs) {
  const W = 30;
  const H = 20;
  const { rows, fill } = grid(W, H, "T");
  fill(1, 7, 12, 5, ".");
  fill(2, 5, 10, 2, ".");
  fill(13, 3, 3, 14, ".");
  fill(16, 8, 12, 4, ".");
  fill(20, 4, 8, 4, ".");
  fill(1, 9, 27, 1, "=");
  fill(24, 4, 1, 5, "=");
  fill(3, 7, 6, 2, "f");
  fill(3, 10, 6, 2, "f");
  fill(13, 4, 3, 3, "f");
  fill(13, 12, 3, 4, "f");
  fill(17, 10, 9, 2, "f");
  fill(17, 8, 3, 1, "f");
  fill(27, 1, 1, 3, ".");
  rows[3][28] = ".";
  rows[13][14] = "~";
  rows[14][14] = "~";
  for (const b of buildings) fill(b.x, b.y, b.w, b.h, "#");
  for (const s of signs) rows[s.y][s.x] = "S";
  fill(5, 5, 1, 2, "=");
  fill(10, 5, 1, 2, "=");
  for (const b of buildings) rows[b.door[1]][b.door[0]] = "=";
  rows[9][0] = "W";
  rows[0][27] = "W";
  return rows.map((row) => row.join(""));
}

/**
 * 토큰 항구 지형을 만든다. 모래 부두에 길이 가로지르고, 아래쪽은 바다(~)이며, 쌓인 상자(b)에서 항구 의뢰가 나온다.
 *
 * @param buildings 항구 건물
 * @param signs 항구 표지판
 * @returns 지형 문자열 배열
 */
function buildHarbor(buildings, signs) {
  const W = 30;
  const H = 20;
  const { rows, fill } = grid(W, H, ".");
  fill(0, 0, W, 1, "T");
  fill(0, H - 1, W, 1, "T");
  fill(0, 0, 1, H, "T");
  fill(W - 1, 0, 1, H, "T");
  fill(1, 15, W - 2, 4, "~");
  fill(10, 15, 2, 3, "=");
  fill(2, 11, 7, 3, "b");
  fill(15, 11, 10, 3, "b");
  fill(1, 9, W - 2, 1, "=");
  fill(7, 1, 1, 8, "=");
  for (const b of buildings) fill(b.x, b.y, b.w, b.h, "#");
  for (const s of signs) rows[s.y][s.x] = "S";
  for (const b of buildings) fill(b.door[0], b.door[1], 1, 5, "=");
  rows[0][7] = "W";
  return rows.map((row) => row.join(""));
}

/**
 * 서버 동굴 지형을 만든다. 바위벽 안쪽 넓은 홀에 길이 나 있고, 케이블이 깔린 바닥(c)에서 동굴 의뢰가 나온다.
 *
 * @param buildings 동굴 건물
 * @param signs 동굴 표지판
 * @returns 지형 문자열 배열
 */
function buildCave(buildings, signs) {
  const W = 30;
  const H = 20;
  const { rows, fill } = grid(W, H, "T");
  fill(1, 1, W - 2, H - 2, ".");
  fill(4, 10, 8, 5, "c");
  fill(17, 10, 9, 5, "c");
  fill(15, 6, 3, 3, "c");
  fill(14, 6, 1, 13, "=");
  fill(5, 5, 21, 1, "=");
  for (const [x, y] of [[9, 7], [10, 7], [10, 8], [20, 7], [21, 7], [21, 8], [6, 16], [7, 16], [22, 16], [23, 16], [23, 15]]) rows[y][x] = "T";
  for (const b of buildings) fill(b.x, b.y, b.w, b.h, "#");
  for (const s of signs) rows[s.y][s.x] = "S";
  for (const b of buildings) rows[b.door[1]][b.door[0]] = "=";
  rows[H - 1][14] = "W";
  return rows.map((row) => row.join(""));
}

/**
 * 챔피언 리그 홀 지형을 만든다. 금빛 카펫 길이 입구에서 챔피언 홀까지 이어지고, 의뢰는 나오지 않는다.
 *
 * @param buildings 홀 건물
 * @param signs 홀 표지판
 * @returns 지형 문자열 배열
 */
function buildLeague(buildings, signs) {
  const W = 20;
  const H = 12;
  const { rows, fill } = grid(W, H, ".");
  fill(0, 0, W, 1, "T");
  fill(0, H - 1, W, 1, "T");
  fill(0, 0, 1, H, "T");
  fill(W - 1, 0, 1, H, "T");
  fill(10, 5, 1, 6, "=");
  fill(3, 5, 1, 2, "=");
  fill(3, 6, 15, 1, "=");
  for (const [x, y] of [[5, 8], [5, 9], [15, 8], [15, 9]]) rows[y][x] = "T";
  for (const b of buildings) fill(b.x, b.y, b.w, b.h, "#");
  for (const s of signs) rows[s.y][s.x] = "S";
  for (const b of buildings) rows[b.door[1]][b.door[0]] = "=";
  rows[H - 1][10] = "W";
  return rows.map((row) => row.join(""));
}

const TOWN_BUILDINGS = [
  { id: "library", name: "도서관", facility: "library", x: 2, y: 2, w: 5, h: 3, door: [4, 4], theme: "blue" },
  { id: "compact", name: "정리소", facility: "compact", x: 9, y: 2, w: 4, h: 3, door: [11, 4], theme: "green" },
  { id: "rest", name: "쉼터", facility: "rest", x: 2, y: 11, w: 4, h: 3, door: [3, 13], theme: "pink" },
  { id: "forge", name: "훅 대장간", facility: "forge", x: 9, y: 11, w: 4, h: 3, door: [10, 13], theme: "gray" },
  { id: "gym", name: "작업장", facility: "gym", x: 22, y: 1, w: 6, h: 4, door: [25, 4], theme: "orange" },
];
const FOREST_BUILDINGS = [
  { id: "camp", name: "야영지", facility: "rest", x: 3, y: 2, w: 4, h: 3, door: [5, 4], theme: "green" },
  { id: "archive", name: "옛 서고", facility: "compact", x: 8, y: 2, w: 4, h: 3, door: [10, 4], theme: "gray" },
  { id: "smithy", name: "숲 대장간", facility: "forge", x: 20, y: 5, w: 4, h: 3, door: [22, 7], theme: "gray" },
  { id: "gym", name: "숲의 오두막", facility: "gym", x: 22, y: 1, w: 5, h: 3, door: [24, 3], theme: "green" },
];
const HARBOR_BUILDINGS = [
  { id: "market", name: "항구 시장", facility: "market", x: 2, y: 2, w: 4, h: 3, door: [4, 4], theme: "blue" },
  { id: "inn", name: "항구 여관", facility: "rest", x: 10, y: 2, w: 4, h: 3, door: [12, 4], theme: "pink" },
  { id: "ledger", name: "항구 서고", facility: "compact", x: 15, y: 2, w: 4, h: 3, door: [17, 4], theme: "gray" },
  { id: "workshop", name: "부두 대장간", facility: "forge", x: 10, y: 11, w: 4, h: 3, door: [11, 13], theme: "blue" },
  { id: "gym", name: "경리부", facility: "gym", x: 20, y: 1, w: 6, h: 4, door: [23, 4], theme: "orange" },
];
const CAVE_BUILDINGS = [
  { id: "shelter", name: "대피소", facility: "rest", x: 3, y: 2, w: 4, h: 3, door: [5, 4], theme: "gray" },
  { id: "cooling", name: "냉각실", facility: "compact", x: 10, y: 2, w: 4, h: 3, door: [12, 4], theme: "blue" },
  { id: "bench", name: "정비실", facility: "forge", x: 16, y: 2, w: 4, h: 3, door: [18, 4], theme: "green" },
  { id: "gym", name: "보안실", facility: "gym", x: 22, y: 1, w: 6, h: 4, door: [25, 4], theme: "orange" },
];
const LEAGUE_BUILDINGS = [
  { id: "lounge", name: "대기실", facility: "rest", x: 1, y: 2, w: 4, h: 3, door: [3, 4], theme: "pink" },
  { id: "briefing", name: "정리실", facility: "compact", x: 15, y: 2, w: 4, h: 3, door: [16, 4], theme: "green" },
  { id: "gym", name: "챔피언 홀", facility: "gym", x: 6, y: 1, w: 8, h: 4, door: [10, 4], theme: "orange" },
];
const LEAGUE_SIGNS = [{ id: "plaque", name: "리그 현판", x: 12, y: 8 }];
const TOWN_SIGNS = [{ id: "board", name: "게시판", x: 7, y: 8 }];
const HARBOR_SIGNS = [{ id: "pier", name: "부두 안내판", x: 6, y: 8 }];
const CAVE_SIGNS = [{ id: "rackmap", name: "랙 안내판", x: 13, y: 17 }];
const FOREST_SIGNS = [{ id: "trail", name: "안내판", x: 1, y: 8 }];

export const MAPS = {
  town: {
    id: "town",
    name: "프롬프트 마을",
    theme: "town",
    track: "town",
    width: 30,
    height: 20,
    encounter: ",",
    rest: { x: 3, y: 14, dir: "up" },
    buildings: TOWN_BUILDINGS,
    signs: TOWN_SIGNS,
    warps: [
      { x: 29, y: 9, to: "forest", tx: 1, ty: 9, dir: "right" },
      { x: 7, y: 19, to: "harbor", tx: 7, ty: 1, dir: "down" },
      { x: 20, y: 0, to: "league", tx: 10, ty: 10, dir: "up" },
    ],
    terrain: buildTown(TOWN_BUILDINGS, TOWN_SIGNS),
  },
  forest: {
    id: "forest",
    name: "레거시 숲",
    theme: "forest",
    track: "forest",
    width: 30,
    height: 20,
    encounter: "f",
    rest: { x: 5, y: 5, dir: "down" },
    buildings: FOREST_BUILDINGS,
    signs: FOREST_SIGNS,
    warps: [
      { x: 0, y: 9, to: "town", tx: 28, ty: 9, dir: "left" },
      { x: 27, y: 0, to: "cave", tx: 14, ty: 18, dir: "up" },
    ],
    terrain: buildForest(FOREST_BUILDINGS, FOREST_SIGNS),
  },
  harbor: {
    id: "harbor",
    name: "토큰 항구",
    theme: "harbor",
    track: "harbor",
    width: 30,
    height: 20,
    encounter: "b",
    rest: { x: 12, y: 5, dir: "down" },
    buildings: HARBOR_BUILDINGS,
    signs: HARBOR_SIGNS,
    warps: [{ x: 7, y: 0, to: "town", tx: 7, ty: 18, dir: "up" }],
    terrain: buildHarbor(HARBOR_BUILDINGS, HARBOR_SIGNS),
  },
  league: {
    id: "league",
    name: "챔피언 리그",
    theme: "league",
    track: "league",
    width: 20,
    height: 12,
    encounter: "x",
    rest: { x: 3, y: 5, dir: "down" },
    buildings: LEAGUE_BUILDINGS,
    signs: LEAGUE_SIGNS,
    warps: [{ x: 10, y: 11, to: "town", tx: 20, ty: 1, dir: "down" }],
    terrain: buildLeague(LEAGUE_BUILDINGS, LEAGUE_SIGNS),
  },
  cave: {
    id: "cave",
    name: "서버 동굴",
    theme: "cave",
    track: "cave",
    dark: true,
    width: 30,
    height: 20,
    encounter: "c",
    rest: { x: 5, y: 5, dir: "down" },
    buildings: CAVE_BUILDINGS,
    signs: CAVE_SIGNS,
    warps: [{ x: 14, y: 19, to: "forest", tx: 27, ty: 1, dir: "down" }],
    terrain: buildCave(CAVE_BUILDINGS, CAVE_SIGNS),
  },
};

/**
 * 게임 상태에서 NPC와 길목이 쓰는 진행 정보만 뽑는다.
 *
 * @param state 게임 상태
 * @returns { trust, badges }
 */
export function progressOf(state) {
  return { trust: state.trust, badges: state.badges ?? [] };
}

/**
 * 칸의 지형 문자를 구한다. 지도 밖은 나무로 본다.
 *
 * @param mapId 지도 식별자
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns 지형 문자
 */
export function tileAt(mapId, x, y) {
  const map = MAPS[mapId];
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return "T";
  return map.terrain[y][x];
}

const look = (shirt, hair, skin) => ({ shirt, hair, skin });

/**
 * 어떤 조건에서 나타나는 NPC 목록을 구한다. 경비는 신뢰가 쌓이면, 숲지기는 팀장 박의 뱃지를 받으면 길을 비켜 준다.
 *
 * @param mapId 지도 식별자
 * @param progress { trust, badges }
 * @returns [{ id, name, x, y, kind, look }] kind는 guide, guard, keeper, trainer
 */
export function npcsFor(mapId, progress) {
  if (mapId === "forest") {
    const open = progress.badges.includes("forest");
    return [
      { id: "ranger", name: "수색대원 지수", x: 9, y: 8, kind: "trainer", look: look("#4f8a5a", "#2a1f16", "#f1c9a5") },
      { id: "woodcutter", name: "벌목꾼 한 씨", x: 21, y: 8, kind: "trainer", look: look("#b0553a", "#3b2417", "#e8b88f") },
      { id: "warden", name: "서버실 파수꾼", x: open ? 28 : 27, y: open ? 3 : 2, kind: "keeper", look: look("#5a6a8a", "#1f2230", "#c5ccd6") },
    ];
  }
  if (mapId === "harbor") {
    return [{ id: "purser", name: "사무장 오 씨", x: 16, y: 8, kind: "trainer", look: look("#3f6fa8", "#2a2a2a", "#f1c9a5") }];
  }
  if (mapId === "league") return [];
  if (mapId === "cave") {
    return [{ id: "operator", name: "관제 요원 서 씨", x: 18, y: 8, kind: "trainer", look: look("#3a3f55", "#1a1a1a", "#d8bfa5") }];
  }
  const open = progress.trust >= GATE_TRUST;
  return [
    { id: "zepi", name: "제피", x: 8, y: 8, kind: "guide", look: look("#5b57d6", "#2a2a6a", "#f1c9a5") },
    { id: "guard", name: "경비 로봇", x: open ? 14 : 15, y: open ? 8 : 9, kind: "guard", look: look("#8a93a3", "#4a5160", "#c5ccd6") },
    { id: "keeper", name: "숲지기", x: 28, y: progress.badges.includes("town") ? 8 : 9, kind: "keeper", look: look("#3f7a4a", "#2a3b24", "#a9c9a0") },
    { id: "dockhand", name: "항구 문지기", x: progress.badges.includes("town") ? 8 : 7, y: 18, kind: "keeper", look: look("#3a7a9a", "#2a3b44", "#e8b88f") },
    { id: "clerk", name: "리그 접수원", x: LEAGUE_BADGES.every((id) => progress.badges.includes(id)) ? 19 : 20, y: 1, kind: "keeper", look: look("#c9a14a", "#2a1f16", "#f1c9a5") },
    { id: "minsu", name: "민수", x: 12, y: 8, kind: "trainer", look: look("#6aa7d9", "#3b2417", "#f1c9a5") },
    { id: "hayun", name: "하은", x: 19, y: 8, kind: "trainer", look: look("#c98ad6", "#1f1612", "#f4d3b4") },
    { id: "daeri", name: "이 대리", x: 6, y: 10, kind: "trainer", look: look("#9bc46a", "#6b4a2b", "#e8b88f") },
    { id: "janitor", name: "청소 아저씨", x: 21, y: 10, kind: "trainer", look: look("#d9a84a", "#7a7a7a", "#e8b88f") },
    { id: "redcap", name: "빨간 모자", x: 26, y: 8, kind: "trainer", look: look("#d95a5a", "#1f1612", "#f1c9a5") },
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
 * @param mapId 지도 식별자
 * @param x 가로 칸
 * @param y 세로 칸
 * @param progress { trust, badges }(경비와 숲지기 위치가 달라진다)
 * @returns 걸을 수 있으면 true
 */
export function walkable(mapId, x, y, progress) {
  if ("T~#S".includes(tileAt(mapId, x, y))) return false;
  return !npcsFor(mapId, progress).some((npc) => npc.x === x && npc.y === y);
}

/**
 * 이 칸이 건물 입구인지 확인한다.
 *
 * @param mapId 지도 식별자
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns 건물, 없으면 undefined
 */
export function buildingAtDoor(mapId, x, y) {
  return MAPS[mapId].buildings.find((b) => b.door[0] === x && b.door[1] === y);
}

/**
 * 이 칸이 다른 지역으로 가는 입구인지 확인한다.
 *
 * @param mapId 지도 식별자
 * @param x 가로 칸
 * @param y 세로 칸
 * @returns { x, y, to, tx, ty, dir }, 없으면 undefined
 */
export function warpAt(mapId, x, y) {
  return MAPS[mapId].warps.find((w) => w.x === x && w.y === y);
}

/**
 * 한 칸 앞에 상호작용할 대상이 있는지 찾는다.
 *
 * @param mapId 지도 식별자
 * @param x 가로 칸
 * @param y 세로 칸
 * @param dir 바라보는 방향
 * @param progress { trust, badges }
 * @returns { type: "npc" | "sign", target } 또는 null
 */
export function facing(mapId, x, y, dir, progress) {
  const [fx, fy] = step(x, y, dir);
  const npc = npcsFor(mapId, progress).find((n) => n.x === fx && n.y === fy);
  if (npc) return { type: "npc", target: npc };
  const sign = MAPS[mapId].signs.find((s) => s.x === fx && s.y === fy);
  return sign ? { type: "sign", target: sign } : null;
}