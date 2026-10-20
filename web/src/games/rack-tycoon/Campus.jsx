import { formatNumber, formatRate } from "./engine.js";
import { NET_BONUS, NET_MAX, SITE_IDS, traitOf } from "./sites.js";

/**
 * 캠퍼스의 건물 탭, 건물 연결, 새 건물 구매 목록. 건물이 하나뿐이면 탭과 연결은 숨기고, 처음 건물을 살 만큼 벌기 전에는 구매 목록도 숨긴다.
 *
 * @param props.sites 건물 탭에 보일 건물 목록(종류, 초당 수익, 연결 수, 재난 알림), 건물 순서대로
 * @param props.active 보고 있는 건물 번호
 * @param props.coins 가진 코인
 * @param props.links 이어진 건물 종류 쌍의 목록
 * @param props.linkCost 건물 두 개를 새로 잇는 값
 * @param props.showBuy 구매 목록을 보일지
 * @param props.onSwitch 건물 번호를 받아 그 건물로 옮긴다
 * @param props.onBuy 건물 종류를 받아 산다
 * @param props.onLink 건물 종류 두 개를 받아 잇는다
 */
export default function Campus({ sites, active, coins, links, linkCost, showBuy, onSwitch, onBuy, onLink }) {
  const owned = new Set(sites.map((site) => site.type));
  const unowned = SITE_IDS.filter((type) => !owned.has(type));
  const pairs = [];
  for (let i = 0; i < sites.length; i += 1) for (let j = i + 1; j < sites.length; j += 1) pairs.push([sites[i].type, sites[j].type]);
  const linked = (a, b) => links.some((pair) => pair.includes(a) && pair.includes(b));
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
              <span className="block text-xs font-semibold text-slate-600">
                초당 {formatRate(site.income)}
                {site.links > 0 && ` · 연결 ${site.links}`}
              </span>
              {site.alert && <span className="block text-xs font-bold text-red-700">{site.alert}</span>}
            </button>
          ))}
        </div>
      )}
      {sites.length > 1 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-slate-700">
            건물을 이으면 이어진 건물 하나당 수익 +{Math.round(NET_BONUS * 100)}% (최대 +{Math.round(NET_BONUS * NET_MAX * 100)}%). 정전과 폭주 때 서로 돕지만, 재난이 이어진 건물로 번질 수 있어요.
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="건물 연결">
            {pairs.map(([a, b]) =>
              linked(a, b) ? (
                <span key={`${a}-${b}`} className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-bold text-emerald-900">
                  {traitOf(a).name} ↔ {traitOf(b).name} 연결됨
                </span>
              ) : (
                <button
                  key={`${a}-${b}`}
                  type="button"
                  onClick={() => onLink(a, b)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${coins >= linkCost ? "border-emerald-400 bg-emerald-50 hover:bg-emerald-100" : "border-slate-300 bg-slate-50 text-slate-600"}`}
                >
                  {traitOf(a).name} ↔ {traitOf(b).name} 잇기 · {formatNumber(linkCost)}
                </button>
              ),
            )}
          </div>
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