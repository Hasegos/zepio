import { useEffect, useRef } from "react";
import ShareButton from "../_shared/ShareButton.jsx";
import meta from "./meta.js";
import { MAX_SCORE } from "./record.js";
import { totalScore } from "./reducer.js";
import { ruleById } from "./rules.js";
import { hiddenRuleShareText } from "./share-text.js";

const STATUS_TEXT = { ok: "한 번에 정답", retry: "두 번째에 정답", fail: "실패" };

/**
 * 점수에 맞는 한 줄 평가를 고른다.
 *
 * @param score 한 판 점수
 * @returns 결과 제목
 */
function headline(score) {
  if (score >= 22) return "규칙 탐정이에요!";
  if (score >= 16) return "대단해요!";
  if (score >= 9) return "잘했어요!";
  return "다시 도전해 보세요!";
}

/**
 * 결과 요약과 라운드별 정답 규칙을 보여 주고 다시 도전을 받는다.
 *
 * @param props.state 끝난 판의 상태
 * @param props.record 저장한 최고 기록과 새 기록 여부, 오늘의 도전이거나 저장 전에는 null
 * @param props.daily 오늘의 도전이면 { date, streak }, 아니면 null
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 */
export default function Result({ state, record, daily, onRetry }) {
  const headingRef = useRef(null);
  const score = totalScore(state);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {headline(score)}
        </h2>
        <p className="mt-1 text-slate-600">Hidden Rule{daily ? ` · 오늘의 도전 · 연속 ${daily.streak}일` : ""} 완료</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="stat-tile">
          <dt className="text-sm text-slate-600">점수</dt>
          <dd className="text-2xl font-extrabold">
            {score} / {MAX_SCORE}
          </dd>
        </div>
        <div className="stat-tile">
          <dt className="text-sm text-slate-600">시험 횟수</dt>
          <dd className="text-2xl font-extrabold">{state.results.reduce((sum, result) => sum + result.tests, 0)}회</dd>
        </div>
      </dl>

      <ol className="grid gap-1 text-sm text-slate-700">
        {state.results.map((result, i) => (
          <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-bold">
              {i + 1}라운드 · {STATUS_TEXT[result.status]} · {result.score}점
            </span>
            <span className="block text-slate-600">정답 규칙: {ruleById(state.rounds[i].rule).text}</span>
          </li>
        ))}
      </ol>

      {!daily && record && (
        <p className="text-center text-sm text-slate-600">
          {record.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}내 최고 기록: {record.data.bestScore} / {MAX_SCORE}점
        </p>
      )}

      <ShareButton title="Zepio Hidden Rule" text={hiddenRuleShareText(state, daily?.date)} path={`/games/${meta.slug}/`} />

      <button type="button" onClick={onRetry} className="btn-primary">
        일반 모드로 다시 도전
      </button>
    </div>
  );
}