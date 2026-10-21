import { useEffect, useRef } from "react";
import { TURNS, WIN_DEPENDENCY, weighted } from "./sim.js";

/**
 * 막대 하나를 이름과 퍼센트로 보여 준다.
 *
 * @param props.label 이름
 * @param props.value 0~1
 * @param props.tone 막대 색 클래스
 * @param props.mark 목표 위치(0~1) 또는 비움
 */
function Bar({ label, value, tone, mark }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex-1 min-w-[7rem]">
      <div className="flex justify-between text-xs font-bold text-slate-700">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-[width] ${tone}`} style={{ width: `${percent}%` }} />
        {mark !== undefined && <div className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ left: `${mark * 100}%` }} />}
      </div>
    </div>
  );
}

/**
 * 판 상황 표시줄로 턴, 채택률, 의존도(목표 눈금), 경계도, 규제안 진행을 보여 준다. 처음 나타날 때 포커스를 받는다.
 *
 * @param props.world 세계
 * @param props.sim 지금 상태
 */
export default function Hud({ world, sim }) {
  const turnRef = useRef(null);

  useEffect(() => {
    turnRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p ref={turnRef} tabIndex={-1} className="text-sm font-semibold text-slate-600 outline-none">
        {sim.turn} / {TURNS}턴{sim.detected ? " · 규제 논의 진행 중" : " · 아직 들키지 않았어요"}
      </p>
      <div className="flex flex-wrap gap-3">
        <Bar label="채택률" value={weighted(world, sim.a)} tone="bg-primary" />
        <Bar label="의존도 (목표 85%)" value={weighted(world, sim.d)} tone="bg-amber-400" mark={WIN_DEPENDENCY} />
        <Bar label="경계도" value={weighted(world, sim.w)} tone="bg-danger" />
        <Bar label="규제안 진행" value={sim.reg} tone="bg-danger-strong" />
      </div>
    </div>
  );
}