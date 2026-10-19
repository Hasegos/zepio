/** 제피의 보라색 몸과 금색 안테나를 카페 앞치마와 함께 그린다. */
export function Zepi({ small = false }) {
  return <g transform={`scale(${small ? .6 : 1})`} strokeLinecap="round" strokeLinejoin="round">
    <ellipse cy="2" rx="29" ry="8" fill="#372e29" opacity=".15"/>
    <path d="M-17-9V-1M17-9V-1" stroke="#5441a2" strokeWidth="9"/>
    <rect x="-32" y="-69" width="64" height="60" rx="21" fill="#8a74d6" stroke="#514376" strokeWidth="2"/>
    <path d="M0-70V-81" stroke="#e6ba69" strokeWidth="4"/><circle cy="-86" r="6" fill="#efc772"/>
    <circle cx="-13" cy="-47" r="10" fill="#fff7e7"/><circle cx="13" cy="-47" r="10" fill="#fff7e7"/>
    <circle cx="-11" cy="-45" r="4" fill="#3b3548"/><circle cx="15" cy="-45" r="4" fill="#3b3548"/>
    <path d="M-7-31Q0-24 7-31" stroke="#fff7e7" strokeWidth="3" fill="none"/>
    <path d="M-23-24H23V-9H-23Z" fill="#c2d0af"/><path d="M-31-29-42-19M31-29 42-19" stroke="#8a74d6" strokeWidth="8"/>
  </g>;
}

/** 단골별 복장과 실루엣을 유지하며 발을 기준으로 전신을 그린다. */
export function Customer({ id = "walkin", color = "#b5a38d" }) {
  if(id==="moka") return <g stroke="#6d5643" strokeWidth="2" strokeLinejoin="round"><ellipse cy="3" rx="22" ry="6" fill="#574333" opacity=".13" stroke="none"/><path d="M14-7Q40-23 28-34" fill="none" stroke="#bd8f66" strokeWidth="9" strokeLinecap="round"/><ellipse cy="-15" rx="18" ry="17" fill="#ca9d70"/><path d="M-18-31-20-53-5-44Q3-47 10-43L23-53 20-30" fill="#ca9d70"/><ellipse cy="-31" rx="21" ry="16" fill="#d4aa7e"/><path d="M-10-34h4M9-34h4" strokeLinecap="round"/><path d="m0-29 3 0-2 3Z" fill="#805748"/><path d="M-12-8V0M12-8V0" stroke="#bc8c60" strokeWidth="8" strokeLinecap="round"/></g>;
  const old=id==="dalbong";
  return <g stroke="#685747" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cy="2" rx="22" ry="6" fill="#46372b" opacity=".14" stroke="none"/>
    <path d="M-10-20V-2M10-20V-2" stroke="#6c7067" strokeWidth="9"/><path d="M-15-1H-6M6-1H16" stroke="#5b4c41" strokeWidth="7"/>
    <path d="M-15-54Q0-60 15-54L20-22H-20Z" fill={color}/>
    <path d="M-17-48-23-30M17-48 23-30" stroke={color} strokeWidth="9"/>
    <path d="M-23-30V-25M23-30V-25" stroke="#ebc5a2" strokeWidth="7"/>
    <circle cy="-72" r="23" fill="#ebc5a2"/>
    <path d="M-23-74Q-25-103 0-99T23-74L15-82Q0-77-15-84Z" fill={old?"#b4b3a2":"#645248"}/>
    <path d="M-9-71h2M9-71h2" stroke="#514336" strokeWidth="3"/><path d="M-3-60Q1-58 5-61" fill="none"/>
    {old?<><path d="M-29-91H29M-22-92Q-20-114 2-114T23-92" fill="#9da18a" stroke="#78836e" strokeWidth="3"/><path d="M-8-61Q0-68 8-61" stroke="#b9b8a9" strokeWidth="5"/><path d="M-13-51 14-49 9-38-9-41Z" fill="#c8bc94"/><rect x="-32" y="-42" width="20" height="25" rx="4" fill="#937c61"/></>:id==="doyun"?<><path d="M-24-81Q-27-108 0-108T24-81" fill="#d99c75"/><path d="M-16-104Q-3-115 13-103" stroke="#f1d0a1" strokeWidth="5"/><path d="M-22-78-18-60H-9" fill="none"/><path d="M-12-51 12-24" stroke="#856746" strokeWidth="4"/><rect x="8" y="-40" width="22" height="25" rx="3" fill="#b78c58"/></>:<path d="M-14-53H14V-28H-14Z" fill="#d6c3a2"/>}
  </g>;
}
