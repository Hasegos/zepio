import { expandCost, formatNumber, KINDS, placeCost } from "./engine.js";
import { LANDS } from "./layout.js";

export const TOOLS = [
  { id: "select", label: "이동·선택", key: "Esc" },
  { id: "server", label: "서버", key: "1" },
  { id: "cooler", label: "냉각기", key: "2" },
  { id: "hub", label: "허브", key: "3" },
  { id: "gen", label: "발전기", key: "4" },
  { id: "battery", label: "배터리", key: "5" },
  { id: "ext", label: "소화기", key: "6" },
  { id: "move", label: "옮기기", key: "M" },
  { id: "remove", label: "철거", key: "X" },
];
export const OVERLAYS = [
  { id: "heat", label: "열지도", key: "H" },
  { id: "net", label: "네트워크", key: "N" },
];

/**
 * 건설 도구, 지도 겹쳐 보기, 부지 넓히기 버튼 줄.
 *
 * @param props.tool 고른 도구
 * @param props.onTool 도구를 바꿀 때 호출
 * @param props.overlay 켜 둔 겹쳐 보기(none, heat, net)
 * @param props.onOverlay 겹쳐 보기를 바꿀 때 호출
 * @param props.state 게임 상태
 * @param props.onExpand 부지 넓히기를 눌렀을 때 호출
 * @param props.codexOpen 도감 창이 열려 있는지
 * @param props.onCodex 도감 창을 여닫을 때 호출
 * @param props.codexCount 도감과 업적을 얻은 수와 전체 수 문구
 * @param props.researchOpen 연구 창이 열려 있는지
 * @param props.onResearch 연구 창을 여닫을 때 호출
 */
export default function Toolbar({ tool, onTool, overlay, onOverlay, state, onExpand, codexOpen, onCodex, codexCount, researchOpen, onResearch }) {
  const cost = expandCost(state);
  const poor = cost !== null && state.coins < cost;
  const pill = "rounded-lg border px-3 py-2 text-xs font-bold aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white border-slate-300 bg-white text-slate-700";
  return (
    <div className="flex flex-col gap-2" role="toolbar" aria-label="건설 도구">
      <div className="flex flex-wrap gap-1.5">
        {TOOLS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={tool === entry.id}
            onClick={(event) => {
              onTool(entry.id);
              if (event.detail > 0) event.currentTarget.blur();
            }}
            className={pill}
          >
            {entry.label}
            <span className="ml-1 font-semibold opacity-70">
              {KINDS[entry.id] ? `${formatNumber(placeCost(state, entry.id))}` : entry.key}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {OVERLAYS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={overlay === entry.id}
            onClick={(event) => {
              onOverlay(overlay === entry.id ? "none" : entry.id);
              if (event.detail > 0) event.currentTarget.blur();
            }}
            className={pill}
          >
            {entry.label}
            <span className="ml-1 font-semibold opacity-70">{entry.key}</span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={codexOpen}
          onClick={(event) => {
            onCodex();
            if (event.detail > 0) event.currentTarget.blur();
          }}
          className={pill}
        >
          도감·업적
          <span className="ml-1 font-semibold opacity-70">{codexCount}</span>
        </button>
        <button
          type="button"
          aria-pressed={researchOpen}
          onClick={(event) => {
            onResearch();
            if (event.detail > 0) event.currentTarget.blur();
          }}
          className={pill}
        >
          연구
        </button>
        {cost !== null && (
          <button
            type="button"
            aria-disabled={poor}
            onClick={(event) => {
              if (!poor) onExpand();
              if (event.detail > 0) event.currentTarget.blur();
            }}
            className="ml-auto rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white aria-disabled:bg-slate-300 aria-disabled:text-slate-600"
          >
            부지 넓히기 ({LANDS[state.land + 1].w}×{LANDS[state.land + 1].h}) · {formatNumber(cost)}
          </button>
        )}
      </div>
    </div>
  );
}