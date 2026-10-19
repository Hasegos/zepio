import { describe, expect, it } from "vitest";
import { mergeResult, summarize } from "./record.js";

describe("color-clash record", () => {
  it("첫 기록은 그대로 저장하고 새 기록 표시는 하지 않는다", () => {
    expect(mergeResult(null, { score: 0, accuracy: 0 })).toEqual({
      data: { bestScore: 0, bestAccuracy: 0 },
      isNewBest: false,
    });
  });

  it("점수가 높거나 같고 정확도가 높으면 갱신한다", () => {
    const prev = { bestScore: 10, bestAccuracy: 80 };
    expect(mergeResult(prev, { score: 12, accuracy: 50 })).toEqual({
      data: { bestScore: 12, bestAccuracy: 50 },
      isNewBest: true,
    });
    expect(mergeResult(prev, { score: 10, accuracy: 90 }).isNewBest).toBe(true);
  });

  it("더 나쁘거나 같으면 이전 기록을 유지한다", () => {
    const prev = { bestScore: 10, bestAccuracy: 80 };
    for (const result of [
      { score: 9, accuracy: 100 },
      { score: 10, accuracy: 80 },
      { score: 10, accuracy: 70 },
    ]) {
      expect(mergeResult(prev, result)).toEqual({ data: prev, isNewBest: false });
    }
  });

  it("깨진 기록은 없는 것으로 보고 새 기록 표시 없이 덮어쓴다", () => {
    expect(mergeResult({ bestScore: "x" }, { score: 3, accuracy: 60 })).toEqual({
      data: { bestScore: 3, bestAccuracy: 60 },
      isNewBest: false,
    });
  });

  it("요약 문구를 만들고 깨졌으면 빈 문자열이다", () => {
    expect(summarize({ bestScore: 12, bestAccuracy: 80 }, 3)).toBe("최고 12점 · 3회 플레이");
    expect(summarize(null, 3)).toBe("");
    expect(summarize({ bestScore: "x" }, 3)).toBe("");
  });
});