import { Customer, Zepi } from "./TownArt.jsx";
import { guestAppearance } from "./simulation.js";
import { EVENTS } from "./story.js";

/** 영업 상태를 읽어 비 오는 카페와 단골의 흔적만 표시한다. */
export default function Scene({ game }) {
  const chapter=game.elapsed>=600000?2:1;
  const props=EVENTS.filter(event=>game.seen.includes(event.id)&&event.prop);
  return <div className="rain-scene" data-chapter={chapter}>
    <div className="rain-scene-caption"><span>골목 끝, 아직 불이 켜진 곳</span><span>{chapter===1?"조용한 빗방울":"비가 머무는 오후"}</span></div>
    <svg viewBox="0 0 900 560" role="img" aria-label={`비 오는 골목의 카페, 기다리는 손님 ${game.queue.length}명, 제피가 자동 서빙 중`}>
      <defs><linearGradient id="cafe-wall" x2="0" y2="1"><stop stopColor="#e6d8bc"/><stop offset="1" stopColor="#d2bb97"/></linearGradient><linearGradient id="cafe-night" x2="0" y2="1"><stop stopColor="#637b7a"/><stop offset="1" stopColor="#9ba99a"/></linearGradient><linearGradient id="cafe-light"><stop stopColor="#f7d99c" stopOpacity=".38"/><stop offset="1" stopColor="#f7d99c" stopOpacity="0"/></linearGradient><pattern id="cafe-floor" width="115" height="50" patternUnits="userSpaceOnUse"><rect width="115" height="50" fill="#b49a79"/><path d="M0 0H115M0 0V50" stroke="#987f65" opacity=".45"/></pattern><clipPath id="cafe-window"><path d="M52 250V91Q52 40 155 40T258 91V250Z"/></clipPath></defs>
      <rect width="900" height="400" fill="url(#cafe-wall)"/><path d="M0 352H900V560H0Z" fill="url(#cafe-floor)"/><path d="M0 351H900" stroke="#8c765a" strokeWidth="10"/>
      <path d="M46 256V90Q46 33 155 33T264 90V256Z" fill="#806e55"/>
      <g clipPath="url(#cafe-window)"><rect x="50" y="35" width="210" height="220" fill="url(#cafe-night)"/><path d="M45 170 100 112 150 160 210 100 270 168V260H45" fill="#6d8580"/><path d="M60 202H255M88 150V245M210 130V245" stroke="#9aa997" strokeWidth="3"/>{Array.from({length:16},(_,i)=><path key={i} className="rain-drop" d={`M${60+i*13} ${35+i%4*39}l-5 24`} stroke="#e4e5d1" strokeWidth="2" opacity=".48" style={{animationDelay:`${-i*.17}s`}}/>)}<path d="M155 43V251M55 145H258" stroke="#e3cfac" strokeWidth="7"/></g>
      <path d="M37 42Q61 135 36 270L72 262Q84 149 62 47M277 42Q250 135 277 270L244 262Q233 149 255 47" fill="#98a18a"/>
      <path d="M0 0H900" stroke="#8d795b" strokeWidth="18"/>
      <g transform="translate(339 80)"><rect x="-18" y="-14" width="155" height="102" rx="5" fill="#8b745b"/><rect x="-9" y="-5" width="137" height="84" fill="#3f5149"/><text x="59" y="24" fill="#e9d8b8" fontSize="19" textAnchor="middle" fontFamily="Georgia,serif">Cozy Cafe</text><path d="M13 36H106M13 51H65M13 65H84" stroke="#b4b79c" strokeWidth="2"/><text x="103" y="67" fill="#d3b777" fontSize="11" textAnchor="end">OPEN</text></g>
      <g transform="translate(750 96)"><rect x="-31" y="-37" width="62" height="75" fill="#947858"/><rect x="-24" y="-30" width="48" height="61" fill="#c8b593"/><circle cy="-9" r="12" fill="#e5c39d"/><path d="M-13-11Q-18-31 0-29T13-11" fill="#b6b1a0"/><path d="M-19 27Q-20 4 0 5T19 27" fill="#879781"/></g>
      <g transform="translate(592 51)"><path d="M0-51V0" stroke="#796e52" strokeWidth="3"/><path d="M-43 24Q-31-11 0-13T43 24Z" fill="#7c907c"/><ellipse cy="24" rx="43" ry="9" fill="#edce8d"/><path d="M-36 28-140 340H140L36 28Z" fill="url(#cafe-light)"/></g>
      <g transform="translate(572 226)"><rect x="-75" y="-25" width="150" height="79" rx="8" fill="#8c9a88" stroke="#647867" strokeWidth="3"/><rect x="-62" y="-12" width="124" height="18" rx="3" fill="#b7b39a"/><circle cx="-38" cy="-3" r="4" fill="#f0ce86"/><path d="M-34 15V29M32 15V29" stroke="#4c5e51" strokeWidth="7"/><path d="M-54 47H52" stroke="#bfb59a" strokeWidth="8"/><g className="cafe-steam" fill="none" stroke="#fff3d6" strokeWidth="3"><path d="M-30-39q-10-13 0-26M0-39q-10-13 0-26M30-39q-10-13 0-26"/></g></g>
      <g transform="translate(734 250)"><path d="M-53 0V-59H53V0" fill="#c8c0a5" stroke="#8f846b" strokeWidth="3"/><path d="M-53-59-40-78H39L53-59Z" fill="#e5e0c6"/><path d="M-42-46H40V-7H-42Z" fill="#a7b9ad"/>{[0,1,2].map(i=><ellipse key={i} cx={-26+i*26} cy="-15" rx="10" ry="6" fill="#d1a367"/>)}</g>
      <path d="M403 266H861V398H403Z" fill="#9f7e5f" stroke="#7f664e" strokeWidth="3"/><path d="M391 253H874V272H391Z" fill="#d3b48a" stroke="#8c7256" strokeWidth="3"/><path d="M415 287H850V386H415Z" fill="#ad8d6b"/>{[450,510,570,630,690,750,810].map(x=><path key={x} d={`M${x} 289V383`} stroke="#997b5c" opacity=".5"/>)}
      <g transform="translate(155 320)"><ellipse rx="83" ry="25" fill="#947858"/><path d="M-60 4V74M60 4V74" stroke="#806d54" strokeWidth="9"/><ellipse cy="-4" rx="86" ry="23" fill="#ccb18a"/>{game.read.includes("dalbong-2")&&<path d="M-12-7V-35M-25-24Q-12-49 0-26M-12-35Q0-58 11-36" stroke="#8d9f79" strokeWidth="5" fill="none"/>}</g>
      {game.elapsed>=1950000&&<g transform="translate(846 398)"><path d="M-20 0-16-43H16L20 0" fill="#bd9473"/><path d="M0-45V-110M0-68Q-55-110-34-116T0-80M0-79Q51-130 36-130T0-100" stroke="#809476" strokeWidth="7" fill="none"/></g>}
      {game.read.includes("doyun-2")&&<g transform="translate(335 220)"><rect x="-31" y="-26" width="62" height="50" fill="#f0dfbd" stroke="#9c8263" strokeWidth="3"/><path d="m-20 12 17-28 17 28m-29-2h35" stroke="#a58e71" fill="none"/></g>}
      {game.read.includes("moka-2")&&<ellipse cx="88" cy="452" rx="46" ry="18" fill="#b5bfa2"/>}
      <g transform="translate(740 467)"><Zepi/></g>
      {game.queue.map((order,index)=>{const person=guestAppearance(order);return <g key={order.id} className="cafe-customer" data-guest={order.guest??"walkin"} transform={`translate(${270+index*106} ${494+index%2*16})`}><Customer id={person.id} color={person.color}/></g>;})}
      <g transform="translate(144 460)"><path d="M-18-5H18L14 7H-14Z" fill="#d6c6a7"/><ellipse cy="-5" rx="18" ry="5" fill="#f5e6c8"/></g>
    </svg>
    <div className="cafe-keepsakes" aria-label="카페에 생긴 흔적">{props.slice(-3).map(event=><span key={event.id}>{event.prop}</span>)}</div>
  </div>;
}
