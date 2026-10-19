import { describe, expect, it } from "vitest";
import { checkAnswer, initialInput, isComplete, isOpen, scoreFor, titleFor, totalScore } from "./logic.js";
import { PUZZLES, SPOTS, START_COINS } from "./puzzles.js";

describe("퍼즐 데이터", () => {
  it("식별자가 겹치지 않고 모든 필드가 채워져 있다", () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length);
    for (const p of PUZZLES) {
      expect(p.title && p.intro && p.prompt && p.explain, p.id).toBeTruthy();
      expect(["find", "order", "liars", "grid"]).toContain(p.kind);
      if (p.kind === "find" || p.kind === "order") expect(p.docs.length, p.id).toBeGreaterThan(0);
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
      } else if (p.kind === "liars") {
        expect(p.answer).toHaveLength(1);
        expect(p.answer[0] >= 0 && p.answer[0] < p.suspects.length, p.id).toBe(true);
      } else {
        for (const perm of p.answer) expect([...perm].sort((a, b) => a - b), p.id).toEqual([...Array(p.slots.length).keys()]);
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

  it("추리 퍼즐은 힌트 마지막 단계에 답을 알려 주고 해설이 정답을 담는다", () => {
    for (const p of PUZZLES.filter((q) => q.kind === "liars")) {
      expect(p.hints[2], p.id).toContain(p.suspects[p.answer[0]]);
      expect(p.explain, p.id).toContain(p.suspects[p.answer[0]]);
    }
    for (const p of PUZZLES.filter((q) => q.kind === "grid")) {
      expect(p.hints[2], p.id).toContain(p.slots[0]);
      expect(p.explain, p.id).toContain(p.slots[p.slots.length - 1]);
    }
  });

  it("퍼즐은 12개이고 추리 사건이 네 가지 방식으로 섞여 있으며 마지막은 5x5 격자다", () => {
    expect(PUZZLES).toHaveLength(12);
    const count = (kind) => PUZZLES.filter((p) => p.kind === kind).length;
    expect([count("find"), count("order"), count("liars"), count("grid")]).toEqual([3, 1, 4, 4]);
    const last = PUZZLES.at(-1);
    expect(last).toMatchObject({ id: "g4", kind: "grid" });
    expect(last.slots).toHaveLength(5);
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
  });

  it("범인 고르기는 정답 용의자를 골라야 정답이다", () => {
    const liars = PUZZLES.find((p) => p.kind === "liars");
    expect(checkAnswer(liars, [liars.answer[0]])).toBe(true);
    expect(checkAnswer(liars, [(liars.answer[0] + 1) % liars.suspects.length])).toBe(false);
    expect(checkAnswer(liars, [null])).toBe(false);
  });

  it("격자는 ●가 정답 자리에만 있어야 정답이고 ✗는 상관없다", () => {
    const grid = PUZZLES.find((p) => p.kind === "grid");
    const n = grid.slots.length;
    const filled = grid.answer.map((options) => options.flatMap((option) => Array.from({ length: n }, (_, o) => (o === option ? 2 : 0))));
    expect(checkAnswer(grid, filled)).toBe(true);
    const crossed = filled.map((cells) => cells.map((v) => (v === 0 ? 1 : v)));
    expect(checkAnswer(grid, crossed)).toBe(true);
    const extra = filled.map((cells, c) => (c === 0 ? cells.map((v, i) => (i === 1 && v === 0 ? 2 : v)) : cells));
    expect(checkAnswer(grid, extra)).toBe(false);
    const swapped = filled.map((cells, c) => (c === 0 ? [...cells.slice(n), ...cells.slice(0, n)].slice(0, n * n) : cells));
    expect(checkAnswer(grid, swapped)).toBe(false);
    expect(checkAnswer(grid, initialInput(grid))).toBe(false);
  });

  it("격자는 줄마다 ●가 하나씩 있어야 결정할 수 있다", () => {
    const grid = PUZZLES.find((p) => p.kind === "grid");
    const n = grid.slots.length;
    expect(isComplete(grid, initialInput(grid))).toBe(false);
    const filled = grid.answer.map((options) => options.flatMap((option) => Array.from({ length: n }, (_, o) => (o === option ? 2 : 0))));
    expect(isComplete(grid, filled)).toBe(true);
    const twice = filled.map((cells, c) => (c === 0 ? cells.map((v, i) => (i === 1 ? 2 : v)) : cells));
    expect(isComplete(grid, twice)).toBe(false);
  });

  it("고르기와 짝짓기류의 결정 가능 조건", () => {
    const find = PUZZLES.find((p) => p.kind === "find");
    expect(isComplete(find, [])).toBe(false);
    expect(isComplete(find, [1])).toBe(true);
    const order = PUZZLES.find((p) => p.kind === "order");
    expect(isComplete(order, initialInput(order))).toBe(true);
    const liars = PUZZLES.find((p) => p.kind === "liars");
    expect(isComplete(liars, [null])).toBe(false);
    expect(isComplete(liars, [0])).toBe(true);
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
    solved.g1 = { score: 100, wrong: 0 };
    expect(isOpen(solved, 3)).toBe(true);
    expect(isOpen(solved, 11)).toBe(false);
  });

  it("마지막 퍼즐은 나머지를 모두 풀어야 열린다", () => {
    const solved = Object.fromEntries(PUZZLES.slice(0, -1).map((p) => [p.id, { score: 100, wrong: 0 }]));
    expect(isOpen(solved, PUZZLES.length - 1)).toBe(true);
    delete solved.l3;
    expect(isOpen(solved, PUZZLES.length - 1)).toBe(false);
  });

  it("점수 합계로 칭호가 정해진다", () => {
    expect(totalScore({ a: { score: 80 }, b: { score: 100 } })).toBe(180);
    expect(titleFor(1200)).toBe("전설의 탐정");
    expect(titleFor(0)).toBe("수습 탐정");
  });
});