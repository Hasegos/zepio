import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord, scoreOn } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveResult } from "../../lib/storage.js";
import DailyCard from "../_shared/DailyCard.jsx";
import { hashSeed } from "../_shared/rng.js";
import SoundButton from "../_shared/SoundButton.jsx";
import { useAudio } from "../_shared/useAudio.js";
import { useGameBack } from "../_shared/useGameBack.js";
import { useMuted } from "../_shared/useMuted.js";
import { createAudio } from "./audio.js";
import { dailyRun, makeRun, PICKS, ROUNDS } from "./engine.js";
import meta from "./meta.js";
import Plan from "./Plan.jsx";
import Playback from "./Playback.jsx";
import { MAX_SCORE, mergeResult } from "./record.js";
import { initialState, reducer, totalStars } from "./reducer.js";
import Result from "./Result.jsx";
import { TURNS } from "./sim.js";
import Village from "./Village.jsx";
import { makeVillage } from "./village.js";

const TICK_MS = 800;

/**
 * 소문 한 마디 한 판을 진행한다. 시작 화면, 라운드마다 계획과 진행, 결과 화면을 오간다.
 * 시작 화면에서 오늘(KST)의 도전과 일반 모드를 고른다. 오늘의 도전은 날짜로 판이 정해져 모두가 같다.
 */
export default function Rumor() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useGameBack(state.phase === "intro" ? 0 : 1, () => dispatch({ type: "back" }));
  const [record, setRecord] = useState(null);
  const [mode, setMode] = useState("normal");
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const [dailyResult, setDailyResult] = useState(null);
  const [muted, toggleMuted] = useMuted();
  const audio = useAudio(muted, createAudio);

  const round = state.rounds[state.round];
  const village = useMemo(() => (round ? makeVillage(round.seed) : null), [round]);

  useEffect(() => {
    audio.music("play");
  }, [audio]);

  useEffect(() => {
    if (state.phase !== "play") return;
    if (state.turn === 0) audio.sfx("start");
    else if (state.turn < TURNS) audio.sfx("pop");
    else audio.sfx(state.outcome.stars > 0 ? "good" : "fail");
  }, [audio, state.phase, state.turn, state.outcome]);

  useEffect(() => {
    if (state.phase === "intro") setToday(kstDate(Date.now()));
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "play" || state.turn >= TURNS) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dispatch({ type: "skip" });
      return undefined;
    }
    const timer = setTimeout(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearTimeout(timer);
  }, [state.phase, state.turn]);

  useEffect(() => {
    if (state.phase !== "result") return;
    const score = totalStars(state);
    if (mode === "daily") {
      const next = nextDailyRecord(getDaily(meta.id), today, score);
      saveDaily(meta.id, next);
      saveResult(meta.id, state.finishedAt, getGameData(meta.id));
      setDailyRecord(next);
      setDailyResult({ date: today, streak: currentStreak(next, today) });
      return;
    }
    const outcome = mergeResult(getGameData(meta.id), { score });
    saveResult(meta.id, state.finishedAt, outcome.data);
    setRecord(outcome);
  }, [state, mode, today]);

  const begin = useCallback((nextMode, rounds) => {
    setRecord(null);
    setDailyResult(null);
    setMode(nextMode);
    dispatch({ type: "start", rounds, now: Date.now() });
  }, []);
  const startNormal = useCallback(() => begin("normal", makeRun(hashSeed(`${meta.id}:${Date.now()}:${Math.random()}`))), [begin]);
  const startDaily = useCallback(() => {
    const date = kstDate(Date.now());
    setToday(date);
    begin("daily", dailyRun(date));
  }, [begin]);
  const pick = useCallback(
    (person) => {
      audio.sfx("tick");
      dispatch({ type: "pick", person });
    },
    [audio],
  );
  const setKind = useCallback(
    (kind) => {
      audio.sfx("tick");
      dispatch({ type: "kind", kind });
    },
    [audio],
  );
  const launch = useCallback(() => dispatch({ type: "launch" }), []);
  const skip = useCallback(() => dispatch({ type: "skip" }), []);
  const next = useCallback(() => dispatch({ type: "next", now: Date.now() }), []);

  const doneScore = scoreOn(dailyRecord, today);
  const doneToday = doneScore !== null;

  return (
    <section className="panel">
      <div className="mb-2 flex justify-end">
        <SoundButton muted={muted} onToggle={toggleMuted} className="border-primary text-primary hover:bg-indigo-50" />
      </div>
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">소문 한 마디로 마을을 움직여 보세요</h2>
          <p className="text-slate-600">
            {ROUNDS}라운드 · 별 {MAX_SCORE}개 · {meta.estimatedPlayTime}
          </p>
          <p className="max-w-sm text-sm text-slate-700">
            60명이 사는 마을에서 첫 이야기를 건넬 사람을 고르면 소문이 이웃을 타고 번져요. 수다쟁이는 널리 퍼뜨리고 의심쟁이는 두 번 들어야 믿어요. 때로는 퍼뜨리고, 때로는 막아야 해요.
          </p>
          <DailyCard
            date={today}
            streak={currentStreak(dailyRecord, today)}
            doneText={
              doneToday
                ? `오늘 완료 · 별 ${doneScore} / ${MAX_SCORE}개 · 연속 ${currentStreak(dailyRecord, today)}일. 내일 새로운 마을이 열려요.`
                : null
            }
            onStart={startDaily}
          />
          <button
            type="button"
            onClick={startNormal}
            className={`w-full max-w-sm rounded-xl px-8 py-3.5 text-lg font-bold ${
              doneToday ? "bg-primary text-white" : "border-2 border-primary bg-white text-primary"
            }`}
          >
            일반 모드로 시작하기
          </button>
        </div>
      )}
      {(state.phase === "plan" || state.phase === "play") && round && (
        <div className="flex flex-col gap-4">
          {state.phase === "plan" ? (
            <Plan round={round} index={state.round} kind={state.kind} picks={state.picks} onKind={setKind} onPick={pick} onLaunch={launch} />
          ) : (
            <Playback round={round} index={state.round} outcome={state.outcome} turn={state.turn} onSkip={skip} onNext={next} />
          )}
          <Village
            key={state.round}
            village={village}
            round={round}
            picks={state.picks}
            outcome={state.outcome}
            turn={state.turn}
            onPick={state.phase === "plan" ? pick : undefined}
          />
          {state.phase === "plan" && (
            <p className="text-center text-xs text-slate-600">
              굵은 선일수록 가까운 이웃이에요. 최대 {PICKS}명까지 고를 수 있어요.
            </p>
          )}
        </div>
      )}
      {state.phase === "result" && (
        <Result state={state} record={record} daily={mode === "daily" ? dailyResult : null} onRetry={startNormal} />
      )}
    </section>
  );
}