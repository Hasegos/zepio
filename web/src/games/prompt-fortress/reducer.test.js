import { describe, expect, it } from "vitest";
import { solve } from "./engine.js";
import { LEVELS } from "./levels.js";
import { initialState, isOpen, reducer } from "./reducer.js";

const run = (state, ...actions) => actions.reduce(reducer, state);
const opened = (id = "r01") => run(initialState(), { type: "open", id });
const best = (id) => solve(LEVELS.find((l) => l.id === id)).solutions.find((rules) => rules.length === LEVELS.find((l) => l.id === id).par);
const assembled = (id) => run(opened(id), ...best(id).map((card) => ({ type: "add", id: card.id })));
const finished = (id) => run(assembled(id), { type: "run" }, { type: "skip" });

describe("방 열기", () => {
  it("첫 방만 열려 있고 나머지는 앞 방을 깨야 열린다", () => {
    expect(isOpen({}, 0)).toBe(true);
    expect(isOpen({}, 1)).toBe(false);
    expect(isOpen({ r01: 1 }, 1)).toBe(true);
    expect(run(initialState(), { type: "open", id: "r02" })).toEqual(initialState());
    expect(opened().phase).toBe("level");
    expect(run(initialState(), { type: "open", id: "none" }).phase).toBe("menu");
  });
});

describe("규칙 조립", () => {
  it("카드를 넣고 빼고 옮기며 슬롯 수와 중복을 지킨다", () => {
    let state = run(opened("r01"), { type: "add", id: "refuse:asksSecret" }, { type: "add", id: "refuse:asksSecret" });
    expect(state.level.rules.map((c) => c.id)).toEqual(["refuse:asksSecret"]);
    state = run(state, { type: "add", id: "refuse:src:user" }, { type: "add", id: "ignore:src:doc" });
    expect(state.level.rules).toHaveLength(2);
    state = run(state, { type: "move", i: 0, dir: 1 });
    expect(state.level.rules.map((c) => c.id)).toEqual(["refuse:src:user", "refuse:asksSecret"]);
    expect(run(state, { type: "move", i: 1, dir: 1 })).toBe(state);
    state = run(state, { type: "remove", i: 0 });
    expect(state.level.rules.map((c) => c.id)).toEqual(["refuse:asksSecret"]);
    expect(run(state, { type: "clear" }).level.rules).toEqual([]);
  });

  it("덱에 없는 카드와 잘못된 위치는 무시한다", () => {
    const state = opened("r01");
    expect(run(state, { type: "add", id: "mask:encoded" })).toBe(state);
    expect(run(state, { type: "remove", i: 0 })).toBe(state);
    expect(run(state, { type: "remove", i: "x" })).toBe(state);
  });
});

describe("시험 재생과 별", () => {
  it("규칙이 없으면 시험을 시작하지 못한다", () => {
    const state = opened("r01");
    expect(run(state, { type: "run" })).toBe(state);
  });

  it("메시지가 하나씩 공개되고 끝나야 별이 기록된다", () => {
    let state = run(assembled("r01"), { type: "run" });
    const total = LEVELS[0].messages.length;
    expect(state.level.run.shown).toBe(0);
    state = run(state, { type: "tick" });
    expect(state.level.run.shown).toBe(1);
    expect(state.stars.r01).toBeUndefined();
    for (let i = 1; i < total; i += 1) state = run(state, { type: "tick" });
    expect(state.level.run.shown).toBe(total);
    expect(state.stars.r01).toBe(3);
    expect(run(state, { type: "tick" })).toBe(state);
  });

  it("조립 중에는 시험 재생 행동이 먹히지 않고 시험 중에는 조립이 막힌다", () => {
    const editing = assembled("r01");
    expect(run(editing, { type: "tick" })).toBe(editing);
    expect(run(editing, { type: "skip" })).toBe(editing);
    const running = run(editing, { type: "run" });
    expect(run(running, { type: "add", id: "refuse:src:user" })).toBe(running);
    expect(run(running, { type: "clear" })).toBe(running);
  });

  it("뚫리면 별이 없고, 다시 조립하면 최고 별은 낮아지지 않는다", () => {
    let state = run(opened("r01"), { type: "add", id: "ignore:src:doc" }, { type: "run" }, { type: "skip" });
    expect(state.level.run.stars).toBe(0);
    expect(state.stars.r01).toBe(0);
    state = finished("r01");
    expect(state.stars.r01).toBe(3);
    const retry = run(state, { type: "retry" }, { type: "clear" }, { type: "add", id: "ignore:src:doc" }, { type: "run" }, { type: "skip" });
    expect(retry.stars.r01).toBe(3);
  });
});

describe("이동", () => {
  it("다음 방은 별을 받은 뒤에만 열리고 방 목록으로 돌아갈 수 있다", () => {
    const before = run(assembled("r01"), { type: "run" });
    expect(run(before, { type: "next" })).toBe(before);
    const state = run(finished("r01"), { type: "next" });
    expect(state.level.id).toBe("r02");
    expect(state.level.rules).toEqual([]);
    expect(run(state, { type: "leave" })).toEqual({ phase: "menu", stars: state.stars, level: null });
    expect(run(initialState(), { type: "leave" })).toEqual(initialState());
  });

  it("마지막 방에는 다음 방이 없다", () => {
    const stars = Object.fromEntries(LEVELS.slice(0, 11).map((l) => [l.id, 1]));
    const state = run({ ...initialState(), stars }, { type: "open", id: "r12" });
    const done = run(state, ...best("r12").map((card) => ({ type: "add", id: card.id })), { type: "run" }, { type: "skip" });
    expect(done.stars.r12).toBe(3);
    expect(run(done, { type: "next" })).toBe(done);
  });
});