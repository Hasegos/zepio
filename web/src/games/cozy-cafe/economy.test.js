import { describe, expect, it } from "vitest";
import { hireStaff, orderValue, patienceBonus, serviceInterval } from "./economy.js";
import { initialSimulation, advanceSimulation } from "./simulation.js";

describe("서빙 경제",()=>{
  it("직접 서빙은 자동보다 수익과 팁이 높고 콤보는 최대 x5다",()=>{
    const s={...initialSimulation(1),combo:5};
    expect(orderValue(s,"espresso",true).coins).toBeGreaterThan(orderValue(s,"espresso",false).coins);
    expect(orderValue(s,"espresso",false).tip).toBe(0);
    expect(orderValue({...s,combo:100},"espresso",true)).toEqual(orderValue(s,"espresso",true));
  });
  it("선택과 읽은 사연의 영구 효과가 해당 역할에만 적용된다",()=>{
    const s=initialSimulation(1);
    expect(orderValue({...s,choices:{style:"meal"}},"toast",true).coins).toBeGreaterThan(orderValue(s,"toast",true).coins);
    expect(orderValue({...s,read:["doyun-2"]},"espresso",true).coins).toBeGreaterThan(orderValue(s,"espresso",true).coins);
    expect(patienceBonus({...s,read:["dalbong-2"]})).toBe(6000);
    expect(orderValue({...s,read:["moka-2"]},"drip",true).tip).toBeGreaterThan(orderValue(s,"drip",true).tip);
  });
  it("직원 고용은 열림·잔액·역할별 상한을 검사하고 각자 다른 일을 한다",()=>{
    const fresh=initialSimulation(1);
    expect(hireStaff({...fresh,coins:1000},"barista").staff.barista).toBe(1);
    let s={...fresh,coins:10000,elapsed:300000};
    s={...s,queue:[{id:1,menu:"espresso",remaining:10000,patience:22000}]};
    s=hireStaff(s,"patissier");s=hireStaff(s,"server");s=hireStaff(s,"barista");
    expect(s.queue[0].remaining).toBe(18000);
    expect(serviceInterval(s,"patissier")).toBe(12000);
    expect(serviceInterval(s,"barista")).toBe(7000);
    expect(patienceBonus(s)).toBe(8000);
    expect(hireStaff(s,"bad")).toBe(s);
    expect(hireStaff({...s,staff:{...s.staff,barista:3}},"barista").staff.barista).toBe(3);
  });
  it("8시간 이후는 지급하지 않고 되감긴 시계도 기준 시각을 뒤로 옮기지 않는다",()=>{
    const now=1700000000000;
    const s=initialSimulation(now);
    const cap=advanceSimulation(s,now+8*3600000);
    const long=advanceSimulation(s,now+24*3600000);
    expect(long.earned).toBe(cap.earned);
    expect(long.elapsed).toBe(8*3600000);
    expect(advanceSimulation(long.state,now+24*3600000).earned).toBe(0);
    const back=advanceSimulation(s,now-1000);
    expect(back.state.lastAt).toBe(now);
    expect(back.earned).toBe(0);
  });
});
