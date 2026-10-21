import { memo, useCallback, useEffect, useRef, useState } from "react";
import { currentStreak, kstDate, nextDailyRecord } from "../../lib/daily.js";
import { getDaily, getGameData, saveDaily, saveResult } from "../../lib/storage.js";
import { hashSeed } from "../_shared/rng.js";
import SoundButton from "../_shared/SoundButton.jsx";
import { formatDuration } from "../_shared/time.js";
import { useAudio } from "../_shared/useAudio.js";
import { useGameBack } from "../_shared/useGameBack.js";
import { useMuted } from "../_shared/useMuted.js";
import { createAudio } from "./audio.js";
import { bugsLeft, chord, dailyGame, FLAG, LEVEL_IDS, LEVELS, newGame, OPEN, reveal, toggleFlag } from "./engine.js";
import meta from "./meta.js";
import { mergeResult, readData } from "./record.js";
import Result from "./Result.jsx";

const DAILY_LEVEL = "normal";
const LONG_PRESS_MS = 450;
const MAX_SECONDS = 5999;
const NUMBER_COLORS = [
  "",
  "text-blue-700",
  "text-green-700",
  "text-red-700",
  "text-purple-800",
  "text-amber-800",
  "text-teal-700",
  "text-slate-900",
  "text-slate-600",
];

/**
 * 칸의 화면 표시(보이는 글자)를 정한다.
 *
 * @param game 게임 상태
 * @param i 칸 번호
 * @returns 칸 안에 보일 글자
 */
function glyphOf(game, i) {
  const lost = game.phase === "lost";
  if (game.cells[i] === FLAG) return lost && !game.mines[i] ? "✖" : "🚩";
  if (game.cells[i] === OPEN) return game.counts[i] > 0 ? String(game.counts[i]) : "";
  return lost && game.mines[i] ? "🐛" : "";
}

/**
 * 칸의 스크린 리더용 이름을 만든다.
 *
 * @param game 게임 상태
 * @param i 칸 번호
 * @returns 위치와 상태를 담은 문장
 */
function labelOf(game, i) {
  const where = `${Math.floor(i / game.cols) + 1}행 ${(i % game.cols) + 1}열`;
  if (game.cells[i] === OPEN) return `${where}, ${game.counts[i] > 0 ? `주변 버그 ${game.counts[i]}개` : "빈 칸"}`;
  if (game.cells[i] === FLAG) return `${where}, 깃발${game.phase === "lost" && !game.mines[i] ? " (틀림)" : ""}`;
  if (game.phase === "lost" && game.mines[i]) return `${where}, 버그`;
  return `${where}, 닫힘`;
}

/**
 * 칸 모양을 정하는 클래스를 구한다.
 *
 * @param game 게임 상태
 * @param i 칸 번호
 * @returns 클래스 문자열
 */
function cellClass(game, i) {
  const base = "flex aspect-square items-center justify-center rounded-[3px] text-sm font-extrabold leading-none sm:text-base";
  if (game.cells[i] === OPEN) return `${base} bg-slate-50 ${NUMBER_COLORS[game.counts[i]]}`;
  if (game.phase === "lost" && game.lostAt === i) return `${base} bg-red-300`;
  return `${base} bg-slate-300 shadow-[inset_-2px_-2px_0_#94a3b8,inset_2px_2px_0_#f1f5f9] hover:bg-slate-200`;
}

/**
 * 버그 격자. 칸 탭, 우클릭, 길게 누르기, 방향키 이동과 F 키를 받는다.
 * 길게 눌러 깃발을 꽂은 뒤 따라오는 클릭은 한 번 걸러 낸다.
 *
 * @param props.game 게임 상태
 * @param props.onClick 칸을 눌렀을 때 호출, 칸 번호를 받는다
 * @param props.onFlag 깃발을 꽂거나 뽑을 때 호출, 칸 번호를 받는다
 */
const Board = memo(function Board({ game, onClick, onFlag }) {
  const [focus, setFocus] = useState(0);
  const rootRef = useRef(null);
  const timer = useRef(null);
  const suppress = useRef(false);
  const { cols, rows } = game;

  const stopPress = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    if (suppress.current) setTimeout(() => (suppress.current = false), 350);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onKeyDown = (event, i) => {
    const x = i % cols;
    const moves = { ArrowUp: i - cols, ArrowDown: i + cols, ArrowLeft: x > 0 ? i - 1 : -1, ArrowRight: x < cols - 1 ? i + 1 : -1 };
    if (event.key in moves) {
      event.preventDefault();
      const next = moves[event.key];
      if (next < 0 || next >= cols * rows) return;
      setFocus(next);
      rootRef.current?.querySelector(`[data-i="${next}"]`)?.focus();
    } else if ((event.key === "f" || event.key === "F") && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      onFlag(i);
    }
  };

  const cells = [];
  for (let i = 0; i < cols * rows; i += 1) {
    cells.push(
      <button
        key={i}
        type="button"
        data-i={i}
        tabIndex={i === focus ? 0 : -1}
        aria-label={labelOf(game, i)}
        className={cellClass(game, i)}
        onClick={() => {
          if (suppress.current) {
            suppress.current = false;
            return;
          }
          onClick(i);
        }}
        onContextMenu={(event) => event.preventDefault()}
        onFocus={() => setFocus(i)}
        onPointerDown={(event) => {
          suppress.current = false;
          if (event.pointerType === "mouse") {
            if (event.button === 2) onFlag(i);
            return;
          }
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            suppress.current = true;
            onFlag(i);
          }, LONG_PRESS_MS);
        }}
        onPointerUp={stopPress}
        onPointerCancel={stopPress}
        onPointerLeave={stopPress}
        onKeyDown={(event) => onKeyDown(event, i)}
      >
        {glyphOf(game, i)}
      </button>,
    );
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={`버그 격자 ${cols}×${rows}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      className="mx-auto grid w-full max-w-md touch-manipulation select-none gap-0.5 [-webkit-touch-callout:none]"
    >
      {cells}
    </div>
  );
});

/**
 * 경과 시간을 보여 준다. 판이 돌아가는 동안 0.25초마다 읽어 오고, 끝나면 마지막 값에 멈춘다.
 *
 * @param props.read 경과 시간(밀리초)을 돌려주는 함수
 * @param props.running 판이 진행 중인지
 */
function Clock({ read, running }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    setMs(read());
    if (!running) return undefined;
    const id = setInterval(() => setMs(read()), 250);
    return () => clearInterval(id);
  }, [read, running]);
  return <span className="tabular-nums">{formatDuration(ms)}</span>;
}

/**
 * Bug Sweeper 한 판을 진행한다. 난이도 고르기, 판 진행, 결과 화면을 오간다.
 * 일반 판은 첫 칸을 열 때 그 칸을 피해 버그가 놓이고, 오늘의 판은 모두가 같은 판에서 가운데 영역이 열린 채 시작한다.
 * 시간은 첫 동작부터 재고, 탭이 가려진 시간은 뺀다.
 */
export default function BugSweeper() {
  const [view, setView] = useState("menu");
  const [game, setGame] = useState(null);
  const [mode, setMode] = useState("open");
  const [result, setResult] = useState(null);
  const [round, setRound] = useState(0);
  const [today, setToday] = useState(() => kstDate(Date.now()));
  const [data, setData] = useState(() => readData(getGameData(meta.id)));
  const [dailyRecord, setDailyRecord] = useState(() => getDaily(meta.id));
  const gameRef = useRef(null);
  const dailyRef = useRef(null);
  const modeRef = useRef(mode);
  const timeRef = useRef({ start: null, end: null, hidden: 0, since: null });
  modeRef.current = mode;
  const [muted, toggleMuted] = useMuted();
  const audio = useAudio(muted, createAudio);
  useGameBack(view === "menu" ? 0 : 1, () => setView("menu"));

  const playing = view === "play" && game !== null && game.phase !== "won" && game.phase !== "lost";
  useEffect(() => {
    audio.music(playing ? "play" : "menu");
  }, [audio, playing]);

  useEffect(() => {
    const onVisibility = () => {
      const t = timeRef.current;
      if (document.hidden) {
        if (t.since === null) t.since = performance.now();
      } else if (t.since !== null) {
        t.hidden += performance.now() - t.since;
        t.since = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const elapsed = useCallback(() => {
    const t = timeRef.current;
    if (t.start === null) return 0;
    if (t.end !== null) return t.end;
    return Math.max(0, (t.since ?? performance.now()) - t.start - t.hidden);
  }, []);

  const begin = useCallback((levelId, date) => {
    const next = date ? dailyGame(levelId, hashSeed(`${meta.id}:${date}:${levelId}`)) : newGame(levelId);
    timeRef.current = { start: null, end: null, hidden: 0, since: null };
    gameRef.current = next;
    dailyRef.current = date;
    setGame(next);
    setResult(null);
    setMode("open");
    setRound((n) => n + 1);
    setView("play");
  }, []);

  const finish = useCallback(
    (last) => {
      const t = timeRef.current;
      t.end = elapsed();
      const won = last.phase === "won";
      const seconds = Math.min(MAX_SECONDS, Math.max(1, Math.round(t.end / 1000)));
      const outcome = mergeResult(getGameData(meta.id), { level: last.level, won, seconds });
      saveResult(meta.id, Date.now(), outcome.data);
      const date = dailyRef.current;
      let dailyStreak = 0;
      if (won && date) {
        const next = nextDailyRecord(getDaily(meta.id), date, seconds);
        saveDaily(meta.id, next);
        dailyStreak = currentStreak(next, date);
      }
      setResult({ won, level: last.level, seconds, date, outcome, dailyStreak });
    },
    [elapsed],
  );

  const apply = useCallback(
    (change, sound) => {
      const prev = gameRef.current;
      if (!prev) return;
      const next = change(prev);
      if (next === prev) return;
      audio.sfx(next.phase === "lost" ? "boom" : next.phase === "won" ? "win" : sound);
      const t = timeRef.current;
      if (t.start === null) {
        t.start = performance.now();
        t.hidden = 0;
        t.since = null;
      }
      gameRef.current = next;
      setGame(next);
      if (next.phase === "won" || next.phase === "lost") finish(next);
    },
    [audio, finish],
  );

  const onCellClick = useCallback(
    (i) =>
      apply(
        (g) => {
          if (g.cells[i] === OPEN) return modeRef.current === "flag" ? g : chord(g, i);
          if (modeRef.current === "flag") return toggleFlag(g, i);
          return g.cells[i] === FLAG ? g : reveal(g, i);
        },
        modeRef.current === "flag" ? "flag" : "tick",
      ),
    [apply],
  );
  const onCellFlag = useCallback((i) => apply((g) => toggleFlag(g, i), "flag"), [apply]);

  const toMenu = useCallback(() => {
    setToday(kstDate(Date.now()));
    setData(readData(getGameData(meta.id)));
    setDailyRecord(getDaily(meta.id));
    setView("menu");
  }, []);

  if (view === "menu" || !game) {
    const done = dailyRecord?.history?.[today];
    const doneSeconds = Number.isInteger(done) ? done : undefined;
    const streak = currentStreak(dailyRecord, today);
    return (
      <section className="panel">
        <div className="mb-2 flex justify-end">
          <SoundButton muted={muted} onToggle={toggleMuted} className="border-primary text-primary hover:bg-indigo-50" />
        </div>
        <div className="flex flex-col gap-5 py-4">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold">숨은 버그를 찾아 코드를 살려요</h2>
            <p className="mt-2 text-slate-600">
              숫자는 이웃한 칸의 버그 수예요. 찍지 않고 논리만으로 풀 수 있는 판만 나와요 · {meta.estimatedPlayTime}
            </p>
          </div>
          <button
            type="button"
            onClick={() => begin(DAILY_LEVEL, kstDate(Date.now()))}
            className="rounded-xl border-2 border-primary bg-indigo-50 px-5 py-4 text-left"
          >
            <span className="block text-lg font-extrabold text-primary">오늘의 판 · {LEVELS[DAILY_LEVEL].name}</span>
            <span className="mt-0.5 block text-sm font-semibold text-slate-700">
              {doneSeconds !== undefined
                ? `오늘 완료 ${formatDuration(doneSeconds * 1000)} · 연속 ${streak}일. 다시 풀어 볼 수 있어요.`
                : streak > 0
                  ? `연속 ${streak}일을 이어 가는 중 · 오늘의 판이 기다려요`
                  : "매일 모두가 같은 판에 도전해요"}
            </span>
          </button>
          <ul className="grid gap-3 sm:grid-cols-3">
            {LEVEL_IDS.map((id) => {
              const level = LEVELS[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => begin(id, null)}
                    className="w-full rounded-xl bg-primary px-4 py-3 text-left text-white"
                  >
                    <span className="block text-lg font-bold">{level.name}</span>
                    <span className="block text-sm font-semibold text-indigo-100">
                      {level.cols}×{level.rows} · 버그 {level.bugs}개
                    </span>
                    <span className="block text-sm font-semibold text-indigo-100">
                      {data.best[id] ? `최고 ${formatDuration(data.best[id] * 1000)}` : "기록 없음"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    );
  }

  const over = game.phase === "won" || game.phase === "lost";
  return (
    <section className="panel">
      <div className="mb-2 flex justify-end">
        <SoundButton muted={muted} onToggle={toggleMuted} className="border-primary text-primary hover:bg-indigo-50" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>🐛 남은 버그 {bugsLeft(game)}</span>
          <span>
            {LEVELS[game.level].name}
            {dailyRef.current ? " · 오늘의 판" : ""}
          </span>
          <span>
            ⏱ <Clock key={round} read={elapsed} running={!over} />
          </span>
        </div>
        <Board game={game} onClick={onCellClick} onFlag={onCellFlag} />
        {!over && (
          <>
            <div role="group" aria-label="누르기 방식" className="grid grid-cols-2 gap-2">
              {[
                ["open", "열기"],
                ["flag", "🚩 깃발"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                  className="touch-manipulation rounded-xl border-2 border-primary px-4 py-3 text-base font-bold text-primary aria-pressed:bg-primary aria-pressed:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-slate-600">
              숫자 칸을 누르면 주변 깃발 수가 맞을 때 나머지를 한꺼번에 열어요. 길게 누르기, 우클릭, F 키로도 깃발을 꽂아요.
            </p>
            <div className="flex justify-center gap-4 text-sm font-semibold">
              <button type="button" onClick={() => begin(game.level, dailyRef.current)} className="px-2 py-1.5 text-slate-700 underline">
                다시 시작
              </button>
              <button type="button" onClick={toMenu} className="px-2 py-1.5 text-slate-700 underline">
                난이도 고르기
              </button>
            </div>
          </>
        )}
        {over && result && (
          <Result
            result={result}
            onRetry={() => begin(game.level, dailyRef.current)}
            onMenu={toMenu}
          />
        )}
      </div>
    </section>
  );
}