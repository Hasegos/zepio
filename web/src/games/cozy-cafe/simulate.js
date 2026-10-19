import { staffCost } from "./economy.js";
import { availableMenus } from "./recipes.js";
import { initialState, reducer } from "./reducer.js";
import { CHOICES, freshnessGaps, storyEntry } from "./story.js";

export const POLICIES = ["cheapest", "drinks", "desserts", "patience", "idle", "direct"];
const START = 1700000000000;

/** 지정한 편성을 실제 리듀서 조작으로 적용한다. */
function configure(state, policy, now) {
  let next=state;
  const preferences = policy === "drinks" ? ["espresso","drip","milk","latte"] : policy === "desserts" ? ["espresso","milk","toast","cake"] : policy === "patience" ? ["drip","milk","toast","latte"] : null;
  if(preferences) for(const id of preferences) {
    if(next.game.menus.includes(id)||!availableMenus(next.game).some(menu=>menu.id===id)) continue;
    const slot=next.game.menus.findIndex(current=>!preferences.includes(current));
    if(slot>=0) next=reducer(next,{type:"menu",slot,id,now});
  }
  return next;
}

/** 서로 다른 운영 정책으로 1차 구간을 끝까지 실행하고 실제 공개 사건을 출력한다. */
export function simulate({ policy = "idle", durationMs = 2400000, start = START } = {}) {
  let state=initialState(start);
  let readyAt=null;
  let firstChoice=null;
  let firstOrder=null;
  const purchases=[];
  for(let elapsed=1000;elapsed<=durationMs;elapsed+=1000) {
    const now=start+elapsed;
    state=reducer(state,{type:"tick",now});
    if(state.game.queue.length) firstOrder??=elapsed;
    if(policy!=="idle") {
      for(const choice of CHOICES) if(elapsed>=choice.at&&!state.game.choices[choice.id]) {
        state=reducer(state,{type:"choice",id:choice.id,option:choice.id==="style"?(policy==="desserts"?"meal":"rest"):(policy==="patience"?"patient":"quick"),now});
        firstChoice??=elapsed;
      }
      if(elapsed%30000===0) state=configure(state,policy,now);
      if(elapsed>=300000&&elapsed%30000===0) {
        const roles=policy==="drinks"?["barista"]:policy==="desserts"?["patissier","barista"]:policy==="patience"?["server","barista"]:["barista","patissier","server"];
        const candidates=roles.filter(role=>state.game.staff[role]<3);
        const role=policy==="cheapest"?candidates.sort((a,b)=>staffCost(state.game,a)-staffCost(state.game,b))[0]:candidates[0];
        if(role&&state.game.coins>=staffCost(state.game,role)) {state=reducer(state,{type:"hire",role,now});purchases.push({at:elapsed,role});}
      }
      for(const id of state.game.inbox) state=reducer(state,{type:"read",id,now});
    }
    if(policy==="direct") for(const order of [...state.game.queue]) state=reducer(state,{type:"serve",menu:order.menu,now});
    if(readyAt===null&&state.game.elapsed>=600000&&Object.values(state.game.counts).every(count=>count>=20)) readyAt=elapsed;
  }
  return { policy,readyAt,firstChoice,firstOrder,served:state.game.served,missed:state.game.missed,earned:state.game.total,tips:state.game.tips,staff:state.game.staff,counts:state.game.counts,purchases,timeline:state.game.timeline,gaps:freshnessGaps(state.game.timeline,durationMs),game:state.game };
}

/** 모든 정책의 같은 조건 결과를 구한다. */
export function runBots(options = {}) {
  return POLICIES.map(policy=>simulate({...options,policy}));
}

if(globalThis.process?.argv?.includes("--timeline")) {
  const results=runBots();
  console.log(JSON.stringify(results.map(result=>({...result,game:undefined,timeline:result.timeline.map(event=>({...event,title:storyEntry(event.id)?.title})),phase:"1차 1~2장; 엔딩 검증 아님"})),null,2));
}
