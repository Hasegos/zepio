import {
  advance,
  buyStation,
  buyUpgrade,
  GOAL,
  hireStaff,
  incomePerSecond,
  initialState,
  isUnlocked,
  stationCost,
  STATIONS,
  staffCost,
  tap,
  tapValue,
  UPGRADES,
} from "./economy.js";

/**
 * 살 수 있는 모든 항목을 (가격, 수익 증가량)으로 나열한다. 수익 증가량은 구매 뒤 초당 수익의 변화에
 * 탭 업그레이드는 탭 증가분 × 초당 탭 횟수를 더해 구한다.
 *
 * @param state 진행 상황
 * @param tapsPerSecond 초당 탭 횟수
 * @returns { cost, gain, buy } 목록
 */
function options(state, tapsPerSecond) {
  const income = incomePerSecond(state);
  const tapNow = tapValue(state);
  const make = (cost, next, buy) => ({
    cost,
    gain: incomePerSecond(next) - income + (tapValue(next) - tapNow) * tapsPerSecond,
    buy,
  });
  const list = STATIONS.map((station) => {
    const next = { ...state, levels: { ...state.levels, [station.id]: state.levels[station.id] + 1 } };
    return make(stationCost(station.id, state.levels[station.id]), next, () => buyStation(state, station.id));
  });
  list.push(make(staffCost(state.staff), { ...state, staff: state.staff + 1 }, () => hireStaff(state)));
  for (const upgrade of UPGRADES) {
    if (state.upgrades.includes(upgrade.id) || !isUnlocked(state, upgrade)) continue;
    list.push(make(upgrade.cost, { ...state, upgrades: [...state.upgrades, upgrade.id] }, () => buyUpgrade(state, upgrade.id)));
  }
  return list.filter((option) => option.gain > 0);
}

/**
 * 밸런스 검증용 시뮬레이션. 매초 탭하고 수익을 반영한 뒤, 투자 회수 기간(가격 ÷ 수익 증가량)이 가장 짧은
 * 항목을 살 수 있을 때마다 산다(못 사면 모은다). 앱에서는 쓰지 않고 테스트와 수치 조정에만 쓴다.
 *
 * @param settings.tapsPerSecond 초당 탭 횟수(기본 2)
 * @param settings.tapUntilMs 이 시간(밀리초)까지만 탭하고 이후는 방치(기본 계속)
 * @param settings.stepMs 판단 간격(밀리초, 기본 1000)
 * @param settings.checkInMs 탭을 멈춘 뒤의 판단 간격, 즉 접속 주기(밀리초, 기본 stepMs)
 * @param settings.maxMs 시뮬레이션 최대 시간(밀리초, 기본 12시간)
 * @returns { goalAtMs, events, state } 목표 도달 시각(못 가면 null), 구매 기록 [{ t, kind, id, level }], 마지막 상태
 */
export function simulate({
  tapsPerSecond = 2,
  tapUntilMs = Infinity,
  stepMs = 1000,
  checkInMs = stepMs,
  maxMs = 12 * 3600 * 1000,
} = {}) {
  let state = initialState(0);
  const events = [];
  let t = 0;
  while (t < maxMs) {
    const step = t < tapUntilMs ? stepMs : checkInMs;
    t += step;
    state = advance(state, t).state;
    if (t <= tapUntilMs) state = tap(state, t, (tapsPerSecond * step) / 1000);
    for (;;) {
      const best = options(state, t <= tapUntilMs ? tapsPerSecond : 0).sort(
        (a, b) => a.cost / a.gain - b.cost / b.gain,
      )[0];
      if (!best || state.coins < best.cost) break;
      const before = state;
      state = best.buy();
      const kind = state.staff !== before.staff ? "staff" : state.upgrades.length !== before.upgrades.length ? "upgrade" : "station";
      const id =
        kind === "staff"
          ? "barista"
          : kind === "upgrade"
            ? state.upgrades.at(-1)
            : STATIONS.find((s) => state.levels[s.id] !== before.levels[s.id]).id;
      events.push({ t, kind, id, level: kind === "station" ? state.levels[id] : kind === "staff" ? state.staff : 1 });
    }
    if (state.total >= GOAL) return { goalAtMs: t, events, state };
  }
  return { goalAtMs: null, events, state };
}

/**
 * 구매 기록에서 처음 조건을 만족한 시각을 찾는다.
 *
 * @param events simulate가 돌려준 구매 기록
 * @param kind station, staff, upgrade
 * @param id 항목 id
 * @returns 시각(밀리초), 없으면 null
 */
export function firstAt(events, kind, id) {
  return events.find((e) => e.kind === kind && e.id === id)?.t ?? null;
}