import { useState } from "react";
import { KINDS, placeCost, formatNumber } from "./engine.js";
import { summaryOf } from "./hover.js";
import { GRID_HEIGHT, GRID_WIDTH, LANDS } from "./layout.js";

/**
 * 3D 화면 없이도 시설을 열어 보고 좌표로 새로 설치할 수 있는 목록. 키보드나 보조 기기를 쓸 때도 같은 일을 할 수 있다.
 *
 * @param props.state 게임 상태
 * @param props.analysis analyze 결과
 * @param props.onOpen 시설 칸 번호를 받아 작업 창을 연다
 * @param props.onTerminal 단말기 창을 연다
 * @param props.onPlace 종류와 칸 번호를 받아 설치한다
 */
export default function Lists({ state, analysis, onOpen, onTerminal, onPlace }) {
  const [kind, setKind] = useState("server");
  const [x, setX] = useState(LANDS[state.land].x + 1);
  const [y, setY] = useState(LANDS[state.land].y + 1);
  const items = [];
  state.cells.forEach((cell, tile) => {
    if (cell) items.push(tile);
  });
  const field = "w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-bold">목록으로 관리하기 (3D 없이 열기 · 좌표로 설치)</summary>
      <div className="mt-3 flex flex-col gap-3">
        <button type="button" onClick={onTerminal} className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">
          사무실 단말기
        </button>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onPlace(kind, y * GRID_WIDTH + x);
          }}
        >
          <label className="text-xs font-semibold">
            종류
            <select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              {Object.entries(KINDS).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.levels[1].name} ({formatNumber(placeCost(state, id))})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            가로 칸 (0~{GRID_WIDTH - 1})
            <input type="number" min={0} max={GRID_WIDTH - 1} value={x} onChange={(event) => setX(Number(event.target.value))} className={`${field} mt-1 block`} />
          </label>
          <label className="text-xs font-semibold">
            세로 칸 (0~{GRID_HEIGHT - 1})
            <input type="number" min={0} max={GRID_HEIGHT - 1} value={y} onChange={(event) => setY(Number(event.target.value))} className={`${field} mt-1 block`} />
          </label>
          <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white">
            설치
          </button>
        </form>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {items.map((tile) => (
            <li key={tile}>
              <button type="button" onClick={() => onOpen(tile)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-semibold">
                ({(tile % GRID_WIDTH) + 1}, {Math.floor(tile / GRID_WIDTH) + 1}) {summaryOf(state, analysis, tile)}
              </button>
            </li>
          ))}
        </ul>
        {items.length === 0 && <p className="text-xs text-slate-600">아직 시설이 없어요.</p>}
      </div>
    </details>
  );
}