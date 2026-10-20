import { useCallback, useEffect, useRef, useState } from "react";
import { getGameData, saveResult } from "../../lib/storage.js";
import { useGameBack } from "../_shared/useGameBack.js";
import { createState, drop, HEIGHT, step, WIDTH } from "./engine.js";
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
  const canvasRef = useRef(null);
  const dropRef = useRef(null);
  const viewRef = useRef(null);
  const reduceRef = useRef(false);
  useGameBack(phase === "intro" ? 0 : 1, () => setPhase("intro"));

  const start = useCallback(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewRef.current = createView(createState());
    setHud({ floors: 0, perfects: 0 });
    setMessage("");
    setRecord(null);
    setPhase("playing");
  }, []);

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
    if (next.over) {
      const outcome = mergeResult(getGameData(meta.id), { floors: next.floors, perfects: next.perfects });
      saveResult(meta.id, Date.now(), outcome.data);
      setRecord(outcome);
      setMessage("");
      setPhase("over");
      return;
    }
    setMessage(next.perfect ? `완벽해요! ${next.floors}층` : `${next.floors}층`);
  }, []);

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
      {phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">블록을 쌓아 탑을 높이세요</h2>
          <p className="text-slate-600">
            움직이는 블록을 탭해서 내려놓아요 · {meta.estimatedPlayTime}
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
            <Result result={hud} record={record} onRetry={start} />
          )}
        </div>
      )}
    </section>
  );
}