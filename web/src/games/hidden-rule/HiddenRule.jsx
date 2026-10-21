import { useCallback, useEffect, useReducer, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord, scoreOn } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveResult } from "../../lib/storage.js";
import DailyCard from "../_shared/DailyCard.jsx";
import { hashSeed } from "../_shared/rng.js";
import SoundButton from "../_shared/SoundButton.jsx";
import { useAudio } from "../_shared/useAudio.js";
import { useGameBack } from "../_shared/useGameBack.js";
import { useMuted } from "../_shared/useMuted.js";
import { createAudio } from "./audio.js";
import Board from "./Board.jsx";
import { CardDefs } from "./Card.jsx";
import { dailyRun, makeRun, RUN_LEVELS } from "./engine.js";
import meta from "./meta.js";
import { MAX_SCORE, mergeResult } from "./record.js";
import { initialState, reducer, totalScore } from "./reducer.js";
import Result from "./Result.jsx";

/**
 * Hidden Rule 한 판을 진행한다. 시작 화면, 5라운드 추리, 결과 화면을 오간다.
 * 시작 화면에서 오늘(KST)의 도전과 일반 모드를 고른다. 오늘의 도전은 날짜로 라운드가 정해져 모두가 같다.
 */
export default function HiddenRule() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useGameBack(state.phase === "intro" ? 0 : 1, () => dispatch({ type: "back" }));
  const [record, setRecord] = useState(null);
  const [mode, setMode] = useState("normal");
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const [dailyResult, setDailyResult] = useState(null);
  const [muted, toggleMuted] = useMuted();
  const audio = useAudio(muted, createAudio);

  useEffect(() => {
    audio.music("play");
  }, [audio]);

  useEffect(() => {
    if (state.tests.length) audio.sfx(state.tests.at(-1).pass ? "pass" : "block");
  }, [audio, state.tests]);

  useEffect(() => {
    if (state.wrongs.length) audio.sfx("wrong");
  }, [audio, state.wrongs]);

  useEffect(() => {
    const last = state.results.at(-1);
    if (state.revealed && last.status !== "fail") audio.sfx("correct");
  }, [audio, state.revealed, state.results]);

  useEffect(() => {
    if (state.phase === "intro") setToday(kstDate(Date.now()));
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "result") return;
    const score = totalScore(state);
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
  const test = useCallback((card) => dispatch({ type: "test", card }), []);
  const select = useCallback(
    (option) => {
      audio.sfx("tick");
      dispatch({ type: "select", option });
    },
    [audio],
  );
  const submit = useCallback(() => dispatch({ type: "submit" }), []);
  const next = useCallback(() => {
    audio.sfx("select");
    dispatch({ type: "next", now: Date.now() });
  }, [audio]);

  const doneScore = scoreOn(dailyRecord, today);
  const doneToday = doneScore !== null;

  return (
    <section className="panel">
      <CardDefs />
      <div className="mb-2 flex justify-end">
        <SoundButton muted={muted} onToggle={toggleMuted} className="border-primary text-primary hover:bg-indigo-50" />
      </div>
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">숨은 규칙을 찾아내세요</h2>
          <p className="text-slate-600">
            총 {RUN_LEVELS.length}라운드 · {meta.estimatedPlayTime}
          </p>
          <p className="max-w-sm text-sm text-slate-700">
            ○가 붙은 카드는 규칙을 통과하고 ✕가 붙은 카드는 통과하지 못해요. 카드를 시험해 단서를 모으고 규칙을 맞혀 보세요.
          </p>
          <DailyCard
            date={today}
            streak={currentStreak(dailyRecord, today)}
            doneText={
              doneToday
                ? `오늘 완료 · ${doneScore} / ${MAX_SCORE}점 · 연속 ${currentStreak(dailyRecord, today)}일. 내일 새로운 규칙이 열려요.`
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
      {state.phase === "playing" && (
        <Board
          round={state.rounds[state.index]}
          index={state.index}
          total={state.rounds.length}
          score={totalScore(state)}
          tests={state.tests}
          selected={state.selected}
          wrongs={state.wrongs}
          revealed={state.revealed}
          onTest={test}
          onSelect={select}
          onSubmit={submit}
          onNext={next}
        />
      )}
      {state.phase === "result" && (
        <Result state={state} record={record} daily={mode === "daily" ? dailyResult : null} onRetry={startNormal} />
      )}
    </section>
  );
}