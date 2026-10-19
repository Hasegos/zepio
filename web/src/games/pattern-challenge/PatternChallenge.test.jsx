import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import day from "../../../public/data/daily/2026-10-19.json";
import nextDay from "../../../public/data/daily/2026-10-20.json";
import { mountReact } from "../mount-react.jsx";
import PatternChallenge from "./PatternChallenge.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let el;
let instance;

const text = () => el.textContent;
const button = (label) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(label));
const click = (node) => act(async () => node.click());
const stored = () => JSON.parse(localStorage.getItem("zepio:v1"));

async function mount(fetchImpl) {
  vi.stubGlobal("fetch", fetchImpl);
  await act(async () => {
    instance = mountReact(PatternChallenge).mount(el, { signal: new AbortController().signal });
  });
  await act(async () => {});
}

async function playFive() {
  for (let i = 0; i < 5; i += 1) {
    await click(el.querySelector("button[aria-pressed]"));
    await click(button("정답 제출"));
    await click(button("다음 문제") ?? button("결과 보기"));
  }
}

const serve = () =>
  vi.fn(async (url) =>
    url === "/data/daily/2026-10-19.json" ? { ok: true, json: async () => day } : { ok: false, json: async () => null },
  );

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-19T03:00:00Z"));
  el = document.createElement("div");
  document.body.append(el);
});

afterEach(async () => {
  await act(async () => instance.unmount());
  el.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PatternChallenge 오늘의 도전", () => {
  it("오늘 파일이 있으면 도전 버튼을 보여주고, 마치면 기록하며 일반 최고 기록은 건드리지 않는다", async () => {
    await mount(serve());
    expect(text()).toContain("2026-10-19 · 모두가 같은 5문제");

    await click(button("오늘의 도전 시작하기"));
    expect(text()).toContain("문제 1 / 5");
    await playFive();

    expect(text()).toContain("오늘의 도전 완료");
    expect(text()).toContain("연속 1일 · 최고 1일");
    expect(text()).not.toContain("내 최고 기록");
    expect(button("일반 모드로 한 판 더 하기")).toBeDefined();
    const records = stored();
    expect(records.daily["pattern-challenge"]).toMatchObject({ last: "2026-10-19", streak: 1, max: 1 });
    expect(records.games["pattern-challenge"]).toMatchObject({ plays: 1, data: null });
  });

  it("어제 이어서 했으면 연속 일수가 늘어난다", async () => {
    localStorage.setItem(
      "zepio:v1",
      JSON.stringify({
        v: 1,
        games: {},
        recent: [],
        daily: { "pattern-challenge": { last: "2026-10-18", streak: 2, max: 2, history: {} } },
      }),
    );
    await mount(serve());
    expect(text()).toContain("연속 2일 도전 중");

    await click(button("오늘의 도전 시작하기"));
    await playFive();
    expect(text()).toContain("연속 3일 · 최고 3일");
  });

  it("오늘 이미 했으면 완료 표시만 하고 도전 버튼은 없다", async () => {
    localStorage.setItem(
      "zepio:v1",
      JSON.stringify({
        v: 1,
        games: {},
        recent: [],
        daily: { "pattern-challenge": { last: "2026-10-19", streak: 4, max: 4, history: { "2026-10-19": 3 } } },
      }),
    );
    await mount(serve());
    expect(text()).toContain("오늘 완료 · 정답 3 / 5 · 연속 4일");
    expect(button("오늘의 도전 시작하기")).toBeUndefined();
    expect(button("일반 모드로 시작하기")).toBeDefined();
  });

  it("오늘 파일이 없으면 안내하고 일반 모드는 시작할 수 있다", async () => {
    await mount(vi.fn(async () => ({ ok: false, json: async () => null })));
    expect(text()).toContain("오늘의 도전을 준비하지 못했어요");
    expect(button("오늘의 도전 시작하기")).toBeUndefined();

    await click(button("일반 모드로 시작하기"));
    expect(text()).toContain("문제 1 / 5");
    await playFive();
    expect(text()).toContain("내 최고 기록");
    expect(stored().daily).toEqual({});
  });

  it("자정을 넘겨 열어 둔 화면은 도전 시작 때 새 날짜 문제를 불러온다", async () => {
    vi.setSystemTime(new Date("2026-10-19T14:59:00Z"));
    const files = { "/data/daily/2026-10-19.json": day, "/data/daily/2026-10-20.json": nextDay };
    await mount(vi.fn(async (url) => ({ ok: url in files, json: async () => files[url] })));
    expect(text()).toContain("2026-10-19 · 모두가 같은 5문제");

    vi.setSystemTime(new Date("2026-10-19T15:00:30Z"));
    await click(button("오늘의 도전 시작하기"));
    await act(async () => {});
    expect(text()).toContain("2026-10-20 · 모두가 같은 5문제");
    expect(text()).not.toContain("문제 1 / 5");
  });

  it("저장소에 쓸 수 없으면 결과 화면에서 알려준다", async () => {
    await mount(serve());
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    await click(button("오늘의 도전 시작하기"));
    await playFive();
    expect(text()).toContain("연속 1일 · 최고 1일");
    expect(text()).toContain("기록을 저장할 수 없어서 연속 일수가 남지 않아요");
    vi.restoreAllMocks();
  });
});
