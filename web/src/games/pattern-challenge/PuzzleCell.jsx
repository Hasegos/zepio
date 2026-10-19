const SHAPE_NAMES = {
  triangle: "삼각형",
  circle: "원",
  square: "사각형",
  star: "별",
  diamond: "마름모",
};
const COLOR_NAMES = { indigo: "남색", cyan: "하늘색", amber: "주황색" };
const COLOR_FILLS = { indigo: "#4f46e5", cyan: "url(#zp-cyan)", amber: "url(#zp-amber)" };
const COLOR_STROKES = { indigo: "#3730a3", cyan: "#0e7490", amber: "#b45309" };
const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const angle = ((-90 + i * 36) * Math.PI) / 180;
  const radius = i % 2 ? 18 : 42;
  return `${(50 + radius * Math.cos(angle)).toFixed(1)},${(52 + radius * Math.sin(angle)).toFixed(1)}`;
}).join(" ");

/**
 * 셀을 화면 낭독용 문구로 바꾼다. 빈칸은 "빈칸"이다.
 *
 * @param cell 숫자 셀, 도형 셀, 또는 null(빈칸)
 * @returns 낭독용 문구
 */
export function cellLabel(cell) {
  if (cell === null) return "빈칸";
  if ("n" in cell) return String(cell.n);
  return `${COLOR_NAMES[cell.color]} ${SHAPE_NAMES[cell.shape]}`;
}

/**
 * 색 구분을 무늬로도 할 수 있게 하는 SVG 패턴 정의를 한 번 그린다.
 */
export function PatternDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="zp-cyan" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#06b6d4" />
          <path d="M-1 1 L1 -1 M0 8 L8 0 M7 9 L9 7" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        </pattern>
        <pattern id="zp-amber" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#f59e0b" />
          <circle cx="4" cy="4" r="1.6" fill="#92400e" />
        </pattern>
      </defs>
    </svg>
  );
}

/**
 * 도형 하나를 그린다.
 *
 * @param props.shape 도형 이름
 * @param props.color 색 이름
 * @param props.rot 회전 각도
 */
function Shape({ shape, color, rot }) {
  const paint = { fill: COLOR_FILLS[color], stroke: COLOR_STROKES[color], strokeWidth: 3 };
  const nodes = {
    triangle: <polygon points="50,12 90,86 10,86" strokeLinejoin="round" {...paint} />,
    circle: <circle cx="50" cy="50" r="38" {...paint} />,
    square: <rect x="16" y="16" width="68" height="68" rx="8" {...paint} />,
    star: <polygon points={STAR_POINTS} strokeLinejoin="round" {...paint} />,
    diamond: <polygon points="50,10 88,50 50,90 12,50" strokeLinejoin="round" {...paint} />,
  };
  return <g transform={`rotate(${rot ?? 0} 50 50)`}>{nodes[shape]}</g>;
}

const BASE =
  "flex aspect-square min-w-0 flex-1 items-center justify-center rounded-xl text-xl font-bold sm:text-3xl";

/**
 * 문제나 선택지의 칸 하나를 그린다. decorative가 true이면 버튼 안에서 쓰는 장식으로 취급한다.
 *
 * @param props.cell 숫자 셀, 도형 셀, 또는 null(빈칸)
 * @param props.decorative 부모가 이름을 붙이는 경우 true
 */
export default function PuzzleCell({ cell, decorative = false }) {
  const label = cellLabel(cell);
  const a11y = decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": label };

  if (cell === null) {
    return (
      <span {...a11y} className={`${BASE} border-2 border-dashed border-primary bg-white text-primary`}>
        ?
      </span>
    );
  }
  if ("n" in cell) {
    return (
      <span {...a11y} className={`${BASE} border border-slate-200 bg-slate-50`}>
        {cell.n}
      </span>
    );
  }
  return (
    <span {...a11y} className={`${BASE} border border-slate-200 bg-slate-50`}>
      <svg viewBox="0 0 100 100" className="size-full p-1.5" aria-hidden="true">
        <Shape shape={cell.shape} color={cell.color} rot={cell.rot} />
      </svg>
    </span>
  );
}