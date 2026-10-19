import { describe, expect, it } from "vitest";
import { greedyMove } from "./bots.js";
import { createRun, legalCells } from "./engine.js";
import { ISLAND_LIST } from "./islands.js";
import { initialState, reducer } from "./reducer.js";

const run = (state, ...actions) => actions.reduce(reducer, state);
const started = (seed = 1) => {
  const island = ISLAND_LIST[0];
  return run(initialState(), { type: "start", run: createRun(island, seed), lines: island.stars });
};

describe("시작", () => {
  it("판을 시작하면 진행 화면이 되고 메뉴로 나가면 처음으로 돌아간다", () => {
    const state = started();
    expect(state.phase).toBe("play");
    expect(state.selected).toBeNull();
    expect(run(state, { type: "menu" }).phase).toBe("menu");
  });
});

describe("카드와 칸 선택", () => {
  it("카드를 누르면 고르고 다시 누르면 해제하며 빈 칸 카드는 무시한다", () => {
    const state = started();
    const picked = run(state, { type: "select", slot: 1 });
    expect(picked.selected).toBe(1);
    expect(run(picked, { type: "select", slot: 1 }).selected).toBeNull();
    expect(run(state, { type: "select", slot: 7 })).toBe(state);
  });

  it("카드를 고르지 않고 칸을 누르면 안내만 한다", () => {
    const state = run(started(), { type: "cell", i: 20 });
    expect(state.notice).toBe("먼저 아래에서 카드를 골라 주세요");
    expect(state.run.moves).toHaveLength(0);
  });

  it("놓을 수 없는 칸은 안내하고, 놓을 수 있는 칸은 한 번 누르면 미리보기, 두 번째에 확정한다", () => {
    const base = run(started(), { type: "select", slot: 0 });
    const bad = run(base, { type: "cell", i: 0 });
    expect(bad.notice).toContain("빈 땅");
    expect(bad.target).toBeNull();
    const cell = legalCells(base.run, base.run.hand[0])[0];
    const preview = run(base, { type: "cell", i: cell });
    expect(preview.target).toBe(cell);
    expect(preview.run.moves).toHaveLength(0);
    const done = run(preview, { type: "cell", i: cell });
    expect(done.run.board[cell]).toBe(base.run.hand[0]);
    expect(done.selected).toBeNull();
    expect(done.target).toBeNull();
    expect(done.gain).toMatchObject({ i: cell, n: 1 });
    expect(run(preview, { type: "confirm" }).run.board[cell]).toBe(base.run.hand[0]);
  });

  it("다른 칸을 누르면 미리보기가 옮겨 가고 취소하면 선택이 풀린다", () => {
    const base = run(started(), { type: "select", slot: 0 });
    const [a, b] = legalCells(base.run, base.run.hand[0]);
    const moved = run(base, { type: "cell", i: a }, { type: "cell", i: b });
    expect(moved.target).toBe(b);
    expect(moved.run.moves).toHaveLength(0);
    expect(run(moved, { type: "cancel" })).toMatchObject({ selected: null, target: null });
  });
});

describe("뒤섞기와 철거", () => {
  it("뒤섞기는 카드를 고른 뒤에만 되고 선택은 유지된다", () => {
    expect(run(started(), { type: "reroll" }).notice).toContain("먼저");
    const state = run(started(), { type: "select", slot: 2 }, { type: "reroll" });
    expect(state.run.rerolls).toBe(1);
    expect(state.selected).toBe(2);
  });

  it("철거 모드에서 빈 칸은 안내하고 건물은 두 번 눌러 철거하며 모드가 풀린다", () => {
    const base = run(started(), { type: "select", slot: 0 });
    const cell = legalCells(base.run, base.run.hand[0])[0];
    const built = run(base, { type: "cell", i: cell }, { type: "cell", i: cell });
    const mode = run(built, { type: "demolishMode" });
    expect(mode.demolishing).toBe(true);
    expect(run(mode, { type: "cell", i: 0 }).notice).toContain("건물");
    const removed = run(mode, { type: "cell", i: cell }, { type: "cell", i: cell });
    expect(removed.run.board[cell]).toBeNull();
    expect(removed.demolishing).toBe(false);
    expect(removed.run.demolish).toBe(1);
  });

  it("철거 기회가 없으면 모드가 켜지지 않는다", () => {
    const state = started();
    const spent = { ...state, run: { ...state.run, demolish: 0 } };
    const next = run(spent, { type: "demolishMode" });
    expect(next.demolishing).toBe(false);
    expect(next.notice).toContain("철거");
  });
});

describe("끝", () => {
  it("마지막 카드를 놓으면 결과 화면이 되고 별과 점수가 계산된다", () => {
    let state = started(3);
    while (state.phase === "play") {
      const move = greedyMove(state.run);
      state = run(state, { type: "select", slot: move.slot }, { type: "cell", i: move.i }, { type: "cell", i: move.i });
    }
    expect(state.phase).toBe("result");
    expect(state.result.score).toBe(state.result.base + state.result.bonus);
    expect(state.result.stars).toBeGreaterThanOrEqual(0);
    expect(state.run.hand.every((card) => card === null)).toBe(true);
  });

  it("이미 끝난 판으로 시작하면 바로 결과 화면이다", () => {
    let state = started(5);
    while (state.phase === "play") {
      const move = greedyMove(state.run);
      state = run(state, { type: "select", slot: move.slot }, { type: "cell", i: move.i }, { type: "cell", i: move.i });
    }
    const again = run(initialState(), { type: "start", run: state.run, lines: state.lines });
    expect(again.phase).toBe("result");
  });
});