import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./reducer.js";
const T=1700000000000;

describe("마을 상태 전이",()=>{
  it("자동 생산을 구매 전에 정산하고 지나간 시간은 다시 지급하지 않는다",()=>{
    let s=initialState(T);
    s=reducer(s,{type:"station",id:"espresso",now:T+30000});
    expect(s.econ.levels.espresso).toBe(2);
    expect(s.econ.coins).toBe(7);
    s=reducer(s,{type:"tick",now:T+31000});
    expect(s.econ.coins).toBe(9);
    expect(reducer(s,{type:"tick",now:T+31000}).econ.coins).toBe(9);
  });
  it("응원은 10초 재사용 제한으로 무한 연타 수익을 막는다",()=>{
    const s=reducer(initialState(T),{type:"tap",now:T});
    expect(s.econ.coins).toBe(5);
    expect(reducer(s,{type:"tap",now:T}).econ.coins).toBe(5);
    expect(reducer(s,{type:"tap",now:T+10000}).econ.coins).toBe(20);
  });
  it("응원 보너스로 누적 목표를 넘겨도 달성 카드를 연다",()=>{
    const s=initialState(T);
    s.econ.total=99999998;
    const next=reducer(s,{type:"tap",now:T});
    expect(next.goalOpen).toBe(true);
    expect(next.econ.goalAt).toBe(T);
  });
  it("재접속 시 생산을 한 번 정산하고 대화창을 연다",()=>{
    const data=initialState(T).econ;
    const s=reducer(initialState(T+60000),{type:"load",data,now:T+60000});
    expect(s.econ.coins).toBe(60);
    expect(s.away.earned).toBe(60);
    expect(reducer(s,{type:"resume",now:T+60000}).econ.coins).toBe(60);
  });
  it("고용 후 건물에 매니저를 배치하면 생산이 늘어난다",()=>{
    let s=initialState(T);
    s={...s,econ:{...s.econ,coins:1000}};
    s=reducer(s,{type:"hire",now:T});
    s=reducer(s,{type:"manager",id:"espresso",now:T});
    const before=s.econ.coins;
    expect(reducer(s,{type:"tick",now:T+1000}).econ.coins-before).toBe(4);
  });
});
