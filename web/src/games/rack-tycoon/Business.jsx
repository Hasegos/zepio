import { describeContract, MARKETS } from "./business.js";
import { formatNumber } from "./engine.js";

/**
 * 시장 이벤트와 고객 계약 알림 줄. 계약 제안은 받아들이거나 거절하고, 받아들인 계약은 진행 정도를 보여 준다.
 *
 * @param props.biz 시장과 계약의 진행 상태
 * @param props.onAccept 계약 제안을 받아들일 때 호출
 * @param props.onDecline 계약 제안을 거절할 때 호출
 */
export default function Business({ biz, onAccept, onDecline }) {
  const market = biz.market.event;
  const { offer, active } = biz.contract;
  if (!market && !offer && !active) return null;
  return (
    <div className="flex flex-col gap-2">
      {market && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-900">
          {MARKETS[market.kind].name} · {MARKETS[market.kind].text} 남은 시간 {Math.max(0, Math.ceil(market.left))}초
        </p>
      )}
      {offer && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3" role="group" aria-label="계약 제안">
          <div>
            <p className="text-sm font-extrabold">고객 계약 제안 · {offer.name}</p>
            <p className="text-sm font-semibold">{describeContract(offer)}</p>
            <p className="text-xs font-semibold text-slate-700">보상 코인 {formatNumber(offer.reward)}개 · 제안은 {Math.max(0, Math.ceil(offer.left))}초 뒤 사라져요</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onAccept} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white">
              받아들이기
            </button>
            <button type="button" onClick={onDecline} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">
              거절
            </button>
          </div>
        </div>
      )}
      {active && (
        <div className="rounded-xl border border-indigo-300 bg-white px-4 py-3">
          <p className="text-sm font-extrabold">
            계약 진행 · {active.name} (남은 시간 {Math.max(0, Math.ceil(active.left))}초)
          </p>
          <p className="text-xs font-semibold text-slate-700">{describeContract(active)}</p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" role="presentation">
            <div className="h-full bg-primary" style={{ width: `${Math.round(Math.min(1, active.done / active.need) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-700">보상 코인 {formatNumber(active.reward)}개</p>
        </div>
      )}
    </div>
  );
}