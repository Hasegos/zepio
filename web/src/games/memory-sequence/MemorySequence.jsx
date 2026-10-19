import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getGameData, saveResult } from "../../lib/storage.js";
import meta from "./meta.js";
import Pads from "./Pads.jsx";
import { mergeResult } from "./record.js";
import Result from "./Result.jsx";
import { initialState, MAX_ROUND, PAD_COUNT, reducer, START_LENGTH, timing } from "./reducer.js";
import { useGameBack } from "../useGameBack.js";

const SHOW_DELAY = 700;

/**
 * 무작위 패드 번호(0부터)를 하나 고른다.
 *
 * @returns 0 이상 PAD_COUNT 미만의 정수
 */
function randomPad() {
  return Math.floor(Math.random() * PAD_COUNT);
}

/**
 * Memory Sequence 한 판을 진행한다. 시작 화면, 순서 보기, 따라 누르기, 결과 화면을 오간다.
 * 순서를 보는 동안 켜진 패드는 타이머로 바꾸고, 화면에서 사라지면 타이머를 모두 해제한다.
 * 키보드 1~9 키로도 패드를 누를 수 있다.
 */
export default function MemorySequence() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useGameBack(state.phase === "intro" ? 0 : 1, () => dispatch({ type: "back" }));
  const [lit, setLit] = useState(null);
  const [record, setRecord] = useState(null);
  const headingRef = useRef(null);
  const { phase, sequence, round, inputIndex } = state;
  const playing = phase === "showing" || phase === "input";

  useEffect(() => {
    if (state.phase !== "result") return;
    const outcome = mergeResult(getGameData(meta.id), {
      cleared: state.cleared,
      ms: state.finishedAt - state.startedAt,
    });
    saveResult(meta.id, state.finishedAt, outcome.data);
    setRecord(outcome);
  }, [state]);

  const start = useCallback(() => {
    setRecord(null);
    dispatch({ type: "start", pads: Array.from({ length: START_LENGTH }, randomPad), now: Date.now() });
  }, []);

  const press = useCallback((pad) => {
    dispatch({ type: "press", pad, next: randomPad(), now: Date.now() });
  }, []);

  useEffect(() => {
    if (phase !== "showing") return undefined;
    const { on, gap } = timing(round);
    const timers = [];
    let index = 0;
    function step() {
      if (index >= sequence.length) {
        dispatch({ type: "showDone" });
        return;
      }
      setLit(sequence[index]);
      timers.push(
        setTimeout(() => {
          setLit(null);
          index += 1;
          timers.push(setTimeout(step, gap));
        }, on),
      );
    }
    timers.push(setTimeout(step, SHOW_DELAY));
    return () => {
      timers.forEach(clearTimeout);
      setLit(null);
    };
  }, [phase, sequence, round]);

  useEffect(() => {
    if (phase !== "input") return undefined;
    function onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= PAD_COUNT) press(number - 1);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, press]);

  useEffect(() => {
    if (playing) headingRef.current?.focus({ preventScroll: true });
  }, [playing, round]);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      {phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">불이 켜지는 순서를 기억하세요</h2>
          <p className="text-slate-600">
            최대 {MAX_ROUND}라운드 · {meta.estimatedPlayTime}
          </p>
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-primary px-8 py-3.5 text-lg font-bold text-white"
          >
            시작하기
          </button>
        </div>
      )}
      {playing && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
            <span>
              라운드 {round} / {MAX_ROUND}
            </span>
            <span>기억할 개수 {sequence.length}</span>
          </div>
          <h2 ref={headingRef} tabIndex={-1} className="text-center text-lg font-bold outline-none">
            {phase === "showing"
              ? "순서를 잘 보세요"
              : `같은 순서로 눌러 보세요 (${inputIndex} / ${sequence.length})`}
          </h2>
          <Pads lit={lit} locked={phase !== "input"} onPress={press} />
          <p role="status" aria-live="polite" className="sr-only">
            {lit === null ? "" : `${lit + 1}번`}
          </p>
        </div>
      )}
      {phase === "result" && <Result state={state} record={record} onRetry={start} />}
    </section>
  );
}