import { DIFFICULTIES } from "./engine.js";

const TONES = {
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  bad: "border-red-300 bg-red-50 text-red-900",
};

/**
 * 진행 중인 재난을 알리는 배너. 경고 중이면 남은 시간을, 재난 중이면 상황과 대응 방법을 보여 준다.
 *
 * @param props.event describeEvent 결과
 * @param props.onExtinguish 가까운 불을 끄러 로봇을 보낸다
 */
export function EventBanner({ event, onExtinguish }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${TONES[event.tone]}`} role="alert">
      <div>
        <p className="text-sm font-extrabold">{event.title}</p>
        <p className="mt-0.5 text-sm font-semibold">{event.text}</p>
        {event.phase === "live" && <p className="mt-0.5 text-xs font-semibold opacity-80">남은 시간 {event.left}초</p>}
      </div>
      {event.kind === "fire" && event.phase === "live" && (
        <button type="button" onClick={onExtinguish} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
          가까운 불 끄기
        </button>
      )}
    </div>
  );
}

/**
 * 처음 시작할 때 재난 난이도를 고르는 창. 고르기 전에는 재난이 없는 평화로 돌아간다.
 *
 * @param props.onPick 난이도 id를 받아 정한다
 */
export function DifficultyChooser({ onPick }) {
  return (
    <div
      role="dialog"
      aria-label="재난 난이도 선택"
      className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/85 p-4 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
        <h3 className="text-lg font-extrabold">재난 난이도를 골라 주세요</h3>
        <p className="text-sm text-slate-700">트래픽 폭주, 정전, 화재가 가끔 찾아와요. 위험할수록 수익 배율이 높아요. 단말기에서 언제든 바꿀 수 있어요.</p>
        <div className="flex flex-col gap-2">
          {Object.entries(DIFFICULTIES).map(([id, info]) => (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-left hover:border-primary hover:bg-indigo-50"
            >
              <span className="block text-base font-extrabold">{info.name}</span>
              <span className="block text-xs font-semibold text-slate-600">{info.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}