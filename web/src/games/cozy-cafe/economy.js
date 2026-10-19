/** 자리를 비운 동안 계산하는 최대 시간(밀리초) */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
/** 누적 수익이 이 값에 이르면 체인점 오픈(목표 달성) */
export const GOAL = 100_000_000;
/** 설비 가격이 레벨마다 오르는 배율 */
export const GROWTH = 1.15;

/** 설비. 가격은 baseCost × GROWTH^레벨, 수익은 레벨 × baseIncome(코인/초) */
export const STATIONS = [
  { id: "espresso", name: "골목 카페", baseCost: 20, baseIncome: 1 },
  { id: "oven", name: "햇살 빵집", baseCost: 180, baseIncome: 4 },
  { id: "terrace", name: "초록 정원", baseCost: 1800, baseIncome: 30 },
  { id: "beans", name: "언덕 로스터리", baseCost: 15000, baseIncome: 250 },
  { id: "marketing", name: "별빛 상점 거리", baseCost: 120000, baseIncome: 2000 },
];

/** 직원(바리스타). 고용할 때마다 자동 수익이 늘고 다음 고용 비용은 growth배로 오른다 */
export const STAFF = { id: "barista", name: "마을 매니저", baseCost: 150, growth: 1.3, income: 2 };

/**
 * 한 번만 살 수 있는 영구 업그레이드. effect.type은
 * tap(탭 수익 배수), all(전체 수익 배수), stations(targets 설비 수익 배수), staff(직원 수익 배수)이다.
 * unlockAt은 누적 수익이 이 값 이상이 되면 구매 목록에 나타나는 기준이다.
 */
export const UPGRADES = [
  { id: "touch", name: "바리스타의 손길", desc: "마을 응원 보너스 2배", cost: 500, unlockAt: 100, effect: { type: "tap", value: 2 } },
  { id: "efficiency", name: "효율적인 운영", desc: "전체 수익 +25%", cost: 6000, unlockAt: 1000, effect: { type: "all", value: 1.25 } },
  {
    id: "blend",
    name: "프리미엄 원두 블렌드",
    desc: "에스프레소와 베이커리 수익 2배",
    cost: 40000,
    unlockAt: 8000,
    effect: { type: "stations", targets: ["espresso", "oven"], value: 2 },
  },
  { id: "regulars", name: "단골 손님", desc: "직원 수익 2배", cost: 150000, unlockAt: 30000, effect: { type: "staff", value: 2 } },
  { id: "headquarters", name: "본사 지원", desc: "전체 수익 +50%", cost: 8000000, unlockAt: 1500000, effect: { type: "all", value: 1.5 } },
];

const STATION_IDS = STATIONS.map((station) => station.id);

/**
 * 새 카페의 진행 상황을 만든다.
 *
 * @param now 시작 시각(밀리초)
 * @returns 진행 상황
 */
export function initialState(now) {
  return {
    v: 1,
    coins: 0,
    total: 0,
    levels: Object.fromEntries(STATION_IDS.map((id) => [id, id === "espresso" ? 1 : 0])),
    managers: {},
    townVersion: 1,
    lastCheer: 0,
    staff: 0,
    upgrades: [],
    lastAt: now,
    startedAt: now,
    goalAt: 0,
  };
}

/**
 * 설비를 한 레벨 더 올리는 가격을 구한다.
 *
 * @param id 설비 id
 * @param level 지금 레벨
 * @returns 코인
 */
export function stationCost(id, level) {
  const station = STATIONS.find((s) => s.id === id);
  return Math.ceil(station.baseCost * GROWTH ** level);
}

/**
 * 직원 한 명을 더 고용하는 비용을 구한다.
 *
 * @param count 지금 직원 수
 * @returns 코인
 */
export function staffCost(count) {
  return Math.ceil(STAFF.baseCost * STAFF.growth ** count);
}

/**
 * 산 업그레이드의 효과를 모아 배수로 돌려준다.
 *
 * @param state 진행 상황
 * @param type 효과 종류(tap, all, staff)
 * @returns 곱해질 배수
 */
function multiplier(state, type) {
  return UPGRADES.filter((u) => state.upgrades.includes(u.id) && u.effect.type === type).reduce(
    (product, u) => product * u.effect.value,
    1,
  );
}

/**
 * 설비 하나의 지금 초당 수익을 구한다.
 *
 * @param state 진행 상황
 * @param station 설비 정의
 * @returns 코인/초
 */
function stationIncome(state, station) {
  const boost = UPGRADES.filter(
    (u) => state.upgrades.includes(u.id) && u.effect.type === "stations" && u.effect.targets.includes(station.id),
  ).reduce((product, u) => product * u.effect.value, 1);
  return state.levels[station.id] * station.baseIncome * boost * (state.managers?.[station.id] ? 2 : 1);
}

/**
 * 건물 생산과 매니저 수익을 합산한다. 온라인과 오프라인에 같은 공식을 쓴다.
 *
 * @param state 진행 상황
 * @returns 코인/초
 */
export function incomePerSecond(state) {
  const stations = STATIONS.reduce((sum, station) => sum + stationIncome(state, station), 0);
  const staff = state.staff * STAFF.income * multiplier(state, "staff");
  return (stations + staff) * multiplier(state, "all");
}

/**
 * 커피 내리기 한 번의 수익을 구한다.
 *
 * @param state 진행 상황
 * @returns 코인
 */
export function tapValue(state) {
  return multiplier(state, "tap");
}

/**
 * 코인을 벌어 누적한다. 목표에 처음 이르면 goalAt을 기록한다.
 *
 * @param state 진행 상황
 * @param amount 번 코인
 * @param now 현재 시각
 * @returns 새 진행 상황
 */
function earn(state, amount, now) {
  const total = state.total + amount;
  return { ...state, coins: state.coins + amount, total, goalAt: state.goalAt || (total >= GOAL ? now : 0) };
}

/** 검증한 마을 응원 보너스를 정산한다. */
export function settleSales(state, amount, now) {
  return amount > 0 && Number.isFinite(amount) ? earn(state, amount, now) : state;
}

/**
 * 지난 시간의 자동 생산을 온라인과 오프라인에서 동일하게 정산한다.
 * 지난 시간은 마지막 계산 시각(lastAt)부터이고 OFFLINE_CAP_MS까지만 센다. 시계가 거꾸로 갔으면 지급 없이 기준만 옮긴다.
 *
 * @param state 진행 상황
 * @param now 현재 시각(밀리초)
 * @returns { state, earned, elapsed } 새 진행 상황, 번 코인, 계산한 시간(밀리초)
 */
export function advance(state, now) {
  const elapsed = Math.min(Math.max(0, now - state.lastAt), OFFLINE_CAP_MS);
  const earned = (incomePerSecond(state) * elapsed) / 1000;
  return { state: { ...earn(state, earned, now), lastAt: now }, earned, elapsed };
}

/**
 * 기존 밸런스 도구의 탭 수익을 계산한다. 실제 화면은 재사용 제한이 있는 마을 응원을 쓴다.
 *
 * @param state 진행 상황
 * @param now 현재 시각
 * @param count 누른 횟수(밀리초 단위 시뮬레이션용, 기본 1)
 * @returns 새 진행 상황
 */
export function tap(state, now, count = 1) {
  return earn(state, tapValue(state) * count, now);
}

/**
 * 설비를 한 레벨 산다. 코인이 모자라면 같은 상태를 돌려준다.
 *
 * @param state 진행 상황
 * @param id 설비 id
 * @returns 새 진행 상황
 */
export function buyStation(state, id) {
  if (!STATION_IDS.includes(id)) return state;
  const cost = stationCost(id, state.levels[id]);
  if (state.coins < cost || !plotUnlocked(state, id)) return state;
  return { ...state, coins: state.coins - cost, levels: { ...state.levels, [id]: state.levels[id] + 1 } };
}

/**
 * 직원을 한 명 고용한다. 코인이 모자라면 같은 상태를 돌려준다.
 *
 * @param state 진행 상황
 * @returns 새 진행 상황
 */
export function hireStaff(state) {
  const cost = staffCost(state.staff);
  if (state.coins < cost) return state;
  return { ...state, coins: state.coins - cost, staff: state.staff + 1 };
}

/**
 * 업그레이드가 구매 목록에 열렸는지 확인한다.
 *
 * @param state 진행 상황
 * @param upgrade 업그레이드 정의
 * @returns 열렸으면 true
 */
export function isUnlocked(state, upgrade) {
  return state.total >= upgrade.unlockAt;
}

/**
 * 업그레이드를 산다. 이미 샀거나 안 열렸거나 코인이 모자라면 같은 상태를 돌려준다.
 *
 * @param state 진행 상황
 * @param id 업그레이드 id
 * @returns 새 진행 상황
 */
export function buyUpgrade(state, id) {
  const upgrade = UPGRADES.find((u) => u.id === id);
  if (!upgrade || state.upgrades.includes(id) || !isUnlocked(state, upgrade) || state.coins < upgrade.cost) {
    return state;
  }
  return { ...state, coins: state.coins - upgrade.cost, upgrades: [...state.upgrades, id] };
}

/** 건설한 구역 수를 마을 성장 단계로 표시한다. */
export function stage(state) {
  return Math.max(1, STATIONS.filter((s) => state.levels[s.id] > 0).length);
}

/** 앞 구역 5레벨에서 새 부지를 개방하고 기존 건물은 유지한다. */
export function plotUnlocked(state, id) {
  const index = STATION_IDS.indexOf(id);
  return index >= 0 && (index === 0 || state.levels[id] > 0 || state.levels[STATION_IDS[index - 1]] >= 5);
}

/** 건물별 자동 생산율을 구한다. */
export function buildingIncome(state, id) {
  const station = STATIONS.find((s) => s.id === id);
  return station ? stationIncome(state, station) * multiplier(state, "all") : 0;
}

/** 미배치 매니저 한 명을 열린 건물에 배치하거나 회수한다. */
export function assignManager(state, id) {
  if (!STATION_IDS.includes(id) || !state.levels[id]) return state;
  const managers = { ...state.managers };
  if (managers[id]) delete managers[id];
  else if (Object.values(managers).filter(Boolean).length < state.staff) managers[id] = true;
  else return state;
  return { ...state, managers };
}
