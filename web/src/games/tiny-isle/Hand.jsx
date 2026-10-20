import Glyph from "./Glyph.jsx";
import { BUILDINGS } from "./rules.js";

/**
 * 건물 id의 정의를 구한다.
 *
 * @param id 건물 id
 * @returns 이름과 규칙 설명이 있는 정의
 */
function info(id) {
  return BUILDINGS.find((building) => building.id === id);
}

/**
 * 손패 카드 세 장과 다음 카드, 뒤섞기와 철거 버튼을 보여 준다.
 *
 * @param props.run 판 상태(hand, deck, next, rerolls, demolish)
 * @param props.selected 고른 카드 칸 번호, 없으면 null
 * @param props.demolishing 철거 모드이면 true
 * @param props.onSelect 카드를 눌렀을 때 호출, 손패 칸 번호를 받는다
 * @param props.onReroll 뒤섞기를 눌렀을 때 호출
 * @param props.onDemolish 철거 모드를 켜고 끌 때 호출
 */
export default function Hand({ run, selected, demolishing, onSelect, onReroll, onDemolish }) {
  const upcoming = run.deck.slice(run.next, run.next + 3);
  const left = run.hand.filter(Boolean).length + run.deck.length - run.next;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="손패">
        {run.hand.map((id, slot) => {
          const card = id ? info(id) : null;
          const on = selected === slot;
          return (
            <button
              key={slot}
              type="button"
              disabled={!card}
              aria-pressed={on}
              aria-label={card ? `${card.name}, ${card.rule}` : "빈 카드 칸"}
              onClick={() => onSelect(slot)}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 text-center ${
                on ? "border-isle-accent bg-white shadow" : "border-transparent bg-isle-cream"
              } disabled:opacity-40`}
            >
              {card ? (
                <>
                  <Glyph id={card.id} size={30} />
                  <span className="text-sm font-bold">{card.name}</span>
                </>
              ) : (
                <span className="m-auto text-sm text-slate-600">비었어요</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-sm text-isle-ink">
        <p className="flex items-center gap-1.5">
          <span className="font-bold">다음</span>
          {upcoming.map((id, k) => (
            <span key={k} className="flex items-center gap-0.5 rounded-lg bg-white px-1.5 py-0.5">
              <Glyph id={id} size={18} />
              <span className="text-[12px]">{info(id).name}</span>
            </span>
          ))}
        </p>
        <p className="shrink-0 font-bold">남은 카드 {left}장</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-disabled={run.rerolls < 1 || run.next >= run.deck.length}
          onClick={onReroll}
          className="rounded-xl border-2 border-isle-ink/30 bg-white px-3 py-2.5 text-sm font-bold text-isle-ink aria-disabled:opacity-50"
        >
          뒤섞기 {run.rerolls}번 남음
        </button>
        <button
          type="button"
          aria-pressed={demolishing}
          aria-disabled={run.demolish < 1}
          onClick={onDemolish}
          className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold aria-disabled:opacity-50 ${
            demolishing ? "border-danger-strong bg-danger-strong text-white" : "border-isle-ink/30 bg-white text-isle-ink"
          }`}
        >
          철거 {run.demolish}번 남음
        </button>
      </div>
    </div>
  );
}