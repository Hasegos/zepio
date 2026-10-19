import { describe, expect, it } from "vitest";
import { isUnlocked, mergeBest, readData, summarize, totalStars } from "./record.js";

describe("readData", () => {
  it("깨진 값은 빈 기록으로 읽는다", () => {
    for (const raw of [null, "x", 5, {}, { v: 2 }, { v: 1, best: null }, { v: 1, best: "x" }]) {
      expect(readData(raw)).toEqual({ v: 1, best: {}, run: null });
    }
  });

  it("알 수 없는 섬과 잘못된 항목은 버리고 이어 할 판은 객체일 때만 남긴다", () => {
    const data = readData({
      v: 1,
      best: { sprout: { score: 100, stars: 2 }, shell: { score: "9", stars: 1 }, ring: { score: 5, stars: 7 }, nope: { score: 1, stars: 1 } },
      run: { seed: 1 },
    });
    expect(data.best).toEqual({ sprout: { score: 100, stars: 2 } });
    expect(data.run).toEqual({ seed: 1 });
    expect(readData({ v: 1, best: {}, run: "x" }).run).toBeNull();
  });
});

describe("mergeBest", () => {
  it("처음에는 새 기록이 아니고, 더 높을 때만 새 기록이며, 별은 줄지 않는다", () => {
    const first = mergeBest(null, "sprout", { score: 100, stars: 2 });
    expect(first.isNewBest).toBe(false);
    expect(first.data.best.sprout).toEqual({ score: 100, stars: 2 });
    const worse = mergeBest(first.data, "sprout", { score: 90, stars: 1 });
    expect(worse.isNewBest).toBe(false);
    expect(worse.data.best.sprout).toEqual({ score: 100, stars: 2 });
    const better = mergeBest(worse.data, "sprout", { score: 130, stars: 3 });
    expect(better.isNewBest).toBe(true);
    expect(better.data.best.sprout).toEqual({ score: 130, stars: 3 });
  });

  it("끝난 판이므로 이어 할 판을 지운다", () => {
    expect(mergeBest({ v: 1, best: {}, run: { seed: 1 } }, "sprout", { score: 1, stars: 0 }).data.run).toBeNull();
  });
});

describe("별과 해금", () => {
  const data = { v: 1, best: { sprout: { score: 130, stars: 3 }, shell: { score: 90, stars: 1 } }, run: null };

  it("별 합계로 섬이 열린다(첫 섬은 항상, 그 뒤는 두 개씩)", () => {
    expect(totalStars(data)).toBe(4);
    expect(isUnlocked(null, 0)).toBe(true);
    expect(isUnlocked(null, 1)).toBe(false);
    expect(isUnlocked(data, 2)).toBe(true);
    expect(isUnlocked(data, 3)).toBe(false);
  });

  it("홈 카드 요약은 별 합계와 최고점이고 기록이 없거나 깨지면 빈 문자열이다", () => {
    expect(summarize(data)).toBe("별 4개 · 최고 130점");
    expect(summarize(null)).toBe("");
    expect(summarize({ v: 1, best: {}, run: null })).toBe("");
  });
});