import { useState } from "react";
import { CLUSTERS, TYPES } from "./village.js";

const NODE_CLASS = {
  idle: "fill-white stroke-slate-400",
  heard: "fill-amber-200 stroke-amber-600",
  believed: "fill-danger-strong stroke-red-900",
  immune: "fill-primary stroke-primary",
};
const TEXT_CLASS = { idle: "fill-slate-900", heard: "fill-slate-900", believed: "fill-white", immune: "fill-white" };
const STATE_LABEL = { idle: "아직 소문을 모름", heard: "소문을 들었지만 믿지 않음", believed: "소문을 믿음", immune: "해명을 들음" };
const EDGE_WIDTH = { 1: "stroke-[0.25]", 2: "stroke-[0.4]", 3: "stroke-[0.6]" };

/**
 * 한 사람의 현재 상태를 정한다.
 *
 * @param person 사람 번호
 * @param props 마을 화면 속성
 * @returns idle, heard, believed, immune 중 하나
 */
function stateOf(person, { round, picks, outcome, turn }) {
  if (round.type === "stop" && picks.includes(person)) return "immune";
  if (outcome) {
    const { became, heard } = outcome.sim;
    if (became[person] !== -1 && became[person] <= turn) return "believed";
    if (heard[person] !== -1 && heard[person] <= turn) return "heard";
    return "idle";
  }
  if (round.type === "stop" ? round.starters.includes(person) : picks.includes(person)) return "believed";
  return "idle";
}

/**
 * 마을 그림을 그린다. 사람은 동그라미, 이웃 사이는 선이고 굵을수록 가깝다.
 * 계획 단계에서는 사람을 눌러 고르고, 진행 단계에서는 소문이 번지는 모습만 보여 준다.
 *
 * @param props.village 마을
 * @param props.round 지금 라운드
 * @param props.picks 고른 사람 번호 목록
 * @param props.outcome 진행 결과 또는 null(계획 단계)
 * @param props.turn 보여 줄 턴
 * @param props.onPick 사람을 눌렀을 때 번호를 받는다. 비우면 누를 수 없다
 */
export default function Village({ village, round, picks, outcome, turn, onPick }) {
  const [info, setInfo] = useState(null);
  const [tab, setTab] = useState(0);
  const props = { round, picks, outcome, turn };
  const shown = info ?? (round.type === "stop" ? round.starters[0] : null);
  const shownState = shown === null ? null : stateOf(shown, props);
  const labelOf = (person, state) => {
    if (outcome || state === "idle") return STATE_LABEL[state];
    if (state === "immune") return "해명할 사람으로 고름";
    return round.type === "spread" ? "첫 이야기를 건넬 사람으로 고름" : "소문을 낸 사람";
  };
  const clusterCounts = outcome
    ? Array.from({ length: CLUSTERS }, (_, cluster) => village.types.filter((_, person) => village.cluster(person) === cluster && outcome.sim.became[person] !== -1 && outcome.sim.became[person] <= turn).length)
    : [];

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox="0 0 100 100"
        role={onPick ? "group" : "img"}
        aria-label={onPick ? "마을 사람들. 눌러서 고릅니다" : "소문이 번지는 마을"}
        className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50"
      >
        {village.edges.map(([a, b, w]) => (
          <line
            key={`${a}-${b}`}
            x1={village.pos[a][0]}
            y1={village.pos[a][1]}
            x2={village.pos[b][0]}
            y2={village.pos[b][1]}
            className={`stroke-slate-300 ${EDGE_WIDTH[w]}`}
          />
        ))}
        {outcome &&
          village.types.map((_, person) => {
            const source = outcome.sim.from[person];
            const became = outcome.sim.became[person];
            if (source === -1 || became === -1 || became > turn) return null;
            return (
              <line
                key={`s${person}`}
                x1={village.pos[source][0]}
                y1={village.pos[source][1]}
                x2={village.pos[person][0]}
                y2={village.pos[person][1]}
                className="stroke-danger stroke-[0.7]"
              />
            );
          })}
        {village.types.map((type, person) => {
          const state = stateOf(person, props);
          const [x, y] = village.pos[person];
          const marked = round.type === "spread" && picks.includes(person);
          const pickable = onPick && !(round.type === "stop" && round.starters.includes(person));
          const label = `${person + 1}번 ${TYPES[type].label}, ${labelOf(person, state)}`;
          return (
            <g
              key={person}
              transform={`translate(${x} ${y})`}
              role={pickable ? "button" : undefined}
              tabIndex={pickable ? (person === tab ? 0 : -1) : undefined}
              aria-label={pickable ? label : undefined}
              aria-pressed={pickable ? picks.includes(person) : undefined}
              aria-hidden={pickable ? undefined : true}
              className={`group outline-none ${pickable ? "cursor-pointer" : ""}`}
              onClick={pickable ? () => onPick(person) : undefined}
              onKeyDown={
                pickable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onPick(person);
                        return;
                      }
                      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
                      if (!step) return;
                      event.preventDefault();
                      const all = [...event.currentTarget.parentNode.querySelectorAll('[role="button"]')];
                      all[(all.indexOf(event.currentTarget) + step + all.length) % all.length]?.focus();
                    }
                  : undefined
              }
              onMouseEnter={() => setInfo(person)}
              onFocus={() => {
                setInfo(person);
                setTab(person);
              }}
            >
              <circle r="3.7" className="fill-none stroke-primary stroke-[0.6] opacity-0 group-focus-visible:opacity-100" />
              <circle r="2.6" className={marked ? "fill-danger-strong stroke-primary stroke-[1]" : `${NODE_CLASS[state]} stroke-[0.4]`} />
              <text textAnchor="middle" dominantBaseline="central" fontSize="2.8" fontWeight="700" className={TEXT_CLASS[state]}>
                {TYPES[type].mark}
              </text>
            </g>
          );
        })}
      </svg>
      {outcome && <p className="sr-only">동네별 믿는 사람: {clusterCounts.map((count, cluster) => `${cluster + 1}번 동네 ${count}명`).join(", ")}</p>}
      <div className="min-h-[3.25rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        {shown === null ? (
          onPick ? "사람을 누르거나 가리키면 유형이 보여요." : "사람을 가리키면 유형이 보여요."
        ) : (
          <>
            <span className="font-bold">
              {shown + 1}번 · {TYPES[village.types[shown]].label}
            </span>{" "}
            · {village.cluster(shown) + 1}번 동네 · {STATE_LABEL[shownState]}
            <span className="block text-xs text-slate-600">{TYPES[village.types[shown]].note}</span>
          </>
        )}
      </div>
    </div>
  );
}