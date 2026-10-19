import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getGameData, saveGameData } from "../../lib/storage.js";
import { GOAL, incomePerSecond, stage as stageOf, stationCost, staffCost, tapValue } from "./economy.js";
import { formatCoins, formatCompact, formatRate } from "./format.js";
import Icon from "./icons.jsx";
import meta from "./meta.js";
import { AwayDialog, EquipmentPanel, GoalDialog, UpgradePanel } from "./Panels.jsx";
import { initialState, reducer } from "./reducer.js";
import Scene from "./Scene.jsx";
import "./cozy-cafe.css";

const TICK_MS = 250;
const AUTOSAVE_MS = 10_000;
const TABS = [{ id: "equipment", label: "설비 · 직원" }, { id: "upgrade", label: "업그레이드" }];
const STAGE_NAMES = ["작은 시작", "조금 더 풍성하게", "분주한 하루", "동네의 인기 카페", "우리 동네 랜드마크"];

/** 저장된 진행 상황을 불러와 오프라인 수익을 한 번 반영한다. */
function loadState() {
  const now = Date.now();
  return reducer(initialState(now), { type: "load", data: getGameData(meta.id), now });
}

/** 다음 미보유 설비 또는 직원의 실제 구매 비용을 안내한다. */
function NextGoal({ econ }) {
  const goals = [
    { done: econ.levels.espresso > 0, label: "첫 자동 수익을 열어 보세요", name: "에스프레소 머신", cost: stationCost("espresso", 0), icon: "espresso" },
    { done: econ.staff > 0, label: "함께할 바리스타를 맞이해요", name: "첫 직원 고용", cost: staffCost(0), icon: "staff" },
    { done: econ.levels.oven > 0, label: "갓 구운 빵의 향기를 더해요", name: "베이커리 오븐", cost: stationCost("oven", 0), icon: "oven" },
    { done: econ.levels.terrace > 0, label: "햇살 좋은 자리를 준비해요", name: "테라스 좌석", cost: stationCost("terrace", 0), icon: "terrace" },
    { done: econ.levels.beans > 0, label: "한 잔의 깊이를 더해요", name: "프리미엄 원두", cost: stationCost("beans", 0), icon: "beans" },
    { done: econ.levels.marketing > 0, label: "우리 카페를 널리 알려요", name: "브랜드 마케팅", cost: stationCost("marketing", 0), icon: "marketing" },
  ];
  const next = goals.find((goal) => !goal.done);
  const value = next ? econ.coins : econ.total;
  const target = next?.cost ?? GOAL;
  return (
    <div className="cafe-next">
      <span className="cafe-next-icon"><Icon id={next?.icon ?? "upgrade"} /></span>
      <div className="cafe-next-copy">
        <p className="cafe-eyebrow">{econ.goalAt ? "OUR LITTLE SUCCESS" : "NEXT LITTLE DREAM"}</p>
        <p className="cafe-next-title">{next?.label ?? (econ.goalAt ? "체인점 오픈! 계속 성장해요" : "누적 수익 1억, 체인점을 향해")}</p>
        <div className="cafe-progress" role="progressbar" aria-label={next?.name ?? "체인점 오픈"} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(value, target)}>
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
  const [feedback, setFeedback] = useState([]);
  const [paused, setPaused] = useState(document.visibilityState === "hidden");
  const sequence = useRef(0);
  const latest = useRef(state);
  const { econ } = state;
  const growth = stageOf(econ);

  useEffect(() => { latest.current = state; });
  const persist = useCallback(() => saveGameData(meta.id, Date.now(), latest.current.econ), []);

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
      if (hidden) { persist(); setFeedback([]); }
      else dispatch({ type: "tick", now: Date.now() });
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

  useEffect(() => {
    if (!feedback.length) return;
    const timer = setTimeout(() => setFeedback([]), 1000);
    return () => clearTimeout(timer);
  }, [feedback]);

  /** 수익은 기존 액션으로 지급하고 최대 여섯 개의 표시 효과만 남긴다. */
  function brew() {
    dispatch({ type: "tap", now: Date.now() });
    const item = { id: ++sequence.current, value: formatCoins(tapValue(econ)) };
    setFeedback((items) => [...items.slice(-5), item]);
  }

  /** 게임 안에서 두 번 확인한 초기화 요청을 처리한다. */
  function reset() {
    const now = Date.now();
    dispatch({ type: "reset", now });
    saveGameData(meta.id, now, initialState(now).econ);
    setConfirmReset(false);
    setSettingsOpen(false);
    setFeedback([]);
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
    <section className="cozy-cafe" data-paused={paused} aria-label="Cozy Cafe 카페 운영">
      <header className="cafe-topbar">
        <div className="cafe-brand"><span className="cafe-brand-mark"><Icon id="cup" /></span><div><p className="cafe-eyebrow">A LITTLE CUP OF HAPPINESS</p><h2>Cozy Cafe<span>나의 작은 카페</span></h2></div></div>
        <div className="cafe-wallet"><Icon id="coin" /><div><span className="cafe-wallet-label">보유 코인</span><CoinBalance value={econ.coins} paused={paused} /></div><span className="cafe-income">+{formatRate(incomePerSecond(econ))}<small>/초</small></span></div>
        <button type="button" aria-label="설정" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)} className="cafe-settings-button"><Icon id="settings" /></button>
      </header>
      {settingsOpen && (
        <div className="cafe-settings">
          <h3>카페 설정</h3><p>진행 상황은 이 브라우저에만 저장돼요. 지우면 되돌릴 수 없어요.</p>
          {confirmReset ? <div className="cafe-settings-actions"><button type="button" onClick={reset} className="cafe-danger">정말 지우기</button><button type="button" onClick={() => setConfirmReset(false)}>취소</button></div> : <button type="button" onClick={() => setConfirmReset(true)} className="cafe-danger">저장 초기화</button>}
        </div>
      )}
      <div className="cafe-layout">
        <div className="cafe-play">
          <div className="cafe-scene-heading"><div><span className="cafe-eyebrow">MY COZY CORNER</span><h3>{STAGE_NAMES[growth - 1]}</h3></div><span key={growth} className="cafe-stage"><Icon id="leaf" /> 성장 {growth} / 5</span></div>
          <Scene stage={growth} staff={econ.staff} levels={econ.levels} brewing={feedback.length > 0} onBrew={brew} feedback={feedback} purchaseId={state.notice === "코인이 모자라요" ? 0 : state.noticeId} />
          <div className="cafe-brew-area"><p>한 잔의 커피에서 시작되는<br /><strong>작고 포근한 나의 이야기</strong></p><button type="button" onClick={brew} className="cafe-brew"><Icon id="cup" /><span>커피 내리기 <small>직접 내려 더 빠르게 성장해요</small></span><b>+{formatCoins(tapValue(econ))}</b></button></div>
          <NextGoal econ={econ} />
          <dl className="cafe-stats"><div><dt>누적 수익</dt><dd>{formatCompact(econ.total)}<small> 코인</small></dd></div><div><dt>함께하는 직원</dt><dd>{econ.staff}<small> 명</small></dd></div><div><dt>운영 방식</dt><dd className="cafe-save-note">자동 저장 <span>이 브라우저에 보관</span></dd></div></dl>
        </div>
        <aside className="cafe-shop" aria-label="카페 성장 상점">
          <div className="cafe-shop-heading"><p className="cafe-eyebrow">MAKE IT YOURS</p><h3>조금 더, 포근하게</h3><p>작은 변화가 멋진 카페를 만들어요.</p></div>
          <div role="tablist" aria-label="카페 관리" className="cafe-tabs">{TABS.map((t) => <button key={t.id} id={`cafe-tab-${t.id}`} role="tab" type="button" aria-selected={tab === t.id} aria-controls="cafe-panel" tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)} onKeyDown={onTabKey}>{t.label}</button>)}</div>
          <div id="cafe-panel" role="tabpanel" aria-labelledby={`cafe-tab-${tab}`}>
            {tab === "equipment" ? <EquipmentPanel econ={econ} dispatch={dispatch} /> : <UpgradePanel econ={econ} dispatch={dispatch} />}
          </div>
          <p role="status" className="cafe-notice">{state.notice ? <span key={state.noticeId}>{state.notice}</span> : "커피 향처럼, 천천히 자라나는 공간"}</p>
        </aside>
      </div>
      <footer className="cafe-footer"><Icon id="leaf" /><span>잠시 쉬어 가도 괜찮아요. 카페는 최대 8시간 동안 수익을 모아요.</span></footer>
      {state.away && <AwayDialog away={state.away} onClose={() => dispatch({ type: "dismissAway", now: Date.now() })} />}
      {state.goalOpen && !state.away && <GoalDialog econ={econ} onClose={() => dispatch({ type: "closeGoal", now: Date.now() })} />}
    </section>
  );
}
