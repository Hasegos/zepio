import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getGameData, saveResult } from "../../lib/storage.js";
import meta from "./meta.js";
import Pads from "./Pads.jsx";
import { mergeResult } from "./record.js";
import Result from "./Result.jsx";
import { accuracy, COLORS, DURATION_MS, initialState, makeRound, reducer, secondsLeft } from "./reducer.js";

const TICK_MS = 100;

/**
 * Color Clash 한 판을 진행한다. 시작 화면, 30초 플레이, 결과 화면을 오간다.
 * 남은 시간은 타이머로 갱신하고 화면에서 사라지면 해제한다. 키보드 1~4 키로도 색을 고를 수 있다.
 */
export default function ColorClash() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [now, setNow] = useState(() => Date.now());
  const [record, setRecord] = useState(null);
  const timerRef = useRef(null);
  const playing = state.phase === "playing";

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      dispatch({ type: "tick", now: at });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (state.phase !== "result") return;
    const outcome = mergeResult(getGameData(meta.id), { score: state.correct, accuracy: accuracy(state) });
    saveResult(meta.id, state.finishedAt, outcome.data);
    setRecord(outcome);
  }, [state]);

  const start = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setRecord(null);
    dispatch({ type: "start", ...makeRound(), now: at });
  }, []);

  const press = useCallback((choice) => {
    dispatch({ type: "answer", choice, ...makeRound(), now: Date.now() });
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    function onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= COLORS.length) press(number - 1);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [playing, press]);

  useEffect(() => {
    if (playing) timerRef.current?.focus({ preventScroll: true });
  }, [playing]);

  const word = COLORS[state.word];
  const ink = COLORS[state.ink];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      {state.phase === "intro" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <h2 className="text-2xl font-extrabold">글자가 아니라 칠해진 색을 누르세요</h2>
          <p className="text-slate-600">
            {DURATION_MS / 1000}초 · {meta.estimatedPlayTime}
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
            <span>점수 {state.correct}</span>
            <span ref={timerRef} tabIndex={-1} className="outline-none">
              남은 시간 {secondsLeft(state, now)}초
            </span>
            <span aria-hidden="true" className="w-12 text-right">
              {state.last === "ok" ? "✓ 정답" : state.last === "miss" ? "✗ 오답" : ""}
            </span>
          </div>
          <p
            role="img"
            aria-label={`글자 ${word.name}, 칠한 색 ${ink.name}`}
            className="rounded-2xl bg-slate-900 py-10 text-center text-6xl font-extrabold"
            style={{ color: ink.fill }}
          >
            <span aria-hidden="true">{word.name}</span>
          </p>
          <Pads onPress={press} />
        </div>
      )}
      {state.phase === "result" && <Result state={state} record={record} onRetry={start} />}
    </section>
  );
}