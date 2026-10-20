import { useCallback, useEffect, useRef, useState } from "react";
import { getGameData, saveGameData } from "../../lib/storage.js";
import {
  accessibleTiles,
  advance,
  analyze,
  diagnose,
  expandLand,
  formatNumber,
  formatRate,
  formatSpan,
  GRADES,
  gradeOf,
  LIMIT_TEMP,
  MAX_STEP,
  moveItem,
  newState,
  offline,
  placeItem,
  refundOf,
  removeItem,
  repairItem,
  SAFE_TEMP,
  setDifficulty,
  upgradeItem,
  xyOf,
} from "./engine.js";
import { EventBanner, DifficultyChooser } from "./Banner.jsx";
import { burningTiles, describeEvent, effectsOf, newDisasters, putOut, stepDisasters } from "./disaster.js";
import { describeHover, nextGoal, worldOf } from "./hover.js";
import { GRID_HEIGHT, GRID_WIDTH, inLand, START, TERMINAL, TERMINAL_TILE } from "./layout.js";
import Lists from "./Lists.jsx";
import meta from "./meta.js";
import Panel from "./Panel.jsx";
import { makeData, readData, stateFrom } from "./record.js";
import { createScene } from "./scene3d.js";
import Toolbar from "./Toolbar.jsx";

const TICK_MS = 200;
const SAVE_MS = 10000;
const NOTICE_MS = 6000;
const CONFIRM_MS = 3000;
const CONFIRM_REFUND = 500;
const WELCOME_MIN_SECONDS = 60;
const OFFLINE_THRESHOLD = 600;
const PLACE_TOOLS = ["server", "cooler", "hub", "gen", "battery", "ext"];
const LIVE_GAP = 5;
const KEY_TOOLS = { Digit1: "server", Digit2: "cooler", Digit3: "hub", Digit4: "gen", Digit5: "battery", Digit6: "ext", KeyM: "move", KeyX: "remove" };
const KEY_OVERLAYS = { KeyH: "heat", KeyN: "net" };
const TONES = { ok: "text-slate-700", poor: "text-slate-500", bad: "text-red-700" };

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
 * Rack Tycoon 화면. 빈 부지에 서버, 냉각기, 허브, 발전기를 마음대로 놓아 데이터센터를 키운다.
 * 3D 장면 위에 도구 모음, 상태 표시줄, 작업 창을 얹고, 200ms마다 시간을 흘려보내며 10초마다 자동 저장한다.
 * WebGL을 쓸 수 없어도 목록으로 같은 작업을 할 수 있다.
 */
export default function RackTycoon() {
  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const noticeTimer = useRef(null);
  const confirmRef = useRef({ tile: -1, at: 0 });
  const [boot] = useState(loadBoot);
  const stateRef = useRef(boot.state);
  const evRef = useRef(null);
  evRef.current ??= newDisasters();
  const lastRef = useRef(boot.now);
  const uiRef = useRef({ tool: "select", overlay: "none", hoverTile: null, panel: null, carried: null });
  const [ui, setUi] = useState(uiRef.current);
  const [snap, setSnap] = useState(() => {
    const analysis = analyze(boot.state);
    const access = accessibleTiles(boot.state, START);
    return { state: boot.state, analysis, access, issues: diagnose(boot.state, analysis, access), hover: { ghost: null, text: "", tone: "ok" }, event: null };
  });
  const [notice, setNotice] = useState({ text: "", tone: "bad" });
  const [welcome, setWelcome] = useState(boot.welcome);
  const [noWebgl, setNoWebgl] = useState(false);
  const [coarse] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);

  const refresh = useCallback(() => {
    const state = stateRef.current;
    const u = uiRef.current;
    const robot = sceneRef.current?.robotTile() ?? START;
    const fx = effectsOf(state, evRef.current);
    const analysis = analyze(state, fx);
    const access = accessibleTiles(state, robot);
    const hover = describeHover({ state, analysis, tool: u.tool, tile: u.hoverTile, carried: u.carried });
    const event = describeEvent(state, evRef.current);
    setSnap({ state, analysis, access, issues: diagnose(state, analysis, access), hover, event });
    const selected = u.carried ?? (u.panel?.kind === "item" ? u.panel.tile : null);
    const mood = event && event.phase === "live" && event.kind !== "fire" ? event.kind : "none";
    sceneRef.current?.setWorld(worldOf(state, analysis, { overlay: u.overlay, ghost: hover.ghost, selected, burning: burningTiles(evRef.current), mood }));
  }, []);

  const update = useCallback(
    (patch) => {
      uiRef.current = { ...uiRef.current, ...patch };
      setUi(uiRef.current);
      refresh();
    },
    [refresh],
  );

  const save = useCallback(() => {
    if (stateRef.current) saveGameData(meta.id, Date.now(), makeData(stateRef.current, lastRef.current));
  }, []);

  const say = useCallback((text, tone = "bad") => {
    setNotice({ text, tone });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice({ text: "", tone }), NOTICE_MS);
  }, []);

  const act = useCallback(
    (action, ...args) => {
      const result = action(stateRef.current, ...args);
      if (result.error) {
        say(result.error);
        return false;
      }
      stateRef.current = result.state;
      refresh();
      save();
      return true;
    },
    [refresh, save, say],
  );

  const reset = useCallback(() => {
    stateRef.current = newState();
    evRef.current = newDisasters();
    lastRef.current = Date.now();
    setWelcome(null);
    update({ panel: null, carried: null, tool: "select" });
    save();
    document.activeElement?.blur?.();
  }, [save, update]);

  const closePanel = useCallback(() => {
    update({ panel: null });
    document.activeElement?.blur?.();
  }, [update]);

  const cancel = useCallback(() => {
    const u = uiRef.current;
    if (u.panel) closePanel();
    else if (u.carried !== null) update({ carried: null });
    else if (u.tool !== "select") update({ tool: "select" });
  }, [closePanel, update]);

  const pickTool = useCallback(
    (tool) => {
      confirmRef.current = { tile: -1, at: 0 };
      update({ tool, carried: null, panel: null });
    },
    [update],
  );

  const sendRepair = useCallback(
    (tile) => {
      const scene = sceneRef.current;
      const robot = scene?.robotTile() ?? START;
      if (!accessibleTiles(stateRef.current, robot).has(tile)) {
        say("로봇이 닿을 수 없어요. 주변 통로를 열어 주세요.");
        return;
      }
      const fix = () => act(repairItem, tile, sceneRef.current?.robotTile() ?? START);
      if (!scene) fix();
      else if (scene.walkBeside(tile, fix)) say("로봇이 수리하러 가요.");
      else say("로봇이 닿을 수 없어요. 주변 통로를 열어 주세요.");
    },
    [act, say],
  );

  const extinguish = useCallback(
    (tile) => {
      const scene = sceneRef.current;
      const done = () => {
        evRef.current = putOut(evRef.current, tile);
        say("불을 껐어요!", "good");
        refresh();
      };
      if (!scene) done();
      else if (scene.walkBeside(tile, done)) say("로봇이 불을 끄러 가요.", "good");
      else say("로봇이 닿을 수 없어요. 주변 통로를 열어 주세요.");
    },
    [refresh, say],
  );

  const extinguishNearest = useCallback(() => {
    const lit = burningTiles(evRef.current);
    if (!lit.length) return;
    const [rx, ry] = sceneRef.current?.robotTile() ?? START;
    const dist = (tile) => Math.max(Math.abs((tile % GRID_WIDTH) - rx), Math.abs(Math.floor(tile / GRID_WIDTH) - ry));
    extinguish(lit.reduce((best, tile) => (dist(tile) < dist(best) ? tile : best), lit[0]));
  }, [extinguish]);

  const pickDifficulty = useCallback(
    (id) => {
      if (!act(setDifficulty, id)) return;
      evRef.current = newDisasters();
      refresh();
    },
    [act, refresh],
  );

  const startMove = useCallback(
    (tile) => update({ tool: "move", carried: tile, panel: null }),
    [update],
  );

  const handleTile = useCallback(
    ({ tile, drag }) => {
      const u = uiRef.current;
      const state = stateRef.current;
      const cell = state.cells[tile];
      const [x, y] = xyOf(tile);
      if (tile === TERMINAL_TILE) {
        if (drag) return;
        if (u.tool !== "select") {
          say("단말기 자리예요.");
          return;
        }
        const open = () => update({ panel: { kind: "terminal", tile } });
        if (!sceneRef.current?.walkBeside(tile, open)) open();
        return;
      }
      if (u.tool === "select") {
        if (drag) return;
        if (burningTiles(evRef.current).includes(tile)) extinguish(tile);
        else if (cell) update({ panel: { kind: "item", tile } });
        else if (inLand(state.land, x, y)) {
          if (sceneRef.current && !sceneRef.current.walkTo(tile)) say("로봇이 그 칸에 닿을 수 없어요.");
        }
        else say("아직 넓히지 않은 땅이에요. 단말기에서 부지를 넓히세요.");
      } else if (PLACE_TOOLS.includes(u.tool)) {
        if (!cell) act(placeItem, tile, u.tool);
        else if (!drag && cell.kind === u.tool) act(upgradeItem, tile);
        else if (!drag) say("이미 시설이 있어요.");
      } else if (u.tool === "remove") {
        if (!cell || drag) return;
        const now = Date.now();
        const refund = refundOf(state, tile);
        if (refund >= CONFIRM_REFUND && !(confirmRef.current.tile === tile && now - confirmRef.current.at < CONFIRM_MS)) {
          confirmRef.current = { tile, at: now };
          say(`비싼 시설이에요. 한 번 더 누르면 철거해요 (+${formatNumber(refund)}).`);
          return;
        }
        confirmRef.current = { tile: -1, at: 0 };
        act(removeItem, tile);
      } else if (u.tool === "move") {
        if (drag) return;
        if (u.carried === null) {
          if (cell) update({ carried: tile });
        } else if (cell) {
          update({ carried: tile === u.carried ? null : tile });
        } else if (act(moveItem, u.carried, tile)) {
          update({ carried: null });
        }
      }
    },
    [act, extinguish, say, update],
  );

  useEffect(() => {
    lastRef.current = Date.now();
    const scene = createScene(stageRef.current, {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      terminal: TERMINAL,
      start: START,
      onTile: handleTile,
      onHover: (tile) => update({ hoverTile: tile }),
      onInteract: (tile) => update({ panel: tile === TERMINAL_TILE ? { kind: "terminal", tile } : { kind: "item", tile } }),
      onCancel: cancel,
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
        const settled = offline(current, dt);
        current = settled.state;
        if (settled.gain > 0) setWelcome({ gain: settled.gain, seconds: settled.seconds });
      } else {
        const broken = [];
        const live = !document.hidden && dt <= LIVE_GAP;
        while (dt > 1e-6) {
          const step = Math.min(MAX_STEP, dt);
          const out = advance(current, step, effectsOf(current, evRef.current));
          current = out.state;
          broken.push(...out.breaks);
          if (live) {
            const next = stepDisasters(current, evRef.current, step);
            current = next.state;
            evRef.current = next.ev;
            for (const note of next.notes) say(note.text, note.tone);
          }
          dt -= step;
        }
        if (broken.length) say(`서버 ${broken.length}대가 과열로 고장났어요. 로봇을 보내 고쳐 주세요.`);
      }
      stateRef.current = current;
      refresh();
    }, TICK_MS);
    const autosave = setInterval(save, SAVE_MS);
    const onHide = () => {
      if (document.hidden) save();
    };
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Escape") {
        cancel();
        return;
      }
      if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
      if (KEY_TOOLS[event.code]) pickTool(KEY_TOOLS[event.code]);
      else if (KEY_OVERLAYS[event.code]) update({ overlay: uiRef.current.overlay === KEY_OVERLAYS[event.code] ? "none" : KEY_OVERLAYS[event.code] });
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
  }, [refresh, save, say, update, cancel, pickTool, handleTile]);


  const { state, analysis, access, issues, hover, event } = snap;
  const grade = gradeOf(state.lifetime);
  const floor = GRADES[grade.index].min;
  const progress = grade.next === null ? 1 : (state.lifetime - floor) / (grade.next - floor);
  const alerts = issues.slice(0, 2);
  const hint = hover.text || nextGoal(state, analysis);
  const hot = analysis.maxTemp >= LIMIT_TEMP ? "text-red-700" : analysis.maxTemp > SAFE_TEMP ? "text-amber-700" : "";
  const carriedName = ui.carried !== null && state.cells[ui.carried] ? "옮길 곳을 누르세요" : "";

  return (
    <div className="flex flex-col gap-3">
      {coarse && (
        <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900" role="note">
          Rack Tycoon은 PC에서 마우스와 키보드로 하기 좋게 만든 게임이에요. 터치 화면에서도 할 수 있지만 PC를 권장해요.
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
          <dt className="text-xs text-slate-600">
            전력 {analysis.usage}/{analysis.cap}
          </dt>
          <dd className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" role="presentation">
            <div className={`h-full ${analysis.efficiency < 1 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, (analysis.usage / analysis.cap) * 100)}%` }} />
          </dd>
        </div>
        <div className="stat-tile !p-2.5">
          <dt className="text-xs text-slate-600">최고 온도</dt>
          <dd className={`text-lg font-extrabold ${hot}`}>{analysis.maxTemp.toFixed(1)}</dd>
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

      {event && <EventBanner event={event} onExtinguish={extinguishNearest} />}

      {!noWebgl && <Toolbar tool={ui.tool} onTool={pickTool} overlay={ui.overlay} onOverlay={(overlay) => update({ overlay })} state={state} onExpand={() => act(expandLand)} />}

      <p className={`min-h-5 text-sm font-semibold ${TONES[hover.text ? hover.tone : "ok"]}`}>{carriedName || hint}</p>
      <div className="min-h-6" role="status">
        {notice.text ? (
          <p className={`text-sm font-semibold ${notice.tone === "good" ? "text-emerald-700" : "text-red-700"}`}>{notice.text}</p>
        ) : (
          alerts.map((issue) => (
            <p key={issue.text} className={`text-sm font-semibold ${issue.level === "bad" ? "text-red-700" : "text-amber-800"}`}>
              {issue.text}
            </p>
          ))
        )}
      </div>

      <div className="relative">
        <div ref={stageRef} className="h-[62vh] max-h-[680px] min-h-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-indigo-100" />
        {noWebgl && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-slate-700">
            이 브라우저에서는 3D 화면을 쓸 수 없어요. 아래 목록에서 좌표로 시설을 설치하고 관리할 수 있어요.
          </p>
        )}
        {state.difficulty === null && <DifficultyChooser onPick={pickDifficulty} />}
        {ui.panel && (
          <Panel
            target={ui.panel}
            state={state}
            analysis={analysis}
            access={access}
            issues={issues}
            onAct={act}
            onRepair={sendRepair}
            onMove={startMove}
            onClose={closePanel}
            onReset={reset}
            onDifficulty={pickDifficulty}
          />
        )}
      </div>
      <p className="text-xs text-slate-600">
        바닥을 누르면 로봇이 걸어가요. 도구(1~6)를 고르면 빈 칸에 설치하고, 끌면서 여러 칸에 놓을 수 있어요. H는 열지도, N은 네트워크, M은 옮기기, X는 철거, Esc나 오른쪽 클릭은 취소예요. WASD로 직접 움직이고 Q/E로 돌리고 휠로 확대해요.
      </p>

      <Lists
        state={state}
        analysis={analysis}
        onOpen={(tile) => update({ panel: { kind: "item", tile } })}
        onTerminal={() => update({ panel: { kind: "terminal", tile: TERMINAL_TILE } })}
        onPlace={(kind, tile) => act(placeItem, tile, kind)}
      />
    </div>
  );
}