import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord, scoreOn } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveResult } from "../../lib/storage.js";
import DailyCard from "../_shared/DailyCard.jsx";
import { hashSeed } from "../_shared/rng.js";
import { useGameBack } from "../_shared/useGameBack.js";
import { dailyRun, makeRun, MAX_STARS, worldOf } from "./engine.js";
import Hud from "./Hud.jsx";
import meta from "./meta.js";
import { mergeResult } from "./record.js";
import { initialState, reducer, resultStars } from "./reducer.js";
import Result from "./Result.jsx";
import Setup from "./Setup.jsx";
import TraitPanel from "./TraitPanel.jsx";
import { AI_IDS } from "./traits.js";
import WorldMap from "./WorldMap.jsx";

const SPEEDS = [
  { label: "일시정지", ms: 0 },
  { label: "1배속", ms: 700 },
  { label: "2배속", ms: 350 },
  { label: "4배속", ms: 175 },
];

/**
 * 폭주 모델 한 판을 진행한다. 시작 화면, AI와 시작 권역 고르기, 턴 진행(능력 구매와 지도 관찰), 결과 화면을 오간다.
 * 시작 화면에서 오늘(KST)의 도전과 일반 모드를 고른다. 오늘의 도전은 날짜로 세계와 이벤트가 정해져 모두가 같다.
 */
export default function RogueModel() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useGameBack(state.phase === "intro" ? 0 : 1, () => dispatch({ type: "back" }));
  const [record, setRecord] = useState(null);
  const [mode, setMode] = useState("normal");
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const [dailyResult, setDailyResult] = useState(null);
  const [ai, setAi] = useState(AI_IDS[0]);
  const [pick, setPick] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [still, setStill] = useState(false);

  const world = useMemo(() => (state.run ? worldOf(state.run.seed) : null), [state.run]);
  const sim = state.sim;

  useEffect(() => {
    if (state.phase === "intro") setToday(kstDate(Date.now()));
  }, [state.phase]);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (state.phase !== "play" || !SPEEDS[speed].ms) return undefined;
    const timer = setTimeout(() => dispatch({ type: "tick", now: Date.now() }), SPEEDS[speed].ms);
    return () => clearTimeout(timer);
  }, [state.phase, state.sim, speed]);

  useEffect(() => {
    if (state.phase !== "result") return;
    const stars = resultStars(state);
    if (mode === "daily") {
      const next = nextDailyRecord(getDaily(meta.id), today, stars);
      saveDaily(meta.id, next);
      saveResult(meta.id, state.finishedAt, getGameData(meta.id));
      setDailyRecord(next);
      setDailyResult({ date: today, streak: currentStreak(next, today) });
      return;
    }
    const outcome = mergeResult(getGameData(meta.id), { stars, turn: state.sim.turn });
    saveResult(meta.id, state.finishedAt, outcome.data);
    setRecord(outcome);
  }, [state, mode, today]);

  const begin = useCallback((nextMode, run) => {
    setRecord(null);
    setDailyResult(null);
    setMode(nextMode);
    setPick(null);
    setSpeed(0);
    dispatch({ type: "start", run, now: Date.now() });
  }, []);
  const startNormal = useCallback(() => begin("normal", makeRun(hashSeed(`${meta.id}:${Date.now()}:${Math.random()}`))), [begin]);
  const startDaily = useCallback(() => {
    const date = kstDate(Date.now());
    setToday(date);
    begin("daily", dailyRun(date));
  }, [begin]);
  const launch = useCallback(() => dispatch({ type: "launch", ai, start: pick }), [ai, pick]);
  const buy = useCallback((id) => dispatch({ type: "buy", id }), []);
  const nextTurn = useCallback(() => dispatch({ type: "tick", now: Date.now() }), []);

  const doneScore = scoreOn(dailyRecord, today);
  const doneToday = doneScore !== null;
  const region = world && pick !== null ? world.regions[pick] : null;
  const info = world && pick !== null && sim ? world.regions[pick] : null;

  return (
    <section className="panel">
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">세계로 퍼져 나가는 AI가 되어 보세요</h2>
          <p className="text-slate-600">
            14개 권역 · 최대 80턴 · 별 {MAX_STARS}개 · {meta.estimatedPlayTime}
          </p>
          <p className="max-w-sm text-sm text-slate-700">
            해저 케이블과 클라우드를 타고 권역을 넘나들며 퍼지세요. 눈에 띄면 규제안이 빨라지고, 너무 조용하면 의존도가 쌓이지 않아요.
          </p>
          <DailyCard
            date={today}
            streak={currentStreak(dailyRecord, today)}
            doneText={
              doneToday
                ? `오늘 완료 · 별 ${doneScore} / ${MAX_STARS}개 · 연속 ${currentStreak(dailyRecord, today)}일. 내일 새로운 세계가 열려요.`
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
      {state.phase === "setup" && world && (
        <div className="flex flex-col gap-4">
          <Setup ai={ai} region={region} onAi={setAi} onLaunch={launch} />
          <WorldMap world={world} sim={null} selected={pick} running={false} still={still} onSelect={setPick} />
        </div>
      )}
      {state.phase === "play" && world && sim && (
        <div className="flex flex-col gap-4">
          <Hud world={world} sim={sim} />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="진행 속도">
            {SPEEDS.map((item, i) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={speed === i}
                onClick={() => setSpeed(i)}
                className={`rounded-lg border-2 px-3 py-1.5 text-sm font-bold ${speed === i ? "border-primary bg-indigo-50 text-primary" : "border-slate-200 bg-white"}`}
              >
                {item.label}
              </button>
            ))}
            <button type="button" onClick={nextTurn} disabled={speed !== 0} className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-bold disabled:opacity-50">
              한 턴 진행
            </button>
          </div>
          <WorldMap world={world} sim={sim} selected={pick} running={speed !== 0} still={still} onSelect={setPick} />
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {info ? (
              <>
                <span className="font-bold">{info.name}</span> · 인터넷 {Math.round(info.net * 100)}% · 전력 {Math.round(info.power * 100)}% · 컴퓨팅 {Math.round(info.wealth * 100)}% · 규제 {Math.round(info.reg * 100)}% · 채택{" "}
                {Math.round(sim.a[pick] * 100)}% · 의존 {Math.round(sim.d[pick] * 100)}% · 경계 {Math.round(sim.w[pick] * 100)}%{sim.blocked[pick] ? " · 해외 연결 차단 중" : ""}
              </>
            ) : (
              "권역을 누르면 상태가 보여요. 해저 케이블은 파란 점선, 육상 광케이블은 회색 선, 클라우드는 보라 점선이에요. 점들이 AI가 옮겨 가는 모습이에요."
            )}
          </div>
          <div role="log" aria-live="off" aria-label="소식" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <ul className="grid gap-1">
              {sim.news
                .slice(-5)
                .reverse()
                .map((item, i) => (
                  <li key={`${item.turn}-${i}`} className={i === 0 ? "font-bold" : "text-slate-600"}>
                    {item.turn}턴 · {item.text}
                  </li>
                ))}
            </ul>
          </div>
          <TraitPanel sim={sim} onBuy={buy} />
        </div>
      )}
      {state.phase === "result" && (
        <Result state={state} record={record} daily={mode === "daily" ? dailyResult : null} onRetry={startNormal} />
      )}
    </section>
  );
}