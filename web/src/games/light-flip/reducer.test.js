import { describe, expect, it } from "vitest";
import { CELLS, toggle } from "./puzzle.js";
import { formatDuration, initialState, reducer, totals } from "./reducer.js";

const empty = () => new Array(CELLS).fill(0);
// 1단계는 칸 12를 누르면 풀리고, 2단계는 칸 0을 누르면 풀린다
const stages = [
  { board: toggle(empty(), 12), par: 1 },
  { board: toggle(empty(), 0), par: 1 },
];
const started = () => reducer(initialState(), { type: "start", stages, now: 1000 });
const press = (state, cell) => reducer(state, { type: "press", cell });

describe("reducer", () => {
  it("시작하면 첫 판이 놓인다", () => {
    expect(started()).toMatchObject({ phase: "playing", index: 0, board: stages[0].board, solved: false, startedAt: 1000 });
  });

  it("칸을 누르면 이웃이 뒤집히고 이동이 기록된다", () => {
    const next = press(started(), 7);
    expect(next.board).toEqual(toggle(stages[0].board, 7));
    expect(next.history).toEqual([7]);
    expect(next.solved).toBe(false);
  });

  it("모두 꺼지면 풀린 상태가 되고 그 뒤의 입력은 무시한다", () => {
    const solved = press(started(), 12);
    expect(solved.solved).toBe(true);
    expect(press(solved, 3)).toBe(solved);
    expect(reducer(solved, { type: "undo" })).toBe(solved);
    expect(reducer(solved, { type: "restart" })).toBe(solved);
  });

  it("범위 밖이거나 정수가 아닌 칸은 무시한다", () => {
    const state = started();
    for (const cell of [-1, CELLS, 1.5, "3", undefined]) expect(press(state, cell)).toBe(state);
  });

  it("되돌리면 마지막 이동이 취소되어 이동 횟수에서 빠진다", () => {
    const moved = press(press(started(), 7), 8);
    const undone = reducer(moved, { type: "undo" });
    expect(undone.board).toEqual(toggle(stages[0].board, 7));
    expect(undone.history).toEqual([7]);
    const original = reducer(undone, { type: "undo" });
    expect(original.board).toEqual(stages[0].board);
    expect(reducer(original, { type: "undo" })).toBe(original);
  });

  it("이 판 다시 시작은 처음 배치로 돌리고 이동을 지운다", () => {
    const moved = press(press(started(), 7), 8);
    const restarted = reducer(moved, { type: "restart" });
    expect(restarted).toMatchObject({ board: stages[0].board, history: [], index: 0 });
    expect(reducer(restarted, { type: "restart" })).toBe(restarted);
  });

  it("풀지 않았으면 다음으로 넘어가지 못한다", () => {
    const state = started();
    expect(reducer(state, { type: "next", now: 2000 })).toBe(state);
  });

  it("다음으로 넘어가면 이동을 기록하고 다음 판이 놓이며 마지막 뒤에는 결과가 된다", () => {
    const second = reducer(press(started(), 12), { type: "next", now: 2000 });
    expect(second).toMatchObject({ index: 1, board: stages[1].board, history: [], solved: false });
    expect(second.done).toEqual([{ moves: 1, par: 1 }]);

    const result = reducer(press(second, 0), { type: "next", now: 5000 });
    expect(result).toMatchObject({ phase: "result", finishedAt: 5000 });
    expect(totals(result)).toEqual({ moves: 2, par: 2, extra: 0 });
  });

  it("헛눌러도 추가 이동은 0 이상으로 계산된다", () => {
    const wandering = press(press(press(started(), 0), 0), 12);
    expect(wandering.solved).toBe(true);
    const second = reducer(wandering, { type: "next", now: 2000 });
    const result = reducer(press(second, 0), { type: "next", now: 3000 });
    expect(totals(result)).toEqual({ moves: 4, par: 2, extra: 2 });
  });

  it("시작 전에는 입력을 무시한다", () => {
    const intro = initialState();
    expect(press(intro, 3)).toBe(intro);
    expect(reducer(intro, { type: "next", now: 1 })).toBe(intro);
  });
});

describe("formatDuration", () => {
  it("mm:ss로 바꾸고 음수는 0으로 본다", () => {
    expect(formatDuration(65000)).toBe("01:05");
    expect(formatDuration(-5)).toBe("00:00");
  });
});