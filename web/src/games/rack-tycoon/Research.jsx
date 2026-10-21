import { formatNumber } from "./engine.js";
import { RESEARCH, researchCost } from "./sites.js";

/**
 * 연구 창. 코인으로 인프라, 안전, 경영 연구를 올리면 영구 효과가 생기고, 리브랜딩해도 남는다.
 *
 * @param props.state 게임 상태
 * @param props.onResearch 연구 종류를 받아 한 단계 올린다
 * @param props.onClose 창을 닫을 때 호출
 */
export default function Research({ state, onResearch, onClose }) {
  const branches = [...new Set(Object.values(RESEARCH).map((item) => item.branch))];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4" aria-label="연구">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold">연구</h3>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold">
          닫기
        </button>
      </div>
      <p className="text-xs font-semibold text-slate-600">연구는 영구 효과를 주고 리브랜딩해도 남아요.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {branches.map((branch) => (
          <div key={branch} className="flex flex-col gap-2">
            <p className="text-sm font-extrabold">{branch}</p>
            {Object.entries(RESEARCH)
              .filter(([, item]) => item.branch === branch)
              .map(([key, item]) => {
                const level = state.research[key];
                const done = level >= item.max;
                const cost = researchCost(key, level);
                const poor = !done && state.coins < cost;
                return (
                  <div key={key} className="flex flex-col gap-1 rounded-xl border border-slate-200 px-3 py-2">
                    <p className="text-sm font-bold">
                      {item.name} {level}/{item.max}
                    </p>
                    <p className="text-xs text-slate-600">{done ? item.effect(level) : `다음 단계: ${item.effect(level + 1)}`}</p>
                    {done ? (
                      <p className="text-xs font-bold text-success-strong">최대예요.</p>
                    ) : (
                      <button
                        type="button"
                        aria-disabled={poor}
                        onClick={poor ? undefined : () => onResearch(key)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white aria-disabled:bg-slate-300 aria-disabled:text-slate-600"
                      >
                        연구 · {formatNumber(cost)} 코인
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </section>
  );
}
