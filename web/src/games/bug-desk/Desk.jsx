import { useEffect, useMemo, useRef } from "react";
import { judge, PER_DAY, symptomLabel } from "./engine.js";
import Meters from "./Meters.jsx";
import PolicySheet from "./PolicySheet.jsx";
import { ACTIONS } from "./rules.js";
import Ticket from "./Ticket.jsx";

const LABELS = Object.fromEntries(ACTIONS.map((action) => [action.id, action.label]));

/**
 * 접수 건 하나를 보여 주고 처리 방법 고르기, 정답 확인, 다음 건 이동을 받는다.
 * 숫자 키 1~6으로 처리 방법을 고르고, 포커스가 버튼 밖에 있을 때 Enter로 다음으로 넘어간다.
 *
 * @param props.report 지금 접수 건
 * @param props.day 일차(0부터)
 * @param props.index 오늘 접수 순서(0부터)
 * @param props.trust 고객 신뢰
 * @param props.energy 팀 체력
 * @param props.chosen 고른 처리 방법 id 또는 null
 * @param props.earlier 앞서 접수된 건 목록
 * @param props.last 오늘의 마지막 건인지
 * @param props.finalDay 마지막 날인지
 * @param props.onChoose 처리 방법 id를 받는다
 * @param props.onNext 다음으로 넘어갈 때 호출
 */
export default function Desk({ report, day, index, trust, energy, chosen, earlier, last, finalDay, onChoose, onNext }) {
  const headingRef = useRef(null);
  const nextRef = useRef(null);
  const outcome = useMemo(() => (chosen ? judge(report, chosen, day + 1) : null), [report, chosen, day]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [report.id]);

  useEffect(() => {
    if (chosen) nextRef.current?.focus({ preventScroll: true });
  }, [chosen]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= ACTIONS.length) {
        onChoose(ACTIONS[number - 1].id);
        return;
      }
      const interactive = "a, button, summary, input, select, textarea";
      if (event.key === "Enter" && !event.repeat && chosen && !event.target.closest?.(interactive)) {
        event.preventDefault();
        onNext();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [chosen, onChoose, onNext]);

  const nextLabel = !last ? "다음 접수" : finalDay ? "결과 보기" : "하루 정산 보기";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
        <span>
          {day + 1}일차 · 접수 {index + 1} / {PER_DAY}
        </span>
        <Meters trust={trust} energy={energy} />
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none">
        이 접수 건을 어떻게 처리할까요?
      </h2>

      <Ticket report={report} />

      <div role="group" aria-label="처리 방법" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACTIONS.map((action, i) => {
          const isCorrect = outcome && action.id === outcome.correct;
          const isWrong = outcome && action.id === chosen && !outcome.ok;
          const tone = isCorrect
            ? "border-success bg-emerald-50"
            : isWrong
              ? "border-danger bg-red-50 text-slate-600 line-through"
              : "border-slate-200 bg-white hover:border-primary/60";
          return (
            <button
              key={action.id}
              type="button"
              disabled={Boolean(chosen)}
              onClick={() => onChoose(action.id)}
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left disabled:cursor-default ${tone}`}
            >
              <span aria-hidden="true" className="text-xs font-semibold text-slate-500">
                {i + 1}
              </span>
              <span className="flex-1">
                <span className="block font-bold">{action.label}</span>
                <span className="block text-xs font-normal text-slate-600">{action.note}</span>
              </span>
              {isCorrect && <span aria-label="정답">✓</span>}
            </button>
          );
        })}
      </div>

      {outcome && (
        <div role="status" className={`rounded-xl border p-3 text-sm ${outcome.ok ? "border-success bg-emerald-50" : "border-danger bg-red-50"}`}>
          <p className={`font-extrabold ${outcome.ok ? "text-success-strong" : "text-danger-strong"}`}>
            {outcome.ok ? "정답!" : `오답. 정답은 ${LABELS[outcome.correct]}`}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-800">
            {outcome.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
          {!outcome.ok && (
            <p className="mt-2 font-semibold text-danger-strong">
              {outcome.note}
              {outcome.trust < 0 && ` 신뢰 ${outcome.trust}`}
              {outcome.energy < 0 && ` 팀 체력 ${outcome.energy}`}
            </p>
          )}
        </div>
      )}
      {chosen && (
        <button ref={nextRef} type="button" onClick={onNext} className="btn-primary">
          {nextLabel}
        </button>
      )}

      <details className="rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold">정책서 보기</summary>
        <div className="mt-3">
          <PolicySheet day={day} />
        </div>
      </details>
      <details className="rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold">접수 대장 ({earlier.length}건)</summary>
        {earlier.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">아직 앞서 접수된 건이 없어요.</p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {earlier.map((item) => (
              <li key={item.id} className="rounded-lg bg-slate-50 px-2 py-1">
                <span className="font-bold">#{item.id}</span> {item.area} · {symptomLabel(item.symptom)}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}