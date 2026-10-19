import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameData, saveGameData } from "../../lib/storage.js";
import { mountReact } from "../mount-react.jsx";
import CozyCafe from "./CozyCafe.jsx";
import { initialSimulation } from "./simulation.js";


globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const T0 = 1_700_000_000_000;
const HOUR = 3_600_000;
const ID = "cozy-cafe";
let el;
let instance;
const text = () => el.textContent;
const coins = () => el.querySelector('[aria-label^="보유 코인 "]').textContent;
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
  const base = initialSimulation(at);
  saveGameData(ID, at, { ...base, ...patch });
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

describe("비 오는 골목의 첫 두 장",()=>{
  it("제피와 첫 손님을 만나 메뉴로 서빙하고 콤보를 얻는다",async()=>{
    await mount();
    expect(text()).toContain("비 오는 골목의 마지막 카페");
    expect(text()).toContain("할머니의 마지막 열쇠");
    await wait(1000);
    expect(el.querySelector('[data-guest="doyun"]')).toBeTruthy();
    expect(el.querySelector('[role="progressbar"]')).toBeTruthy();
    await click(byLabel("에스프레소 서빙"));
    expect(text()).toContain("콤보 x1");
    expect(getGameData(ID).counts.doyun).toBe(1);
    expect(coins()).not.toContain("0코인");
  });
  it("주문이 없는 메뉴는 연타해도 코인이나 사연을 주지 않는다",async()=>{
    await mount();
    await click(byLabel("버터 토스트 서빙"));
    await click(byLabel("버터 토스트 서빙"));
    expect(getGameData(ID).coins).toBe(0);
    expect(text()).toContain("이 메뉴를 기다리는 주문이 없어요");
  });
  it("제피의 자동 서빙은 화면을 누르지 않아도 진행된다",async()=>{
    await mount();
    await wait(15000);
    expect(text()).toContain("직원이 전한 잔 1");
    expect(getGameData(ID).autoServed).toBe(1);
    expect(getGameData(ID).tips).toBe(0);
  });
  it("해금 사연을 읽고 완결 선물을 한 번 적용한다",async()=>{
    seed({elapsed:600000,counts:{doyun:50,dalbong:0,moka:0}});
    await mount();
    await click(button("단골의 이야기"));
    await click(button("3막 · 나에게 보내는 것"));
    expect(dialog().textContent).toContain("배송 완료");
    expect(dialog().textContent).toContain("음료 판매액 +10%");
    await click(button("마음에 담기"));
    expect(getGameData(ID).read).toContain("doyun-2");
    expect(dialog()).toBeNull();
  });
  it("메뉴 네 칸과 무료 첫 선택, 변경 비용을 저장한다",async()=>{
    seed({elapsed:180000,coins:50});
    await mount();
    const select=el.querySelector('select[aria-label="1번 메뉴"]');
    await act(async()=>{select.value="latte";select.dispatchEvent(new Event("change",{bubbles:true}));});
    expect(getGameData(ID).menus[0]).toBe("latte");
    await click(button("든든한 한 끼"));
    expect(getGameData(ID).choices.style).toBe("meal");
    await click(button("오래 쉬는 한 잔"));
    expect(getGameData(ID).choices.style).toBe("rest");
    expect(getGameData(ID).coins).toBe(20);
  });
  it("노트에서 조합을 발견하고 중복 발견으로 보상이 늘지 않는다",async()=>{
    seed({elapsed:120000});
    await mount();
    await click(button("레시피 노트"));
    const ingredients=[...el.querySelectorAll('.cafe-ingredients button')];
    await click(ingredients.find(b=>b.textContent==="에스프레소"));
    await click(ingredients.find(b=>b.textContent==="따뜻한 우유"));
    await click(button("두 맛 이어 보기"));
    expect(text()).toContain("구름 라떼 발견");
    expect(getGameData(ID).discovered).toEqual(["cloud"]);
    await click(button("두 맛 이어 보기"));
    expect(getGameData(ID).discovered).toEqual(["cloud"]);
  });
  it("직원을 고용하면 역할에 맞는 인원과 비용을 반영한다",async()=>{
    seed({elapsed:300000,coins:500});
    await mount();
    const first=[...el.querySelectorAll('.cafe-staff-list article')][1].querySelector("button");
    await click(first);
    expect(getGameData(ID).staff.patissier).toBe(1);
    expect(getGameData(ID).coins).toBe(415);
  });
  it("탭 숨김·복귀와 pageshow가 수익을 중복 지급하지 않는다",async()=>{
    await mount();
    await setVisibility("hidden");
    await wait(HOUR);
    await setVisibility("visible");
    expect(dialog().textContent).toContain("카페는 불을 켜 두었어요");
    const first=getGameData(ID).coins;
    await act(async()=>window.dispatchEvent(new Event("pageshow")));
    expect(getGameData(ID).coins).toBe(first);
    await click(button("기다려 줘서 고마워"));
    await unmount();await mount();
    expect(dialog()).toBeNull();
    expect(getGameData(ID).coins).toBe(first);
  });
  it("대화창 Escape·초점 복원과 탭 좌우키를 지원하고 타이머를 정리한다",async()=>{
    await mount();
    const opener=button("할머니의 마지막 열쇠");
    opener.focus();await click(opener);
    expect(dialog()).toBeTruthy();
    await act(async()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Tab",bubbles:true})));
    expect(document.activeElement.textContent).toBe("마음에 담기");
    await act(async()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
    expect(dialog()).toBeNull();expect(document.activeElement).toBe(opener);
    const tabs=el.querySelectorAll('[role="tab"]');
    await act(async()=>tabs[0].dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true})));
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    await unmount();await act(async()=>vi.runOnlyPendingTimersAsync());
    expect(vi.getTimerCount()).toBe(0);
  });
  it("초기화는 두 번 확인하며 취소하면 기록을 보존한다",async()=>{
    seed({coins:100});await mount();
    await click(byLabel("설정"));await click(button("저장 초기화"));
    expect(text()).toContain("정말 초기화");
    await click(button("취소"));expect(getGameData(ID).coins).toBe(100);
    await click(button("저장 초기화"));await click(button("정말 초기화"));
    expect(getGameData(ID).coins).toBe(0);
    expect(getGameData(ID).elapsed).toBe(0);
  });
});
