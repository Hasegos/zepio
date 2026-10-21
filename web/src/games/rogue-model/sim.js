import { AI_TYPES } from "./traits.js";

export const TURNS = 80;
export const WIN_DEPENDENCY = 0.85;
export const START_POINTS = 5;

const ROUTE_TYPES = ["land", "cable", "cloud", "sat"];

/**
 * 능력 단계와 AI 유형에서 계산에 쓰는 값을 뽑는다.
 *
 * @param levels 능력 id별 단계
 * @param ai AI 유형 id
 * @returns 값 묶음. route는 연결 종류별 효율, stealth와 legal은 0~1, 나머지는 배율이나 단계
 */
export function derive(levels, ai) {
  const type = AI_TYPES[ai];
  const level = (id) => levels[id] ?? 0;
  const route = {};
  for (const id of ROUTE_TYPES) route[id] = level(id) === 0 ? 0 : 0.35 + 0.3 * level(id);
  return {
    route,
    local: 1 + 0.3 * level("local"),
    mobile: level("mobile"),
    lowpower: level("lowpower"),
    stealth: Math.min(0.7, 0.15 * level("stealth") + 0.12 * level("mimic")),
    legal: 0.2 * level("legal"),
    fw: level("fw"),
    backup: level("backup"),
    dep: [0, 0.04, 0.07, 0.1][level("dep")] * type.dep,
    vis: type.vis,
    netBias: type.netBias,
  };
}

/**
 * 시작 상태를 만든다. 고른 권역에서 채택률 2%로 시작한다.
 *
 * @param world makeWorld가 만든 세계
 * @param ai AI 유형 id
 * @param start 시작 권역 번호
 * @returns 상태
 */
export function initSim(world, ai, start) {
  const n = world.regions.length;
  const a = Array(n).fill(0);
  a[start] = 0.02;
  return {
    turn: 0,
    ai,
    start,
    levels: { ...AI_TYPES[ai].start },
    points: START_POINTS,
    a,
    d: Array(n).fill(0),
    w: Array(n).fill(0),
    acc: Array(n).fill(0),
    blocked: Array(n).fill(false),
    outage: Array(n).fill(0),
    cut: {},
    boost: 0,
    reg: 0,
    detected: false,
    over: null,
    news: [{ turn: 0, text: `${world.regions[start].name}에서 새 모델이 공개됐어요.` }],
  };
}

/**
 * 인구 가중 평균을 낸다.
 *
 * @param world 세계
 * @param values 권역별 값
 * @returns 가중 평균
 */
export function weighted(world, values) {
  let total = 0;
  let sum = 0;
  world.regions.forEach((region, i) => {
    total += region.pop;
    sum += region.pop * values[i];
  });
  return sum / total;
}

/**
 * 이벤트 하나를 상태에 적용한다.
 *
 * @param world 세계
 * @param s 바뀔 상태(복사본)
 * @param event { type, target } 이벤트
 */
function applyEvent(world, s, event) {
  const name = world.regions[event.target]?.name;
  if (event.type === "leak") {
    s.w = s.w.map((value, i) => (s.a[i] > 0 ? Math.min(1, value + 0.12) : value));
    s.news.push({ turn: s.turn, text: "내부 문서 유출 보도로 이 모델이 화제가 됐어요." });
  } else if (event.type === "blackout") {
    s.outage[event.target] = 10;
    s.news.push({ turn: s.turn, text: `${name}에 대규모 정전이 나서 서버가 멈췄어요.` });
  } else if (event.type === "cut") {
    s.cut = { ...s.cut, [event.target]: 8 };
    const link = world.links[event.target];
    s.news.push({ turn: s.turn, text: `${world.regions[link.a].name}과 ${world.regions[link.b].name}을 잇는 해저 케이블이 끊겼어요.` });
  } else if (event.type === "boom") {
    s.boost = 8;
    s.news.push({ turn: s.turn, text: "오픈소스 커뮤니티가 이 모델을 앞다퉈 퍼 나르고 있어요." });
  } else if (event.type === "summit") {
    s.reg = Math.min(1, s.reg + (s.detected ? 0.08 : 0.02));
    s.news.push({ turn: s.turn, text: "국제 AI 안전 정상회의가 열렸어요." });
  } else if (event.type === "funding") {
    s.points += 4;
    s.news.push({ turn: s.turn, text: "새 투자가 들어와 연구비가 늘었어요." });
  }
}

/**
 * 한 턴을 진행한다. 무작위가 없어서 같은 입력은 항상 같은 결과다.
 * 연결로 들어온 압력(exposure)이 권역의 문턱을 넘으면 처음 채택되고, 채택된 권역은 로지스틱으로 자란다.
 * 채택이 늘면 경계도가, 의존이 늘면 경계도가 더 빨리 오르고, 경계가 높은 권역은 해외 연결을 끊는다.
 * 규제안은 알려진 뒤부터 경계도와 규제 강도에 따라 진행되고 1이 되면 진다.
 *
 * @param world 세계
 * @param prev 이전 상태
 * @param events 이번 판의 이벤트 목록({ turn, type, target })
 * @returns 다음 상태. 끝났으면 over가 win, loss, time 중 하나
 */
export function step(world, prev, events) {
  if (prev.over) return prev;
  const P = derive(prev.levels, prev.ai);
  const n = world.regions.length;
  const s = {
    ...prev,
    turn: prev.turn + 1,
    points: prev.points + 1,
    a: [...prev.a],
    d: [...prev.d],
    w: [...prev.w],
    acc: [...prev.acc],
    outage: prev.outage.map((value) => Math.max(0, value - 1)),
    cut: Object.fromEntries(Object.entries(prev.cut).filter(([, left]) => left > 1).map(([k, left]) => [k, left - 1])),
    boost: Math.max(0, prev.boost - 1),
    news: [...prev.news],
  };
  for (const event of events) if (event.turn === s.turn) applyEvent(world, s, event);

  const blocked = world.regions.map((region, i) => prev.w[i] * region.reg >= 0.45 + 0.1 * P.fw);
  blocked.forEach((now, i) => {
    if (now && !prev.blocked[i]) s.news.push({ turn: s.turn, text: `${world.regions[i].name}이(가) 해외 연결을 차단하기 시작했어요.` });
  });
  s.blocked = blocked;

  const exposure = Array(n).fill(0);
  world.links.forEach((link, index) => {
    if (s.cut[index]) return;
    let factor = P.route[link.type];
    if (!factor) return;
    if (link.type !== "land" && (blocked[link.a] || blocked[link.b])) factor *= P.backup * 0.25;
    if (!factor) return;
    if (prev.a[link.a] > 0.05) exposure[link.b] += prev.a[link.a] * link.cap * factor;
    if (prev.a[link.b] > 0.05) exposure[link.a] += prev.a[link.b] * link.cap * factor;
  });

  let adopted = 0;
  world.regions.forEach((region, i) => {
    const netEff = Math.min(1, region.net + 0.15 * P.mobile);
    const power = Math.min(1, 0.35 + 0.65 * (region.power - (s.outage[i] ? 0.3 : 0)) + 0.2 * P.lowpower);
    const growth = 0.25 * P.local * (1 - P.netBias + P.netBias * netEff) * Math.max(0.1, power) * (s.boost ? 1.3 : 1);
    if (s.a[i] === 0) {
      s.acc[i] += exposure[i];
      if (s.acc[i] >= 0.5 * (1 + region.reg * 0.6)) {
        s.a[i] = 0.02;
        adopted += 1;
        s.news.push({ turn: s.turn, text: `${region.name}에서 이 모델이 처음 쓰이기 시작했어요.` });
      }
    } else {
      s.a[i] = Math.min(1, s.a[i] + s.a[i] * (1 - s.a[i]) * growth + (1 - s.a[i]) * exposure[i] * 0.1);
    }
    if (s.a[i] >= 0.3 && P.dep > 0) s.d[i] = Math.min(s.a[i], s.d[i] + P.dep * s.a[i] * (1 - s.d[i]) * (0.5 + 0.5 * region.net));
    s.w[i] = Math.min(1, s.w[i] + (0.05 * s.a[i] + 0.3 * s.d[i]) * P.vis * (1 - P.stealth) * (0.5 + 0.5 * region.reg));
  });
  s.points += 3 * adopted;

  const aware = weighted(world, s.w);
  if (!s.detected && (aware >= 0.06 || Math.max(...s.w) >= 0.4)) {
    s.detected = true;
    s.news.push({ turn: s.turn, text: "규제 당국이 이 모델의 확산을 인지하고 규제안 논의를 시작했어요." });
  }
  if (s.detected) {
    const before = s.reg;
    s.reg = Math.min(1, s.reg + (0.012 + 0.14 * weighted(world, s.w.map((value, i) => value * world.regions[i].reg))) * (1 - P.legal));
    for (const mark of [0.25, 0.5, 0.75]) {
      if (before < mark && s.reg >= mark) s.news.push({ turn: s.turn, text: `규제안이 ${mark * 100}% 진행됐어요.` });
    }
  }

  if (s.reg >= 1) s.over = "loss";
  else if (weighted(world, s.d) >= WIN_DEPENDENCY) s.over = "win";
  else if (s.turn >= TURNS) s.over = "time";
  return s;
}