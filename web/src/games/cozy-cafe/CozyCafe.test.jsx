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
const byLabel = (label) => el.querySelector(`button[aria-label^="${label}"]`);
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

describe("방치형 카페 마을",()=>{
  it("자동 생산하고 주민 전신을 벡터로 그리며 기존 잘린 이미지를 쓰지 않는다",async()=>{
    await mount();
    await wait(3000);
    expect(Number(coins())).toBeGreaterThanOrEqual(2);
    expect(el.querySelectorAll('[data-actor]').length).toBeGreaterThan(0);
    expect(el.querySelector('.town-resident .left')).toBeTruthy();
    expect(el.querySelector('.town-resident .right')).toBeTruthy();
    expect(el.querySelector('image, img, .cafe-actor')).toBeNull();
    expect(text()).toContain("자동 생산");
  });
  it("지도 선택으로 건물을 증축하고 조건 달성 후 다음 부지를 건설한다",async()=>{
    seed({coins:10000,levels:{espresso:4}});
    await mount();
    await click(byLabel("골목 카페 증축"));
    expect(text()).toContain("골목 카페 Lv.5");
    expect(text()).toContain("햇살 빵집을 지어");
    await click(byLabel("햇살 빵집 건설"));
    expect(text()).toContain("햇살 빵집 Lv.1");
    expect(el.querySelector('[aria-label^="카페 마을 지도"]').getAttribute("aria-label")).toContain("건물 2개");
    expect(el.querySelector('li li')).toBeNull();
  });
  it("잠긴 부지는 돈이 있어도 건설되지 않고 부족한 코인도 안내한다",async()=>{
    await mount();
    await click(byLabel("햇살 빵집 건설"));
    expect(text()).toContain("카페 5레벨");
    await click(byLabel("골목 카페 증축"));
    expect(text()).toContain("코인이 모자라요");
  });
  it("직원을 고용하고 원하는 건물에 배치한 결과를 저장한다",async()=>{
    seed({coins:1000});
    await mount();
    await click(byLabel("매니저 고용"));
    await click(button("＋ 매니저 배치"));
    expect(text()).toContain("매니저 근무 중");
    await wait(10000);
    expect(getGameData(ID).managers.espresso).toBe(true);
    await click(button("배치 해제"));
    expect(text()).toContain("미배치 1명");
  });
  it("마을 응원은 연속 클릭으로 중복 보너스를 주지 않는다",async()=>{
    await mount();
    await click(button("마을 응원"));
    await wait(250);
    const first=Number(coins());
    await click(button("마을 응원"));
    await wait(250);
    expect(Number(coins())-first).toBeLessThan(2);
    expect(text()).toContain("10초마다");
  });
  it("숨김 중 타이머를 중단하고 복귀 수익을 한 번 정산한다",async()=>{
    await mount();
    await setVisibility("hidden");
    await wait(HOUR);
    await setVisibility("visible");
    expect(dialog().textContent).toContain("3,600");
    await click(button("받기"));
    expect(dialog()).toBeNull();
    await unmount();
    await mount();
    expect(dialog()).toBeNull();
  });
  it("대화상자 Escape와 탭 방향키가 작동하고 자원을 정리한다",async()=>{
    seed({},T0-HOUR);
    await mount();
    expect(dialog()).toBeTruthy();
    await act(async()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
    expect(dialog()).toBeNull();
    const tabs=el.querySelectorAll('[role="tab"]');
    await act(async()=>tabs[0].dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true})));
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    await unmount();
    await act(async()=>vi.runOnlyPendingTimersAsync());
    expect(vi.getTimerCount()).toBe(0);
  });
  it("목표 달성 카드와 두 번 확인하는 초기화가 동작한다",async()=>{
    seed({total:GOAL-1});
    await mount();
    await wait(2000);
    expect(dialog().textContent).toContain("마을의 랜드마크");
    await click(button("계속하기"));
    await click(byLabel("설정"));
    await click(button("저장 초기화"));
    expect(text()).toContain("정말 지우기");
    await click(button("취소"));
    expect(text()).not.toContain("정말 지우기");
  });
});
