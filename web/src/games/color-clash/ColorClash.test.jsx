import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReact } from "../mount-react.jsx";
import ColorClash from "./ColorClash.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let el;
let instance;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label));
const click = (node) => act(async () => node.click());
const advance = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));
const stored = () => JSON.parse(localStorage.getItem("zepio:v1"));

beforeEach(async () => {
  localStorage.clear();
  vi.useFakeTimers();
  // 칠한 색은 항상 빨강(0), 글자는 파랑(1)이 나온다
  vi.spyOn(Math, "random").mockReturnValue(0);
  el = document.createElement("div");
  document.body.append(el);
  await act(async () => {
    instance = mountReact(ColorClash).mount(el, {});
  });
});

afterEach(async () => {
  await act(async () => instance.unmount());
  el.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ColorClash", () => {
  it("시작하면 글자와 칠한 색을 알리고 30초가 흐른다", async () => {
    await click(button("시작하기"));
    expect(el.querySelector('[role="img"]').getAttribute("aria-label")).toBe("글자 파랑, 칠한 색 빨강");
    expect(text()).toContain("남은 시간 30초");

    await advance(5000);
    expect(text()).toContain("남은 시간 25초");
  });

  it("칠한 색을 누르면 점수가 오르고 글자 뜻을 누르면 오르지 않는다", async () => {
    await click(button("시작하기"));
    await click(button("빨강"));
    expect(text()).toContain("점수 1");
    expect(text()).toContain("✓ 정답");

    await click(button("파랑"));
    expect(text()).toContain("점수 1");
    expect(text()).toContain("✗ 오답");
  });

  it("키보드 숫자 키로도 입력한다", async () => {
    await click(button("시작하기"));
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    });
    expect(text()).toContain("점수 1");
  });

  it("30초가 지나면 결과를 보여주고 기록을 저장하며 더 높은 점수는 새 기록으로 알린다", async () => {
    await click(button("시작하기"));
    await click(button("빨강"));
    await click(button("파랑"));
    await advance(30000);
    expect(text()).toContain("Color Clash 완료");
    expect(text()).toContain("1점");
    expect(text()).toContain("정확도50%");
    expect(text()).toContain("내 최고 기록: 1점 · 정확도 50%");
    expect(text()).not.toContain("새 기록!");
    expect(button("결과 공유하기")).toBeDefined();
    expect(stored().games["color-clash"]).toMatchObject({ plays: 1, data: { bestScore: 1, bestAccuracy: 50 } });

    await click(button("다시 도전하기"));
    await click(button("빨강"));
    await click(button("빨강"));
    await advance(30000);
    expect(text()).toContain("새 기록!");
    expect(stored().games["color-clash"]).toMatchObject({ plays: 2, data: { bestScore: 2, bestAccuracy: 100 } });
  });

  it("플레이 중에 사라지면 타이머를 해제한다", async () => {
    const clearTimer = vi.spyOn(globalThis, "clearInterval");
    await click(button("시작하기"));
    await act(async () => instance.unmount());
    expect(clearTimer).toHaveBeenCalled();
  });
});