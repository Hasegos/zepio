import { CONTEXT_CAP, USAGE_CAP } from "./battle.js";
import { Bar } from "./Hud.jsx";
import { isSlotItem, ITEMS, MAX_SLOTS, slotsOf } from "./party.js";
import { BUILDINGS } from "./world.js";

const ABOUT = {
  library: "스킬과 CLAUDE.md 규칙을 파는 곳이다. 한 번 사면 계속 쓴다.",
  forge: "훅을 만드는 곳이다. 훅은 위험한 동작을 실행 직전에 가로막는다.",
  compact: "컨텍스트를 요약해 비우는 곳이다. 꽉 차면 전투 중에 알던 것을 잊는다.",
  rest: "사용량 한도가 풀릴 때까지 쉬는 곳이다. 사용량이 바닥나면 의뢰를 할 수 없다.",
};

/**
 * 건물 안 화면. 도서관과 훅 대장간은 상점, 정리소는 컨텍스트 비우기, 쉼터는 사용량 채우기다.
 *
 * @param props.state 게임 상태
 */
export default function Facility({ state, onBuy, onEquip, onCompact, onRest, onLeave }) {
  const place = BUILDINGS.find((b) => b.id === state.facility);
  const items = ITEMS.filter((it) => it.place === state.facility);
  const slots = slotsOf(state.gear, state.slots);
  const shop = items.length > 0;
  return (
    <div className="flex flex-col gap-3 rounded-xl border-4 border-town-ink bg-town-panel p-3 text-town-ink">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">{place.name}</h2>
        <span className="rounded-lg bg-town-ink px-2.5 py-1 text-sm font-bold text-white">코인 {state.coins}</span>
      </div>
      <p className="text-sm font-semibold">{ABOUT[state.facility]}</p>

      {shop && (
        <div className="rounded-lg border-2 border-dashed border-town-ink bg-white p-2.5">
          <p className="text-sm font-extrabold">
            슬롯 {slots.length}/{MAX_SLOTS}
            <span className="ml-1.5 text-xs font-semibold text-town-ink/85">규칙과 훅은 슬롯에 끼운 것만 전투에서 효과가 난다. 스킬은 슬롯 없이 항상 쓴다.</span>
          </p>
          <ul aria-label="끼운 장비" className="mt-1.5 flex min-h-7 flex-wrap gap-1.5">
            {slots.length === 0 && <li className="text-xs font-semibold text-town-ink/80">비어 있다</li>}
            {slots.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onEquip(id)}
                  aria-label={`${ITEMS.find((it) => it.id === id).name} 빼기`}
                  className="rounded-md border-2 border-town-ink bg-town-ink px-2 py-0.5 text-xs font-bold text-white hover:bg-town-accent"
                >
                  {ITEMS.find((it) => it.id === id).name} ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {shop && (
        <ul className="grid gap-2">
          {items.map((item) => {
            const owned = Boolean(state.gear[item.id]);
            const poor = state.coins < item.cost;
            const slotItem = isSlotItem(item.id);
            const equipped = slots.includes(item.id);
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-town-ink bg-white p-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">
                    <span className="mr-1.5 rounded bg-town-ink px-1.5 py-0.5 text-xs text-white">{item.kind}</span>
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-town-ink/85">{item.desc}</p>
                </div>
                <button
                  type="button"
                  disabled={owned ? !slotItem : poor}
                  aria-pressed={owned && slotItem ? equipped : undefined}
                  onClick={() => (owned ? onEquip(item.id) : onBuy(item.id))}
                  className="shrink-0 rounded-lg border-2 border-town-ink bg-town-accent px-3 py-2 text-sm font-extrabold text-white disabled:bg-slate-200 disabled:text-slate-700 aria-pressed:bg-town-good"
                >
                  {!owned ? `${item.cost} 코인` : slotItem ? (equipped ? "끼움 ✔" : "끼우기") : "보유 중"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {state.facility === "compact" && (
        <div className="flex flex-col gap-2 rounded-lg bg-town-ink p-3">
          <Bar label="컨텍스트" value={state.context} max={CONTEXT_CAP} />
          <button type="button" onClick={onCompact} className="rounded-lg border-2 border-white bg-white px-3 py-2 text-sm font-extrabold text-town-ink">
            컨텍스트 정리하기
          </button>
        </div>
      )}

      {state.facility === "rest" && (
        <div className="flex flex-col gap-2 rounded-lg bg-town-ink p-3">
          <Bar label="사용량" value={state.usage} max={USAGE_CAP} />
          <button type="button" onClick={onRest} className="rounded-lg border-2 border-white bg-white px-3 py-2 text-sm font-extrabold text-town-ink">
            한도 풀릴 때까지 쉬기
          </button>
        </div>
      )}

      <p role="status" className="min-h-5 text-sm font-bold text-town-accent">
        {state.notice}
      </p>
      <button
        type="button"
        onClick={onLeave}
        className="rounded-xl border-4 border-town-ink bg-white px-4 py-2.5 text-base font-extrabold text-town-ink shadow-[0_3px_0_0_#1f1b34]"
      >
        나가기
      </button>
    </div>
  );
}