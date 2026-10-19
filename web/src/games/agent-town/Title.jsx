import { useState } from "react";
import ShareButton from "../ShareButton.jsx";
import meta from "./meta.js";
import Sprite from "./Sprite.jsx";
import { townShareText } from "./share-text.js";
import { ALL_TASK_IDS } from "./tasks.js";

const big = "rounded-xl border-4 border-town-ink px-4 py-3 text-base font-extrabold shadow-[0_3px_0_0_#1f1b34] active:translate-y-0.5";

/**
 * 제목 화면. 새 게임과 이어하기를 고른다. 이어 할 기록이 있는데 새로 시작하면 한 번 더 확인한다.
 *
 * @param props.saved 이어 할 게임 상태, 없으면 null
 * @param props.best 엔딩 기록 { endings, codex, trust, disasters }
 */
export default function Title({ saved, best, onNew, onContinue }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border-4 border-town-ink bg-town-ink p-5 text-center text-white">
      <Sprite kind="agent" scale={10} label="주황색 도트 에이전트" />
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Agent Town</h2>
        <p className="mt-1 text-sm font-semibold text-white/90">AI 에이전트가 되어 마을 사람들의 부탁을 해결하는 도트 RPG</p>
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-white/85">
        질문하고, 읽고, 계획하고, 때로는 거절하세요. 서브에이전트와 훅과 CLAUDE.md로 무장하고 팀장 박의 시험에 도전합니다.
      </p>
      {best.endings > 0 && (
        <p className="text-sm font-bold text-amber-300">
          엔딩 {best.endings}회 · 도감 {best.codex}/{ALL_TASK_IDS.length}
        </p>
      )}
      <div className="flex w-full max-w-xs flex-col gap-3">
        {saved && (
          <button type="button" onClick={onContinue} className={`${big} bg-town-accent text-white`}>
            이어하기 · 신뢰 {saved.trust} · 도감 {Object.keys(saved.seen).length}/{ALL_TASK_IDS.length}
          </button>
        )}
        {!confirming ? (
          <button
            type="button"
            onClick={() => (saved ? setConfirming(true) : onNew())}
            className={`${big} ${saved ? "bg-white text-town-ink" : "bg-town-accent text-white"}`}
          >
            새 게임
          </button>
        ) : (
          <div role="alert" className="flex flex-col gap-2 rounded-xl bg-white p-3 text-town-ink">
            <p className="text-sm font-bold">진행 중인 기록이 사라져요. 새로 시작할까요?</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onNew} className={`${big} bg-town-bad text-white`}>
                새로 시작
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={`${big} bg-white text-town-ink`}>
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 엔딩 화면. 한 줄 평과 기록을 보여 주고 공유와 마을 돌아가기를 제공한다.
 *
 * @param props.ending { trust, coins, tasksDone, disasters, steps, codex, title, league }
 * @param props.saved 기록을 저장했는지(false면 경고)
 */
export function Ending({ ending, saved, onResume, onTitle }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border-4 border-town-ink bg-town-panel p-5 text-center text-town-ink">
      <Sprite kind="agent" scale={8} label="주황색 도트 에이전트" />
      <h2 className="text-2xl font-extrabold">{ending.league ? "챔피언 리그 제패!" : "시험 합격!"}</h2>
      <p className="text-sm font-semibold">
        {ending.league ? "챔피언 제피가 당신을 챔피언 에이전트로 인정했어요." : "팀장 박이 당신을 신뢰하는 에이전트로 인정했어요."}
      </p>
      <dl className="grid w-full max-w-xs grid-cols-2 gap-2 text-sm">
        {[
          ["신뢰", ending.trust],
          ["해결한 의뢰", ending.tasksDone],
          ["도감", `${ending.codex}/${ALL_TASK_IDS.length}`],
          ["칭호", ending.title],
          ["사고", `${ending.disasters}회`],
          ["걸음", ending.steps],
          ["코인", ending.coins],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border-2 border-town-ink bg-white p-2">
            <dt className="text-xs font-bold text-town-ink/80">{label}</dt>
            <dd className="text-lg font-extrabold">{value}</dd>
          </div>
        ))}
      </dl>
      {saved === false && (
        <p className="text-sm font-bold text-town-bad">기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.</p>
      )}
      <div className="w-full max-w-xs">
        <ShareButton title="Zepio Agent Town" text={townShareText(ending)} path={`/games/${meta.slug}/`} />
      </div>
      <div className="grid w-full max-w-xs grid-cols-2 gap-2">
        <button type="button" onClick={onResume} className={`${big} bg-town-accent text-white`}>
          마을로 돌아가기
        </button>
        <button type="button" onClick={onTitle} className={`${big} bg-white text-town-ink`}>
          제목으로
        </button>
      </div>
    </div>
  );
}