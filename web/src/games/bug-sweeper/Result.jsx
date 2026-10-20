import { useEffect, useRef } from "react";
import ShareButton from "../_shared/ShareButton.jsx";
import { formatDuration } from "../_shared/time.js";
import { LEVELS } from "./engine.js";
import meta from "./meta.js";
import { bugSweeperShareText } from "./share-text.js";

/**
 * 끝난 판의 결과를 보여주고 다시 도전이나 메뉴 복귀를 받는다. 이기면 시간과 최단 기록과 공유 버튼을, 지면 격려를 보여준다.
 *
 * @param props.result won(이겼는지), level(난이도), seconds(걸린 초), date(오늘의 판이면 날짜), outcome(저장한 기록과 새 기록 여부), dailyStreak(오늘의 판 연속 일수)
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 * @param props.onMenu 난이도 고르기를 눌렀을 때 호출
 */
export default function Result({ result, onRetry, onMenu }) {
  const headingRef = useRef(null);
  const { won, level, seconds, date, outcome, dailyStreak } = result;
  const best = outcome.data.best[level];

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {won ? "버그를 모두 찾았어요!" : "버그를 밟았어요"}
        </h2>
        <p className="mt-1 text-slate-600">
          {won ? `${LEVELS[level].name}${date ? " · 오늘의 판" : ""} 클리어` : "숫자 단서를 다시 읽고 도전해 봐요."}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="stat-tile">
          <dt className="text-sm text-slate-600">{won ? "걸린 시간" : "난이도"}</dt>
          <dd className="text-2xl font-extrabold">{won ? formatDuration(seconds * 1000) : LEVELS[level].name}</dd>
        </div>
        <div className="stat-tile">
          <dt className="text-sm text-slate-600">{date && won ? "오늘의 판 연속" : "이어지는 승리"}</dt>
          <dd className="text-2xl font-extrabold">{date && won ? `${dailyStreak}일` : `${outcome.data.streak}판`}</dd>
        </div>
      </dl>

      {won && best !== undefined && (
        <p className="text-center text-sm text-slate-600">
          {outcome.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}
          {LEVELS[level].name} 내 최고 기록: {formatDuration(best * 1000)}
        </p>
      )}

      {won && (
        <ShareButton
          title="Zepio Bug Sweeper"
          text={bugSweeperShareText({ level, seconds, date })}
          path={`/games/${meta.slug}/`}
        />
      )}

      <div className="flex flex-col gap-3">
        <button type="button" onClick={onRetry} className="btn-primary">
          {won && !date ? "새 판 도전하기" : "다시 도전하기"}
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-lg font-bold text-slate-700"
        >
          난이도 고르기
        </button>
      </div>
    </div>
  );
}