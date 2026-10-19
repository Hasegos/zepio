import { describe, expect, it } from "vitest";
import { GOAL, incomePerSecond, OFFLINE_CAP_MS, stationCost } from "./economy.js";
import { AWAY_MIN_MS, initialState, reducer } from "./reducer.js";

const T0 = 1_700_000_000_000;
const rich = (coins = 1_000_000) => {
  const state = initialState(T0);
  return { ...state, econ: { ...state.econ, coins, total: coins } };
};
const run = (state, ...actions) => actions.reduce(reducer, state);

describe("탭과 구매", () => {
  it("빈 카페에서 돕기를 눌러도 코인을 지급하지 않는다", () => {
    const state = run(initialState(T0), { type: "tap", now: T0 }, { type: "tap", now: T0 });
    expect(state.econ).toMatchObject({ coins: 0, total: 0 });
  });

  it("설비를 사면 코인이 줄고 레벨이 오르며 다음 가격은 더 비싸다", () => {
    const state = run(rich(), { type: "station", id: "espresso", now: T0 }, { type: "station", id: "espresso", now: T0 });
    expect(state.econ.levels.espresso).toBe(2);
    expect(state.econ.coins).toBe(1_000_000 - stationCost("espresso", 0) - stationCost("espresso", 1));
    expect(stationCost("espresso", 2)).toBeGreaterThan(stationCost("espresso", 1));
    expect(state.notice).toBe("에스프레소 머신 2레벨");
  });

  it("코인이 모자라면 사지 못하고 안내만 남긴다", () => {
    const poor = initialState(T0);
    const next = run(poor, { type: "station", id: "espresso", now: T0 });
    expect(next.econ.levels.espresso).toBe(0);
    expect(next.econ.coins).toBe(0);
    expect(next.notice).toBe("코인이 모자라요");
    expect(next.noticeId).toBe(poor.noticeId + 1);
  });

  it("직원을 고용하면 자동 수익이 늘고 다음 고용 비용이 오른다", () => {
    const before = rich().econ;
    const one = run(rich(), { type: "hire", now: T0 });
    expect(one.econ.staff).toBe(1);
    expect(incomePerSecond(one.econ)).toBeGreaterThan(incomePerSecond(before));
    const cost1 = before.coins - one.econ.coins;
    const two = run(one, { type: "hire", now: T0 });
    expect(one.econ.coins - two.econ.coins).toBeGreaterThan(cost1);
  });

  it("업그레이드는 한 번만 살 수 있고 열리기 전에는 살 수 없다", () => {
    const early = initialState(T0);
    const locked = { ...early, econ: { ...early.econ, coins: 20_000_000, total: 0 } };
    expect(run(locked, { type: "upgrade", id: "headquarters", now: T0 }).econ.upgrades).toEqual([]);
    const opened = { ...early, econ: { ...early.econ, coins: 20_000_000, total: 2_000_000 } };
    const twice = run(opened, { type: "upgrade", id: "headquarters", now: T0 }, { type: "upgrade", id: "headquarters", now: T0 });
    expect(twice.econ.upgrades).toEqual(["headquarters"]);
    expect(twice.econ.coins).toBe(12_000_000);
  });

  it("알 수 없는 설비나 업그레이드 id는 무시한다", () => {
    const state = rich();
    expect(run(state, { type: "station", id: "nope", now: T0 }).econ.coins).toBe(state.econ.coins);
    expect(run(state, { type: "upgrade", id: "nope", now: T0 }).econ.upgrades).toEqual([]);
  });
});

describe("시간 경과와 중복 지급", () => {
  const earning = () => {
    const state = run(rich(), { type: "station", id: "espresso", now: T0 });
    return { ...state, econ: { ...state.econ, coins: 0, total: 0 } };
  };

  it("틱은 지난 시간만큼만 벌고, 같은 시각에 다시 틱해도 더 벌지 않는다", () => {
    const first = run(earning(), { type: "tick", now: T0 + 10_000 });
    expect(first.econ.coins).toBeGreaterThan(0);
    expect(first.econ.coins).toBe(first.sim.revenue);
    const again = run(first, { type: "tick", now: T0 + 10_000 });
    expect(again.econ.coins).toBe(first.econ.coins);
  });

  it("작은 틱 여러 번과 큰 틱 한 번이 같은 수익이다", () => {
    let small = earning();
    for (let t = 1; t <= 100; t += 1) small = run(small, { type: "tick", now: T0 + t * 100 });
    const big = run(earning(), { type: "tick", now: T0 + 10_000 });
    expect(small.econ.coins).toBeCloseTo(big.econ.coins, 6);
  });

  it("오래 비우면 안내를 띄우고 8시간까지만 지급한다", () => {
    const state = earning();
    const rate = incomePerSecond(state.econ);
    const away = run(state, { type: "tick", now: T0 + 30 * 3600_000 });
    expect(away.away).toEqual({ earned: rate * (OFFLINE_CAP_MS / 1000), ms: OFFLINE_CAP_MS });
    expect(away.econ.coins).toBeCloseTo(rate * (OFFLINE_CAP_MS / 1000), 3);
  });

  it("짧은 틱에서는 자리 비움 안내가 뜨지 않는다", () => {
    const state = run(earning(), { type: "tick", now: T0 + AWAY_MIN_MS - 1 });
    expect(state.away).toBeNull();
    expect(run(earning(), { type: "tick", now: T0 + AWAY_MIN_MS }).away).not.toBeNull();
  });

  it("안내를 닫으면 사라지고 코인은 그대로다", () => {
    const away = run(earning(), { type: "tick", now: T0 + 3600_000 });
    const closed = run(away, { type: "dismissAway", now: T0 });
    expect(closed.away).toBeNull();
    expect(closed.econ).toEqual(away.econ);
  });

  it("시계가 거꾸로 가면 지급 없이 기준만 옮기고, 그 뒤 정상적으로 이어진다", () => {
    const state = run(earning(), { type: "tick", now: T0 + 10_000 });
    const back = run(state, { type: "tick", now: T0 });
    expect(back.econ.coins).toBe(state.econ.coins);
    expect(back.econ.lastAt).toBe(T0);
    expect(run(back, { type: "tick", now: T0 + 2000 }).econ.coins).toBeGreaterThanOrEqual(state.econ.coins);
  });
});

describe("저장 데이터 불러오기", () => {
  const saved = (lastAt, coins = 0) => ({
    ...rich(0).econ,
    levels: { espresso: 10, oven: 0, terrace: 0, beans: 0, marketing: 0 },
    coins,
    total: coins,
    lastAt,
  });

  it("저장 시각부터 지금까지를 한 번만 지급하고 자리 비움 안내를 띄운다", () => {
    const hour = 3600_000;
    const state = run(initialState(0), { type: "load", data: saved(T0 - hour), now: T0 });
    expect(state.econ.coins).toBeCloseTo(5 * 3600, 3);
    expect(state.away).toMatchObject({ ms: hour });
    expect(state.econ.lastAt).toBe(T0);
  });

  it("같은 저장 데이터를 같은 시각에 두 번 불러와도 결과가 같다", () => {
    const data = saved(T0 - 3600_000);
    const a = run(initialState(0), { type: "load", data, now: T0 });
    const b = run(initialState(0), { type: "load", data, now: T0 });
    expect(a.econ).toEqual(b.econ);
  });

  it("불러온 직후 저장하고 다시 불러와도 같은 시간이 또 지급되지 않는다", () => {
    const first = run(initialState(0), { type: "load", data: saved(T0 - 3600_000), now: T0 });
    const second = run(initialState(0), { type: "load", data: JSON.parse(JSON.stringify(first.econ)), now: T0 });
    expect(second.econ.coins).toBeCloseTo(first.econ.coins, 6);
    expect(second.away).toBeNull();
  });

  it("저장 시각이 미래이면 지금으로 보정해 지급하지 않는다", () => {
    const state = run(initialState(0), { type: "load", data: saved(T0 + 10 * 3600_000, 100), now: T0 });
    expect(state.econ.coins).toBe(100);
    expect(state.away).toBeNull();
  });

  it("깨진 저장 데이터는 새 카페로 시작한다", () => {
    const state = run(initialState(0), { type: "load", data: "garbage", now: T0 });
    expect(state.econ.coins).toBe(0);
    expect(state.econ.startedAt).toBe(T0);
  });

  it("목표에 이르면 목표 카드가 한 번 열리고 닫을 수 있다", () => {
    const near = { ...rich(0), econ: { ...rich(0).econ, total: GOAL - 1, coins: 0 } };
    const reached = run(near, { type: "tick", now: T0 + 20000 });
    expect(reached.econ.goalAt).toBe(T0 + 20000);
    expect(reached.goalOpen).toBe(true);
    const closed = run(reached, { type: "closeGoal", now: T0 + 20000 }, { type: "tick", now: T0 + 21000 });
    expect(closed.goalOpen).toBe(false);
    expect(closed.econ.goalAt).toBe(T0 + 20000);
  });

  it("자리를 비운 동안 목표에 이르러도 목표 카드가 열린다", () => {
    const data = { ...saved(T0 - 3600_000), total: GOAL - 10, coins: 0 };
    const state = run(initialState(0), { type: "load", data, now: T0 });
    expect(state.econ.goalAt).toBe(T0);
    expect(state.goalOpen).toBe(true);
  });

  it("초기화하면 새 카페가 된다", () => {
    const state = run(rich(), { type: "reset", now: T0 + 5 });
    expect(state.econ.coins).toBe(0);
    expect(state.econ.startedAt).toBe(T0 + 5);
  });
});
