import { useEffect, useRef, useState } from "react";
import {
  buyRack,
  COOLERS,
  formatNumber,
  formatRate,
  gradeOf,
  installCost,
  isOpen,
  LIMIT_TEMP,
  POWER_LEVELS,
  repairCost,
  repairRack,
  SAFE_TEMP,
  TIERS,
  unlockCost,
  unlockPad,
  upgradeCooler,
  upgradePower,
} from "./engine.js";

/**
 * 코인이 드는 행동 버튼. 코인이 모자라면 눌러도 동작하지 않고 모자란다는 문구를 보여 준다.
 *
 * @param props.label 버튼 글자
 * @param props.cost 드는 코인
 * @param props.coins 가진 코인
 * @param props.onClick 눌렀을 때 호출
 */
function Action({ label, cost, coins, onClick }) {
  const poor = coins < cost;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-disabled={poor}
        onClick={poor ? undefined : onClick}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white aria-disabled:bg-slate-300 aria-disabled:text-slate-600"
      >
        {label} · {formatNumber(cost)} 코인
      </button>
      {poor && <p className="text-xs font-semibold text-slate-600">코인이 {formatNumber(cost - coins)} 모자라요.</p>}
    </div>
  );
}

/**
 * 온도 상태를 말로 바꾼다.
 *
 * @param temp 온도
 * @returns 상태 문구
 */
function tempLabel(temp) {
  if (temp <= SAFE_TEMP) return "정상";
  if (temp < LIMIT_TEMP) return "열 주의 · 수익 감소";
  return "위험 · 과열 게이지 상승";
}

/**
 * 랙 한 자리의 정보와 설치, 업그레이드, 수리 버튼을 보여 준다.
 *
 * @param props.index 랙 자리 번호
 * @param props.state 게임 상태
 * @param props.analysis analyze 결과
 * @param props.onAct 행동 함수와 인자를 받아 실행한다
 */
function RackBody({ index, state, analysis, onAct }) {
  const rack = state.racks[index];
  if (!isOpen(state, index)) {
    return <p className="text-sm text-slate-700">아직 열리지 않은 자리예요. 단말기에서 새 자리를 열 수 있어요.</p>;
  }
  const next = TIERS[rack.tier + 1];
  const cost = installCost(state, index);
  return (
    <div className="flex flex-col gap-3">
      {rack.tier === 0 ? (
        <p className="text-sm text-slate-700">비어 있는 자리예요. 서버를 놓으면 코인을 벌어요.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="stat-tile !p-2.5">
            <dt className="text-xs text-slate-600">서버</dt>
            <dd className="font-bold">{TIERS[rack.tier].name}</dd>
          </div>
          <div className="stat-tile !p-2.5">
            <dt className="text-xs text-slate-600">수익</dt>
            <dd className="font-bold">{formatRate(analysis.outputs[index])}/초</dd>
          </div>
          <div className="stat-tile col-span-2 !p-2.5">
            <dt className="text-xs text-slate-600">온도 {analysis.temps[index].toFixed(1)}</dt>
            <dd className="font-bold">{rack.broken ? "고장" : tempLabel(analysis.temps[index])}</dd>
          </div>
        </dl>
      )}
      {rack.tier > 0 && !rack.broken && rack.stress > 0.01 && (
        <div>
          <p className="text-xs font-semibold text-slate-700">과열 게이지</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" role="presentation">
            <div className="h-full bg-red-500" style={{ width: `${Math.round(rack.stress * 100)}%` }} />
          </div>
        </div>
      )}
      {rack.broken && (
        <>
          <p className="text-sm font-bold text-red-700">서버가 고장나서 수익이 0이에요. 고쳐야 다시 돌아가요.</p>
          <Action label="수리하기" cost={repairCost(state, index)} coins={state.coins} onClick={() => onAct(repairRack, index)} />
        </>
      )}
      {!rack.broken && next && (
        <>
          <p className="text-xs text-slate-700">
            {next.name}: 수익 {formatRate(next.output)}/초, 열 {next.heat}, 전력 {next.power}
          </p>
          <Action
            label={rack.tier === 0 ? `${next.name} 설치` : `${next.name}로 업그레이드`}
            cost={cost}
            coins={state.coins}
            onClick={() => onAct(buyRack, index)}
          />
        </>
      )}
      {!rack.broken && !next && <p className="text-sm font-bold text-success-strong">가장 높은 단계예요.</p>}
    </div>
  );
}

/**
 * 냉각기 한 자리의 정보와 업그레이드 버튼을 보여 준다.
 *
 * @param props.index 냉각기 자리 번호
 * @param props.state 게임 상태
 * @param props.onAct 행동 함수와 인자를 받아 실행한다
 */
function CoolerBody({ index, state, onAct }) {
  const level = state.coolers[index];
  const next = COOLERS[level + 1];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-700">
        {level
          ? `${COOLERS[level].name}: 주변 ${COOLERS[level].reach}칸 안 랙의 온도를 ${COOLERS[level].cool} 낮춰요. 전력 ${COOLERS[level].power}을 써요.`
          : "비어 있는 자리예요. 냉각기를 놓으면 가까운 랙의 온도가 내려가요."}
      </p>
      {next ? (
        <>
          <p className="text-xs text-slate-700">
            {next.name}: 주변 {next.reach}칸, 온도 -{next.cool}, 전력 {next.power}
          </p>
          <Action label={level ? `${next.name}로 업그레이드` : `${next.name} 설치`} cost={next.cost} coins={state.coins} onClick={() => onAct(upgradeCooler, index)} />
        </>
      ) : (
        <p className="text-sm font-bold text-success-strong">가장 높은 단계예요.</p>
      )}
    </div>
  );
}

/**
 * 사무실 단말기. 전력 설비 업그레이드, 새 랙 자리 열기, 등급 확인, 센터 초기화를 한다.
 *
 * @param props.state 게임 상태
 * @param props.analysis analyze 결과
 * @param props.onAct 행동 함수와 인자를 받아 실행한다
 * @param props.onReset 센터 초기화를 확정했을 때 호출
 */
function TerminalBody({ state, analysis, onAct, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const nextPower = POWER_LEVELS[state.power + 1];
  const grade = gradeOf(state.lifetime);
  const unlock = unlockCost(state);
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="stat-tile !p-2.5">
          <dt className="text-xs text-slate-600">센터 등급</dt>
          <dd className="font-bold">{grade.name}</dd>
        </div>
        <div className="stat-tile !p-2.5">
          <dt className="text-xs text-slate-600">누적 수익</dt>
          <dd className="font-bold">{formatNumber(state.lifetime)}</dd>
        </div>
        <div className="stat-tile col-span-2 !p-2.5">
          <dt className="text-xs text-slate-600">전력 {analysis.usage}/{analysis.cap}</dt>
          <dd className="font-bold">{analysis.efficiency < 1 ? `부족해서 수익이 ${Math.round(analysis.efficiency * 100)}%예요` : "충분해요"}</dd>
        </div>
      </dl>
      {grade.next !== null && <p className="text-xs text-slate-700">다음 등급까지 누적 수익 {formatNumber(grade.next - state.lifetime)} 남았어요.</p>}
      {nextPower ? (
        <Action label={`전력 설비 업그레이드 (상한 ${nextPower.cap})`} cost={nextPower.cost} coins={state.coins} onClick={() => onAct(upgradePower)} />
      ) : (
        <p className="text-sm font-bold text-success-strong">전력 설비가 가장 높은 단계예요.</p>
      )}
      {unlock !== null ? (
        <Action label="새 랙 자리 열기" cost={unlock} coins={state.coins} onClick={() => onAct(unlockPad)} />
      ) : (
        <p className="text-sm font-bold text-success-strong">모든 자리가 열려 있어요.</p>
      )}
      <div className="border-t border-slate-200 pt-3">
        {confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-red-700">모든 진행이 사라져요. 정말 처음부터 다시 할까요?</p>
            <div className="flex gap-2">
              <button type="button" onClick={onReset} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
                초기화
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">
                취소
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="text-xs font-semibold text-slate-600 underline">
            센터 처음부터 다시 하기
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 랙, 냉각기, 단말기 앞에서 여는 작업 창.
 *
 * @param props.target { kind, index } 어디서 작업하는지
 * @param props.state 게임 상태
 * @param props.analysis analyze 결과
 * @param props.onAct 행동 함수와 인자를 받아 실행한다
 * @param props.onClose 닫기를 눌렀을 때 호출
 * @param props.onReset 센터 초기화를 확정했을 때 호출
 */
export default function Panel({ target, state, analysis, onAct, onClose, onReset }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [target.kind, target.index]);
  const title = target.kind === "rack" ? `랙 ${target.index + 1}번 자리` : target.kind === "cooler" ? `냉각기 ${target.index + 1}번 자리` : "사무실 단말기";
  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute right-3 top-3 z-10 w-[min(20rem,calc(100%-1.5rem))] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold">{title}</h3>
        <button ref={closeRef} type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-700">
          닫기 (Esc)
        </button>
      </div>
      {target.kind === "rack" && <RackBody index={target.index} state={state} analysis={analysis} onAct={onAct} />}
      {target.kind === "cooler" && <CoolerBody index={target.index} state={state} onAct={onAct} />}
      {target.kind === "terminal" && <TerminalBody state={state} analysis={analysis} onAct={onAct} onReset={onReset} />}
    </div>
  );
}