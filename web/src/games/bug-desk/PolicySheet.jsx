import { DAY_NOTE, POLICIES, SEVERITY_LABELS, SYMPTOMS } from "./rules.js";

const SEVERITY_ORDER = ["crit", "high", "mid", "low", "trivial"];

/**
 * 오늘까지 켜진 정책서를 보여 준다. 기본 정책, 날마다 더해진 정책, 증상 분류표 순서다.
 *
 * @param props.day 일차(0부터)
 * @param props.highlightNew 오늘 새로 더해진 정책을 강조할지
 */
export default function PolicySheet({ day, highlightNew = false }) {
  const [base, ...extra] = POLICIES.slice(0, day + 1);
  return (
    <div className="flex flex-col gap-4 text-sm">
      <section>
        <h3 className="mb-1 font-extrabold">{base.title}</h3>
        <ol className="list-decimal space-y-1 pl-5 text-slate-800">
          {base.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>
      {extra.map((policy) => {
        const fresh = highlightNew && policy.day === day + 1;
        return (
          <section key={policy.day} className={`rounded-lg border p-3 ${fresh ? "border-primary bg-indigo-50" : "border-slate-200 bg-white"}`}>
            <h3 className="mb-1 font-extrabold">
              정책 {policy.day} · {policy.title}
              {fresh && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs text-white">오늘 새로 추가</span>}
            </h3>
            <p className="text-slate-800">{policy.rules[0]}</p>
          </section>
        );
      })}
      {extra.length > 0 && <p className="text-slate-600">{DAY_NOTE}</p>}
      <section>
        <h3 className="mb-1 font-extrabold">증상 분류표</h3>
        <ul className="space-y-1">
          {SEVERITY_ORDER.map((severity) => (
            <li key={severity} className="flex gap-2">
              <span className="w-10 shrink-0 font-bold text-slate-700">{SEVERITY_LABELS[severity]}</span>
              <span>
                {Object.values(SYMPTOMS)
                  .filter((symptom) => symptom.severity === severity)
                  .map((symptom) => symptom.label)
                  .join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}