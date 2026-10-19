import { useEffect, useRef } from "react";
import PuzzleCell, { cellLabel } from "./PuzzleCell.jsx";
import { formatDuration } from "./reducer.js";

/**
 * 문제 한 개를 보여주고 선택, 제출, 다음 문제 이동을 받는다.
 * 숫자 키 1~5로 선택하고, 포커스가 버튼 밖에 있을 때 Enter로 제출이나 다음 문제로 넘어간다.
 *
 * @param props.puzzle 현재 문제
 * @param props.index 현재 문제 번호(0부터)
 * @param props.total 전체 문제 수
 * @param props.elapsedMs 시작 후 경과 시간
 * @param props.selected 선택한 선택지 번호 또는 null
 * @param props.revealed 정답을 공개했는지
 */
export default function Board({
  puzzle,
  index,
  total,
  elapsedMs,
  selected,
  revealed,
  onSelect,
  onSubmit,
  onNext,
}) {
  const headingRef = useRef(null);
  const nextRef = useRef(null);
  const last = index === total - 1;
  const correct = revealed && selected === puzzle.answer;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    if (revealed) nextRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= puzzle.options.length) {
        onSelect(number - 1);
        return;
      }
      const interactive = "a, button, summary, input, select, textarea";
      if (event.key === "Enter" && !event.repeat && !event.target.closest?.(interactive)) {
        if (!revealed && selected === null) return;
        event.preventDefault();
        if (revealed) onNext();
        else onSubmit();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [puzzle, revealed, selected, onSelect, onSubmit, onNext]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
        <span>
          문제 {index + 1} / {total}
        </span>
        <span>{formatDuration(elapsedMs)}</span>
      </div>
      <div
        role="progressbar"
        aria-label="진행도"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + (revealed ? 1 : 0)}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${((index + (revealed ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none">
        ?에 들어갈 것은 무엇일까요?
      </h2>

      <div className="flex gap-2" role="group" aria-label="문제">
        {puzzle.cells.map((cell, i) => (
          <PuzzleCell key={i} cell={cell} />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2" role="group" aria-label="선택지">
        {puzzle.options.map((option, i) => {
          const isAnswer = revealed && i === puzzle.answer;
          const isWrong = revealed && i === selected && i !== puzzle.answer;
          const tone = isAnswer
            ? "border-success bg-emerald-50"
            : isWrong
              ? "border-danger bg-red-50"
              : i === selected
                ? "border-primary ring-2 ring-primary/30"
                : "border-slate-200 hover:border-primary/60";
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              aria-pressed={i === selected}
              aria-label={`${i + 1}번, ${cellLabel(option)}`}
              onClick={() => onSelect(i)}
              className={`relative flex min-h-12 min-w-0 rounded-xl border-2 bg-white p-0.5 ${tone}`}
            >
              <span aria-hidden="true" className="absolute left-1 top-0.5 text-xs font-semibold text-slate-500">
                {i + 1}
              </span>
              {isAnswer && (
                <span aria-hidden="true" className="absolute right-1 top-0.5 text-sm font-bold text-success-strong">
                  ✓
                </span>
              )}
              {isWrong && (
                <span aria-hidden="true" className="absolute right-1 top-0.5 text-sm font-bold text-danger-strong">
                  ✗
                </span>
              )}
              <PuzzleCell cell={option} decorative />
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className="min-h-6 text-center font-bold">
        {revealed &&
          (correct ? (
            <span className="text-success-strong">정답이에요!</span>
          ) : (
            <span className="text-danger-strong">아쉬워요. 정답은 {puzzle.answer + 1}번이에요.</span>
          ))}
      </p>

      {revealed ? (
        <button
          ref={nextRef}
          type="button"
          onClick={onNext}
          className="rounded-xl bg-primary px-5 py-3.5 text-lg font-bold text-white"
        >
          {last ? "결과 보기" : "다음 문제"}
        </button>
      ) : (
        <button
          type="button"
          disabled={selected === null}
          onClick={onSubmit}
          className="rounded-xl bg-primary px-5 py-3.5 text-lg font-bold text-white disabled:bg-slate-300 disabled:text-slate-600"
        >
          정답 제출
        </button>
      )}
    </div>
  );
}