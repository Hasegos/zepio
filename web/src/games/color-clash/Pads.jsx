import { COLORS } from "./reducer.js";

/**
 * 색 선택 버튼 4개를 그린다. 색 견본과 색 이름 글자를 함께 보여주고 키보드 번호(1~4)도 적는다.
 *
 * @param props.onPress 버튼을 눌렀을 때 호출, 색 번호(0부터)를 받는다
 */
export default function Pads({ onPress }) {
  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3" role="group" aria-label="색 선택">
      {COLORS.map((color, i) => (
        <button
          key={color.id}
          type="button"
          aria-keyshortcuts={String(i + 1)}
          onClick={() => onPress(i)}
          className="flex items-center gap-3 rounded-2xl border-4 border-slate-200 bg-white px-4 py-4 text-left text-lg font-extrabold text-ink hover:border-primary/60 active:border-primary"
        >
          <span
            aria-hidden="true"
            className="size-8 shrink-0 rounded-full border-2 border-slate-900/20"
            style={{ backgroundColor: color.fill }}
          />
          <span>{color.name}</span>
          <span aria-hidden="true" className="ml-auto text-sm font-semibold text-slate-500">
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  );
}