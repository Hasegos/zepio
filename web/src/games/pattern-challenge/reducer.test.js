import { describe, expect, it } from "vitest";
import { correctCount, formatDuration, initialState, reducer } from "./reducer.js";

const puzzles = [
  { answer: 1, options: [{}, {}, {}] },
  { answer: 0, options: [{}, {}, {}] },
];

/**
 * 여러 action을 순서대로 적용한다.
 */
function run(actions, state = initialState()) {
  return actions.reduce(reducer, state);
}

describe("reducer", () => {
  it("start는 playing으로 전환하고 시작 시각을 기록한다", () => {
    const state = run([{ type: "start", puzzles, now: 1000 }]);
    expect(state).toMatchObject({ phase: "playing", index: 0, startedAt: 1000 });
  });

  it("선택, 제출, 다음 순서로 진행해 마지막 문제 뒤에 result가 된다", () => {
    const state = run([
      { type: "start", puzzles, now: 0 },
      { type: "select", option: 1 },
      { type: "submit", now: 2000 },
      { type: "next", now: 2500 },
      { type: "select", option: 2 },
      { type: "submit", now: 5000 },
      { type: "next", now: 5200 },
    ]);
    expect(state.phase).toBe("result");
    expect(state.finishedAt).toBe(5200);
    expect(state.answers).toEqual([
      { selected: 1, correct: true, ms: 2000 },
      { selected: 2, correct: false, ms: 2500 },
    ]);
    expect(correctCount(state)).toBe(1);
  });

  it("상태에 맞지 않는 action은 무시한다", () => {
    const playing = run([{ type: "start", puzzles, now: 0 }]);
    expect(reducer(playing, { type: "submit", now: 1 })).toBe(playing);
    expect(reducer(playing, { type: "next", now: 1 })).toBe(playing);
    expect(reducer(playing, { type: "select", option: 9 })).toBe(playing);
    expect(reducer(playing, { type: "select", option: -1 })).toBe(playing);

    const revealed = run([{ type: "select", option: 0 }, { type: "submit", now: 1 }], playing);
    expect(reducer(revealed, { type: "select", option: 1 })).toBe(revealed);
    expect(reducer(revealed, { type: "submit", now: 2 })).toBe(revealed);

    const intro = initialState();
    expect(reducer(intro, { type: "select", option: 0 })).toBe(intro);
  });

  it("다시 start하면 이전 기록이 지워진다", () => {
    const finished = run([
      { type: "start", puzzles, now: 0 },
      { type: "select", option: 1 },
      { type: "submit", now: 1 },
      { type: "next", now: 2 },
      { type: "select", option: 0 },
      { type: "submit", now: 3 },
      { type: "next", now: 4 },
    ]);
    const again = reducer(finished, { type: "start", puzzles, now: 10 });
    expect(again).toMatchObject({ phase: "playing", index: 0, answers: [], startedAt: 10 });
  });
});

describe("formatDuration", () => {
  it("mm:ss로 바꾸고 음수는 0으로 본다", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65_000)).toBe("01:05");
    expect(formatDuration(3_600_000)).toBe("60:00");
    expect(formatDuration(-5)).toBe("00:00");
  });
});