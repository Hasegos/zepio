import { useEffect, useRef, useState } from "react";
import { scoreFor } from "./logic.js";
import { PUZZLES, WRONG_PENALTY } from "./puzzles.js";

const MEMO = [
  { name: "표시 없음", cls: "border-det-line bg-white" },
  { name: "빨강", cls: "border-red-700 bg-red-50" },
  { name: "초록", cls: "border-green-700 bg-green-50" },
  { name: "파랑", cls: "border-blue-700 bg-blue-50" },
];
const btn =
  "break-keep rounded-lg border-2 border-det-ink px-2 py-2 text-sm font-extrabold enabled:active:translate-y-0.5 disabled:opacity-50";
const light = "bg-white text-det-ink enabled:hover:bg-det-paper";
const accent = "bg-det-accent text-white";

function Docs({ docs }) {
  const [tab, setTab] = useState(0);
  const doc = docs[Math.min(tab, docs.length - 1)];
  return (
    <section aria-label="근거 문서" className="rounded-xl border-2 border-det-ink bg-det-paper p-3 text-det-ink">
      {docs.length > 1 && (
        <div role="group" aria-label="문서 고르기" className="mb-2 flex flex-wrap gap-1.5">
          {docs.map((d, i) => (
            <button
              key={d.name}
              type="button"
              aria-pressed={i === tab}
              onClick={() => setTab(i)}
              className={`rounded-md border-2 border-det-ink px-2.5 py-1 text-xs font-extrabold ${i === tab ? "bg-det-ink text-white" : "bg-white text-det-ink"}`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
      <h3 className="text-xs font-extrabold text-det-accent">{doc.name}</h3>
      <p className="mt-1 text-sm font-semibold leading-relaxed">{doc.text}</p>
    </section>
  );
}

function Row({ index, memo, showMemo, onMemo, children, text }) {
  const color = MEMO[memo ?? 0];
  return (
    <li className={`flex flex-col gap-2 rounded-xl border-2 p-2.5 text-det-ink ${color.cls}`}>
      <p className="text-sm font-semibold leading-snug">
        <span className="mr-1.5 font-extrabold text-det-accent">{index + 1}.</span>
        {text}
      </p>
      {(children || showMemo) && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
          {showMemo && (
            <button type="button" onClick={onMemo} className={`${btn} ${light} px-2 py-1 text-xs`}>
              메모: {color.name}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

const CELL = [
  { mark: "", name: "비어 있음", cls: "border-det-line bg-white" },
  { mark: "✗", name: "아님", cls: "border-det-line bg-det-paper text-det-bad" },
  { mark: "●", name: "맞음", cls: "border-det-ink bg-det-accent text-white" },
];

/**
 * 격자 논리 표를 보여 준다. 분류마다 줄은 칸(자리나 순서), 열은 항목이고, 칸을 누를 때마다 비어 있음, ✗, ●가 돌아가며 바뀐다.
 *
 * @param props.puzzle 격자 퍼즐
 * @param props.input 분류마다 표 칸의 상태(0 비어 있음, 1 ✗, 2 ●)
 * @param props.dispatch 행동을 보낸다
 */
function Grid({ puzzle, input, dispatch }) {
  const n = puzzle.slots.length;
  return (
    <div className="grid gap-3">
      {puzzle.cats.map((cat, c) => (
        <div key={cat.name} className="overflow-x-auto rounded-xl border-2 border-det-ink bg-white p-2">
          <table className="w-full border-collapse text-center text-xs font-extrabold text-det-ink">
            <caption className="mb-1 text-left text-sm text-det-accent">{cat.name}</caption>
            <thead>
              <tr>
                <td />
                {cat.options.map((option) => (
                  <th key={option} scope="col" className="px-0.5 pb-1 align-bottom leading-tight">
                    {option}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {puzzle.slots.map((slot, s) => (
                <tr key={slot}>
                  <th scope="row" className="pr-2 text-left leading-tight">
                    {slot}
                  </th>
                  {cat.options.map((option, opt) => {
                    const state = CELL[input[c][s * n + opt]];
                    return (
                      <td key={option} className="p-0.5">
                        <button
                          type="button"
                          aria-label={`${cat.name} ${slot} - ${option}: ${state.name}`}
                          onClick={() => dispatch({ type: "cell", c, slot: s, opt })}
                          className={`h-10 w-full min-w-9 rounded-md border-2 text-base font-extrabold ${state.cls}`}
                        >
                          {state.mark}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/**
 * 퍼즐 화면을 보여 준다. 근거 문서와 문제를 보여 주고 고르기, 순서 놓기, 범인 고르기, 표 채우기를 받으며 아래 버튼 줄에 힌트, 나중에 풀기, 메모, 다시하기, 결정이 있다.
 *
 * @param props.state 게임 상태
 * @param props.dispatch 행동을 보낸다
 */
export default function Puzzle({ state, dispatch }) {
  const { puzzle: view } = state;
  const index = PUZZLES.findIndex((p) => p.id === view.id);
  const puzzle = PUZZLES[index];
  const opened = state.hints[puzzle.id] ?? 0;
  const result = view.result;
  const resultRef = useRef(null);

  useEffect(() => {
    if (result) resultRef.current?.focus({ preventScroll: false });
  }, [result]);

  return (
    <div className="flex flex-col gap-3">
      <header className="rounded-xl bg-det-ink px-4 py-3 text-white">
        <p className="text-xs font-bold text-amber-300">
          퍼즐 {String(index + 1).padStart(3, "0")} · {state.solved[puzzle.id] ? `푼 점수 ${state.solved[puzzle.id].score}` : `지금 맞히면 ${scoreFor(state.wrong[puzzle.id] ?? 0)}`}점 · 힌트 코인 {state.coins}
        </p>
        <h2 className="text-xl font-extrabold">{puzzle.title}</h2>
        <p className="mt-1 text-sm font-semibold text-white/90">{puzzle.intro}</p>
      </header>

      {puzzle.docs.length > 0 && <Docs docs={puzzle.docs} />}

      <p className="text-sm font-extrabold text-det-ink">{puzzle.prompt}</p>

      <ul aria-label={puzzle.kind === "grid" ? "단서" : puzzle.kind === "liars" ? "진술" : "문제"} className="grid gap-2">
        {puzzle.items.map((text, i) => {
          if (puzzle.kind === "liars" || puzzle.kind === "grid") {
            return <Row key={text} index={i} text={text} memo={view.memo[i]} showMemo={view.showMemo} onMemo={() => dispatch({ type: "memo", i })} />;
          }
          if (puzzle.kind === "find") {
            const picked = view.input.includes(i);
            return (
              <Row key={text} index={i} text={text} memo={view.memo[i]} showMemo={view.showMemo} onMemo={() => dispatch({ type: "memo", i })}>
                <button
                  type="button"
                  aria-pressed={picked}
                  aria-label={`${i + 1}번 문장 환각이다`}
                  onClick={() => dispatch({ type: "toggle", i })}
                  className={`${btn} ${picked ? "bg-det-bad text-white" : light}`}
                >
                  {picked ? "환각 ✔" : "환각이다"}
                </button>
              </Row>
            );
          }
          {
            const item = puzzle.items[view.input[i]];
            return (
              <Row key={item} index={i} text={item} memo={view.memo[i]} showMemo={view.showMemo} onMemo={() => dispatch({ type: "memo", i })}>
                <button type="button" disabled={i === 0} aria-label={`위로 옮기기: ${item}`} onClick={() => dispatch({ type: "move", i, dir: -1 })} className={`${btn} ${light}`}>
                  ▲ 위로
                </button>
                <button
                  type="button"
                  disabled={i === puzzle.items.length - 1}
                  aria-label={`아래로 옮기기: ${item}`}
                  onClick={() => dispatch({ type: "move", i, dir: 1 })}
                  className={`${btn} ${light}`}
                >
                  ▼ 아래로
                </button>
              </Row>
            );
          }
        })}
      </ul>

      {puzzle.kind === "liars" && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-det-ink bg-det-paper p-2.5 text-det-ink">
          <label htmlFor="culprit" className="text-sm font-extrabold">
            범인은
          </label>
          <select
            id="culprit"
            value={view.input[0] ?? ""}
            onChange={(e) => dispatch({ type: "choose", i: 0, option: e.target.value === "" ? null : Number(e.target.value) })}
            className="rounded-lg border-2 border-det-ink bg-white px-2 py-2 text-sm font-bold text-det-ink"
          >
            <option value="">고르세요</option>
            {puzzle.options.map((option, o) => (
              <option key={option} value={o}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {puzzle.kind === "grid" && <Grid puzzle={puzzle} input={view.input} dispatch={dispatch} />}

      {opened > 0 && (
        <ol aria-label="연 힌트" className="grid gap-1.5 rounded-xl border-2 border-dashed border-det-accent bg-white p-3 text-sm font-semibold text-det-ink">
          {puzzle.hints.slice(0, opened).map((hint, h) => (
            <li key={hint}>
              <span className="mr-1 font-extrabold text-det-accent">힌트 {h + 1}</span>
              {hint}
            </li>
          ))}
        </ol>
      )}

      <p role="status" className="min-h-5 text-center text-sm font-bold text-det-accent">
        {state.notice}
      </p>

      {result ? (
        <div ref={resultRef} tabIndex={-1} className="flex flex-col gap-2 rounded-xl border-4 border-det-ink bg-white p-4 text-det-ink outline-none">
          {result.ok ? (
            <>
              <h3 className="text-xl font-extrabold text-det-good">정답! {result.score}점</h3>
              {result.bonus > 0 && <p className="text-sm font-bold">한 번에 맞혀서 힌트 코인 +{result.bonus}</p>}
              {Object.keys(puzzle.kinds).length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {Object.entries(puzzle.kinds).map(([i, kind]) => (
                    <li key={i} className="rounded bg-det-ink px-2 py-0.5 text-xs font-bold text-white">
                      {Number(i) + 1}번 · {kind}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm font-semibold leading-relaxed">{puzzle.explain}</p>
              <button type="button" onClick={() => dispatch({ type: "closeResult" })} className={`${btn} ${accent}`}>
                계속
              </button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-extrabold text-det-bad">아쉬워요, 다시 생각해 보세요</h3>
              <p className="text-sm font-semibold">{state.solved[puzzle.id] ? "이미 푼 퍼즐이라 점수는 그대로예요." : `틀리면 점수가 ${WRONG_PENALTY}점 깎여요. 힌트를 열거나 메모로 정리해 보세요.`}</p>
              <button type="button" onClick={() => dispatch({ type: "closeResult" })} className={`${btn} ${accent}`}>
                다시 풀기
              </button>
            </>
          )}
        </div>
      ) : (
        <div role="group" aria-label="도구" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          <button type="button" disabled={opened >= 3} onClick={() => dispatch({ type: "hint" })} className={`${btn} ${light}`}>
            힌트 {opened}/3
          </button>
          <button type="button" onClick={() => dispatch({ type: "leave" })} className={`${btn} ${light}`}>
            나중에 풀기
          </button>
          <button type="button" aria-pressed={view.showMemo} onClick={() => dispatch({ type: "showMemo" })} className={`${btn} ${light}`}>
            메모하기
          </button>
          <button type="button" onClick={() => dispatch({ type: "reset" })} className={`${btn} ${light}`}>
            다시하기
          </button>
          <button type="button" onClick={() => dispatch({ type: "submit" })} className={`${btn} ${accent} col-span-2 sm:col-span-1`}>
            결정
          </button>
        </div>
      )}
    </div>
  );
}