import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameData, saveGameData } from "../../lib/storage.js";
import { mountReact } from "../_shared/mount-react.jsx";
import HalluDetective from "./HalluDetective.jsx";
import { PUZZLES } from "./puzzles.js";
import { initialState } from "./reducer.js";
import { snapshot } from "./record.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ID = "hallu-detective";
let el;
let instance;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label) && !b.disabled);
const click = (node) => act(async () => node.click());
const toggles = () => [...el.querySelectorAll("button[aria-pressed]")].filter((b) => b.textContent.includes("환각"));

async function mount() {
  el = document.createElement("div");
  document.body.append(el);
  await act(async () => {
    instance = mountReact(HalluDetective).mount(el, {});
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

describe("HalluDetective", () => {
  it("사무소에 사건 12건이 보이고 앞의 세 건만 열려 있다", async () => {
    await mount();
    expect(text()).toContain("사건 12건");
    expect(text()).toContain("힌트 코인 3");
    expect(el.querySelectorAll("ul > li > button")).toHaveLength(12);
    const enabled = [...el.querySelectorAll("ul > li > button")].filter((b) => !b.disabled);
    expect(enabled).toHaveLength(3);
  });

  it("사무소의 숨은 코인을 한 번만 찾을 수 있고 저장된다", async () => {
    await mount();
    await click(el.querySelector('button[aria-label^="책장"]'));
    expect(text()).toContain("힌트 코인 4");
    await click(el.querySelector('button[aria-label^="책장"]'));
    expect(text()).toContain("힌트 코인 4");
    expect(getGameData(ID).save.coins).toBe(4);
  });

  it("퍼즐을 열어 틀리면 점수가 깎이고, 맞히면 점수와 해설이 나오고 저장된다", async () => {
    await mount();
    await click(button("카페 1분기"));
    expect(text()).toContain("문서에 없는 문장을 모두 고르세요");
    await click(toggles()[0]);
    await click(button("결정"));
    expect(text()).toContain("아쉬워요");
    await click(button("다시 풀기"));
    await click(button("다시하기"));
    await click(toggles()[2]);
    await click(toggles()[4]);
    await click(button("결정"));
    expect(text()).toContain("정답! 80점");
    expect(text()).toContain("날짜 바꿔치기");
    await click(button("계속"));
    expect(text()).toContain("해결 1/12");
    expect(getGameData(ID).save.solved.p01).toEqual({ score: 80, wrong: 1 });
  });

  it("힌트는 코인을 쓰고 단계별로 열린다", async () => {
    await mount();
    await click(button("카페 1분기"));
    await click(button("힌트 0/3"));
    expect(el.querySelector('ol[aria-label="연 힌트"]').textContent).toContain("힌트 1");
    expect(text()).toContain("힌트 코인 2");
    expect(getGameData(ID).save.hints.p01).toBe(1);
  });

  it("범인 고르기 퍼즐은 진술을 보여 주고 용의자를 골라 맞히면 해설이 나온다", async () => {
    await mount();
    await click(button("금고 속 쿠키"));
    expect(text()).toContain("정확히 1명만 진실을 말합니다");
    expect(el.querySelector('ul[aria-label="진술"]').querySelectorAll("li")).toHaveLength(3);
    const select = el.querySelector("#culprit");
    const pick = async (value) =>
      act(async () => {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, String(value));
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await click(button("결정"));
    expect(text()).toContain("먼저");
    await pick(1);
    await click(button("결정"));
    expect(text()).toContain("아쉬워요");
    await click(button("다시 풀기"));
    await pick(0);
    await click(button("결정"));
    expect(text()).toContain("정답! 80점");
    expect(text()).toContain("범인은 민수입니다");
  });

  it("격자 퍼즐은 칸을 눌러 ✗와 ●를 채우고 모두 맞히면 정답이다", async () => {
    await mount();
    await click(button("도시락 주문표"));
    expect(el.querySelectorAll("table")).toHaveLength(2);
    expect(el.querySelector('ul[aria-label="단서"]').querySelectorAll("li")).toHaveLength(4);
    await click(button("결정"));
    expect(text()).toContain("모든 줄에 ●");
    const g1 = PUZZLES.find((p) => p.id === "g1");
    for (const [c, options] of g1.answer.entries()) {
      for (const [slot, opt] of options.entries()) {
        const cell = () => el.querySelector(`button[aria-label^="${g1.cats[c].name} ${g1.slots[slot]} - ${g1.cats[c].options[opt]}:"]`);
        await click(cell());
        expect(cell().textContent).toBe("✗");
        await click(cell());
        expect(cell().textContent).toBe("●");
      }
    }
    await click(button("결정"));
    expect(text()).toContain("정답! 100점");
    expect(text()).toContain("정답은 민수:");
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
    expect(button("소리").getAttribute("aria-pressed")).toBe("false");
  });

  it("나중에 풀기로 사무소에 돌아간다", async () => {
    await mount();
    await click(button("카페 1분기"));
    await click(button("나중에 풀기"));
    expect(text()).toContain("탐정 사무소");
  });

  it("저장된 진행을 불러오고 깨진 저장은 새로 시작한다", async () => {
    const s = { ...initialState(), coins: 7, solved: { p01: { score: 100, wrong: 0 } } };
    saveGameData(ID, Date.now(), { v: 1, best: {}, save: snapshot(s) });
    await mount();
    expect(text()).toContain("힌트 코인 7");
    expect(text()).toContain("해결 1/12");
    await act(async () => instance.unmount());
    el.remove();
    saveGameData(ID, Date.now(), { v: 1, best: {}, save: { coins: -5 } });
    await mount();
    expect(text()).toContain("힌트 코인 3");
  });
});