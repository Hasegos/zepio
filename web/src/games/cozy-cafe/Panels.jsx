import { useEffect, useRef, useState } from "react";
import { ACT_COUNTS, FIRST_REGULARS } from "./characters.js";
import { serviceInterval, STAFF, staffCost } from "./economy.js";
import { formatCoins } from "./format.js";
import Icon from "./icons.jsx";
import { availableMenus, MENUS, RECIPES } from "./recipes.js";
import { CHOICES, storyEntry } from "./story.js";
import { Customer } from "./TownArt.jsx";

/** 주문별 기다림과 서빙할 메뉴를 보여준다. */
export function Orders({ game }) {
  return <div className="cafe-orders" aria-label="기다리는 주문">
    {game.queue.length?game.queue.map(order=><article key={order.id} className="cafe-order"><div className="cafe-order-head"><strong>{order.name}</strong><span>#{order.id}</span></div><div className="cafe-order-menu"><Icon id={order.menu}/><span>{MENUS.find(menu=>menu.id===order.menu)?.name}</span></div><div className="cafe-patience" role="progressbar" aria-label={`${order.name} 인내심`} aria-valuemin={0} aria-valuemax={order.patience} aria-valuenow={Math.max(0,order.remaining)}><span style={{width:`${Math.max(0,order.remaining/order.patience*100)}%`}}/></div></article>):<p className="cafe-empty">따뜻한 잔을 준비하는 사이, 다음 발소리가 다가와요.</p>}
  </div>;
}

/** 준비 메뉴와 직원·두 가지 운영 선택을 제공한다. */
export function Management({ game, send }) {
  const known=availableMenus(game);
  return <div className="cafe-management">
    <section><h3>오늘의 메뉴판 <small>준비할 수 있는 메뉴는 네 칸</small></h3><div className="cafe-loadout">{game.menus.map((id,slot)=><label key={slot}><span>{slot+1}번 메뉴</span><select aria-label={`${slot+1}번 메뉴`} value={id} onChange={event=>send({type:"menu",slot,id:event.target.value})}>{known.map(menu=><option key={menu.id} value={menu.id} disabled={game.menus.includes(menu.id)&&menu.id!==id}>{menu.name}</option>)}</select></label>)}</div><p className="cafe-hint">메뉴를 바꿔도 이미 받은 주문은 아래 서빙 버튼으로 마저 전할 수 있어요.</p></section>
    <section><h3>함께 거는 앞치마 <small>제피가 처음부터 음료를 도와줘요</small></h3><div className="cafe-staff-list">{STAFF.map(job=><article key={job.id}><div><strong>{job.name} <em>{game.staff[job.id]}명</em></strong><p>{job.desc}</p><small>{job.interval?`현재 ${Number.isFinite(serviceInterval(game,job.id))?(serviceInterval(game,job.id)/1000).toFixed(1):"—"}초마다 1건 · 자동 매출 75% · 팁 없음`:"빠른 주문 회전보다 편안한 기다림"}</small></div><button type="button" disabled={game.elapsed<300000||game.staff[job.id]>=3} aria-disabled={game.coins<staffCost(game,job.id)} onClick={()=>send({type:"hire",role:job.id})}>{game.staff[job.id]>=3?"함께하는 중":game.elapsed<300000?"5분에 소개":`${formatCoins(staffCost(game,job.id))} 코인`}</button></article>)}</div></section>
    <section><h3>우리 카페의 마음 <small>첫 선택 무료 · 변경은 30코인</small></h3>{CHOICES.map(choice=><div key={choice.id} className="cafe-choice"><h4>{choice.title}</h4>{game.elapsed<choice.at?<p className="cafe-hint">{Math.ceil(choice.at/60000)}분에 제피가 함께 고민해 줘요.</p>:<div>{choice.options.map(option=><button type="button" key={option.id} aria-pressed={game.choices[choice.id]===option.id} onClick={()=>send({type:"choice",id:choice.id,option:option.id})}><strong>{option.name}</strong><small>{option.desc}</small></button>)}</div>}</div>)}</section>
  </div>;
}

/** 발견한 조합과 실패해도 소비되지 않는 레시피 실험을 보여준다. */
export function Notebook({ game, send }) {
  const [pair,setPair]=useState([]);
  if(game.elapsed<90000) return <div className="cafe-notebook"><Icon id="book" size={58}/><h3>아직 서랍 속에</h3><p>1분 30초에 할머니의 노트를 발견해요.<br/>지금은 첫 손님에게 따뜻한 잔을 전해 주세요.</p></div>;
  return <div className="cafe-notebook"><p className="cafe-eyebrow">GRANDMA’S RECIPE BOOK</p><h3>적지 않은 재료, 잊지 못한 맛</h3><p>알고 있는 메뉴 두 가지를 골라 맛을 이어 보세요.<br/>실패해도 재료나 코인을 잃지 않아요.</p><div className="cafe-ingredients">{availableMenus(game).filter(menu=>!menu.hidden).map(menu=><button key={menu.id} type="button" aria-pressed={pair.includes(menu.id)} onClick={()=>setPair(pair.includes(menu.id)?pair.filter(id=>id!==menu.id):pair.length<2?[...pair,menu.id]:[pair[1],menu.id])}><Icon id={menu.id}/>{menu.name}</button>)}</div><button type="button" className="cafe-primary" disabled={pair.length!==2} onClick={()=>send({type:"recipe",pair})}>두 맛 이어 보기</button><div className="cafe-recipe-pages">{RECIPES.filter(recipe=>recipe.id==="cloud"||game.elapsed>=1200000).map(recipe=><article key={recipe.id}><span>{game.discovered.includes(recipe.id)?"발견한 레시피":"할머니의 수수께끼"}</span><h4>{game.discovered.includes(recipe.id)?MENUS.find(menu=>menu.id===recipe.id).name:"아직 이름 없는 맛"}</h4><p>{recipe.hint}</p>{game.discovered.includes(recipe.id)&&<small>{recipe.note}</small>}</article>)}</div></div>;
}

/** 단골의 서빙 기록과 잠금 조건, 읽을 사연을 보여준다. */
export function StoryShelf({ game, onOpen }) {
  return <div className="cafe-story-shelf">{FIRST_REGULARS.map(person=>{
    const introduced=person.id==="doyun"||game.elapsed>=(person.id==="dalbong"?120000:420000);
    return <article key={person.id} className="cafe-person"><div className="cafe-person-head"><svg viewBox="-43 -120 86 130" width="54" height="80" aria-hidden="true"><Customer id={person.id} color={person.color}/></svg><div><h3>{introduced?person.name:"문밖의 발소리"}</h3><p>{introduced?`${person.job} · ${MENUS.find(menu=>menu.id===person.menu).name}`:"아직 만나지 않은 이웃"}</p><small>{introduced?person.greeting:"빈 의자를 하나 남겨 둘까요?"}</small></div></div><div className="cafe-acts">{person.acts.map((act,index)=>{const id=`${person.id}-${index}`;return <button type="button" key={id} disabled={!game.seen.includes(id)} onClick={()=>onOpen(id)}><span>{index+1}막 · {game.seen.includes(id)?act.title:`서빙 ${ACT_COUNTS[index]}회`}</span><small>{game.read.includes(id)?"읽은 사연":game.seen.includes(id)?"새 사연 읽기":`${game.counts[person.id]}/${ACT_COUNTS[index]}`}</small></button>;})}</div><p className="cafe-reward">{game.read.includes(`${person.id}-2`)?"마음에 남은 선물":"사연 완결 보상"} · {person.reward}</p></article>;
  })}<section className="cafe-letterbox"><h3>골목에서 온 쪽지</h3>{game.seen.filter(id=>storyEntry(id)?.kind!=="act").map(id=><button type="button" key={id} onClick={()=>onOpen(id)}><span>{storyEntry(id)?.title}</span><small>{game.read.includes(id)?"다시 읽기":"새 쪽지"}</small></button>)}</section></div>;
}

/** 대화창 안에 초점을 가두고 닫을 때 이전 조작으로 돌려준다. */
export function Dialog({ title, onClose, children }) {
  const box=useRef(null);
  const heading=useRef(null);
  const close=useRef(onClose);
  useEffect(()=>{close.current=onClose;});
  useEffect(()=>{
    const before=document.activeElement;
    heading.current?.focus();
    /** Escape와 Tab의 대화창 초점을 처리한다. */
    function onKey(event) {
      if(event.key==="Escape") close.current();
      if(event.key!=="Tab") return;
      const controls=[...box.current.querySelectorAll('button:not(:disabled), [href], select, [tabindex="0"]')];
      const first=controls[0];const last=controls.at(-1);
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===heading.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===heading.current)){event.preventDefault();first?.focus();}
    }
    document.addEventListener("keydown",onKey);
    return ()=>{document.removeEventListener("keydown",onKey);before?.focus?.();};
  },[]);
  return <div className="cafe-modal-backdrop"><div ref={box} role="dialog" aria-modal="true" aria-labelledby="cafe-dialog-title" className="cafe-modal"><h2 ref={heading} id="cafe-dialog-title" tabIndex={-1}>{title}</h2>{children}</div></div>;
}
