import { describe, expect, it } from "vitest";
import { summarize } from "./record.js";

describe("summarize", () => {
  it("누적 수익을 한국어 단위로 보여준다", () => {
    expect(summarize({ total: 123_456_789 }, 3)).toBe("누적 수익 1.2억");
  });

  it("깨졌거나 아직 번 게 없으면 빈 문자열이다", () => {
    expect(summarize(null, 1)).toBe("");
    expect(summarize({ total: "a" }, 1)).toBe("");
    expect(summarize({ total: 0 }, 1)).toBe("");
    expect(summarize({ total: NaN }, 1)).toBe("");
  });
});