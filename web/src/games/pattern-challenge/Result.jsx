import { useEffect, useRef } from "react";
import PuzzleCell, { cellLabel } from "./PuzzleCell.jsx";
import { correctCount, formatDuration } from "./reducer.js";

const HEADLINES = { 5: "완벽해요!", 4: "잘했어요!", 3: "좋아요!" };
const FALLBACK_HEADLINE = "아쉬워요, 다시 도전해 보세요!";

/**
 * 결과 요약과 문제별 해설을 보여주고 다시 도전을 받는다.
 *
 * @param props.state 끝난 판의 상태
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 */
export default function Result({ state, onRetry }) {
  const headingRef = useRef(null);
  const total = state.puzzles.length;
  const correct = correctCount(state);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {HEADLINES[correct] ?? FALLBACK_HEADLINE}
        </h2>
        <p className="mt-1 text-slate-600">Pattern Challenge 완료</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-600">정답</dt>
          <dd className="text-2xl font-extrabold">
            {correct} / {total}
          </dd>
        </div>
        <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-4">
          <dt className="text-sm text-slate-600">걸린 시간</dt>
          <dd className="text-2xl font-extrabold">{formatDuration(state.finishedAt - state.startedAt)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-primary px-5 py-3.5 text-lg font-bold text-white"
      >
        다시 도전하기
      </button>

      <section aria-labelledby="explanations">
        <h3 id="explanations" className="mb-2 text-lg font-bold">
          문제별 해설
        </h3>
        <ul className="flex flex-col gap-2">
          {state.puzzles.map((puzzle, i) => {
            const answer = state.answers[i];
            return (
              <li key={puzzle.id}>
                <details className="rounded-xl border border-slate-200 bg-white p-3">
                  <summary className="flex cursor-pointer items-center justify-between font-semibold">
                    <span>문제 {i + 1}</span>
                    <span className={answer.correct ? "text-success-strong" : "text-danger-strong"}>
                      {answer.correct ? "정답" : "오답"}
                    </span>
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="flex gap-1.5">
                      {puzzle.cells.map((cell, k) => (
                        <PuzzleCell key={k} cell={cell === null ? puzzle.options[puzzle.answer] : cell} />
                      ))}
                    </div>
                    {!answer.correct && (
                      <p className="text-sm text-slate-600">
                        내 선택: {answer.selected + 1}번 ({cellLabel(puzzle.options[answer.selected])}) · 정답:{" "}
                        {puzzle.answer + 1}번 ({cellLabel(puzzle.options[puzzle.answer])})
                      </p>
                    )}
                    <p>{puzzle.explanation}</p>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-center text-xs text-slate-600">
        이 결과는 재미를 위한 것이며 IQ 검사가 아닙니다.
      </p>
    </div>
  );
}