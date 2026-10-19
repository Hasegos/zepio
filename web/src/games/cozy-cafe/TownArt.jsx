const COLORS = ["#719481", "#d69b7c", "#8ca66d", "#aa8b73", "#788da6"];

/** 같은 원근과 재질로 마을 건물과 증축 단계를 그린다. */
export function Building({ index = 0, level = 1, manager = false }) {
  const color = COLORS[index];
  const tall = level >= 5;
  if (index === 2) return <g stroke="#546e56" strokeWidth="2" strokeLinejoin="round"><ellipse cy="-3" rx="94" ry="29" fill="#afc38b" stroke="none"/><path d="M-72-4Q0-47 72-4" fill="none" stroke="#e9d8b6" strokeWidth="17"/><path d="M-50-4V-70Q0-108 50-70V-4M-50-53H50" fill="none" strokeWidth="7"/><path d="M-54-64Q0-102 54-64" stroke="#819a68" strokeWidth="18" fill="none"/><ellipse cy="-13" rx="25" ry="10" fill="#a8d3cf"/><path d="M0-18V-48M-12-44Q0-60 12-44" stroke="#d4e8e0" strokeWidth="6" fill="none"/>{[-69,69].map((x)=><g key={x} transform={`translate(${x} -4)`}><path d="M-10 0-8-21H8L10 0" fill="#cc9479"/><circle cy="-34" r={tall?24:17} fill="#7f9c6d"/>{tall&&<circle cy="-38" r="6" fill="#e8bb9c"/>}</g>)}</g>;
  return <g stroke="#665748" strokeWidth="2" strokeLinejoin="round">
    <ellipse cy="4" rx="101" ry="23" fill="#61715b" opacity=".15" stroke="none"/>
    <path d={`M-78 0V-${tall?151:105}H58V0Z`} fill="#f3e2c2"/>
    <path d={`M58 0 85-17V-${tall?164:118}L58-${tall?151:105}Z`} fill="#dbc5a3"/>
    <path d={`M-91-${tall?145:99} -18-${tall?191:145} 72-${tall?145:99}Z`} fill={color}/>
    <path d={`M-18-${tall?191:145} 10-${tall?204:158} 97-${tall?158:112} 72-${tall?145:99}Z`} fill={color} style={{filter:"brightness(.85)"}}/>
    <path d={`M37-${tall?174:128}V-${tall?204:158}H53V-${tall?166:120}`} fill="#d5a88b"/>
    <g className="town-smoke" fill="#fff5e0" stroke="none" opacity=".65"><ellipse cx="45" cy={tall?-221:-175} rx="7" ry="10"/><ellipse cx="51" cy={tall?-239:-193} rx="10" ry="7"/></g>
    {tall&&[-48,12].map((x)=><g key={x}><rect x={x} y="-132" width="29" height="30" rx="12" fill="#a5c4bd"/><path d={`M${x+14}-130V-104M${x+2}-117H${x+27}`} stroke="#f7ead0"/><path d={`M${x-4}-98H${x+32}`} stroke={color} strokeWidth="7"/></g>)}
    <rect x="-60" y="-64" width="43" height="40" rx="3" fill="#a5c4bd"/><path d="M-39-62V-25M-59-44H-18" stroke="#fff0d4"/>
    <path d="M13 0V-53Q13-68 29-68T45-53V0" fill="#8c6c52"/><path d="M20-49Q29-60 38-49V-27H20Z" fill="#b3cfc4"/><circle cx="37" cy="-16" r="2" fill="#eac97d"/>
    <path d="M-85-82H64L70-65H-91Z" fill={color}/>
    {[-80,-50,-20,10,40].map((x)=><path key={x} d={`M${x}-81h14l5 16h-19z`} fill="#fff0d2" stroke="none"/>)}
    <rect x="-47" y="-98" width="72" height="20" rx="4" fill="#fff0d2"/>
    <text x="-11" y="-84" textAnchor="middle" fill="#665748" stroke="none" fontSize="10" fontWeight="800">{["COFFEE","BAKERY","GARDEN","ROASTERY","MARKET"][index]}</text>
    <path d="M6 0H53L61 8H-1Z" fill="#d3b795"/>
    <g transform="translate(-74 -1)"><path d="M-10 0-8-17H8L10 0" fill="#cb9072"/><circle cy="-26" r="15" fill="#859d6e" stroke="none"/><circle cx="-6" cy="-32" r="8" fill="#9bb37d" stroke="none"/></g>
    {level>=10&&<g transform="translate(78 -24)"><path d="M-15 24V-12H15V24" fill="#e8cfab"/><path d="M-20-12 0-32 20-12Z" fill={color}/><rect x="-7" y="-6" width="14" height="17" fill="#b3cfc4"/></g>}
    {manager&&<g transform="translate(65 -63)"><circle r="13" fill="#f3cb72"/><path d="m0-8 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1Z" fill="#fff4d4" stroke="none"/></g>}
  </g>;
}

/** 발을 원점으로 전신을 그리고 두 다리를 번갈아 움직인다. */
export function Resident({ id, walking, flip, manager = false }) {
  return <g className={walking?"town-resident walking":"town-resident"} style={{"--delay":`${-id*.13}s`}} transform={`scale(${flip?-1:1} 1)`}>
    <ellipse cy="1" rx="10" ry="3" fill="#51694e" opacity=".2"/>
    <g className="town-leg left"><path d="M-4-12V-3" stroke="#665c55" strokeWidth="5" strokeLinecap="round"/><path d="M-7-2H-2" stroke="#544d45" strokeWidth="4" strokeLinecap="round"/></g>
    <g className="town-leg right"><path d="M4-12V-3" stroke="#665c55" strokeWidth="5" strokeLinecap="round"/><path d="M2-2H7" stroke="#544d45" strokeWidth="4" strokeLinecap="round"/></g>
    <path d="M-7-24Q0-28 7-24L9-11H-9Z" fill={manager?"#6e927c":COLORS[id%5]} stroke="#665748" strokeWidth="1"/>
    <path d="M-8-22-11-13M8-22 11-13" stroke="#edc6a6" strokeWidth="4" strokeLinecap="round"/>
    <circle cy="-33" r="9" fill="#edc6a6" stroke="#826650" strokeWidth=".7"/>
    <path d="M-9-33Q-13-46 0-44T9-31L5-35Q-2-32-5-36Z" fill={id%2?"#78604d":"#564c43"}/>
    <circle cx="4" cy="-32" r="1" fill="#55493d"/>
    {manager&&<><path d="M-7-39Q0-47 7-39" fill="#fff1d3" stroke="#fff1d3" strokeWidth="5"/><path d="M-4-23H4V-13H-4Z" fill="#f4dfb8"/></>}
  </g>;
}

/** 건물과 같은 시점으로 나무를 그린다. */
export function Tree({ x, y, small = false }) {
  return <g transform={`translate(${x} ${y}) scale(${small ? .65 : 1})`}><ellipse cy="2" rx="23" ry="9" fill="#61715b" opacity=".12"/><path d="M-4 0V-43H4V0" fill="#967556"/><circle cy="-48" r="28" fill="#77976b"/><circle cx="-12" cy="-57" r="20" fill="#8caa78"/><circle cx="8" cy="-64" r="17" fill="#a0b783"/></g>;
}
