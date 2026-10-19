import { useEffect, useRef } from "react";
import ShareButton from "../ShareButton.jsx";
import meta from "./meta.js";
import { formatDuration, MAX_ROUND } from "./reducer.js";
import { memoryShareText } from "./share-text.js";

/**
 * 클리어한 라운드에 맞는 한 줄 평가를 고른다.
 *
 * @param state 끝난 판의 상태
 * @returns 결과 제목
 */
function headline(state) {
  if (state.won) return "완벽해요! 모두 기억했어요!";
  if (state.cleared >= 8) return "대단해요!";
  if (state.cleared >= 4) return "잘했어요!";
  return "아쉬워요, 다시 도전해 보세요!";
}

/**
 * 결과 요약과 틀린 곳을 보여주고 다시 도전을 받는다.
 *
 * @param props.state 끝난 판의 상태
 * @param props.record 저장한 최고 기록과 새 기록 여부, 저장 전에는 null
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 */
export default function Result({ state, record, onRetry }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {headline(state)}
        </h2>
        <p className="mt-1 text-slate-600">Memory Sequence 완료</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-600">클리어한 라운드</dt>
          <dd className="text-2xl font-extrabold">
            {state.cleared} / {MAX_ROUND}
          </dd>
        </div>
        <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-600">걸린 시간</dt>
          <dd className="text-2xl font-extrabold">{formatDuration(state.finishedAt - state.startedAt)}</dd>
        </div>
      </dl>

      {!state.won && (
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          {state.expectedPad + 1}번을 눌러야 했어요. 내가 누른 패드는 {state.failedPad + 1}번이에요.
        </p>
      )}

      <p className="text-center text-sm text-slate-600">
        마지막 순서: {state.sequence.map((pad) => pad + 1).join(" → ")}
      </p>

      {record && (
        <p className="text-center text-sm text-slate-600">
          {record.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}내 최고 기록:{" "}
          {record.data.bestRound} / {MAX_ROUND} 라운드 · {formatDuration(record.data.bestMs)}
        </p>
      )}

      <ShareButton title="Zepio Memory Sequence" text={memoryShareText(state)} path={`/games/${meta.slug}/`} />

      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-primary px-5 py-3.5 text-lg font-bold text-white"
      >
        다시 도전하기
      </button>
    </div>
  );
}