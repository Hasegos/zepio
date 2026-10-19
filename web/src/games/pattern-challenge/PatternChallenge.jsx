import { useCallback, useEffect, useReducer, useState } from "react";
import pool from "./data/pool.json";
import meta from "./meta.js";
import Board from "./Board.jsx";
import Result from "./Result.jsx";
import { pickPuzzles, RUN_SLOTS } from "./pick-puzzles.js";
import { PatternDefs } from "./PuzzleCell.jsx";
import { initialState, reducer } from "./reducer.js";

/**
 * Pattern Challenge 한 판을 진행한다. 시작 화면, 5문제 풀이, 결과 화면을 오간다.
 */
export default function PatternChallenge() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [now, setNow] = useState(() => Date.now());
  const playing = state.phase === "playing";

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [playing]);

  const start = useCallback(() => {
    const at = Date.now();
    setNow(at);
    dispatch({ type: "start", puzzles: pickPuzzles(pool), now: at });
  }, []);
  const select = useCallback((option) => dispatch({ type: "select", option }), []);
  const submit = useCallback(() => dispatch({ type: "submit", now: Date.now() }), []);
  const next = useCallback(() => dispatch({ type: "next", now: Date.now() }), []);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <PatternDefs />
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">패턴을 찾아 빈칸을 채워 보세요</h2>
          <p className="text-slate-600">
            총 {RUN_SLOTS.length}문제 · {meta.estimatedPlayTime}
          </p>
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-primary px-8 py-3.5 text-lg font-bold text-white"
          >
            시작하기
          </button>
        </div>
      )}
      {playing && (
        <Board
          puzzle={state.puzzles[state.index]}
          index={state.index}
          total={state.puzzles.length}
          elapsedMs={Math.max(0, now - state.startedAt)}
          selected={state.selected}
          revealed={state.revealed}
          onSelect={select}
          onSubmit={submit}
          onNext={next}
        />
      )}
      {state.phase === "result" && <Result state={state} onRetry={start} />}
    </section>
  );
}