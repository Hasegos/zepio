import { operatingProfile, tapValue } from "./economy.js";

export const STEP_MS = 100;
export const MAX_GUESTS = 12;
export const TABLES = [
  { x: 24, y: 83 }, { x: 45, y: 83 }, { x: 88, y: 80 }, { x: 88, y: 80 },
];
export const PHASE_LABELS = { idle: "대기", station: "설비로 이동", making: "제조 중", delivery: "전달 중", cleaning: "정리 중", cleanTravel: "테이블로 이동" };
export const GUEST_LABELS = { entering: "입장", waiting: "주문 대기", ordered: "제조 대기", seat: "자리로 이동", drinking: "쉬는 중", leaving: "퇴장", seatWait: "자리 대기" };
const STATUSES = Object.keys(GUEST_LABELS);
const PHASES = Object.keys(PHASE_LABELS);
const EXIT = { x: 89, y: 61 };
const SPEED = 18;

/** 경제와 별도로 저장 가능한 운영 상태를 만든다. */
export function initialSimulation(econ) {
  return { v: 1, clock: 0, remainder: 0, nextId: 1, spawnIn: 500, guests: [], workers: [], seats: Array.from({ length: operatingProfile(econ).seats }, (_, id) => ({ id, state: "free", guestId: null })), served: 0, tips: 0, lost: 0, revenue: 0, lastSale: null };
}

/** 가구 사이의 공용 통로를 거치는 고정 경로를 만든다. */
export function routeTo(actor, target) {
  return [{ x: actor.x, y: 68 }, { x: target.x, y: 68 }, { x: target.x, y: target.y }].filter((p, i, list) => i === 0 || p.x !== list[i - 1].x || p.y !== list[i - 1].y);
}

/** 남은 이동 거리만큼 통로를 따라 이동한다. */
function move(actor, ms) {
  let distance = SPEED * ms / 1000;
  while (actor.route.length && distance > 0) {
    const point = actor.route[0];
    const dx = point.x - actor.x;
    const dy = point.y - actor.y;
    const length = Math.hypot(dx, dy);
    actor.direction = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "back" : "front";
    if (length <= distance) { actor.x = point.x; actor.y = point.y; actor.route.shift(); distance -= length; }
    else { actor.x += dx / length * distance; actor.y += dy / length * distance; distance = 0; }
  }
}

/** 손님을 출구로 보낸다. 결제는 이 이동과 분리되어 중복되지 않는다. */
function leave(guest) {
  guest.status = "leaving";
  guest.route = routeTo(guest, EXIT);
}

/** 빈 좌석을 예약하고 자리에 앉을 동선을 지정한다. */
function findSeat(sim, guest) {
  const seat = sim.seats.find((s) => s.state === "free");
  if (!seat) return false;
  seat.state = "reserved";
  seat.guestId = guest.id;
  guest.seatId = seat.id;
  guest.status = "seat";
  const table = TABLES[seat.id];
  guest.route = routeTo(guest, { x: table.x + (seat.id === 3 ? 7 : -7), y: table.y + 3 });
  return true;
}

/** 실제 전달이 끝난 주문을 한 번 결제하고 이용 형태에 따라 다음 행동을 정한다. */
function deliver(sim, guest) {
  if (guest.paid) return 0;
  guest.paid = true;
  const tip = Math.round(guest.price * (guest.waited < 18000 ? 0.25 : guest.waited < 35000 ? 0.1 : 0));
  const amount = guest.price + tip;
  sim.served++;
  sim.tips += tip;
  sim.revenue += amount;
  sim.lastSale = { id: guest.id, amount, tip };
  if (!guest.dineIn) leave(guest);
  else if (!findSeat(sim, guest)) { guest.status = "seatWait"; guest.remaining = 8000; }
  return amount;
}

/** 작업자가 맡은 주문이나 청소를 진행한다. 설비 사용 슬롯도 함께 제한한다. */
function updateWorker(sim, worker, profile, dt) {
  move(worker, dt);
  const guest = sim.guests.find((g) => g.id === worker.guestId);
  if (worker.phase === "station" && !worker.route.length) {
    if (!guest) { worker.phase = "idle"; return 0; }
    const capacity = guest.menu === "bread" ? 1 : profile.coffeeSlots;
    const inUse = sim.workers.filter((w) => w.phase === "making" && sim.guests.find((g) => g.id === w.guestId)?.menu === guest.menu).length;
    if (inUse < capacity) { worker.phase = "making"; worker.remaining = guest.menu === "bread" ? profile.breadMs : profile.coffeeMs; }
  } else if (worker.phase === "making") {
    worker.remaining -= dt;
    if (worker.remaining <= 0 && guest) { worker.remaining = 0; worker.phase = "delivery"; worker.route = routeTo(worker, guest); }
  } else if (worker.phase === "delivery" && !worker.route.length) {
    worker.phase = "idle";
    worker.guestId = null;
    return guest ? deliver(sim, guest) : 0;
  } else if (worker.phase === "cleanTravel" && !worker.route.length) {
    worker.phase = "cleaning";
    worker.remaining = 1800;
  } else if (worker.phase === "cleaning") {
    worker.remaining -= dt;
    if (worker.remaining <= 0) {
      const seat = sim.seats[worker.seatId];
      if (seat) { seat.state = "free"; seat.guestId = null; }
      worker.phase = "idle";
      worker.remaining = 0;
      worker.seatId = null;
    }
  }
  return 0;
}

/** 빈자리와 주문의 상태를 보고 작업자에게 겹치지 않는 작업을 배정한다. */
function assign(sim, worker) {
  const dirty = sim.seats.find((s) => s.state === "dirty" && !sim.workers.some((w) => w.seatId === s.id && w.phase !== "idle"));
  const guest = sim.guests.find((g) => g.status === "waiting" && g.priority) ?? sim.guests.find((g) => g.status === "waiting");
  if (dirty && (!guest || !sim.seats.some((s) => s.state === "free"))) {
    worker.phase = "cleanTravel";
    worker.seatId = dirty.id;
    worker.guestId = null;
    worker.route = routeTo(worker, { x: TABLES[dirty.id].x + (dirty.id === 2 ? -7 : 7), y: TABLES[dirty.id].y - 5 });
  } else if (guest) {
    guest.status = "ordered";
    worker.guestId = guest.id;
    worker.seatId = null;
    worker.phase = "station";
    worker.route = routeTo(worker, { x: (guest.menu === "bread" ? 27 : 61) + worker.id * 3.3, y: 62 });
  }
}

/** 접수된 손님의 자리는 유지하고 대기 손님은 빈 앞자리로 이동시킨다. */
function reflowQueue(sim) {
  const held = new Set(sim.guests.filter((g) => ["ordered", "seatWait"].includes(g.status)).map((g) => g.slot));
  const free = [0, 1, 2, 3, 4, 5].filter((slot) => !held.has(slot));
  for (const guest of sim.guests.filter((g) => ["entering", "waiting"].includes(g.status))) {
    const slot = free.shift();
    if (slot === undefined || slot === guest.slot) continue;
    guest.slot = slot;
    guest.route = routeTo(guest, { x: 63 + slot * 5, y: 65 });
    guest.status = "entering";
  }
}

/** 한 고정 시간 간격의 손님 이동, 좌석 이용과 작업을 진행한다. */
function tick(sim, econ, dt) {
  const profile = operatingProfile(econ);
  while (sim.workers.length < profile.workers) {
    const id = sim.workers.length;
    sim.workers.push({ id, x: 48 + id * 5, y: 65, direction: "front", route: [], phase: "idle", guestId: null, seatId: null, remaining: 0 });
  }
  while (sim.seats.length < profile.seats) sim.seats.push({ id: sim.seats.length, state: "free", guestId: null });
  sim.clock += dt;
  sim.spawnIn = Math.max(0, sim.spawnIn - dt);
  reflowQueue(sim);
  const queue = sim.guests.filter((g) => ["entering", "waiting", "ordered", "seatWait"].includes(g.status));
  if (sim.spawnIn <= 0 && sim.guests.length < MAX_GUESTS && queue.length < 6) {
    const id = sim.nextId++;
    const menu = econ.levels.oven > 0 && id % 3 === 0 ? "bread" : "coffee";
    const slot = [0, 1, 2, 3, 4, 5].find((n) => !queue.some((g) => g.slot === n));
    const guest = { id, slot, x: EXIT.x, y: EXIT.y, direction: "left", route: [], status: "entering", menu, price: Math.round(profile.price * (menu === "bread" ? 1.5 : 1)), dineIn: id % 3 === 0, paid: false, waited: 0, remaining: 0, seatId: null };
    guest.route = routeTo(guest, { x: 63 + slot * 5, y: 65 });
    sim.guests.push(guest);
    sim.spawnIn = profile.arrivalMs;
  }
  for (const guest of sim.guests) {
    move(guest, dt);
    if (["entering", "waiting", "ordered"].includes(guest.status)) guest.waited += dt;
    if (guest.status === "entering" && !guest.route.length) guest.status = "waiting";
    if (guest.status === "waiting" && guest.waited >= 70000) { sim.lost++; leave(guest); }
    if (guest.status === "seat" && !guest.route.length) { guest.status = "drinking"; guest.remaining = 10000; sim.seats[guest.seatId].state = "occupied"; }
    else if (guest.status === "drinking") {
      guest.remaining -= dt;
      if (guest.remaining <= 0) { sim.seats[guest.seatId].state = "dirty"; sim.seats[guest.seatId].guestId = null; leave(guest); }
    } else if (guest.status === "seatWait") {
      guest.remaining -= dt;
      if (!findSeat(sim, guest) && guest.remaining <= 0) leave(guest);
    }
  }
  sim.guests = sim.guests.filter((g) => g.status !== "leaving" || g.route.length);
  let amount = 0;
  for (const worker of sim.workers) amount += updateWorker(sim, worker, profile, dt);
  for (const worker of sim.workers) if (worker.phase === "idle") assign(sim, worker);
  return amount;
}

/** 불변 입력을 고정 간격으로 전진시켜 매출 합계와 다음 운영 상태를 반환한다. */
export function stepSimulation(previous, econ, elapsed) {
  const sim = structuredClone(previous);
  let left = sim.remainder + Math.min(30000, Math.max(0, elapsed));
  let earned = 0;
  while (left >= STEP_MS) { earned += tick(sim, econ, STEP_MS); left -= STEP_MS; }
  sim.remainder = left;
  return { sim, earned };
}

/** 직접 돕기는 진행 중인 제조·정리 또는 이동을 앞당기며 코인을 즉시 만들지 않는다. */
export function assistSimulation(previous, econ) {
  const sim = structuredClone(previous);
  const worker = sim.workers.find((w) => ["making", "cleaning"].includes(w.phase)) ?? sim.workers.find((w) => w.phase !== "idle");
  if (!worker) return sim;
  if (["making", "cleaning"].includes(worker.phase)) worker.remaining = Math.max(0, worker.remaining - 900 * tapValue(econ));
  else move(worker, 900 * tapValue(econ));
  return sim;
}

/** 저장된 운영 상태의 크기·참조·좌표를 검증하고 잘못된 상태는 안전한 영업 시작 상태로 바꾼다. */
export function restoreSimulation(data, econ) {
  const fresh = initialSimulation(econ);
  const finite = (n, max = 1e18) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
  const point = (p) => p && finite(p.x, 100) && finite(p.y, 100) && p.y >= 60;
  const actor = (a) => point(a) && Array.isArray(a.route) && a.route.length <= 3 && a.route.every(point) && ["front", "back", "left", "right"].includes(a.direction);
  if (!data || data.v !== 1 || !finite(data.clock) || !finite(data.remainder, STEP_MS) || data.remainder >= STEP_MS || !Number.isInteger(data.nextId) || data.nextId < 1 || !finite(data.nextId, 1e12) || !finite(data.spawnIn, 10000)) return fresh;
  if (!Array.isArray(data.guests) || data.guests.length > MAX_GUESTS || !Array.isArray(data.workers) || data.workers.length > operatingProfile(econ).workers || !Array.isArray(data.seats) || data.seats.length < 2 || data.seats.length > operatingProfile(econ).seats) return fresh;
  if (![data.served, data.tips, data.lost, data.revenue].every((n) => finite(n))) return fresh;
  const ids = new Set();
  const slots = new Set();
  for (const g of data.guests) {
    if (!actor(g) || !Number.isInteger(g.id) || g.id < 1 || g.id >= data.nextId || ids.has(g.id) || !Number.isInteger(g.slot) || g.slot < 0 || g.slot > 5 || !STATUSES.includes(g.status) || !["coffee", "bread"].includes(g.menu) || typeof g.paid !== "boolean" || typeof g.dineIn !== "boolean" || !finite(g.price) || !finite(g.waited) || !finite(g.remaining, 10000)) return fresh;
    if (["seat", "drinking"].includes(g.status) && (!g.paid || !Number.isInteger(g.seatId) || !data.seats[g.seatId])) return fresh;
    if (g.status === "seatWait" && !g.paid) return fresh;
    if (["entering", "waiting", "ordered"].includes(g.status) && g.paid) return fresh;
    if (["entering", "waiting", "ordered", "seatWait"].includes(g.status)) {
      if (slots.has(g.slot)) return fresh;
      slots.add(g.slot);
    }
    ids.add(g.id);
  }
  const jobs = new Set();
  const cleaned = new Set();
  for (const [index, w] of data.workers.entries()) {
    if (!actor(w) || w.id !== index || !PHASES.includes(w.phase) || !finite(w.remaining, 10000)) return fresh;
    if (["station", "making", "delivery"].includes(w.phase)) {
      if (jobs.has(w.guestId) || !data.guests.some((g) => g.id === w.guestId && g.status === "ordered" && !g.paid)) return fresh;
      jobs.add(w.guestId);
    }
    if (["cleaning", "cleanTravel"].includes(w.phase)) {
      if (cleaned.has(w.seatId) || data.seats[w.seatId]?.state !== "dirty") return fresh;
      cleaned.add(w.seatId);
    }
  }
  if (data.guests.some((g) => g.status === "ordered" && !jobs.has(g.id))) return fresh;
  for (const [id, seat] of data.seats.entries()) {
    if (!seat || seat.id !== id || !["free", "reserved", "occupied", "dirty"].includes(seat.state)) return fresh;
    if (["reserved", "occupied"].includes(seat.state) && !data.guests.some((g) => g.id === seat.guestId && g.seatId === id && g.status === (seat.state === "reserved" ? "seat" : "drinking"))) return fresh;
    if (["free", "dirty"].includes(seat.state) && seat.guestId !== null) return fresh;
  }
  const path = (a) => ({ x: a.x, y: a.y, direction: a.direction, route: a.route.map((p) => ({ x: p.x, y: p.y })) });
  return {
    v: 1, clock: data.clock, remainder: data.remainder, nextId: data.nextId, spawnIn: data.spawnIn,
    served: data.served, tips: data.tips, lost: data.lost, revenue: data.revenue, lastSale: null,
    guests: data.guests.map((g) => ({ ...path(g), id: g.id, slot: g.slot, status: g.status, menu: g.menu, price: g.price, dineIn: g.dineIn, paid: g.paid, waited: g.waited, remaining: g.remaining, seatId: g.seatId, ...(g.priority !== undefined ? { priority: g.priority === true } : {}) })),
    workers: data.workers.map((w) => ({ ...path(w), id: w.id, phase: w.phase, guestId: w.guestId, seatId: w.seatId, remaining: w.remaining })),
    seats: data.seats.map((s) => ({ id: s.id, state: s.state, guestId: s.guestId })),
  };
}
