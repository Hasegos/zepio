import { costOf } from "./engine.js";
import { BRANCHES, TRAITS } from "./traits.js";

/**
 * 진화 능력을 갈래별로 보여 주고 한 단계씩 사게 한다.
 *
 * @param props.sim 지금 상태
 * @param props.onBuy 능력 id를 받는다
 */
export default function TraitPanel({ sim, onBuy }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold">
        진화 포인트 <span className="text-lg font-extrabold text-primary">{sim.points}</span>
      </p>
      {Object.entries(BRANCHES).map(([branch, label]) => (
        <section key={branch} aria-label={`${label} 능력`}>
          <h3 className="mb-1 text-sm font-extrabold text-slate-700">{label}</h3>
          <ul className="grid gap-1.5">
            {TRAITS.filter((trait) => trait.branch === branch).map((trait) => {
              const level = sim.levels[trait.id] ?? 0;
              const max = trait.costs.length;
              const cost = costOf(sim, trait.id);
              const next = trait.costs[level];
              return (
                <li key={trait.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="flex-1">
                    <span className="block text-sm font-bold">
                      {trait.name}{" "}
                      <span aria-label={`${level} / ${max}단계`} className="text-xs font-semibold text-slate-500">
                        {"●".repeat(level)}
                        {"○".repeat(max - level)}
                      </span>
                    </span>
                    <span className="block text-xs text-slate-600">{trait.note}</span>
                  </span>
                  {next === undefined ? (
                    <span className="text-xs font-bold text-slate-500">최대</span>
                  ) : (
                    <button
                      type="button"
                      disabled={!cost}
                      onClick={() => onBuy(trait.id)}
                      aria-label={`${trait.name} ${level + 1}단계 올리기, ${next}포인트`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {next}pt
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}