export const PLOTS = [
  { id: "espresso", x: 175, y: 300, road: 400 },
  { id: "oven", x: 475, y: 300, road: 400 },
  { id: "terrace", x: 775, y: 300, road: 400 },
  { id: "beans", x: 325, y: 530, road: 610 },
  { id: "marketing", x: 675, y: 530, road: 610 },
];

/** 개방된 건물 사이의 연결 도로와 진입로를 만든다. */
function itinerary(from, to, guest) {
  const offset = (guest.id % 3 - 1) * 19;
  const front = to.y + 28 + Math.floor(guest.id / 3) % 2 * 18;
  return [{ x: guest.x, y: from.road }, ...(from.road !== to.road ? [{ x: 500, y: from.road }, { x: 500, y: to.road }] : []), { x: to.x, y: to.road }, { x: to.x, y: front }, { x: to.x + offset, y: front }];
}

/** 마을 주민의 초기 상태를 만든다. */
export function initialSimulation() {
  return { v: 2, clock: 0, guests: [], visits: 0, served: 0 };
}

/** 주민은 연결된 길을 따라 걷고 건물 앞에서 머문다. 수익은 경제 엔진에서 계산한다. */
export function stepSimulation(source, econ, elapsed) {
  const sim = structuredClone(source);
  const dt = Math.min(30000, Math.max(0, Number.isFinite(elapsed) ? elapsed : 0));
  const plots = PLOTS.filter((p) => econ.levels[p.id] > 0);
  if (!plots.length) return { sim, earned: 0 };
  const count = Math.min(18, 3 + plots.length * 2 + Math.floor(Math.sqrt(Object.values(econ.levels).reduce((a, b) => a + b, 0))));
  while (sim.guests.length < count) {
    const id = sim.guests.length;
    const target = plots[id % plots.length];
    sim.guests.push({ id, x: 90 + id * 37 % 180, y: 400, stop: id * 340, route: [{ x: target.x, y: 400 }, ...(target.road === 610 ? [{ x: 500, y: 400 }, { x: 500, y: 610 }, { x: target.x, y: 610 }] : []), { x: target.x, y: target.y + 28 + Math.floor(id / 3) % 2 * 18 }, { x: target.x + (id % 3 - 1) * 19, y: target.y + 28 + Math.floor(id / 3) % 2 * 18 }], target: target.id, visit: 0, walking: true });
  }
  let remaining = dt;
  while (remaining > 0) {
    const step = Math.min(100, remaining);
    for (const g of sim.guests) {
      if (g.stop > 0) { g.stop -= step; g.walking = false; continue; }
      if (!g.route.length) {
        const from = PLOTS.find((p) => p.id === g.target) ?? plots[0];
        g.visit += 1;
        sim.visits += 1;
        const to = plots[(g.id + g.visit) % plots.length];
        g.target = to.id;
        g.route = itinerary(from, to, g);
        g.stop = 1800 + g.id % 4 * 600;
        continue;
      }
      const point = g.route[0];
      const dx = point.x - g.x;
      const dy = point.y - g.y;
      const distance = Math.hypot(dx, dy);
      const speed = (30 + g.id % 4 * 4) * step / 1000;
      g.walking = true;
      g.flip = dx < 0;
      if (distance <= speed) { g.x = point.x; g.y = point.y; g.route.shift(); }
      else { g.x += dx / distance * speed; g.y += dy / distance * speed; }
    }
    remaining -= step;
  }
  sim.clock += dt;
  sim.served = sim.visits;
  return { sim, earned: 0 };
}

/** 이동 상태는 재생성하여 오래된 영업 저장 데이터와 손상된 경로를 격리한다. */
export function restoreSimulation(data) {
  const visits = data?.v === 2 && Number.isSafeInteger(data.visits) && data.visits >= 0 ? Math.min(1e12, data.visits) : 0;
  return { ...initialSimulation(), visits, served: visits };
}
