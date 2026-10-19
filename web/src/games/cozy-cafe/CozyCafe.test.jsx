import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameData, saveGameData } from "../../lib/storage.js";
import { mountReact } from "../mount-react.jsx";
import CozyCafe from "./CozyCafe.jsx";
import { GOAL, initialState } from "./economy.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const T0 = 1_700_000_000_000;
const HOUR = 3_600_000;
const ID = "cozy-cafe";

let el;
let instance;

const text = () => el.textContent;
const coins = () => el.querySelector('[aria-label^="코인 "]').textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label));
const byLabel = (label) => el.querySelector(`[aria-label^="${label}"]`);
const click = (node) => act(async () => node.click());
/** 1초씩 나눠 흘려보낸다. 한 번의 act 안에서는 화면 갱신이 미뤄져 저장 시점의 상태가 어긋나기 때문이다. */
async function wait(ms) {
  for (let left = ms; left > 0; left -= 1000) await act(async () => vi.advanceTimersByTimeAsync(Math.min(1000, left)));
  if (ms === 0) await act(async () => vi.advanceTimersByTimeAsync(0));
}
const dialog = () => el.querySelector('[role="dialog"]');

/**
 * 저장소에 진행 상황을 미리 넣어 둔다.
 *
 * @param patch 기본 진행 상황에 덮어쓸 값
 * @param at 저장 시각이자 마지막 계산 시각
 */
function seed(patch = {}, at = T0) {
  const base = initialState(at);
  saveGameData(ID, at, { ...base, ...patch, levels: { ...base.levels, ...patch.levels } });
}

async function mount() {
  el = document.createElement("div");
  document.body.append(el);
  await act(async () => {
    instance = mountReact(CozyCafe).mount(el, {});
  });
}

async function unmount() {
  await act(async () => instance.unmount());
  el.remove();
}

async function setVisibility(state) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(async () => {
  if (el?.isConnected) await unmount();
  delete document.visibilityState;
  vi.useRealTimers();
});

describe("CozyCafe 기본 흐름", () => {
  it("새로 시작하면 코인 0으로 시작하고 커피 내리기로 코인이 오른다", async () => {
    await mount();
    expect(coins()).toBe("0");
    await click(button("커피 내리기"));
    await click(button("커피 내리기"));
    expect(coins()).toBe("2");
  });

  it("설비를 사면 코인이 줄고 레벨이 오르며 다음 가격이 비싸진다", async () => {
    seed({ coins: 20, total: 20 });
    await mount();
    expect(byLabel("에스프레소 머신 올리기").getAttribute("aria-label")).toContain("20 코인");
    await click(byLabel("에스프레소 머신 올리기"));
    expect(text()).toContain("에스프레소 머신 Lv.1");
    expect(coins()).toBe("0");
    expect(byLabel("에스프레소 머신 올리기").getAttribute("aria-label")).toContain("23 코인");
  });

  it("코인이 모자라면 사지 못하고 안내를 보여준다", async () => {
    await mount();
    await click(byLabel("에스프레소 머신 올리기"));
    expect(text()).toContain("에스프레소 머신 Lv.0");
    expect(el.querySelector('[role="status"]').textContent).toBe("코인이 모자라요");
  });

  it("직원을 고용하면 직원 수와 카페 장면의 직원이 늘어난다", async () => {
    seed({ coins: 1000, total: 1000 });
    await mount();
    expect(byLabel("카페 장면").getAttribute("aria-label")).toContain("직원 0명");
    await click(byLabel("직원 고용"));
    expect(text()).toContain("바리스타 직원 1명");
    expect(byLabel("카페 장면").getAttribute("aria-label")).toContain("직원 1명");
  });

  it("업그레이드 탭에서 열리지 않은 것은 ?로 가려지고 열린 것은 살 수 있다", async () => {
    seed({ coins: 600, total: 600 });
    await mount();
    await click(button("업그레이드"));
    expect(text()).toContain("아직 열리지 않았어요");
    await click(byLabel("바리스타의 손길 구매"));
    expect(text()).toContain("구매 완료");
    expect(button("커피 내리기").textContent).toContain("+2");
  });

  it("시간이 지나면 자동 수익이 쌓인다", async () => {
    seed({ levels: { espresso: 10 } });
    await mount();
    await wait(10_000);
    expect(coins()).toBe("50");
  });

  it("설비 수와 직원 수로 성장 단계가 오른다", async () => {
    seed({ levels: { oven: 1 }, staff: 1 });
    await mount();
    expect(byLabel("카페 장면").getAttribute("aria-label")).toContain("단계 3 / 5");
  });
});

describe("저장과 오프라인 수익", () => {
  it("다시 열면 자리를 비운 동안의 수익을 알려 주고 받으면 닫힌다", async () => {
    seed({ levels: { espresso: 10 } }, T0 - HOUR);
    await mount();
    expect(dialog().textContent).toContain("자리를 비운 동안");
    expect(dialog().textContent).toContain("1.8만");
    expect(dialog().textContent).toContain("1시간 0분");
    expect(coins()).toBe("1.8만");
    await click(button("받기"));
    expect(dialog()).toBeNull();
  });

  it("자리를 비운 시간은 8시간까지만 계산한다", async () => {
    seed({ levels: { espresso: 10 } }, T0 - 20 * HOUR);
    await mount();
    expect(dialog().textContent).toContain("8시간 0분");
    expect(dialog().textContent).toContain("최대 8시간");
    expect(coins()).toBe("14.4만");
  });

  it("자동 저장 뒤 다시 열어도 같은 시간이 두 번 지급되지 않는다", async () => {
    seed({ levels: { espresso: 10 } });
    await mount();
    await wait(30_000);
    expect(coins()).toBe("150");
    await unmount();
    await mount();
    expect(coins()).toBe("150");
    expect(dialog()).toBeNull();
    await wait(1000);
    expect(coins()).toBe("155");
    expect(getGameData(ID).total).toBeCloseTo(150, 5);
  });

  it("10초마다 자동 저장하고, 화면을 떠날 때도 저장한다", async () => {
    seed({ levels: { espresso: 10 } });
    await mount();
    await wait(10_000);
    // 마지막으로 그려진 상태가 저장되므로 테스트의 1초 단위 act 때문에 조금 모자랄 수 있다
    expect(getGameData(ID).coins).toBeGreaterThan(40);
    expect(getGameData(ID).coins).toBeLessThanOrEqual(50);
    await wait(5000);
    await unmount();
    expect(getGameData(ID).coins).toBeGreaterThan(65);
    expect(getGameData(ID).coins).toBeLessThanOrEqual(75);
  });

  it("탭이 가려지면 저장하고, 오래 뒤 돌아오면 한 번만 지급한다", async () => {
    seed({ levels: { espresso: 10 } });
    await mount();
    await wait(2000);
    await setVisibility("hidden");
    expect(getGameData(ID).lastAt).toBe(T0 + 2000);
    // 백그라운드 탭은 타이머가 멈춘다고 보고 시계만 앞으로 돌린다
    vi.setSystemTime(T0 + 2000 + 600_000);
    await setVisibility("visible");
    await wait(0);
    expect(dialog().textContent).toContain("+3,000");
    expect(coins()).toBe("3,010");
    await click(button("받기"));
    await wait(0);
    expect(coins()).toBe("3,010");
  });

  it("새로고침은 저장된 진행 상황을 그대로 복원한다", async () => {
    seed({ coins: 777, total: 777, staff: 2, upgrades: ["touch"] });
    await mount();
    expect(coins()).toBe("777");
    expect(text()).toContain("바리스타 직원 2명");
    expect(button("커피 내리기").textContent).toContain("+2");
  });

  it("저장 데이터가 깨져 있어도 새 카페로 시작한다", async () => {
    for (const bad of ["{not json", '{"v":1,"games":{"cozy-cafe":{"data":"x"}}}', "null"]) {
      localStorage.setItem("zepio:v1", bad);
      await mount();
      expect(coins()).toBe("0");
      await unmount();
    }
    localStorage.setItem(
      "zepio:v1",
      JSON.stringify({ v: 1, games: { [ID]: { plays: 1, lastAt: 1, data: { v: 1, coins: "abc", total: -5, levels: 5, staff: -1, lastAt: "x" } } }, recent: [] }),
    );
    await mount();
    expect(coins()).toBe("0");
    expect(dialog()).toBeNull();
  });
});

describe("설정과 목표", () => {
  it("저장 초기화는 한 번 더 확인한 뒤 새 카페로 되돌린다", async () => {
    seed({ coins: 500, total: 500 });
    await mount();
    await click(byLabel("설정"));
    await click(button("저장 초기화"));
    expect(coins()).toBe("500");
    await click(button("정말 지우기"));
    expect(coins()).toBe("0");
    expect(getGameData(ID).total).toBe(0);
  });

  it("누적 수익이 목표에 이르면 체인점 오픈 카드가 열리고 계속하기로 닫힌다", async () => {
    seed({ coins: 10, total: GOAL - 1 });
    await mount();
    expect(dialog()).toBeNull();
    await click(button("커피 내리기"));
    expect(dialog().textContent).toContain("체인점 오픈!");
    expect(dialog().textContent).toContain("1억");
    expect(button("결과 공유하기")).toBeTruthy();
    await click(button("계속하기"));
    expect(dialog()).toBeNull();
    await click(button("커피 내리기"));
    expect(dialog()).toBeNull();
  });

  it("Esc로 대화 상자를 닫을 수 있다", async () => {
    seed({ levels: { espresso: 10 } }, T0 - HOUR);
    await mount();
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(dialog()).toBeNull();
  });
});

describe("카페 장면과 조작 피드백", () => {
  it("1코인 미만으로 부족해도 0 부족으로 표시하거나 구매 가능으로 안내하지 않는다", async () => {
    seed({ coins: 19.5, total: 19.5 });
    await mount();
    expect(byLabel("에스프레소 머신 올리기").textContent).toContain("1 부족");
    expect(byLabel("에스프레소 머신 올리기").getAttribute("aria-disabled")).toBe("true");
    expect(el.querySelector(".cafe-next-detail").textContent).toContain("1 코인 더");
  });

  it("직원만 먼저 고용해도 구매하지 않은 오븐이나 테라스는 나타나지 않는다", async () => {
    seed({ staff: 1 });
    await mount();
    expect(el.querySelectorAll(".cafe-staff")).toHaveLength(1);
    expect(el.querySelector(".cafe-bakery")).toBeNull();
    expect(el.querySelector(".cafe-terrace")).toBeNull();
    expect(el.querySelector(".cafe-room").getAttribute("src")).toContain("/room.webp");
  });

  it("테라스만 구매해도 실제 보유한 공간과 손님만 나타난다", async () => {
    seed({ levels: { terrace: 1 } });
    await mount();
    expect(el.querySelector(".cafe-terrace")).toBeTruthy();
    expect(el.querySelector(".cafe-room").getAttribute("src")).toContain("room-terrace.webp");
    expect(el.querySelector(".cafe-guest")).toBeTruthy();
    expect(el.querySelector(".cafe-bakery")).toBeNull();
    expect(el.querySelectorAll(".cafe-staff")).toHaveLength(0);
  });

  it("설비 레벨이 높아져도 설비를 무한히 복제하지 않고 원두와 브랜드 장식이 추가된다", async () => {
    seed({ levels: { espresso: 12, oven: 20, terrace: 4, beans: 1, marketing: 1 }, staff: 15 });
    await mount();
    expect(el.querySelectorAll(".cafe-bakery")).toHaveLength(1);
    expect(el.querySelectorAll(".cafe-staff")).toHaveLength(3);
    expect(el.querySelectorAll(".cafe-guest")).toHaveLength(2);
    expect(el.querySelector(".cafe-machine.is-premium")).toBeTruthy();
    expect(el.querySelector(".cafe-beans")).toBeTruthy();
    expect(el.querySelector(".cafe-bunting")).toBeTruthy();
    expect(byLabel("카페 장면").getAttribute("aria-label")).toContain("직원 15명");
  });

  it("장면의 머신을 눌러도 수익이 한 번 지급되고 시각 효과는 여섯 개로 제한된다", async () => {
    await mount();
    for (let i = 0; i < 10; i++) await click(byLabel("카페 머신으로"));
    expect(coins()).toBe("10");
    expect(el.querySelectorAll(".cafe-float")).toHaveLength(6);
    expect(el.querySelector(".is-brewing")).toBeTruthy();
    await wait(1000);
    expect(el.querySelectorAll(".cafe-float")).toHaveLength(0);
    expect(el.querySelector(".is-brewing")).toBeNull();
  });

  it("다음 목표는 실제 가격과 보유 금액을 표시하고 구매하면 다음 항목으로 넘어간다", async () => {
    seed({ coins: 20, total: 20 });
    await mount();
    expect(el.querySelector(".cafe-next-detail").textContent).toContain("구매할 수 있어요");
    await click(byLabel("에스프레소 머신 올리기"));
    expect(el.querySelector(".cafe-next-detail").textContent).toContain("첫 직원 고용");
    expect(el.querySelector(".cafe-next-detail").textContent).toContain("150 코인 더");
  });

  it("방향키로 탭을 바꾸면 선택과 초점이 함께 이동한다", async () => {
    await mount();
    const equipment = el.querySelector("#cafe-tab-equipment");
    equipment.focus();
    await act(async () => equipment.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    const upgrade = el.querySelector("#cafe-tab-upgrade");
    expect(upgrade.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(upgrade);
  });

  it("배경 탭에서는 게임 틱과 표시 효과를 멈추고 복귀할 때 경과 시간을 한 번 반영한다", async () => {
    seed({ levels: { espresso: 10 } });
    await mount();
    await click(byLabel("카페 머신으로"));
    await setVisibility("hidden");
    expect(el.querySelector(".cozy-cafe").dataset.paused).toBe("true");
    expect(el.querySelectorAll(".cafe-float")).toHaveLength(0);
    await wait(5000);
    expect(coins()).toBe("1");
    await setVisibility("visible");
    expect(coins()).toBe("26");
    expect(el.querySelector(".cozy-cafe").dataset.paused).toBe("false");
  });
});
