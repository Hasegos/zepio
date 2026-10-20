import { useEffect, useRef, useState } from "react";
import {
  BASE_POWER,
  DIFFICULTIES,
  expandCost,
  expandLand,
  formatNumber,
  formatRate,
  gradeOf,
  KINDS,
  LIMIT_TEMP,
  refundOf,
  removeItem,
  repairCost,
  SAFE_TEMP,
  synergyNeighbors,
  upgradeCost,
  upgradeItem,
  xyOf,
} from "./engine.js";
import { LANDS } from "./layout.js";

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
 * 이름과 값을 나란히 보여 주는 작은 칸.
 *
 * @param props.label 이름
 * @param props.children 값
 * @param props.wide 두 칸 너비로 보일지
 */
function Stat({ label, children, wide = false }) {
  return (
    <div className={`stat-tile !p-2.5 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="font-bold">{children}</dd>
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
 * 시설 한 칸의 정보와 올리기, 수리, 옮기기, 철거 버튼을 보여 준다.
 *
 * @param props.tile 칸 번호
 * @param props.state 게임 상태
 * @param props.analysis analyze 결과
 * @param props.access 로봇이 닿을 수 있는 시설 칸의 집합
 * @param props.onAct 행동 함수와 인자를 받아 실행한다
 * @param props.onRepair 로봇을 보내 수리할 칸을 알린다
 * @param props.onMove 옮기기를 시작한다
 * @param props.onClose 창을 닫는다
 */
function ItemBody({ tile, state, analysis, access, onAct, onRepair, onMove, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const cell = state.cells[tile];
  if (!cell) return <p className="text-sm text-slate-700">시설이 없어요.</p>;
  const info = KINDS[cell.kind];
  const spec = info.levels[cell.level];
  const next = info.levels[cell.level + 1];
  const refund = refundOf(state, tile);
  const hub = analysis.hubs.find((entry) => entry.tile === tile);
  const linked = analysis.links.filter((link) => link.hub === tile).length;
  const net = analysis.net.get(tile);
  const neighbors = cell.kind === "server" && !cell.broken ? synergyNeighbors(state, tile) : 0;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {cell.kind === "server" && (
          <>
            <Stat label="수익">{cell.broken ? "0 (고장)" : `${formatRate(analysis.outputs[tile])}/초`}</Stat>
            <Stat label={`온도 ${analysis.heat[tile].toFixed(1)}`}>{cell.broken ? "꺼짐" : tempLabel(analysis.heat[tile])}</Stat>
            {!cell.broken && (
              <>
                <Stat label="네트워크">{Math.round(net * 100)}%</Stat>
                <Stat label="붙은 같은 서버">{neighbors}대 · +{neighbors * 6}%</Stat>
              </>
            )}
          </>
        )}
        {cell.kind === "cooler" && (
          <Stat label="냉각" wide>
            반경 {spec.reach}칸 · 바로 옆 -{spec.cool}, 멀수록 약해져요 · 전력 {spec.power}
          </Stat>
        )}
        {cell.kind === "hub" && (
          <>
            <Stat label="대역폭">
              {hub?.used ?? 0}/{spec.cap}
            </Stat>
            <Stat label="연결된 서버">{linked}대</Stat>
            <Stat label="닿는 거리" wide>
              {spec.reach}칸 · 멀수록 효율이 떨어져요 · 전력 {spec.power}
            </Stat>
          </>
        )}
        {cell.kind === "battery" && (
          <Stat label="정전 지원" wide>
            정전 때만 전력 +{spec.cap}
          </Stat>
        )}
        {cell.kind === "ext" && (
          <Stat label="소화" wide>
            반경 {spec.reach}칸 · 불난 지 2초 뒤 자동으로 꺼요
          </Stat>
        )}
        {cell.kind === "gen" && (
          <>
            <Stat label="발전">+{spec.cap}</Stat>
            <Stat label="발열">{spec.heat ? `${spec.heat} (주변 2칸)` : "없음"}</Stat>
          </>
        )}
      </dl>
      {cell.kind === "server" && !cell.broken && cell.stress > 0.01 && (
        <div>
          <p className="text-xs font-semibold text-slate-700">과열 게이지</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" role="presentation">
            <div className="h-full bg-red-500" style={{ width: `${Math.round(cell.stress * 100)}%` }} />
          </div>
        </div>
      )}
      {cell.broken && (
        <>
          <p className="text-sm font-bold text-red-700">서버가 고장나서 수익이 0이에요. 로봇이 가서 고쳐야 해요.</p>
          {!access.has(tile) && <p className="text-xs font-semibold text-red-700">주변이 막혀서 로봇이 닿을 수 없어요. 옆 시설을 옮기거나 철거하세요.</p>}
          <Action label="로봇 보내 수리" cost={repairCost(state, tile)} coins={state.coins} onClick={() => onRepair(tile)} />
        </>
      )}
      {!cell.broken && next && (
        <>
          <p className="text-xs text-slate-700">
            {next.name}
            {cell.kind === "server" && `: 수익 ${formatRate(next.output)}/초, 열 ${next.heat}, 전력 ${next.power}, 대역폭 ${next.demand}`}
            {cell.kind === "cooler" && `: 반경 ${next.reach}칸, 온도 -${next.cool}, 전력 ${next.power}`}
            {cell.kind === "hub" && `: 대역폭 ${next.cap}, 닿는 거리 ${next.reach}칸, 전력 ${next.power}`}
            {cell.kind === "gen" && `: 발전 +${next.cap}, 발열 ${next.heat}`}
            {cell.kind === "battery" && `: 정전 지원 +${next.cap}`}
            {cell.kind === "ext" && `: 반경 ${next.reach}칸`}
          </p>
          <Action label={`${next.name}로 올리기`} cost={upgradeCost(state, tile)} coins={state.coins} onClick={() => onAct(upgradeItem, tile)} />
        </>
      )}
      {!cell.broken && !next && <p className="text-sm font-bold text-success-strong">가장 높은 단계예요.</p>}
      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        <button type="button" onClick={() => onMove(tile)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">
          옮기기
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => {
                onAct(removeItem, tile);
                onClose();
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white"
            >
              정말 철거 (+{formatNumber(refund)})
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">
              취소
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">
            철거 (+{formatNumber(refund)})
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 사무실 단말기. 센터 현황, 부지 넓히기, 점검 알림, 센터 초기화를 한다.
 *
 * @param props.state 게임 상태
 * @param props.analysis analyze 결과
 * @param props.issues diagnose 결과
 * @param props.onAct 행동 함수와 인자를 받아 실행한다
 * @param props.onReset 센터 초기화를 확정했을 때 호출
 * @param props.onDifficulty 난이도 id를 받아 바꾼다
 */
function TerminalBody({ state, analysis, issues, onAct, onReset, onDifficulty }) {
  const [confirming, setConfirming] = useState(false);
  const grade = gradeOf(state.lifetime);
  const cost = expandCost(state);
  const next = LANDS[state.land + 1];
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="센터 등급">{grade.name}</Stat>
        <Stat label="누적 수익">{formatNumber(state.lifetime)}</Stat>
        <Stat label="부지">
          {LANDS[state.land].name} ({LANDS[state.land].w}×{LANDS[state.land].h})
        </Stat>
        <Stat label="시설">
          서버 {analysis.counts.server} · 냉각 {analysis.counts.cooler} · 허브 {analysis.counts.hub} · 발전 {analysis.counts.gen}
        </Stat>
        <Stat label={`전력 ${analysis.usage}/${analysis.cap}`} wide>
          {analysis.efficiency < 1 ? `부족해서 수익이 ${Math.floor(analysis.efficiency * 100)}%예요` : `충분해요 (기본 ${BASE_POWER} + 발전기)`}
        </Stat>
      </dl>
      {grade.next !== null && <p className="text-xs text-slate-700">다음 등급까지 누적 수익 {formatNumber(grade.next - state.lifetime)} 남았어요.</p>}
      {cost !== null ? (
        <>
          <p className="text-xs text-slate-700">
            다음 부지: {next.name} ({next.w}×{next.h})
          </p>
          <Action label="부지 넓히기" cost={cost} coins={state.coins} onClick={() => onAct(expandLand)} />
        </>
      ) : (
        <p className="text-sm font-bold text-success-strong">가장 넓은 부지예요.</p>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-slate-700">재난 난이도</p>
        <div className="flex gap-1.5">
          {Object.entries(DIFFICULTIES).map(([id, info]) => (
            <button
              key={id}
              type="button"
              aria-pressed={state.difficulty === id}
              onClick={() => onDifficulty(id)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white"
            >
              {info.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600">{DIFFICULTIES[state.difficulty ?? "calm"].text}</p>
        <p className="text-xs text-slate-600">
          재난 기록: 폭주 {state.stats.surge} · 정전 {state.stats.blackout} · 화재 {state.stats.fire} (피해 없이 막음 {state.stats.saved})
        </p>
      </div>
      {issues.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {issues.map((issue) => (
            <li key={issue.text} className={`rounded-lg px-3 py-2 text-xs font-semibold ${issue.level === "bad" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
              {issue.text}
            </li>
          ))}
        </ul>
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
 * 시설이나 단말기를 눌렀을 때 여는 작업 창.
 *
 * @param props.target { kind: "item" | "terminal", tile } 무엇을 보는지
 * @param props.state 게임 상태
 * @param props.analysis analyze 결과
 * @param props.access 로봇이 닿을 수 있는 시설 칸의 집합
 * @param props.issues diagnose 결과
 * @param props.onAct 행동 함수와 인자를 받아 실행한다
 * @param props.onRepair 로봇을 보내 수리할 칸을 알린다
 * @param props.onMove 옮기기를 시작한다
 * @param props.onClose 닫기를 눌렀을 때 호출
 * @param props.onReset 센터 초기화를 확정했을 때 호출
 * @param props.onDifficulty 난이도 id를 받아 바꾼다
 */
export default function Panel({ target, state, analysis, access, issues, onAct, onRepair, onMove, onClose, onReset, onDifficulty }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
  }, [target.kind, target.tile]);
  let title = "사무실 단말기";
  if (target.kind === "item") {
    const cell = state.cells[target.tile];
    const [x, y] = xyOf(target.tile);
    title = cell ? `${KINDS[cell.kind].levels[cell.level].name} (${x + 1}, ${y + 1})` : "빈 칸";
  }
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-label={title}
      className="absolute right-3 top-3 z-10 max-h-[calc(100%-1.5rem)] w-[min(20rem,calc(100%-1.5rem))] overflow-y-auto outline-none rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold">{title}</h3>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-700">
          닫기 (Esc)
        </button>
      </div>
      {target.kind === "item" ? (
        <ItemBody
          key={target.tile}
          tile={target.tile}
          state={state}
          analysis={analysis}
          access={access}
          onAct={onAct}
          onRepair={onRepair}
          onMove={onMove}
          onClose={onClose}
        />
      ) : (
        <TerminalBody state={state} analysis={analysis} issues={issues} onAct={onAct} onReset={onReset} onDifficulty={onDifficulty} />
      )}
    </div>
  );
}