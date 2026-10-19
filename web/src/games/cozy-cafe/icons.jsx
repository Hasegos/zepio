/**
 * 항목 아이콘 하나를 그린다. 이름은 옆 글자가 말하므로 화면 낭독기에는 숨긴다.
 *
 * @param props.id 설비 id(espresso, oven, terrace, beans, marketing), staff, upgrade 중 하나
 */
export default function Icon({ id }) {
  const shapes = {
    cup: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11h15v7a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6z" /><path d="M20 12h2a3 3 0 0 1 0 6h-2M3 25h20M9 7c-3-3 3-3 0-6M15 7c-3-3 3-3 0-6" /></g>,
    coin: <g><circle cx="14" cy="14" r="11" fill="#eac16c" stroke="#bb853c" strokeWidth="1.5" /><circle cx="14" cy="14" r="7.5" fill="none" stroke="#fff0bb" strokeWidth="1.5" /><path d="M16.5 10.5c-5-3-8 4-3 5 5 1 2 5-2 2M14 7.5v13" fill="none" stroke="#966527" strokeWidth="1.6" strokeLinecap="round" /></g>,
    leaf: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4C7 1 1 12 9 19c6 5 15-1 14-15zM6 25 18 10M10 20l-1-7M14 15h6" /></g>,
    settings: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="m11 3-1 4-4 1-3 4 2 3v4l4 1 2 5h5l2-4 4-1 3-4-2-3V8l-5-1-2-4z" /><circle cx="14" cy="14" r="4" /></g>,
    espresso: (
      <>
        <rect x="4" y="5" width="20" height="17" rx="3" fill="#708065" stroke="#56634a" />
        <rect x="7" y="9" width="14" height="3" rx="1" fill="#ceb37b" />
        <rect x="11" y="15" width="6" height="7" rx="2" fill="#fff1d5" />
        <path d="M5 23h18" stroke="#ad8c4e" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    oven: (
      <>
        <rect x="3" y="7" width="22" height="16" rx="3" fill="#83906b" stroke="#56634a" />
        <rect x="6" y="11" width="16" height="9" rx="2" fill="#f5d29b" />
        <ellipse cx="14" cy="16" rx="5" ry="3" fill="#d99a4e" />
      </>
    ),
    terrace: (
      <>
        <path d="M3 12 q11 -12 22 0z" fill="#89996e" />
        <path d="M8 12q6-10 12 0z" fill="#f6edcf" />
        <rect x="13" y="12" width="2" height="12" fill="#8d6b45" />
        <ellipse cx="14" cy="24" rx="8" ry="2" fill="#a7743f" />
      </>
    ),
    beans: (
      <>
        <ellipse cx="14" cy="14" rx="8" ry="11" fill="#6b4226" transform="rotate(30 14 14)" />
        <path d="M9 22 q10 -8 10 -16" stroke="#d9b38c" strokeWidth="2" fill="none" />
      </>
    ),
    marketing: (
      <>
        <path d="M5 11 l14 -6 v18 l-14 -6z" fill="#bd8b65" />
        <rect x="3" y="11" width="4" height="6" rx="1" fill="#7d6248" />
        <circle cx="22" cy="14" r="3" fill="#f7c873" />
      </>
    ),
    staff: (
      <>
        <circle cx="14" cy="9" r="5" fill="#f1c9a5" />
        <rect x="6" y="15" width="16" height="11" rx="5" fill="#7c8b64" />
      </>
    ),
    upgrade: <path d="M14 3 l3.4 7 7.6 1 -5.5 5.3 1.4 7.6 -6.9 -3.7 -6.9 3.7 1.4 -7.6 -5.5 -5.3 7.6 -1z" fill="#f7c873" />,
  };
  return (
    <svg viewBox="0 0 28 28" width="36" height="36" aria-hidden="true" focusable="false" className="shrink-0">
      {shapes[id] ?? shapes.upgrade}
    </svg>
  );
}
