import { COOLER_DISTANCE, COOLER_PADS, NEIGHBORS, PADS, UNLOCK_RANK } from "./layout.js";

export const TIERS = [
  null,
  { id: 1, name: "소형 서버", cost: 15, output: 1, heat: 1, power: 1 },
  { id: 2, name: "GPU 서버", cost: 200, output: 4.4, heat: 4, power: 3 },
  { id: 3, name: "클러스터", cost: 3000, output: 22, heat: 14, power: 8 },
  { id: 4, name: "하이퍼스케일 랙", cost: 60000, output: 150, heat: 30, power: 24 },
];
export const COOLERS = [
  null,
  { level: 1, name: "팬 냉각기", cost: 80, reach: 2, cool: 6, power: 1 },
  { level: 2, name: "수냉 냉각기", cost: 400, reach: 3, cool: 9, power: 2 },
  { level: 3, name: "액침 냉각기", cost: 2000, reach: 4, cool: 12, power: 3 },
];
export const POWER_LEVELS = [
  { cap: 10, cost: 0 },
  { cap: 25, cost: 60 },
  { cap: 60, cost: 500 },
  { cap: 150, cost: 4000 },
  { cap: 400, cost: 30000 },
  { cap: 1000, cost: 250000 },
];
export const GRADES = [
  { name: "서버실", min: 0 },
  { name: "소규모 센터", min: 2000 },
  { name: "지역 센터", min: 70000 },
  { name: "클라우드 센터", min: 2000000 },
  { name: "하이퍼스케일 센터", min: 40000000 },
];

export const SAFE_TEMP = 10;
export const LIMIT_TEMP = 20;
export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const MAX_STEP = 1;
const MIN_RATIO = 0.4;
const PRICE_GROWTH = 1.18;
const REFUND = 0.5;
const REPAIR_RATE = 0.1;
const STRESS_UP = 0.04;
const STRESS_DOWN = 0.05;
const UNLOCK_BASE = 40;
const UNLOCK_GROWTH = 1.7;
const START_COINS = 20;
const START_PADS = 2;
const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi"];

/**
 * 막 시작한 센터의 상태를 만든다.
 *
 * @returns 게임 상태
 */
export function newState() {
  return {
    coins: START_COINS,
    lifetime: 0,
    unlocked: START_PADS,
    racks: PADS.map(() => ({ tier: 0, stress: 0, broken: false })),
    coolers: COOLER_PADS.map(() => 0),
    power: 0,
    time: 0,
  };
}

/**
 * 자리가 열려 있는지 확인한다.
 *
 * @param state 게임 상태
 * @param index 랙 자리 번호
 * @returns 열려 있으면 true
 */
export function isOpen(state, index) {
  return UNLOCK_RANK[index] < state.unlocked;
}

/**
 * 랙의 온도와 수익, 전력 사용량 등 지금 상태에서 계산되는 값을 구한다.
 * 온도는 자기 열에 이웃 랙 열의 절반을 더하고 냉각기가 닿는 만큼 뺀 값이고, 켜져 있는 서버만 열과 전력을 낸다.
 * 수익은 온도가 안전선을 넘으면 줄고 한계선에서 40%가 되며, 전력이 모자라면 전체가 같은 비율로 줄어든다.
 *
 * @param state 게임 상태
 * @returns { temps, outputs, income, usage, cap, efficiency, maxTemp }
 */
export function analyze(state) {
  const heat = state.racks.map((rack) => (rack.tier && !rack.broken ? TIERS[rack.tier].heat : 0));
  const temps = state.racks.map((rack, i) => {
    if (!rack.tier) return 0;
    let temp = heat[i];
    for (const j of NEIGHBORS[i]) temp += heat[j] * 0.5;
    state.coolers.forEach((level, c) => {
      if (level && COOLER_DISTANCE[c][i] <= COOLERS[level].reach) temp -= COOLERS[level].cool;
    });
    return Math.max(0, temp);
  });
  let usage = 0;
  for (const rack of state.racks) if (rack.tier && !rack.broken) usage += TIERS[rack.tier].power;
  for (const level of state.coolers) if (level) usage += COOLERS[level].power;
  const cap = POWER_LEVELS[state.power].cap;
  const efficiency = usage > cap ? cap / usage : 1;
  let income = 0;
  const outputs = state.racks.map((rack, i) => {
    if (!rack.tier || rack.broken) return 0;
    const t = temps[i];
    const thermal = t <= SAFE_TEMP ? 1 : t >= LIMIT_TEMP ? MIN_RATIO : 1 - ((1 - MIN_RATIO) * (t - SAFE_TEMP)) / (LIMIT_TEMP - SAFE_TEMP);
    const value = TIERS[rack.tier].output * thermal * efficiency;
    income += value;
    return value;
  });
  return { temps, outputs, income, usage, cap, efficiency, maxTemp: Math.max(0, ...temps) };
}

/**
 * 시간을 흘려보낸다. 코인이 쌓이고, 한계 온도를 넘은 서버는 과열 게이지가 오르다 가득 차면 고장난다.
 * 한 번에 MAX_STEP초까지만 흘려보내야 계산이 정확하다.
 *
 * @param state 게임 상태
 * @param seconds 흘릴 시간(초)
 * @returns { state, breaks } breaks는 이번에 고장난 랙 자리 번호 목록
 */
export function advance(state, seconds) {
  const analysis = analyze(state);
  const gain = analysis.income * seconds;
  const breaks = [];
  const racks = state.racks.map((rack, i) => {
    if (!rack.tier || rack.broken) return rack;
    const over = analysis.temps[i] - LIMIT_TEMP;
    const stress = over > 0 ? rack.stress + STRESS_UP * (over + 1) * seconds : Math.max(0, rack.stress - STRESS_DOWN * seconds);
    if (stress >= 1) {
      breaks.push(i);
      return { ...rack, stress: 0, broken: true };
    }
    return stress === rack.stress ? rack : { ...rack, stress };
  });
  return {
    state: { ...state, coins: state.coins + gain, lifetime: state.lifetime + gain, racks, time: state.time + seconds },
    breaks,
  };
}

/**
 * 접속하지 않은 동안 쌓인 수익을 한꺼번에 계산한다. 그 사이에는 새 고장이 나지 않고 이미 난 고장은 그대로라고 보며, 최대 8시간까지만 인정한다.
 *
 * @param state 게임 상태
 * @param seconds 접속하지 않은 시간(초)
 * @returns { state, gain, seconds } seconds는 인정한 시간
 */
export function offline(state, seconds) {
  const counted = Math.max(0, Math.min(seconds, OFFLINE_CAP_SECONDS));
  const gain = analyze(state).income * counted;
  return { state: { ...state, coins: state.coins + gain, lifetime: state.lifetime + gain }, gain, seconds: counted };
}

/**
 * 한 단계를 올리는 데 드는 값을 구한다. 이미 같은 단계 이상인 랙이 많을수록 비싸다.
 *
 * @param state 게임 상태
 * @param tier 사려는 단계
 * @returns 코인
 */
export function tierPrice(state, tier) {
  const owned = state.racks.filter((rack) => rack.tier >= tier).length;
  return Math.ceil(TIERS[tier].cost * PRICE_GROWTH ** owned);
}

/**
 * 랙 자리에 서버를 놓거나 한 단계 올리는 값을 구한다. 올릴 때는 기존 서버 값의 절반을 돌려받는다.
 *
 * @param state 게임 상태
 * @param index 랙 자리 번호
 * @returns 코인, 더 올릴 수 없으면 null
 */
export function installCost(state, index) {
  const { tier } = state.racks[index];
  if (tier >= TIERS.length - 1) return null;
  return tierPrice(state, tier + 1) - (tier ? Math.floor(TIERS[tier].cost * REFUND) : 0);
}

/**
 * 고장난 랙을 고치는 값을 구한다.
 *
 * @param state 게임 상태
 * @param index 랙 자리 번호
 * @returns 코인
 */
export function repairCost(state, index) {
  return Math.max(1, Math.ceil(TIERS[state.racks[index].tier].cost * REPAIR_RATE));
}

/**
 * 새 랙 자리를 여는 값을 구한다.
 *
 * @param state 게임 상태
 * @returns 코인, 모두 열렸으면 null
 */
export function unlockCost(state) {
  if (state.unlocked >= PADS.length) return null;
  return Math.ceil(UNLOCK_BASE * UNLOCK_GROWTH ** (state.unlocked - START_PADS));
}

/**
 * 결과를 { state, error } 모양으로 맞춘다.
 *
 * @param state 새 상태
 * @returns 성공 결과
 */
const done = (state) => ({ state, error: null });

/**
 * 실패 결과를 만든다. 상태는 그대로 둔다.
 *
 * @param state 기존 상태
 * @param error 실패 이유
 * @returns 실패 결과
 */
const fail = (state, error) => ({ state, error });

/**
 * 랙 자리에 서버를 놓거나 한 단계 올린다.
 *
 * @param state 게임 상태
 * @param index 랙 자리 번호
 * @returns { state, error } 성공하면 error는 null
 */
export function buyRack(state, index) {
  if (!isOpen(state, index)) return fail(state, "아직 열리지 않은 자리예요.");
  const rack = state.racks[index];
  if (rack.broken) return fail(state, "고장난 서버는 먼저 고쳐야 해요.");
  const cost = installCost(state, index);
  if (cost === null) return fail(state, "이미 가장 높은 단계예요.");
  if (state.coins < cost) return fail(state, "코인이 부족해요.");
  const racks = state.racks.map((r, i) => (i === index ? { tier: r.tier + 1, stress: 0, broken: false } : r));
  return done({ ...state, coins: state.coins - cost, racks });
}

/**
 * 고장난 랙을 고친다.
 *
 * @param state 게임 상태
 * @param index 랙 자리 번호
 * @returns { state, error } 성공하면 error는 null
 */
export function repairRack(state, index) {
  const rack = state.racks[index];
  if (!rack.broken) return fail(state, "고칠 필요가 없어요.");
  const cost = repairCost(state, index);
  if (state.coins < cost) return fail(state, "코인이 부족해요.");
  const racks = state.racks.map((r, i) => (i === index ? { ...r, broken: false, stress: 0 } : r));
  return done({ ...state, coins: state.coins - cost, racks });
}

/**
 * 냉각기를 놓거나 한 단계 올린다.
 *
 * @param state 게임 상태
 * @param index 냉각기 자리 번호
 * @returns { state, error } 성공하면 error는 null
 */
export function upgradeCooler(state, index) {
  const level = state.coolers[index];
  if (level >= COOLERS.length - 1) return fail(state, "이미 가장 높은 단계예요.");
  const cost = COOLERS[level + 1].cost;
  if (state.coins < cost) return fail(state, "코인이 부족해요.");
  return done({ ...state, coins: state.coins - cost, coolers: state.coolers.map((l, i) => (i === index ? l + 1 : l)) });
}

/**
 * 전력 설비를 한 단계 올린다.
 *
 * @param state 게임 상태
 * @returns { state, error } 성공하면 error는 null
 */
export function upgradePower(state) {
  const next = POWER_LEVELS[state.power + 1];
  if (!next) return fail(state, "이미 가장 높은 단계예요.");
  if (state.coins < next.cost) return fail(state, "코인이 부족해요.");
  return done({ ...state, coins: state.coins - next.cost, power: state.power + 1 });
}

/**
 * 새 랙 자리를 연다.
 *
 * @param state 게임 상태
 * @returns { state, error } 성공하면 error는 null
 */
export function unlockPad(state) {
  const cost = unlockCost(state);
  if (cost === null) return fail(state, "모든 자리가 열려 있어요.");
  if (state.coins < cost) return fail(state, "코인이 부족해요.");
  return done({ ...state, coins: state.coins - cost, unlocked: state.unlocked + 1 });
}

/**
 * 누적 수익으로 센터 등급을 구한다.
 *
 * @param lifetime 누적 수익
 * @returns { index, name, next } next는 다음 등급에 필요한 누적 수익, 최고 등급이면 null
 */
export function gradeOf(lifetime) {
  let index = 0;
  for (let i = 0; i < GRADES.length; i += 1) if (lifetime >= GRADES[i].min) index = i;
  return { index, name: GRADES[index].name, next: GRADES[index + 1]?.min ?? null };
}

/**
 * 큰 수를 K, M, B 같은 약어로 줄여 쓴다. 1000 미만은 정수로 보여 준다.
 *
 * @param value 수
 * @returns 문자열
 */
export function formatNumber(value) {
  const n = Math.max(0, value);
  if (n < 1000) return String(Math.floor(n));
  let group = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  if (n / 1000 ** group >= 999.5 && group < SUFFIXES.length - 1) group += 1;
  const scaled = n / 1000 ** group;
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${SUFFIXES[group]}`;
}

/**
 * 초당 수익처럼 작은 값까지 보여 줄 때 쓰는 표기다. 10 미만은 소수 한 자리를 보여 준다.
 *
 * @param value 수
 * @returns 문자열
 */
export function formatRate(value) {
  return value < 10 ? value.toFixed(1) : formatNumber(value);
}

/**
 * 시간(초)을 "N시간 M분" 같은 문장으로 바꾼다.
 *
 * @param seconds 초
 * @returns 문자열
 */
export function formatSpan(seconds) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분`;
  return `${total}초`;
}