import { useEffect, useRef } from "react";
import ShareButton from "../_shared/ShareButton.jsx";
import { endingOf, SPREAD_TURNS } from "./engine.js";
import meta from "./meta.js";
import { starText } from "./Playback.jsx";
import { MAX_SCORE } from "./record.js";
import { totalStars } from "./reducer.js";
import { rumorShareText } from "./share-text.js";

/**
 * 결말과 라운드별 별을 보여 주고 다시 도전을 받는다.
 *
 * @param props.state 끝난 판의 상태
 * @param props.record 저장한 최고 기록과 새 기록 여부, 오늘의 도전이거나 저장 전에는 null
 * @param props.daily 오늘의 도전이면 { date, streak }, 아니면 null
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 */
export default function Result({ state, record, daily, onRetry }) {
  const headingRef = useRef(null);
  const stars = totalStars(state);
  const ending = endingOf(stars);

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
        <p className="mt-1 text-sm text-slate-600">소문 한 마디{daily ? ` · 오늘의 도전 · 연속 ${daily.streak}일` : ""} 3라운드 완료</p>
      </div>

      <dl className="stat-tile text-center">
        <dt className="text-sm text-slate-600">얻은 별</dt>
        <dd className="text-3xl font-extrabold">
          ★ {stars} / {MAX_SCORE}개
        </dd>
      </dl>

      <ol className="grid gap-1 text-sm text-slate-700">
        {state.rounds.map((round, i) => (
          <li key={round.seed} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-bold">
              {i + 1}라운드 · {round.type === "spread" ? "퍼뜨리기" : "막기"}
            </span>
            <span>
              <span aria-hidden="true">{starText(state.results[i].stars)}</span>
              <span className="sr-only">별 {state.results[i].stars}개</span>{" "}
              {round.type === "spread" ? `${SPREAD_TURNS}턴 ${state.results[i].value}명` : `${state.results[i].value}명 믿음`}
            </span>
          </li>
        ))}
      </ol>

      {!daily && record && (
        <p className="text-center text-sm text-slate-600">
          {record.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}내 최고 기록: 별 {record.data.bestScore} / {MAX_SCORE}개
        </p>
      )}

      <ShareButton title="Zepio 소문 한 마디" text={rumorShareText(state, daily?.date)} path={`/games/${meta.slug}/`} />

      <button type="button" onClick={onRetry} className="btn-primary">
        일반 모드로 다시 도전
      </button>
    </div>
  );
}