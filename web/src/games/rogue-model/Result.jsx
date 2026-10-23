import { useEffect, useRef } from "react";
import ShareButton from "../_shared/ShareButton.jsx";
import { endingOf, MAX_STARS, worldOf } from "./engine.js";
import meta from "./meta.js";
import { resultStars } from "./reducer.js";
import { challengeParam, rogueShareText } from "./share-text.js";
import { DIFFICULTIES, TURNS, weighted } from "./sim.js";
import Timelapse from "./Timelapse.jsx";
import { AI_TYPES } from "./traits.js";

const VERDICTS = { 1: "이겼어요!", 0: "비겼어요.", "-1": "졌어요. 내일 다시 겨뤄 보세요." };

/**
 * 결말과 최종 수치를 보여 주고 다시 도전을 받는다.
 *
 * @param props.state 끝난 판의 상태
 * @param props.record 저장한 최고 기록과 새 기록 여부, 오늘의 도전이거나 저장 전에는 null
 * @param props.daily 오늘의 도전이면 { date, streak }, 아니면 null
 * @param props.rival 도전장 링크로 받은 친구의 오늘 기록 { stars, turn }, 없으면 null. 별이 많으면 이기고, 별이 같고 1개 이상이면 턴이 적으면 이긴다
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 * @param props.still 움직임을 줄여야 하는지. 켜져 있으면 타임랩스를 자동 재생하지 않는다
 */
export default function Result({ state, record, daily, rival, onRetry, still }) {
  const headingRef = useRef(null);
  const { sim, run } = state;
  const stars = resultStars(state);
  const ending = endingOf(sim.over);
  const world = worldOf(run.seed);
  const rows = [
    ["채택률", `${Math.round(weighted(world, sim.a) * 100)}%`],
    ["의존도", `${Math.round(weighted(world, sim.d) * 100)}%`],
    ["규제안 진행", `${Math.round(sim.reg * 100)}%`],
    ["걸린 턴", `${sim.turn} / ${TURNS}`],
  ];
  const verdict = rival && (stars !== rival.stars ? Math.sign(stars - rival.stars) : stars > 0 ? Math.sign(rival.turn - sim.turn) : 0);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {ending.title}
        </h2>
        <p className="mt-1 text-slate-600">{ending.text}</p>
        <p className="mt-1 text-sm text-slate-600">
          폭주 모델{daily ? ` · 오늘의 도전 · 연속 ${daily.streak}일` : ""} · {AI_TYPES[sim.ai].name} · {world.regions[sim.start].name}에서 시작 · {DIFFICULTIES[sim.diff].label}
        </p>
      </div>

      <Timelapse world={world} sim={sim} history={state.history} still={still} />

      <p className="text-center text-3xl font-extrabold">
        <span aria-hidden="true">
          {"★".repeat(stars)}
          {"☆".repeat(MAX_STARS - stars)}
        </span>
        <span className="sr-only">별 {stars}개</span>
      </p>

      <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="stat-tile">
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="text-xl font-extrabold">{value}</dd>
          </div>
        ))}
      </dl>

      {!daily && record?.data && (
        <p className="text-center text-sm text-slate-600">
          {record.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}내 최고 기록: 별 {record.data.bestStars}개 · {record.data.bestTurn}턴
        </p>
      )}

      {daily && rival && (
        <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-center font-bold text-slate-800">
          친구 별 {rival.stars}개 · {rival.turn}턴 / 나 별 {stars}개 · {sim.turn}턴 · {VERDICTS[verdict]}
        </p>
      )}

      <ShareButton
        title="Zepio 폭주 모델"
        text={rogueShareText(state, daily?.date)}
        path={`/games/${meta.slug}/${daily ? `?vs=${challengeParam(state, daily.date)}` : ""}`}
      />

      <button type="button" onClick={onRetry} className="btn-primary">
        일반 모드로 다시 도전
      </button>
    </div>
  );
}