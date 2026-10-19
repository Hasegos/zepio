import { FIRST_REGULARS } from "./characters.js";
import { MENUS, availableMenus } from "./recipes.js";
import { CHOICES, EVENTS, refreshStory, storyEntry } from "./story.js";
import { initialSimulation } from "./simulation.js";

/** 유한한 0 이상 숫자를 상한 안으로 정리한다. */
function number(value, max = 1e12, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.min(max, value) : fallback;
}

/** 알려진 문자열만 중복 없이 읽는다. */
function strings(value, known) {
  return Array.isArray(value) ? [...new Set(value)].filter((id) => typeof id === "string" && known.includes(id)) : [];
}

/** 경제와 사연은 보존하고 손상된 주문·참조는 독립적으로 복원한다. */
export function parseSave(data, now) {
  const fresh = initialSimulation(now);
  if (!data || typeof data !== "object") return fresh;
  if (data.v === 1) {
    const coins = number(data.coins, 1e18);
    return { ...fresh, coins, total: Math.max(coins, number(data.total,1e18)), legacy: { coins, total: number(data.total,1e18), levels: Object.fromEntries(["espresso","oven","terrace","beans","marketing"].map((id)=>[id,Math.floor(number(data.levels?.[id],1000))])), staff: Math.floor(number(data.staff,1000)) } };
  }
  if (data.v !== 2) return fresh;
  let state = { ...fresh, coins: number(data.coins,1e18), total: Math.max(number(data.coins,1e18),number(data.total,1e18)), elapsed: number(data.elapsed,365*86400000), remainder: number(data.remainder,999), lastAt: number(data.lastAt,Number.MAX_SAFE_INTEGER,now), startedAt: number(data.startedAt,now,now), brandPoints: Math.floor(number(data.brandPoints,1000000)), legacy: data.legacy && typeof data.legacy === "object" ? { coins:number(data.legacy.coins,1e18),total:number(data.legacy.total,1e18),staff:number(data.legacy.staff,1000),levels:Object.fromEntries(["espresso","oven","terrace","beans","marketing"].map(id=>[id,number(data.legacy.levels?.[id],1000)])) } : null };
  if (typeof data.lastAt !== "number" || !Number.isFinite(data.lastAt) || data.lastAt < 0) state.lastAt = now;
  state.startedAt = Math.min(state.startedAt,state.lastAt);
  state.staff = { barista: Math.max(1,Math.floor(number(data.staff?.barista,3,1))), patissier: Math.floor(number(data.staff?.patissier,3)), server: Math.floor(number(data.staff?.server,3)) };
  state.discovered = strings(data.discovered,MENUS.filter(menu=>menu.hidden).map(menu=>menu.id));
  const menus = strings(data.menus,availableMenus(state).map(menu=>menu.id)).slice(0,4);
  state.menus = [...menus,...fresh.menus.filter(id=>!menus.includes(id))].slice(0,4);
  state.counts = Object.fromEntries(FIRST_REGULARS.map(person=>[person.id,Math.floor(number(data.counts?.[person.id],1000000))]));
  const validStory = [...EVENTS.map(event=>event.id),...FIRST_REGULARS.flatMap(person=>[0,1,2].map(act=>`${person.id}-${act}`))];
  state = refreshStory({ ...state, seen: [], inbox: [], timeline: [] });
  state.read = strings(data.read,state.seen);
  state.inbox = state.seen.filter(id=>!state.read.includes(id));
  for (const choice of CHOICES) if (state.elapsed>=choice.at && choice.options.some(option=>option.id===data.choices?.[choice.id])) state.choices[choice.id]=data.choices[choice.id];
  state.timeline = Array.isArray(data.timeline) ? data.timeline.filter(event=>event&&(state.seen.includes(event.id)||state.discovered.some(id=>event.id===`recipe-${id}`))&&(validStory.includes(event.id)||state.discovered.some(id=>event.id===`recipe-${id}`))&&Number.isFinite(event.at)&&event.at>=0&&event.at<=state.elapsed).filter((event,index,list)=>list.findIndex(item=>item.id===event.id)===index).map(event=>({id:event.id,at:event.at,kind:storyEntry(event.id)?.kind??"event"})) : [];
  state.latest = state.seen.includes(data.latest) ? data.latest : state.seen.at(-1);
  for (const key of ["served","directServed","autoServed","missed","tips","nextOrder","bestCombo"]) state[key] = Math.floor(number(data[key],1e12,fresh[key]));
  state.combo = Math.floor(number(data.combo,5));
  state.nextOrder = Math.max(1,state.nextOrder);
  state.arrivalIn = Math.max(1,number(data.arrivalIn,8000,1000));
  for (const role of ["barista","patissier"]) state.autoIn[role] = Math.max(1,number(data.autoIn?.[role],14000,fresh.autoIn[role]));
  const knownMenus=MENUS.map(menu=>menu.id);
  const queue=Array.isArray(data.queue)?data.queue:[];
  state.queue=queue.filter(order=>order&&Number.isSafeInteger(order.id)&&order.id>0&&order.id<state.nextOrder&&knownMenus.includes(order.menu)&&(order.guest===null||FIRST_REGULARS.some(p=>p.id===order.guest))&&Number.isFinite(order.remaining)&&order.remaining>0&&order.remaining<=120000&&Number.isFinite(order.patience)&&order.patience>=order.remaining&&order.patience<=120000).filter((order,index,list)=>list.findIndex(item=>item.id===order.id)===index).slice(0,4).map(order=>({id:order.id,guest:order.guest,menu:order.menu,name:FIRST_REGULARS.find(p=>p.id===order.guest)?.name??"골목 손님",remaining:order.remaining,patience:order.patience}));
  return state;
}
