import { useEffect, useRef } from "react";
import { ROUNDS, SPREAD_TURNS } from "./engine.js";
import { TURNS } from "./sim.js";
import { VILLAGERS } from "./village.js";

/**
 * 별 개수를 ★와 ☆로 적는다.
 *
 * @param stars 0~3
 * @returns 문구
 */
export function starText(stars) {
  return `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`;
}

/**
 * 소문이 번지는 동안 턴과 믿는 사람 수를 알려 주고, 끝나면 별과 풀이 기준을 보여 준다.
 *
 * @param props.round 라운드 데이터
 * @param props.index 라운드 순서(0부터)
 * @param props.outcome 진행 결과
 * @param props.turn 지금 턴
 * @param props.onSkip 끝까지 건너뛸 때 호출
 * @param props.onNext 다음으로 넘어갈 때 호출
 */
export default function Playback({ round, index, outcome, turn, onSkip, onNext }) {
  const rootRef = useRef(null);
  const nextRef = useRef(null);
  const done = turn >= TURNS;
  const spread = round.type === "spread";
  const believers = outcome.sim.counts[turn];

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    if (done) nextRef.current?.focus({ preventScroll: true });
  }, [done]);

  return (
    <div ref={rootRef} tabIndex={-1} className="flex flex-col gap-3 outline-none">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
        <span>
          {index + 1}라운드 / {ROUNDS} · {turn} / {TURNS}턴
        </span>
        <span className="text-base font-extrabold text-slate-900">
          믿는 사람 {believers} / {VILLAGERS}명
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="믿는 사람 비율"
        aria-valuemin={0}
        aria-valuemax={VILLAGERS}
        aria-valuenow={believers}
        className="h-2.5 overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-danger transition-[width]" style={{ width: `${(believers / VILLAGERS) * 100}%` }} />
      </div>

      <div role="status">
        {done && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="text-lg font-extrabold">
              <span aria-hidden="true">{starText(outcome.stars)}</span>
              <span className="sr-only">별 {outcome.stars}개</span>{" "}
              {spread ? `${SPREAD_TURNS}턴 뒤 ${outcome.value}명` : `끝내 ${outcome.value}명이 믿음`}
            </p>
            <p className="mt-1 text-slate-700">
              {spread
                ? `풀이 기준 최선은 ${round.best}명이에요. 열 턴이 지나면 ${outcome.sim.counts[TURNS]}명이 믿었어요.`
                : `아무것도 안 하면 ${round.base}명, 풀이 기준 최선은 ${round.best}명이에요.`}
            </p>
          </div>
        )}
      </div>
      {!done && <p className="text-sm text-slate-700">{turn}턴: 소문을 믿는 사람이 {believers}명이에요.</p>}

      {done ? (
        <button ref={nextRef} type="button" onClick={onNext} className="btn-primary">
          {index === ROUNDS - 1 ? "결과 보기" : "다음 라운드"}
        </button>
      ) : (
        <button type="button" onClick={onSkip} className="rounded-xl border-2 border-primary bg-white px-5 py-3 font-bold text-primary">
          끝까지 건너뛰기
        </button>
      )}
    </div>
  );
}