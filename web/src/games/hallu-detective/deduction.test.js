import { describe, expect, it } from "vitest";
import { claimHolds, claimText, clueText, culpritsOf, gridPuzzle, josa, liarsPuzzle } from "./deduction.js";
import { PUZZLES } from "./puzzles.js";

describe("조사", () => {
  it("받침에 따라 알맞은 조사를 붙인다", () => {
    expect(josa("민수", "은/는")).toBe("민수는");
    expect(josa("하은", "은/는")).toBe("하은은");
    expect(josa("하은", "이/가")).toBe("하은이");
    expect(josa("이 대리", "이/가")).toBe("이 대리가");
    expect(josa("커피", "과/와")).toBe("커피와");
    expect(josa("김밥", "과/와")).toBe("김밥과");
  });

  it("한글이 아니면 받침이 없는 것으로 본다", () => {
    expect(josa("A", "은/는")).toBe("A는");
  });
});

describe("진술", () => {
  const names = ["민수", "하은", "이 대리"];

  it("진술 문장과 참 거짓이 주장과 맞는다", () => {
    expect(claimText({ t: "is", x: 2 }, names)).toBe("범인은 이 대리입니다.");
    expect(claimText({ t: "not", x: 1 }, names)).toBe("범인은 하은이 아닙니다.");
    expect(claimText({ t: "in", xs: [0, 2] }, names)).toBe("범인은 민수와 이 대리 중 한 명입니다.");
    expect(claimText({ t: "notin", xs: [0, 1] }, names)).toBe("범인은 민수와 하은 모두 아닙니다.");
    expect(claimHolds({ t: "is", x: 2 }, 2)).toBe(true);
    expect(claimHolds({ t: "is", x: 2 }, 1)).toBe(false);
    expect(claimHolds({ t: "not", x: 1 }, 1)).toBe(false);
    expect(claimHolds({ t: "in", xs: [0, 2] }, 2)).toBe(true);
    expect(claimHolds({ t: "notin", xs: [0, 1] }, 2)).toBe(true);
  });

  it("정답이 하나가 아닌 진술은 퍼즐로 만들지 못한다", () => {
    const claims = [
      { who: 0, t: "is", x: 1 },
      { who: 1, t: "is", x: 2 },
      { who: 2, t: "is", x: 0 },
    ];
    expect(culpritsOf(claims, 3, 1)).toHaveLength(3);
    expect(() => liarsPuzzle({ id: "x", title: "t", intro: "i", suspects: names, truths: 1, claims })).toThrow("정답이 3개");
  });

  it("범인 고르기 퍼즐은 모두 진술에서 계산한 하나뿐인 정답을 가진다", () => {
    for (const p of PUZZLES.filter((q) => q.kind === "liars")) {
      const found = culpritsOf(p.claims, p.suspects.length, p.truths);
      expect(found, p.id).toEqual([p.answer[0]]);
      expect(p.claims.map((cl) => cl.who), p.id).toEqual([...p.suspects.keys()]);
      expect(p.items).toHaveLength(p.suspects.length);
    }
  });

  it("용의자 수는 3, 4, 4, 5명이고 참인 진술은 1, 1, 2, 2개다", () => {
    const liars = PUZZLES.filter((q) => q.kind === "liars");
    expect(liars.map((p) => p.suspects.length)).toEqual([3, 4, 4, 5]);
    expect(liars.map((p) => p.truths)).toEqual([1, 1, 2, 2]);
  });
});

/**
 * 격자 퍼즐의 모든 해를 세어 본다(분류마다 순열을 모두 시험한다).
 *
 * @param p 격자 퍼즐
 * @returns 단서를 모두 만족하는 해의 수와 첫 해
 */
function solveGrid(p) {
  const n = p.slots.length;
  const perms = [];
  const rec = (cur, rest) => {
    if (!rest.length) perms.push(cur);
    for (const r of rest) rec([...cur, r], rest.filter((x) => x !== r));
  };
  rec([], [...Array(n).keys()]);
  const holds = (clue, assign) => {
    const pos = ([c, o]) => assign[c].indexOf(o);
    const a = pos(clue.a);
    const b = clue.b ? pos(clue.b) : -1;
    switch (clue.t) {
      case "eq":
        return a === b;
      case "ne":
        return a !== b;
      case "left":
        return a < b;
      case "next":
        return Math.abs(a - b) === 1;
      case "at":
        return a === clue.p;
      default:
        return a !== clue.p;
    }
  };
  let count = 0;
  let first = null;
  const walk = (c, assign) => {
    if (c === p.cats.length) {
      if (p.clues.every((clue) => holds(clue, assign))) {
        count += 1;
        first ??= assign;
      }
      return;
    }
    for (const perm of perms) walk(c + 1, [...assign, perm]);
  };
  walk(0, []);
  return { count, first };
}

describe("격자 논리", () => {
  it("모든 격자 퍼즐은 단서를 만족하는 해가 정확히 하나이고 그것이 정답이다", () => {
    for (const p of PUZZLES.filter((q) => q.kind === "grid")) {
      const { count, first } = solveGrid(p);
      expect(count, p.id).toBe(1);
      expect(first, p.id).toEqual(p.answer);
    }
  }, 60000);

  it("모든 단서는 필요하다(하나를 빼면 해가 둘 이상이다)", () => {
    for (const p of PUZZLES.filter((q) => q.kind === "grid" && q.slots.length <= 4)) {
      p.clues.forEach((_, i) => {
        const rest = { ...p, clues: p.clues.filter((__, j) => j !== i) };
        expect(solveGrid(rest).count, `${p.id} 단서 ${i + 1}`).toBeGreaterThan(1);
      });
    }
  }, 60000);

  it("격자는 3x3, 4x4, 4x4(분류 셋), 5x5(분류 셋) 순서로 커진다", () => {
    const grids = PUZZLES.filter((q) => q.kind === "grid");
    expect(grids.map((p) => [p.slots.length, p.cats.length])).toEqual([
      [3, 2],
      [4, 2],
      [4, 3],
      [5, 3],
    ]);
    for (const p of grids) for (const cat of p.cats) expect(cat.options, p.id).toHaveLength(p.slots.length);
  });

  it("단서 문장에 조사가 알맞게 붙는다", () => {
    const g1 = PUZZLES.find((p) => p.id === "g1");
    expect(g1.items).toEqual([
      "샌드위치와 녹차는 같은 사람입니다.",
      "김밥은 민수입니다.",
      "커피와 김밥은 같은 사람입니다.",
      "샌드위치는 하은이 아닙니다.",
    ]);
    const g2 = PUZZLES.find((p) => p.id === "g2");
    expect(g2.items[0]).toBe("녹차는 3번 자리입니다.");
    expect(g2.items[1]).toBe("녹차와 청소 아저씨는 바로 이웃해 있습니다.");
    expect(g2.items[2]).toBe("민수는 녹차보다 왼쪽에 있습니다.");
    const g4 = PUZZLES.find((p) => p.id === "g4");
    expect(g4.items).toContain("가짜 업데이트는 첫 번째 감염입니다.");
    expect(g4.items[0]).toBe("청소 아저씨는 메일서버보다 먼저입니다.");
    expect(clueText({ t: "notat", a: [0, 0], p: 1 }, g1)).toBe("김밥은 하은이 아닙니다.");
  });

  it("단서는 분류가 다른 항목끼리만 묶는다", () => {
    for (const p of PUZZLES.filter((q) => q.kind === "grid")) {
      for (const clue of p.clues) if (clue.b) expect(clue.a[0], p.id).not.toBe(clue.b[0]);
    }
  });

  it("힌트 첫 단계는 풀이의 방향을, 마지막은 첫 칸의 전체를 알려 준다", () => {
    const g = gridPuzzle({
      id: "z",
      title: "t",
      intro: "i",
      unit: "사람",
      axis: "seat",
      slots: ["가", "나"],
      cats: [{ name: "색", options: ["빨강", "파랑"] }],
      solution: [[1, 0]],
      clues: [{ t: "at", a: [0, 1], p: 0 }],
    });
    expect(g.hints[2]).toBe("가에는 파랑이 있습니다.");
    expect(g.items).toEqual(["파랑은 가입니다."]);
  });
});