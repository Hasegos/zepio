import { useEffect, useRef } from "react";
import ShareButton from "../ShareButton.jsx";
import meta from "./meta.js";
import { formatDuration, totals } from "./reducer.js";
import { lightFlipShareText } from "./share-text.js";

/**
 * 추가 이동 횟수에 맞는 한 줄 평가를 고른다.
 *
 * @param extra 최소 이동보다 더 누른 횟수
 * @returns 결과 제목
 */
function headline(extra) {
  if (extra === 0) return "완벽해요! 모두 최소 이동으로 풀었어요!";
  if (extra <= 3) return "대단해요!";
  if (extra <= 10) return "잘했어요!";
  return "끝까지 해냈어요!";
}

/**
 * 결과 요약과 판별 이동 횟수를 보여주고 다시 도전을 받는다.
 *
 * @param props.state 끝난 판의 상태
 * @param props.record 저장한 최고 기록과 새 기록 여부, 저장 전에는 null
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 */
export default function Result({ state, record, onRetry }) {
  const headingRef = useRef(null);
  const { moves, par, extra } = totals(state);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {headline(extra)}
        </h2>
        <p className="mt-1 text-slate-600">Light Flip 완료</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-600">추가 이동</dt>
          <dd className="text-2xl font-extrabold">{extra}회</dd>
        </div>
        <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-600">걸린 시간</dt>
          <dd className="text-2xl font-extrabold">{formatDuration(state.finishedAt - state.startedAt)}</dd>
        </div>
      </dl>

      <p className="text-center text-sm text-slate-600">
        총 이동 {moves}회 · 최소 이동 {par}회
      </p>

      <ol className="grid gap-1 text-sm text-slate-600">
        {state.done.map((stage, i) => (
          <li key={i} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span>{i + 1}판</span>
            <span>
              이동 {stage.moves}회 · 최소 {stage.par}회
            </span>
          </li>
        ))}
      </ol>

      {record && (
        <p className="text-center text-sm text-slate-600">
          {record.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}내 최고 기록: 추가
          이동 {record.data.bestExtra}회 · {formatDuration(record.data.bestMs)}
        </p>
      )}

      <ShareButton title="Zepio Light Flip" text={lightFlipShareText(state)} path={`/games/${meta.slug}/`} />

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