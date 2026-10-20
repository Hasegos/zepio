import { useEffect, useRef } from "react";
import ShareButton from "../_shared/ShareButton.jsx";
import Board from "./Board.jsx";
import Glyph from "./Glyph.jsx";
import meta from "./meta.js";
import { QUEST_BONUS } from "./quests.js";
import { BUILDINGS } from "./rules.js";
import { isleShareText } from "./share-text.js";

const HEADLINES = ["섬이 완성됐어요", "아담한 마을이 생겼어요", "활기찬 마을이에요!", "전설의 섬이에요!"];

/**
 * 끝난 판의 결과를 보여 준다. 점수와 별, 건물별 점수, 의뢰 결과, 공유와 다음 행동을 담는다.
 *
 * @param props.run 끝난 판 상태
 * @param props.result 결과 { base, bonus, score, stars, quests, parts }
 * @param props.record 저장 결과 { isNewBest, saved, ghost(오늘의 섬에서 제피 점수), streak }, 저장 전에는 null
 * @param props.onRetry 다시 하기를 눌렀을 때 호출
 * @param props.onMenu 섬 고르기를 눌렀을 때 호출
 */
export default function Result({ run, result, record, onRetry, onMenu }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {HEADLINES[result.stars]}
        </h2>
        <p role="img" className="mt-1 text-3xl text-amber-700" aria-label={`별 ${result.stars}개`}>
          {"★".repeat(result.stars)}
          {"☆".repeat(3 - result.stars)}
        </p>
        <p className="mt-1 text-4xl font-extrabold text-isle-ink">{result.score}점</p>
        <p className="text-sm text-slate-700">
          {run.island.name} · 건물 {result.base}점 + 의뢰 {result.bonus}점
        </p>
        {record?.isNewBest && <p className="mt-1 font-bold text-success-strong">새 기록!</p>}
        {record?.saved === false && (
          <p className="mt-1 text-sm font-bold text-danger-strong">기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.</p>
        )}
        {record?.ghost !== undefined && (
          <p className="mt-1 text-sm font-bold">
            {result.score > record.ghost
              ? `제피를 ${result.score - record.ghost}점 앞섰어요`
              : result.score === record.ghost
                ? "제피와 비겼어요"
                : `제피(${record.ghost}점)까지 ${record.ghost - result.score}점 모자라요`}
            {record.streak > 0 && ` · ${record.streak}일 연속`}
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-xs">
        <Board
          run={run}
          cardId={null}
          legal={[]}
          target={null}
          changes={[]}
          demolishing={false}
          gain={null}
          onCell={() => {}}
        />
      </div>

      <div className="rounded-xl bg-isle-cream p-3">
        <h3 className="mb-2 text-sm font-bold">주민 의뢰</h3>
        <ul className="grid gap-1.5 text-sm">
          {result.quests.map((quest) => (
            <li key={quest.id} className="flex justify-between gap-2">
              <span>
                <span aria-hidden="true">{quest.done ? "✔ " : "· "}</span>
                <span className="sr-only">{quest.done ? "달성 " : "미달성 "}</span>
                {quest.name} <span className="text-slate-700">({quest.desc})</span>
              </span>
              <span className={quest.done ? "font-bold text-success-strong" : "text-slate-700"}>
                {quest.done ? `+${QUEST_BONUS}` : quest.progress}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="grid grid-cols-2 gap-2 text-sm">
        {BUILDINGS.filter((building) => result.parts[building.id]).map((building) => (
          <li key={building.id} className="flex items-center gap-2 rounded-lg bg-isle-cream px-2.5 py-1.5">
            <Glyph id={building.id} size={22} />
            <span className="flex-1">
              {building.name} {result.parts[building.id].count}채
            </span>
            <span className="font-bold">{result.parts[building.id].score}</span>
          </li>
        ))}
      </ul>

      <ShareButton title="Zepio Tiny Isle" text={isleShareText(run.island, result)} path={`/games/${meta.slug}/`} />

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onRetry} className="rounded-xl bg-isle-accent px-4 py-3 font-bold text-white">
          다시 하기
        </button>
        <button
          type="button"
          onClick={onMenu}
          className="rounded-xl border-2 border-isle-ink/30 bg-white px-4 py-3 font-bold text-isle-ink"
        >
          섬 고르기
        </button>
      </div>
    </div>
  );
}