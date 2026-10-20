import { describe, expect, it } from "vitest";
import { greedyMove, lookaheadMove, playOut, randomPicker } from "./bots.js";
import { apply, createRun, currentScore, finish, HAND_SIZE, isOver, legalCells, questStatus, restoreRun, serializeRun } from "./engine.js";
import { dailyIsland, findIsland, ISLAND_LIST } from "./islands.js";
import { QUEST_BONUS, QUESTS } from "./quests.js";
import { makeRng } from "../_shared/rng.js";
import { CELLS } from "./rules.js";

const sprout = ISLAND_LIST[0];

describe("섬 정의", () => {
  it("모든 섬의 카드 수와 땅 칸이 맞고 id가 겹치지 않는다", () => {
    expect(new Set(ISLAND_LIST.map((island) => island.id)).size).toBe(ISLAND_LIST.length);
    for (const island of ISLAND_LIST) {
      const land = island.terrain.filter((t) => t === "g").length;
      expect(island.terrain).toHaveLength(CELLS);
      expect(Object.values(island.pool).reduce((a, b) => a + b, 0)).toBe(island.deckSize);
      expect(land, island.id).toBeGreaterThanOrEqual(island.deckSize + 2);
      expect(land, island.id).toBeLessThanOrEqual(island.deckSize + 5);
      expect(island.stars[0]).toBeLessThan(island.stars[1]);
      expect(island.stars[1]).toBeLessThan(island.stars[2]);
    }
  });

  it("오늘의 섬은 날짜가 같으면 같고 규칙에 맞는다", () => {
    const a = dailyIsland("2026-10-19");
    expect(a).toEqual(dailyIsland("2026-10-19"));
    expect(a.terrain).not.toEqual(dailyIsland("2026-10-20").terrain);
    for (const island of [a, dailyIsland("2027-01-02"), dailyIsland("2026-12-31")]) {
      const land = island.terrain.filter((t) => t === "g").length;
      expect(Object.values(island.pool).reduce((x, y) => x + y, 0)).toBe(island.deckSize);
      expect(land).toBeGreaterThanOrEqual(island.deckSize + 2);
      expect(island.pool.windmill ?? 0).toBeLessThanOrEqual(island.pool.farm ?? 0);
    }
  });

  it("id로 섬을 찾고 모르는 id는 null이다", () => {
    expect(findIsland("ring").name).toBe("고리섬");
    expect(findIsland("daily:2026-10-19").daily).toBe(true);
    expect(findIsland("daily:oops")).toBeNull();
    expect(findIsland("nope")).toBeNull();
    expect(findIsland(5)).toBeNull();
  });
});

describe("판 진행", () => {
  it("시드가 같으면 카드 순서와 의뢰가 같고 손패는 세 장이다", () => {
    const a = createRun(sprout, 7);
    const b = createRun(sprout, 7);
    expect(a.hand).toEqual(b.hand);
    expect(a.deck).toEqual(b.deck);
    expect(a.quests).toEqual(b.quests);
    expect(a.hand.filter(Boolean)).toHaveLength(HAND_SIZE);
    expect(a.quests).toHaveLength(3);
    expect(createRun(sprout, 8).deck).not.toEqual(a.deck);
  });

  it("카드를 놓으면 손패가 다시 채워지고 놓을 수 없는 수는 무시한다", () => {
    const run = createRun(sprout, 1);
    const cell = legalCells(run, run.hand[0])[0];
    const next = apply(run, { t: "place", slot: 0, i: cell });
    expect(next.board[cell]).toBe(run.hand[0]);
    expect(next.hand[0]).toBe(run.deck[HAND_SIZE]);
    expect(apply(next, { t: "place", slot: 1, i: cell })).toBe(next);
    expect(apply(run, { t: "place", slot: 0, i: 0 })).toBe(run);
    expect(apply(run, { t: "place", slot: 9, i: cell })).toBe(run);
    expect(apply(run, { t: "oops" })).toBe(run);
  });

  it("손패 칸 번호가 정수 0~2가 아니면 예외 없이 무시한다", () => {
    const run = createRun(sprout, 7);
    const cell = legalCells(run, run.hand[0])[0];
    for (const slot of ["length", -1, 3, 1.5, null, undefined, "0"]) {
      expect(apply(run, { t: "place", slot, i: cell })).toBe(run);
      expect(apply(run, { t: "reroll", slot })).toBe(run);
      expect(restoreRun({ v: 1, island: "sprout", seed: 7, moves: [{ t: "reroll", slot }] })).toBeNull();
    }
  });

  it("다시 뽑기는 카드를 덱 맨 뒤로 보내고 두 번까지만 쓸 수 있다", () => {
    let run = createRun(sprout, 1);
    const card = run.hand[1];
    const expected = run.deck[HAND_SIZE];
    run = apply(run, { t: "reroll", slot: 1 });
    expect(run.hand[1]).toBe(expected);
    expect(run.deck.at(-1)).toBe(card);
    expect(run.rerolls).toBe(1);
    run = apply(run, { t: "reroll", slot: 0 });
    expect(apply(run, { t: "reroll", slot: 0 })).toBe(run);
  });

  it("철거는 건물을 지우고 점수는 다시 계산되며 횟수가 제한된다", () => {
    let run = createRun(sprout, 3);
    const cell = legalCells(run, run.hand[0])[0];
    run = apply(run, { t: "place", slot: 0, i: cell });
    expect(currentScore(run)).toBeGreaterThan(0);
    const removed = apply(run, { t: "demolish", i: cell });
    expect(removed.board[cell]).toBeNull();
    expect(currentScore(removed)).toBe(0);
    expect(removed.demolish).toBe(run.demolish - 1);
    expect(apply(removed, { t: "demolish", i: cell })).toBe(removed);
  });

  it("카드를 모두 놓으면 끝나고 그 뒤 수는 무시한다", () => {
    const run = playOut(sprout, 5, greedyMove);
    expect(isOver(run)).toBe(true);
    expect(run.board.filter(Boolean).length).toBeGreaterThan(20);
    expect(apply(run, { t: "demolish", i: run.board.findIndex(Boolean) })).toBe(run);
  });
});

describe("저장과 되살리기", () => {
  it("저장한 수를 재생하면 같은 판이 된다", () => {
    const run = playOut(sprout, 9, greedyMove);
    const copy = restoreRun(JSON.parse(JSON.stringify(serializeRun(run))));
    expect(copy.board).toEqual(run.board);
    expect(copy.hand).toEqual(run.hand);
    expect(copy.moves).toEqual(run.moves);
  });

  it("중간 저장도 이어서 둘 수 있다", () => {
    let run = createRun(sprout, 4);
    for (let n = 0; n < 6; n += 1) run = apply(run, greedyMove(run));
    const copy = restoreRun(serializeRun(run));
    expect(apply(copy, greedyMove(copy)).board).toEqual(apply(run, greedyMove(run)).board);
  });

  it("깨진 저장 데이터는 null이다", () => {
    const good = serializeRun(playOut(sprout, 2, greedyMove));
    const bad = [
      null,
      "x",
      {},
      { ...good, v: 2 },
      { ...good, island: "nope" },
      { ...good, seed: "1" },
      { ...good, moves: "abc" },
      { ...good, moves: [null] },
      { ...good, moves: [{ t: "place", slot: 0, i: 0 }] },
      { ...good, moves: Array(300).fill({ t: "reroll", slot: 0 }) },
      { ...good, moves: [...good.moves.slice(0, 2), { t: "demolish", i: 0 }] },
    ];
    for (const data of bad) expect(restoreRun(data), JSON.stringify(data)?.slice(0, 40)).toBeNull();
  });
});

describe("결과와 의뢰", () => {
  it("의뢰 하나를 채울 때마다 보너스가 더해지고 별은 기준 점수로 정해진다", () => {
    const run = playOut(sprout, 11, greedyMove);
    const result = finish(run);
    const done = questStatus(run).filter((quest) => quest.done).length;
    expect(result.bonus).toBe(done * QUEST_BONUS);
    expect(result.score).toBe(result.base + result.bonus);
    expect(finish(run, [1, 2, 3]).stars).toBe(3);
    expect(finish(run, [1e9, 2e9, 3e9]).stars).toBe(0);
    expect(finish(run, null).stars).toBe(0);
  });

  it("모든 섬에서 의뢰 세 개가 나오고 그 섬에 없는 건물이 필요한 의뢰는 나오지 않는다", () => {
    for (const island of ISLAND_LIST) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const run = createRun(island, seed);
        expect(new Set(run.quests).size).toBe(3);
        for (const id of run.quests) {
          const quest = QUESTS.find((q) => q.id === id);
          expect(quest.needs.every((need) => island.pool[need] > 0)).toBe(true);
        }
      }
    }
  });
});

describe("밸런스 (봇 시뮬레이션)", () => {
  const N = 14;
  const mean = (island, mk) => {
    let sum = 0;
    for (let seed = 1; seed <= N; seed += 1) sum += finish(playOut(island, seed, mk(seed)), null).score;
    return sum / N;
  };

  it.each([...ISLAND_LIST, findIsland("daily:2026-10-19")])(
    "$id: 아무렇게나 두면 별을 못 받고, 점수만 보면 2별선 근처이며, 앞을 보면 더 높다",
    (island) => {
      const random = mean(island, (s) => randomPicker(makeRng(s + 5)));
      const greedy = mean(island, () => greedyMove);
      const look = mean(island, () => lookaheadMove);
      expect(random).toBeLessThan(greedy * 0.8);
      expect(look).toBeGreaterThan(greedy * 0.97);
      if (island.stars) {
        expect(random).toBeLessThan(island.stars[0]);
        expect(greedy).toBeGreaterThan(island.stars[1] * 0.9);
        expect(greedy).toBeLessThan(island.stars[1] * 1.1);
      }
    },
    30000,
  );

  it("어떤 섬이든 판이 끝까지 진행되고 막다른 길이 없다", () => {
    for (const island of ISLAND_LIST) {
      for (let seed = 1; seed <= 6; seed += 1) {
        const run = playOut(island, seed, randomPicker(makeRng(seed)));
        expect(isOver(run), island.id).toBe(true);
        expect(run.board.filter(Boolean).length, island.id).toBeGreaterThanOrEqual(island.deckSize - 4);
      }
    }
  });
});