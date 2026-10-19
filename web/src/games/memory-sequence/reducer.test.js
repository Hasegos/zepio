import { describe, expect, it } from "vitest";
import { initialState, MAX_ROUND, reducer, timing } from "./reducer.js";

const started = () => reducer(initialState(), { type: "start", pads: [0, 4, 8], now: 100 });
const inInput = () => reducer(started(), { type: "showDone" });
const press = (state, pad, next = 2, now = 500) => reducer(state, { type: "press", pad, next, now });

describe("memory-sequence reducer", () => {
  it("시작하면 순서를 보여주는 1라운드가 된다", () => {
    const state = started();
    expect(state).toMatchObject({ phase: "showing", round: 1, sequence: [0, 4, 8], startedAt: 100 });
  });

  it("순서 보기가 끝나야 입력할 수 있다", () => {
    const showing = started();
    expect(press(showing, 0)).toBe(showing);
    const input = inInput();
    expect(input.phase).toBe("input");
    expect(reducer(input, { type: "showDone" })).toBe(input);
  });

  it("맞게 누르면 다음 칸으로 가고 순서를 모두 맞히면 길어진 다음 라운드를 보여준다", () => {
    let state = press(inInput(), 0);
    expect(state).toMatchObject({ phase: "input", inputIndex: 1 });
    state = press(press(state, 4), 8, 6);
    expect(state).toMatchObject({ phase: "showing", round: 2, cleared: 1, inputIndex: 0 });
    expect(state.sequence).toEqual([0, 4, 8, 6]);
  });

  it("틀리면 지금까지 클리어한 라운드로 끝나고 틀린 곳을 기록한다", () => {
    const state = press(press(inInput(), 0), 7, 2, 900);
    expect(state).toMatchObject({
      phase: "result",
      cleared: 0,
      won: false,
      failedPad: 7,
      expectedPad: 4,
      finishedAt: 900,
    });
  });

  it("마지막 라운드를 맞히면 완주로 끝난다", () => {
    const last = { ...inInput(), round: MAX_ROUND, sequence: [3], cleared: MAX_ROUND - 1 };
    expect(press(last, 3, 0, 700)).toMatchObject({ phase: "result", won: true, cleared: MAX_ROUND, finishedAt: 700 });
  });

  it("범위를 벗어난 패드와 결과 화면의 입력은 무시한다", () => {
    const input = inInput();
    expect(press(input, 9)).toBe(input);
    expect(press(input, -1)).toBe(input);
    expect(press(input, 1.5)).toBe(input);
    const result = press(input, 5);
    expect(press(result, 0)).toBe(result);
  });

  it("라운드가 올라가면 불빛이 빨라지고 한계에서 멈춘다", () => {
    expect(timing(1)).toEqual({ on: 650, gap: 260 });
    expect(timing(5).on).toBeLessThan(timing(1).on);
    expect(timing(MAX_ROUND).on).toBeGreaterThanOrEqual(350);
    expect(timing(100)).toEqual({ on: 350, gap: 120 });
  });
});