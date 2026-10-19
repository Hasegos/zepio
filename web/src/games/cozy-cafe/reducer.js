import { hireStaff } from "./economy.js";
import { discoverRecipe, setMenu } from "./recipes.js";
import { parseSave } from "./save.js";
import { advanceSimulation, initialSimulation, serveOrder } from "./simulation.js";
import { choose } from "./story.js";

/** 게임 상태와 화면 전용 알림을 함께 만든다. */
export function initialState(now) {
  return { game: initialSimulation(now), away: null, notice: "", noticeId: 0 };
}

/** 흐른 시간을 조작 전에 정산하고 복귀 요약은 한 번만 만든다. */
function settle(state, now, offline = false) {
  const result = advanceSimulation(state.game, now);
  return { ...state, game: result.state, away: offline && result.elapsed >= 60000 ? { earned:result.earned,ms:result.elapsed,served:result.served } : state.away };
}

/** 주문·편성·발견·사연 읽기를 단일 상태 전이로 처리한다. */
export function reducer(state, action) {
  if (action.type === "load") return settle({ ...initialState(action.now), game: parseSave(action.data,action.now) },action.now,true);
  if (action.type === "dismissAway") return { ...state, away:null };
  if (action.type === "read") {
    if (!state.game.seen.includes(action.id) || state.game.read.includes(action.id)) return state;
    return { ...state, game:{ ...state.game,read:[...state.game.read,action.id],inbox:state.game.inbox.filter(id=>id!==action.id) } };
  }
  if (action.type === "reset") return initialState(action.now);
  const next=settle(state,action.now,action.type==="resume");
  let game=next.game;
  let notice="";
  switch(action.type) {
    case "tick": case "resume": return next;
    case "serve": {
      game=serveOrder(game,action.menu);
      notice=game===next.game?"이 메뉴를 기다리는 주문이 없어요.":`따뜻하게 전했어요 · 콤보 x${game.combo}`;
      break;
    }
    case "menu": game=setMenu(game,action.slot,action.id); notice=game===next.game?"이미 준비했거나 아직 열리지 않은 메뉴예요.":"메뉴판을 바꿨어요. 접수한 주문은 바꾸기 전 메뉴로도 마저 서빙할 수 있어요."; break;
    case "hire": game=hireStaff(game,action.role); notice=game===next.game?"직원 소개는 5분에 열려요. 코인과 최대 인원도 확인해 주세요.":"새 앞치마가 걸렸어요."; break;
    case "choice": game=choose(game,action.id,action.option); notice=game===next.game?"선택 조건이나 변경 비용 30코인을 확인해 주세요.":"메뉴판에 우리의 마음을 적었어요."; break;
    case "recipe": { const result=discoverRecipe(game,action.pair); game=result.state; notice=result.message; if(game!==next.game) game={...game,timeline:[...game.timeline,{id:`recipe-${game.discovered.at(-1)}`,at:game.elapsed,kind:"recipe"}]}; break; }
    default: return state;
  }
  return { ...next,game,notice,noticeId:next.noticeId+1 };
}
