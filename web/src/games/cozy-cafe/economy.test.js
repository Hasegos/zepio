import { describe, expect, it } from "vitest";
import {
  advance,
  buyStation,
  buyUpgrade,
  GOAL,
  hireStaff,
  incomePerSecond,
  initialState,
  isUnlocked,
  OFFLINE_CAP_MS,
  stage,
  stationCost,
  STATIONS,
  staffCost,
  tap,
  tapValue,
  UPGRADES,
  operatingProfile,
  settleSales,
} from "./economy.js";
import { firstAt, simulate } from "./simulate.js";

const T0 = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 3_600_000;
const withState = (patch) => ({ ...initialState(T0), ...patch });

describe("영업 경제 연결", () => {
  it("설비와 직원은 제조 속도, 좌석, 고객 도착과 단가에 반영된다", () => {
    const first = operatingProfile(initialState(T0));
    const grown = operatingProfile(withState({ levels: { espresso: 10, oven: 5, terrace: 3, beans: 2, marketing: 2 }, staff: 5 }));
    expect(grown.coffeeMs).toBeLessThan(first.coffeeMs);
    expect(grown.breadMs).toBeLessThan(first.breadMs);
    expect(grown.arrivalMs).toBeLessThan(first.arrivalMs);
    expect(grown.seats).toBe(4);
    expect(grown.workers).toBe(4);
    expect(grown.price).toBeGreaterThan(first.price);
    expect(operatingProfile(withState({ upgrades: ["efficiency"] })).price).toBeGreaterThan(first.price);
  });
  it("주문 매출만큼 총액이 오르고 잘못된 매출은 무시한다", () => {
    const state = initialState(T0);
    expect(settleSales(state, 8, T0)).toMatchObject({ coins: 8, total: 8 });
    for (const bad of [NaN, Infinity, -10, 0]) expect(settleSales(state, bad, T0)).toBe(state);
  });
});

describe("가격과 수익", () => {
  it("설비 가격은 레벨마다 오르고 정수다", () => {
    for (const { id } of STATIONS) {
      let prev = 0;
      for (let level = 0; level < 30; level += 1) {
        const cost = stationCost(id, level);
        expect(Number.isInteger(cost)).toBe(true);
        expect(cost).toBeGreaterThan(prev);
        prev = cost;
      }
    }
  });

  it("직원 고용 비용은 인원이 늘수록 오른다", () => {
    for (let n = 0; n < 30; n += 1) expect(staffCost(n + 1)).toBeGreaterThan(staffCost(n));
  });

  it("처음에는 수익이 없고 탭은 1코인이다", () => {
    const state = initialState(T0);
    expect(incomePerSecond(state)).toBe(0);
    expect(tapValue(state)).toBe(1);
  });

  it("설비와 직원이 늘면 초당 수익이 늘고, 직원은 자동 수익에 기여한다", () => {
    const base = withState({ coins: 1e6 });
    const withStation = buyStation(base, "espresso");
    const withHire = hireStaff(base);
    expect(incomePerSecond(withStation)).toBeGreaterThan(0);
    expect(incomePerSecond(withHire)).toBeGreaterThan(0);
  });

  it("업그레이드 효과가 배수로 반영된다", () => {
    const base = withState({ levels: { ...initialState(T0).levels, espresso: 10, oven: 10 }, staff: 4 });
    const income = incomePerSecond(base);
    const find = (id) => UPGRADES.find((u) => u.id === id);
    expect(tapValue({ ...base, upgrades: ["touch"] })).toBe(2);
    expect(incomePerSecond({ ...base, upgrades: ["efficiency"] })).toBeCloseTo(income * 1.25, 8);
    const staffOnly = { ...base, levels: initialState(T0).levels };
    expect(incomePerSecond({ ...staffOnly, upgrades: ["regulars"] })).toBeCloseTo(incomePerSecond(staffOnly) * 2, 8);
    const blended = incomePerSecond({ ...base, staff: 0, upgrades: ["blend"] });
    expect(blended).toBeCloseTo(incomePerSecond({ ...base, staff: 0 }) * find("blend").effect.value, 8);
  });
});

describe("구매", () => {
  it("코인이 모자라면 같은 상태를 돌려준다", () => {
    const state = withState({ coins: 1 });
    expect(buyStation(state, "espresso")).toBe(state);
    expect(hireStaff(state)).toBe(state);
    expect(buyUpgrade(state, "touch")).toBe(state);
  });

  it("업그레이드는 누적 수익이 기준에 이르러야 열린다", () => {
    const upgrade = UPGRADES.find((u) => u.id === "efficiency");
    expect(isUnlocked(withState({ total: upgrade.unlockAt - 1 }), upgrade)).toBe(false);
    expect(isUnlocked(withState({ total: upgrade.unlockAt }), upgrade)).toBe(true);
  });
});

describe("시간 경과", () => {
  const earning = () => withState({ levels: { ...initialState(T0).levels, espresso: 10 } });

  it("지난 시간만큼 번다", () => {
    const { state, earned, elapsed } = advance(earning(), T0 + 10_000);
    expect(earned).toBeCloseTo(50, 8);
    expect(elapsed).toBe(10_000);
    expect(state.coins).toBeCloseTo(50, 8);
    expect(state.total).toBeCloseTo(50, 8);
    expect(state.lastAt).toBe(T0 + 10_000);
  });

  it("자리를 비운 시간은 8시간까지만 센다", () => {
    const { earned, elapsed } = advance(earning(), T0 + 100 * HOUR);
    expect(elapsed).toBe(OFFLINE_CAP_MS);
    expect(earned).toBeCloseTo(5 * 8 * 3600, 6);
  });

  it("같은 시각으로 두 번 반영해도 더 벌지 않는다", () => {
    const once = advance(earning(), T0 + 5 * MIN).state;
    const twice = advance(once, T0 + 5 * MIN);
    expect(twice.earned).toBe(0);
    expect(twice.state.coins).toBe(once.coins);
  });

  it("시계가 거꾸로 가면 벌지 않고 기준 시각을 옮긴다", () => {
    const { state, earned } = advance(earning(), T0 - HOUR);
    expect(earned).toBe(0);
    expect(state.lastAt).toBe(T0 - HOUR);
  });

  it("수익이 없을 때도 안전하다", () => {
    const { state, earned } = advance(initialState(T0), T0 + HOUR);
    expect(earned).toBe(0);
    expect(state.coins).toBe(0);
  });

  it("누적 수익이 목표에 처음 이르는 순간 시각이 기록되고 이후 바뀌지 않는다", () => {
    const near = withState({ total: GOAL - 0.5 });
    const first = tap(near, T0 + 1);
    expect(first.goalAt).toBe(T0 + 1);
    expect(tap(first, T0 + 99).goalAt).toBe(T0 + 1);
  });
});

describe("성장 단계", () => {
  it("오븐, 직원, 테라스, 브랜드 마케팅을 갖출 때마다 한 단계씩 오른다", () => {
    const levels = initialState(T0).levels;
    expect(stage(withState({}))).toBe(1);
    expect(stage(withState({ levels: { ...levels, oven: 1 } }))).toBe(2);
    expect(stage(withState({ levels: { ...levels, oven: 1 }, staff: 1 }))).toBe(3);
    expect(stage(withState({ levels: { ...levels, oven: 1, terrace: 1 }, staff: 1 }))).toBe(4);
    expect(stage(withState({ levels: { ...levels, oven: 1, terrace: 1, marketing: 1 }, staff: 1 }))).toBe(5);
    expect(stage(withState({ goalAt: T0 }))).toBe(2);
  });

  it("순서와 상관없이 갖춘 개수로 결정되고 5를 넘지 않는다", () => {
    const levels = { espresso: 9, oven: 9, terrace: 9, beans: 9, marketing: 9 };
    expect(stage(withState({ levels, staff: 9, goalAt: T0 }))).toBe(5);
  });
});

describe("경제 밸런스 시뮬레이션 (살 수 있을 때 투자 회수가 가장 빠른 것을 사는 봇)", () => {
  const active = simulate({ stepMs: 2000 });
  const casual = simulate({ tapUntilMs: 10 * MIN, stepMs: 2000, checkInMs: 30 * MIN });
  const rare = simulate({ tapUntilMs: 2 * MIN, stepMs: 2000, checkInMs: 4 * HOUR, maxMs: 48 * HOUR });

  it("30초 안에 첫 설비를 산다", () => {
    expect(active.events[0].t).toBeLessThanOrEqual(30_000);
    expect(active.events[0].kind).toBe("station");
  });

  it("3분 안에 베이커리 오븐을 산다(2단계)", () => {
    expect(firstAt(active.events, "station", "oven")).toBeLessThanOrEqual(3 * MIN);
  });

  it("5분 안에 첫 직원을 고용한다(3단계)", () => {
    expect(firstAt(active.events, "staff", "barista")).toBeLessThanOrEqual(5 * MIN);
  });

  it("10분 안에 테라스 좌석을 산다(4단계)", () => {
    expect(firstAt(active.events, "station", "terrace")).toBeLessThanOrEqual(10 * MIN);
  });

  it("브랜드 마케팅은 목표 달성 전에 사며 그 뒤가 5단계다", () => {
    const at = firstAt(active.events, "station", "marketing");
    expect(at).not.toBeNull();
    expect(at).toBeLessThan(active.goalAtMs);
    expect(at).toBeGreaterThan(10 * MIN);
  });

  it("계속 하면 1시간에서 4시간 사이에 목표(체인점 오픈)에 이른다", () => {
    expect(active.goalAtMs).toBeGreaterThanOrEqual(HOUR);
    expect(active.goalAtMs).toBeLessThanOrEqual(4 * HOUR);
  });

  it("10분 하고 30분마다 접속해도 1시간에서 4시간 사이에 이른다", () => {
    expect(casual.goalAtMs).toBeGreaterThanOrEqual(HOUR);
    expect(casual.goalAtMs).toBeLessThanOrEqual(4 * HOUR);
  });

  it("2분만 하고 4시간마다 접속해도 하루 안에 이른다", () => {
    expect(rare.goalAtMs).not.toBeNull();
    expect(rare.goalAtMs).toBeLessThanOrEqual(24 * HOUR);
  });

  it("직원과 모든 설비, 업그레이드가 실제로 쓰인다(죽은 항목이 없다)", () => {
    const kinds = new Set(active.events.map((e) => `${e.kind}:${e.id}`));
    for (const station of STATIONS) expect(kinds.has(`station:${station.id}`)).toBe(true);
    expect(kinds.has("staff:barista")).toBe(true);
    for (const upgrade of UPGRADES) expect(kinds.has(`upgrade:${upgrade.id}`)).toBe(true);
  });
});
