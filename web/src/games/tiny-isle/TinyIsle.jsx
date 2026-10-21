import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveGameData, saveResult } from "../../lib/storage.js";
import { ghostLines } from "./bots.js";
import { createRun, restoreRun, serializeRun } from "./engine.js";
import { dailyIsland, findIsland } from "./islands.js";
import Menu from "./Menu.jsx";
import meta from "./meta.js";
import Play from "./Play.jsx";
import { mergeBest, readData } from "./record.js";
import { initialState, reducer } from "./reducer.js";
import Result from "./Result.jsx";
import { hashSeed } from "../_shared/rng.js";
import SoundButton from "../_shared/SoundButton.jsx";
import { useAudio } from "../_shared/useAudio.js";
import { useGameBack } from "../_shared/useGameBack.js";
import { useMuted } from "../_shared/useMuted.js";
import { createAudio } from "./audio.js";

const SOUND = { select: "tick", reroll: "select", demolishMode: "tick", cancel: "tick" };

/**
 * 오늘의 섬으로 놀 때 쓰는 시드를 구한다.
 *
 * @param date YYYY-MM-DD
 * @returns 정수 시드
 */
function dailySeed(date) {
  return hashSeed(`isle-run-${date}`);
}

/**
 * 판의 섬이 오늘의 섬이면 제피의 기록으로 별 기준을 정하고, 아니면 섬의 기준을 쓴다.
 *
 * @param run 판 상태
 * @returns 별 1, 2, 3개를 받는 점수
 */
function linesFor(run) {
  return run.island.daily ? ghostLines(run.island, run.seed).lines : run.island.stars;
}

/**
 * Tiny Isle 한 판을 진행한다. 시작 화면(섬 고르기), 판 진행, 결과 화면을 오간다.
 * 판은 수를 둘 때마다 저장하고, 저장한 판은 수를 처음부터 다시 재생해 이어 한다.
 */
export default function TinyIsle() {
  const [data, setData] = useState(() => readData(getGameData(meta.id)));
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useGameBack(state.phase === "menu" ? 0 : 1, () => dispatch({ type: "menu" }));
  const [muted, toggleMuted] = useMuted();
  const audio = useAudio(muted, createAudio);
  const [record, setRecord] = useState(null);
  const savedFor = useRef(null);
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const dailyRecord = useMemo(() => getDaily(meta.id), [data]);
  const ghost = useMemo(() => ghostLines(dailyIsland(today), dailySeed(today)).ghost, [today]);
  const resumable = useMemo(() => {
    const run = restoreRun(data.run);
    return run && (!run.island.daily || run.island.id === `daily:${today}`) ? run : null;
  }, [data, today]);

  useEffect(() => {
    audio.music(state.phase === "play" ? "play" : "menu");
  }, [audio, state.phase]);

  useEffect(() => {
    if (state.gain) audio.sfx(state.gain.delta >= 0 ? "build" : "lose");
  }, [audio, state.gain]);

  useEffect(() => {
    if (state.phase === "result") audio.sfx("clear");
  }, [audio, state.phase]);

  const send = useCallback(
    (action) => {
      audio.sfx(SOUND[action.type]);
      dispatch(action);
    },
    [audio],
  );

  useEffect(() => {
    if (state.phase === "play") {
      saveGameData(meta.id, Date.now(), { ...readData(getGameData(meta.id)), run: serializeRun(state.run) });
    }
  }, [state.phase, state.run]);

  useEffect(() => {
    if (state.phase !== "result" || savedFor.current === state.result) return;
    savedFor.current = state.result;
    const island = state.run.island;
    const prev = readData(getGameData(meta.id));
    if (island.daily) {
      const date = island.id.slice(6);
      const next = nextDailyRecord(getDaily(meta.id), date, state.result.score);
      const savedDaily = saveDaily(meta.id, next);
      const saved = saveResult(meta.id, Date.now(), { ...prev, run: null }).saved && savedDaily;
      setRecord({ isNewBest: false, ghost: state.lines[1], streak: currentStreak(next, date), saved });
      return;
    }
    const outcome = mergeBest(prev, island.id, state.result);
    const { saved } = saveResult(meta.id, Date.now(), outcome.data);
    setRecord({ isNewBest: outcome.isNewBest && saved, saved });
  }, [state]);

  const begin = useCallback((id) => {
    const island = findIsland(id);
    if (!island) return;
    const run = createRun(island, island.daily ? dailySeed(id.slice(6)) : Math.floor(Math.random() * 2 ** 31));
    setRecord(null);
    dispatch({ type: "start", run, lines: linesFor(run) });
  }, []);

  const resume = useCallback(() => {
    if (!resumable) return;
    setRecord(null);
    dispatch({ type: "start", run: resumable, lines: linesFor(resumable) });
  }, [resumable]);

  const toMenu = useCallback(() => {
    setToday(kstDate(Date.now()));
    setData(readData(getGameData(meta.id)));
    dispatch({ type: "menu" });
  }, []);

  const again = useCallback(() => begin(state.run.island.id), [begin, state.run]);

  return (
    <section className="panel">
      <div className="mb-2 flex justify-end">
        <SoundButton muted={muted} onToggle={toggleMuted} className="border-primary text-primary hover:bg-indigo-50" />
      </div>
      {state.phase === "menu" && (
        <Menu
          data={data}
          resume={
            resumable
              ? { name: resumable.island.name, built: resumable.board.filter(Boolean).length }
              : null
          }
          daily={{
            date: today,
            ghost,
            record: dailyRecord?.history?.[today] ?? null,
            streak: currentStreak(dailyRecord, today),
          }}
          onStart={begin}
          onResume={resume}
        />
      )}
      {state.phase === "play" && <Play state={state} dispatch={send} onMenu={toMenu} />}
      {state.phase === "result" && (
        <Result run={state.run} result={state.result} record={record} onRetry={again} onMenu={toMenu} />
      )}
    </section>
  );
}