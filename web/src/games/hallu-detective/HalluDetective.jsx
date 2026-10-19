import { useEffect, useReducer, useRef, useState } from "react";
import ShareButton from "../ShareButton.jsx";
import { titleFor } from "./logic.js";
import meta from "./meta.js";
import Office from "./Office.jsx";
import Puzzle from "./Puzzle.jsx";
import { mergeEnding, readData, restore, snapshot } from "./record.js";
import { initialState, reducer, summary } from "./reducer.js";
import { PUZZLES } from "./puzzles.js";
import { getGameData, saveGameData, saveResult } from "../../lib/storage.js";

const big =
  "rounded-xl border-4 border-det-ink px-4 py-3 text-base font-extrabold shadow-[0_3px_0_0_#1c2742] active:translate-y-0.5";

/**
 * 모든 사건을 푼 뒤의 화면을 보여 준다. 도우의 고백과 점수, 칭호가 나온다.
 *
 * @param props.state 게임 상태
 * @param props.saved 기록을 저장했는지(false면 경고)
 */
function Ending({ state, saved, onResume }) {
  const { total, wrong } = summary(state);
  const title = titleFor(total);
  const text = `Zepio 환각 탐정\n${title} · ${total}점 (오답 ${wrong}번)`;
  return (
    <div className="flex flex-col gap-4 rounded-xl border-4 border-det-ink bg-det-paper p-5 text-det-ink">
      <h2 className="text-center text-2xl font-extrabold">모든 사건 해결!</h2>
      <p className="text-center text-3xl font-extrabold text-det-accent">{title}</p>
      <p className="text-center text-lg font-extrabold">
        {total}점 <span className="text-sm text-det-ink/80">(오답 {wrong}번)</span>
      </p>
      <div className="rounded-xl border-2 border-det-ink bg-white p-3 text-sm font-semibold leading-relaxed">
        <p className="font-extrabold text-det-accent">도우</p>
        <p>사실 저는 일부러 틀린 보고서를 가져왔어요. 당신이 근거를 확인하는 법을 익히길 바랐거든요.</p>
        <p className="mt-1">AI의 말은 참고하되, 숫자와 날짜와 출처는 늘 원문과 대조하세요. 그게 진짜 탐정의 일이에요.</p>
      </div>
      {saved === false && <p className="text-sm font-bold text-det-bad">기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.</p>}
      <ShareButton title="Zepio 환각 탐정" text={text} path={`/games/${meta.slug}/`} />
      <button type="button" onClick={onResume} className={`${big} bg-det-accent text-white`}>
        사무소로 돌아가기
      </button>
    </div>
  );
}

/**
 * 환각 탐정. 사무소에서 사건을 골라 퍼즐을 풀고, 모두 풀면 엔딩을 본다.
 * 코인, 힌트, 푼 사건은 이벤트마다 저장하고 엔딩에서 기록을 남긴다.
 */
export default function HalluDetective() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const saved = restore(readData(getGameData(meta.id)).save);
    return saved ?? initialState();
  });
  const [saved, setSaved] = useState(null);
  const latest = useRef(state);
  latest.current = state;
  const rootRef = useRef(null);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!state.saveTick) return;
    const prev = readData(getGameData(meta.id));
    saveGameData(meta.id, Date.now(), { ...prev, save: snapshot(latest.current) });
  }, [state.saveTick]);

  useEffect(() => {
    if (state.phase !== "ending" || endedRef.current) return;
    endedRef.current = true;
    const prev = readData(getGameData(meta.id));
    setSaved(saveResult(meta.id, Date.now(), mergeEnding(prev, state.solved, snapshot(state))).saved);
  }, [state]);

  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: "start" });
    rootRef.current?.focus({ preventScroll: true });
  }, [state.phase, state.puzzle?.id]);

  return (
    <section ref={rootRef} tabIndex={-1} className="scroll-mt-2 rounded-2xl outline-none bg-white p-3 shadow-sm sm:p-5">
      {state.phase === "office" && (
        <>
          <h2 className="mb-3 text-lg font-extrabold text-det-ink">탐정 사무소 · 사건 {PUZZLES.length}건</h2>
          <Office state={state} onOpen={(id) => dispatch({ type: "open", id })} onSpot={(id) => dispatch({ type: "spot", id })} />
        </>
      )}
      {state.phase === "puzzle" && <Puzzle key={state.puzzle.id} state={state} dispatch={dispatch} />}
      {state.phase === "ending" && <Ending state={state} saved={saved} onResume={() => dispatch({ type: "resume" })} />}
    </section>
  );
}