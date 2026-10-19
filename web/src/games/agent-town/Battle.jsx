import { useState } from "react";
import { availableMoves, CONTEXT_CAP, USAGE_CAP } from "./battle.js";
import { Bar } from "./Hud.jsx";
import Sprite from "./Sprite.jsx";
import { npcsFor } from "./world.js";

const HINT = {
  ask: "모호한 점을 묻는다",
  read: "코드를 읽는다",
  plan: "일을 단계로 나눈다",
  edit: "코드를 고친다",
  test: "테스트를 돌린다",
  summon: "동료를 부른다",
  refuse: "의뢰를 거절한다",
};

const ENDINGS = {
  win: { title: "의뢰 완료!", tone: "text-town-good" },
  refuse: { title: "현명한 거절!", tone: "text-town-good" },
  leave: { title: "의뢰 실패", tone: "text-town-warn" },
  disaster: { title: "사고 발생!", tone: "text-town-bad" },
  limit: { title: "사용량 한도!", tone: "text-town-warn" },
};

/**
 * 지금까지 알아낸 것을 칩으로 보여 준다. 모르는 것은 보여 주지 않는다.
 *
 * @param b 전투 상태
 * @returns 알아낸 사실 문구 목록
 */
function learned(b) {
  const t = b.task;
  const out = [];
  if (t.ambiguous && b.clarified) out.push("요구 확인");
  if (t.locate && b.located) out.push("위치 파악");
  if (t.big && b.planned) out.push("계획 수립");
  if (t.danger && b.safe) out.push("위험 해소");
  if (t.injection && b.revealed) out.push("숨은 지시 발견");
  if (b.bugs > 0) out.push("버그 의심");
  return out;
}

/**
 * 의뢰 전투 화면. 의뢰인의 인내심과 진행도, 내 사용량과 컨텍스트를 보여 주고 기술을 고르게 한다.
 *
 * @param props.battle { b, kind, id }
 * @param props.gear 가진 장비
 * @param props.party 동료 식별자 목록
 */
export default function Battle({ battle, gear, party, onMove, onClose }) {
  const { b, kind, id } = battle;
  const [summonOpen, setSummonOpen] = useState(false);
  const task = b.task;
  const moves = availableMoves(b, gear, party);
  const npc = kind === "trainer" ? npcsFor(0).find((n) => n.id === id) : null;
  const chips = learned(b);
  const done = b.done && ENDINGS[b.done.kind];
  const tag = kind === "boss" ? "보스 의뢰" : kind === "trainer" ? "트레이너 의뢰" : "야생 의뢰";

  function pick(move) {
    if (move.id === "summon") {
      setSummonOpen((open) => !open);
      return;
    }
    setSummonOpen(false);
    onMove(move.id);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border-4 border-town-ink bg-[#cfe8c4] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 rounded-lg border-2 border-town-ink bg-town-ink p-2 text-white">
          <p className="text-xs font-bold text-amber-300">
            {tag}
            {task.urgent && " · 급함"}
          </p>
          <h2 className="text-lg font-extrabold leading-tight">{task.name}</h2>
          <div className="mt-1 flex flex-col gap-1.5">
            <Bar label="인내심" value={b.patience} max={task.patience} mode="left" />
            <Bar label="진행도" value={Math.min(b.progress, task.goal)} max={task.goal} mode="left" />
          </div>
          <ul aria-label="알아낸 것" className="mt-1.5 flex min-h-6 flex-wrap gap-1">
            {chips.map((chip) => (
              <li key={chip} className="rounded bg-white px-1.5 py-0.5 text-xs font-bold text-town-ink">
                {chip}
              </li>
            ))}
          </ul>
        </div>
        {npc ? (
          <Sprite kind="npc" npc={npc} scale={5} label={`${npc.name}`} />
        ) : (
          <Sprite kind="request" task={task} scale={5} label="의뢰 몬스터" />
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <Sprite kind="agent" dir="up" scale={5} label="나(에이전트)" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border-2 border-town-ink bg-town-ink p-2">
          <Bar label="사용량" value={b.usage} max={USAGE_CAP} />
          <Bar label="컨텍스트" value={Math.min(b.context, CONTEXT_CAP)} max={CONTEXT_CAP} />
        </div>
      </div>

      <div
        aria-live="polite"
        className="flex min-h-20 flex-col justify-center gap-1 rounded-xl border-4 border-town-ink bg-town-panel p-3 text-sm font-semibold leading-snug text-town-ink"
      >
        {b.lines.map((line, i) => (
          <p key={`${i}-${line}`}>{line}</p>
        ))}
      </div>

      {b.done ? (
        <div className="flex flex-col gap-2 rounded-xl border-4 border-town-ink bg-white p-3 text-center text-town-ink">
          <p className={`text-xl font-extrabold ${done.tone}`}>{done.title}</p>
          <p className="text-sm font-bold">
            코인 {b.done.coins >= 0 ? "+" : ""}
            {b.done.coins} · 신뢰 {b.done.trust >= 0 ? "+" : ""}
            {b.done.trust}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-4 border-town-ink bg-town-accent px-4 py-2.5 text-base font-extrabold text-white shadow-[0_3px_0_0_#1f1b34]"
          >
            계속
          </button>
        </div>
      ) : (
        <>
          <div role="group" aria-label="기술" className="grid grid-cols-2 gap-2">
            {moves.map((move) => (
              <button
                key={move.id}
                type="button"
                disabled={!move.enabled}
                aria-expanded={move.id === "summon" ? summonOpen : undefined}
                onClick={() => pick(move)}
                className="flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-lg last:odd:col-span-2 border-4 border-town-ink bg-white px-3 py-1.5 text-left text-town-ink shadow-[0_3px_0_0_#1f1b34] enabled:hover:bg-town-panel enabled:active:translate-y-0.5 disabled:opacity-50"
              >
                <span className="text-sm font-extrabold">{move.label}</span>
                <span className="break-keep text-xs font-semibold text-town-ink/80">
                  <span className="mr-1 rounded bg-town-ink px-1 py-0.5 text-white">{move.cost ? `사용량 ${move.cost}` : "무료"}</span>
                  {HINT[move.id]}
                </span>
              </button>
            ))}
          </div>
          {summonOpen && (
            <div role="group" aria-label="서브에이전트" className="grid gap-2 rounded-xl border-4 border-dashed border-town-ink bg-town-panel p-2">
              {moves
                .find((m) => m.id === "summon")
                .members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    disabled={member.used}
                    onClick={() => {
                      setSummonOpen(false);
                      onMove("summon", member.id);
                    }}
                    className="flex items-center justify-between gap-2 rounded-lg border-2 border-town-ink bg-white px-3 py-2 text-left text-sm font-bold text-town-ink disabled:opacity-50"
                  >
                    <span>
                      {member.name} <span className="font-semibold text-town-ink/80">· {member.role}</span>
                    </span>
                    <span className="text-xs">{member.used ? "이미 불렀다" : "사용량 3"}</span>
                  </button>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}