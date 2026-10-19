import { useCallback, useEffect, useReducer, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveResult } from "../../lib/storage.js";
import pool from "./data/pool.json";
import meta from "./meta.js";
import Board from "./Board.jsx";
import Result from "./Result.jsx";
import { fetchDaily } from "./daily.js";
import { pickPuzzles, RUN_SLOTS } from "./pick-puzzles.js";
import { PatternDefs } from "./PuzzleCell.jsx";
import { mergeResult } from "./record.js";
import { correctCount, initialState, reducer } from "./reducer.js";

/**
 * Pattern Challenge 한 판을 진행한다. 시작 화면, 5문제 풀이, 결과 화면을 오간다.
 * 시작 화면에서 오늘(KST)의 도전과 일반 모드를 고른다. 오늘의 문제 파일을 못 불러오면 일반 모드만 안내한다.
 *
 * @param props.signal 화면이 사라질 때 오늘의 문제 요청을 취소하는 신호
 */
export default function PatternChallenge({ signal }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [now, setNow] = useState(() => Date.now());
  const [record, setRecord] = useState(null);
  const [mode, setMode] = useState("normal");
  const [dateKey, setDateKey] = useState(() => kstDate(Date.now()));
  const [daily, setDaily] = useState({ status: "loading", date: "", puzzles: null });
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const [dailyResult, setDailyResult] = useState(null);
  const playing = state.phase === "playing";

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    let active = true;
    fetchDaily(dateKey, signal).then((puzzles) => {
      if (active) setDaily({ status: puzzles ? "ready" : "unavailable", date: dateKey, puzzles });
    });
    return () => {
      active = false;
    };
  }, [signal, dateKey]);

  useEffect(() => {
    if (state.phase !== "result") return;
    if (mode === "daily") {
      const next = nextDailyRecord(getDaily(meta.id), daily.date, correctCount(state));
      const saved = saveDaily(meta.id, next);
      saveResult(meta.id, state.finishedAt, getGameData(meta.id));
      setDailyRecord(next);
      setDailyResult({ date: daily.date, streak: currentStreak(next, daily.date), max: next.max, saved });
      return;
    }
    const outcome = mergeResult(getGameData(meta.id), {
      correct: correctCount(state),
      ms: state.finishedAt - state.startedAt,
    });
    saveResult(meta.id, state.finishedAt, outcome.data);
    setRecord(outcome);
  }, [state]);

  const begin = useCallback((nextMode, puzzles) => {
    const at = Date.now();
    setNow(at);
    setRecord(null);
    setDailyResult(null);
    setMode(nextMode);
    dispatch({ type: "start", puzzles, now: at });
  }, []);
  const startNormal = useCallback(() => begin("normal", pickPuzzles(pool)), [begin]);
  const startDaily = useCallback(() => {
    const today = kstDate(Date.now());
    if (today !== daily.date) {
      setDaily({ status: "loading", date: "", puzzles: null });
      setDateKey(today);
      return;
    }
    begin("daily", daily.puzzles);
  }, [begin, daily.date, daily.puzzles]);
  const select = useCallback((option) => dispatch({ type: "select", option }), []);
  const submit = useCallback(() => dispatch({ type: "submit", now: Date.now() }), []);
  const next = useCallback(() => dispatch({ type: "next", now: Date.now() }), []);

  const doneToday = daily.status === "ready" && dailyRecord?.last === daily.date;
  const dailyOpen = daily.status === "ready" && !doneToday;
  const streak = currentStreak(dailyRecord, daily.date);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <PatternDefs />
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">패턴을 찾아 빈칸을 채워 보세요</h2>
          <p className="text-slate-600">
            총 {RUN_SLOTS.length}문제 · {meta.estimatedPlayTime}
          </p>
          <div className="w-full max-w-sm rounded-xl border border-primary/30 bg-indigo-50 p-4" aria-live="polite">
            <p className="font-bold">오늘의 도전</p>
            {daily.status === "loading" && <p className="mt-1 text-sm text-slate-700">오늘의 문제를 확인하는 중…</p>}
            {daily.status === "unavailable" && (
              <p className="mt-1 text-sm text-slate-700">
                오늘의 도전을 준비하지 못했어요. 일반 모드로 즐겨 보세요.
              </p>
            )}
            {dailyOpen && (
              <>
                <p className="mt-1 text-sm text-slate-700">
                  {daily.date} · 모두가 같은 5문제{streak > 0 ? ` · 연속 ${streak}일 도전 중` : ""}
                </p>
                <button
                  type="button"
                  onClick={startDaily}
                  className="mt-3 w-full rounded-xl bg-primary px-6 py-3 text-lg font-bold text-white"
                >
                  오늘의 도전 시작하기
                </button>
              </>
            )}
            {doneToday && (
              <p className="mt-1 text-sm text-slate-700">
                오늘 완료 · 정답 {dailyRecord.history?.[daily.date] ?? 0} / {RUN_SLOTS.length} · 연속 {streak}일. 내일
                새로운 문제가 열려요.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={startNormal}
            className={`w-full max-w-sm rounded-xl px-8 py-3.5 text-lg font-bold ${
              dailyOpen ? "border-2 border-primary bg-white text-primary" : "bg-primary text-white"
            }`}
          >
            일반 모드로 시작하기
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
      {state.phase === "result" && <Result state={state} record={record} dailyResult={mode === "daily" ? dailyResult : null} onRetry={startNormal} />}
    </section>
  );
}