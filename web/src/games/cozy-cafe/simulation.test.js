import { describe, expect, it } from "vitest";
import { advanceSimulation, initialSimulation, serveOrder } from "./simulation.js";

const T=1700000000000;

describe("실제 주문 루프",()=>{
  it("첫 30초 안에 주문이 오고 같은 메뉴만 전달할 수 있다",()=>{
    const fresh=initialSimulation(T);
    const waiting=advanceSimulation(fresh,T+1000).state;
    expect(waiting.queue[0]).toMatchObject({guest:"doyun",menu:"espresso"});
    expect(fresh.queue).toEqual([]);
    expect(serveOrder(waiting,"toast")).toBe(waiting);
    const done=serveOrder(waiting,"espresso");
    expect(done.counts.doyun).toBe(1);
    expect(done.directServed).toBe(1);
    expect(done.combo).toBe(1);
    expect(done.coins).toBeGreaterThan(14);
    expect(serveOrder(done,"espresso")).toBe(done);
  });
  it("콤보는 다섯에서 멈추고 놓친 주문은 관계나 지갑을 깎지 않는다",()=>{
    let s=initialSimulation(T);
    for(let id=1;id<=8;id++) s=serveOrder({...s,queue:[{id,guest:"doyun",menu:"espresso",remaining:10000,patience:22000}]},"espresso");
    expect(s.combo).toBe(5);
    const before=s.coins;
    const counts={...s.counts};
    const missed=advanceSimulation({...s,queue:[{id:9,guest:"doyun",menu:"espresso",remaining:500,patience:22000}],arrivalIn:8000},T+1000).state;
    expect(missed.combo).toBe(0);
    expect(missed.coins).toBe(before);
    expect(missed.counts).toEqual(counts);
  });
  it("자동 직원은 음료와 디저트를 자기 역할에 맞게 처리한다",()=>{
    const s={...initialSimulation(T),elapsed:500000,staff:{barista:1,patissier:1,server:0},queue:[{id:1,guest:null,menu:"toast",remaining:40000,patience:40000},{id:2,guest:"doyun",menu:"espresso",remaining:40000,patience:40000}],nextOrder:3,arrivalIn:8000,autoIn:{barista:1000,patissier:1000}};
    const done=advanceSimulation(s,T+1000).state;
    expect(done.queue).toEqual([]);
    expect(done.autoServed).toBe(2);
    expect(done.tips).toBe(0);
  });
  it("화면 틱 간격과 저장 시점이 달라도 같은 경과 시간은 같은 결과다",()=>{
    const base={...initialSimulation(T),choices:{comfort:"quick"},staff:{barista:3,patissier:2,server:1}};
    let small=base;
    for(let t=250;t<=123000;t+=250) small=advanceSimulation(small,T+t).state;
    const big=advanceSimulation(base,T+123000).state;
    expect(small).toEqual(big);
    const half=advanceSimulation(base,T+55555).state;
    expect(advanceSimulation(JSON.parse(JSON.stringify(half)),T+123000).state).toEqual(big);
  });
});
