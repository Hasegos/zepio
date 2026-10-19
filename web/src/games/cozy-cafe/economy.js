import { menuById } from "./recipes.js";

export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const STAFF = [
  { id: "barista", name: "바리스타", desc: "음료 자동 서빙 · 기본 제피 1명", cost: 100, interval: 14000 },
  { id: "patissier", name: "파티시에", desc: "디저트 자동 서빙", cost: 85, interval: 12000 },
  { id: "server", name: "서버", desc: "손님 인내심 +8초씩", cost: 70, interval: 0 },
];

/** 역할별 추가 고용 비용을 구한다. */
export function staffCost(state, role) {
  const job = STAFF.find((entry) => entry.id === role);
  return job ? Math.ceil(job.cost * 1.7 ** Math.max(0, state.staff[role] - (role === "barista" ? 1 : 0))) : Infinity;
}

/** 역할별 최대 세 명까지 고용한다. */
export function hireStaff(state, role) {
  const cost = staffCost(state, role);
  if (!STAFF.some((job) => job.id === role) || state.staff[role] >= 3 || state.coins < cost || state.elapsed < 300000) return state;
  const next = { ...state, coins: state.coins - cost, staff: { ...state.staff, [role]: state.staff[role] + 1 } };
  if (role === "server") next.queue = state.queue.map(order=>({...order,remaining:order.remaining+8000,patience:order.patience+8000}));
  else next.autoIn = {...state.autoIn,[role]:Math.min(state.autoIn[role],serviceInterval(next,role))};
  return next;
}

/** 사연을 읽고 완결한 단골의 영구 효과를 확인한다. */
export function hasReward(state, id) {
  return state.read.includes(`${id}-2`);
}

/** 메뉴 선택과 사연 보상에 따른 주문 매출을 계산한다. */
export function orderValue(state, menuId, direct, patience = 1) {
  const menu = menuById(menuId);
  if (!menu) return { coins: 0, tip: 0 };
  const boost = (menu.kind === "drink" && state.choices.style === "rest" ? 1.15 : menu.kind === "dessert" && state.choices.style === "meal" ? 1.25 : 1) * (menu.kind === "drink" && hasReward(state,"doyun") ? 1.1 : 1);
  const base = menu.price * boost;
  const normalTip = Math.round(base * (.08 * Math.min(5, state.combo + 1) + Math.max(0, patience) * .12));
  const tip = direct ? hasReward(state,"moka") ? Math.ceil(normalTip * 1.2) : normalTip : 0;
  return { coins: Math.round(base * (direct ? 1 : .75)) + tip, tip };
}

/** 기본 인내심에 서버와 선택·단골 효과를 더한다. */
export function patienceBonus(state) {
  return state.staff.server * 8000 + (state.choices.comfort === "patient" ? 10000 : 0) + (hasReward(state,"dalbong") ? 6000 : 0);
}

/** 자동 직원의 역할별 처리 간격을 계산한다. */
export function serviceInterval(state, role) {
  const job = STAFF.find((entry) => entry.id === role);
  if (!job?.interval || !state.staff[role]) return Infinity;
  return job.interval / state.staff[role] * (state.choices.comfort === "quick" ? .85 : 1);
}
