import { describe, expect, it } from "vitest";
import { accuracy, COLORS, DURATION_MS, initialState, makeRound, reducer, secondsLeft } from "./reducer.js";

const started = () => reducer(initialState(), { type: "start", word: 0, ink: 1, now: 1000 });
const answer = (state, choice, now, next = { word: 2, ink: 3 }) =>
  reducer(state, { type: "answer", choice, ...next, now });

describe("makeRound", () => {
  it("글자가 가리키는 색과 칠한 색이 항상 다르다", () => {
    for (let a = 0; a < 1; a += 0.05) {
      for (let b = 0; b < 1; b += 0.05) {
        const values = [a, b];
        const { word, ink } = makeRound(() => values.shift());
        expect(word).not.toBe(ink);
        expect(word).toBeGreaterThanOrEqual(0);
        expect(word).toBeLessThan(COLORS.length);
        expect(ink).toBeGreaterThanOrEqual(0);
        expect(ink).toBeLessThan(COLORS.length);
      }
    }
  });
});

describe("reducer", () => {
  it("시작하면 플레이 상태가 된다", () => {
    expect(started()).toMatchObject({ phase: "playing", word: 0, ink: 1, correct: 0, wrong: 0, startedAt: 1000 });
  });

  it("칠한 색을 고르면 정답이고 다음 문제로 넘어간다", () => {
    const next = answer(started(), 1, 2000);
    expect(next).toMatchObject({ correct: 1, wrong: 0, last: "ok", word: 2, ink: 3 });
  });

  it("글자 뜻을 고르면 오답으로 세고 판은 계속된다", () => {
    const next = answer(started(), 0, 2000);
    expect(next).toMatchObject({ phase: "playing", correct: 0, wrong: 1, last: "miss" });
  });

  it("범위 밖 선택은 무시한다", () => {
    const state = started();
    expect(answer(state, 4, 2000)).toBe(state);
    expect(answer(state, -1, 2000)).toBe(state);
    expect(answer(state, 1.5, 2000)).toBe(state);
  });

  it("시간이 다 되면 tick이 판을 끝내고 끝난 시각을 제한 시간으로 고정한다", () => {
    const state = started();
    expect(reducer(state, { type: "tick", now: 1000 + DURATION_MS - 1 })).toBe(state);
    expect(reducer(state, { type: "tick", now: 1000 + DURATION_MS + 500 })).toMatchObject({
      phase: "result",
      finishedAt: 1000 + DURATION_MS,
    });
  });

  it("제한 시간 뒤의 입력은 세지 않고 판을 끝낸다", () => {
    const next = answer(started(), 1, 1000 + DURATION_MS);
    expect(next).toMatchObject({ phase: "result", correct: 0, wrong: 0 });
  });

  it("시작 전이나 끝난 뒤의 입력과 tick은 무시한다", () => {
    const intro = initialState();
    expect(answer(intro, 1, 2000)).toBe(intro);
    expect(reducer(intro, { type: "tick", now: 99999 })).toBe(intro);
    const done = reducer(started(), { type: "tick", now: 1000 + DURATION_MS });
    expect(answer(done, 1, 2000)).toBe(done);
  });
});

describe("secondsLeft와 accuracy", () => {
  it("남은 시간은 올림이고 0과 30 사이다", () => {
    const state = started();
    expect(secondsLeft(state, 1000)).toBe(30);
    expect(secondsLeft(state, 1001)).toBe(30);
    expect(secondsLeft(state, 1000 + 29500)).toBe(1);
    expect(secondsLeft(state, 1000 + DURATION_MS + 5000)).toBe(0);
    expect(secondsLeft(state, 0)).toBe(30);
  });

  it("정확도는 정수 퍼센트이고 답이 없으면 0이다", () => {
    expect(accuracy(initialState())).toBe(0);
    expect(accuracy({ correct: 2, wrong: 1 })).toBe(67);
    expect(accuracy({ correct: 5, wrong: 0 })).toBe(100);
  });
});