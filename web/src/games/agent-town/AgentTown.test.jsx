import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameData, saveGameData } from "../../lib/storage.js";
import { mountReact } from "../mount-react.jsx";
import AgentTown from "./AgentTown.jsx";
import { newGame } from "./reducer.js";
import { snapshot } from "./record.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ID = "agent-town";
let el;
let instance;
let clock;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label) && !b.disabled);
const click = (node) => act(async () => node.click());
const press = (key) => act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));

async function mount() {
  el = document.createElement("div");
  document.body.append(el);
  await act(async () => {
    instance = mountReact(AgentTown).mount(el, {});
  });
}

/** 저장소에 진행 상황을 넣어 둔다. */
function seed(patch = {}) {
  const base = newGame(3);
  const state = { ...base, dialog: null, party: ["explorer"], ...patch };
  saveGameData(ID, Date.now(), { v: 1, best: {}, save: snapshot(state) });
}

beforeEach(() => {
  localStorage.clear();
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => (clock += 1000));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(async () => {
  if (el?.isConnected) {
    await act(async () => instance.unmount());
    el.remove();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AgentTown", () => {
  it("제목 화면에서 새 게임을 시작하면 제피가 소개하고 동료가 된다", async () => {
    await mount();
    expect(text()).toContain("Agent Town");
    expect(button("이어하기")).toBeUndefined();
    await click(button("새 게임"));
    expect(text()).toContain("깨어났구나");
    for (let i = 0; i < 4; i += 1) await press("Enter");
    expect(text()).toContain("동료 제피");
    expect(el.querySelector('[role="img"][aria-label^="프롬프트 마을"]')).toBeTruthy();
    expect(el.querySelector('[role="group"][aria-label="방향 버튼"]').querySelectorAll("button")).toHaveLength(4);
  });

  it("저장된 진행이 있으면 이어하기로 불러오고, 새 게임은 한 번 더 확인한다", async () => {
    seed({ trust: 5, coins: 42 });
    await mount();
    expect(text()).toContain("이어하기 · 신뢰 5");
    await click(button("새 게임"));
    expect(text()).toContain("진행 중인 기록이 사라져요");
    await click(button("취소"));
    await click(button("이어하기"));
    expect(text()).toContain("신뢰 5/14");
    expect(text()).toContain("코인 42");
  });

  it("깨진 저장은 무시하고 제목 화면만 보인다", async () => {
    saveGameData(ID, Date.now(), { v: 1, best: {}, save: { seed: "x", trust: -3 } });
    await mount();
    expect(button("이어하기")).toBeUndefined();
    expect(button("새 게임")).toBeTruthy();
  });

  it("풀숲에서 의뢰가 나타나면 전투를 하고, 이기면 코인과 신뢰를 받고 저장된다", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    seed({ trust: 3, pool: ["button"], cooldown: 0, player: { x: 16, y: 11, dir: "right" } });
    await mount();
    await click(button("이어하기"));
    await press("ArrowRight");
    expect(text()).toContain("야생의 「버튼 색 바꾸기」 의뢰가 나타났다!");
    await click(button("코드 수정"));
    expect(text()).toContain("의뢰 완료!");
    await click(button("계속"));
    expect(text()).toContain("코인 8");
    expect(text()).toContain("신뢰 5/14");
    const saved = getGameData(ID).save;
    expect(saved).toMatchObject({ coins: 8, trust: 5 });
    expect(saved.seen.button).toBe("win");
    expect(saved.pool).toEqual([]);
  });

  it("건물에 들어가 코인으로 장비를 사면 바로 저장된다", async () => {
    seed({ coins: 10, player: { x: 4, y: 5, dir: "up" } });
    await mount();
    await click(button("이어하기"));
    await press("ArrowUp");
    expect(text()).toContain("도서관");
    await click(button("10 코인"));
    expect(text()).toContain("보유 중");
    expect(getGameData(ID).save).toMatchObject({ coins: 0, gear: { plan: true } });
    await press("Escape");
    expect(text()).toContain("신뢰 0/14");
  });

  it("전투 중 기술 버튼은 사용량이 모자라면 눌리지 않는다", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    seed({ usage: 17, pool: ["login"], cooldown: 0, trust: 3, player: { x: 16, y: 11, dir: "right" } });
    await mount();
    await click(button("이어하기"));
    await press("ArrowRight");
    expect(button("코드 수정")).toBeUndefined();
    expect(button("파일 읽기")).toBeTruthy();
    expect(el.querySelector('[role="progressbar"][aria-label="사용량"]').getAttribute("aria-valuenow")).toBe("17");
  });

  it("소리 버튼은 설정을 저장하고 다시 열어도 유지된다", async () => {
    await mount();
    const toggle = () => button("소리");
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    await click(toggle());
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(getGameData(ID).muted).toBe(true);
    await act(async () => instance.unmount());
    el.remove();
    await mount();
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
  });

  it("첫 입력 뒤 소리를 내고, 음소거하면 효과음도 내지 않는다", async () => {
    let oscillators = 0;
    class Context {
      currentTime = 0;
      state = "running";
      sampleRate = 8000;
      destination = {};
      createGain = () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} });
      createOscillator = () => {
        oscillators += 1;
        return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
      };
      close() {}
    }
    vi.stubGlobal("AudioContext", Context);
    await mount();
    expect(oscillators).toBe(0);
    await press("x");
    expect(oscillators).toBeGreaterThan(0);
    await click(button("소리"));
    const muted = oscillators;
    await click(button("새 게임"));
    expect(oscillators).toBe(muted);
  });

  it("대사는 찍히는 중에 누르면 한 줄을 먼저 채우고, 다 채운 뒤 누르면 넘어간다", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    await mount();
    await click(button("새 게임"));
    const dialog = () => el.querySelector("[data-dialog]");
    const first = dialog().textContent;
    const typed = () =>
      [...dialog().querySelector('[aria-hidden="true"]:not(:last-child)').childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("");
    expect(typed().length).toBeLessThan(first.length);
    await click(dialog());
    expect(dialog().textContent).toBe(first);
    expect(typed().length).toBeGreaterThan(5);
    await click(dialog());
    expect(dialog().textContent).not.toBe(first);
  });

  it("도감을 열면 만난 의뢰와 칭호가 보이고, 열린 동안은 걷지 않으며 Escape로 닫는다", async () => {
    seed({ seen: { button: "win", typo: true } });
    await mount();
    await click(button("이어하기"));
    await click(button("도감 열기"));
    expect(text()).toContain("칭호: 신입 에이전트");
    expect(text()).toContain("버튼 색 바꾸기");
    expect(text()).toContain("???");
    const before = getGameData(ID).save.steps;
    await press("ArrowRight");
    expect(getGameData(ID).save.steps).toBe(before);
    await press("Escape");
    expect(text()).not.toContain("칭호:");
    expect(el.querySelector('[role="img"][aria-label^="프롬프트 마을"]')).toBeTruthy();
  });

  it("도서관에서 슬롯 장비를 빼면 저장되고, 빠진 자리에 다른 장비를 끼울 수 있다", async () => {
    seed({
      gear: { readRule: true, askRule: true, guard: true, secret: true },
      slots: ["readRule", "askRule", "guard"],
      player: { x: 4, y: 5, dir: "up" },
    });
    await mount();
    await click(button("이어하기"));
    await press("ArrowUp");
    expect(text()).toContain("슬롯 3/3");
    await click(el.querySelector('ul[aria-label="끼운 장비"] button'));
    expect(text()).toContain("슬롯 2/3");
    expect(getGameData(ID).save.slots).toEqual(["askRule", "guard"]);
    const rule = [...el.querySelectorAll("li")].find((li) => li.textContent.includes("고치기 전에 먼저 읽어") && li.querySelector("button[aria-pressed]"));
    expect(rule.querySelector("button").getAttribute("aria-pressed")).toBe("false");
    await click(rule.querySelector("button"));
    expect(getGameData(ID).save.slots).toEqual(["askRule", "guard", "readRule"]);
  });
});
