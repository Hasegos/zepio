import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDaily, getGameData, saveGameData } from "../../lib/storage.js";
import { mountReact } from "../_shared/mount-react.jsx";
import { greedyMove, playOut } from "./bots.js";
import { apply, createRun, serializeRun } from "./engine.js";
import { ISLAND_LIST } from "./islands.js";
import TinyIsle from "./TinyIsle.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ID = "tiny-isle";
const sprout = ISLAND_LIST[0];
let el;
let instance;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label));
const cells = () => [...el.querySelectorAll('[role="group"][aria-label^="섬 지도"] button')];
const hand = () => [...el.querySelectorAll('[role="group"][aria-label="손패"] button')];
const click = (node) => act(async () => node.click());

/**
 * 한 수를 화면 조작(카드 선택, 칸 두 번 누르기)으로 둔다.
 *
 * @param move place 수
 */
async function playMove(move) {
  await click(hand()[move.slot]);
  await click(cells()[move.i]);
  await click(cells()[move.i]);
}

/**
 * 판을 처음부터 count수만큼 봇으로 두고 저장소에 이어 할 판으로 넣는다.
 *
 * @param count 미리 둘 수의 개수
 * @param seed 시드
 * @returns 그 시점의 판 상태
 */
function seedRun(count, seed = 1) {
  let run = createRun(sprout, seed);
  for (let n = 0; n < count; n += 1) run = apply(run, greedyMove(run));
  saveGameData(ID, Date.now(), { v: 1, best: {}, run: serializeRun(run) });
  return run;
}

async function mount() {
  el = document.createElement("div");
  document.body.append(el);
  await act(async () => {
    instance = mountReact(TinyIsle).mount(el, {});
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(async () => {
  if (el?.isConnected) {
    await act(async () => instance.unmount());
    el.remove();
  }
  vi.restoreAllMocks();
});

describe("TinyIsle", () => {
  it("시작 화면에 오늘의 섬, 섬 목록, 잠긴 섬 안내가 보인다", async () => {
    await mount();
    expect(text()).toContain("오늘의 섬");
    expect(text()).toContain("새싹섬");
    expect(text()).toContain("별 2개를 모으면 열려요");
    expect(button("이어 하기")).toBeUndefined();
    expect(button("조개섬").disabled).toBe(true);
  });

  it("섬을 고르면 8x8 지도와 손패 세 장, 의뢰 세 개가 나온다", async () => {
    await mount();
    await click(button("새싹섬"));
    expect(cells()).toHaveLength(64);
    expect(hand()).toHaveLength(3);
    expect(el.querySelectorAll('ul[aria-label="주민 의뢰"] li')).toHaveLength(3);
  });

  it("카드를 고르고 칸을 한 번 누르면 미리보기, 한 번 더 누르면 짓는다", async () => {
    await mount();
    await click(button("새싹섬"));
    await click(hand()[0]);
    const cell = cells().find((c) => c.getAttribute("aria-label").includes("지을 수 있음"));
    await click(cell);
    expect(button("여기에 짓기")).toBeTruthy();
    expect(cells().filter((c) => c.getAttribute("aria-label").includes("점,")).length).toBe(0);
    await click(cell);
    expect(cells().filter((c) => /집|농장|풍차|공원|가게|숲/.test(c.getAttribute("aria-label").split(", ")[2] ?? "")).length).toBe(1);
    expect(button("여기에 짓기")).toBeUndefined();
  });

  it("카드를 고르지 않고 칸을 누르면 안내가 나온다", async () => {
    await mount();
    await click(button("새싹섬"));
    await click(cells()[9]);
    expect(el.querySelector('[role="status"]').textContent).toContain("카드를 골라");
  });

  it("판은 수를 둘 때마다 저장되어 다시 열면 이어 할 수 있다", async () => {
    await mount();
    await click(button("새싹섬"));
    expect(getGameData(ID).run).toBeTruthy();
    expect(getGameData(ID).run.moves).toHaveLength(0);
    await click(hand()[0]);
    const cell = cells().find((c) => c.getAttribute("aria-label").includes("지을 수 있음"));
    await click(cell);
    await click(cell);
    expect(getGameData(ID).run.moves).toHaveLength(1);
    await act(async () => instance.unmount());
    el.remove();
    await mount();
    expect(button("이어 하기").textContent).toContain("건물 1채");
    await click(button("이어 하기"));
    expect(cells().filter((c) => c.getAttribute("aria-label").includes("점"))).toHaveLength(1);
  });

  it("마지막 수를 두면 결과 화면이 나오고 최고 기록이 저장되며 이어 할 판이 지워진다", async () => {
    const full = playOut(sprout, 2, greedyMove);
    const last = full.moves.length - 1;
    const run = seedRun(last, 2);
    expect(run.moves).toHaveLength(last);
    await mount();
    await click(button("이어 하기"));
    await playMove(greedyMove(run));
    expect(text()).toContain("다시 하기");
    expect(text()).toContain("주민 의뢰");
    expect(button("결과 공유하기")).toBeTruthy();
    const saved = getGameData(ID);
    expect(saved.run).toBeNull();
    expect(saved.best.sprout.score).toBeGreaterThan(0);
    await click(button("섬 고르기"));
    expect(text()).toContain("최고");
    expect(button("이어 하기")).toBeUndefined();
  });

  it("오늘의 섬을 시작할 수 있고 같은 날 같은 카드가 나온다", async () => {
    await mount();
    await click(button("오늘의 섬"));
    expect(text()).toContain("오늘의 섬");
    const first = hand().map((card) => card.getAttribute("aria-label"));
    await act(async () => instance.unmount());
    el.remove();
    localStorage.clear();
    await mount();
    await click(button("오늘의 섬"));
    expect(hand().map((card) => card.getAttribute("aria-label"))).toEqual(first);
    expect(getDaily(ID)).toBeNull();
  });

  it("저장 데이터가 깨져 있어도 시작 화면이 열린다", async () => {
    for (const bad of ["{oops", "null", JSON.stringify({ v: 1, games: { [ID]: { plays: 1, lastAt: 1, data: { v: 1, best: 5, run: { v: 1, island: "nope", seed: 1, moves: [] } } } }, recent: [] })]) {
      localStorage.setItem("zepio:v1", bad);
      await mount();
      expect(text()).toContain("어떤 섬을 지을까요?");
      expect(button("이어 하기")).toBeUndefined();
      await act(async () => instance.unmount());
      el.remove();
    }
  });

  it("어제의 오늘의 섬 판은 이어 하기에 나오지 않는다", async () => {
    saveGameData(ID, Date.now(), { v: 1, best: {}, run: { v: 1, island: "daily:2020-01-01", seed: 1, moves: [] } });
    await mount();
    expect(button("이어 하기")).toBeUndefined();
  });

  it("규칙에 어긋나는 저장된 판은 이어 하기에 나오지 않는다", async () => {
    saveGameData(ID, Date.now(), { v: 1, best: {}, run: { v: 1, island: "sprout", seed: 1, moves: [{ t: "place", slot: 0, i: 0 }] } });
    await mount();
    expect(button("이어 하기")).toBeUndefined();
  });
});