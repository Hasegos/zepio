const SHAPES = {
  house: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="1" fill="#fbefd8" stroke="#8a6a4a" strokeWidth="1" />
      <path d="M3 12 12 4l9 8z" fill="#d9674a" stroke="#8a4630" strokeWidth="1" strokeLinejoin="round" />
      <rect x="10" y="15" width="4" height="6" fill="#8a6a4a" />
    </>
  ),
  farm: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" fill="#d7b66e" stroke="#9a7a3c" strokeWidth="1" />
      <path d="M5 10h14M5 14h14M5 18h14" stroke="#6aa04a" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  windmill: (
    <>
      <path d="M9 21 10.5 10h3L15 21z" fill="#f3e6cf" stroke="#8a6a4a" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 10 4 5M12 10l8 5M12 10l5-8M12 10 7 18" stroke="#7a5a3a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="10" r="1.6" fill="#c2410c" />
    </>
  ),
  park: (
    <>
      <rect x="11" y="14" width="2" height="7" fill="#8a6a4a" />
      <circle cx="12" cy="10" r="7" fill="#5fae5a" stroke="#3b7a3a" strokeWidth="1" />
      <circle cx="9.5" cy="8.5" r="1.4" fill="#e9f7d8" />
      <circle cx="14.5" cy="11.5" r="1.4" fill="#f6b7c1" />
    </>
  ),
  shop: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="1" fill="#fbefd8" stroke="#8a6a4a" strokeWidth="1" />
      <path d="M3 10 5 4h14l2 6z" fill="#e2573b" stroke="#8a3a2a" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 4 7 10M12 4v6M16 4l1 6" stroke="#fff4e6" strokeWidth="1.6" />
      <rect x="10" y="14" width="4" height="7" fill="#8a6a4a" />
    </>
  ),
  factory: (
    <>
      <rect x="3" y="11" width="18" height="10" rx="1" fill="#9aa3ad" stroke="#5f6770" strokeWidth="1" />
      <rect x="15" y="4" width="4" height="8" fill="#7c858f" stroke="#5f6770" strokeWidth="1" />
      <path d="M5 11V8l4 3V8l4 3" fill="#9aa3ad" stroke="#5f6770" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="17" cy="2.6" r="1.6" fill="#d5dbe0" />
    </>
  ),
  lighthouse: (
    <>
      <path d="M8.5 21 10 7h4l1.5 14z" fill="#f7f2e8" stroke="#6b7684" strokeWidth="1" strokeLinejoin="round" />
      <path d="M9.2 14h5.6l.4 3H8.8z" fill="#d9534f" />
      <rect x="9" y="4" width="6" height="3.5" fill="#ffe08a" stroke="#6b7684" strokeWidth="1" />
      <path d="M8 4h8l-4-3z" fill="#6b7684" />
    </>
  ),
  dock: (
    <>
      <rect x="3" y="9" width="18" height="6" rx="1" fill="#b98a55" stroke="#7a5a35" strokeWidth="1" />
      <path d="M7 9v6M11 9v6M15 9v6" stroke="#7a5a35" strokeWidth="1" />
      <rect x="4" y="15" width="2" height="5" fill="#7a5a35" />
      <rect x="18" y="15" width="2" height="5" fill="#7a5a35" />
    </>
  ),
  school: (
    <>
      <rect x="3" y="11" width="18" height="10" rx="1" fill="#f3e0b8" stroke="#8a6a4a" strokeWidth="1" />
      <path d="M8 11V7l4-3 4 3v4z" fill="#5b8ec9" stroke="#3b5f8a" strokeWidth="1" strokeLinejoin="round" />
      <rect x="10.5" y="15" width="3" height="6" fill="#8a6a4a" />
      <path d="M12 4V1.5l3 1-3 1" fill="#e2573b" stroke="#8a3a2a" strokeWidth=".6" />
    </>
  ),
  forest: (
    <>
      <path d="M7 19 1.5 19 7 8l5.5 11z" fill="#4f9a55" stroke="#2f6a35" strokeWidth="1" strokeLinejoin="round" />
      <path d="M17 20h-8l4-12z" fill="#3f8a4a" stroke="#2f6a35" strokeWidth="1" strokeLinejoin="round" />
      <path d="M20 19h-5l2.5-7z" fill="#5fae5a" stroke="#2f6a35" strokeWidth="1" strokeLinejoin="round" />
    </>
  ),
};

/**
 * 건물 하나의 그림을 그린다. 이름은 옆 글자가 말하므로 화면 낭독기에는 숨긴다.
 *
 * @param props.id 건물 id
 * @param props.size 한 변 길이(px), 기본 28
 */
export default function Glyph({ id, size = 28 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className="shrink-0">
      {SHAPES[id]}
    </svg>
  );
}