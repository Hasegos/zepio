import { describe, expect, it } from "vitest";
import * as colorClash from "./color-clash/reducer.js";
import * as lightFlip from "./light-flip/reducer.js";
import * as memorySequence from "./memory-sequence/reducer.js";
import * as patternChallenge from "./pattern-challenge/reducer.js";

const games = {
  "pattern-challenge": [patternChallenge, { type: "start", puzzles: [{ options: [1, 2], answer: 0 }], now: 1 }],
  "memory-sequence": [memorySequence, { type: "start", pads: [0, 1], now: 1 }],
  "color-clash": [colorClash, { type: "start", word: 0, ink: 1, now: 1 }],
  "light-flip": [lightFlip, { type: "start", stages: [{ board: [], par: 1 }], now: 1 }],
};

describe("뒤로가기 동작", () => {
  for (const [name, [game, start]] of Object.entries(games)) {
    it(`${name}: back은 처음 화면으로 돌아가고 처음 화면에서는 그대로다`, () => {
      const playing = game.reducer(game.initialState(), start);
      expect(playing.phase).not.toBe("intro");
      expect(game.reducer(playing, { type: "back" })).toEqual(game.initialState());
      expect(game.reducer(game.initialState(), { type: "back" })).toEqual(game.initialState());
    });
  }
});
