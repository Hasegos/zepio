import { makeRng } from "../_shared/rng.js";
import { analyze, EXTS, NO_FX, xyOf } from "./engine.js";
import { GRID_HEIGHT, GRID_WIDTH, tileOf } from "./layout.js";

export const DISASTERS = {
  surge: { name: "트래픽 폭주", warn: 10, live: 45 },
  blackout: { name: "정전", warn: 10, live: 40 },
  fire: { name: "화재", warn: 8, live: 45 },
};
const LEVELS = {
  normal: { gap: [200, 380], surge: { outputMul: 2, heatMul: 1.3, demandMul: 1.5 }, capMul: 0.5, spread: 0.12, breakAfter: 7 },
  hard: { gap: [90, 200], surge: { outputMul: 2.5, heatMul: 1.5, demandMul: 2 }, capMul: 0.3, spread: 0.2, breakAfter: 5 },
};
const GRACE_LIFETIME = 1000;
const SPRINKLER_DELAY = 2;
const STRAIGHT = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const WARN_TEXT = {
  surge: "트래픽 폭주가 몰려와요! 수익이 크게 늘지만 허브 대역폭과 열이 한계를 시험받아요.",
  blackout: "정전 경보! 곧 전력 상한이 크게 떨어져요. 배터리 설비가 버텨 줘요.",
  fire: "화재 경보! 곧 뜨거운 서버에서 불이 나요. 소화기가 있으면 자동으로 꺼요.",
};

/**
 * 재난 진행 상태를 새로 만든다. 저장하지 않고 접속할 때마다 새로 시작한다.
 *
 * @param seed 난수 시드
 * @returns { seed, n, wait, event } wait는 다음 재난까지 남은 초(아직 안 정했으면 null), event는 진행 중인 재난
 */
export function newDisasters(seed = Date.now()) {
  return { seed: seed >>> 0, n: 0, wait: null, event: null };
}

/**
 * 진행 중인 재난이 센터에 주는 효과를 구한다. 경고 중에는 효과가 없고, 화재는 불난 칸의 서버가 꺼진다.
 *
 * @param state 게임 상태
 * @param ev 재난 진행 상태
 * @returns analyze에 넘길 효과
 */
export function effectsOf(state, ev) {
  const e = ev.event;
  const level = LEVELS[state.difficulty];
  if (!e || !level) return NO_FX;
  if (e.kind === "fire") {
    const tiles = Object.keys(e.burning).map(Number);
    return tiles.length ? { ...NO_FX, burning: new Set(tiles) } : NO_FX;
  }
  if (e.phase !== "live") return NO_FX;
  return e.kind === "surge" ? { ...NO_FX, ...level.surge } : { ...NO_FX, capMul: level.capMul };
}

/**
 * 진행 중인 재난을 화면에 보일 문구로 바꾼다.
 *
 * @param state 게임 상태
 * @param ev 재난 진행 상태
 * @returns { kind, phase, title, text, left, tone } 재난이 없으면 null
 */
export function describeEvent(state, ev) {
  const e = ev.event;
  const level = LEVELS[state.difficulty];
  if (!e || !level) return null;
  const name = DISASTERS[e.kind].name;
  const left = Math.max(0, Math.ceil(e.left));
  if (e.phase === "warn") return { kind: e.kind, phase: "warn", title: `${name} 경보 ${left}초 전`, text: WARN_TEXT[e.kind], left, tone: "warn" };
  const live = {
    surge: `수익 ×${level.surge.outputMul}, 열 ×${level.surge.heatMul}, 대역폭 수요 ×${level.surge.demandMul}. 허브와 냉각이 버티는지 지켜보세요.`,
    blackout: `전력 상한이 ${Math.round(level.capMul * 100)}%로 떨어졌어요. 배터리 설비가 모자란 만큼 수익이 줄어요.`,
    fire: `불난 칸 ${Object.keys(e.burning).length}곳. 불난 칸을 누르면 로봇이 가서 꺼요. 서버는 ${level.breakAfter}초 타면 고장나요.`,
  };
  return { kind: e.kind, phase: "live", title: `${name} 중`, text: live[e.kind], left, tone: "bad" };
}

/**
 * 다음에 올 재난 종류를 고른다. 폭주와 정전이 흔하고, 서버가 있으면 화재도 온다.
 *
 * @param state 게임 상태
 * @param roll 0 이상 1 미만의 수를 돌려주는 함수
 * @returns 재난 종류, 올 수 없으면 null
 */
function pickKind(state, roll) {
  const hasServer = state.cells.some((cell) => cell && cell.kind === "server" && !cell.broken);
  const weights = [["surge", 3], ["blackout", 2], ["fire", hasServer ? 2 : 0]];
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let r = roll() * total;
  for (const [kind, w] of weights) {
    if (r < w) return kind;
    r -= w;
  }
  return "surge";
}

/**
 * 가장 뜨거운 쪽으로 기울여 불이 시작할 서버를 고른다.
 *
 * @param state 게임 상태
 * @param roll 난수 함수
 * @returns 칸 번호, 서버가 없으면 -1
 */
function pickIgnition(state, roll) {
  const analysis = analyze(state);
  const servers = [];
  state.cells.forEach((cell, tile) => {
    if (cell && cell.kind === "server" && !cell.broken) servers.push([tile, analysis.heat[tile] + 1]);
  });
  const total = servers.reduce((sum, [, w]) => sum + w, 0);
  let r = roll() * total;
  for (const [tile, w] of servers) {
    if (r < w) return tile;
    r -= w;
  }
  return servers.length ? servers[servers.length - 1][0] : -1;
}

/**
 * 재난을 끝내고 기록을 남긴 뒤 다음 재난까지 기다릴 시간을 정한다.
 *
 * @param state 게임 상태
 * @param next 복사한 재난 진행 상태
 * @param level 난이도 설정
 * @param roll 난수 함수
 * @param notes 알림 목록
 * @returns 기록을 갱신한 게임 상태
 */
function finish(state, next, level, roll, notes) {
  const e = next.event;
  const stats = { ...state.stats, [e.kind]: state.stats[e.kind] + 1 };
  if (e.kind === "fire" && e.damage === 0) stats.saved += 1;
  next.event = null;
  next.wait = level.gap[0] + roll() * (level.gap[1] - level.gap[0]);
  const name = DISASTERS[e.kind].name;
  const tail = e.kind === "fire" ? (e.damage === 0 ? " 피해 없이 막았어요!" : ` 서버 ${e.damage}대가 고장났어요.`) : "";
  notes.push({ tone: e.kind === "fire" && e.damage > 0 ? "bad" : "good", text: `${name}이 끝났어요.${tail}` });
  return { ...state, stats };
}

/**
 * 불을 한 걸음 진행한다. 스프링클러가 닿은 불을 끄고, 오래 탄 서버를 고장내고, 이웃 시설로 번진다.
 *
 * @param state 게임 상태
 * @param e 진행 중인 화재(복사본이라 바꿔도 된다)
 * @param level 난이도 설정
 * @param seconds 흘릴 시간(초)
 * @param roll 난수 함수
 * @returns 고장을 반영한 게임 상태
 */
function burn(state, e, level, seconds, roll) {
  let cells = null;
  for (const key of Object.keys(e.burning)) e.burning[key] += seconds;
  state.cells.forEach((cell, tile) => {
    if (!cell || cell.kind !== "ext") return;
    const { reach } = EXTS[cell.level];
    const [x, y] = xyOf(tile);
    for (const key of Object.keys(e.burning)) {
      const [kx, ky] = xyOf(Number(key));
      if (e.burning[key] >= SPRINKLER_DELAY && Math.max(Math.abs(kx - x), Math.abs(ky - y)) <= reach) delete e.burning[key];
    }
  });
  for (const key of Object.keys(e.burning)) {
    if (e.burning[key] < level.breakAfter) continue;
    const cell = state.cells[Number(key)];
    if (cell.kind === "server" && !cell.broken) {
      cells ??= [...state.cells];
      cells[Number(key)] = { ...cell, broken: true, stress: 0 };
      e.damage += 1;
    }
    delete e.burning[key];
  }
  const lit = Object.keys(e.burning).map(Number);
  for (const tile of lit) {
    const [x, y] = xyOf(tile);
    for (const [dx, dy] of STRAIGHT) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_WIDTH || ny >= GRID_HEIGHT) continue;
      const other = tileOf(nx, ny);
      if (state.cells[other] && e.burning[other] === undefined && roll() < level.spread * seconds) e.burning[other] = 0;
    }
  }
  return cells ? { ...state, cells } : state;
}

/**
 * 재난을 한 걸음 진행한다. 다음 재난을 기다리다 때가 되면 경고를 띄우고, 경고가 끝나면 재난이 시작되며, 끝나면 기록을 남긴다.
 * 평화 난이도이거나 초반(누적 수익이 적을 때)에는 재난이 오지 않는다. 한 번에 1초 안쪽으로 불러야 한다.
 *
 * @param state 게임 상태
 * @param ev 재난 진행 상태
 * @param seconds 흘릴 시간(초)
 * @returns { state, ev, notes } notes는 { tone, text } 알림 목록
 */
export function stepDisasters(state, ev, seconds) {
  const level = LEVELS[state.difficulty];
  if (!level) return { state, ev: ev.event || ev.wait !== null ? { ...ev, event: null, wait: null } : ev, notes: [] };
  if (!ev.event && state.lifetime < GRACE_LIFETIME) return { state, ev, notes: [] };
  const next = { ...ev, event: ev.event ? { ...ev.event, burning: { ...ev.event.burning } } : null };
  const notes = [];
  const roll = () => makeRng((next.seed + Math.imul(++next.n, 2654435761)) >>> 0)();
  if (!next.event) {
    if (next.wait === null) next.wait = level.gap[0] + roll() * (level.gap[1] - level.gap[0]);
    next.wait -= seconds;
    if (next.wait <= 0) {
      const kind = pickKind(state, roll);
      next.event = { kind, phase: "warn", left: DISASTERS[kind].warn, burning: {}, damage: 0 };
      next.wait = null;
      notes.push({ tone: "bad", text: WARN_TEXT[kind] });
    }
    return { state, ev: next, notes };
  }
  const e = next.event;
  let cur = state;
  e.left -= seconds;
  if (e.phase === "warn") {
    if (e.left > 0) return { state, ev: next, notes };
    e.phase = "live";
    e.left = DISASTERS[e.kind].live;
    if (e.kind === "fire") {
      const tile = pickIgnition(state, roll);
      if (tile < 0) {
        next.event = null;
        next.wait = level.gap[0] + roll() * (level.gap[1] - level.gap[0]);
        return { state, ev: next, notes };
      }
      e.burning[tile] = 0;
      notes.push({ tone: "bad", text: "불이 났어요! 불난 칸을 눌러 로봇이 끄게 하세요." });
    } else {
      notes.push({ tone: "bad", text: `${DISASTERS[e.kind].name}이 시작됐어요!` });
    }
  }
  if (e.kind === "fire") {
    cur = burn(cur, e, level, seconds, roll);
    if (Object.keys(e.burning).length === 0 || e.left <= 0) {
      e.burning = {};
      cur = finish(cur, next, level, roll, notes);
    }
  } else if (e.left <= 0) {
    cur = finish(cur, next, level, roll, notes);
  }
  return { state: cur, ev: next, notes };
}

/**
 * 로봇이 소화기로 불을 끈다. 누른 칸과 둘러싼 여덟 칸의 불이 꺼진다.
 *
 * @param ev 재난 진행 상태
 * @param tile 불난 칸 번호
 * @returns 불을 끈 재난 진행 상태
 */
export function putOut(ev, tile) {
  const e = ev.event;
  if (!e || e.kind !== "fire") return ev;
  const burning = { ...e.burning };
  const [x, y] = xyOf(tile);
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (x + dx >= 0 && y + dy >= 0 && x + dx < GRID_WIDTH && y + dy < GRID_HEIGHT) delete burning[tileOf(x + dx, y + dy)];
    }
  }
  return { ...ev, event: { ...e, burning } };
}

/**
 * 지금 불난 칸 번호 목록을 구한다.
 *
 * @param ev 재난 진행 상태
 * @returns 칸 번호 배열
 */
export function burningTiles(ev) {
  return ev.event && ev.event.kind === "fire" ? Object.keys(ev.event.burning).map(Number) : [];
}