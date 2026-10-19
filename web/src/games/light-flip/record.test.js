import { describe, expect, it } from "vitest";
import { mergeResult, summarize } from "./record.js";

describe("light-flip record", () => {
  it("첫 기록은 그대로 저장하고 새 기록 표시는 하지 않는다", () => {
    expect(mergeResult(null, { extra: 7, ms: 90000 })).toEqual({
      data: { bestExtra: 7, bestMs: 90000 },
      isNewBest: false,
    });
  });

  it("추가 이동이 적거나 같고 더 빠르면 갱신한다", () => {
    const prev = { bestExtra: 5, bestMs: 100000 };
    expect(mergeResult(prev, { extra: 2, ms: 300000 })).toEqual({
      data: { bestExtra: 2, bestMs: 300000 },
      isNewBest: true,
    });
    expect(mergeResult(prev, { extra: 5, ms: 90000 }).isNewBest).toBe(true);
  });

  it("더 나쁘거나 같으면 이전 기록을 유지한다", () => {
    const prev = { bestExtra: 5, bestMs: 100000 };
    for (const result of [
      { extra: 6, ms: 1000 },
      { extra: 5, ms: 100000 },
      { extra: 5, ms: 110000 },
    ]) {
      expect(mergeResult(prev, result)).toEqual({ data: prev, isNewBest: false });
    }
  });

  it("추가 이동 0도 정상 기록이다", () => {
    expect(mergeResult({ bestExtra: 0, bestMs: 50000 }, { extra: 0, ms: 40000 }).isNewBest).toBe(true);
    expect(summarize({ bestExtra: 0, bestMs: 1 }, 2)).toBe("최고 추가 이동 0회 · 2회 플레이");
  });

  it("깨진 기록은 없는 것으로 보고 새 기록 표시 없이 덮어쓴다", () => {
    expect(mergeResult({ bestExtra: "x" }, { extra: 3, ms: 1000 })).toEqual({
      data: { bestExtra: 3, bestMs: 1000 },
      isNewBest: false,
    });
    expect(summarize(null, 3)).toBe("");
    expect(summarize({ bestExtra: "x" }, 3)).toBe("");
  });
});