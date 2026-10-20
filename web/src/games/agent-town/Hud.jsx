import { CONTEXT_CAP, USAGE_CAP } from "./battle.js";
import { MEMBERS } from "./party.js";
import { ALL_TASK_IDS } from "./tasks.js";
import { GYM_IDS, GYMS } from "./gyms.js";
import { MAPS } from "./world.js";

/**
 * 가득 찰수록 색이 바뀌는 막대. 채워진 정도를 글자로도 보여 준다.
 *
 * @param props.label 이름(예: 사용량)
 * @param props.value 현재 값
 * @param props.max 최대 값
 * @param props.mode full 이면 가득 찰수록 위험(사용량·컨텍스트), left 이면 줄어들수록 위험(인내심)
 */
export function Bar({ label, value, max, mode = "full" }) {
  const clamped = Math.max(0, Math.min(max, value));
  const ratio = clamped / max;
  const danger = mode === "full" ? ratio : 1 - ratio;
  const color = danger >= 0.8 ? "bg-town-bad" : danger >= 0.55 ? "bg-amber-600" : "bg-town-good";
  return (
    <div className="min-w-0 flex-1">
      <div className="flex justify-between text-xs font-bold text-white">
        <span>{label}</span>
        <span>
          {clamped}/{max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        className="h-2.5 overflow-hidden rounded-sm border border-white/40 bg-black/40"
      >
        <div className={`h-full ${color} transition-[width] duration-300`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * 지도 위에 항상 보이는 상태 표시. 신뢰, 코인, 사용량, 컨텍스트, 동료를 담는다.
 *
 * @param props.state 게임 상태
 * @param props.onCodex 도감 열기(지도에서 대화 중이 아닐 때만 넘긴다)
 */
export default function Hud({ state, onTitle, onCodex }) {
  const known = Object.keys(state.seen).length;
  const next = GYM_IDS.map((id) => GYMS[id]).find((g) => !state.badges.includes(g.id));
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-town-ink p-3 text-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold">
        <span>{MAPS[state.map].name}</span>
        <span aria-label={next ? `신뢰 ${state.trust}, ${next.leader} 조건 ${next.trust}` : `신뢰 ${state.trust}`}>
          <span aria-hidden="true" className="text-amber-300">
            ★
          </span>{" "}
          신뢰 {state.trust}
          {next && `/${next.trust}`}
        </span>
        <span aria-label={`뱃지 ${state.badges.length}개, 전체 ${GYM_IDS.length}개`}>
          뱃지 {state.badges.length}/{GYM_IDS.length}
        </span>
        <span>코인 {state.coins}</span>
        <span>
          도감 {known}/{ALL_TASK_IDS.length}
        </span>
        {state.party.length > 0 && (
          <span className="text-white/85">동료 {state.party.map((id) => MEMBERS[id].name).join(" · ")}</span>
        )}
        <span className="ml-auto flex gap-2">
          {onCodex && (
            <button
              type="button"
              onClick={onCodex}
              className="rounded-md border border-white/50 px-2 py-0.5 text-xs font-bold text-white hover:bg-white/10"
            >
              도감 열기
            </button>
          )}
          <button
            type="button"
            onClick={onTitle}
            className="rounded-md border border-white/50 px-2 py-0.5 text-xs font-bold text-white hover:bg-white/10"
          >
            제목으로
          </button>
        </span>
      </div>
      <div className="flex gap-3">
        <Bar label="사용량" value={state.usage} max={USAGE_CAP} />
        <Bar label="컨텍스트" value={state.context} max={CONTEXT_CAP} />
      </div>
    </div>
  );
}