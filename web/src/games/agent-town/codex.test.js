import { describe, expect, it } from "vitest";
import { codexGroups, currentTitle, titlesOf } from "./codex.js";
import { activeGear, isSlotItem, MAX_SLOTS, slotsOf, toggleSlot } from "./party.js";
import { ALL_TASK_IDS } from "./tasks.js";

const base = { seen: {}, party: [], tasksDone: 0, disasters: 0, finished: false };
const ALL_GEAR = { plan: true, grep: true, readRule: true, askRule: true, guard: true, secret: true, autotest: true };

describe("도감", () => {
  it("만나지 못한 의뢰는 이름과 단서를 숨기고, 만난 의뢰는 단서를 보여 준다", () => {
    const groups = codexGroups({ report: true, button: "win" });
    const all = groups.flatMap((g) => g.entries);
    expect(all).toHaveLength(ALL_TASK_IDS.length);
    const report = all.find((e) => e.id === "report");
    expect(report).toMatchObject({ state: "met", name: "분기 매출 보고서" });
    expect(report.tags).toContain("근거 필요");
    expect(all.find((e) => e.id === "button").state).toBe("won");
    expect(all.find((e) => e.id === "typo")).toMatchObject({ state: "locked", name: "???", tags: [] });
  });
});

describe("칭호", () => {
  it("처음에는 신입 에이전트이고 조건을 채우면 더 귀한 칭호로 바뀐다", () => {
    expect(currentTitle(base)).toBe("신입 에이전트");
    const ten = Object.fromEntries(ALL_TASK_IDS.slice(0, 10).map((id) => [id, true]));
    expect(currentTitle({ ...base, seen: ten })).toBe("수집가");
    expect(currentTitle({ ...base, finished: true })).toBe("신뢰받는 에이전트");
    const all = Object.fromEntries(ALL_TASK_IDS.map((id) => [id, true]));
    expect(currentTitle({ ...base, seen: all, finished: true })).toBe("도감 마스터");
  });

  it("팩트체커는 환각 의뢰를 해결해야 얻고, 무사고는 사고가 없어야 얻는다", () => {
    const earned = (s, id) => titlesOf(s).find((t) => t.id === id).earned;
    expect(earned({ ...base, seen: { report: true } }, "checker")).toBe(false);
    expect(earned({ ...base, seen: { report: "win" } }, "checker")).toBe(true);
    expect(earned({ ...base, tasksDone: 8 }, "safe")).toBe(true);
    expect(earned({ ...base, tasksDone: 8, disasters: 1 }, "safe")).toBe(false);
  });
});

describe("장비 슬롯", () => {
  it("규칙과 훅만 슬롯 장비이고 스킬은 항상 쓴다", () => {
    expect(isSlotItem("readRule")).toBe(true);
    expect(isSlotItem("guard")).toBe(true);
    expect(isSlotItem("plan")).toBe(false);
    expect(isSlotItem("nope")).toBe(false);
  });

  it("슬롯 정보가 없는 예전 저장은 산 순서대로 앞의 세 개를 끼운 것으로 본다", () => {
    expect(slotsOf(ALL_GEAR, undefined)).toEqual(["readRule", "askRule", "guard"]);
    expect(slotsOf(ALL_GEAR, ["secret"])).toEqual(["secret"]);
  });

  it("전투에서는 스킬과 끼운 장비만 효과가 난다", () => {
    expect(activeGear(ALL_GEAR, ["secret"])).toEqual({ plan: true, grep: true, secret: true });
    expect(activeGear({ plan: true }, [])).toEqual({ plan: true });
  });

  it("끼우고 빼고, 칸이 차면 못 끼우고, 없는 장비는 못 끼운다", () => {
    let r = toggleSlot(ALL_GEAR, ["readRule", "askRule", "guard"], "secret");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain(String(MAX_SLOTS));
    r = toggleSlot(ALL_GEAR, ["readRule", "askRule", "guard"], "guard");
    expect(r).toMatchObject({ ok: true, equipped: false, slots: ["readRule", "askRule"] });
    r = toggleSlot(ALL_GEAR, r.slots, "secret");
    expect(r).toMatchObject({ ok: true, equipped: true });
    expect(toggleSlot({}, [], "guard").ok).toBe(false);
    expect(toggleSlot(ALL_GEAR, [], "plan").ok).toBe(false);
  });
});