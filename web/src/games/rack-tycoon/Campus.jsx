import { formatNumber, formatRate } from "./engine.js";
import { SITE_IDS, traitOf } from "./sites.js";

/**
 * 캠퍼스의 건물 탭과 새 건물 구매 목록. 건물이 하나뿐이면 탭은 숨기고, 처음 건물을 살 만큼 벌기 전에는 구매 목록도 숨긴다.
 *
 * @param props.sites { type, income, alert } 목록 (건물 순서대로)
 * @param props.active 보고 있는 건물 번호
 * @param props.coins 가진 코인
 * @param props.showBuy 구매 목록을 보일지
 * @param props.onSwitch 건물 번호를 받아 그 건물로 옮긴다
 * @param props.onBuy 건물 종류를 받아 산다
 */
export default function Campus({ sites, active, coins, showBuy, onSwitch, onBuy }) {
  const owned = new Set(sites.map((site) => site.type));
  const unowned = SITE_IDS.filter((type) => !owned.has(type));
  return (
    <div className="flex flex-col gap-2">
      {sites.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="건물 고르기">
          {sites.map((site, i) => (
            <button
              key={site.type}
              type="button"
              aria-pressed={i === active}
              onClick={() => onSwitch(i)}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${i === active ? "border-primary bg-indigo-50" : "border-slate-300 bg-white hover:border-primary"}`}
            >
              <span className="block font-extrabold">{traitOf(site.type).name}</span>
              <span className="block text-xs font-semibold text-slate-600">초당 {formatRate(site.income)}</span>
              {site.alert && <span className="block text-xs font-bold text-red-700">{site.alert}</span>}
            </button>
          ))}
        </div>
      )}
      {showBuy && unowned.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="새 건물 사기">
          {unowned.map((type) => {
            const trait = traitOf(type);
            const enough = coins >= trait.cost;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onBuy(type)}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${enough ? "border-emerald-400 bg-emerald-50 hover:bg-emerald-100" : "border-slate-300 bg-slate-50 text-slate-600"}`}
              >
                <span className="block font-extrabold">
                  {trait.name} 사기 · {formatNumber(trait.cost)}
                </span>
                <span className="block text-xs font-semibold">{trait.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}