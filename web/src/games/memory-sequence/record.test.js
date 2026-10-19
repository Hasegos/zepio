import { describe, expect, it } from "vitest";
import { mergeResult, summarize } from "./record.js";

describe("memory-sequence record", () => {
  it("첫 기록은 그대로 저장하고 새 기록 표시는 하지 않는다", () => {
    expect(mergeResult(null, { cleared: 0, ms: 4000 })).toEqual({
      data: { bestRound: 0, bestMs: 4000 },
      isNewBest: false,
    });
  });

  it("라운드가 높거나 같고 더 빠르면 갱신한다", () => {
    const prev = { bestRound: 4, bestMs: 30000 };
    expect(mergeResult(prev, { cleared: 6, ms: 90000 })).toEqual({
      data: { bestRound: 6, bestMs: 90000 },
      isNewBest: true,
    });
    expect(mergeResult(prev, { cleared: 4, ms: 25000 }).isNewBest).toBe(true);
  });

  it("더 나쁘거나 같으면 이전 기록을 유지한다", () => {
    const prev = { bestRound: 4, bestMs: 30000 };
    for (const result of [
      { cleared: 3, ms: 1000 },
      { cleared: 4, ms: 30000 },
      { cleared: 4, ms: 31000 },
    ]) {
      expect(mergeResult(prev, result)).toEqual({ data: prev, isNewBest: false });
    }
  });

  it("깨진 저장 값은 기록이 없는 것으로 본다", () => {
    expect(mergeResult({ bestRound: null }, { cleared: 2, ms: 5 }).data).toEqual({ bestRound: 2, bestMs: 5 });
  });

  it("요약 문구를 만들고 깨진 데이터는 빈 문자열이다", () => {
    expect(summarize({ bestRound: 6, bestMs: 1 }, 2)).toBe("최고 6 / 15 라운드 · 2회 플레이");
    expect(summarize({}, 2)).toBe("");
  });
});