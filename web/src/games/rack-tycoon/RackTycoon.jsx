import { useCallback, useEffect, useRef, useState } from "react";
import { getGameData, saveGameData } from "../../lib/storage.js";
import {
  advance,
  analyze,
  COOLERS,
  formatNumber,
  formatRate,
  formatSpan,
  GRADES,
  gradeOf,
  isOpen,
  LIMIT_TEMP,
  MAX_STEP,
  newState,
  offline,
  SAFE_TEMP,
  TIERS,
} from "./engine.js";
import { COOLER_PADS, GRID_HEIGHT, GRID_WIDTH, PADS, START, TERMINAL } from "./layout.js";
import meta from "./meta.js";
import Panel from "./Panel.jsx";
import { makeData, readData, stateFrom } from "./record.js";
import { createScene } from "./scene3d.js";

const TICK_MS = 200;
const SAVE_MS = 10000;
const NOTICE_MS = 6000;
const WELCOME_MIN_SECONDS = 60;
const OFFLINE_THRESHOLD = 3;

/**
 * 센터 상태를 3D 장면이 그릴 모양으로 바꾼다.
 *
 * @param state 게임 상태
 * @param analysis analyze 결과
 * @returns scene.setWorld에 넘길 값
 */
function worldOf(state, analysis) {
  return {
    racks: state.racks.map((rack, i) => ({
      tier: rack.tier,
      broken: rack.broken,
      open: isOpen(state, i),
      heat: Math.min(1, Math.max(0, (analysis.temps[i] - SAFE_TEMP) / (LIMIT_TEMP - SAFE_TEMP))),
    })),
    coolers: [...state.coolers],
  };
}

/**
 * 랙 한 자리를 목록에 보여 줄 한 줄로 요약한다.
 *
 * @param state 게임 상태
 * @param analysis analyze 결과
 * @param i 랙 자리 번호
 * @returns 요약 문구
 */
function rackSummary(state, analysis, i) {
  const rack = state.racks[i];
  if (!isOpen(state, i)) return "잠김";
  if (rack.tier === 0) return "비어 있음";
  if (rack.broken) return `${TIERS[rack.tier].name} · 고장`;
  return `${TIERS[rack.tier].name} · 초당 ${formatRate(analysis.outputs[i])} · 온도 ${analysis.temps[i].toFixed(1)}`;
}

/**
 * 저장된 센터를 읽어 오고, 접속하지 않은 시간이 길면 그동안의 수익을 정산한다.
 *
 * @returns { state, welcome, now } welcome은 정산 안내에 쓸 { gain, seconds }, 안내할 것이 없으면 null
 */
function loadBoot() {
  const data = readData(getGameData(meta.id));
  const now = Date.now();
  let state = stateFrom(data);
  let welcome = null;
  const away = data.savedAt ? (now - data.savedAt) / 1000 : 0;
  if (away >= WELCOME_MIN_SECONDS) {
    const settled = offline(state, away);
    state = settled.state;
    if (settled.gain > 0) welcome = { gain: settled.gain, seconds: settled.seconds };
  }
  return { state, welcome, now };
}

/**
 * Rack Tycoon 화면. 3D 데이터센터 장면 위에 상태 표시줄과 작업 창을 얹고, 200ms마다 시간을 흘려보내며 10초마다 자동 저장한다.
 * WebGL을 쓸 수 없어도 목록으로 같은 작업을 할 수 있다.
 */
export default function RackTycoon() {
  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const noticeTimer = useRef(null);
  const [boot] = useState(loadBoot);
  const stateRef = useRef(boot.state);
  const lastRef = useRef(boot.now);
  const [snap, setSnap] = useState(() => ({ state: boot.state, analysis: analyze(boot.state) }));
  const [panel, setPanel] = useState(null);
  const [notice, setNotice] = useState("");
  const [welcome, setWelcome] = useState(boot.welcome);
  const [noWebgl, setNoWebgl] = useState(false);
  const [coarse] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);

  const refresh = useCallback(() => {
    const state = stateRef.current;
    const analysis = analyze(state);
    setSnap({ state, analysis });
    sceneRef.current?.setWorld(worldOf(state, analysis));
  }, []);

  const save = useCallback(() => {
    if (stateRef.current) saveGameData(meta.id, Date.now(), makeData(stateRef.current, Date.now()));
  }, []);

  const say = useCallback((text) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), NOTICE_MS);
  }, []);

  const act = useCallback(
    (action, ...args) => {
      const result = action(stateRef.current, ...args);
      if (result.error) {
        say(result.error);
        return;
      }
      stateRef.current = result.state;
      refresh();
      save();
    },
    [refresh, save, say],
  );

  const reset = useCallback(() => {
    stateRef.current = newState();
    lastRef.current = Date.now();
    setPanel(null);
    setWelcome(null);
    refresh();
    save();
    document.activeElement?.blur?.();
  }, [refresh, save]);

  const openFromList = useCallback((target) => {
    setPanel(target);
    stageRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    document.activeElement?.blur?.();
  }, []);

  useEffect(() => {
    lastRef.current = Date.now();
    const scene = createScene(stageRef.current, {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      pads: PADS,
      coolerPads: COOLER_PADS,
      terminal: TERMINAL,
      start: START,
      onInteract: (target) => setPanel(target),
    });
    sceneRef.current = scene;
    if (!scene) setNoWebgl(true);
    refresh();

    const tick = setInterval(() => {
      const at = Date.now();
      let dt = (at - lastRef.current) / 1000;
      lastRef.current = at;
      if (dt <= 0) return;
      let current = stateRef.current;
      if (dt > OFFLINE_THRESHOLD) {
        current = offline(current, dt).state;
      } else {
        const broken = [];
        while (dt > 1e-6) {
          const step = Math.min(MAX_STEP, dt);
          const out = advance(current, step);
          current = out.state;
          broken.push(...out.breaks);
          dt -= step;
        }
        if (broken.length) say(`랙 ${broken.map((i) => i + 1).join(", ")}번이 과열로 고장났어요. 가서 고쳐 주세요.`);
      }
      stateRef.current = current;
      refresh();
    }, TICK_MS);
    const autosave = setInterval(save, SAVE_MS);
    const onHide = () => {
      if (document.hidden) save();
    };
    const onKey = (event) => {
      if (event.key === "Escape") closePanel();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    window.addEventListener("keydown", onKey);
    return () => {
      save();
      clearInterval(tick);
      clearInterval(autosave);
      clearTimeout(noticeTimer.current);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("keydown", onKey);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [refresh, save, say, closePanel]);

  const { state, analysis } = snap;
  const grade = gradeOf(state.lifetime);
  const floor = GRADES[grade.index].min;
  const progress = grade.next === null ? 1 : (state.lifetime - floor) / (grade.next - floor);
  const broken = state.racks.filter((rack) => rack.broken).length;

  return (
    <div className="flex flex-col gap-3">
      {coarse && (
        <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900" role="note">
          Rack Tycoon은 PC에서 마우스와 키보드로 하기 좋게 만든 게임이에요. 터치 화면에서도 목록으로 할 수 있지만 PC를 권장해요.
        </p>
      )}
      {welcome && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm" role="status">
          <p className="font-semibold text-indigo-900">
            {formatSpan(welcome.seconds)} 동안 센터가 돌아서 코인 {formatNumber(welcome.gain)}개를 벌었어요.
          </p>
          <button type="button" onClick={() => setWelcome(null)} className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-bold text-indigo-900">
            확인
          </button>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="stat-tile !p-2.5">
          <dt className="text-xs text-slate-600">코인</dt>
          <dd className="text-lg font-extrabold">{formatNumber(state.coins)}</dd>
        </div>
        <div className="stat-tile !p-2.5">
          <dt className="text-xs text-slate-600">초당 수익</dt>
          <dd className="text-lg font-extrabold">{formatRate(analysis.income)}</dd>
        </div>
        <div className="stat-tile !p-2.5">
          <dt className="text-xs text-slate-600">전력 {analysis.usage}/{analysis.cap}</dt>
          <dd className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" role="presentation">
            <div className={`h-full ${analysis.efficiency < 1 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, (analysis.usage / analysis.cap) * 100)}%` }} />
          </dd>
        </div>
        <div className="stat-tile !p-2.5">
          <dt className="text-xs text-slate-600">최고 온도</dt>
          <dd className={`text-lg font-extrabold ${analysis.maxTemp >= LIMIT_TEMP ? "text-red-700" : analysis.maxTemp > SAFE_TEMP ? "text-amber-700" : ""}`}>
            {analysis.maxTemp.toFixed(1)}
          </dd>
        </div>
      </dl>

      <div>
        <p className="text-xs font-semibold text-slate-700">
          {grade.name}
          {grade.next !== null && ` · 다음 등급까지 ${formatNumber(grade.next - state.lifetime)}`}
        </p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" role="presentation">
          <div className="h-full bg-primary" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </div>
      </div>

      <p className="min-h-6 text-sm font-semibold text-red-700" role="status">
        {notice || (broken > 0 ? `고장난 서버 ${broken}대가 있어요.` : "")}
      </p>

      <div className="relative">
        <div ref={stageRef} className="h-[60vh] max-h-[640px] min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-indigo-100" />
        {noWebgl && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-slate-700">
            이 브라우저에서는 3D 화면을 쓸 수 없어요. 아래 목록으로 센터를 관리할 수 있어요.
          </p>
        )}
        {panel && <Panel target={panel} state={state} analysis={analysis} onAct={act} onClose={closePanel} onReset={reset} />}
      </div>
      <p className="text-xs text-slate-600">
        클릭으로 이동하고 랙 · 냉각기 · 단말기를 누르면 그 앞까지 걸어가요. WASD · 방향키로 직접 움직이고, Q/E로 돌리고, 휠로 확대해요. Space나 Enter로 앞의 시설을 열어요.
      </p>

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold">목록으로 관리하기 (로봇 이동 없이 바로 열기)</summary>
        <div className="mt-3 flex flex-col gap-3">
          <button type="button" onClick={() => openFromList({ kind: "terminal", index: 0 })} className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">
            사무실 단말기
          </button>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {PADS.map((_, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => openFromList({ kind: "rack", index: i })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-semibold"
                >
                  랙 {i + 1}번 · {rackSummary(state, analysis, i)}
                </button>
              </li>
            ))}
            {COOLER_PADS.map((_, c) => (
              <li key={`c${c}`}>
                <button
                  type="button"
                  onClick={() => openFromList({ kind: "cooler", index: c })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-semibold"
                >
                  냉각기 {c + 1}번 · {state.coolers[c] ? COOLERS[state.coolers[c]].name : "비어 있음"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}