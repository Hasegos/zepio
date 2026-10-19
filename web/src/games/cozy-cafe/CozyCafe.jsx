import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getGameData, saveGameData } from "../../lib/storage.js";
import { GOAL, incomePerSecond, stage as stageOf, stationCost, STATIONS } from "./economy.js";
import { formatCoins, formatCompact, formatRate } from "./format.js";
import Icon from "./icons.jsx";
import meta from "./meta.js";
import { AwayDialog, EquipmentPanel, GoalDialog, OperationsPanel, UpgradePanel } from "./Panels.jsx";
import { initialState, reducer } from "./reducer.js";
import Scene from "./Scene.jsx";
import "./cozy-cafe.css";

const TICK_MS = 250;
const AUTOSAVE_MS = 10_000;
const TABS = [{ id: "equipment", label: "건설 · 매니저" }, { id: "upgrade", label: "업그레이드" }];
const STAGE_NAMES = ["작은 카페의 시작", "빵 냄새가 나는 골목", "초록빛 마을 광장", "언덕까지 이어진 마을", "별빛이 모이는 상점 거리"];

/** 저장된 진행 상황을 불러와 오프라인 수익을 한 번 반영한다. */
function loadState() {
  const now = Date.now();
  return reducer(initialState(now), { type: "load", data: getGameData(meta.id), now });
}

/** 다음 미보유 설비 또는 직원의 실제 구매 비용을 안내한다. */
function NextGoal({ econ }) {
  const locked = STATIONS.find((s) => !econ.levels[s.id]);
  const previous = locked ? STATIONS[STATIONS.indexOf(locked)-1] : null;
  const next = locked ? { done: false, label: previous && econ.levels[previous.id]<5 ? `${previous.name} 5레벨 → ${locked.name} 부지 개방` : `${locked.name}을 지어 마을을 넓혀요`, name: previous && econ.levels[previous.id]<5 ? `${previous.name} 증축` : locked.name, cost: previous && econ.levels[previous.id]<5 ? stationCost(previous.id,econ.levels[previous.id]) : stationCost(locked.id,0), icon: locked.id } : null;
  const value = next ? econ.coins : econ.total;
  const target = next?.cost ?? GOAL;
  return (
    <div className="cafe-next">
      <span className="cafe-next-icon"><Icon id={next?.icon ?? "upgrade"} /></span>
      <div className="cafe-next-copy">
        <p className="cafe-eyebrow">{econ.goalAt ? "OUR LITTLE SUCCESS" : "NEXT LITTLE DREAM"}</p>
        <p className="cafe-next-title">{next?.label ?? (econ.goalAt ? "마을의 랜드마크! 계속 성장해요" : "누적 수익 1억, 랜드마크를 향해")}</p>
        <div className="cafe-progress" role="progressbar" aria-label={next?.name ?? "마을의 랜드마크"} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(value, target)}>
          <span style={{ width: `${Math.min(100, value / target * 100)}%` }} />
        </div>
        <p className="cafe-next-detail">{next ? `${next.name} · ${value >= target ? "구매할 수 있어요" : `${formatCoins(Math.ceil(target - value))} 코인 더 모으면 돼요`}` : `누적 ${formatCompact(econ.total)} / 1억 코인`}</p>
      </div>
    </div>
  );
}

/** 숫자는 DOM에서 보간하고 경제 상태와 React 렌더 주기는 바꾸지 않는다. */
function CoinBalance({ value, paused }) {
  const node = useRef(null);
  const shown = useRef(value);
  const firstLabel = useRef(formatCoins(value));
  useEffect(() => {
    const from = shown.current;
    if (paused || !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches || from === value) {
      shown.current = value;
      node.current.textContent = formatCoins(value);
      return;
    }
    let frame;
    const start = performance.now();
    const draw = (now) => {
      const t = Math.min(1, (now - start) / 180);
      shown.current = from + (value - from) * (1 - (1 - t) ** 3);
      node.current.textContent = formatCoins(shown.current);
      if (t < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [value, paused]);
  return <strong ref={node} className="cafe-balance" aria-label={`코인 ${formatCoins(value)}`}>{firstLabel.current}</strong>;
}

/** 카페 운영 화면. 경제와 저장은 기존 리듀서에 위임하고 일시적 시각 효과만 관리한다. */
export default function CozyCafe() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [tab, setTab] = useState("equipment");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [paused, setPaused] = useState(document.visibilityState === "hidden");
  const latest = useRef(state);
  const { econ, sim } = state;
  const growth = stageOf(econ);

  useEffect(() => { latest.current = state; });
  const persist = useCallback(() => saveGameData(meta.id, Date.now(), { ...latest.current.econ, service: latest.current.sim }), []);

  useEffect(() => {
    persist();
    let tick;
    const startTick = () => {
      clearInterval(tick);
      if (document.visibilityState !== "hidden") tick = setInterval(() => dispatch({ type: "tick", now: Date.now() }), TICK_MS);
    };
    startTick();
    const autosave = setInterval(() => { if (document.visibilityState !== "hidden") persist(); }, AUTOSAVE_MS);
    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      setPaused(hidden);
      if (hidden) persist();
      else dispatch({ type: "resume", now: Date.now() });
      startTick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", persist);
    return () => {
      clearInterval(tick);
      clearInterval(autosave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [persist]);

  /** 마을 응원으로 재사용 제한이 있는 생산 보너스를 요청한다. */
  function brew() {
    dispatch({ type: "tap", now: Date.now() });
  }

  /** 게임 안에서 두 번 확인한 초기화 요청을 처리한다. */
  function reset() {
    const now = Date.now();
    dispatch({ type: "reset", now });
    saveGameData(meta.id, now, initialState(now).econ);
    setConfirmReset(false);
    setSettingsOpen(false);
  }

  /** 방향키로 관리 탭과 키보드 초점을 함께 옮긴다. */
  function onTabKey(event) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + step + TABS.length) % TABS.length];
    setTab(next.id);
    document.getElementById(`cafe-tab-${next.id}`)?.focus();
  }

  return (
    <section className="cozy-cafe" data-paused={paused} aria-label="Cozy Cafe 마을 키우기">
      <header className="cafe-topbar">
        <div className="cafe-brand"><span className="cafe-brand-mark"><Icon id="cup" /></span><div><p className="cafe-eyebrow">A TINY TOWN, A BIG LITTLE DREAM</p><h2>Cozy Cafe<span>나의 작은 카페 마을</span></h2></div></div>
        <div className="cafe-wallet"><Icon id="coin" /><div><span className="cafe-wallet-label">마을 금고 · 자동으로 쌓이는 수익</span><CoinBalance value={econ.coins} paused={paused} /></div><span className="cafe-income"><small>자동 생산</small> +{formatRate(incomePerSecond(econ))}<small>/초</small></span></div>
        <button type="button" aria-label="설정" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)} className="cafe-settings-button"><Icon id="settings" /></button>
      </header>
      {settingsOpen && (
        <div className="cafe-settings">
          <h3>마을 설정</h3><p>진행 상황은 이 브라우저에만 저장돼요. 지우면 되돌릴 수 없어요.</p>
          {confirmReset ? <div className="cafe-settings-actions"><button type="button" onClick={reset} className="cafe-danger">정말 지우기</button><button type="button" onClick={() => setConfirmReset(false)}>취소</button></div> : <button type="button" onClick={() => setConfirmReset(true)} className="cafe-danger">저장 초기화</button>}
        </div>
      )}
      <div className="cafe-layout">
        <div className="cafe-play">
          <div className="cafe-scene-heading"><div><span className="cafe-eyebrow">MY GROWING VILLAGE</span><h3>{STAGE_NAMES[growth - 1]}</h3></div><span key={growth} className="cafe-stage"><Icon id="leaf" /> 성장 {growth} / 5</span></div>
          <Scene econ={econ} sim={sim} dispatch={dispatch} />
          <div className="cafe-brew-area"><p>카페 한 채에서 시작한<br /><strong>우리만의 작은 마을</strong></p><button type="button" onClick={brew} className="cafe-brew"><Icon id="leaf" /><span>마을 응원 <small>10초마다 · 5초 생산 보너스</small></span><b>＋</b></button></div>
          <OperationsPanel sim={sim} dispatch={dispatch} />
          <NextGoal econ={econ} />
          <dl className="cafe-stats"><div><dt>누적 수익</dt><dd>{formatCompact(econ.total)}<small> 코인</small></dd></div><div><dt>마을 매니저</dt><dd>{econ.staff}<small> 명</small></dd></div><div><dt>마을 방문</dt><dd>{sim.served}<small> 회 · 자동 저장</small></dd></div></dl>
        </div>
        <aside className="cafe-shop" aria-label="마을 건설 상점">
          <div className="cafe-shop-heading"><p className="cafe-eyebrow">MAKE IT YOURS</p><h3>골목에서 마을로</h3><p>건물 5레벨마다 다음 부지가 열려요.</p></div>
          <div role="tablist" aria-label="카페 관리" className="cafe-tabs">{TABS.map((t) => <button key={t.id} id={`cafe-tab-${t.id}`} role="tab" type="button" aria-selected={tab === t.id} aria-controls="cafe-panel" tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)} onKeyDown={onTabKey}>{t.label}</button>)}</div>
          <div id="cafe-panel" role="tabpanel" aria-labelledby={`cafe-tab-${tab}`}>
            {tab === "equipment" ? <EquipmentPanel econ={econ} dispatch={dispatch} /> : <UpgradePanel econ={econ} dispatch={dispatch} />}
          </div>
          <p role="status" className="cafe-notice">{state.notice ? <span key={state.noticeId}>{state.notice}</span> : "건물을 고르고 증축해 마을을 넓혀 보세요"}</p>
        </aside>
      </div>
      <footer className="cafe-footer"><Icon id="leaf" /><span>잠시 쉬어 가도 괜찮아요. 마을은 최대 8시간 동안 수익을 모아요.</span></footer>
      {state.away && <AwayDialog away={state.away} onClose={() => dispatch({ type: "dismissAway", now: Date.now() })} />}
      {state.goalOpen && !state.away && <GoalDialog econ={econ} onClose={() => dispatch({ type: "closeGoal", now: Date.now() })} />}
    </section>
  );
}
