import { CELLS, NEIGHBORS, scoreAt, WATER } from "./rules.js";

export const QUEST_BONUS = 10;

/**
 * 건물이 놓인 칸 번호를 모은다.
 *
 * @param board 건물 배열
 * @param id 건물 id
 * @returns 칸 번호 목록
 */
function cellsOf(board, id) {
  return board.flatMap((b, i) => (b === id ? [i] : []));
}

export const QUESTS = [
  {
    id: "homes",
    name: "내 집 마련",
    desc: "집 7채 이상",
    needs: ["house"],
    test: (t, b) => cellsOf(b, "house").length >= 7,
    progress: (t, b) => `${cellsOf(b, "house").length}/7`,
  },
  {
    id: "parkhomes",
    name: "공원이 보이는 집",
    desc: "공원 옆 집 4채 이상",
    needs: ["house", "park"],
    test: (t, b) => cellsOf(b, "house").filter((i) => NEIGHBORS[i].some((n) => b[n] === "park")).length >= 4,
    progress: (t, b) => `${cellsOf(b, "house").filter((i) => NEIGHBORS[i].some((n) => b[n] === "park")).length}/4`,
  },
  {
    id: "mill",
    name: "바람 부는 밭",
    desc: "농장 3개가 붙은 풍차 1개",
    needs: ["farm", "windmill"],
    test: (t, b) => cellsOf(b, "windmill").some((i) => NEIGHBORS[i].filter((n) => b[n] === "farm").length >= 3),
    progress: (t, b) =>
      `${Math.max(0, ...cellsOf(b, "windmill").map((i) => NEIGHBORS[i].filter((n) => b[n] === "farm").length))}/3`,
  },
  {
    id: "clean",
    name: "맑은 하늘",
    desc: "공장 없이 건물 18채 이상",
    needs: ["factory"],
    test: (t, b) => cellsOf(b, "factory").length === 0 && b.filter(Boolean).length >= 18,
    progress: (t, b) => `공장 ${cellsOf(b, "factory").length}개 · ${b.filter(Boolean).length}/18채`,
  },
  {
    id: "coast",
    name: "바다가 좋아",
    desc: "물가의 건물 6채 이상",
    needs: [],
    test: (t, b) => coastCount(t, b) >= 6,
    progress: (t, b) => `${coastCount(t, b)}/6`,
  },
  {
    id: "variety",
    name: "없는 게 없는 섬",
    desc: "건물 종류 6가지 이상",
    needs: [],
    test: (t, b) => new Set(b.filter(Boolean)).size >= 6,
    progress: (t, b) => `${new Set(b.filter(Boolean)).size}/6`,
  },
  {
    id: "star",
    name: "섬의 명물",
    desc: "건물 하나가 9점 이상",
    needs: [],
    test: (t, b) => bestSingle(t, b) >= 9,
    progress: (t, b) => `${bestSingle(t, b)}/9`,
  },
  {
    id: "school",
    name: "동네 학교",
    desc: "집 5채가 두 칸 안에 있는 학교 1개",
    needs: ["school", "house"],
    test: (t, b) => cellsOf(b, "school").some((i) => scoreAt(t, b, i) >= 6),
    progress: (t, b) => `${Math.max(0, ...cellsOf(b, "school").map((i) => scoreAt(t, b, i) - 1))}/5`,
  },
  {
    id: "woods",
    name: "푸른 숲",
    desc: "숲 4개 이상",
    needs: ["forest"],
    test: (t, b) => cellsOf(b, "forest").length >= 4,
    progress: (t, b) => `${cellsOf(b, "forest").length}/4`,
  },
];

/**
 * 물가에 놓인 건물 수를 센다.
 *
 * @param terrain 지형 배열
 * @param board 건물 배열
 * @returns 건물 수
 */
function coastCount(terrain, board) {
  let count = 0;
  for (let i = 0; i < CELLS; i += 1) {
    if (board[i] && NEIGHBORS[i].some((n) => terrain[n] === WATER)) count += 1;
  }
  return count;
}

/**
 * 가장 점수가 높은 건물 하나의 점수를 구한다.
 *
 * @param terrain 지형 배열
 * @param board 건물 배열
 * @returns 점수
 */
function bestSingle(terrain, board) {
  return Math.max(0, ...board.map((b, i) => scoreAt(terrain, board, i)));
}

/**
 * 섬에서 나올 수 있는 의뢰 중 세 개를 시드로 고른다. 그 섬 카드에 없는 건물이 필요한 의뢰는 빠진다.
 *
 * @param pool { 건물 id: 장수 }
 * @param rng 난수 함수
 * @returns 의뢰 id 세 개
 */
export function pickQuests(pool, rng) {
  const eligible = QUESTS.filter((quest) => quest.needs.every((id) => pool[id] > 0));
  const picked = [];
  const rest = [...eligible];
  while (picked.length < 3 && rest.length) picked.push(rest.splice(Math.floor(rng() * rest.length), 1)[0].id);
  return picked;
}

/**
 * 의뢰 id로 의뢰를 찾는다.
 *
 * @param id 의뢰 id
 * @returns 의뢰, 없으면 undefined
 */
export function questById(id) {
  return QUESTS.find((quest) => quest.id === id);
}