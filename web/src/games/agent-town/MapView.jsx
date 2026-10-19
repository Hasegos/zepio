import { useEffect, useMemo, useRef } from "react";
import { drawFrame, drawWorld, SCALE, VIEW_PX_H, VIEW_PX_W } from "./render.js";
import { facing, npcsFor } from "./world.js";

export const WALK_MS = 120;
const PAD = [
  { dir: "up", label: "위로", cls: "col-start-2 row-start-1", glyph: "▲" },
  { dir: "left", label: "왼쪽으로", cls: "col-start-1 row-start-2", glyph: "◀" },
  { dir: "right", label: "오른쪽으로", cls: "col-start-3 row-start-2", glyph: "▶" },
  { dir: "down", label: "아래로", cls: "col-start-2 row-start-3", glyph: "▼" },
];

/**
 * 마을 지도. 도트 캔버스에 지도와 인물을 그리고, 터치용 방향 버튼을 함께 보여 준다.
 * 키보드(방향키, WASD, Enter)는 부모가 처리한다.
 *
 * @param props.state 게임 상태
 */
export default function MapView({ state, onMove, onInteract, disabled, children }) {
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const motion = useRef({ from: null, at: 0, x: state.player.x, y: state.player.y });
  const latest = useRef(state);
  latest.current = state;
  const holdRef = useRef(null);

  useEffect(() => {
    const m = motion.current;
    if (m.x !== state.player.x || m.y !== state.player.y) {
      motion.current = { from: { x: m.x, y: m.y }, at: performance.now(), x: state.player.x, y: state.player.y };
    }
  }, [state.player.x, state.player.y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return undefined;
    const world = document.createElement("canvas");
    if (!drawWorld(world)) return undefined;
    worldRef.current = world;
    let raf = 0;
    const loop = (now) => {
      const s = latest.current;
      const m = motion.current;
      const t = m.from ? Math.min(1, (now - m.at) / WALK_MS) : 1;
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      drawFrame(ctx, world, { player: s.player, from: m.from, t, npcs: npcsFor(s.trust), tick: now });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => clearInterval(holdRef.current), []);

  const front = useMemo(
    () => facing(state.player.x, state.player.y, state.player.dir, state.trust),
    [state.player, state.trust],
  );

  function hold(dir) {
    clearInterval(holdRef.current);
    onMove(dir);
    holdRef.current = setInterval(() => onMove(dir), WALK_MS + 20);
  }

  function release() {
    clearInterval(holdRef.current);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
      <canvas
        ref={canvasRef}
        width={VIEW_PX_W * SCALE}
        height={VIEW_PX_H * SCALE}
        role="img"
        aria-label={`프롬프트 마을 지도. 현재 위치 ${state.player.x}, ${state.player.y}. 방향키나 아래 버튼으로 움직이고 Enter로 말을 겁니다.`}
        className="w-full rounded-xl border-4 border-town-ink bg-town-ink [image-rendering:pixelated]"
        style={{ aspectRatio: `${VIEW_PX_W} / ${VIEW_PX_H}` }}
      />
        {children && <div className="absolute inset-x-2 bottom-2">{children}</div>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div role="group" aria-label="방향 버튼" className="grid grid-cols-3 grid-rows-3 gap-1">
          {PAD.map((p) => (
            <button
              key={p.dir}
              type="button"
              disabled={disabled}
              aria-label={p.label}
              onPointerDown={(e) => {
                e.preventDefault();
                hold(p.dir);
              }}
              onPointerUp={release}
              onPointerLeave={release}
              onPointerCancel={release}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onMove(p.dir);
                }
              }}
              className={`${p.cls} flex size-12 touch-none select-none items-center justify-center rounded-lg border-2 border-town-ink bg-town-panel text-lg font-extrabold text-town-ink active:translate-y-0.5 disabled:opacity-50`}
            >
              <span aria-hidden="true">{p.glyph}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onInteract}
          className="h-14 min-w-28 rounded-xl border-4 border-town-ink bg-town-accent px-4 text-base font-extrabold text-white shadow-[0_3px_0_0_#1f1b34] active:translate-y-0.5 disabled:opacity-50"
        >
          {front ? `${front.target.name}에게 말 걸기` : "말 걸기"}
        </button>
      </div>
    </div>
  );
}