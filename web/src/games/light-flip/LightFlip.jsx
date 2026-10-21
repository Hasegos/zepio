import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveResult } from "../../lib/storage.js";
import DailyCard from "../_shared/DailyCard.jsx";
import { hashSeed, makeRng } from "../_shared/rng.js";
import SoundButton from "../_shared/SoundButton.jsx";
import { useAudio } from "../_shared/useAudio.js";
import { useMuted } from "../_shared/useMuted.js";
import { createAudio } from "./audio.js";
import meta from "./meta.js";
import Grid from "./Grid.jsx";
import { makeStages, STAGE_RANGES } from "./puzzle.js";
import { mergeResult } from "./record.js";
import Result from "./Result.jsx";
import { initialState, reducer, totals } from "./reducer.js";
import { formatDuration } from "../_shared/time.js";
import { useGameBack } from "../_shared/useGameBack.js";

/**
 * Light Flip 한 판을 진행한다. 시작 화면, 5판 풀이, 결과 화면을 오간다.
 * 경과 시간은 1초 타이머로 갱신하고 화면에서 사라지면 해제한다.
 */
export default function LightFlip() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useGameBack(state.phase === "intro" ? 0 : 1, () => dispatch({ type: "back" }));
  const [now, setNow] = useState(() => Date.now());
  const [record, setRecord] = useState(null);
  const [mode, setMode] = useState("normal");
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const [dailyResult, setDailyResult] = useState(null);
  const headingRef = useRef(null);
  const nextRef = useRef(null);
  const [muted, toggleMuted] = useMuted();
  const audio = useAudio(muted, createAudio);
  const playing = state.phase === "playing";
  const stage = playing ? state.stages[state.index] : null;
  const isLast = playing && state.index === state.stages.length - 1;

  useEffect(() => {
    audio.music(playing ? "play" : "menu");
  }, [audio, playing]);

  useEffect(() => {
    if (state.solved) audio.sfx("clear");
  }, [audio, state.solved]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (state.phase !== "result") return;
    const { extra } = totals(state);
    if (mode === "daily") {
      const next = nextDailyRecord(getDaily(meta.id), today, extra);
      saveDaily(meta.id, next);
      saveResult(meta.id, state.finishedAt, getGameData(meta.id));
      setDailyRecord(next);
      setDailyResult({ date: today, streak: currentStreak(next, today) });
      return;
    }
    const outcome = mergeResult(getGameData(meta.id), { extra, ms: state.finishedAt - state.startedAt });
    saveResult(meta.id, state.finishedAt, outcome.data);
    setRecord(outcome);
  }, [state, mode, today]);

  useEffect(() => {
    if (playing) headingRef.current?.focus({ preventScroll: true });
  }, [playing, state.index]);

  useEffect(() => {
    if (state.solved) nextRef.current?.focus({ preventScroll: true });
  }, [state.solved]);

  const begin = useCallback((nextMode, date) => {
    const at = Date.now();
    setNow(at);
    setRecord(null);
    setDailyResult(null);
    setMode(nextMode);
    dispatch({ type: "start", stages: makeStages(date ? makeRng(hashSeed(`${meta.id}:${date}`)) : undefined), now: at });
  }, []);
  const start = useCallback(() => begin("normal", null), [begin]);
  const startDaily = useCallback(() => {
    const date = kstDate(Date.now());
    setToday(date);
    begin("daily", date);
  }, [begin]);
  const press = useCallback(
    (cell) => {
      audio.sfx("flip");
      dispatch({ type: "press", cell });
    },
    [audio],
  );
  const rewind = useCallback(
    (type) => {
      audio.sfx("undo");
      dispatch({ type });
    },
    [audio],
  );

  return (
    <section className="panel">
      <div className="mb-2 flex justify-end">
        <SoundButton muted={muted} onToggle={toggleMuted} className="border-primary text-primary hover:bg-indigo-50" />
      </div>
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">모든 불을 꺼 보세요</h2>
          <p className="text-slate-600">
            총 {STAGE_RANGES.length}판 · {meta.estimatedPlayTime}
          </p>
          <DailyCard
            date={today}
            streak={currentStreak(dailyRecord, today)}
            doneText={
              dailyRecord?.last === today
                ? `오늘 완료 · 추가 이동 ${dailyRecord.history?.[today] ?? 0}회 · 연속 ${currentStreak(dailyRecord, today)}일. 내일 새로운 판이 열려요.`
                : null
            }
            onStart={startDaily}
          />
          <button
            type="button"
            onClick={start}
            className={`w-full max-w-sm rounded-xl px-8 py-3.5 text-lg font-bold ${
              dailyRecord?.last === today ? "bg-primary text-white" : "border-2 border-primary bg-white text-primary"
            }`}
          >
            일반 모드로 시작하기
          </button>
        </div>
      )}
      {playing && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
            <span>
              {state.index + 1}판 / {state.stages.length}판
            </span>
            <span>
              이동 {state.history.length} · 최소 {stage.par}
            </span>
            <span>{formatDuration(now - state.startedAt)}</span>
          </div>
          <h2 ref={headingRef} tabIndex={-1} className="text-center text-lg font-bold outline-none">
            칸을 누르면 그 칸과 위아래좌우의 불이 뒤집혀요
          </h2>
          <Grid board={state.board} disabled={state.solved} onPress={press} />
          <p role="status" className="min-h-6 text-center font-bold text-success-strong">
            {state.solved ? `클리어! 이동 ${state.history.length}회 (최소 ${stage.par}회)` : ""}
          </p>
          {state.solved ? (
            <button
              ref={nextRef}
              type="button"
              onClick={() => dispatch({ type: "next", now: Date.now() })}
              className="btn-primary"
            >
              {isLast ? "결과 보기" : "다음 판"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={state.history.length === 0}
                onClick={() => rewind("undo")}
                className="rounded-xl border-2 border-primary bg-white px-4 py-3 font-bold text-primary disabled:border-slate-200 disabled:text-slate-500"
              >
                되돌리기
              </button>
              <button
                type="button"
                disabled={state.history.length === 0}
                onClick={() => rewind("restart")}
                className="rounded-xl border-2 border-primary bg-white px-4 py-3 font-bold text-primary disabled:border-slate-200 disabled:text-slate-500"
              >
                이 판 다시 시작
              </button>
            </div>
          )}
        </div>
      )}
      {state.phase === "result" && <Result state={state} record={record} daily={mode === "daily" ? dailyResult : null} onRetry={start} />}
    </section>
  );
}