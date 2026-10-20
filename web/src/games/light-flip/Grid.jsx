import { useRef, useState } from "react";
import { CELLS, SIZE } from "./puzzle.js";

const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
const CELL_LIST = Array.from({ length: CELLS }, (_, i) => i);

/**
 * 5x5 격자를 그린다. 켜진 칸은 색과 점으로 구분하고, 화살표 키로 칸을 옮길 수 있다(칸 하나만 탭 순서에 들어간다).
 * 풀린 뒤(disabled)에는 눌러도 반응하지 않는다.
 *
 * @param props.board 길이 25의 0(꺼짐) 또는 1(켜짐) 배열
 * @param props.disabled true이면 눌러도 무시한다
 * @param props.onPress 칸을 눌렀을 때 호출, 칸 번호(0부터)를 받는다
 */
export default function Grid({ board, disabled, onPress }) {
  const [active, setActive] = useState(0);
  const buttons = useRef([]);

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
      className="mx-auto grid w-full max-w-sm grid-cols-5 gap-2"
      role="group"
      aria-label="불 켜기 격자, 화살표 키로 이동"
    >
      {CELL_LIST.map((cell) => {
        const on = Boolean(board[cell]);
        return (
          <button
            key={cell}
            ref={(node) => {
              buttons.current[cell] = node;
            }}
            type="button"
            tabIndex={cell === active ? 0 : -1}
            aria-disabled={disabled}
            aria-label={`${Math.floor(cell / SIZE) + 1}행 ${(cell % SIZE) + 1}열, ${on ? "켜짐" : "꺼짐"}`}
            onFocus={() => setActive(cell)}
            onKeyDown={(event) => onKeyDown(event, cell)}
            onClick={() => {
              if (!disabled) onPress(cell);
            }}
            className={`flex aspect-square items-center justify-center rounded-xl border-4 text-xl transition-colors ${
              on ? "border-amber-600 bg-accent text-ink" : "border-slate-200 bg-white text-transparent"
            } ${disabled ? "cursor-default" : "hover:border-primary/60"}`}
          >
            <span aria-hidden="true">●</span>
          </button>
        );
      })}
    </div>
  );
}