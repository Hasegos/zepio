import { useCallback, useEffect, useRef, useState } from "react";
import { getGameData, saveGameData } from "../../lib/storage.js";
import {
  accessibleTiles,
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
  NO_FX,
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
import { advanceAll, buySite, campusFx, eachSite, linkCost, linkSites, offlineAll, rebrand, researchItem, spreadEvents, switchSite, viewOf } from "./campus.js";
import Campus from "./Campus.jsx";
import Collection from "./Collection.jsx";
import Research from "./Research.jsx";
import { BADGES, collect, PART_KEYS, setTitle } from "./collection.js";
import { burningTiles, describeEvent, newDisasters, putOut, stepDisasters } from "./disaster.js";
import { describeHover, nextGoal, worldOf } from "./hover.js";
import { GRID_HEIGHT, GRID_WIDTH, inLand, START, TERMINAL, TERMINAL_TILE } from "./layout.js";
import Lists from "./Lists.jsx";
import meta from "./meta.js";
import Panel from "./Panel.jsx";
import { makeData, readData, stateFrom } from "./record.js";
import { createScene } from "./scene3d.js";
import { connectionsOf, traitOf } from "./sites.js";
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
    const settled = offlineAll(state, away);
    state = settled.state;
    if (settled.gain > 0) welcome = { gain: settled.gain, seconds: settled.seconds };
  }
  return { state, welcome, now };
}

/**
 * 건물마다 탭에 보일 수익과 재난 알림을 모은다.
 *
 * @param state 게임 상태
 * @param evs 건물별 재난 진행 상태
 * @param analysis 보고 있는 건물의 analyze 결과
 * @returns { type, income, links, alert } 목록
 */
function campusOf(state, evs, analysis) {
  const fxs = campusFx(state, evs);
  return state.sites.map((_, i) => {
    const view = viewOf(state, i);
    const income = i === state.active ? analysis.income : analyze(view, fxs[i]).income;
    return { type: view.type, income, links: connectionsOf(state.links, view.type), alert: describeEvent(view, evs[i])?.title ?? null };
  });
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
  const evsRef = useRef(null);
  evsRef.current ??= boot.state.sites.map((_, i) => newDisasters(Date.now() + i * 977));
  const lastRef = useRef(boot.now);
  const uiRef = useRef({ tool: "select", overlay: "none", hoverTile: null, panel: null, carried: null, codex: false, research: false });
  const [ui, setUi] = useState(uiRef.current);
  const [snap, setSnap] = useState(() => {
    const analysis = analyze(boot.state);
    const access = accessibleTiles(boot.state, START);
    return {
      state: boot.state,
      analysis,
      access,
      issues: diagnose(boot.state, analysis, access),
      hover: { ghost: null, text: "", tone: "ok" },
      event: null,
      campus: campusOf(boot.state, evsRef.current, analysis),
    };
  });
  const [notice, setNotice] = useState({ text: "", tone: "bad" });
  const [welcome, setWelcome] = useState(boot.welcome);
  const [noWebgl, setNoWebgl] = useState(false);
  const [follow, setFollow] = useState(false);
  const [coarse] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);

  const refresh = useCallback(() => {
    const state = stateRef.current;
    const u = uiRef.current;
    const robot = sceneRef.current?.robotTile() ?? START;
    const ev = evsRef.current[state.active];
    const analysis = analyze(state, campusFx(state, evsRef.current)[state.active]);
    const access = accessibleTiles(state, robot);
    const hover = describeHover({ state, analysis, tool: u.tool, tile: u.hoverTile, carried: u.carried });
    const event = describeEvent(state, ev);
    setSnap({ state, analysis, access, issues: diagnose(state, analysis, access), hover, event, campus: campusOf(state, evsRef.current, analysis) });
    const selected = u.carried ?? (u.panel?.kind === "item" ? u.panel.tile : null);
    const mood = event && event.phase === "live" && event.kind !== "fire" ? event.kind : "none";
    sceneRef.current?.setSpeed(1 + 0.25 * state.robot.speed);
    sceneRef.current?.setWorld(worldOf(state, analysis, { overlay: u.overlay, ghost: hover.ghost, selected, burning: burningTiles(ev), mood }));
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
    evsRef.current = [newDisasters()];
    lastRef.current = Date.now();
    setWelcome(null);
    update({ panel: null, carried: null, tool: "select" });
    save();
    document.activeElement?.blur?.();
  }, [save, update]);

  const doRebrand = useCallback(() => {
    sceneRef.current?.stop();
    if (!act(rebrand)) return;
    evsRef.current = [newDisasters()];
    update({ panel: null, carried: null, tool: "select" });
    say("리브랜딩했어요! 브랜드 포인트로 영구히 더 벌어요.", "good");
  }, [act, say, update]);

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
      const site = stateRef.current.active;
      const done = () => {
        evsRef.current = evsRef.current.map((ev, i) => (i === site ? putOut(ev, tile) : ev));
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
    const lit = burningTiles(evsRef.current[stateRef.current.active]);
    if (!lit.length) return;
    const [rx, ry] = sceneRef.current?.robotTile() ?? START;
    const dist = (tile) => Math.max(Math.abs((tile % GRID_WIDTH) - rx), Math.abs(Math.floor(tile / GRID_WIDTH) - ry));
    extinguish(lit.reduce((best, tile) => (dist(tile) < dist(best) ? tile : best), lit[0]));
  }, [extinguish]);

  const pickDifficulty = useCallback(
    (id) => {
      if (!act(setDifficulty, id)) return;
      evsRef.current = stateRef.current.sites.map((_, i) => newDisasters(Date.now() + i * 977));
      refresh();
    },
    [act, refresh],
  );

  const switchTo = useCallback(
    (index) => {
      sceneRef.current?.stop();
      if (!act(switchSite, index)) return;
      confirmRef.current = { tile: -1, at: 0 };
      update({ panel: null, carried: null });
    },
    [act, update],
  );

  const link = useCallback(
    (a, b) => {
      if (act(linkSites, a, b)) say(`${traitOf(a).name}과 ${traitOf(b).name}을 이었어요!`, "good");
    },
    [act, say],
  );

  const buy = useCallback(
    (type) => {
      const before = evsRef.current;
      evsRef.current = [...before, newDisasters(Date.now() + before.length * 977)];
      if (!act(buySite, type)) {
        evsRef.current = before;
        return;
      }
      sceneRef.current?.stop();
      act(switchSite, stateRef.current.sites.length - 1);
      update({ panel: null, carried: null });
      say(`${traitOf(type).name}을 샀어요! 위 탭에서 건물을 오갈 수 있어요.`, "good");
    },
    [act, say, update],
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
        if (burningTiles(evsRef.current[state.active]).includes(tile)) extinguish(tile);
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
        const settled = offlineAll(current, dt);
        current = settled.state;
        if (settled.gain > 0) setWelcome({ gain: settled.gain, seconds: settled.seconds });
      } else {
        let broken = 0;
        let fixed = 0;
        const live = !document.hidden && dt <= LIVE_GAP;
        while (dt > 1e-6) {
          const step = Math.min(MAX_STEP, dt);
          const fxs = live ? campusFx(current, evsRef.current) : null;
          const out = advanceAll(current, step, (view, i) => fxs?.[i] ?? NO_FX);
          current = out.state;
          broken += out.breaks;
          fixed += out.fixed;
          if (live) {
            const before = evsRef.current;
            const evs = [...before];
            current = eachSite(current, (view, i) => {
              const next = stepDisasters(view, evs[i], step);
              evs[i] = next.ev;
              const prefix = i === current.active ? "" : `${traitOf(view.type).name}: `;
              for (const note of next.notes) say(prefix + note.text, note.tone);
              return next.state;
            });
            evsRef.current = spreadEvents(current, before, evs);
          }
          dt -= step;
        }
        if (broken) say(`서버 ${broken}대가 과열로 고장났어요. 로봇을 보내 고쳐 주세요.`);
        else if (fixed) say(`정비 드론이 서버 ${fixed}대를 고쳤어요.`, "good");
      }
      const got = collect(current);
      if (got.fresh.length) {
        current = got.state;
        say(got.fresh.length > 3 ? `도감과 업적을 ${got.fresh.length}개 새로 얻었어요!` : `새로 얻었어요: ${got.fresh.join(", ")}`, "good");
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
      if (stateRef.current.difficulty === null) return;
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

  const { state, analysis, access, issues, hover, event, campus } = snap;
  const totalIncome = campus.reduce((sum, site) => sum + site.income, 0);
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
          <dd className="text-lg font-extrabold">{formatRate(totalIncome)}</dd>
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
          {state.title && ` · ${BADGES.find((badge) => badge.id === state.title)?.name}`}
          {state.brand.points > 0 && ` · 브랜드 ${state.brand.points}P`}
          {grade.next !== null && ` · 다음 등급까지 ${formatNumber(grade.next - state.lifetime)}`}
        </p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" role="presentation">
          <div className="h-full bg-primary" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </div>
      </div>

      <Campus
        sites={campus}
        active={state.active}
        coins={state.coins}
        links={state.links}
        linkCost={linkCost(state)}
        showBuy={state.lifetime >= 20000 || state.sites.length > 1}
        onSwitch={switchTo}
        onBuy={buy}
        onLink={link}
      />

      {event && <EventBanner event={event} onExtinguish={extinguishNearest} />}

      {!noWebgl && (
        <Toolbar
          tool={ui.tool}
          onTool={pickTool}
          overlay={ui.overlay}
          onOverlay={(overlay) => update({ overlay })}
          state={state}
          onExpand={() => act(expandLand)}
          codexOpen={ui.codex}
          onCodex={() => update({ codex: !uiRef.current.codex })}
          codexCount={`${state.codex.length + state.badges.length}/${PART_KEYS.size + BADGES.length}`}
          researchOpen={ui.research}
          onResearch={() => update({ research: !uiRef.current.research })}
        />
      )}
      {ui.research && <Research state={state} onResearch={(key) => act(researchItem, key)} onClose={() => update({ research: false })} />}
      {ui.codex && <Collection state={state} onTitle={(id) => act(setTitle, id)} onClose={() => update({ codex: false })} />}

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
        {!noWebgl && (
          <div className="absolute bottom-3 left-3 z-10 flex gap-1.5" role="group" aria-label="화면 회전">
            {[
              { label: "왼쪽으로 돌리기 (Q)", step: -1, icon: "↺" },
              { label: "오른쪽으로 돌리기 (E)", step: 1, icon: "↻" },
            ].map(({ label, step, icon }) => (
              <button
                key={step}
                type="button"
                aria-label={label}
                title={label}
                onClick={(event) => {
                  sceneRef.current?.rotate(step);
                  if (event.detail > 0) event.currentTarget.blur();
                }}
                className="h-10 w-10 rounded-full border border-slate-300 bg-white/90 text-xl font-bold text-slate-700 shadow hover:bg-white"
              >
                {icon}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={follow}
              onClick={(event) => {
                const next = !follow;
                setFollow(next);
                sceneRef.current?.setFollow(next);
                if (event.detail > 0) event.currentTarget.blur();
              }}
              className="h-10 rounded-full border border-slate-300 bg-white/90 px-3 text-xs font-bold text-slate-700 shadow hover:bg-white aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white"
            >
              로봇 따라가기
            </button>
            <button
              type="button"
              onClick={(event) => {
                setFollow(false);
                sceneRef.current?.setFollow(false);
                sceneRef.current?.fit();
                if (event.detail > 0) event.currentTarget.blur();
              }}
              className="h-10 rounded-full border border-slate-300 bg-white/90 px-3 text-xs font-bold text-slate-700 shadow hover:bg-white"
            >
              전체 보기
            </button>
          </div>
        )}
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
            onRebrand={doRebrand}
          />
        )}
      </div>
      <p className="text-xs text-slate-600">
        바닥을 누르면 로봇이 걸어가요. 도구(1~6)를 고르면 빈 칸에 설치하고, 끌면서 여러 칸에 놓을 수 있어요. H는 열지도, N은 네트워크, M은 옮기기, X는 철거, Esc나 오른쪽 클릭은 취소예요. WASD로 직접 움직이고 휠로 확대해요. Shift를 누른 채 끌거나 휠 버튼으로 끌면 화면을 옮기고, 시설에 가려 안 보이는 칸은 화면 왼쪽 아래 버튼이나 Q/E로 돌려서 보세요.
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