import { describe, expect, it } from "vitest";
import { initialState } from "./economy.js";
import { assistSimulation, initialSimulation, restoreSimulation, stepSimulation, MAX_GUESTS } from "./simulation.js";

/** 지정한 시간만큼 영업한 매출과 상태를 반환한다. */
function run(econ, ms, start = initialSimulation(econ), assist = false) {
  let sim = start;
  let earned = 0;
  for (let t = 0; t < ms; t += 100) {
    if (assist) sim = assistSimulation(sim, econ);
    const result = stepSimulation(sim, econ, 100);
    sim = result.sim;
    earned += result.earned;
  }
  return { sim, earned };
}

const base = () => initialState(1000);
const cafe = (staff = 0) => ({ ...base(), levels: { espresso: 5, oven: 2, terrace: 3, beans: 0, marketing: 1 }, staff });

describe("운영 시뮬레이션", () => {
  it("손님은 출입구에서 이동한 뒤 주문하고 전달이 끝나야 결제한다", () => {
    const econ = base();
    const entered = run(econ, 1000);
    expect(entered.sim.guests[0].x).toBeLessThan(98);
    expect(entered.sim.guests[0].status).toBe("entering");
    expect(entered.earned).toBe(0);
    const done = run(econ, 25000);
    expect(done.sim.served).toBeGreaterThan(0);
    expect(done.earned).toBe(done.sim.revenue);
    expect(done.sim.lastSale.amount).toBeGreaterThan(0);
  });
  it("고정 간격과 묶음 진행의 결과가 같고 입력을 바꾸지 않는다", () => {
    const econ = cafe(2);
    const start = initialSimulation(econ);
    const original = structuredClone(start);
    const small = run(econ, 30000, start);
    const big = stepSimulation(start, econ, 30000);
    expect(big).toEqual(small);
    expect(start).toEqual(original);
  });
  it("여러 직원이 같은 주문을 맡지 않고 머신 동시 사용량을 지킨다", () => {
    const econ = cafe(3);
    let sim = initialSimulation(econ);
    for (let i = 0; i < 1200; i++) {
      sim = stepSimulation(sim, econ, 100).sim;
      const jobs = sim.workers.filter((w) => ["station", "making", "delivery"].includes(w.phase));
      expect(new Set(jobs.map((w) => w.guestId)).size).toBe(jobs.length);
      expect(sim.workers.filter((w) => w.phase === "making" && sim.guests.find((g) => g.id === w.guestId)?.menu === "coffee").length).toBeLessThanOrEqual(2);
    }
  });
  it("실제로 착석한 손님이 떠나면 테이블이 더러워지고 청소 후 재사용된다", () => {
    const econ = cafe(2);
    let sim = initialSimulation(econ);
    const seen = new Set();
    let cleaned = false;
    let cleaning = false;
    for (let i = 0; i < 2400; i++) {
      const before = sim;
      sim = stepSimulation(sim, econ, 100).sim;
      for (const seat of sim.seats) seen.add(seat.state);
      if (sim.seats.some((s) => s.state === "free" && before.seats[s.id]?.state === "dirty")) cleaned = true;
      if (sim.workers.some((w) => w.phase === "cleaning")) cleaning = true;
    }
    expect([...seen]).toEqual(expect.arrayContaining(["free", "reserved", "occupied", "dirty"]));
    expect(sim.workers.some((w) => w.phase === "idle" || w.phase === "making" || w.phase === "delivery")).toBe(true);
    expect(sim.guests.length).toBeLessThanOrEqual(MAX_GUESTS);
    expect(cleaned).toBe(true);
    expect(cleaning).toBe(true);
  });
  it("직접 돕기는 돈을 만들지 않고 실제 작업을 앞당긴다", () => {
    const econ = base();
    expect(assistSimulation(initialSimulation(econ), econ).revenue).toBe(0);
    const normal = run(econ, 45000);
    const helped = run(econ, 45000, initialSimulation(econ), true);
    expect(helped.sim.served).toBeGreaterThan(normal.sim.served);
  });
  it("저장 복구 후 같은 주문의 매출을 다시 지급하지 않는다", () => {
    const econ = cafe(1);
    const first = run(econ, 30000);
    const restored = restoreSimulation(JSON.parse(JSON.stringify(first.sim)), econ);
    const continued = run(econ, 30000, restored);
    expect(continued.earned).toBe(continued.sim.revenue - first.sim.revenue);
    expect(stepSimulation(restored, econ, 0).earned).toBe(0);
  });
  it("깨진 경로, 중복 손님, 잘못된 작업 참조를 거부한다", () => {
    const econ = cafe(2);
    const saved = run(econ, 6000).sim;
    const bad = structuredClone(saved);
    bad.guests[0].route = [{ x: 1000, y: -4 }];
    expect(restoreSimulation(bad, econ)).toEqual(initialSimulation(econ));
    const duplicate = structuredClone(saved);
    duplicate.guests.push(structuredClone(duplicate.guests[0]));
    expect(restoreSimulation(duplicate, econ)).toEqual(initialSimulation(econ));
    const invalidJob = structuredClone(saved);
    invalidJob.workers[0].phase = "delivery";
    invalidJob.workers[0].guestId = 99999;
    expect(restoreSimulation(invalidJob, econ)).toEqual(initialSimulation(econ));
    const invalidSeat = structuredClone(saved);
    invalidSeat.seats[0] = null;
    expect(restoreSimulation(invalidSeat, econ)).toEqual(initialSimulation(econ));
  });
  it("오븐이 있어야 빵 주문이 생기고 직원과 설비를 추가하면 처리량이 증가한다", () => {
    expect(run(base(), 60000).sim.guests.every((g) => g.menu === "coffee")).toBe(true);
    const slow = run(cafe(0), 120000);
    const fast = run(cafe(3), 120000);
    expect(fast.sim.served).toBeGreaterThan(slow.sim.served);
    expect(fast.sim.guests.some((g) => g.menu === "bread")).toBe(true);
  });
  it("모든 정상 영업 순간은 저장 복구 검증을 통과한다", () => {
    const econ = cafe(3);
    let sim = initialSimulation(econ);
    for (let i = 0; i < 1500; i++) {
      sim = stepSimulation(sim, econ, 100).sim;
      const restored = restoreSimulation(sim, econ);
      expect(restored.clock).toBe(sim.clock);
      expect(restored.guests).toEqual(sim.guests);
      expect(restored.workers).toEqual(sim.workers);
    }
  });
  it("혼잡한 초반 대기열에서도 저장은 유효하고 빈 앞자리로 이동한다", () => {
    const econ = base();
    let sim = initialSimulation(econ);
    let queued = false;
    let reflowed = false;
    for (let i = 0; i < 2400; i++) {
      const before = sim;
      sim = stepSimulation(sim, econ, 100).sim;
      const restored = restoreSimulation(sim, econ);
      expect(restored.clock).toBe(sim.clock);
      expect(restored.guests).toEqual(sim.guests);
      if (sim.guests.filter((g) => ["entering", "waiting", "ordered"].includes(g.status)).length >= 6) queued = true;
      if (sim.guests.some((g) => before.guests.find((old) => old.id === g.id)?.slot > g.slot)) reflowed = true;
    }
    expect(queued).toBe(true);
    expect(reflowed).toBe(true);
  });
});
