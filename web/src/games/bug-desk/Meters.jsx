import { MAX_METER } from "./engine.js";

/**
 * 게이지 하나를 막대와 숫자로 보여 준다.
 *
 * @param props.label 게이지 이름
 * @param props.value 현재 값
 * @param props.tone 막대 색 클래스
 */
function Meter({ label, value, tone }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs font-bold text-slate-700">
        <span>{label}</span>
        <span>
          {value} / {MAX_METER}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={MAX_METER}
        aria-valuenow={value}
        className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200"
      >
        <div className={`h-full rounded-full transition-[width] ${tone}`} style={{ width: `${(value / MAX_METER) * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * 신뢰와 팀 체력 게이지를 나란히 보여 준다.
 *
 * @param props.trust 신뢰
 * @param props.energy 팀 체력
 */
export default function Meters({ trust, energy }) {
  return (
    <div className="flex w-full max-w-xs gap-4">
      <Meter label="고객 신뢰" value={trust} tone="bg-primary" />
      <Meter label="팀 체력" value={energy} tone="bg-success" />
    </div>
  );
}