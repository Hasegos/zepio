import { describe, expect, it } from "vitest";
import { CELLS, isSolved, makeStage, makeStages, SIZE, solveMin, STAGE_RANGES, toggle } from "./puzzle.js";

/**
 * 시드가 같으면 같은 수열을 만드는 난수 함수(mulberry32).
 *
 * @param seed 정수 시드
 * @returns 0 이상 1 미만의 수를 돌려주는 함수
 */
function seeded(seed) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const empty = () => new Array(CELLS).fill(0);
const lit = (board) => board.flatMap((value, i) => (value ? [i] : []));

describe("toggle", () => {
  it("가운데 칸은 자기 자신과 위아래좌우 다섯 칸을 뒤집는다", () => {
    expect(lit(toggle(empty(), 12))).toEqual([7, 11, 12, 13, 17]);
  });

  it("모서리 칸은 세 칸만 뒤집고 가장자리를 넘지 않는다", () => {
    expect(lit(toggle(empty(), 0))).toEqual([0, 1, SIZE]);
    expect(lit(toggle(empty(), 4))).toEqual([3, 4, 9]);
    expect(lit(toggle(empty(), 24))).toEqual([19, 23, 24]);
  });

  it("같은 칸을 두 번 누르면 원래대로 돌아오고 원본은 바뀌지 않는다", () => {
    const board = empty();
    expect(toggle(toggle(board, 7), 7)).toEqual(board);
    expect(board).toEqual(empty());
  });
});

describe("solveMin", () => {
  it("꺼진 판은 이동이 0이다", () => {
    expect(solveMin(empty())).toEqual({ count: 0, presses: [] });
  });

  it("한 번 누른 판은 한 번으로 풀린다", () => {
    for (let cell = 0; cell < CELLS; cell += 1) {
      expect(solveMin(toggle(empty(), cell))).toEqual({ count: 1, presses: [cell] });
    }
  });

  it("구한 이동을 누르면 모든 불이 꺼지고 섞은 횟수를 넘지 않는다", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const random = seeded(seed);
      const presses = 1 + Math.floor(random() * 15);
      let board = empty();
      const cells = new Set();
      while (cells.size < presses) cells.add(Math.floor(random() * CELLS));
      cells.forEach((cell) => {
        board = toggle(board, cell);
      });
      const solution = solveMin(board);
      expect(solution).not.toBeNull();
      expect(solution.count).toBeLessThanOrEqual(presses);
      expect(isSolved(solution.presses.reduce(toggle, board))).toBe(true);
    }
  });

  it("5x5에서는 풀 수 없는 판이 있고 그때는 null이다", () => {
    const unsolvable = empty();
    unsolvable[0] = 1;
    expect(solveMin(unsolvable)).toBeNull();
  });

  it("더 적은 이동으로 푸는 방법이 없다(작은 판은 전수 조사로 확인한다)", () => {
    const solvesWithFewer = (board, limit) => {
      const search = (from, left, current) => {
        if (isSolved(current)) return true;
        if (left === 0) return false;
        for (let cell = from; cell < CELLS; cell += 1) if (search(cell + 1, left - 1, toggle(current, cell))) return true;
        return false;
      };
      return search(0, limit, board);
    };
    for (let seed = 1; seed <= 15; seed += 1) {
      const random = seeded(seed);
      let board = empty();
      const cells = new Set();
      while (cells.size < 6) cells.add(Math.floor(random() * CELLS));
      cells.forEach((cell) => {
        board = toggle(board, cell);
      });
      const { count } = solveMin(board);
      expect(solvesWithFewer(board, count - 1)).toBe(false);
      expect(solvesWithFewer(board, count)).toBe(true);
    }
  });
});

describe("makeStage와 makeStages", () => {
  it("요청한 범위 안의 최소 이동 횟수를 가진 풀 수 있는 판을 만든다", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const [min, max] of STAGE_RANGES) {
        const stage = makeStage(seeded(seed), min, max);
        expect(stage.par).toBeGreaterThanOrEqual(min);
        expect(stage.par).toBeLessThanOrEqual(max);
        expect(solveMin(stage.board).count).toBe(stage.par);
        expect(isSolved(stage.board)).toBe(false);
      }
    }
  });

  it("5단계를 만들고 같은 시드면 같은 판이 나온다", () => {
    const first = makeStages(seeded(42));
    expect(first).toHaveLength(STAGE_RANGES.length);
    expect(first).toEqual(makeStages(seeded(42)));
    expect(first).not.toEqual(makeStages(seeded(43)));
  });
});