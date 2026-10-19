import { describe, expect, it } from "vitest";
import pool from "./data/pool.json";
import { pickPuzzles, RUN_SLOTS } from "./pick-puzzles.js";

describe("pickPuzzles", () => {
  it("슬롯 난이도 순서대로 뽑고 같은 문제를 두 번 뽑지 않는다", () => {
    for (let i = 0; i < 50; i += 1) {
      const picked = pickPuzzles(pool);
      expect(picked.map((puzzle) => puzzle.difficulty)).toEqual(RUN_SLOTS);
      expect(new Set(picked.map((puzzle) => puzzle.id)).size).toBe(RUN_SLOTS.length);
    }
  });

  it("난수에 따라 다른 문제를 고른다", () => {
    const first = pickPuzzles(pool, () => 0).map((puzzle) => puzzle.id);
    const last = pickPuzzles(pool, () => 0.999).map((puzzle) => puzzle.id);
    expect(first).not.toEqual(last);
  });
});