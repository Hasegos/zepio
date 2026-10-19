import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getGameData, saveGameData } from "../../lib/storage.js";
import { FIRST_REGULARS } from "./characters.js";
import { formatCoins, formatSpan } from "./format.js";
import Icon from "./icons.jsx";
import meta from "./meta.js";
import { Dialog, Management, Notebook, Orders, StoryShelf } from "./Panels.jsx";
import { menuById } from "./recipes.js";
import { initialState, reducer } from "./reducer.js";
import Scene from "./Scene.jsx";
import { storyEntry } from "./story.js";
import { Zepi } from "./TownArt.jsx";
import "./cozy-cafe.css";

const TABS=[{id:"manage",name:"카페 운영"},{id:"regulars",name:"단골의 이야기"},{id:"notebook",name:"레시피 노트"}];

/** 이 브라우저의 기록을 복구하고 복귀 수익을 한 번 정산한다. */
function load() {
  const now=Date.now();
  return reducer(initialState(now),{type:"load",data:getGameData(meta.id),now});
}

/** 비 오는 골목의 주문·이야기·운영 화면을 연결한다. */
export default function CozyCafe() {
  const [state,dispatch]=useReducer(reducer,undefined,load);
  const [tab,setTab]=useState("manage");
  const [opened,setOpened]=useState(null);
  const [settings,setSettings]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [paused,setPaused]=useState(document.visibilityState==="hidden");
  const latest=useRef(state);
  const {game}=state;
  useEffect(()=>{latest.current=state;});
  const persist=useCallback(()=>saveGameData(meta.id,Date.now(),latest.current.game),[]);
  useEffect(()=>{
    persist();
    let tick;
    /** 숨김 상태에서는 영업 틱을 멈춘다. */
    function start(){clearInterval(tick);if(document.visibilityState!=="hidden")tick=setInterval(()=>dispatch({type:"tick",now:Date.now()}),250);}
    /** 숨김 저장과 복귀 정산을 처리한다. */
    function visibility(){const hidden=document.visibilityState==="hidden";setPaused(hidden);if(hidden)persist();else dispatch({type:"resume",now:Date.now()});start();}
    start();
    const autosave=setInterval(()=>{if(document.visibilityState!=="hidden")persist();},10000);
    document.addEventListener("visibilitychange",visibility);
    window.addEventListener("pagehide",persist);
    window.addEventListener("pageshow",visibility);
    return ()=>{clearInterval(tick);clearInterval(autosave);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",persist);window.removeEventListener("pageshow",visibility);persist();};
  },[persist]);
  useEffect(()=>{persist();},[game.served,game.read,game.menus,game.staff,game.choices,game.discovered,persist]);
  /** 조작 시각은 화면에서만 읽어 순수 상태 전이에 전달한다. */
  function send(action){dispatch({...action,now:Date.now()});}
  /** 관리 탭을 키보드로 선택하고 초점을 옮긴다. */
  function tabKey(event){const step={ArrowRight:1,ArrowLeft:-1}[event.key];if(!step)return;event.preventDefault();const next=TABS[(TABS.findIndex(t=>t.id===tab)+step+TABS.length)%TABS.length];setTab(next.id);document.getElementById(`rain-tab-${next.id}`)?.focus();}
  const entry=opened?storyEntry(opened):null;
  const featured=storyEntry(game.latest);
  const serving=[...new Set([...game.menus,...game.queue.map(order=>order.menu)])];
  return <section className="cozy-cafe" data-paused={paused} aria-label="Cozy Cafe 비 오는 골목의 마지막 카페">
    <header className="cafe-topbar"><div><p className="cafe-eyebrow">THE LAST CAFE ON A RAINY LANE</p><h2>Cozy Cafe <span>비 오는 골목의 마지막 카페</span></h2></div><div className="cafe-wallet"><span>오늘의 카페 금고</span><strong aria-label={`보유 코인 ${formatCoins(game.coins)}`}>{formatCoins(game.coins)}<small>코인</small></strong></div><button type="button" className="cafe-settings-toggle" aria-label="설정" aria-expanded={settings} onClick={()=>setSettings(!settings)}>···</button></header>
    {settings&&<div className="cafe-settings"><h3>이 브라우저의 카페</h3><p>기록은 자동 저장돼요. 초기화하면 이야기와 코인을 되돌릴 수 없어요.</p>{confirm?<><button type="button" onClick={()=>{send({type:"reset"});setConfirm(false);setSettings(false);}}>정말 초기화</button><button type="button" onClick={()=>setConfirm(false)}>취소</button></>:<button type="button" onClick={()=>setConfirm(true)}>저장 초기화</button>}</div>}
    <div className="cafe-layout"><div className="cafe-play"><div className="cafe-chapter"><div><span className="cafe-eyebrow">CHAPTER {game.elapsed>=600000?"02":"01"}</span><h3>{game.elapsed>=600000?"비 오는 골목":"문 여는 날"}</h3></div><span>{formatSpan(game.elapsed)}의 기억</span></div>
      <Scene game={game}/>
      <div className="cafe-service-heading"><h3>지금, 따뜻한 한 잔</h3><span className="cafe-combo" data-active={game.combo>1}>COMBO <b>x{game.combo||1}</b><small>최대 x5</small></span></div>
      <Orders game={game}/>
      <div className="cafe-serve-buttons" aria-label="메뉴 서빙">{serving.map(id=>{const menu=menuById(id);const pending=game.queue.some(order=>order.menu===id);return <button type="button" key={id} data-ready={pending} aria-label={`${menu.name} 서빙`} onClick={()=>send({type:"serve",menu:id})}><Icon id={id} size={40}/><span>{menu.name}</span><small>{pending?"기다리는 손님에게 전하기":"주문을 기다리는 중"}</small></button>;})}</div>
      <p className="cafe-service-note">주문과 같은 메뉴를 눌러 주세요. 놓쳐도 콤보만 쉬어 가요.<br/>제피와 직원은 자동 서빙해요. 직접 전하면 콤보와 팁을 받아요.</p>
      {featured&&<button type="button" className="cafe-featured" onClick={()=>setOpened(featured.id)}><span className="cafe-zepi-mini"><svg viewBox="-48 -100 96 108" aria-hidden="true"><Zepi/></svg></span><span><small>{game.read.includes(featured.id)?"책갈피에 남은 이야기":"새로 도착한 이야기"}</small><strong>{featured.title}</strong><span>{featured.text.split("\n")[0]}</span></span><b>읽기 →</b></button>}
      {state.notice&&<p role="status" className="cafe-notice" key={state.noticeId}>{state.notice}</p>}
      {game.legacy&&<p className="cafe-legacy">이전 카페의 코인과 설비·직원 기록을 보관했어요. 금고는 이어받고, 이야기는 첫날부터 시작해요.</p>}
      {game.elapsed>=2400000&&<div className="cafe-phase-end"><h3>골목에 남은 불빛</h3><p>여기까지가 1차 공개된 1~2장의 이야기예요. 단골 사연과 레시피는 계속 모을 수 있어요. 소문·위기·투자 제안과 엔딩은 2차에서 이어집니다.</p></div>}
    </div><aside className="cafe-sidebar" aria-label="카페 이야기와 운영"><div className="cafe-sidebar-title"><span className="cafe-eyebrow">ONE CUP, ONE LITTLE STORY</span><h3>다시 와 줄 사람이 있는 곳</h3><p>빈 의자가 하나씩, 누군가의 자리가 돼요.</p></div><div className="cafe-tabs" role="tablist" aria-label="카페 관리">{TABS.map(t=><button key={t.id} id={`rain-tab-${t.id}`} type="button" role="tab" aria-selected={tab===t.id} tabIndex={tab===t.id?0:-1} aria-controls="rain-panel" onClick={()=>setTab(t.id)} onKeyDown={tabKey}>{t.name}{t.id==="regulars"&&game.inbox.length>0&&<span className="cafe-unread">{game.inbox.length}</span>}</button>)}</div><div id="rain-panel" role="tabpanel" aria-labelledby={`rain-tab-${tab}`}>{tab==="manage"?<Management game={game} send={send}/>:tab==="regulars"?<StoryShelf game={game} onOpen={setOpened}/>:<Notebook game={game} send={send}/>}</div></aside></div>
    <footer className="cafe-footer"><span>직접 전한 잔 {game.directServed} · 직원이 전한 잔 {game.autoServed}</span><span>잠시 떠나도 최대 8시간, 이야기와 함께 기다릴게요.</span></footer>
    {entry&&!state.away&&<Dialog title={entry.title} onClose={()=>setOpened(null)}><p className="cafe-dialog-speaker">{entry.speaker}</p>{entry.text.split("\n").map(line=><p className="cafe-dialog-line" key={line}>{line}</p>)}{entry.act===2&&<p className="cafe-story-gift">마음에 남는 선물 · {FIRST_REGULARS.find(person=>person.id===entry.person)?.reward}</p>}<button type="button" className="cafe-primary" onClick={()=>{send({type:"read",id:entry.id});setOpened(null);}}>마음에 담기</button><button type="button" className="cafe-text-button" onClick={()=>setOpened(null)}>나중에 읽기</button></Dialog>}
    {state.away&&<Dialog title="카페는 불을 켜 두었어요" onClose={()=>send({type:"dismissAway"})}><p className="cafe-away-coins">+{formatCoins(state.away.earned)} 코인</p><p>{formatSpan(state.away.ms)} 동안 직원이 {state.away.served}잔을 전했어요. 수익은 이미 금고에 한 번 반영했어요.</p><p>읽지 않은 이야기는 단골의 이야기 탭에서 기다려요. 최대 8시간까지 계산해요.</p><button type="button" className="cafe-primary" onClick={()=>send({type:"dismissAway"})}>기다려 줘서 고마워</button></Dialog>}
  </section>;
}
