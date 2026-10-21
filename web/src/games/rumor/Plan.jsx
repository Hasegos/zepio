import { useEffect, useRef } from "react";
import { PICKS, ROUNDS, SPREAD_TURNS, validPlan } from "./engine.js";
import { KIND_IDS, KINDS, TYPE_IDS, TYPES } from "./village.js";

/**
 * 별 세 개의 기준을 한 줄로 적는다.
 *
 * @param round 라운드 데이터
 * @returns 기준 문구
 */
function goalText(round) {
  const [one, two, three] = round.marks;
  return round.type === "spread"
    ? `${SPREAD_TURNS}턴 뒤 믿는 사람이 ★ ${one}명 · ★★ ${two}명 · ★★★ ${three}명 이상`
    : `마지막에 믿는 사람이 ★ ${three}명 · ★★ ${two}명 · ★★★ ${one}명 이하`;
}

/**
 * 라운드 목표를 알려 주고 소문 종류와 고른 사람을 확인한 뒤 시작을 받는다.
 *
 * @param props.round 라운드 데이터
 * @param props.index 라운드 순서(0부터)
 * @param props.kind 고른 소문 종류(퍼뜨리기)
 * @param props.picks 고른 사람 번호 목록
 * @param props.onKind 소문 종류를 받는다
 * @param props.onPick 고른 사람을 빼려고 누른 번호를 받는다
 * @param props.onLaunch 소문 퍼뜨리기를 시작할 때 호출
 */
export default function Plan({ round, index, kind, picks, onKind, onPick, onLaunch }) {
  const headingRef = useRef(null);
  const spread = round.type === "spread";
  const ready = validPlan(round, { kind, picks });

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-600">
          {index + 1}라운드 / {ROUNDS}
        </p>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
          {spread ? "소문을 퍼뜨려라" : `${KINDS[round.kind].label}를 막아라`}
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          {spread
            ? `소문 종류를 하나 고르고, 첫 이야기를 건넬 사람을 1~${PICKS}명 고르세요. 시작하면 열 턴 동안 소문이 번지지만, 점수는 ${SPREAD_TURNS}턴 뒤에 믿는 사람 수로 매겨요.`
            : `${round.starters.map((person) => `${person + 1}번`).join(", ")}에서 시작된 소문이에요. 해명할 사람을 0~${PICKS}명 고르세요. 해명을 들은 사람은 소문을 믿지 않고 전하지도 않아요.`}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800">{goalText(round)}</p>
      </div>

      {spread && (
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="mb-1 text-sm font-bold">소문 종류</legend>
          {KIND_IDS.map((id) => (
            <label
              key={id}
              className={`cursor-pointer rounded-xl border-2 px-3 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${
                kind === id ? "border-primary bg-indigo-50" : "border-slate-200 bg-white"
              }`}
            >
              <input type="radio" name="kind" value={id} checked={kind === id} onChange={() => onKind(id)} className="sr-only" />
              <span className="block font-bold">{KINDS[id].label}</span>
              <span className="block text-xs text-slate-600">{KINDS[id].note}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <p className="font-bold">
          {spread ? "첫 이야기를 건넬 사람" : "해명할 사람"} ({picks.length} / {PICKS})
        </p>
        {picks.length === 0 ? (
          <p className="mt-1 text-slate-600">아래 마을에서 사람을 눌러 고르세요. 다시 누르면 취소돼요.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {picks.map((person) => (
              <li key={person}>
                <button
                  type="button"
                  onClick={() => onPick(person)}
                  aria-label={`${person + 1}번 빼기`}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 font-semibold"
                >
                  {person + 1}번 ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details open={index === 0} className="rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold">사람 유형 보기</summary>
        <ul className="mt-2 grid gap-1 text-sm">
          {TYPE_IDS.map((id) => (
            <li key={id}>
              <span className="mr-1 inline-block w-5 rounded-full bg-slate-200 text-center text-xs font-bold">{TYPES[id].mark}</span>
              <span className="font-bold">{TYPES[id].label}</span> · {TYPES[id].note}
            </li>
          ))}
        </ul>
      </details>

      <button type="button" onClick={onLaunch} disabled={!ready} className="btn-primary disabled:opacity-50">
        {spread ? "소문 퍼뜨리기" : "해명하고 지켜보기"}
      </button>
    </div>
  );
}