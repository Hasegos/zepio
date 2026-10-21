import { cardLabel, cardOf } from "./rules.js";

const FILLS = { amber: "url(#hr-amber)", cyan: "url(#hr-cyan)", indigo: "#4f46e5", pink: "url(#hr-pink)" };
const STROKES = { amber: "#b45309", cyan: "#0e7490", indigo: "#3730a3", pink: "#9d174d" };
const SPOTS = {
  1: [[50, 50, 30]],
  2: [
    [30, 50, 21],
    [70, 50, 21],
  ],
  3: [
    [50, 30, 18],
    [30, 68, 18],
    [70, 68, 18],
  ],
};

/**
 * 색 구분을 무늬로도 할 수 있게 하는 SVG 패턴 정의를 한 번 그린다.
 */
export function CardDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="hr-amber" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#f59e0b" />
          <circle cx="4" cy="4" r="1.6" fill="#92400e" />
        </pattern>
        <pattern id="hr-cyan" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#06b6d4" />
          <path d="M-1 1 L1 -1 M0 8 L8 0 M7 9 L9 7" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        </pattern>
        <pattern id="hr-pink" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#f472b6" />
          <path d="M0 4 H8 M4 0 V8" stroke="#9d174d" strokeWidth="1.4" opacity="0.7" />
        </pattern>
      </defs>
    </svg>
  );
}

/**
 * 모양 하나를 그린다.
 *
 * @param props.shape 모양 이름
 * @param props.color 색 이름
 * @param props.x 가운데 가로 위치
 * @param props.y 가운데 세로 위치
 * @param props.r 크기(반지름)
 */
function Shape({ shape, color, x, y, r }) {
  const paint = { fill: FILLS[color], stroke: STROKES[color], strokeWidth: 3, strokeLinejoin: "round" };
  if (shape === "circle") return <circle cx={x} cy={y} r={r} {...paint} />;
  if (shape === "square") return <rect x={x - r * 0.85} y={y - r * 0.85} width={r * 1.7} height={r * 1.7} rx="4" {...paint} />;
  if (shape === "triangle") return <polygon points={`${x},${y - r} ${x + r},${y + r * 0.8} ${x - r},${y + r * 0.8}`} {...paint} />;
  return <polygon points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`} {...paint} />;
}

/**
 * 카드 한 장을 그린다. decorative가 true이면 버튼 안에서 쓰는 장식으로 취급한다.
 *
 * @param props.index 카드 번호
 * @param props.decorative 부모가 이름을 붙이는 경우 true
 */
export default function Card({ index, decorative = false }) {
  const card = cardOf(index);
  const a11y = decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": cardLabel(card) };
  return (
    <span {...a11y} className="block aspect-square w-full rounded-xl border border-slate-200 bg-slate-50">
      <svg viewBox="0 0 100 100" className="size-full p-1" aria-hidden="true">
        {SPOTS[card.count].map(([x, y, r]) => (
          <Shape key={`${x}-${y}`} shape={card.shape} color={card.color} x={x} y={y} r={r} />
        ))}
      </svg>
    </span>
  );
}