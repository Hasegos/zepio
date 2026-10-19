import { describe, expect, it } from "vitest";
import { advance, assignManager, buildingIncome, buyStation, buyUpgrade, GOAL, hireStaff, incomePerSecond, initialState, OFFLINE_CAP_MS, plotUnlocked, stage, STATIONS, stationCost } from "./economy.js";
const T = 1700000000000;

describe("마을 성장 경제", () => {
  it("빈 지갑이어도 처음부터 자동 생산한다", () => {
    const state=initialState(T);
    expect(state.coins).toBe(0);
    expect(incomePerSecond(state)).toBe(1);
    expect(advance(state,T+20000).state.coins).toBe(20);
  });
  it("돈이 있어도 앞 건물 5레벨 전에는 부지를 살 수 없다", () => {
    const state={...initialState(T),coins:1e9};
    expect(plotUnlocked(state,"oven")).toBe(false);
    expect(buyStation(state,"oven")).toBe(state);
    const open={...state,levels:{...state.levels,espresso:5}};
    expect(buyStation(open,"oven").levels.oven).toBe(1);
  });
  it("순서대로 5구역을 열고 기존 건물은 조건과 무관하게 증축한다", () => {
    let state={...initialState(T),coins:1e9};
    for(const s of STATIONS) {
      while(state.levels[s.id]<5) state=buyStation(state,s.id);
    }
    expect(stage(state)).toBe(5);
    const legacy={...initialState(T),coins:1e6,levels:{...initialState(T).levels,beans:1}};
    expect(buyStation(legacy,"beans").levels.beans).toBe(2);
  });
  it("매니저는 실제 고용 수 이내에서만 배치되고 생산 효과를 옮길 수 있다", () => {
    const base={...initialState(T),coins:1e6,levels:{...initialState(T).levels,espresso:5,oven:1}};
    expect(assignManager(base,"espresso")).toBe(base);
    let state=assignManager(hireStaff(base),"espresso");
    expect(buildingIncome(state,"espresso")).toBe(10);
    expect(assignManager(state,"oven")).toBe(state);
    state=assignManager(assignManager(state,"espresso"),"oven");
    expect(buildingIncome(state,"espresso")).toBe(5);
    expect(buildingIncome(state,"oven")).toBe(8);
    expect(assignManager(state,"beans")).toBe(state);
  });
  it("코인 부족, 잘못된 항목과 영구 효과 중복 구매를 막는다", () => {
    const s=initialState(T);
    expect(buyStation(s,"espresso")).toBe(s);
    expect(buyStation(s,"bad")).toBe(s);
    const rich={...s,coins:10000,total:10000};
    const upgraded=buyUpgrade(rich,"efficiency");
    expect(incomePerSecond(upgraded)).toBe(1.25);
    expect(buyUpgrade(upgraded,"efficiency")).toBe(upgraded);
  });
  it("초당 생산율은 건물과 매니저 기본 수익의 합이다", () => {
    const s={...initialState(T),staff:2,levels:{espresso:10,oven:5,terrace:1,beans:0,marketing:0},managers:{oven:true}};
    expect(incomePerSecond(s)).toBe(STATIONS.reduce((n,b)=>n+buildingIncome(s,b.id),0)+4);
  });
  it("온라인과 복귀 수익이 일치하고 같은 시간은 중복 지급하지 않는다", () => {
    const s=initialState(T);
    const once=advance(s,T+60000);
    let stepped=s;
    for(let t=T+250;t<=T+60000;t+=250) stepped=advance(stepped,t).state;
    expect(stepped.coins).toBe(once.state.coins);
    expect(advance(once.state,T+60000).earned).toBe(0);
    expect(advance(s,T+OFFLINE_CAP_MS*2).earned).toBe(28800);
    expect(advance(s,T-1000).earned).toBe(0);
  });
  it("누적 목표 달성 시각은 한 번 기록한다", () => {
    const s={...initialState(T),total:GOAL-1};
    const first=advance(s,T+1000).state;
    expect(first.goalAt).toBe(T+1000);
    expect(advance(first,T+2000).state.goalAt).toBe(T+1000);
  });
  it("완전 방치와 순차 재투자만으로 모든 부지를 개방할 수 있다", () => {
    let s=initialState(T);
    const reached=[];
    for(let sec=1;sec<=7200;sec++) {
      s=advance(s,T+sec*1000).state;
      for(const b of STATIONS) {
        if(plotUnlocked(s,b.id)&&s.levels[b.id]<5&&s.coins>=stationCost(b.id,s.levels[b.id])) {
          s=buyStation(s,b.id);
          if(s.levels[b.id]===1) reached.push(b.id);
        }
      }
    }
    expect(reached).toEqual(["oven","terrace","beans","marketing"]);
    expect(stage(s)).toBe(5);
  });
});
