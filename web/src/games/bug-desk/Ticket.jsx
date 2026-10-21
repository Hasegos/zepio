import { symptomLabel } from "./engine.js";
import { TIER_LABELS } from "./rules.js";

const CHIP = "rounded-md border px-2 py-0.5 text-xs font-bold";

/**
 * 접수 건 한 장을 티켓 모양으로 보여 준다.
 *
 * @param props.report 접수 건
 */
export default function Ticket({ report }) {
  const bug = report.kind === "bug";
  return (
    <article className="rounded-xl border-2 border-slate-300 bg-amber-50 p-4" aria-label={`접수 ${report.id}번`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-extrabold text-slate-700">접수 #{report.id}</span>
        <span className={`${CHIP} border-indigo-300 bg-indigo-50 text-indigo-800`}>{report.area}</span>
        <span className={`${CHIP} ${bug ? "border-rose-300 bg-rose-50 text-rose-800" : "border-sky-300 bg-sky-50 text-sky-800"}`}>
          {symptomLabel(report.symptom)}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-extrabold leading-snug">{report.title}</h3>
      <p className="mt-1 text-sm text-slate-700">“{report.memo}”</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-white px-2 py-1.5">
          <dt className="text-xs text-slate-600">고객</dt>
          <dd className={`font-bold ${report.tier === "vip" ? "text-amber-700" : ""}`}>{TIER_LABELS[report.tier]}</dd>
        </div>
        <div className="rounded-lg bg-white px-2 py-1.5">
          <dt className="text-xs text-slate-600">{bug ? "영향" : "요청"}</dt>
          <dd className="font-bold">{report.users.toLocaleString("ko-KR")}명</dd>
        </div>
        {bug && (
          <>
            <div className="rounded-lg bg-white px-2 py-1.5">
              <dt className="text-xs text-slate-600">재현 단계</dt>
              <dd className="font-bold">{report.repro ? "있음" : "없음"}</dd>
            </div>
            <div className="rounded-lg bg-white px-2 py-1.5">
              <dt className="text-xs text-slate-600">우회 방법</dt>
              <dd className="font-bold">{report.workaround ? "있음" : "없음"}</dd>
            </div>
          </>
        )}
      </dl>
    </article>
  );
}