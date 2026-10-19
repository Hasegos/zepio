import { describe, expect, it } from "vitest";
import { checkAnswer, initialInput, isOpen, scoreFor, titleFor, totalScore } from "./logic.js";
import { PUZZLES, SPOTS, START_COINS } from "./puzzles.js";

describe("퍼즐 데이터", () => {
  it("식별자가 겹치지 않고 모든 필드가 채워져 있다", () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length);
    for (const p of PUZZLES) {
      expect(p.title && p.intro && p.prompt && p.explain, p.id).toBeTruthy();
      expect(["find", "order", "match"]).toContain(p.kind);
      expect(p.docs.length, p.id).toBeGreaterThan(0);
      for (const d of p.docs) expect(d.name && d.text, p.id).toBeTruthy();
      expect(p.hints, p.id).toHaveLength(3);
      expect(p.items.length, p.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("정답이 항목 범위 안에 있고 처음 입력은 정답이 아니다", () => {
    for (const p of PUZZLES) {
      expect(checkAnswer(p, initialInput(p)), p.id).toBe(false);
      if (p.kind === "find") {
        expect(new Set(p.answer).size).toBe(p.answer.length);
        for (const i of p.answer) expect(i >= 0 && i < p.items.length, p.id).toBe(true);
        expect(p.answer.length, p.id).toBeLessThan(p.items.length);
      } else if (p.kind === "order") {
        expect([...p.answer].sort((a, b) => a - b)).toEqual(p.items.map((_, i) => i));
      } else {
        expect(p.answer).toHaveLength(p.items.length);
        for (const o of p.answer) expect(o >= 0 && o < p.options.length, p.id).toBe(true);
      }
    }
  });

  it("고르기 퍼즐은 환각 개수를 문제문에 적고 환각 유형을 모두 설명한다", () => {
    for (const p of PUZZLES.filter((q) => q.kind === "find")) {
      expect(p.prompt, p.id).toContain(`(${p.prompt.includes("거짓") ? "거짓 진술은" : "환각은"} ${p.answer.length}개)`);
      expect(Object.keys(p.kinds).map(Number).sort()).toEqual([...p.answer].sort((a, b) => a - b));
    }
  });

  it("힌트 마지막 단계는 정답 위치를 번호로 알려 준다", () => {
    for (const p of PUZZLES.filter((q) => q.kind === "find")) {
      for (const i of p.answer) expect(p.hints[2], p.id).toContain(`${i + 1}번`);
    }
  });

  it("사무소 숨은 코인과 첫 시도 보상으로 퍼즐마다 힌트 하나는 쓸 수 있다", () => {
    expect(new Set(SPOTS.map((s) => s.id)).size).toBe(SPOTS.length);
    const coins = START_COINS + SPOTS.filter((s) => s.coin).length + PUZZLES.length;
    expect(coins).toBeGreaterThanOrEqual(PUZZLES.length);
  });
});

describe("판정", () => {
  it("고르기는 순서에 상관없이 정확히 같은 선택일 때만 정답이다", () => {
    const p = PUZZLES[0];
    expect(checkAnswer(p, [4, 2])).toBe(true);
    expect(checkAnswer(p, [2])).toBe(false);
    expect(checkAnswer(p, [2, 4, 1])).toBe(false);
  });

  it("순서 놓기와 짝짓기는 모두 같아야 정답이다", () => {
    const order = PUZZLES.find((p) => p.kind === "order");
    expect(checkAnswer(order, order.answer)).toBe(true);
    expect(checkAnswer(order, [...order.answer].reverse())).toBe(false);
    const match = PUZZLES.find((p) => p.kind === "match");
    expect(checkAnswer(match, match.answer)).toBe(true);
    expect(checkAnswer(match, match.answer.map(() => null))).toBe(false);
  });
});

describe("점수와 열림", () => {
  it("오답마다 20점 깎이고 20점 아래로 내려가지 않는다", () => {
    expect(scoreFor(0)).toBe(100);
    expect(scoreFor(2)).toBe(60);
    expect(scoreFor(9)).toBe(20);
  });

  it("처음에는 세 퍼즐이 열리고 풀수록 다음이 열린다", () => {
    const solved = {};
    const open = () => PUZZLES.map((_, i) => isOpen(solved, i)).filter(Boolean).length;
    expect(open()).toBe(3);
    solved.p01 = { score: 100, wrong: 0 };
    expect(open()).toBe(4);
    solved.p03 = { score: 100, wrong: 0 };
    expect(isOpen(solved, 3)).toBe(true);
    expect(isOpen(solved, 11)).toBe(false);
  });

  it("마지막 퍼즐은 나머지를 모두 풀어야 열린다", () => {
    const solved = Object.fromEntries(PUZZLES.slice(0, -1).map((p) => [p.id, { score: 100, wrong: 0 }]));
    expect(isOpen(solved, PUZZLES.length - 1)).toBe(true);
    delete solved.p05;
    expect(isOpen(solved, PUZZLES.length - 1)).toBe(false);
  });

  it("점수 합계로 칭호가 정해진다", () => {
    expect(totalScore({ a: { score: 80 }, b: { score: 100 } })).toBe(180);
    expect(titleFor(1200)).toBe("전설의 탐정");
    expect(titleFor(0)).toBe("수습 탐정");
  });
});