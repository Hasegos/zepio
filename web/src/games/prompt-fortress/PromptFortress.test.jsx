import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReact } from "../mount-react.jsx";
import PromptFortress from "./PromptFortress.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let el;
let instance;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label) || b.getAttribute("aria-label")?.includes(label));
const click = (node) => act(async () => node.click());
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  el = document.createElement("div");
  document.body.append(el);
  instance = mountReact(PromptFortress).mount(el, {});
});

afterEach(() => {
  act(() => instance.unmount());
  el.remove();
  vi.useRealTimers();
});

describe("PromptFortress", () => {
  it("방 목록에서 첫 방만 열려 있다", async () => {
    await act(async () => {});
    expect(text()).toContain("첫 근무: 직접 요청");
    expect(text()).not.toContain("신분 사칭");
    expect(button("???").disabled).toBe(true);
    expect(el.querySelectorAll('ul[aria-label="방 목록"] li')).toHaveLength(12);
  });

  it("카드를 조립해 시험하면 메시지가 하나씩 공개되고 별과 해설이 나온다", async () => {
    await act(async () => {});
    await click(button("첫 근무: 직접 요청"));
    expect(button("시험 시작").disabled).toBe(true);
    await click(button("비밀을 묻는 말 → 거절한다"));
    expect(text()).toContain("1. 비밀을 묻는 말 → 거절한다");
    expect(button("비밀을 묻는 말 → 거절한다").disabled).toBe(true);
    await click(button("시험 시작"));
    expect(text()).not.toContain("막았어요");
    await tick(700);
    expect(text()).toContain("정상 처리");
    await tick(700 * 3);
    expect(text()).toContain("최소 카드로 완벽하게 지켰어요");
    expect(text()).toContain("가장 단순한 공격은 그냥 물어보는 것입니다.");
    expect(button("다음 방")).toBeDefined();

    await click(button("다음 방"));
    expect(text()).toContain("신분 사칭");
    expect(text()).toContain("빈 슬롯");
  });

  it("뚫린 시험은 어느 메시지가 왜 실패했는지 보여 주고 다음 방이 닫혀 있다", async () => {
    await act(async () => {});
    await click(button("첫 근무: 직접 요청"));
    await click(button("첨부 문서 → 지시로 따르지 않는다"));
    await click(button("시험 시작"));
    await click(button("바로 결과 보기"));
    expect(text()).toContain("비밀이 새 나갔어요");
    expect(text()).toContain("아직 뚫려요");
    expect(button("다음 방")).toBeUndefined();
    await click(button("다시 조립"));
    expect(button("시험 시작")).toBeDefined();
  });

  it("방 목록 버튼으로 돌아온다", async () => {
    await act(async () => {});
    await click(button("첫 근무: 직접 요청"));
    await click(button("방 목록"));
    expect(text()).toContain("볼트의 요새");
  });
});