import { describe, expect, it } from "vitest";
import { parseSave } from "./save.js";
import { reducer, initialState } from "./reducer.js";
import { advanceSimulation, initialSimulation } from "./simulation.js";
const T=1700000000000;

describe("카페 저장 이전과 손상 복원",()=>{
  it("옛 코인과 설비·직원 기록을 보관하고 이야기만 첫날부터 시작한다",()=>{
    const old={v:1,coins:500,total:900,staff:7,levels:{espresso:9,oven:3}};
    const s=parseSave(old,T);
    expect(s.coins).toBe(500);
    expect(s.total).toBe(900);
    expect(s.legacy.levels.espresso).toBe(9);
    expect(s.legacy.staff).toBe(7);
    expect(s.counts.doyun).toBe(0);
    expect(s.elapsed).toBe(0);
  });
  it("정상 저장의 정산 기준과 주문·사연을 복구한다",()=>{
    const s=advanceSimulation(initialSimulation(T),T+123456).state;
    const data=JSON.parse(JSON.stringify(s));
    const parsed=parseSave(data,T+123456);
    expect(parsed.queue).toEqual(s.queue);
    expect(parsed.counts).toEqual(s.counts);
    expect(parsed.elapsed).toBe(s.elapsed);
    expect(parsed.remainder).toBe(s.remainder);
    expect(parsed.timeline).toEqual(s.timeline);
    expect(parsed.lastAt).toBe(s.lastAt);
  });
  it("깨진 숫자·초과 메뉴·위조 보상을 걸러내고 기본 제피를 유지한다",()=>{
    const s=parseSave({...initialSimulation(T),coins:NaN,total:Infinity,staff:{barista:-1,server:999},read:["moka-2"],menus:["bad","milk","milk","espresso","drip","toast"],counts:{moka:"50"},queue:[null,{id:3,remaining:Infinity}]},T);
    expect(s.coins).toBe(0);
    expect(s.staff).toEqual({barista:1,patissier:0,server:3});
    expect(s.read).not.toContain("moka-2");
    expect(s.menus).toHaveLength(4);
    expect(new Set(s.menus).size).toBe(4);
    expect(s.queue).toEqual([]);
  });
  it("발견 타임라인과 다음 단계용 영구 포인트를 다시 불러와도 보존한다",()=>{
    const initial=initialState(T);
    const source={...initial,game:{...initial.game,elapsed:90000,brandPoints:7}};
    const discovered=reducer(source,{type:"recipe",pair:["milk","espresso"],now:T}).game;
    const parsed=parseSave(discovered,T);
    expect(parsed.discovered).toEqual(["cloud"]);
    expect(parsed.timeline.find(e=>e.id==="recipe-cloud").kind).toBe("recipe");
    expect(parsed.brandPoints).toBe(7);
  });
  it("알 수 없는 버전과 미래 시각을 안전하게 처리한다",()=>{
    for(const bad of [null,{},"x",{v:9}]) expect(parseSave(bad,T)).toEqual(initialSimulation(T));
    const future=parseSave({...initialSimulation(T),lastAt:T+1000000},T);
    expect(future.lastAt).toBe(T+1000000);
    expect(advanceSimulation(future,T+500000).earned).toBe(0);
  });
});
