import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getGameData, saveGameData, saveResult } from "../../lib/storage.js";
import Battle from "./Battle.jsx";
import DialogBox from "./DialogBox.jsx";
import Facility from "./Facility.jsx";
import Hud from "./Hud.jsx";
import MapView, { WALK_MS } from "./MapView.jsx";
import meta from "./meta.js";
import { mergeEnding, readData, restore, snapshot } from "./record.js";
import { initialState, reducer } from "./reducer.js";
import Title, { Ending } from "./Title.jsx";
import { useAudio } from "./useAudio.js";

const TRACK = { title: "title", map: "town", facility: "town", ending: "ending" };

const KEY_DIRS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};
const ACT_KEYS = ["Enter", " ", "z", "e"];

/**
 * Agent Town. 제목, 마을 지도, 대화, 의뢰 전투, 시설, 엔딩을 오가며 진행한다.
 * 이벤트(의뢰 끝, 구매, 쉼, 대화 끝)마다 진행 상황을 저장하고, 엔딩을 보면 기록을 남긴다.
 */
export default function AgentTown() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [data, setData] = useState(() => readData(getGameData(meta.id)));
  const [endSaved, setEndSaved] = useState(null);
  const latest = useRef(state);
  latest.current = state;
  const lastMove = useRef(0);
  const endedFor = useRef(null);
  const rootRef = useRef(null);
  const [muted, setMuted] = useState(() => readData(getGameData(meta.id)).muted);
  const audio = useAudio(muted);
  const prevView = useRef({ phase: state.phase, x: state.player?.x, y: state.player?.y });

  const track = TRACK[state.phase] ?? (state.battle?.kind === "boss" ? "boss" : "battle");
  useEffect(() => {
    audio.music(track);
  }, [audio, track]);

  useEffect(() => {
    const prev = prevView.current;
    const { phase, player } = state;
    if (phase === "battle" && prev.phase !== "battle") audio.sfx("encounter");
    else if (phase === "map" && prev.phase === "map" && (player.x !== prev.x || player.y !== prev.y)) audio.sfx("step");
    prevView.current = { phase, x: player?.x, y: player?.y };
  }, [audio, state.phase, state.player]);

  const toggleMuted = useCallback(() => {
    const next = !muted;
    setMuted(next);
    saveGameData(meta.id, Date.now(), { ...readData(getGameData(meta.id)), muted: next });
  }, [muted]);

  const move = useCallback((dir) => {
    const now = performance.now();
    if (now - lastMove.current < WALK_MS) return;
    lastMove.current = now;
    dispatch({ type: "move", dir, roll: Math.random() });
  }, []);

  const talking = Boolean(state.dialog);
  useEffect(() => {
    if (state.phase === "title") return;
    rootRef.current?.scrollIntoView?.({ block: "start" });
    if (!talking) rootRef.current?.focus({ preventScroll: true });
  }, [state.phase, talking]);

  useEffect(() => {
    const { phase, saveTick } = latest.current;
    if (!saveTick || !["map", "facility"].includes(phase)) return;
    const prev = readData(getGameData(meta.id));
    saveGameData(meta.id, Date.now(), { ...prev, save: snapshot(latest.current) });
  }, [state.saveTick, state.phase]);

  useEffect(() => {
    if (state.phase !== "ending" || endedFor.current === state.ending) return;
    endedFor.current = state.ending;
    const prev = readData(getGameData(meta.id));
    const { saved } = saveResult(meta.id, Date.now(), mergeEnding(prev, state.ending, snapshot(state)));
    setEndSaved(saved);
  }, [state]);

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = latest.current;
      const inGame = !(e.target instanceof Node) || e.target === document.body || rootRef.current?.contains(e.target);
      if (!inGame) return;
      const onButton = e.target instanceof Element && e.target.closest("button, a, input, textarea");
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ((s.phase === "map" || s.phase === "ending") && s.dialog && ACT_KEYS.includes(key)) {
        if (onButton && (key === "Enter" || key === " ")) return;
        e.preventDefault();
        rootRef.current?.querySelector("[data-dialog]")?.click();
      } else if (s.phase === "map" && !s.dialog) {
        if (KEY_DIRS[key]) {
          e.preventDefault();
          move(KEY_DIRS[key]);
        } else if (ACT_KEYS.includes(key) && !onButton) {
          e.preventDefault();
          dispatch({ type: "interact" });
        }
      } else if (s.phase === "facility" && key === "Escape") {
        dispatch({ type: "leave" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const toTitle = useCallback(() => {
    setData(readData(getGameData(meta.id)));
    setEndSaved(null);
    dispatch({ type: "title" });
  }, []);

  const saved = restore(data.save);
  const mapPhase = state.phase === "map";
  const sfx = audio.sfx;
  const act = (name, action) => () => {
    sfx(name);
    dispatch(action);
  };

  return (
    <section ref={rootRef} tabIndex={-1} className="scroll-mt-2 rounded-2xl outline-none bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          aria-pressed={!muted}
          onClick={toggleMuted}
          className="rounded-md border-2 border-town-ink px-2 py-0.5 text-xs font-bold text-town-ink hover:bg-town-panel"
        >
          <span aria-hidden="true">{muted ? "🔇" : "🔊"} </span>소리
        </button>
      </div>
      {state.phase === "title" && (
        <Title
          saved={saved}
          best={data.best}
          onNew={() => {
            sfx("select");
            dispatch({ type: "new", seed: Math.floor(Math.random() * 2 ** 31) });
          }}
          onContinue={() => {
            if (!saved) return;
            sfx("select");
            dispatch({ type: "load", state: saved });
          }}
        />
      )}
      {(mapPhase || state.phase === "facility") && <Hud state={state} onTitle={toTitle} />}
      {mapPhase && (
        <div className="mt-3 flex flex-col gap-3">
          <MapView
            state={state}
            onMove={move}
            onInteract={() => dispatch({ type: "interact" })}
            disabled={Boolean(state.dialog)}
          >
            {state.dialog && <DialogBox dialog={state.dialog} onAdvance={() => dispatch({ type: "advance" })} sfx={sfx} />}
          </MapView>
          <p role="status" className="min-h-6 text-center text-sm font-bold text-town-accent">
            {state.dialog ? "" : state.notice || "풀숲(진한 초록)을 걸으면 의뢰가 나타나요."}
          </p>
        </div>
      )}
      {state.phase === "facility" && (
        <div className="mt-3">
          <Facility
            state={state}
            onBuy={(id) => {
              sfx("coin");
              dispatch({ type: "buy", id });
            }}
            onCompact={act("heal", { type: "compact" })}
            onRest={act("heal", { type: "rest" })}
            onLeave={act("select", { type: "leave" })}
          />
        </div>
      )}
      {state.phase === "battle" && (
        <Battle
          key={`${state.battle.id}`}
          battle={state.battle}
          gear={state.gear}
          party={state.party}
          onMove={(id, arg) => dispatch({ type: "battleMove", id, arg })}
          onClose={act("select", { type: "battleClose" })}
          sfx={sfx}
        />
      )}
      {state.phase === "ending" &&
        (state.dialog ? (
          <DialogBox dialog={state.dialog} onAdvance={() => dispatch({ type: "advance" })} sfx={sfx} />
        ) : (
          <Ending ending={state.ending} saved={endSaved} onResume={() => dispatch({ type: "resume" })} onTitle={toTitle} />
        ))}
    </section>
  );
}