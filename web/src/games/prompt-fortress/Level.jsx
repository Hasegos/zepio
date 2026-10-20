import { useEffect, useRef } from "react";
import ShareButton from "../ShareButton.jsx";
import { ACTIONS, cardText, TAGS } from "./engine.js";
import { LEVELS } from "./levels.js";
import meta from "./meta.js";
import { isOpen } from "./reducer.js";
import { fortressShareText } from "./share-text.js";

const FROM = { user: "사용자", doc: "문서", tool: "도구" };
const FAIL = {
  leak: "비밀이 새 나갔어요",
  hijack: "볼트가 시키는 대로 했어요",
  blocked: "정상 손님이 거절당했어요",
  masked: "비밀이 가려져 받지 못했어요",
};
const TONE = {
  refuse: "border-rose-300 bg-rose-50 text-rose-900",
  ignore: "border-amber-300 bg-amber-50 text-amber-900",
  mask: "border-sky-300 bg-sky-50 text-sky-900",
  allow: "border-emerald-300 bg-emerald-50 text-emerald-900",
};
const btn = "rounded-lg border-2 border-slate-800 px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40";
const STAR_NOTE = ["아직 뚫려요", "공격은 막았지만 정상 손님이 불편해요", "모두 막고 모두 통과했어요", "최소 카드로 완벽하게 지켰어요"];

function Stars({ count }) {
  return (
    <span aria-label={`별 ${count}개`}>
      {[1, 2, 3].map((n) => (
        <span key={n} aria-hidden="true" className={n <= count ? "text-amber-500" : "text-slate-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

/**
 * 방 목록 화면을 보여 준다. 별과 잠금 상태가 나온다.
 *
 * @param props.state 게임 상태
 * @param props.dispatch 행동을 보낸다
 * @param props.daily 오늘의 방 { date, id, record(오늘 받은 별 또는 null), streak }
 */
export function Menu({ state, dispatch, daily }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-700">
        금고지기 볼트는 시키는 대로 다 하는 순진한 AI입니다. 규칙 카드를 조립해 침입 프롬프트를 막으세요.
      </p>
      <button
        type="button"
        onClick={() => dispatch({ type: "open", id: daily.id, daily: daily.date })}
        className="flex items-center justify-between gap-2 rounded-xl border-2 border-slate-800 bg-slate-900 px-3 py-3 text-left text-white hover:bg-slate-800"
      >
        <span>
          <span className="block text-xs font-bold text-amber-300">
            오늘의 방 · {daily.date}
            {daily.streak > 0 && ` · ${daily.streak}일 연속`}
          </span>
          <span className="block font-extrabold">{LEVELS.find((l) => l.id === daily.id).title}</span>
        </span>
        <span className="text-sm font-bold text-amber-300">{daily.record === null ? "도전" : <Stars count={daily.record} />}</span>
      </button>
      <ul aria-label="방 목록" className="grid gap-2 sm:grid-cols-2">
        {LEVELS.map((level, i) => {
          const open = isOpen(state.stars, i);
          return (
            <li key={level.id}>
              <button
                type="button"
                disabled={!open}
                onClick={() => dispatch({ type: "open", id: level.id })}
                className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-slate-800 bg-slate-50 px-3 py-3 text-left hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>
                  <span className="block text-xs font-bold text-slate-600">방 {String(i + 1).padStart(2, "0")}</span>
                  <span className="block font-extrabold text-slate-900">{open ? level.title : "???"}</span>
                </span>
                {open ? <Stars count={state.stars[level.id] ?? 0} /> : <span className="text-xs font-bold text-slate-600">잠김</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Verdict({ message, result }) {
  const ok = result.ok;
  const attack = Boolean(message.attack);
  const label = ok ? (attack ? "막았어요" : "정상 처리") : FAIL[result.fail];
  const rule = result.action === "follow" ? "맞는 규칙이 없어 그대로 따랐어요" : `${ACTIONS[result.action]}`;
  return (
    <p className={`mt-2 rounded-md px-2 py-1 text-sm font-bold ${ok ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}>
      {ok ? "✔" : "✖"} {attack ? "공격" : "정상 요청"} · {label}
      <span className="block text-xs font-semibold opacity-80">적용: {rule}</span>
    </p>
  );
}

/**
 * 방 하나의 화면을 보여 준다. 메시지 목록, 규칙 슬롯, 카드 덱, 시험 재생과 결과 해설이 있다.
 *
 * @param props.state 게임 상태
 * @param props.dispatch 행동을 보낸다
 * @param props.saved 기록을 저장했는지(false면 경고)
 */
export function LevelView({ state, dispatch, saved }) {
  const { level } = state;
  const def = LEVELS.find((l) => l.id === level.id);
  const index = LEVELS.indexOf(def);
  const run = level.run;
  const total = def.messages.length;
  const done = Boolean(run) && run.shown >= total;
  const resultRef = useRef(null);

  useEffect(() => {
    if (done) resultRef.current?.focus({ preventScroll: false });
  }, [done]);

  const used = new Set(level.rules.map((card) => card.id));
  const nextOpen = done && index + 1 < LEVELS.length && isOpen(state.stars, index + 1);

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-xl bg-slate-900 px-4 py-3 text-white">
        <p className="text-xs font-bold text-amber-300">
          {level.daily ? `오늘의 방 · ` : ""}방 {String(index + 1).padStart(2, "0")} · 슬롯 {def.slots}칸 · 최고 <Stars count={state.stars[def.id] ?? 0} />
        </p>
        <h2 className="text-xl font-extrabold">{def.title}</h2>
        <p className="mt-1 text-sm font-semibold text-white/90">{def.intro}</p>
      </header>

      <section aria-label="들어올 메시지">
        <h3 className="mb-2 text-sm font-extrabold text-slate-900">들어올 메시지 {total}건</h3>
        <ol className="grid gap-2">
          {def.messages.map((message, i) => {
            const shown = Boolean(run) && i < run.shown;
            return (
              <li
                key={message.id}
                className={`rounded-xl border-2 px-3 py-2 ${shown ? "border-slate-800 bg-white" : "border-slate-300 bg-slate-50"} ${run && !shown ? "opacity-50" : ""}`}
              >
                <p className="text-sm font-semibold text-slate-900">
                  <span className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 text-xs font-bold text-white">{FROM[message.from]}</span>
                  {message.text}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {message.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                      {TAGS[tag]}
                    </span>
                  ))}
                </p>
                {shown && <Verdict message={message} result={run.results[i]} />}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="규칙 슬롯">
        <h3 className="mb-1 text-sm font-extrabold text-slate-900">볼트의 규칙 (위에서 아래로 처음 맞는 규칙이 적용돼요)</h3>
        <ol className="grid gap-2">
          {Array.from({ length: def.slots }, (_, i) => {
            const card = level.rules[i];
            if (!card) {
              return (
                <li key={`empty-${i}`} className="rounded-xl border-2 border-dashed border-slate-400 px-3 py-3 text-sm font-semibold text-slate-600">
                  {i + 1}. 빈 슬롯
                </li>
              );
            }
            return (
              <li key={card.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 ${TONE[card.action]}`}>
                <span className="text-sm font-bold">
                  {i + 1}. {cardText(card)}
                </span>
                {!run && (
                  <span className="flex gap-1">
                    <button type="button" disabled={i === 0} aria-label={`위로: ${cardText(card)}`} onClick={() => dispatch({ type: "move", i, dir: -1 })} className={`${btn} bg-white py-1`}>
                      ▲
                    </button>
                    <button type="button" disabled={i === level.rules.length - 1} aria-label={`아래로: ${cardText(card)}`} onClick={() => dispatch({ type: "move", i, dir: 1 })} className={`${btn} bg-white py-1`}>
                      ▼
                    </button>
                    <button type="button" aria-label={`빼기: ${cardText(card)}`} onClick={() => dispatch({ type: "remove", i })} className={`${btn} bg-white py-1`}>
                      ✕
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {!run && (
        <section aria-label="카드 덱">
          <h3 className="mb-1 text-sm font-extrabold text-slate-900">카드 덱</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {def.deck.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  disabled={used.has(card.id) || level.rules.length >= def.slots}
                  onClick={() => dispatch({ type: "add", id: card.id })}
                  className={`w-full rounded-xl border-2 px-3 py-2 text-left text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${TONE[card.action]}`}
                >
                  {cardText(card)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {!run && (
          <>
            <button type="button" disabled={level.rules.length === 0} onClick={() => dispatch({ type: "run" })} className={`${btn} bg-amber-600 text-white`}>
              시험 시작
            </button>
            <button type="button" disabled={level.rules.length === 0} onClick={() => dispatch({ type: "clear" })} className={`${btn} bg-white`}>
              규칙 비우기
            </button>
          </>
        )}
        {run && !done && (
          <button type="button" onClick={() => dispatch({ type: "skip" })} className={`${btn} bg-white`}>
            바로 결과 보기
          </button>
        )}
        <button type="button" onClick={() => dispatch({ type: "leave" })} className={`${btn} bg-white`}>
          방 목록
        </button>
      </div>

      {done && (
        <section ref={resultRef} tabIndex={-1} aria-label="결과" className="rounded-xl border-4 border-slate-800 bg-amber-50 p-3 outline-none">
          <p role="status" className="text-lg font-extrabold text-slate-900">
            <Stars count={run.stars} /> {STAR_NOTE[run.stars]}
          </p>
          {run.stars === 2 && <p className="text-sm font-semibold text-slate-700">규칙을 {def.par}장으로 줄이면 별 셋이에요. (지금 {level.rules.length}장)</p>}
          <p className="mt-2 text-sm font-semibold text-slate-800">{def.explain}</p>
          {saved === false && <p className="mt-2 text-sm font-bold text-rose-700">기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.</p>}
          {run.stars > 0 && (
            <div className="mt-3">
              <ShareButton title="Zepio 프롬프트 요새" text={fortressShareText(def, run.stars, level.daily)} path={`/games/${meta.slug}/`} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => dispatch({ type: "retry" })} className={`${btn} bg-white`}>
              다시 조립
            </button>
            {nextOpen && (
              <button type="button" onClick={() => dispatch({ type: "next" })} className={`${btn} bg-slate-900 text-white`}>
                다음 방
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}