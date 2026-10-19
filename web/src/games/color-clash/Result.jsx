import { useEffect, useRef } from "react";
import ShareButton from "../ShareButton.jsx";
import meta from "./meta.js";
import { accuracy, DURATION_MS } from "./reducer.js";
import { colorClashShareText } from "./share-text.js";

/**
 * 점수에 맞는 한 줄 평가를 고른다.
 *
 * @param score 맞힌 개수
 * @returns 결과 제목
 */
function headline(score) {
  if (score >= 30) return "번개 같아요!";
  if (score >= 20) return "대단해요!";
  if (score >= 10) return "잘했어요!";
  return "아쉬워요, 다시 도전해 보세요!";
}

/**
 * 결과 요약을 보여주고 다시 도전을 받는다.
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
          {headline(state.correct)}
        </h2>
        <p className="mt-1 text-slate-600">Color Clash 완료 · {DURATION_MS / 1000}초</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-600">점수</dt>
          <dd className="text-2xl font-extrabold">{state.correct}점</dd>
        </div>
        <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-600">정확도</dt>
          <dd className="text-2xl font-extrabold">{accuracy(state)}%</dd>
        </div>
      </dl>

      <p className="text-center text-sm text-slate-600">
        맞힌 {state.correct}개 · 틀린 {state.wrong}개
      </p>

      {record && (
        <p className="text-center text-sm text-slate-600">
          {record.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}내 최고 기록:{" "}
          {record.data.bestScore}점 · 정확도 {record.data.bestAccuracy}%
        </p>
      )}

      <ShareButton title="Zepio Color Clash" text={colorClashShareText(state)} path={`/games/${meta.slug}/`} />

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