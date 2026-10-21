import { useMemo } from "react";
import { COUNTRY_PATHS } from "./countries.js";
import { derive } from "./sim.js";
import { MAP_HEIGHT, MAP_WIDTH } from "./world.js";

const LINE_CLASS = {
  land: "stroke-slate-400 stroke-[0.8]",
  cable: "stroke-sky-400 stroke-[1.1]",
  cloud: "stroke-violet-300 stroke-[0.9]",
};
const AIRPLANE = "M5 0 L-3.5 -3.2 L-1.8 0 L-3.5 3.2 Z";

/**
 * 연결 하나를 그릴 길을 만든다. 해저 케이블과 클라우드 연결은 휘어서 바다와 하늘을 가로지르고,
 * 지도 양끝을 가로지르는 연결은 가장자리로 이어 그린다.
 *
 * @param link { a, b, type }
 * @param regions 권역 목록
 * @param index 연결 번호(휘는 방향을 정하는 데 쓴다)
 * @returns { d, forward, backward, mark } d는 선, forward와 backward는 알갱이가 달릴 { path, length } 목록(a에서 b로, b에서 a로), mark는 끊김 표시 좌표 [x, y]
 */
function pathsOf(link, regions, index) {
  const a = regions[link.a];
  const b = regions[link.b];
  if (Math.abs(a.x - b.x) > MAP_WIDTH / 2) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    const y = Math.round((left.y + right.y) / 2);
    const lengthLeft = left.x;
    const lengthRight = MAP_WIDTH - right.x;
    const toEdge = [
      { path: `M${left.x} ${left.y} L0 ${y}`, length: lengthLeft },
      { path: `M${MAP_WIDTH} ${y} L${right.x} ${right.y}`, length: lengthRight },
    ];
    const fromEdge = [
      { path: `M0 ${y} L${left.x} ${left.y}`, length: lengthLeft },
      { path: `M${right.x} ${right.y} L${MAP_WIDTH} ${y}`, length: lengthRight },
    ];
    const aIsLeft = a === left;
    return {
      d: `M${left.x} ${left.y} L0 ${y} M${MAP_WIDTH} ${y} L${right.x} ${right.y}`,
      forward: aIsLeft ? toEdge : fromEdge,
      backward: aIsLeft ? fromEdge : toEdge,
      mark: [lengthLeft < lengthRight ? 14 : MAP_WIDTH - 14, y],
    };
  }
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (link.type === "land") {
    const line = (from, to) => `M${from.x} ${from.y} L${to.x} ${to.y}`;
    return { d: line(a, b), forward: [{ path: line(a, b), length }], backward: [{ path: line(b, a), length }], mark: [(a.x + b.x) / 2, (a.y + b.y) / 2] };
  }
  const bend = (link.type === "cloud" ? 0.3 : 0.16) * length * (index % 2 === 0 ? 1 : -1);
  const cx = (a.x + b.x) / 2 + (-(b.y - a.y) / length) * bend;
  const cy = (a.y + b.y) / 2 + ((b.x - a.x) / length) * bend;
  const curve = (from, to) => `M${from.x} ${from.y} Q${cx} ${cy} ${to.x} ${to.y}`;
  const arc = length * 1.1;
  return {
    d: curve(a, b),
    forward: [{ path: curve(a, b), length: arc }],
    backward: [{ path: curve(b, a), length: arc }],
    mark: [0.25 * a.x + 0.5 * cx + 0.25 * b.x, 0.25 * a.y + 0.5 * cy + 0.25 * b.y],
  };
}

/**
 * 연결 위를 달리는 탈것 하나를 그린다. 해저 케이블은 빛 알갱이, 클라우드는 비행기, 육상은 작은 점이다.
 *
 * @param props.type 연결 종류
 * @param props.path 달릴 길
 * @param props.length 길의 대략적인 길이
 * @param props.offset 시작 어긋남(0~1)
 */
function Vehicle({ type, path, length, offset }) {
  const dur = Math.max(2, length / 110);
  const motion = <animateMotion dur={`${dur}s`} begin={`-${(offset * dur).toFixed(2)}s`} repeatCount="indefinite" path={path} rotate={type === "cloud" ? "auto" : "0"} />;
  if (type === "cloud") {
    return (
      <path d={AIRPLANE} className="fill-white">
        {motion}
      </path>
    );
  }
  if (type === "cable") {
    return (
      <g>
        <circle r="5" className="fill-sky-300 opacity-35" />
        <circle r="2.2" className="fill-white" />
        {motion}
      </g>
    );
  }
  return (
    <circle r="1.6" className="fill-slate-200">
      {motion}
    </circle>
  );
}

/**
 * 세계 지도를 그린다. 권역은 나라 윤곽을 묶은 덩어리로 칠하고(채택은 보라색, 의존은 빗금, 경계도는 붉은 윤곽),
 * 연결 위에서는 AI가 해저 케이블에서는 빛 알갱이로, 클라우드에서는 비행기로, 육상에서는 점으로 옮겨 다닌다.
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
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="group" aria-label="세계 지도. 권역을 눌러 고릅니다" className="block w-full min-w-[680px]">
        <defs>
          <pattern id="rm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" className="fill-amber-300/25" />
            <rect width="3" height="7" className="fill-amber-300" />
          </pattern>
        </defs>
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="fill-slate-800" />
        {links.map((link, index) => {
          if (link.type === "sat") return null;
          if (link.type === "cloud" && !levels.cloud) return null;
          const cut = sim?.cut[index];
          const factor = P?.route[link.type] ?? 0;
          const active = sim && Math.max(sim.a[link.a], sim.a[link.b]) * link.cap * factor > 0.02 && !cut;
          return (
            <path
              key={index}
              d={shapes[index].d}
              fill="none"
              strokeDasharray={link.type === "cable" ? "5 4" : link.type === "cloud" ? "2 5" : undefined}
              className={`${LINE_CLASS[link.type]} ${cut ? "stroke-danger opacity-80" : active ? "opacity-90" : "opacity-40"}`}
            />
          );
        })}
        {regions.map((region, i) => {
          const a = sim?.a[i] ?? 0;
          const d = sim?.d[i] ?? 0;
          const w = sim?.w[i] ?? 0;
          const path = COUNTRY_PATHS[region.id];
          const label = `${region.name}${sim ? `, 채택 ${Math.round(a * 100)}%, 의존 ${Math.round(d * 100)}%, 경계 ${Math.round(w * 100)}%${sim.blocked[i] ? ", 해외 연결 차단 중" : ""}` : ""}`;
          return (
            <g
              key={region.id}
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
              <path d={path} className="fill-slate-600 stroke-slate-400 stroke-[0.5]" />
              {a > 0 && <path d={path} className="fill-violet-400" fillOpacity={0.2 + 0.75 * a} />}
              {d > 0.02 && <path d={path} fill="url(#rm-hatch)" fillOpacity={Math.min(1, d * 1.2)} />}
              <path d={path} className="fill-white opacity-0 group-hover:opacity-15" />
              {w > 0.01 && <path d={path} fill="none" className="stroke-danger" strokeWidth={0.8 + 3.2 * w} strokeOpacity={Math.min(1, 0.25 + w)} strokeLinejoin="round" />}
              {sim?.blocked[i] && <path d={path} fill="none" className="stroke-white" strokeWidth="1.4" strokeDasharray="4 3" />}
              {selected === i && <path d={path} fill="none" className="stroke-white" strokeWidth="2" />}
              <path d={path} fill="none" className="stroke-primary stroke-[3] opacity-0 group-focus-visible:opacity-100" />
              <circle cx={region.x} cy={region.y} r="4.5" className="fill-white stroke-slate-900 stroke-[1.5]" />
              {sim && levels.sat && region.net < 0.5 && a > 0 && <circle cx={region.x} cy={region.y} r="11" fill="none" className="stroke-sky-300 stroke-[1]" strokeDasharray="2 3" />}
              <text x={region.x} y={region.y + 15} textAnchor="middle" fontSize="11" fontWeight="700" className="fill-white stroke-slate-900 stroke-[3] [paint-order:stroke]">
                {region.name}
              </text>
            </g>
          );
        })}
        {sim &&
          running &&
          !still &&
          links.map((link, index) => {
            if (link.type === "sat" || sim.cut[index]) return null;
            if (!P.route[link.type]) return null;
            if (link.type !== "land" && (sim.blocked[link.a] || sim.blocked[link.b]) && !P.backup) return null;
            const flow = P.route[link.type] * link.cap;
            const ways = [
              [link.a, shapes[index].forward],
              [link.b, shapes[index].backward],
            ];
            return ways.flatMap(([from, parts], way) =>
              sim.a[from] > 0.05
                ? parts.flatMap((part, k) =>
                    Array.from({ length: flow > 0.5 ? 2 : 1 }, (_, n) => (
                      <Vehicle key={`${index}-${way}-${k}-${n}`} type={link.type} path={part.path} length={part.length} offset={(((index * 7 + way * 3 + n * 5) % 10) / 10 + n * 0.5) % 1} />
                    )),
                  )
                : [],
            );
          })}
        {sim &&
          links.map((link, index) => {
            if (!sim.cut[index]) return null;
            const [x, y] = shapes[index].mark;
            return (
              <text key={`cut-${index}`} x={x} y={y + 5} textAnchor="middle" fontSize="16" fontWeight="900" className="fill-danger stroke-slate-900 stroke-[2] [paint-order:stroke]">
                ✕
              </text>
            );
          })}
      </svg>
    </div>
  );
}