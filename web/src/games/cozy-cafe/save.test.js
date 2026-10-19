import { describe, expect, it } from "vitest";
import { GOAL, initialState } from "./economy.js";
import { parseSave } from "./save.js";
import { initialSimulation, stepSimulation } from "./simulation.js";

const NOW = 1_000_000;
const good = () => ({
  ...initialState(500_000),
  coins: 120,
  total: 900,
  levels: { espresso: 3, oven: 1, terrace: 0, beans: 0, marketing: 0 },
  staff: 2,
  upgrades: ["touch"],
  lastAt: 900_000,
});

describe("parseSave", () => {
  it("운영 상태를 가진 저장은 제조 중 주문까지 복구한다", () => {
    const data = good();
    const sim = stepSimulation(initialSimulation(data), data, 6000).sim;
    expect(parseSave({ ...data, service: sim }, NOW).service.guests).toEqual(sim.guests);
  });
  it("운영 상태만 깨져도 코인과 설비는 유지한다", () => {
    const data = good();
    const parsed = parseSave({ ...data, service: { v: 1, guests: "broken" } }, NOW);
    expect(parsed.coins).toBe(data.coins);
    expect(parsed.levels).toEqual(data.levels);
    expect(parsed.service.guests).toEqual([]);
  });
  it("정상 데이터는 그대로 읽는다", () => {
    expect(parseSave(good(), NOW)).toEqual(good());
  });

  it("없거나 객체가 아니거나 버전이 다르면 새 카페로 시작한다", () => {
    for (const bad of [null, undefined, "x", 5, [], { v: 2 }, {}]) {
      expect(parseSave(bad, NOW)).toEqual(initialState(NOW));
    }
  });

  it("깨진 숫자(NaN, 음수, 문자열, Infinity)는 0으로 걸러낸다", () => {
    const data = { ...good(), coins: NaN, total: "9", staff: -3, levels: { espresso: Infinity, oven: -1, terrace: "2" } };
    const state = parseSave(data, NOW);
    expect(state.coins).toBe(0);
    expect(state.total).toBe(0);
    expect(state.staff).toBe(0);
    expect(state.levels).toEqual({ espresso: 0, oven: 0, terrace: 0, beans: 0, marketing: 0 });
  });

  it("너무 큰 값은 상한으로 줄이고 소수 레벨은 내림한다", () => {
    const state = parseSave({ ...good(), coins: 1e308, total: 1e308, levels: { espresso: 2.9 }, staff: 5.5 }, NOW);
    expect(state.coins).toBe(1e18);
    expect(state.total).toBe(1e18);
    expect(state.levels.espresso).toBe(2);
    expect(state.staff).toBe(5);
  });

  it("누적 수익이 코인보다 작으면 코인으로 올린다", () => {
    expect(parseSave({ ...good(), coins: 500, total: 100 }, NOW).total).toBe(500);
  });

  it("알 수 없는 업그레이드는 버리고 중복은 한 번만 남긴다", () => {
    const state = parseSave({ ...good(), upgrades: ["touch", "touch", "hack", 7, "efficiency"] }, NOW);
    expect(state.upgrades).toEqual(["touch", "efficiency"]);
    expect(parseSave({ ...good(), upgrades: "touch" }, NOW).upgrades).toEqual([]);
  });

  it("미래나 잘못된 마지막 시각은 지금으로 보정해 수익이 한꺼번에 지급되지 않게 한다", () => {
    for (const lastAt of [NOW + 10 * 3600_000, NaN, -5, "x", undefined]) {
      expect(parseSave({ ...good(), lastAt }, NOW).lastAt).toBe(NOW);
    }
    expect(parseSave({ ...good(), lastAt: 700_000 }, NOW).lastAt).toBe(700_000);
  });

  it("시작 시각이 마지막 시각보다 늦으면 마지막 시각으로 맞춘다", () => {
    expect(parseSave({ ...good(), startedAt: 950_000 }, NOW).startedAt).toBe(900_000);
  });

  it("목표 도달 시각은 누적 수익이 목표 이상일 때만 남긴다", () => {
    expect(parseSave({ ...good(), total: GOAL, goalAt: 600_000 }, NOW).goalAt).toBe(600_000);
    expect(parseSave({ ...good(), total: GOAL, goalAt: NaN }, NOW).goalAt).toBe(NOW);
    expect(parseSave({ ...good(), total: 10, goalAt: 600_000 }, NOW).goalAt).toBe(0);
  });
});
