import { useEffect, useRef } from "react";
import ShareButton from "../_shared/ShareButton.jsx";
import { endingOf, PER_DAY } from "./engine.js";
import Meters from "./Meters.jsx";
import meta from "./meta.js";
import { MAX_SCORE } from "./record.js";
import { dayScore, totalScore } from "./reducer.js";
import { bugDeskShareText } from "./share-text.js";

/**
 * 결과 요약과 날짜별 맞힘 표를 보여 주고 다시 도전을 받는다.
 *
 * @param props.state 끝난 판의 상태
 * @param props.record 저장한 최고 기록과 새 기록 여부, 오늘의 도전이거나 저장 전에는 null
 * @param props.daily 오늘의 도전이면 { date, streak }, 아니면 null
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 */
export default function Result({ state, record, daily, onRetry }) {
  const headingRef = useRef(null);
  const score = totalScore(state);
  const ending = endingOf(score, state.trust, state.energy);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {ending.title}
        </h2>
        <p className="mt-1 text-slate-600">{ending.text}</p>
        <p className="mt-1 text-sm text-slate-600">버그 접수처{daily ? ` · 오늘의 도전 · 연속 ${daily.streak}일` : ""} 5일 완료</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="stat-tile">
          <dt className="text-sm text-slate-600">맞힌 접수</dt>
          <dd className="text-2xl font-extrabold">
            {score} / {MAX_SCORE}건
          </dd>
        </div>
        <div className="stat-tile">
          <dt className="text-sm text-slate-600">마지막 게이지</dt>
          <dd className="mt-1">
            <Meters trust={state.trust} energy={state.energy} />
          </dd>
        </div>
      </dl>

      <ol className="grid gap-1 text-sm text-slate-700">
        {state.days.map((_, day) => (
          <li key={day} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-bold">{day + 1}일차</span>
            <span aria-hidden="true">
              {state.results
                .slice(day * PER_DAY, (day + 1) * PER_DAY)
                .map((result) => (result.ok ? "🟩" : "🟥"))
                .join("")}
            </span>
            <span>
              {dayScore(state, day)} / {PER_DAY}
            </span>
          </li>
        ))}
      </ol>

      {!daily && record && (
        <p className="text-center text-sm text-slate-600">
          {record.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}내 최고 기록: {record.data.bestScore} / {MAX_SCORE}건
        </p>
      )}

      <ShareButton title="Zepio 버그 접수처" text={bugDeskShareText(state, daily?.date)} path={`/games/${meta.slug}/`} />

      <button type="button" onClick={onRetry} className="btn-primary">
        일반 모드로 다시 도전
      </button>
    </div>
  );
}