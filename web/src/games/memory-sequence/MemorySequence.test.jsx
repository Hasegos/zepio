import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReact } from "../mount-react.jsx";
import MemorySequence from "./MemorySequence.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let el;
let instance;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label));
const pad = (n) => el.querySelector(`button[aria-label="${n}번 패드"]`);
const click = (node) => act(async () => node.click());
const advance = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));

beforeEach(async () => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  el = document.createElement("div");
  document.body.append(el);
  await act(async () => {
    instance = mountReact(MemorySequence).mount(el, {});
  });
});

afterEach(async () => {
  await act(async () => instance.unmount());
  el.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("MemorySequence", () => {
  it("순서를 보여주는 동안에는 눌러도 반응하지 않고 끝나면 입력할 수 있다", async () => {
    await click(button("시작하기"));
    expect(text()).toContain("순서를 잘 보세요");

    await click(pad(1));
    expect(text()).toContain("순서를 잘 보세요");

    await advance(5000);
    expect(text()).toContain("같은 순서로 눌러 보세요 (0 / 3)");
  });

  it("순서를 모두 맞히면 다음 라운드에서 순서가 하나 길어진다", async () => {
    await click(button("시작하기"));
    await advance(5000);
    for (let i = 0; i < 3; i += 1) await click(pad(1));
    expect(text()).toContain("라운드 2 / 15");
    expect(text()).toContain("기억할 개수 4");
  });

  it("틀리면 결과 화면에서 어디서 틀렸는지 알려준다", async () => {
    await click(button("시작하기"));
    await advance(5000);
    await click(pad(2));
    expect(text()).toContain("1번을 눌러야 했어요. 내가 누른 패드는 2번이에요.");
    expect(text()).toContain("마지막 순서: 1 → 1 → 1");
  });

  it("키보드 숫자 키로도 입력한다", async () => {
    await click(button("시작하기"));
    await advance(5000);
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    });
    expect(text()).toContain("(1 / 3)");
  });

  it("순서를 보여주는 중에 사라지면 불빛 타이머를 해제한다", async () => {
    const setTimer = vi.spyOn(globalThis, "setTimeout");
    const clearTimer = vi.spyOn(globalThis, "clearTimeout");
    await click(button("시작하기"));
    await advance(800);
    const lightOff = setTimer.mock.calls.findLastIndex(([, delay]) => delay === 650);
    expect(lightOff).toBeGreaterThanOrEqual(0);

    await act(async () => instance.unmount());
    expect(clearTimer.mock.calls.map(([id]) => id)).toContain(setTimer.mock.results[lightOff].value);
  });

  it("결과가 나오면 기록을 저장하고 더 높은 라운드를 넘으면 새 기록으로 알린다", async () => {
    await click(button("시작하기"));
    await advance(5000);
    await click(pad(2));
    expect(text()).toContain("내 최고 기록: 0 / 15 라운드");
    expect(text()).not.toContain("새 기록!");
    expect(JSON.parse(localStorage.getItem("zepio:v1")).games["memory-sequence"].plays).toBe(1);

    await click(button("다시 도전하기"));
    await advance(5000);
    for (let i = 0; i < 3; i += 1) await click(pad(1));
    await advance(5000);
    await click(pad(2));
    expect(text()).toContain("새 기록!");
    expect(text()).toContain("내 최고 기록: 1 / 15 라운드");
    expect(JSON.parse(localStorage.getItem("zepio:v1")).games["memory-sequence"].plays).toBe(2);
  });
});
