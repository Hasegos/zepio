import { useEffect, useMemo, useState } from "react";
import WorldMap from "./WorldMap.jsx";

const TOTAL_MS = 4000;
const MIN_STEP_MS = 40;
const MAX_STEP_MS = 140;

/**
 * 끝난 판의 확산을 지도 위에서 처음부터 다시 보여 준다. 처음 열릴 때 한 번 재생되고, 다시 보기와 막대로 원하는 턴을 볼 수 있다.
 * 움직임 줄이기를 켠 사용자에게는 재생하지 않고 마지막 모습에서 시작한다.
 *
 * @param props.world 세계
 * @param props.sim 끝난 상태. 이름 표시 같은 고정 값만 쓴다
 * @param props.history 턴마다의 지도 모습 목록(0턴부터 끝난 턴까지)
 * @param props.still 움직임을 줄여야 하는지
 */
export default function Timelapse({ world, sim, history, still }) {
  const last = history.length - 1;
  const [index, setIndex] = useState(still ? last : 0);
  const [playing, setPlaying] = useState(!still);
  const stepMs = Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, Math.round(TOTAL_MS / Math.max(1, last))));

  useEffect(() => {
    if (!playing) return undefined;
    if (index >= last) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), stepMs);
    return () => clearTimeout(timer);
  }, [playing, index, last, stepMs]);

  const view = useMemo(() => ({ ...sim, ...history[index], bubbles: [], turn: index }), [sim, history, index]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
      <WorldMap world={world} sim={view} selected={null} running={playing} still={still} label="확산 타임랩스 지도" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setPlaying(true);
          }}
          className="rounded-lg border-2 border-primary bg-white px-3 py-1.5 text-sm font-bold text-primary"
        >
          다시 보기
        </button>
        <input
          type="range"
          min={0}
          max={last}
          value={index}
          aria-label="턴 이동"
          onChange={(event) => {
            setPlaying(false);
            setIndex(Number(event.target.value));
          }}
          className="min-w-0 flex-1 accent-primary"
        />
        <span className="text-sm font-semibold tabular-nums text-slate-700">
          {index} / {last}턴
        </span>
      </div>
    </div>
  );
}