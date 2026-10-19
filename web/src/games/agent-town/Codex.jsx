import { ALL_TASK_IDS } from "./tasks.js";
import { codexGroups, currentTitle, titlesOf } from "./codex.js";

const STATE_LABEL = { won: "해결", met: "만남", locked: "" };

/**
 * 도감 화면. 만난 의뢰와 해결한 의뢰를 보여 주고, 칭호의 획득 조건을 알려 준다.
 * 아직 못 만난 의뢰는 이름 대신 ???로 숨겨 호기심을 남긴다.
 *
 * @param props.state 게임 상태
 * @param props.onClose 닫기
 */
export default function Codex({ state, onClose }) {
  const known = Object.keys(state.seen).length;
  const titles = titlesOf(state);
  return (
    <div className="flex flex-col gap-3 rounded-xl border-4 border-town-ink bg-town-panel p-3 text-town-ink">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">도감</h2>
        <span className="rounded-lg bg-town-ink px-2.5 py-1 text-sm font-bold text-white">
          {known}/{ALL_TASK_IDS.length}
        </span>
      </div>
      <p className="text-sm font-bold">
        칭호: <span className="text-town-accent">{currentTitle(state)}</span>
      </p>

      <section aria-label="칭호" className="rounded-lg border-2 border-dashed border-town-ink bg-white p-2.5">
        <ul className="grid gap-1">
          {titles.map((t) => (
            <li key={t.id} className={`text-xs font-semibold ${t.earned ? "text-town-ink" : "text-town-ink/70"}`}>
              <span className="font-extrabold">{t.earned ? "★" : "☆"} {t.name}</span> · {t.desc}
            </li>
          ))}
        </ul>
      </section>

      {codexGroups(state.seen).map(({ group, entries }) => (
        <section key={group} aria-label={group}>
          <h3 className="mb-1 text-sm font-extrabold">{group}</h3>
          <ul className="grid gap-1.5">
            {entries.map((e) => (
              <li key={e.id} className="rounded-lg border-2 border-town-ink bg-white px-2.5 py-1.5">
                <p className="flex items-center justify-between gap-2 text-sm font-extrabold">
                  <span className={e.state === "locked" ? "text-town-ink/60" : ""}>{e.name}</span>
                  {e.state !== "locked" && (
                    <span className={`text-xs ${e.state === "won" ? "text-town-good" : "text-town-warn"}`}>{STATE_LABEL[e.state]}</span>
                  )}
                </p>
                {e.state !== "locked" && (
                  <p className="text-xs font-semibold text-town-ink/85">
                    {e.client}
                    {e.tags.length > 0 && ` · ${e.tags.join(", ")}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border-4 border-town-ink bg-white px-4 py-2.5 text-base font-extrabold text-town-ink shadow-[0_3px_0_0_#1f1b34]"
      >
        닫기
      </button>
    </div>
  );
}