import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./reducer.js";
const T=1700000000000;

describe("카페 상태와 복귀",()=>{
  it("이미 접수한 주문은 메뉴 편성 후에도 마저 서빙한다",()=>{
    let s=reducer(initialState(T),{type:"tick",now:T+1000});
    s={...s,game:{...s.game,elapsed:60000}};
    s=reducer(s,{type:"menu",slot:0,id:"latte",now:T+1000});
    expect(s.game.menus).not.toContain("espresso");
    s=reducer(s,{type:"serve",menu:"espresso",now:T+1000});
    expect(s.game.served).toBe(1);
  });
  it("복귀와 새로고침이 같은 시간의 수익을 중복 지급하지 않는다",()=>{
    const data=initialState(T).game;
    const first=reducer(initialState(T),{type:"load",data,now:T+3600000});
    expect(first.away.ms).toBe(3600000);
    const again=reducer(first,{type:"resume",now:T+3600000});
    expect(again.game.coins).toBe(first.game.coins);
    const loaded=reducer(initialState(T+3600000),{type:"load",data:first.game,now:T+3600000});
    expect(loaded.game.coins).toBe(first.game.coins);
    expect(loaded.away).toBeNull();
    expect(loaded.game.counts).toEqual(first.game.counts);
  });
  it("읽기 전에는 완결 보상이 없고 같은 사연은 한 번만 읽은 것으로 남긴다",()=>{
    let s=initialState(T);
    s={...s,game:{...s.game,counts:{...s.game.counts,doyun:50}}};
    s=reducer(s,{type:"tick",now:T+1000});
    const read=reducer(s,{type:"read",id:"doyun-2",now:T+1000});
    expect(read.game.read).toEqual(["doyun-2"]);
    expect(reducer(read,{type:"read",id:"doyun-2",now:T+1000})).toBe(read);
    expect(reducer(read,{type:"read",id:"bad",now:T+1000})).toBe(read);
  });
  it("선택·조합·초기화를 같은 경로로 처리한다",()=>{
    let s=initialState(T);
    s={...s,game:{...s.game,elapsed:180000}};
    s=reducer(s,{type:"choice",id:"style",option:"rest",now:T});
    expect(s.game.choices.style).toBe("rest");
    s=reducer(s,{type:"recipe",pair:["espresso","milk"],now:T});
    expect(s.game.discovered).toContain("cloud");
    expect(s.game.timeline.at(-1).id).toBe("recipe-cloud");
    expect(reducer(s,{type:"reset",now:T+1}).game).toEqual(initialState(T+1).game);
  });
});
