import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameData, saveGameData } from "../../lib/storage.js";
import { mountReact } from "../mount-react.jsx";
import CozyCafe from "./CozyCafe.jsx";
import { GOAL, initialState } from "./economy.js";
import { initialSimulation, stepSimulation } from "./simulation.js";

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
const dialog = () => el.querySelector('[role="dialog"]');

/** 자동 저장이 최신 렌더 상태를 읽도록 1초 단위로 진행한다. */
async function wait(ms) {
  for (let left = ms; left > 0; left -= 1000) await act(async () => vi.advanceTimersByTimeAsync(Math.min(1000, left)));
  if (ms === 0) await act(async () => vi.advanceTimersByTimeAsync(0));
}

/** 실제 사용자 저장과 분리된 테스트 저장소에 진행 상황을 넣는다. */
function seed(patch = {}, at = T0) {
  const base = initialState(at);
  saveGameData(ID, at, { ...base, ...patch, levels: { ...base.levels, ...patch.levels } });
}

/** 실제 Game Host와 같은 React 마운트 계약으로 화면을 연다. */
async function mount() {
  el = document.createElement("div");
  document.body.append(el);
  await act(async () => { instance = mountReact(CozyCafe).mount(el, {}); });
}

/** 화면을 떠나며 저장과 자원 정리를 수행한다. */
async function unmount() {
  await act(async () => instance.unmount());
  el.remove();
}

/** 브라우저 숨김과 복귀 이벤트를 재현한다. */
async function setVisibility(state) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
}

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(T0); });
afterEach(async () => { if (el?.isConnected) await unmount(); delete document.visibilityState; vi.useRealTimers(); });

describe("실제 카페 영업", () => {
  it("작업 돕기를 눌러도 빈 카페에서는 코인이 생기지 않고 손님에게 전달한 뒤 결제된다", async () => {
    await mount();
    await click(button("작업 돕기"));
    expect(coins()).toBe("0");
    await wait(1000);
    expect(el.querySelector('[data-actor^="guest-"]')).toBeTruthy();
    expect(coins()).toBe("0");
    await wait(19000);
    expect(Number(coins())).toBeGreaterThan(0);
    expect(text()).toContain("완료");
  });
  it("설비 구매는 실제 코인을 쓰고 다음 비용과 제조 시간을 바꾼다", async () => {
    seed({ coins: 20, total: 20 });
    await mount();
    await click(byLabel("에스프레소 머신 올리기"));
    expect(coins()).toBe("0");
    expect(text()).toContain("에스프레소 머신 Lv.1");
    expect(byLabel("에스프레소 머신 올리기").getAttribute("aria-label")).toContain("23 코인");
    expect(text()).toContain("제조 4.6초");
  });
  it("부족한 구매와 소수 코인 부족을 정직하게 안내한다", async () => {
    seed({ coins: 19.5, total: 19.5 });
    await mount();
    expect(byLabel("에스프레소 머신 올리기").textContent).toContain("1 부족");
    await click(byLabel("에스프레소 머신 올리기"));
    expect(text()).toContain("에스프레소 머신 Lv.0");
    expect(el.querySelector('[role="status"]').textContent).toBe("코인이 모자라요");
  });
  it("직원을 고용하면 실제 작업자가 추가되고 미보유 오븐은 나타나지 않는다", async () => {
    seed({ coins: 1000, total: 1000 });
    await mount();
    await click(byLabel("직원 고용"));
    await wait(250);
    expect(text()).toContain("바리스타 직원 1명");
    expect(el.querySelector('[data-actor="worker-1"]')).toBeTruthy();
    expect(el.querySelector(".cafe-bakery")).toBeNull();
    expect(byLabel("카페 장면").getAttribute("aria-label")).toContain("직원 1명");
  });
  it("메뉴 해금과 테라스 구매는 실제 설비와 좌석을 추가한다", async () => {
    seed({ coins: 9000, total: 9000 });
    await mount();
    await click(byLabel("베이커리 오븐 올리기"));
    await click(byLabel("테라스 좌석 올리기"));
    await wait(250);
    expect(el.querySelector(".cafe-bakery")).toBeTruthy();
    expect(el.querySelector(".cafe-terrace")).toBeTruthy();
    expect(el.querySelector(".cafe-room").getAttribute("src")).toContain("room-terrace.webp");
    expect(text()).toContain("현재 3석");
  });
  it("업그레이드 잠금과 구매 완료를 보여준다", async () => {
    seed({ coins: 600, total: 600 });
    await mount();
    await click(button("업그레이드"));
    expect(text()).toContain("아직 열리지 않았어요");
    await click(byLabel("바리스타의 손길 구매"));
    expect(text()).toContain("구매 완료");
    expect(text()).toContain("직접 작업 돕기 효과 2배");
  });
  it("실제 손님 이동 좌표와 작업 단계가 시간에 따라 변한다", async () => {
    await mount();
    await wait(1000);
    const before = el.querySelector('[data-actor="guest-1"]').style.transform;
    await wait(1000);
    expect(el.querySelector('[data-actor="guest-1"]').style.transform).not.toBe(before);
    await wait(4000);
    expect(el.querySelector('[data-actor="worker-0"]').dataset.state).toBe("making");
  });
  it("대기 주문의 먼저 처리 조작이 우선 표시를 바꾼다", async () => {
    await mount();
    await wait(16000);
    const priority = el.querySelector('[aria-label$="번 주문 먼저 처리"]');
    expect(priority).toBeTruthy();
    await click(priority);
    expect(el.querySelector('[aria-pressed="true"]')).toBeTruthy();
  });
});

describe("영업 저장과 복귀", () => {
  it("기존 저장을 열면 1시간 오프라인 수익을 한 번만 받는다", async () => {
    seed({ levels: { espresso: 10 } }, T0 - HOUR);
    await mount();
    expect(dialog().textContent).toContain("1.8만");
    expect(coins()).toBe("1.8만");
    await click(button("받기"));
    await unmount();
    await mount();
    expect(dialog()).toBeNull();
    expect(coins()).toBe("1.8만");
  });
  it("오프라인 수익은 최대 8시간이다", async () => {
    seed({ levels: { espresso: 10 } }, T0 - 20 * HOUR);
    await mount();
    expect(dialog().textContent).toContain("최대 8시간");
    expect(coins()).toBe("14.4만");
  });
  it("자동 저장과 새로고침은 매출과 처리 중인 주문을 보존한다", async () => {
    await mount();
    await wait(30000);
    const before = coins();
    await unmount();
    const data = getGameData(ID);
    expect(data.service.served).toBeGreaterThan(0);
    expect(data.service.workers.some((w) => w.phase !== "idle")).toBe(true);
    await mount();
    expect(coins()).toBe(before);
    await unmount();
    expect(getGameData(ID).service.served).toBe(data.service.served);
  });
  it("10초 자동 저장에 운영 상태도 포함된다", async () => {
    await mount();
    await wait(10000);
    expect(getGameData(ID).service.clock).toBeGreaterThan(8000);
    expect(getGameData(ID).service.guests.length).toBeGreaterThan(0);
  });
  it("숨김 중에는 손님 이동이 멈추고 복귀는 오프라인으로 한 번 정산된다", async () => {
    seed({ levels: { espresso: 10 } });
    await mount();
    await wait(2000);
    await setVisibility("hidden");
    const saved = getGameData(ID);
    await wait(5000);
    expect(coins()).toBe("0");
    expect(el.querySelector(".cozy-cafe").dataset.paused).toBe("true");
    vi.setSystemTime(T0 + 602000);
    await setVisibility("visible");
    expect(dialog().textContent).toContain("+3,000");
    expect(coins()).toBe("3,000");
    expect(saved.service.clock).toBe(2000);
    await click(button("받기"));
    await wait(0);
    expect(coins()).toBe("3,000");
  });
  it("이전 코인·직원·설비·업그레이드를 유지한다", async () => {
    seed({ coins: 777, total: 777, staff: 2, levels: { oven: 1 }, upgrades: ["touch"] });
    await mount();
    expect(coins()).toBe("777");
    expect(text()).toContain("바리스타 직원 2명");
    expect(el.querySelector(".cafe-bakery")).toBeTruthy();
  });
  it("잘못된 저장은 빈 카페로 복구한다", async () => {
    localStorage.setItem("zepio:v1", "{broken");
    await mount();
    expect(coins()).toBe("0");
    await wait(15000);
    expect(Number(coins())).toBeGreaterThan(0);
  });
  it("복구한 제조 중 주문을 마치고 저장하면 같은 주문을 다시 결제하지 않는다", async () => {
    const econ = initialState(T0);
    const sim = stepSimulation(initialSimulation(econ), econ, 6000).sim;
    seed({ service: sim });
    await mount();
    await wait(8000);
    expect(Number(coins())).toBeGreaterThan(0);
    const before = coins();
    await unmount();
    await mount();
    expect(coins()).toBe(before);
  });
});

describe("설정·목표·키보드", () => {
  it("초기화는 두 번 확인하고 영업 상태도 함께 새로 시작한다", async () => {
    seed({ coins: 500, total: 500 });
    await mount();
    await click(byLabel("설정"));
    await click(button("저장 초기화"));
    expect(coins()).toBe("500");
    await click(button("정말 지우기"));
    expect(coins()).toBe("0");
    expect(getGameData(ID).total).toBe(0);
  });
  it("주문 매출로 누적 목표를 달성하고 계속 영업할 수 있다", async () => {
    seed({ coins: 10, total: GOAL - 1 });
    await mount();
    await wait(15000);
    expect(dialog().textContent).toContain("체인점 오픈!");
    expect(button("결과 공유하기")).toBeTruthy();
    await click(button("계속하기"));
    await wait(1000);
    expect(dialog()).toBeNull();
  });
  it("Esc로 복귀 대화 상자를 닫는다", async () => {
    seed({ levels: { espresso: 10 } }, T0 - HOUR);
    await mount();
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(dialog()).toBeNull();
  });
  it("방향키가 관리 탭의 선택과 초점을 함께 옮긴다", async () => {
    await mount();
    const equipment = el.querySelector("#cafe-tab-equipment");
    equipment.focus();
    await act(async () => equipment.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    const upgrade = el.querySelector("#cafe-tab-upgrade");
    expect(upgrade.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(upgrade);
  });
});
