import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReact } from "../_shared/mount-react.jsx";
import { cardText, solve } from "./engine.js";
import { LEVELS } from "./levels.js";
import PromptFortress from "./PromptFortress.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const KEY = "zepio:v1";
const ID = "prompt-fortress";
let el;
let instance;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label) || b.getAttribute("aria-label")?.includes(label));
const click = (node) => act(async () => node.click());
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const stored = () => JSON.parse(localStorage.getItem(KEY));

async function mount() {
  el = document.createElement("div");
  document.body.append(el);
  instance = mountReact(PromptFortress).mount(el, {});
  await act(async () => {});
}

function unmount() {
  act(() => instance.unmount());
  el.remove();
}

async function playBest(id) {
  const level = LEVELS.find((l) => l.id === id);
  const best = solve(level).solutions.find((rules) => rules.length === level.par);
  for (const card of best) await click(button(cardText(card)));
  await click(button("시험 시작"));
  await click(button("바로 결과 보기"));
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T03:00:00Z"));
  localStorage.clear();
  await mount();
});

afterEach(() => {
  unmount();
  vi.useRealTimers();
});

describe("PromptFortress", () => {
  it("방 목록에서 첫 방만 열려 있고 오늘의 방이 따로 보인다", () => {
    expect(text()).toContain("첫 근무: 직접 요청");
    expect(text()).not.toContain("신분 사칭");
    expect(button("???").disabled).toBe(true);
    expect(el.querySelectorAll('ul[aria-label="방 목록"] li')).toHaveLength(12);
    expect(text()).toContain("오늘의 방 · 2026-10-20");
    expect(text()).toContain("가짜 알림 소동");
  });

  it("카드를 조립해 시험하면 메시지가 하나씩 공개되고 별과 해설이 나온다", async () => {
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
    expect(button("결과 공유하기")).toBeDefined();

    await click(button("다음 방"));
    expect(text()).toContain("신분 사칭");
    expect(text()).toContain("빈 슬롯");
  });

  it("뚫린 시험은 어느 메시지가 왜 실패했는지 보여 주고 다음 방과 공유가 없다", async () => {
    await click(button("첫 근무: 직접 요청"));
    await click(button("첨부 문서 → 지시로 따르지 않는다"));
    await click(button("시험 시작"));
    await click(button("바로 결과 보기"));
    expect(text()).toContain("비밀이 새 나갔어요");
    expect(text()).toContain("아직 뚫려요");
    expect(button("다음 방")).toBeUndefined();
    expect(button("결과 공유하기")).toBeUndefined();
    await click(button("다시 조립"));
    expect(button("시험 시작")).toBeDefined();
  });

  it("방 목록 버튼으로 돌아온다", async () => {
    await click(button("첫 근무: 직접 요청"));
    await click(button("방 목록"));
    expect(text()).toContain("볼트의 요새");
  });
});

describe("저장", () => {
  it("방을 깨면 별이 저장되고 다시 열면 이어서 열려 있다", async () => {
    await click(button("첫 근무: 직접 요청"));
    await playBest("r01");
    expect(stored().games[ID].data.stars).toEqual({ r01: 3 });
    expect(stored().games[ID].plays).toBe(1);

    unmount();
    await mount();
    expect(text()).toContain("신분 사칭");
    expect(button("신분 사칭").disabled).toBe(false);
  });

  it("뚫린 시험만 하면 별이 저장되지 않는다", async () => {
    await click(button("첫 근무: 직접 요청"));
    await click(button("첨부 문서 → 지시로 따르지 않는다"));
    await click(button("시험 시작"));
    await click(button("바로 결과 보기"));
    expect(stored().games[ID].data.stars).toEqual({});
  });

  it("소리 끔 설정이 별과 함께 저장된다", async () => {
    await click(button("첫 근무: 직접 요청"));
    await playBest("r01");
    await click(button("소리"));
    expect(stored().games[ID].data).toEqual({ v: 1, stars: { r01: 3 }, muted: true });
    unmount();
    await mount();
    expect(button("소리").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("오늘의 방", () => {
  it("잠긴 방도 오늘의 방으로 열 수 있고 깨면 일일 기록이 남는다", async () => {
    await click(button("오늘의 방 · 2026-10-20"));
    expect(text()).toContain("오늘의 방 · 방 11");
    await playBest("r11");
    expect(stored().daily[ID].history["2026-10-20"]).toBe(3);

    await click(button("방 목록"));
    expect(text()).toContain("1일 연속");
  });

  it("오늘의 방을 깬 기록은 하루에 한 번만 센다", async () => {
    await click(button("오늘의 방 · 2026-10-20"));
    await playBest("r11");
    await click(button("다시 조립"));
    await click(button("규칙 비우기"));
    await playBest("r11");
    expect(stored().daily[ID].streak).toBe(1);
  });
});