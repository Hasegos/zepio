import { describe, expect, it } from "vitest";
import { formatCoins, formatCompact, formatRate, formatSpan } from "./format.js";

describe("formatCompact", () => {
  it("시안의 예시와 같게 천, 만, 억, 조로 줄인다", () => {
    expect(formatCompact(1240)).toBe("1.2천");
    expect(formatCompact(12400)).toBe("1.2만");
    expect(formatCompact(123_400_000)).toBe("1.2억");
    expect(formatCompact(5_600_000_000_000)).toBe("5.6조");
  });

  it("1천 미만은 정수 그대로이고 .0은 생략한다", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(30_000)).toBe("3만");
    expect(formatCompact(100_000_000)).toBe("1억");
  });

  it("올림하지 않아 단위 경계를 넘어 보이지 않는다", () => {
    expect(formatCompact(9999)).toBe("9.9천");
    expect(formatCompact(99_999)).toBe("9.9만");
    expect(formatCompact(99_999_999)).toBe("9999.9만");
    expect(formatCompact(1.1e8)).toBe("1.1억");
  });

  it("음수, NaN, Infinity는 0으로 본다", () => {
    for (const bad of [-5, NaN, Infinity, undefined, null, "12"]) expect(formatCompact(bad)).toBe("0");
  });
});

describe("formatCoins", () => {
  it("1만 미만은 쉼표 정수, 이상은 줄인 단위다", () => {
    expect(formatCoins(0)).toBe("0");
    expect(formatCoins(1240.9)).toBe("1,240");
    expect(formatCoins(9999)).toBe("9,999");
    expect(formatCoins(12400)).toBe("1.2만");
  });
});

describe("formatRate", () => {
  it("10 미만은 소수 첫째 자리 내림, 이상은 정수나 단위다", () => {
    expect(formatRate(0)).toBe("0");
    expect(formatRate(0.55)).toBe("0.5");
    expect(formatRate(9.99)).toBe("9.9");
    expect(formatRate(12.7)).toBe("12");
    expect(formatRate(1500)).toBe("1.5천");
  });
});

describe("formatSpan", () => {
  it("시간에 맞춰 시, 분, 초로 보여준다", () => {
    expect(formatSpan(154 * 60 * 1000)).toBe("2시간 34분");
    expect(formatSpan(5 * 60 * 1000 + 23_000)).toBe("5분");
    expect(formatSpan(42_000)).toBe("42초");
    expect(formatSpan(-1)).toBe("0초");
  });
});