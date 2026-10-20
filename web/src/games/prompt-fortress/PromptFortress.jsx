import { useEffect, useReducer, useRef } from "react";
import { useGameBack } from "../useGameBack.js";
import { LevelView, Menu } from "./Level.jsx";
import { LEVELS } from "./levels.js";
import { initialState, reducer } from "./reducer.js";

const TICK_MS = 700;

/**
 * 프롬프트 요새 게임 루트. 방 목록과 방 화면을 오가고 시험 재생 시간을 흘려보낸다.
 */
export default function PromptFortress() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const rootRef = useRef(null);
  const { level } = state;
  const replaying = Boolean(level?.run) && level.run.shown < LEVELS.find((l) => l.id === level.id).messages.length;

  useGameBack(state.phase === "menu" ? 0 : 1, () => dispatch({ type: "leave" }));

  useEffect(() => {
    if (!replaying) return undefined;
    const timer = setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => clearInterval(timer);
  }, [replaying]);

  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: "start" });
  }, [state.phase, level?.id]);

  return (
    <section ref={rootRef} className="scroll-mt-2 rounded-2xl bg-white p-3 shadow-sm sm:p-5">
      {state.phase === "menu" ? (
        <>
          <h2 className="mb-3 text-lg font-extrabold text-slate-900">볼트의 요새 · 방 {LEVELS.length}개</h2>
          <Menu state={state} dispatch={dispatch} />
        </>
      ) : (
        <LevelView key={level.id} state={state} dispatch={dispatch} />
      )}
    </section>
  );
}