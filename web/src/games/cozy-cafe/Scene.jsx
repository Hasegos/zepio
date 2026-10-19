import { useState } from "react";
import { PLOTS } from "./simulation.js";
import { Building, Resident, Tree } from "./TownArt.jsx";
import { buildingIncome, plotUnlocked, STATIONS, stationCost } from "./economy.js";
import { formatCoins, formatRate } from "./format.js";

/** 성장한 건물과 연결 도로, 전신 주민을 하나의 마을 좌표계에 그린다. */
export default function Scene({ econ, sim, dispatch }) {
  const [selected, setSelected] = useState("espresso");
  const station = STATIONS.find((s) => s.id === selected);
  const level = econ.levels[selected];
  const open = plotUnlocked(econ, selected);
  const road = `M0 400H${econ.levels.terrace ? 1000 : econ.levels.oven || econ.levels.beans || econ.levels.marketing ? 560 : 310}${econ.levels.beans || econ.levels.marketing ? "M500 400V610M210 610H800" : ""}`;
  const items = PLOTS.filter((p) => econ.levels[p.id] > 0).map((p) => ({ y: p.y, key: p.id, node: <g transform={`translate(${p.x} ${p.y})`}><Building index={PLOTS.indexOf(p)} level={econ.levels[p.id]} manager={econ.managers?.[p.id]}/></g> }));
  sim.guests.forEach((g) => items.push({ y: g.y, key: `resident-${g.id}`, node: <g data-actor={`resident-${g.id}`} transform={`translate(${g.x.toFixed(2)} ${g.y.toFixed(2)})`}><Resident {...g}/></g> }));
  PLOTS.filter((p) => econ.managers?.[p.id]).forEach((p,i)=>items.push({y:p.y+25,key:`manager-${p.id}`,node:<g transform={`translate(${p.x+48} ${p.y+25})`}><Resident id={i} manager/></g>}));
  const trees = [[48,264],[925,252],[930,360],[48,495],[112,576],[885,566],[80,365],[903,660],[62,656]];
  trees.forEach(([x,y],i)=>items.push({y,key:`tree-${i}`,node:<Tree x={x} y={y} small={i%3===0}/>}));
  return <div className="town-stage">
    <div className="town-map-heading"><span>COZY VILLAGE</span><span>주민 {sim.guests.length} · 방문 {sim.visits}회</span></div>
    <div className="town-map" role="region" aria-label="마을 지도 · 작은 화면에서는 좌우로 이동"><div className="town-map-canvas">
      <svg viewBox="0 0 1000 700" role="img" aria-label={`카페 마을 지도, 건물 ${PLOTS.filter(p=>econ.levels[p.id]>0).length}개, 주민 ${sim.guests.length}명`}>
        <defs><linearGradient id="town-ground" x2="0" y2="1"><stop stopColor="#d7e0b9"/><stop offset="1" stopColor="#adc48e"/></linearGradient><pattern id="town-meadow" width="43" height="37" patternUnits="userSpaceOnUse"><path d="m9 22 2-4 2 4m20 9 2-3" stroke="#829f70" opacity=".22" fill="none"/></pattern><pattern id="town-stones" width="31" height="24" patternUnits="userSpaceOnUse"><path d="M0 12H31M15 0V12M4 12V24" stroke="#bea984" strokeWidth="1" opacity=".24"/></pattern></defs>
        <rect width="1000" height="700" fill="url(#town-ground)"/><rect width="1000" height="700" fill="url(#town-meadow)"/>
        <path d="M-30 80Q160 130 350 70T740 83 1060 20" fill="none" stroke="#98bfb6" strokeWidth="100"/><path d="M-30 80Q160 130 350 70T740 83 1060 20" fill="none" stroke="#c4dcd0" strokeWidth="72"/><path d="M0 71Q160 121 350 61T740 74 1000 20" fill="none" stroke="#e4eee0" strokeWidth="3" strokeDasharray="40 28"/>
        {[70,180,300,430,550,700,810,940].map((x,i)=><Tree key={x} x={x} y={130+i%3*17} small/>)}
        <path d={road} stroke="#9eaa7f" strokeWidth="53" fill="none" strokeLinecap="round"/><path d={road} stroke="#e1cfaa" strokeWidth="44" fill="none" strokeLinecap="round"/>
        <path d={road} stroke="url(#town-stones)" strokeWidth="40" fill="none"/>
        {PLOTS.map((p)=><g key={p.id}>
          <path d={`M${p.x} ${p.road}V${p.y}`} stroke={econ.levels[p.id]?"#e1cfaa":"#c1c99f"} strokeWidth="23" strokeDasharray={econ.levels[p.id]?undefined:"5 7"}/>
          {!econ.levels[p.id]&&<g opacity={plotUnlocked(econ,p.id)?1:.6}><path d={`M${p.x-89} ${p.y-8}v-85h178v85Z`} fill="#c3cc9f" stroke="#91a277" strokeWidth="2" strokeDasharray="7 7"/><path d={`M${p.x-58} ${p.y-40}v-30h116v30`} fill="#d8c6a2" stroke="#ad9873" strokeWidth="3"/><text x={p.x} y={p.y-50} textAnchor="middle" fill="#667353" fontSize="14">{plotUnlocked(econ,p.id)?"새 부지 OPEN":"다음 이야기"}</text></g>}
        </g>)}
        <ellipse cx={PLOTS.find(p=>p.id===selected).x} cy={PLOTS.find(p=>p.id===selected).y+8} rx="103" ry="24" fill="none" stroke="#fff4c9" strokeWidth="3" strokeDasharray="5 5"/>
        {items.sort((a,b)=>a.y-b.y).map((item)=><g key={item.key}>{item.node}</g>)}
        <g transform="translate(70 420)"><path d="M0 0V-43M-30-39H32V-16H-30Z" fill="#f0debc" stroke="#947c58" strokeWidth="3"/><text y="-23" textAnchor="middle" fontSize="12" fill="#746346" fontWeight="700">WELCOME</text></g>
        <g transform="translate(930 444)"><path d="M0 0V-64" stroke="#726c52" strokeWidth="4"/><path d="M-9-64Q0-80 9-64V-51H-9Z" fill="#f5deb0" stroke="#726c52" strokeWidth="2"/></g>
      </svg>
      {PLOTS.map((p,i)=><button key={p.id} type="button" className="town-plot-label" data-selected={selected===p.id} style={{left:`${p.x/10}%`,top:`${(p.y-180)/7}%`}} aria-pressed={selected===p.id} onClick={()=>setSelected(p.id)}><span>{econ.levels[p.id]?`${STATIONS[i].name} · Lv.${econ.levels[p.id]}`:plotUnlocked(econ,p.id)?`＋ ${STATIONS[i].name}`:"잠긴 부지"}</span></button>)}
    </div></div>
    <div className="town-selection"><div><span className="cafe-eyebrow">{level?"YOUR LITTLE BUSINESS":"A NEW CHAPTER"}</span><h4>{station.name} {level>0&&`Lv.${level}`}</h4><p>{level?`자동 생산 +${formatRate(buildingIncome(econ,selected))}/초 · ${selected === "terrace" ? "5레벨: 꽃이 피는 정원 + 다음 부지 개방" : level<5?(selected === "marketing" ? "5레벨: 2층 상점으로 증축" : "5레벨: 2층 증축 + 다음 부지 개방"):level<10?"10레벨: 별채 증축":"별채와 함께 번창하는 가게"}`:open?"새 가게를 지으면 마을과 도로가 확장돼요.":`${STATIONS[PLOTS.findIndex(p=>p.id===selected)-1]?.name} 5레벨에 개방돼요.`}</p></div><button type="button" className="cafe-buy" disabled={!open} aria-disabled={econ.coins<stationCost(selected,level)} onClick={()=>dispatch({type:"station",id:selected,now:Date.now()})}><span>{level?"증축":"건설"} · {formatCoins(stationCost(selected,level))}</span><small>{!open?"부지 잠김":econ.coins<stationCost(selected,level)?"코인을 더 모아 주세요":"마을 키우기"}</small></button></div>
  </div>;
}
