import { FIRST_REGULARS, regularById } from "./characters.js";
import { OFFLINE_CAP_MS, orderValue, patienceBonus, serviceInterval } from "./economy.js";
import { menuById } from "./recipes.js";
import { refreshStory } from "./story.js";

/** 새 카페의 경제·영업·이야기를 만든다. 시각은 호출자가 전달한다. */
export function initialSimulation(now = 0) {
  return refreshStory({
    v: 2, coins: 0, total: 0, startedAt: now, lastAt: now, elapsed: 0, remainder: 0,
    staff: { barista: 1, patissier: 0, server: 0 }, menus: ["espresso", "drip", "milk", "toast"], discovered: [],
    counts: { doyun: 0, dalbong: 0, moka: 0 }, choices: {}, seen: [], read: [], inbox: [], timeline: [], latest: "inherit",
    queue: [], nextOrder: 1, arrivalIn: 1000, autoIn: { barista: 14000, patissier: 12000 },
    combo: 0, bestCombo: 0, served: 0, directServed: 0, autoServed: 0, missed: 0, tips: 0,
    brandPoints: 0, legacy: null,
  });
}

/** 도착 순서와 준비한 메뉴로 새 주문을 만든다. */
function spawn(state) {
  const people = FIRST_REGULARS.filter((person) => person.id === "doyun" || (person.id === "dalbong" ? state.elapsed >= 120000 : state.elapsed >= 420000));
  const index = state.nextOrder - 1;
  const person = people[index % people.length];
  const walkin = index % 5 === 4;
  const guest = walkin ? null : person.id;
  const favorite = !walkin && state.menus.includes(person.menu) ? person.menu : state.menus[index % state.menus.length];
  const patience = (walkin ? 30000 : person.patience) + patienceBonus(state);
  return { id: state.nextOrder, guest, name: walkin ? "골목 손님" : person.name, menu: favorite, remaining: patience, patience };
}

/** 접수된 주문 하나를 실제로 전달하고 관계·매출을 한 번만 정산한다. */
export function serveOrder(source, menu, direct = true) {
  const index = source.queue.findIndex((order) => order.menu === menu && order.remaining > 0);
  if (index < 0) return source;
  const state = { ...source, queue: [...source.queue], counts: { ...source.counts } };
  const [order] = state.queue.splice(index, 1);
  const result = orderValue(state, menu, direct, order.remaining / order.patience);
  state.coins += result.coins;
  state.total += result.coins;
  state.tips += result.tip;
  state.served += 1;
  if (order.guest) state.counts[order.guest] += 1;
  if (direct) { state.combo = Math.min(5, state.combo + 1); state.bestCombo = Math.max(state.bestCombo, state.combo); state.directServed += 1; }
  else state.autoServed += 1;
  return refreshStory(state);
}

/** 타이머 한 구간의 입장·인내심·역할별 자동 서빙을 계산한다. */
function step(source, dt) {
  let state = { ...source, elapsed: source.elapsed + dt, queue: source.queue.map((order) => ({ ...order, remaining: order.remaining - dt })), autoIn: { ...source.autoIn } };
  const missed = state.queue.filter((order) => order.remaining <= 0).length;
  if (missed) { state.combo = 0; state.missed += missed; state.queue = state.queue.filter((order) => order.remaining > 0); }
  state.arrivalIn -= dt;
  while (state.arrivalIn <= 0) {
    if (state.queue.length < 4) { state.queue.push(spawn(state)); state.nextOrder += 1; }
    state.arrivalIn += 8000;
  }
  for (const role of ["barista", "patissier"]) {
    if (!state.staff[role]) continue;
    state.autoIn[role] -= dt;
    while (state.autoIn[role] <= 0) {
      const order = state.queue.find((entry) => menuById(entry.menu)?.kind === (role === "barista" ? "drink" : "dessert"));
      if (order) state = serveOrder(state, order.menu, false);
      state.autoIn = { ...state.autoIn, [role]: state.autoIn[role] + serviceInterval(state, role) };
    }
  }
  return refreshStory(state);
}

/** 지난 시간을 최대 8시간 재생하며 마지막 정산 시각을 뒤로 옮기지 않는다. */
export function advanceSimulation(source, now) {
  const elapsed = Math.min(OFFLINE_CAP_MS, Math.max(0, now - source.lastAt));
  let state = source;
  const buffered = elapsed + (source.remainder || 0);
  for (let left = buffered; left >= 1000; left -= 1000) state = step(state, 1000);
  state = { ...state, remainder: buffered % 1000, lastAt: Math.max(source.lastAt, now) };
  return { state, elapsed, earned: state.coins - source.coins, served: state.served - source.served };
}

/** 장면은 단골 소개와 영업 상태만 읽고 게임 상태를 변경하지 않는다. */
export function guestAppearance(order) {
  return regularById(order.guest) ?? { id: "walkin", name: "골목 손님", color: "#b7a692" };
}
