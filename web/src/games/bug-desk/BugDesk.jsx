import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord, scoreOn } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveResult } from "../../lib/storage.js";
import DailyCard from "../_shared/DailyCard.jsx";
import { hashSeed } from "../_shared/rng.js";
import SoundButton from "../_shared/SoundButton.jsx";
import { useAudio } from "../_shared/useAudio.js";
import { useGameBack } from "../_shared/useGameBack.js";
import { useMuted } from "../_shared/useMuted.js";
import { createAudio } from "./audio.js";
import Desk from "./Desk.jsx";
import { dailyRun, DAYS, makeRun, PER_DAY } from "./engine.js";
import Meters from "./Meters.jsx";
import meta from "./meta.js";
import PolicySheet from "./PolicySheet.jsx";
import { MAX_SCORE, mergeResult } from "./record.js";
import { dayScore, initialState, reducer, totalScore } from "./reducer.js";
import Result from "./Result.jsx";
import { POLICIES } from "./rules.js";

/**
 * 버그 접수처 한 판을 진행한다. 시작 화면, 날마다 정책서 확인과 접수 분류와 정산, 결과 화면을 오간다.
 * 시작 화면에서 오늘(KST)의 도전과 일반 모드를 고른다. 오늘의 도전은 날짜로 판이 정해져 모두가 같다.
 */
export default function BugDesk() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useGameBack(state.phase === "intro" ? 0 : 1, () => dispatch({ type: "back" }));
  const [record, setRecord] = useState(null);
  const [mode, setMode] = useState("normal");
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const [dailyResult, setDailyResult] = useState(null);
  const briefRef = useRef(null);
  const [muted, toggleMuted] = useMuted();
  const audio = useAudio(muted, createAudio);

  useEffect(() => {
    audio.music(state.phase === "playing" ? "play" : "menu");
  }, [audio, state.phase]);

  useEffect(() => {
    if (state.chosen !== null) audio.sfx(state.results.at(-1).ok ? "correct" : "wrong");
  }, [audio, state.chosen, state.results]);

  useEffect(() => {
    if (state.phase === "intro") setToday(kstDate(Date.now()));
    if (state.phase === "brief") briefRef.current?.focus({ preventScroll: true });
  }, [state.phase, state.day]);

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

  const begin = useCallback((nextMode, days) => {
    setRecord(null);
    setDailyResult(null);
    setMode(nextMode);
    dispatch({ type: "start", days, now: Date.now() });
  }, []);
  const startNormal = useCallback(() => begin("normal", makeRun(hashSeed(`${meta.id}:${Date.now()}:${Math.random()}`))), [begin]);
  const startDaily = useCallback(() => {
    const date = kstDate(Date.now());
    setToday(date);
    begin("daily", dailyRun(date));
  }, [begin]);
  const open = useCallback(() => {
    audio.sfx("select");
    dispatch({ type: "open" });
  }, [audio]);
  const choose = useCallback(
    (action) => {
      audio.sfx("stamp");
      dispatch({ type: "choose", action });
    },
    [audio],
  );
  const next = useCallback(() => {
    audio.sfx("select");
    dispatch({ type: "next", now: Date.now() });
  }, [audio]);
  const proceed = useCallback(() => {
    audio.sfx("select");
    dispatch({ type: "continue" });
  }, [audio]);

  const doneScore = scoreOn(dailyRecord, today);
  const doneToday = doneScore !== null;
  const report = state.days[state.day]?.[state.index];

  return (
    <section className="panel">
      <div className="mb-2 flex justify-end">
        <SoundButton muted={muted} onToggle={toggleMuted} className="border-primary text-primary hover:bg-indigo-50" />
      </div>
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">오늘의 버그 접수를 맡아 주세요</h2>
          <p className="text-slate-600">
            {DAYS}일 · 하루 {PER_DAY}건 · {meta.estimatedPlayTime}
          </p>
          <p className="max-w-sm text-sm text-slate-700">
            밀려드는 버그 신고를 정책서대로 분류하세요. 급한 건을 늦추면 장애가 나고, 급하지 않은 건에 팀을 갈아 넣으면 번아웃이 와요. 날마다 정책이 하나씩 늘어요.
          </p>
          <DailyCard
            date={today}
            streak={currentStreak(dailyRecord, today)}
            doneText={
              doneToday
                ? `오늘 완료 · ${doneScore} / ${MAX_SCORE}건 · 연속 ${currentStreak(dailyRecord, today)}일. 내일 새로운 접수가 열려요.`
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
      {state.phase === "brief" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-600">
              {state.day + 1}일차 / {DAYS}
            </p>
            <h2 ref={briefRef} tabIndex={-1} className="text-xl font-extrabold outline-none">{state.day === 0 ? POLICIES[0].title : `정책서 개정 · ${POLICIES[state.day].title}`}</h2>
          </div>
          <Meters trust={state.trust} energy={state.energy} />
          <PolicySheet day={state.day} highlightNew />
          <button type="button" onClick={open} className="btn-primary">
            접수 시작 ({PER_DAY}건)
          </button>
        </div>
      )}
      {state.phase === "playing" && report && (
        <Desk
          report={report}
          day={state.day}
          index={state.index}
          trust={state.trust}
          energy={state.energy}
          chosen={state.chosen}
          earlier={state.days.flat().slice(0, report.id - 1)}
          last={state.index === PER_DAY - 1}
          finalDay={state.day === DAYS - 1}
          onChoose={choose}
          onNext={next}
        />
      )}
      {state.phase === "summary" && (
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-xl font-extrabold">{state.day + 1}일차 정산</h2>
          <p className="text-3xl font-extrabold">
            {dayScore(state, state.day)} / {PER_DAY}건
          </p>
          <Meters trust={state.trust} energy={state.energy} />
          <button type="button" onClick={proceed} className="btn-primary">
            {state.day + 2}일차 정책서 보기
          </button>
        </div>
      )}
      {state.phase === "result" && (
        <Result state={state} record={record} daily={mode === "daily" ? dailyResult : null} onRetry={startNormal} />
      )}
    </section>
  );
}