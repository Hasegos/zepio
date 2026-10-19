import { describe, expect, it } from "vitest";
import { mergeEnding, readData, restore, snapshot, summarize } from "./record.js";
import { initialState, reducer, summary } from "./reducer.js";
import { PUZZLES, SPOTS, START_COINS } from "./puzzles.js";

const run = (state, ...actions) => actions.reduce(reducer, state);
const open = (id, state = initialState()) => run(state, { type: "open", id });
const everything = { ...initialState(), solved: Object.fromEntries(PUZZLES.map((p) => [p.id, { score: 100, wrong: 0 }])) };
const solve = (state, id) => {
  const p = PUZZLES.find((q) => q.id === id);
  let s = open(id, state);
  if (p.kind === "find") s = p.answer.reduce((acc, i) => reducer(acc, { type: "toggle", i }), s);
  else if (p.kind === "liars") s = reducer(s, { type: "choose", i: 0, option: p.answer[0] });
  else if (p.kind === "grid") {
    const n = p.slots.length;
    for (const [c, options] of p.answer.entries()) {
      for (const [slot, opt] of options.entries()) {
        s = run(s, { type: "cell", c, slot, opt }, { type: "cell", c, slot, opt });
        expect(s.puzzle.input[c][slot * n + opt]).toBe(2);
      }
    }
  } else {
    const order = [...p.answer];
    s = { ...s, puzzle: { ...s.puzzle, input: order } };
  }
  return run(s, { type: "submit" }, { type: "closeResult" });
};

describe("사건 열기", () => {
  it("처음에는 사무소이고 앞의 세 퍼즐만 열 수 있다", () => {
    const s = initialState();
    expect(s.phase).toBe("office");
    expect(s.coins).toBe(START_COINS);
    expect(open("p01").phase).toBe("puzzle");
    expect(open("p04")).toEqual(s);
    expect(run(open("p01"), { type: "leave" }).phase).toBe("office");
  });
});

describe("퍼즐 풀기", () => {
  it("고르기는 눌러서 고르고 다시 눌러 해제하며 결정하면 판정한다", () => {
    let s = run(open("p01"), { type: "toggle", i: 2 }, { type: "toggle", i: 4 }, { type: "toggle", i: 4 });
    expect(s.puzzle.input).toEqual([2]);
    s = run(s, { type: "submit" });
    expect(s.puzzle.result.ok).toBe(false);
    expect(s.wrong.p01).toBe(1);
    s = run(s, { type: "closeResult" });
    expect(s.puzzle.result).toBeNull();
  });

  it("처음 시도에 맞히면 만점과 코인 보너스를 받고 사무소로 돌아온다", () => {
    const s = solve(initialState(), "p01");
    expect(s.solved.p01).toEqual({ score: 100, wrong: 0 });
    expect(s.coins).toBe(START_COINS + 1);
    expect(s.phase).toBe("office");
  });

  it("틀린 뒤 맞히면 점수가 깎이고 보너스가 없다", () => {
    let s = run(open("p01"), { type: "toggle", i: 0 }, { type: "submit" }, { type: "closeResult" }, { type: "reset" });
    s = [2, 4].reduce((acc, i) => reducer(acc, { type: "toggle", i }), s);
    s = run(s, { type: "submit" });
    expect(s.puzzle.result).toMatchObject({ ok: true, score: 80, bonus: 0 });
    expect(s.coins).toBe(START_COINS);
  });

  it("순서 놓기는 위아래로 옮기고 경계를 넘지 못한다", () => {
    const s = open("p07", everything);
    const moved = run(s, { type: "move", i: 0, dir: 1 });
    expect(moved.puzzle.input.slice(0, 2)).toEqual([1, 0]);
    expect(run(s, { type: "move", i: 0, dir: -1 })).toBe(s);
    expect(run(s, { type: "move", i: 5, dir: 1 })).toBe(s);
  });

  it("범인 고르기는 용의자를 고르고 범위를 벗어난 값은 무시한다", () => {
    const s = open("l1", everything);
    expect(s.puzzle.input).toEqual([null]);
    expect(run(s, { type: "choose", i: 0, option: 2 }).puzzle.input[0]).toBe(2);
    expect(run(s, { type: "choose", i: 1, option: 0 })).toBe(s);
    expect(run(s, { type: "choose", i: 0, option: 9 })).toBe(s);
    expect(run(s, { type: "toggle", i: 0 })).toBe(s);
    const wrong = run(open("l1"), { type: "choose", i: 0, option: 1 }, { type: "submit" });
    expect(wrong.puzzle.result.ok).toBe(false);
    expect(wrong.wrong.l1).toBe(1);
  });

  it("격자는 칸을 누를 때마다 비어 있음, ✗, ●로 돌아가고 잘못된 칸은 무시한다", () => {
    const s = open("g1", everything);
    expect(s.puzzle.input).toHaveLength(2);
    expect(s.puzzle.input[0]).toHaveLength(9);
    const states = [1, 2, 0].map((_, k) => run(s, ...Array(k + 1).fill({ type: "cell", c: 0, slot: 1, opt: 2 })).puzzle.input[0][1 * 3 + 2]);
    expect(states).toEqual([1, 2, 0]);
    expect(run(s, { type: "cell", c: 5, slot: 0, opt: 0 })).toBe(s);
    expect(run(s, { type: "cell", c: 0, slot: 3, opt: 0 })).toBe(s);
    expect(run(s, { type: "cell", c: 0, slot: 0, opt: -1 })).toBe(s);
    expect(run(s, { type: "cell", c: 0, slot: 0.5, opt: 0 })).toBe(s);
    expect(run(open("p01", everything), { type: "cell", c: 0, slot: 0, opt: 0 }).puzzle.input).toEqual([]);
  });

  it("격자는 다시하기가 표를 지운다", () => {
    const s = run(open("g1", everything), { type: "cell", c: 0, slot: 0, opt: 0 }, { type: "reset" });
    expect(s.puzzle.input.every((cells) => cells.every((v) => v === 0))).toBe(true);
  });

  it("메모는 색이 돌아가며 바뀌고 다시하기가 입력과 메모를 지운다", () => {
    let s = run(open("p01"), { type: "memo", i: 1 }, { type: "memo", i: 1 }, { type: "toggle", i: 3 });
    expect(s.puzzle.memo[1]).toBe(2);
    s = run(s, { type: "reset" });
    expect(s.puzzle.memo).toEqual({});
    expect(s.puzzle.input).toEqual([]);
  });

  it("아무것도 고르지 않고 결정하면 오답으로 세지 않고 안내만 한다", () => {
    const s = run(open("p01"), { type: "submit" });
    expect(s.notice).toContain("먼저");
    expect(s.wrong.p01).toBeUndefined();
    expect(s.puzzle.result).toBeNull();
    const liars = run(open("l1", everything), { type: "submit" });
    expect(liars.notice).toContain("먼저");
    const grid = run(open("g1", everything), { type: "submit" });
    expect(grid.notice).toContain("●");
    expect(grid.wrong.g1).toBeUndefined();
  });

  it("오답 횟수는 99에서 멈추고 푼 퍼즐을 다시 틀려도 늘지 않는다", () => {
    let s = { ...open("p01"), wrong: { p01: 99 } };
    s = run(s, { type: "toggle", i: 0 }, { type: "submit" });
    expect(s.wrong.p01).toBe(99);
    const done = solve(initialState(), "p01");
    const again = run(open("p01", done), { type: "toggle", i: 0 }, { type: "submit" });
    expect(again.wrong.p01 ?? 0).toBe(0);
    expect(again.puzzle.result.ok).toBe(false);
  });

  it("이미 푼 퍼즐은 다시 풀어도 점수와 코인이 변하지 않는다", () => {
    const solved = solve(initialState(), "p01");
    const again = run(open("p01", solved), { type: "toggle", i: 2 }, { type: "toggle", i: 4 }, { type: "submit" });
    expect(again.coins).toBe(solved.coins);
    expect(again.solved.p01.score).toBe(100);
  });
});

describe("힌트와 코인", () => {
  it("힌트는 코인 하나를 쓰고 세 단계까지만 열리며 코인이 없으면 안내한다", () => {
    let s = run(open("p01"), { type: "hint" }, { type: "hint" }, { type: "hint" });
    expect(s.hints.p01).toBe(3);
    expect(s.coins).toBe(START_COINS - 3);
    expect(run(s, { type: "hint" })).toBe(s);
    s = run(open("l1", { ...initialState(), coins: 0 }), { type: "hint" });
    expect(s.notice).toContain("코인");
    expect(s.hints.l1).toBeUndefined();
  });

  it("사무소의 숨은 코인은 한 번만 얻고 빈 곳은 안내만 한다", () => {
    const withCoin = SPOTS.find((x) => x.coin);
    const empty = SPOTS.find((x) => !x.coin);
    let s = run(initialState(), { type: "spot", id: withCoin.id });
    expect(s.coins).toBe(START_COINS + 1);
    expect(s.notice).toBe(withCoin.found);
    s = run(s, { type: "spot", id: withCoin.id });
    expect(s.coins).toBe(START_COINS + 1);
    s = run(s, { type: "spot", id: empty.id });
    expect(s.coins).toBe(START_COINS + 1);
    expect(s.notice).toBe(empty.empty);
    expect(run(initialState(), { type: "spot", id: "ghost" }).coins).toBe(START_COINS);
  });
});

describe("엔딩", () => {
  it("모든 퍼즐을 풀면 엔딩이 되고 점수를 요약한다", () => {
    let s = initialState();
    for (const p of PUZZLES) s = solve(s, p.id);
    expect(s.phase).toBe("ending");
    expect(summary(s)).toEqual({ total: 1200, wrong: 0 });
    expect(run(s, { type: "resume" }).phase).toBe("office");
  });
});

describe("저장", () => {
  it("스냅샷을 저장하고 복원하면 같은 진행이다", () => {
    const s = solve(run(initialState(), { type: "spot", id: "shelf" }), "p01");
    const back = restore(JSON.parse(JSON.stringify(snapshot(s))));
    expect(back).toMatchObject({ coins: s.coins, solved: s.solved, found: s.found, phase: "office", puzzle: null });
  });

  it("어긋난 저장은 버린다", () => {
    const good = snapshot(initialState());
    expect(restore(null)).toBeNull();
    expect(restore({ ...good, coins: -1 })).toBeNull();
    expect(restore({ ...good, solved: { zz: { score: 100, wrong: 0 } } })).toBeNull();
    expect(restore({ ...good, solved: { p01: { score: 5, wrong: 0 } } })).toBeNull();
    expect(restore({ ...good, hints: { p01: 4 } })).toBeNull();
    expect(restore({ ...good, found: { shelf: 1 } })).toBeNull();
    expect(restore({ ...good, wrong: [] })).toBeNull();
  });

  it("예전 열두 퍼즐 저장(없는 퍼즐 번호)은 버리고 처음부터 시작한다", () => {
    const good = snapshot(initialState());
    expect(restore({ ...good, solved: { p02: { score: 100, wrong: 0 } } })).toBeNull();
    expect(restore({ ...good, hints: { p12: 1 } })).toBeNull();
    expect(restore({ ...good, solved: { g4: { score: 100, wrong: 0 } } })).not.toBeNull();
  });

  it("소리 끔 설정은 저장 데이터에 남고 엔딩 기록을 합쳐도 유지된다", () => {
    expect(readData({ v: 1, muted: true }).muted).toBe(true);
    expect(readData({ v: 1, muted: "yes" }).muted).toBe(false);
    expect(readData(null).muted).toBe(false);
    expect(mergeEnding({ v: 1, muted: true, best: {} }, { p01: { score: 100, wrong: 0 } }, null).muted).toBe(true);
  });

  it("엔딩 기록은 최고 점수를 남기고 횟수를 더한다", () => {
    const solved = { p01: { score: 100, wrong: 0 }, l1: { score: 60, wrong: 2 } };
    const first = mergeEnding(null, solved, null);
    expect(first.best).toEqual({ endings: 1, score: 160 });
    expect(mergeEnding(first, { p01: { score: 20, wrong: 4 } }, null).best).toEqual({ endings: 2, score: 160 });
    expect(readData({ v: 1, best: { endings: -3 } }).best.endings).toBe(0);
  });

  it("홈 카드 요약은 엔딩, 진행 중, 없음 순으로 보여 준다", () => {
    expect(summarize(null)).toBe("");
    const play = { v: 1, save: snapshot(solve(initialState(), "p01")), best: {} };
    expect(summarize(play)).toBe(`1/${PUZZLES.length}건 해결 · 100점`);
    expect(summarize(mergeEnding(play, { p01: { score: 100, wrong: 0 } }, null))).toBe("사건 해결 · 최고 100점");
  });
});