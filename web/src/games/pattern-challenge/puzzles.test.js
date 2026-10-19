import { describe, expect, it } from "vitest";
import puzzles from "./data/fixed-puzzles.json";
import pool from "./data/pool.json";

const SHAPES = ["triangle", "circle", "square", "star", "diamond"];
const COLORS = ["indigo", "cyan", "amber"];

/**
 * 셀이 종류에 맞는 올바른 형태인지 확인한다.
 */
function isValidCell(cell, kind) {
  if (kind === "number") return Number.isInteger(cell?.n);
  return SHAPES.includes(cell?.shape) && COLORS.includes(cell?.color) && Number.isFinite(cell?.rot);
}

describe("fixed-puzzles", () => {
  it("5문제이고 난이도 슬롯이 1,1,2,2,3이며 id가 유일하다", () => {
    expect(puzzles).toHaveLength(5);
    expect(puzzles.map((puzzle) => puzzle.difficulty)).toEqual([1, 1, 2, 2, 3]);
    expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(5);
  });

  it("빈칸은 마지막 한 칸이고 선택지 5개 중 정답 번호가 범위 안이다", () => {
    for (const puzzle of puzzles) {
      const blanks = puzzle.cells.filter((cell) => cell === null);
      expect(blanks, puzzle.id).toHaveLength(1);
      expect(puzzle.cells.at(-1), puzzle.id).toBeNull();
      expect(puzzle.options, puzzle.id).toHaveLength(5);
      expect(Number.isInteger(puzzle.answer) && puzzle.answer >= 0 && puzzle.answer < 5, puzzle.id).toBe(true);
      expect(puzzle.explanation.trim(), puzzle.id).not.toBe("");
    }
  });

  it("셀과 선택지가 종류에 맞는 형태이고 선택지가 서로 다르다", () => {
    for (const puzzle of puzzles) {
      for (const cell of puzzle.cells.filter((c) => c !== null)) {
        expect(isValidCell(cell, puzzle.kind), puzzle.id).toBe(true);
      }
      for (const option of puzzle.options) {
        expect(isValidCell(option, puzzle.kind), puzzle.id).toBe(true);
      }
      const serialized = puzzle.options.map((option) => JSON.stringify(option));
      expect(new Set(serialized).size, puzzle.id).toBe(5);
    }
  });
});

describe("pool", () => {
  it("난이도마다 20문제 이상이고 id가 유일하다", () => {
    for (const level of [1, 2, 3]) {
      expect(pool.filter((puzzle) => puzzle.difficulty === level).length).toBeGreaterThanOrEqual(20);
    }
    expect(new Set(pool.map((puzzle) => puzzle.id)).size).toBe(pool.length);
  });

  it("고정 문제와 같은 형식 규칙을 지킨다", () => {
    for (const puzzle of pool) {
      expect(puzzle.cells.at(-1), puzzle.id).toBeNull();
      expect(puzzle.cells.filter((cell) => cell === null), puzzle.id).toHaveLength(1);
      expect(puzzle.options, puzzle.id).toHaveLength(5);
      expect(puzzle.answer >= 0 && puzzle.answer < 5, puzzle.id).toBe(true);
      expect(puzzle.explanation.trim(), puzzle.id).not.toBe("");
      for (const cell of [...puzzle.cells.filter((c) => c !== null), ...puzzle.options]) {
        expect(isValidCell(cell, puzzle.kind), puzzle.id).toBe(true);
      }
      expect(new Set(puzzle.options.map((option) => JSON.stringify(option))).size, puzzle.id).toBe(5);
    }
  });
});
