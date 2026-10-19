import { isOpen, totalScore } from "./logic.js";
import { PUZZLES, SPOTS } from "./puzzles.js";

/**
 * 사무소 일러스트를 보여 준다. 구석의 물건을 누르면 힌트 코인을 찾을 수 있다.
 *
 * @param props.found 이미 찾은 장소 { id: true }
 */
function Room({ found, onSpot }) {
  return (
    <div className="relative overflow-hidden rounded-xl border-4 border-det-ink bg-[#e9d9b0]">
      <svg viewBox="0 0 400 200" className="block w-full" role="img" aria-label="탐정 사무소 그림">
        <rect width="400" height="200" fill="#e9d9b0" />
        <rect y="150" width="400" height="50" fill="#a9825a" />
        <rect y="150" width="400" height="4" fill="#8a6540" />
        <rect x="150" y="24" width="100" height="60" fill="#9fd0e8" stroke="#1c2742" strokeWidth="4" />
        <path d="M200 24v60M150 54h100" stroke="#1c2742" strokeWidth="3" />
        <rect x="20" y="40" width="64" height="100" fill="#7a4e2a" />
        <g fill="#c2412d"><rect x="26" y="48" width="8" height="24" /><rect x="38" y="52" width="8" height="20" /></g>
        <g fill="#2f6fb0"><rect x="50" y="46" width="8" height="26" /><rect x="62" y="50" width="8" height="22" /></g>
        <g fill="#d9a84a"><rect x="26" y="86" width="8" height="22" /><rect x="38" y="82" width="8" height="26" /><rect x="50" y="88" width="8" height="20" /></g>
        <rect x="20" y="76" width="64" height="4" fill="#5a3a1c" />
        <rect x="20" y="112" width="64" height="4" fill="#5a3a1c" />
        <rect x="110" y="110" width="190" height="14" fill="#5a3a1c" />
        <rect x="120" y="124" width="10" height="40" fill="#5a3a1c" /><rect x="280" y="124" width="10" height="40" fill="#5a3a1c" />
        <rect x="228" y="66" width="68" height="44" fill="#1c2742" /><rect x="234" y="72" width="56" height="30" fill="#7fd4c2" />
        <rect x="140" y="98" width="22" height="12" fill="#fff" stroke="#1c2742" strokeWidth="3" /><path d="M162 102h6v5h-6" fill="none" stroke="#1c2742" strokeWidth="3" />
        <rect x="334" y="104" width="30" height="44" fill="#b8693a" /><g fill="#2f8a3c"><circle cx="349" cy="96" r="16" /><circle cx="336" cy="104" r="10" /><circle cx="362" cy="104" r="10" /></g>
        <circle cx="300" cy="38" r="17" fill="#fff" stroke="#1c2742" strokeWidth="4" /><path d="M300 38v-9M300 38l7 4" stroke="#1c2742" strokeWidth="3" fill="none" />
        <rect x="350" y="52" width="38" height="28" fill="#cbd0d8" stroke="#1c2742" strokeWidth="3" /><path d="M350 52l19 14 19-14" fill="none" stroke="#1c2742" strokeWidth="3" />
      </svg>
      {SPOTS.map((spot) => (
        <button
          key={spot.id}
          type="button"
          onClick={() => onSpot(spot.id)}
          aria-label={`${spot.name} 살펴보기${found[spot.id] ? " (이미 찾음)" : ""}`}
          style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          className={`absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed ${found[spot.id] ? "border-transparent" : "border-det-accent/70"} bg-white/10 hover:bg-white/40`}
        />
      ))}
    </div>
  );
}

/**
 * 사무소 화면을 보여 준다. 코인과 점수, 사무소 그림, 사건 목록이 있다.
 *
 * @param props.state 게임 상태
 * @param props.onOpen 사건을 눌렀을 때 호출, 사건 식별자를 받는다
 * @param props.onSpot 사무소의 물건을 눌렀을 때 호출
 */
export default function Office({ state, onOpen, onSpot }) {
  const done = Object.keys(state.solved).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-det-ink px-4 py-3 text-sm font-bold text-white">
        <span>힌트 코인 {state.coins}</span>
        <span>
          해결 {done}/{PUZZLES.length}
        </span>
        <span>점수 {totalScore(state.solved)}</span>
      </div>

      <Room found={state.found} onSpot={onSpot} />
      <p role="status" className="min-h-6 text-center text-sm font-bold text-det-accent">
        {state.notice || "사무소 구석을 눌러 힌트 코인을 찾아 보세요."}
      </p>

      <ul className="grid gap-2">
        {PUZZLES.map((puzzle, index) => {
          const solved = state.solved[puzzle.id];
          const open = isOpen(state.solved, index);
          return (
            <li key={puzzle.id}>
              <button
                type="button"
                disabled={!open}
                onClick={() => onOpen(puzzle.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-det-ink bg-det-paper px-3 py-2.5 text-left text-det-ink enabled:hover:bg-white disabled:opacity-60"
              >
                <span>
                  <span className="block text-xs font-bold text-det-accent">퍼즐 {String(index + 1).padStart(3, "0")}</span>
                  <span className="block font-extrabold">{open ? puzzle.title : "???"}</span>
                </span>
                <span className="shrink-0 rounded-lg bg-det-ink px-2.5 py-1 text-xs font-bold text-white">
                  {solved ? `해결 ${solved.score}점` : open ? "도전" : "잠김"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}