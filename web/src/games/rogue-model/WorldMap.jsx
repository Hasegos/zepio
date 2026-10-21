import { useMemo } from "react";
import { derive } from "./sim.js";
import { CONTINENTS } from "./shapes.js";

const TYPE_CLASS = {
  land: "stroke-slate-400",
  cable: "stroke-sky-600",
  cloud: "stroke-violet-400",
};
const DOT_CLASS = { land: "fill-slate-600", cable: "fill-sky-700", cloud: "fill-violet-500" };

/**
 * 연결 하나를 그릴 길을 만든다. 해저 케이블은 휘어 바다 위를 지나가고, 지도 양끝을 가로지르는 연결은 가장자리로 이어 그린다.
 *
 * @param link { a, b, type }
 * @param regions 권역 목록
 * @param index 연결 번호(휘는 방향을 정하는 데 쓴다)
 * @returns { d, forward, backward } d는 선, forward와 backward는 알갱이가 달릴 길 목록
 */
function pathsOf(link, regions, index) {
  const a = regions[link.a];
  const b = regions[link.b];
  if (Math.abs(a.x - b.x) > 50) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    const y = Math.round((left.y + right.y) / 2);
    const out = [`M${left.x} ${left.y} L0 ${y}`, `M100 ${y} L${right.x} ${right.y}`];
    const back = [`M0 ${y} L${left.x} ${left.y}`, `M${right.x} ${right.y} L100 ${y}`];
    const aIsLeft = a === left;
    return { d: out.join(" "), forward: aIsLeft ? out : back, backward: aIsLeft ? back : out };
  }
  if (link.type === "land") {
    const line = (from, to) => `M${from.x} ${from.y} L${to.x} ${to.y}`;
    return { d: line(a, b), forward: [line(a, b)], backward: [line(b, a)] };
  }
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const bend = (link.type === "cloud" ? 0.35 : 0.18) * length * (index % 2 === 0 ? 1 : -1);
  const cx = mx + (-(b.y - a.y) / length) * bend;
  const cy = my + ((b.x - a.x) / length) * bend;
  const curve = (from, to) => `M${from.x} ${from.y} Q${cx} ${cy} ${to.x} ${to.y}`;
  return { d: curve(a, b), forward: [curve(a, b)], backward: [curve(b, a)] };
}

/**
 * 세계 지도를 그린다. 권역은 동그라미(채택은 파란 채움, 의존은 노란 속, 경계도는 붉은 바깥 호),
 * 연결은 선이고 연결 위에서는 AI가 알갱이로 옮겨 다닌다.
 *
 * @param props.world 세계
 * @param props.sim 지금 상태. 시작 전에는 null
 * @param props.selected 고른 권역 번호 또는 null
 * @param props.running 턴이 흐르는 중인지
 * @param props.still 움직임을 줄여야 하는지
 * @param props.onSelect 권역을 눌렀을 때 번호를 받는다
 */
export default function WorldMap({ world, sim, selected, running, still, onSelect }) {
  const { regions, links } = world;
  const levels = sim?.levels ?? {};
  const P = useMemo(() => (sim ? derive(sim.levels, sim.ai) : null), [sim]);
  const shapes = useMemo(() => links.map((link, index) => pathsOf(link, regions, index)), [links, regions]);

  return (
    <svg viewBox="0 0 100 56" role="group" aria-label="세계 지도. 권역을 눌러 고릅니다" className="w-full rounded-xl border border-slate-200 bg-sky-50">
      {CONTINENTS.map((d) => (
        <path key={d} d={d} className="fill-slate-100 stroke-slate-200 stroke-[0.4]" />
      ))}
      {links.map((link, index) => {
        if (link.type === "sat") return null;
        if (link.type === "cloud" && !levels.cloud) return null;
        const cut = sim?.cut[index];
        const factor = P?.route[link.type] ?? 0;
        const flow = sim ? Math.max(sim.a[link.a], sim.a[link.b]) * link.cap * factor : 0;
        const active = flow > 0.02 && !cut;
        const style = link.type === "cable" || link.type === "cloud" ? "stroke-[0.35]" : "stroke-[0.3]";
        return (
          <path
            key={index}
            d={shapes[index].d}
            fill="none"
            strokeDasharray={link.type === "cable" ? "1.2 0.8" : link.type === "cloud" ? "0.4 0.8" : undefined}
            className={`${TYPE_CLASS[link.type]} ${style} ${cut ? "stroke-danger opacity-60" : active ? "opacity-90" : "opacity-35"}`}
          />
        );
      })}
      {sim &&
        running &&
        !still &&
        links.map((link, index) => {
          if (link.type === "sat" || sim.cut[index]) return null;
          const factor = P.route[link.type];
          if (!factor) return null;
          const blockedHere = link.type !== "land" && (sim.blocked[link.a] || sim.blocked[link.b]) && !P.backup;
          if (blockedHere) return null;
          const sources = [
            [link.a, shapes[index].forward],
            [link.b, shapes[index].backward],
          ];
          return sources.flatMap(([from, parts]) =>
            sim.a[from] > 0.05
              ? parts.map((path, k) => (
                  <circle key={`${index}-${from}-${k}`} r="0.7" className={DOT_CLASS[link.type]}>
                    <animateMotion dur={`${2.2 + (link.a + link.b) * 0.05}s`} repeatCount="indefinite" path={path} />
                  </circle>
                ))
              : [],
          );
        })}
      {regions.map((region, i) => {
        const r = 1.7 + region.pop * 1.3;
        const a = sim?.a[i] ?? 0;
        const d = sim?.d[i] ?? 0;
        const w = sim?.w[i] ?? 0;
        const blocked = sim?.blocked[i];
        const label = `${region.name}${sim ? `, 채택 ${Math.round(a * 100)}%, 의존 ${Math.round(d * 100)}%, 경계 ${Math.round(w * 100)}%${blocked ? ", 해외 연결 차단 중" : ""}` : ""}`;
        return (
          <g
            key={region.id}
            transform={`translate(${region.x} ${region.y})`}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={selected === i}
            className="group cursor-pointer outline-none"
            onClick={() => onSelect(i)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(i);
              }
            }}
          >
            <circle r={r + 1.8} className="fill-none stroke-primary stroke-[0.5] opacity-0 group-focus-visible:opacity-100" />
            {selected === i && <circle r={r + 1.3} className="fill-none stroke-primary stroke-[0.4]" strokeDasharray="0.8 0.6" />}
            <circle r={r} className="fill-white stroke-slate-400 stroke-[0.3]" />
            <circle r={r} className="fill-primary" fillOpacity={a} />
            <circle r={r * 0.5} className="fill-amber-400" fillOpacity={d} />
            <circle r={r + 0.7} fill="none" className="stroke-danger stroke-[0.55]" strokeDasharray={`${w * 100} 100`} pathLength="100" transform="rotate(-90)" />
            {blocked && <circle r={r + 1.1} fill="none" className="stroke-danger stroke-[0.3]" strokeDasharray="0.5 0.5" />}
            {sim && levels.sat && region.net < 0.5 && a > 0 && <circle r={r + 1.8} fill="none" className="stroke-sky-500 stroke-[0.25]" strokeDasharray="0.3 0.5" />}
            <text y={r + 2.6} textAnchor="middle" fontSize="1.9" fontWeight="700" className="fill-slate-700">
              {region.name}
            </text>
          </g>
        );
      })}
      {sim &&
        links.map((link, index) => {
          if (!sim.cut[index]) return null;
          const a = regions[link.a];
          const b = regions[link.b];
          return (
            <text key={`cut-${index}`} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} textAnchor="middle" fontSize="3" fontWeight="900" className="fill-danger-strong">
              ✕
            </text>
          );
        })}
    </svg>
  );
}