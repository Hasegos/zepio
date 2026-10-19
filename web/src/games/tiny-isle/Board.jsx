import { useRef, useState } from "react";
import Glyph from "./Glyph.jsx";
import { BUILDINGS, CELLS, scoreAt, SIZE } from "./rules.js";

const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
const CELL_LIST = Array.from({ length: CELLS }, (_, i) => i);
const TERRAIN_NAME = { g: "땅", w: "바다", r: "바위" };

/**
 * 건물 id의 이름을 구한다.
 *
 * @param id 건물 id
 * @returns 이름
 */
function nameOf(id) {
  return BUILDINGS.find((building) => building.id === id)?.name ?? "";
}

/**
 * 점수 변화를 부호가 붙은 글자로 바꾼다.
 *
 * @param value 변화량
 * @returns 예: +3, -2
 */
function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

/**
 * 섬 격자를 그린다. 고른 카드를 놓을 수 있는 칸을 표시하고, 칸을 한 번 누르면 점수 변화를 미리 보여 준다.
 * 화살표 키로 칸을 옮길 수 있다(칸 하나만 탭 순서에 들어간다).
 *
 * @param props.run 판 상태(terrain, board)
 * @param props.cardId 고른 카드의 건물 id, 없으면 null
 * @param props.legal 고른 카드를 놓을 수 있는 칸 번호 목록
 * @param props.target 미리보기 중인 칸 번호, 없으면 null
 * @param props.changes 미리보기로 점수가 달라지는 칸 목록(i, before, after)
 * @param props.demolishing 철거 모드이면 true
 * @param props.gain 방금 둔 수의 { i, delta, n }, 없으면 null
 * @param props.onCell 칸을 눌렀을 때 호출, 칸 번호를 받는다
 */
export default function Board({ run, cardId, legal, target, changes, demolishing, gain, onCell }) {
  const [active, setActive] = useState(0);
  const buttons = useRef([]);
  const legalSet = new Set(legal);
  const changeMap = new Map(changes.map((entry) => [entry.i, entry.after - entry.before]));
  const total = changes.reduce((sum, entry) => sum + entry.after - entry.before, 0);

  function onKeyDown(event, cell) {
    const step = ARROWS[event.key];
    if (!step) return;
    const row = Math.floor(cell / SIZE) + step[0];
    const col = (cell % SIZE) + step[1];
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;
    event.preventDefault();
    const next = row * SIZE + col;
    setActive(next);
    buttons.current[next]?.focus();
  }

  return (
    <div
      className="mx-auto grid w-full max-w-md grid-cols-8 gap-[3px] rounded-2xl bg-isle-sea-dark p-1.5 shadow-inner"
      role="group"
      aria-label="섬 지도, 화살표 키로 이동"
    >
      {CELL_LIST.map((cell) => {
        const terrain = run.terrain[cell];
        const building = run.board[cell];
        const isTarget = target === cell;
        const isLegal = !demolishing && cardId !== null && legalSet.has(cell);
        const delta = changeMap.get(cell);
        const score = building ? scoreAt(run.terrain, run.board, cell) : 0;
        const checker = (cell + Math.floor(cell / SIZE)) % 2 === 0;
        const base =
          terrain === "w"
            ? "bg-isle-sea"
            : terrain === "r"
              ? "bg-isle-rock"
              : checker
                ? "bg-isle-grass"
                : "bg-isle-grass-dark";
        const label = `${Math.floor(cell / SIZE) + 1}행 ${(cell % SIZE) + 1}열, ${TERRAIN_NAME[terrain]}${
          building ? `, ${nameOf(building)} ${score}점` : ""
        }${isLegal ? ", 지을 수 있음" : ""}${isTarget ? ", 선택됨, 한 번 더 누르면 확정" : ""}`;
        return (
          <button
            key={cell}
            ref={(node) => {
              buttons.current[cell] = node;
            }}
            type="button"
            tabIndex={cell === active ? 0 : -1}
            aria-label={label}
            aria-disabled={terrain !== "g"}
            onFocus={() => setActive(cell)}
            onKeyDown={(event) => onKeyDown(event, cell)}
            onClick={() => onCell(cell)}
            className={`relative flex aspect-square items-center justify-center rounded-md ${base} ${
              isTarget ? (demolishing ? "ring-4 ring-danger-strong" : "ring-4 ring-isle-accent") : isLegal ? "ring-2 ring-white/90" : ""
            } ${terrain === "g" ? "cursor-pointer" : "cursor-default"}`}
          >
            {terrain === "r" && <span aria-hidden="true" className="size-4 rounded-full bg-stone-400/80" />}
            {isLegal && !building && !isTarget && <span aria-hidden="true" className="size-2 rounded-full bg-white/80" />}
            {building && (
              <span
                key={gain?.i === cell ? gain.n : "still"}
                className={gain?.i === cell ? "motion-safe:animate-isle-pop" : ""}
              >
                <Glyph id={building} size={26} />
              </span>
            )}
            {isTarget && !demolishing && cardId && (
              <span className="absolute opacity-60">
                <Glyph id={cardId} size={26} />
              </span>
            )}
            {building && (
              <span
                aria-hidden="true"
                className={`absolute -bottom-0.5 -right-0.5 min-w-4 rounded-full bg-white px-1 text-center text-[11px] font-bold leading-4 ${
                  score < 0 ? "text-danger-strong" : "text-isle-ink"
                }`}
              >
                {score}
              </span>
            )}
            {isTarget && (
              <span
                aria-hidden="true"
                className={`absolute -top-1.5 left-0 z-10 rounded-full px-1.5 text-[12px] font-extrabold leading-4 text-white ${
                  total < 0 ? "bg-danger-strong" : "bg-success-strong"
                }`}
              >
                {signed(total)}
              </span>
            )}
            {!isTarget && delta !== undefined && delta !== 0 && (
              <span
                aria-hidden="true"
                className={`absolute -top-1 left-0 z-10 rounded-full px-1 text-[11px] font-bold leading-4 text-white ${
                  delta < 0 ? "bg-danger-strong" : "bg-success-strong"
                }`}
              >
                {signed(delta)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}