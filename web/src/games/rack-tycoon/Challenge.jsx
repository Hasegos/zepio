import ShareButton from "../_shared/ShareButton.jsx";
import { CHALLENGE_COINS, CHALLENGE_SECONDS, clockText } from "./challenge.js";
import { formatNumber } from "./engine.js";
import meta from "./meta.js";
import { traitOf } from "./sites.js";

/**
 * 오늘의 도전 줄. 시작 전에는 도전 버튼과 오늘의 기록을, 도전 중에는 남은 시간과 점수를, 끝나면 결과와 공유를 보여 준다.
 *
 * @param props.challenge 도전 상태 { date, type, left, done, score, record, streak }, 도전 중이 아니면 null
 * @param props.info 시작 전 안내 { date, type, record(오늘 기록 점수 또는 null), streak }
 * @param props.lifetime 도전 중 지금까지 번 코인
 * @param props.onStart 도전을 시작할 때 호출
 * @param props.onQuit 도전을 그만두고 내 센터로 돌아갈 때 호출
 */
export default function Challenge({ challenge, info, lifetime, onStart, onQuit }) {
  const btn = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700";
  if (!challenge) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <div>
          <p className="text-sm font-extrabold">오늘의 도전 · {info.date}</p>
          <p className="text-xs font-semibold text-slate-700">
            {traitOf(info.type).name}에서 코인 {CHALLENGE_COINS}개로 시작해 {CHALLENGE_SECONDS / 60}분 동안 얼마나 버는지 겨뤄요. 내 센터는 그대로예요.
            {info.record !== null && ` 오늘 기록 ${formatNumber(info.record)}점`}
            {info.streak > 0 && ` · ${info.streak}일 연속`}
          </p>
        </div>
        <button type="button" onClick={onStart} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white">
          도전
        </button>
      </div>
    );
  }
  if (!challenge.done) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400 bg-amber-100 px-4 py-3" role="status">
        <p className="text-sm font-extrabold">
          오늘의 도전 · {traitOf(challenge.type).name} · 남은 시간 {clockText(challenge.left)} · 번 코인 {formatNumber(lifetime)}
        </p>
        <button type="button" onClick={onQuit} className={btn}>
          그만두기
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-400 bg-amber-100 px-4 py-4" role="status">
      <p className="text-lg font-extrabold">오늘의 도전 끝! {formatNumber(challenge.score)}점</p>
      <p className="text-sm font-semibold text-slate-700">
        오늘 기록 {formatNumber(challenge.record)}점 · {challenge.streak}일 연속
        {challenge.record !== challenge.score && " (기록은 오늘 처음 한 판이 남아요)"}
      </p>
      <ShareButton
        title="Zepio Rack Tycoon"
        text={`Zepio Rack Tycoon\n오늘의 도전 ${challenge.date} · ${traitOf(challenge.type).name} · ${formatNumber(challenge.score)}점`}
        path={`/games/${meta.slug}/`}
      />
      <div className="flex gap-2">
        <button type="button" onClick={onStart} className={btn}>
          한 번 더
        </button>
        <button type="button" onClick={onQuit} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white">
          내 센터로 돌아가기
        </button>
      </div>
    </div>
  );
}