import { describe, expect, it } from "vitest";
import { initialState } from "./economy.js";
import { initialSimulation, PLOTS, restoreSimulation, stepSimulation } from "./simulation.js";

describe("마을 주민 시뮬레이션",()=>{
  it("입력 상태를 변경하지 않고 주민들이 이동하고 가게를 방문한다",()=>{
    const econ=initialState(1);
    const source=initialSimulation();
    const a=stepSimulation(source,econ,1000).sim;
    expect(source.guests).toEqual([]);
    const b=stepSimulation(a,econ,1000).sim;
    expect(a.guests[0].x).not.toBe(b.guests[0].x);
    let sim=b;
    for(let i=0;i<30;i++) sim=stepSimulation(sim,econ,1000).sim;
    expect(sim.visits).toBeGreaterThan(0);
    expect(sim.guests.every(g=>g.target==="espresso")).toBe(true);
  });
  it("열린 건물만 방문하고 연결 도로와 진입로로만 이동한다",()=>{
    const econ={...initialState(1),levels:{espresso:5,oven:5,terrace:5,beans:5,marketing:5}};
    let sim=initialSimulation();
    for(let i=0;i<1200;i++) {
      sim=stepSimulation(sim,econ,250).sim;
      for(const g of sim.guests) {
        expect(Number.isFinite(g.x)&&Number.isFinite(g.y)).toBe(true);
        const onRoad=Math.abs(g.y-400)<.01||Math.abs(g.y-610)<.01||Math.abs(g.x-500)<.01;
        const onEntry=PLOTS.some(p=>Math.abs(g.x-p.x)<=20&&g.y>=p.y&&g.y<=p.road);
        expect(onRoad||onEntry).toBe(true);
      }
    }
    expect(new Set(sim.guests.map(g=>g.target)).size).toBe(5);
    expect(sim.guests.length).toBeLessThanOrEqual(18);
    expect(sim.visits).toBeGreaterThan(20);
  });
  it("카페만 있을 때는 아직 건설되지 않은 도로로 나가지 않는다",()=>{
    const econ={...initialState(1),levels:{...initialState(1).levels,espresso:1000}};
    let sim=initialSimulation();
    for(let i=0;i<600;i++) {
      sim=stepSimulation(sim,econ,250).sim;
      expect(sim.guests.every(g=>g.x<=310)).toBe(true);
    }
  });
  it("주민 애니메이션이 매출을 따로 지급하지 않는다",()=>{
    expect(stepSimulation(initialSimulation(),initialState(1),30000).earned).toBe(0);
  });
  it("깨진 저장과 구형 주문 상태는 안전하게 새 이동 상태로 만든다",()=>{
    expect(restoreSimulation({guests:"bad"})).toEqual(initialSimulation());
    expect(stepSimulation(initialSimulation(),initialState(1),Infinity).sim.clock).toBe(0);
  });
});
