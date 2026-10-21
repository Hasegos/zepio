import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getGameData, saveGameData, saveResult } from "../../lib/storage.js";
import SoundButton from "../_shared/SoundButton.jsx";
import { useAudio } from "../_shared/useAudio.js";
import { useMuted } from "../_shared/useMuted.js";
import { createAudio } from "./audio.js";
import Battle from "./Battle.jsx";
import Codex from "./Codex.jsx";
import DialogBox from "./DialogBox.jsx";
import Facility from "./Facility.jsx";
import { clearHeld, holdDir, releaseDir } from "./held.js";
import Hud from "./Hud.jsx";
import MapView from "./MapView.jsx";
import meta from "./meta.js";
import { activeGear } from "./party.js";
import { mergeEnding, readData, restore, snapshot } from "./record.js";
import { initialState, reducer } from "./reducer.js";
import Title, { Ending } from "./Title.jsx";
import { MAPS } from "./world.js";
import { useGameBack } from "../_shared/useGameBack.js";

const TRACK = { title: "title", ending: "ending" };

const DEPTH = { title: 0, map: 1, facility: 2, battle: 2, ending: 2 };

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
  useGameBack(DEPTH[state.phase] ?? 0, () => {
    if (state.phase === "facility") dispatch({ type: "leave" });
    else if (state.phase === "map") dispatch({ type: "title" });
    else if (state.phase === "ending" && !state.dialog) dispatch({ type: "resume" });
    else return false;
  });
  const [data, setData] = useState(() => readData(getGameData(meta.id)));
  const [endSaved, setEndSaved] = useState(null);
  const latest = useRef(state);
  latest.current = state;
  const heldRef = useRef([]);
  const endedFor = useRef(null);
  const rootRef = useRef(null);
  const [muted, toggleMuted] = useMuted();
  const audio = useAudio(muted, createAudio);
  const prevView = useRef({ phase: state.phase, map: state.map, x: state.player?.x, y: state.player?.y });

  const onMap = state.phase === "map" || state.phase === "facility";
  const track = TRACK[state.phase] ?? (onMap ? MAPS[state.map].track : state.battle?.kind === "gym" ? "boss" : "battle");
  useEffect(() => {
    audio.music(track);
  }, [audio, track]);

  useEffect(() => {
    const prev = prevView.current;
    const { phase, player } = state;
    if (phase === "battle" && prev.phase !== "battle") audio.sfx("encounter");
    else if (phase === "map" && prev.phase === "map" && state.map !== prev.map) audio.sfx("warp");
    else if (phase === "map" && prev.phase === "map" && (player.x !== prev.x || player.y !== prev.y)) audio.sfx("step");
    prevView.current = { phase, map: state.map, x: player?.x, y: player?.y };
  }, [audio, state.phase, state.player, state.map]);

  const move = useCallback((dir) => dispatch({ type: "move", dir, roll: Math.random() }), []);
  const turn = useCallback((dir) => dispatch({ type: "turn", dir }), []);

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
      } else if (s.phase === "map" && !s.dialog && !s.codex) {
        if (KEY_DIRS[key]) {
          e.preventDefault();
          holdDir(heldRef, KEY_DIRS[key]);
        } else if (ACT_KEYS.includes(key) && !onButton) {
          e.preventDefault();
          dispatch({ type: "interact" });
        }
      } else if (s.phase === "map" && s.codex && key === "Escape") {
        dispatch({ type: "codex" });
      } else if (s.phase === "facility" && key === "Escape") {
        dispatch({ type: "leave" });
      }
    }
    function onKeyUp(e) {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (KEY_DIRS[key]) releaseDir(heldRef, KEY_DIRS[key]);
    }
    const onBlur = () => clearHeld(heldRef);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

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
        <SoundButton muted={muted} onToggle={toggleMuted} className="border-town-ink text-town-ink hover:bg-town-panel" />
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
      {(mapPhase || state.phase === "facility") && (
        <Hud state={state} onTitle={toTitle} onCodex={mapPhase && !state.dialog ? act("select", { type: "codex" }) : undefined} />
      )}
      {mapPhase && state.codex && (
        <div className="mt-3">
          <Codex state={state} onClose={act("select", { type: "codex" })} />
        </div>
      )}
      {mapPhase && !state.codex && (
        <div className="mt-3 flex flex-col gap-3">
          <MapView
            state={state}
            held={heldRef}
            onMove={move}
            onTurn={turn}
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
            onEquip={(id) => {
              sfx("select");
              dispatch({ type: "equip", id });
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
          gear={activeGear(state.gear, state.slots)}
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