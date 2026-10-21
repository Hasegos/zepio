import { KINDS } from "./engine.js";
import { BADGES, partName, partNote } from "./collection.js";
import { BADGE_BONUS, SITE_IDS, traitOf } from "./sites.js";

/**
 * 도감, 업적, 칭호를 보여 주는 창. 얻은 업적마다 수익이 조금씩 늘고, 업적 이름 중 하나를 칭호로 달 수 있다.
 *
 * @param props.state 게임 상태
 * @param props.onTitle 업적 id 또는 null을 받아 칭호를 바꾼다
 * @param props.onClose 창을 닫을 때 호출
 */
export default function Collection({ state, onTitle, onClose }) {
  const parts = new Set(state.codex);
  const earned = new Set(state.badges);
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4" aria-label="도감과 업적">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold">
          업적 {state.badges.length}/{BADGES.length} · 수익 +{Math.round(state.badges.length * BADGE_BONUS * 100)}%
        </h3>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold">
          닫기
        </button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {BADGES.map((badge) => {
          const done = earned.has(badge.id);
          const worn = state.title === badge.id;
          return (
            <li key={badge.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${done ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
              <div>
                <p className="font-extrabold">{done ? badge.name : "???"}</p>
                <p className="text-xs font-semibold">{badge.text}</p>
              </div>
              {done && (
                <button type="button" aria-pressed={worn} onClick={() => onTitle(worn ? null : badge.id)} className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white">
                  {worn ? "칭호 해제" : "칭호로"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <h3 className="text-lg font-extrabold">도감</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(KINDS).map(([kind, info]) => (
          <div key={kind}>
            <p className="mb-1 text-sm font-extrabold">{info.label}</p>
            <ul className="flex flex-col gap-1">
              {info.levels.slice(1).map((_, i) => {
                const key = `${kind}:${i + 1}`;
                const have = parts.has(key);
                return (
                  <li key={key} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${have ? "bg-indigo-50 text-slate-800" : "bg-slate-100 text-slate-500"}`}>
                    {have ? `${partName(key)} · ${partNote(kind, i + 1)}` : "???"}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div>
          <p className="mb-1 text-sm font-extrabold">건물</p>
          <ul className="flex flex-col gap-1">
            {SITE_IDS.map((type) => {
              const have = parts.has(`site:${type}`);
              return (
                <li key={type} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${have ? "bg-indigo-50 text-slate-800" : "bg-slate-100 text-slate-500"}`}>
                  {have ? `${traitOf(type).name} · ${traitOf(type).text}` : "???"}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}