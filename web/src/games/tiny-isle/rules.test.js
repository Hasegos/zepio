import { describe, expect, it } from "vitest";
import { makeRng } from "../_shared/rng.js";
import { BUILDING_IDS, BUILDINGS, canBuild, CELLS, change, NEAR, NEIGHBORS, scoreAt, scoreBoard, SIZE } from "./rules.js";

const land = () => Array(CELLS).fill("g");
const empty = () => Array(CELLS).fill(null);
const at = (x, y) => y * SIZE + x;
const put = (entries) => {
  const board = empty();
  for (const [x, y, id] of entries) board[at(x, y)] = id;
  return board;
};

describe("이웃 칸", () => {
  it("모서리는 이웃이 둘, 가운데는 넷이고 두 칸 안은 가운데 12칸이다", () => {
    expect(NEIGHBORS[0]).toHaveLength(2);
    expect(NEIGHBORS[at(3, 3)]).toHaveLength(4);
    expect(NEAR[at(3, 3)]).toHaveLength(12);
  });
});

describe("규칙 문구", () => {
  it("문구의 기본 점수가 실제 혼자 놓았을 때의 점수와 같다", () => {
    for (const building of BUILDINGS) {
      const board = put([[3, 3, building.id]]);
      const terrain = land();
      if (building.coast) terrain[at(2, 3)] = "w";
      const alone = scoreAt(terrain, board, at(3, 3));
      expect(building.rule, building.id).toContain(`기본 ${alone}`);
    }
  });
});

describe("건물 점수", () => {
  it("집은 공원 옆 +2, 가게와 숲 옆 +1, 공장 옆 −2다", () => {
    const base = [[3, 3, "house"]];
    expect(scoreAt(land(), put(base), at(3, 3))).toBe(1);
    expect(scoreAt(land(), put([...base, [4, 3, "park"]]), at(3, 3))).toBe(3);
    expect(scoreAt(land(), put([...base, [4, 3, "shop"], [2, 3, "forest"]]), at(3, 3))).toBe(3);
    expect(scoreAt(land(), put([...base, [4, 3, "factory"]]), at(3, 3))).toBe(-1);
  });

  it("풍차는 농장 옆 +3, 농장은 풍차 옆 +2와 농장 옆 +1이다", () => {
    const board = put([
      [3, 3, "windmill"],
      [2, 3, "farm"],
      [4, 3, "farm"],
    ]);
    expect(scoreAt(land(), board, at(3, 3))).toBe(6);
    expect(scoreAt(land(), board, at(2, 3))).toBe(3);
  });

  it("가게는 이웃의 다른 종류 수만큼 오르고 4가 한도다", () => {
    const board = put([
      [3, 3, "shop"],
      [2, 3, "house"],
      [4, 3, "park"],
      [3, 2, "farm"],
      [3, 4, "forest"],
    ]);
    expect(scoreAt(land(), board, at(3, 3))).toBe(6);
    expect(
      scoreAt(
        land(),
        put([
          [3, 3, "shop"],
          [4, 3, "shop"],
        ]),
        at(3, 3),
      ),
    ).toBe(2);
  });

  it("등대와 공원은 물 옆에서 오르고, 부두는 물가에만 지을 수 있다", () => {
    const terrain = land();
    terrain[at(0, 0)] = "w";
    const board = put([
      [1, 0, "lighthouse"],
      [0, 1, "park"],
    ]);
    expect(scoreAt(terrain, board, at(1, 0))).toBe(2);
    expect(scoreAt(terrain, board, at(0, 1))).toBe(2);
    expect(canBuild(terrain, empty(), "dock", at(1, 0))).toBe(true);
    expect(canBuild(terrain, empty(), "dock", at(4, 4))).toBe(false);
  });

  it("학교는 두 칸 안의 집 수(최대 6)를, 숲은 두 칸 안의 다른 숲 수(최대 4)를 센다", () => {
    const houses = put([
      [3, 3, "school"],
      [3, 2, "house"],
      [3, 1, "house"],
      [5, 3, "house"],
    ]);
    expect(scoreAt(land(), houses, at(3, 3))).toBe(4);
    const woods = put([
      [3, 3, "forest"],
      [2, 3, "forest"],
      [3, 1, "forest"],
    ]);
    expect(scoreAt(land(), woods, at(3, 3))).toBe(3);
  });

  it("땅이 아니거나 이미 건물이 있는 칸에는 지을 수 없다", () => {
    const terrain = land();
    terrain[0] = "r";
    terrain[1] = "w";
    expect(canBuild(terrain, empty(), "house", 0)).toBe(false);
    expect(canBuild(terrain, empty(), "house", 1)).toBe(false);
    expect(canBuild(terrain, put([[2, 0, "house"]]), "house", 2)).toBe(false);
    expect(canBuild(terrain, empty(), "house", 2)).toBe(true);
  });

  it("미리보기 변화량은 판 전체를 다시 계산한 차이와 항상 같다", () => {
    const rng = makeRng(42);
    for (let round = 0; round < 40; round += 1) {
      const terrain = Array.from({ length: CELLS }, () => (rng() < 0.2 ? "w" : "g"));
      const board = Array.from({ length: CELLS }, () =>
        rng() < 0.5 ? BUILDING_IDS[Math.floor(rng() * BUILDING_IDS.length)] : null,
      );
      const i = Math.floor(rng() * CELLS);
      const id = rng() < 0.2 ? null : BUILDING_IDS[Math.floor(rng() * BUILDING_IDS.length)];
      const next = [...board];
      next[i] = id;
      expect(change(terrain, board, i, id).delta).toBe(scoreBoard(terrain, next) - scoreBoard(terrain, board));
    }
  });
});