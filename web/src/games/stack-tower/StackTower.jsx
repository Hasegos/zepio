import { useCallback, useEffect, useRef, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveResult } from "../../lib/storage.js";
import DailyCard from "../_shared/DailyCard.jsx";
import { hashSeed } from "../_shared/rng.js";
import SoundButton from "../_shared/SoundButton.jsx";
import { useAudio } from "../_shared/useAudio.js";
import { useGameBack } from "../_shared/useGameBack.js";
import { useMuted } from "../_shared/useMuted.js";
import { createAudio } from "./audio.js";
import { createState, dailyRules, drop, HEIGHT, step, WIDTH } from "./engine.js";
import meta from "./meta.js";
import { mergeResult } from "./record.js";
import { addPiece, advance, createView, draw, SCALE } from "./render.js";
import Result from "./Result.jsx";

/**
 * Stack Tower 한 판을 진행한다. 시작 화면, 블록 쌓기, 결과 화면을 오간다.
 * 블록 이동은 requestAnimationFrame으로 돌리고 화면에서 사라지면 멈춘다. 내려놓기는 캔버스 탭, 큰 버튼, Space와 Enter로 한다.
 */
export default function StackTower() {
  const [phase, setPhase] = useState("intro");
  const [hud, setHud] = useState({ floors: 0, perfects: 0 });
  const [message, setMessage] = useState("");
  const [record, setRecord] = useState(null);
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const [dailyResult, setDailyResult] = useState(null);
  const dailyRef = useRef(null);
  const canvasRef = useRef(null);
  const dropRef = useRef(null);
  const viewRef = useRef(null);
  const reduceRef = useRef(false);
  const [muted, toggleMuted] = useMuted();
  const audio = useAudio(muted, createAudio);
  useGameBack(phase === "intro" ? 0 : 1, () => setPhase("intro"));

  useEffect(() => {
    audio.music(phase === "playing" ? "play" : "menu");
  }, [audio, phase]);

  const begin = useCallback((date) => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dailyRef.current = date;
    viewRef.current = createView(createState(date ? dailyRules(hashSeed(`${meta.id}:${date}`)) : undefined));
    setHud({ floors: 0, perfects: 0 });
    setMessage("");
    setRecord(null);
    setDailyResult(null);
    setPhase("playing");
  }, []);
  const start = useCallback(() => begin(null), [begin]);
  const startDaily = useCallback(() => {
    const date = kstDate(Date.now());
    setToday(date);
    begin(date);
  }, [begin]);

  const place = useCallback(() => {
    const view = viewRef.current;
    if (!view || view.state.over) return;
    const next = drop(view.state);
    view.state = next;
    if (next.cut && !reduceRef.current) {
      addPiece(view, next.cut, next.over ? next.blocks.length : next.blocks.length - 1);
    }
    view.flash = next.perfect ? 1 : 0;
    setHud({ floors: next.floors, perfects: next.perfects });
    audio.sfx(next.over ? "over" : next.perfect ? "perfect" : "drop");
    if (next.over) {
      const date = dailyRef.current;
      if (date) {
        const daily = nextDailyRecord(getDaily(meta.id), date, next.floors);
        saveDaily(meta.id, daily);
        saveResult(meta.id, Date.now(), getGameData(meta.id));
        setDailyRecord(daily);
        setDailyResult({ date, streak: currentStreak(daily, date) });
      } else {
        const outcome = mergeResult(getGameData(meta.id), { floors: next.floors, perfects: next.perfects });
        saveResult(meta.id, Date.now(), outcome.data);
        setRecord(outcome);
      }
      setMessage("");
      setPhase("over");
      return;
    }
    setMessage(next.perfect ? `완벽해요! ${next.floors}층` : `${next.floors}층`);
  }, [audio]);

  useEffect(() => {
    if (phase === "intro") return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const view = viewRef.current;
    const controller = new AbortController();
    let last = performance.now();
    let frame = 0;

    const tick = (now) => {
      const ms = now - last;
      last = now;
      view.state = step(view.state, ms);
      advance(view, ms, reduceRef.current);
      draw(ctx, view);
      if (!(view.state.over && view.pieces.length === 0)) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    if (phase === "playing") {
      canvas.addEventListener(
        "pointerdown",
        (event) => {
          event.preventDefault();
          place();
          dropRef.current?.focus({ preventScroll: true });
        },
        { signal: controller.signal },
      );
      dropRef.current?.focus({ preventScroll: true });
    }
    return () => {
      controller.abort();
      cancelAnimationFrame(frame);
    };
  }, [phase, place]);

  return (
    <section className="panel">
      <div className="mb-2 flex justify-end">
        <SoundButton muted={muted} onToggle={toggleMuted} className="border-primary text-primary hover:bg-indigo-50" />
      </div>
      {phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">블록을 쌓아 탑을 높이세요</h2>
          <p className="text-slate-600">
            움직이는 블록을 탭해서 내려놓아요 · {meta.estimatedPlayTime}
          </p>
          <DailyCard
            date={today}
            streak={currentStreak(dailyRecord, today)}
            doneText={
              dailyRecord?.last === today
                ? `오늘 완료 · ${dailyRecord.history?.[today] ?? 0}층 · 연속 ${currentStreak(dailyRecord, today)}일. 내일 새로운 판이 열려요.`
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
      {phase !== "intro" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
            <span>{hud.floors}층</span>
            <span>완벽 정렬 {hud.perfects}회</span>
          </div>
          <canvas
            ref={canvasRef}
            width={WIDTH * SCALE}
            height={HEIGHT * SCALE}
            role="img"
            aria-label={`블록 탑 ${hud.floors}층`}
            className="mx-auto aspect-[16/21] w-full max-w-sm touch-manipulation rounded-xl"
          />
          {phase === "playing" ? (
            <>
              <p className="min-h-6 text-center font-bold text-primary">{message || "탭해서 내려놓기"}</p>
              <button
                ref={dropRef}
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  place();
                }}
                onClick={(event) => {
                  if (event.detail === 0) place();
                }}
                onKeyDown={(event) => {
                  if (event.repeat) event.preventDefault();
                }}
                className="btn-primary touch-manipulation"
              >
                내려놓기
              </button>
            </>
          ) : (
            <Result result={hud} record={record} daily={dailyResult} onRetry={start} />
          )}
        </div>
      )}
    </section>
  );
}