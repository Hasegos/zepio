import { useEffect, useRef } from "react";
import { drawAgent, drawNpc, drawRequest } from "./render.js";

/**
 * 도트 그림 하나를 확대해서 그린다. 제목, 전투, 시설 화면의 인물에 쓴다.
 *
 * @param props.kind agent, npc, request
 * @param props.npc kind가 npc일 때 NPC 데이터
 * @param props.task kind가 request일 때 의뢰 데이터
 * @param props.scale 확대 배율(16칸 그림이 scale 배가 된다)
 * @param props.dir kind가 agent일 때 바라보는 방향
 * @param props.label 스크린 리더용 설명, 없으면 장식으로 숨긴다
 */
export default function Sprite({ kind, npc, task, scale = 4, dir = "down", label }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return undefined;
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 16 * scale, 16 * scale);
      if (kind === "agent") drawAgent(ctx, 0, 0, dir, frame, scale);
      else if (kind === "npc") drawNpc(ctx, 0, 0, npc, frame, scale);
      else drawRequest(ctx, 0, 0, task, frame, scale);
    };
    draw();
    const timer = setInterval(() => {
      frame = frame ? 0 : 1;
      draw();
    }, 600);
    return () => clearInterval(timer);
  }, [kind, npc?.id, task?.id, scale, dir]);

  return (
    <canvas
      ref={ref}
      width={16 * scale}
      height={16 * scale}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="shrink-0 [image-rendering:pixelated]"
    />
  );
}