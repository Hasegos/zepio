import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveGameData, saveResult } from "../../lib/storage.js";
import { useAudio } from "../useAudio.js";
import { useGameBack } from "../useGameBack.js";
import { createAudio } from "./audio.js";
import { dailyLevelId } from "./daily.js";
import { LevelView, Menu } from "./Level.jsx";
import { LEVELS } from "./levels.js";
import meta from "./meta.js";
import { initialState, reducer } from "./reducer.js";
import { mergeStars, readData } from "./record.js";

const TICK_MS = 700;
const TRACK = { menu: "menu", level: "level" };
const SOUND = { open: "select", add: "select", remove: "tick", move: "tick", clear: "tick", run: "start", skip: "tick", retry: "tick", next: "select" };

/**
 * 프롬프트 요새 게임 루트. 방 목록과 방 화면을 오가고 시험 재생 시간을 흘려보낸다.
 * 시험이 끝나면 방별 별과 오늘의 방 기록을 저장한다.
 */
export default function PromptFortress() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(readData(getGameData(meta.id)).stars));
  const [muted, setMuted] = useState(() => readData(getGameData(meta.id)).muted);
  const [saved, setSaved] = useState(null);
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const audio = useAudio(muted, createAudio);
  const rootRef = useRef(null);
  const shownBefore = useRef(0);
  const { level } = state;
  const run = level?.run;
  const total = level ? LEVELS.find((l) => l.id === level.id).messages.length : 0;
  const replaying = Boolean(run) && run.shown < total;
  const finished = Boolean(run) && run.shown >= total;

  useGameBack(state.phase === "menu" ? 0 : 1, () => dispatch({ type: "leave" }));

  const send = useCallback(
    (action) => {
      audio.sfx(SOUND[action.type]);
      dispatch(action);
    },
    [audio],
  );

  const toggleMuted = useCallback(() => {
    const next = !muted;
    setMuted(next);
    saveGameData(meta.id, Date.now(), { ...readData(getGameData(meta.id)), muted: next });
  }, [muted]);

  useEffect(() => {
    audio.music(TRACK[state.phase]);
  }, [audio, state.phase]);

  useEffect(() => {
    if (!replaying) return undefined;
    const timer = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(timer);
  }, [replaying]);

  useEffect(() => {
    const shown = run?.shown ?? 0;
    if (shown === shownBefore.current + 1 && shown <= total) {
      const message = LEVELS.find((l) => l.id === level.id).messages[shown - 1];
      const result = run.results[shown - 1];
      audio.sfx(result.ok ? (message.attack ? "block" : "pass") : "breach");
    }
    shownBefore.current = shown;
  }, [audio, level?.id, run, total]);

  useEffect(() => {
    if (!finished) return;
    audio.sfx(run.stars > 0 ? "clear" : "fail");
    const prev = getGameData(meta.id);
    let ok = saveResult(meta.id, Date.now(), mergeStars(prev, state.stars)).saved;
    if (level.daily && run.stars > 0) {
      ok = saveDaily(meta.id, nextDailyRecord(getDaily(meta.id), level.daily, run.stars)) && ok;
      setDailyRecord(getDaily(meta.id));
    }
    setSaved(ok);
  }, [finished]);

  useEffect(() => {
    if (state.phase === "menu") setToday(kstDate(Date.now()));
  }, [state.phase]);

  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: "start" });
  }, [state.phase, level?.id]);

  const daily = useMemo(
    () => ({ date: today, id: dailyLevelId(today), record: dailyRecord?.history?.[today] ?? null, streak: currentStreak(dailyRecord, today) }),
    [today, dailyRecord],
  );

  return (
    <section ref={rootRef} className="scroll-mt-2 rounded-2xl bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-2 flex justify-end">
        <button type="button" aria-pressed={!muted} onClick={toggleMuted} className="rounded-md border-2 border-slate-800 px-2 py-0.5 text-xs font-bold text-slate-900 hover:bg-amber-50">
          <span aria-hidden="true">{muted ? "🔇" : "🔊"} </span>소리
        </button>
      </div>
      {state.phase === "menu" ? (
        <>
          <h2 className="mb-3 text-lg font-extrabold text-slate-900">볼트의 요새 · 방 {LEVELS.length}개</h2>
          <Menu state={state} dispatch={send} daily={daily} />
        </>
      ) : (
        <LevelView key={level.id} state={state} dispatch={send} saved={saved} />
      )}
    </section>
  );
}