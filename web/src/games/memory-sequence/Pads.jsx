import { PAD_COUNT } from "./reducer.js";

const PADS = Array.from({ length: PAD_COUNT }, (_, i) => i);

/**
 * 3x3 패드를 그린다. 켜진 패드는 색과 테두리로 구분하고, 입력이 막힌 동안에는 눌러도 반응하지 않는다.
 *
 * @param props.lit 지금 켜진 패드 번호(0부터) 또는 null
 * @param props.locked true이면 눌러도 무시한다
 * @param props.onPress 패드를 눌렀을 때 호출, 패드 번호(0부터)를 받는다
 */
export default function Pads({ lit, locked, onPress }) {
  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3" role="group" aria-label="패드">
      {PADS.map((pad) => {
        const on = lit === pad;
        return (
          <button
            key={pad}
            type="button"
            aria-disabled={locked}
            aria-label={`${pad + 1}번 패드`}
            onClick={() => {
              if (!locked) onPress(pad);
            }}
            className={`aspect-square rounded-2xl border-4 text-3xl font-extrabold transition-colors ${
              on
                ? "border-amber-600 bg-accent text-ink"
                : "border-slate-200 bg-white text-slate-600 active:border-primary"
            } ${locked ? "cursor-default" : "hover:border-primary/60"}`}
          >
            <span aria-hidden="true">{pad + 1}</span>
          </button>
        );
      })}
    </div>
  );
}