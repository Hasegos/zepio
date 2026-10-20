import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReact } from "../_shared/mount-react.jsx";
import LightFlip from "./LightFlip.jsx";
import { solveMin } from "./puzzle.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let el;
let instance;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label));
const cells = () => [...el.querySelectorAll('[role="group"] button')];
const board = () => cells().map((cell) => (cell.getAttribute("aria-label").endsWith("켜짐") ? 1 : 0));
const click = (node) => act(async () => node.click());
const stored = () => JSON.parse(localStorage.getItem("zepio:v1"));

/**
 * 시드가 같으면 같은 수열을 만드는 난수 함수(mulberry32).
 *
 * @param seed 정수 시드
 * @returns 0 이상 1 미만의 수를 돌려주는 함수
 */
function seeded(seed) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 지금 판을 최소 이동으로 끝까지 누른다. */
async function solveStage() {
  for (const cell of solveMin(board()).presses) await click(cells()[cell]);
}

/** 5판을 모두 최소 이동으로 풀고 결과 화면까지 간다. */
async function playPerfect() {
  for (let i = 0; i < 5; i += 1) {
    await solveStage();
    await click(button("다음 판") ?? button("결과 보기"));
  }
}

beforeEach(async () => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockImplementation(seeded(7));
  el = document.createElement("div");
  document.body.append(el);
  await act(async () => {
    instance = mountReact(LightFlip).mount(el, {});
  });
});

afterEach(async () => {
  await act(async () => instance.unmount());
  el.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("LightFlip", () => {
  it("시작하면 5x5 격자와 판 정보를 보여준다", async () => {
    await click(button("시작하기"));
    expect(cells()).toHaveLength(25);
    expect(text()).toContain("1판 / 5판");
    expect(text()).toMatch(/이동 0 · 최소 \d/);
  });

  it("칸을 누르면 그 칸과 위아래좌우가 뒤집힌다", async () => {
    await click(button("시작하기"));
    const before = board();
    await click(cells()[12]);
    const after = board();
    const flipped = after.flatMap((value, i) => (value !== before[i] ? [i] : []));
    expect(flipped).toEqual([7, 11, 12, 13, 17]);
    expect(text()).toContain("이동 1");
  });

  it("되돌리기와 이 판 다시 시작은 이동을 지운다", async () => {
    await click(button("시작하기"));
    const before = board();
    await click(cells()[0]);
    await click(cells()[24]);
    await click(button("되돌리기"));
    expect(text()).toContain("이동 1");
    await click(button("이 판 다시 시작"));
    expect(board()).toEqual(before);
    expect(text()).toContain("이동 0");
    expect(button("되돌리기").disabled).toBe(true);
  });

  it("판을 풀면 클리어를 알리고 다음 판으로 넘어간다", async () => {
    await click(button("시작하기"));
    await solveStage();
    expect(text()).toMatch(/클리어! 이동 \d+회 \(최소 \d+회\)/);
    await click(cells()[3]);
    expect(board().every((v) => !v)).toBe(true);

    await click(button("다음 판"));
    expect(text()).toContain("2판 / 5판");
    expect(board().some(Boolean)).toBe(true);
  });

  it("5판을 최소 이동으로 풀면 추가 이동 0으로 기록하고 더 나은 기록만 새 기록으로 알린다", async () => {
    await click(button("시작하기"));
    await playPerfect();
    expect(text()).toContain("Light Flip 완료");
    expect(text()).toContain("추가 이동0회");
    expect(text()).toContain("완벽해요");
    expect(text()).not.toContain("새 기록!");
    expect(button("결과 공유하기")).toBeDefined();
    expect(stored().games["light-flip"]).toMatchObject({ plays: 1, data: { bestExtra: 0 } });

    await click(button("다시 도전하기"));
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    await playPerfect();
    expect(text()).not.toContain("새 기록!");
    expect(stored().games["light-flip"].plays).toBe(2);
  });

  it("화살표 키로 칸을 옮기고 칸 하나만 탭 순서에 들어간다", async () => {
    await click(button("시작하기"));
    expect(cells().filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    cells()[0].focus();
    await act(async () => {
      cells()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(document.activeElement).toBe(cells()[1]);
    await act(async () => {
      cells()[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(document.activeElement).toBe(cells()[6]);
    await act(async () => {
      cells()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });
    expect(document.activeElement).toBe(cells()[6]);
  });

  it("플레이 중에 사라지면 타이머를 해제한다", async () => {
    const clearTimer = vi.spyOn(globalThis, "clearInterval");
    await click(button("시작하기"));
    await act(async () => instance.unmount());
    expect(clearTimer).toHaveBeenCalled();
  });
});