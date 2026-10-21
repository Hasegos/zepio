import { useEffect, useRef, useState } from "react";
import { costOf } from "./engine.js";
import { BRANCHES, TRAITS } from "./traits.js";

/**
 * 진화 능력을 갈래별로 보여 주고 한 단계씩 사게 한다. 포인트는 턴마다 1씩 느는 것 말고 갑자기 바뀔 때(구매, 보너스) 튄다.
 *
 * @param props.sim 지금 상태
 * @param props.onBuy 능력 id를 받는다
 */
export default function TraitPanel({ sim, onBuy }) {
  const [pop, setPop] = useState(0);
  const last = useRef(sim.points);

  useEffect(() => {
    if (sim.points !== last.current + 1) setPop((n) => n + 1);
    last.current = sim.points;
  }, [sim.points]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold">
        진화 포인트{" "}
        <span key={pop} className={`inline-block text-lg font-extrabold text-primary ${pop ? "animate-rm-pop motion-reduce:animate-none" : ""}`}>
          {sim.points}
        </span>
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
                      <span key={level} aria-hidden="true" className={`inline-block text-xs font-semibold text-slate-500 ${level ? "animate-rm-pop motion-reduce:animate-none" : ""}`}>
                        {"●".repeat(level)}
                        {"○".repeat(max - level)}
                      </span>
                      <span className="sr-only">
                        {level} / {max}단계
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
                      aria-label={`${trait.name} ${level + 1}단계 올리기, ${next}pt`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white transition-transform active:scale-90 disabled:bg-slate-200 disabled:text-slate-500"
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