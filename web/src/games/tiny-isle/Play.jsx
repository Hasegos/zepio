import { useEffect, useMemo } from "react";
import Board from "./Board.jsx";
import { currentScore, legalCells, preview, questStatus } from "./engine.js";
import Hand from "./Hand.jsx";
import { QUEST_BONUS } from "./quests.js";
import { BUILDINGS } from "./rules.js";

/**
 * 판 진행 화면. 점수와 의뢰, 섬 지도, 짓기 확인 줄, 손패를 보여 주고 Esc로 선택을 취소한다.
 *
 * @param props.state 화면 상태(run, selected, target, demolishing, gain, notice, noticeId)
 * @param props.dispatch 화면 동작을 보낸다
 * @param props.onMenu 섬 고르기로 나갈 때 호출(판은 저장돼 있어 이어 할 수 있다)
 */
export default function Play({ state, dispatch, onMenu }) {
  const { run, selected, target, demolishing, gain } = state;
  const cardId = selected === null ? null : run.hand[selected];
  const card = cardId ? BUILDINGS.find((building) => building.id === cardId) : null;
  const legal = useMemo(() => (cardId ? legalCells(run, cardId) : []), [run, cardId]);
  const quests = useMemo(() => questStatus(run), [run]);
  const changes = useMemo(() => {
    if (target === null) return [];
    if (demolishing) return preview(run, null, target).changes;
    return cardId ? preview(run, cardId, target).changes : [];
  }, [run, target, demolishing, cardId]);
  const total = changes.reduce((sum, entry) => sum + entry.after - entry.before, 0);
  const done = quests.filter((quest) => quest.done).length;

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") dispatch({ type: "cancel" });
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  const hint = demolishing
    ? target === null
      ? "철거할 건물을 누르세요"
      : "한 번 더 누르면 철거돼요"
    : cardId === null
      ? "아래에서 카드를 골라 보세요"
      : target === null
        ? "놓을 칸을 누르면 점수가 미리 보여요"
        : "한 번 더 누르거나 버튼으로 확정해요";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg border-2 border-isle-ink/30 px-3 py-1.5 text-sm font-bold text-isle-ink"
        >
          섬 고르기
        </button>
        <p className="text-right">
          <span className="block text-sm font-bold text-isle-ink">
            {run.island.name} · 의뢰 {done}/{quests.length}
          </span>
          <span role="img" className="block text-2xl font-extrabold leading-none text-isle-ink" aria-label={`현재 점수 ${currentScore(run) + done * QUEST_BONUS}점`}>
            {currentScore(run) + done * QUEST_BONUS}
            <span className="ml-1 text-sm font-bold text-slate-700">점</span>
          </span>
        </p>
      </div>

      <Board
        run={run}
        cardId={cardId}
        legal={legal}
        target={target}
        changes={changes}
        demolishing={demolishing}
        gain={gain}
        onCell={(i) => dispatch({ type: "cell", i })}
      />

      <div className="min-h-11 text-center text-sm text-isle-ink">
        <p role="status" className="font-bold">
          {state.notice ? <span key={state.noticeId}>{state.notice}</span> : hint}
        </p>
        {card && !demolishing && <p className="text-[13px] text-slate-700">{card.name}: {card.rule}</p>}
      </div>

      <div className="min-h-[3.25rem]">
        {target !== null ? (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "confirm" })}
              className={`rounded-xl px-4 py-3 text-lg font-extrabold text-white ${demolishing ? "bg-danger-strong" : "bg-isle-accent"}`}
            >
              {demolishing ? "철거하기" : "여기에 짓기"} ({total > 0 ? "+" : ""}
              {total}점)
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "cancel" })}
              className="rounded-xl border-2 border-isle-ink/30 bg-white px-4 py-3 font-bold text-isle-ink"
            >
              취소
            </button>
          </div>
        ) : null}
      </div>

      <Hand
        run={run}
        selected={selected}
        demolishing={demolishing}
        onSelect={(slot) => dispatch({ type: "select", slot })}
        onReroll={() => dispatch({ type: "reroll" })}
        onDemolish={() => dispatch({ type: "demolishMode" })}
      />

      <ul className="grid gap-1" aria-label="주민 의뢰">
        {quests.map((quest) => (
          <li
            key={quest.id}
            className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-[13px] ${
              quest.done ? "bg-success/20 font-bold text-success-strong" : "bg-isle-cream text-isle-ink"
            }`}
          >
            <span>
              <span aria-hidden="true">{quest.done ? "✔ " : "· "}</span>
              <span className="sr-only">{quest.done ? "달성 " : "진행 중 "}</span>
              {quest.name}: {quest.desc}
            </span>
            <span className="shrink-0">{quest.done ? `+${QUEST_BONUS}` : quest.progress}</span>
          </li>
        ))}
      </ul>

    </div>
  );
}