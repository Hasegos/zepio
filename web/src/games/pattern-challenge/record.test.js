import { describe, expect, it } from "vitest";
import { mergeResult, summarize } from "./record.js";

describe("pattern-challenge record", () => {
  it("첫 기록은 그대로 저장하고 새 기록 표시는 하지 않는다", () => {
    expect(mergeResult(null, { correct: 3, ms: 90000 })).toEqual({
      data: { bestCorrect: 3, bestMs: 90000 },
      isNewBest: false,
    });
  });

  it("정답 수가 많거나 같고 더 빠르면 갱신한다", () => {
    const prev = { bestCorrect: 3, bestMs: 90000 };
    expect(mergeResult(prev, { correct: 4, ms: 200000 })).toEqual({
      data: { bestCorrect: 4, bestMs: 200000 },
      isNewBest: true,
    });
    expect(mergeResult(prev, { correct: 3, ms: 80000 }).isNewBest).toBe(true);
  });

  it("더 나쁘거나 같으면 이전 기록을 유지한다", () => {
    const prev = { bestCorrect: 3, bestMs: 90000 };
    for (const result of [
      { correct: 2, ms: 1000 },
      { correct: 3, ms: 90000 },
      { correct: 3, ms: 95000 },
    ]) {
      expect(mergeResult(prev, result)).toEqual({ data: prev, isNewBest: false });
    }
  });

  it("깨진 저장 값은 기록이 없는 것으로 본다", () => {
    expect(mergeResult({ bestCorrect: "x" }, { correct: 1, ms: 5 }).data).toEqual({ bestCorrect: 1, bestMs: 5 });
  });

  it("요약 문구를 만들고 깨진 데이터는 빈 문자열이다", () => {
    expect(summarize({ bestCorrect: 4, bestMs: 1 }, 3)).toBe("최고 4 / 5 정답 · 3회 플레이");
    expect(summarize(null, 3)).toBe("");
  });
});