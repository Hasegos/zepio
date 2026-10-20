import { AREA, GRID_HEIGHT, GRID_WIDTH, inLand, LANDS, START, TERMINAL_TILE, tileOf } from "./layout.js";
import { reachable } from "./pathfind.js";

export const TIERS = [
  null,
  { name: "소형 서버", cost: 15, output: 1, heat: 1, power: 1, demand: 1 },
  { name: "GPU 서버", cost: 200, output: 4.4, heat: 4, power: 3, demand: 3 },
  { name: "클러스터", cost: 3000, output: 22, heat: 14, power: 8, demand: 8 },
  { name: "하이퍼스케일 랙", cost: 60000, output: 150, heat: 30, power: 24, demand: 20 },
];
export const COOLERS = [
  null,
  { name: "팬 냉각기", cost: 80, reach: 2, cool: 6, power: 1 },
  { name: "수냉 냉각기", cost: 400, reach: 3, cool: 9, power: 2 },
  { name: "액침 냉각기", cost: 2000, reach: 4, cool: 12, power: 3 },
];
export const HUBS = [
  null,
  { name: "공유기", cost: 40, cap: 6, reach: 3, power: 1 },
  { name: "스위치", cost: 600, cap: 30, reach: 5, power: 2 },
  { name: "코어 라우터", cost: 8000, cap: 150, reach: 7, power: 4 },
  { name: "백본 노드", cost: 100000, cap: 600, reach: 9, power: 8 },
];
export const GENS = [
  null,
  { name: "태양광 패널", cost: 100, cap: 6, heat: 0 },
  { name: "디젤 발전기", cost: 600, cap: 24, heat: 3 },
  { name: "가스 터빈", cost: 5000, cap: 100, heat: 8 },
  { name: "핵융합로", cost: 60000, cap: 400, heat: 14 },
];
export const KINDS = {
  server: { label: "서버", levels: TIERS, growth: 1.07 },
  cooler: { label: "냉각기", levels: COOLERS, growth: 1.06 },
  hub: { label: "허브", levels: HUBS, growth: 1.18 },
  gen: { label: "발전기", levels: GENS, growth: 1.1 },
};
export const GRADES = [
  { name: "서버실", min: 0 },
  { name: "소규모 센터", min: 2000 },
  { name: "지역 센터", min: 70000 },
  { name: "클라우드 센터", min: 2000000 },
  { name: "하이퍼스케일 센터", min: 40000000 },
];

export const SAFE_TEMP = 10;
export const LIMIT_TEMP = 20;
export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const MAX_STEP = 1;
export const BASE_POWER = 4;
const HEAT_FALL = [1, 0.5, 0.25];
const MIN_RATIO = 0.4;
const UNLINKED = 0.3;
const SYNERGY = 0.06;
const HUB_FALLOFF = 0.5;
const REFUND = 0.5;
const REPAIR_RATE = 0.1;
const STRESS_UP = 0.04;
const STRESS_DOWN = 0.05;
const START_COINS = 30;
const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi"];
const STRAIGHT = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * 새 시설 한 칸을 만든다.
 *
 * @param kind 시설 종류(server, cooler, hub, gen)
 * @param level 단계
 * @returns 칸 내용
 */
function makeCell(kind, level) {
  return { kind, level, stress: 0, broken: false };
}

/**
 * 막 시작한 센터의 상태를 만든다. 공유기 하나와 소형 서버 하나가 먼저 놓여 있다.
 *
 * @returns 게임 상태
 */
export function newState() {
  const cells = Array(AREA).fill(null);
  cells[tileOf(8, 7)] = makeCell("hub", 1);
  cells[tileOf(9, 7)] = makeCell("server", 1);
  return { coins: START_COINS, lifetime: 0, land: 0, cells, time: 0 };
}

/**
 * 칸 번호를 가로, 세로 칸으로 나눈다.
 *
 * @param tile 칸 번호
 * @returns [x, y]
 */
export function xyOf(tile) {
  const x = tile % GRID_WIDTH;
  return [x, (tile - x) / GRID_WIDTH];
}

/**
 * 두 칸 사이의 거리(8방향, 체비쇼프)를 구한다.
 *
 * @param a 칸 번호
 * @param b 칸 번호
 * @returns 거리
 */
function distance(a, b) {
  const [ax, ay] = xyOf(a);
  const [bx, by] = xyOf(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/**
 * 한 칸의 열 방출량을 주변 두 칸까지 퍼뜨려 더한다.
 *
 * @param heat 칸별 열 배열
 * @param tile 열을 내는 칸 번호
 * @param amount 열 방출량
 */
function addHeat(heat, tile, amount) {
  if (!amount) return;
  const [x, y] = xyOf(tile);
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_WIDTH || ny >= GRID_HEIGHT) continue;
      heat[ny * GRID_WIDTH + nx] += amount * HEAT_FALL[Math.max(Math.abs(dx), Math.abs(dy))];
    }
  }
}

/**
 * 냉각기가 닿는 칸의 열을 뺀다. 바로 옆 칸이 가장 세고 멀수록 약해진다.
 *
 * @param heat 칸별 열 배열
 * @param tile 냉각기 칸 번호
 * @param cooler 냉각기 단계 정보
 */
function addCool(heat, tile, cooler) {
  const [x, y] = xyOf(tile);
  for (let dy = -cooler.reach; dy <= cooler.reach; dy += 1) {
    for (let dx = -cooler.reach; dx <= cooler.reach; dx += 1) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      const nx = x + dx;
      const ny = y + dy;
      if (d === 0 || nx < 0 || ny < 0 || nx >= GRID_WIDTH || ny >= GRID_HEIGHT) continue;
      heat[ny * GRID_WIDTH + nx] -= cooler.cool * (1 - (d - 1) / cooler.reach);
    }
  }
}

/**
 * 온도에 따른 수익 비율을 구한다. 안전선까지는 1, 한계선에서 MIN_RATIO까지 줄어든다.
 *
 * @param temp 온도
 * @returns 0.4 이상 1 이하의 비율
 */
function thermal(temp) {
  if (temp <= SAFE_TEMP) return 1;
  if (temp >= LIMIT_TEMP) return MIN_RATIO;
  return 1 - ((1 - MIN_RATIO) * (temp - SAFE_TEMP)) / (LIMIT_TEMP - SAFE_TEMP);
}

/**
 * 서버들을 허브에 이어 붙인다. 높은 단계 서버부터 가까운 허브의 남은 대역폭을 받고, 허브가 멀수록 효율이 줄며,
 * 대역폭을 못 받은 만큼은 허브 없이 처리해 UNLINKED 효율만 낸다.
 *
 * @param servers { tile, demand } 서버 목록
 * @param hubs { tile, cap, reach } 허브 목록
 * @returns { net, links, used } net은 서버 칸 번호별 네트워크 효율, links는 { hub, server, share }, used는 허브 칸 번호별 쓴 대역폭
 */
function connect(servers, hubs) {
  const left = new Map(hubs.map((hub) => [hub.tile, hub.cap]));
  const net = new Map();
  const links = [];
  const order = [...servers].sort((a, b) => b.demand - a.demand || a.tile - b.tile);
  for (const server of order) {
    const near = hubs
      .map((hub) => ({ hub, d: distance(server.tile, hub.tile) }))
      .filter((entry) => entry.d <= entry.hub.reach)
      .sort((a, b) => a.d - b.d || a.hub.tile - b.hub.tile);
    let need = server.demand;
    let efficiency = 0;
    for (const { hub, d } of near) {
      if (need <= 0) break;
      const grant = Math.min(need, left.get(hub.tile));
      if (grant <= 0) continue;
      left.set(hub.tile, left.get(hub.tile) - grant);
      need -= grant;
      efficiency += (grant / server.demand) * (1 - (HUB_FALLOFF * (d - 1)) / hub.reach);
      links.push({ hub: hub.tile, server: server.tile, share: grant / server.demand });
    }
    net.set(server.tile, efficiency + (need / server.demand) * UNLINKED);
  }
  const used = new Map(hubs.map((hub) => [hub.tile, hub.cap - left.get(hub.tile)]));
  return { net, links, used };
}

/**
 * 위아래좌우에 붙어 있는, 같은 단계의 멀쩡한 서버 수를 센다. 하나당 수익이 6% 늘어난다.
 *
 * @param state 게임 상태
 * @param tile 서버 칸 번호
 * @returns 0 이상 4 이하의 개수
 */
export function synergyNeighbors(state, tile) {
  const cell = state.cells[tile];
  const [x, y] = xyOf(tile);
  let count = 0;
  for (const [dx, dy] of STRAIGHT) {
    if (x + dx < 0 || y + dy < 0 || x + dx >= GRID_WIDTH || y + dy >= GRID_HEIGHT) continue;
    const other = state.cells[tileOf(x + dx, y + dy)];
    if (other && other.kind === "server" && !other.broken && other.level === cell.level) count += 1;
  }
  return count;
}

/**
 * 센터의 온도, 네트워크, 전력, 수익처럼 지금 배치에서 계산되는 값을 모두 구한다.
 * 열은 서버와 발전기가 주변 두 칸까지 퍼뜨리고 냉각기가 거리에 따라 뺀다. 수익은 서버 단계 수익에
 * 온도 비율, 네트워크 효율, 이웃한 같은 단계 서버 시너지(+6%씩)를 곱하고, 전력이 모자라면 전체가 같은 비율로 준다.
 *
 * @param state 게임 상태
 * @returns { heat, outputs, net, links, hubs, income, usage, cap, efficiency, maxTemp, counts }
 */
export function analyze(state) {
  const heat = Array(AREA).fill(0);
  const servers = [];
  const hubs = [];
  const counts = { server: 0, cooler: 0, hub: 0, gen: 0 };
  let usage = 0;
  let cap = BASE_POWER;
  state.cells.forEach((cell, tile) => {
    if (!cell) return;
    counts[cell.kind] += 1;
    if (cell.broken) return;
    const spec = KINDS[cell.kind].levels[cell.level];
    if (cell.kind === "server") {
      servers.push({ tile, demand: spec.demand, spec, level: cell.level });
      usage += spec.power;
      addHeat(heat, tile, spec.heat);
    } else if (cell.kind === "cooler") {
      usage += spec.power;
      addCool(heat, tile, spec);
    } else if (cell.kind === "hub") {
      usage += spec.power;
      hubs.push({ tile, cap: spec.cap, reach: spec.reach });
    } else {
      cap += spec.cap;
      addHeat(heat, tile, spec.heat);
    }
  });
  for (let i = 0; i < AREA; i += 1) heat[i] = Math.max(0, heat[i]);
  const { net, links, used } = connect(servers, hubs);
  const efficiency = usage > cap ? cap / usage : 1;
  const outputs = Array(AREA).fill(0);
  let income = 0;
  let maxTemp = 0;
  for (const server of servers) {
    const neighbors = synergyNeighbors(state, server.tile);
    const temp = heat[server.tile];
    maxTemp = Math.max(maxTemp, temp);
    outputs[server.tile] = server.spec.output * thermal(temp) * net.get(server.tile) * (1 + SYNERGY * neighbors) * efficiency;
    income += outputs[server.tile];
  }
  return {
    heat,
    outputs,
    net,
    links,
    hubs: hubs.map((hub) => ({ tile: hub.tile, used: used.get(hub.tile), cap: hub.cap, reach: hub.reach })),
    income,
    usage,
    cap,
    efficiency,
    maxTemp,
    counts,
  };
}

/**
 * 시간을 흘려보낸다. 코인이 쌓이고, 한계 온도를 넘은 서버는 과열 게이지가 오르다 가득 차면 고장난다.
 * 한 번에 MAX_STEP초까지만 흘려보내야 계산이 정확하다.
 *
 * @param state 게임 상태
 * @param seconds 흘릴 시간(초)
 * @returns { state, breaks } breaks는 이번에 고장난 칸 번호 목록
 */
export function advance(state, seconds) {
  const analysis = analyze(state);
  const gain = analysis.income * seconds;
  const breaks = [];
  const cells = state.cells.map((cell, tile) => {
    if (!cell || cell.kind !== "server" || cell.broken) return cell;
    const over = analysis.heat[tile] - LIMIT_TEMP;
    const stress = over > 0 ? cell.stress + STRESS_UP * (over + 1) * seconds : Math.max(0, cell.stress - STRESS_DOWN * seconds);
    if (stress >= 1) {
      breaks.push(tile);
      return { ...cell, stress: 0, broken: true };
    }
    return stress === cell.stress ? cell : { ...cell, stress };
  });
  return {
    state: { ...state, coins: state.coins + gain, lifetime: state.lifetime + gain, cells, time: state.time + seconds },
    breaks,
  };
}

/**
 * 접속하지 않은 동안 쌓인 수익을 한꺼번에 계산한다. 그 사이에는 새 고장이 나지 않고 이미 난 고장은 그대로라고 보며, 최대 8시간까지만 인정한다.
 *
 * @param state 게임 상태
 * @param seconds 접속하지 않은 시간(초)
 * @returns { state, gain, seconds } seconds는 인정한 시간
 */
export function offline(state, seconds) {
  const counted = Math.max(0, Math.min(seconds, OFFLINE_CAP_SECONDS));
  const gain = analyze(state).income * counted;
  return { state: { ...state, coins: state.coins + gain, lifetime: state.lifetime + gain }, gain, seconds: counted };
}

/**
 * 한 종류 시설이 지금 몇 개 있는지 센다.
 *
 * @param state 게임 상태
 * @param kind 시설 종류
 * @returns 개수
 */
function countOf(state, kind) {
  let n = 0;
  for (const cell of state.cells) if (cell && cell.kind === kind) n += 1;
  return n;
}

/**
 * 시설을 새로 놓는 값을 구한다. 같은 종류가 많을수록 비싸진다.
 *
 * @param state 게임 상태
 * @param kind 시설 종류
 * @returns 코인
 */
export function placeCost(state, kind) {
  const info = KINDS[kind];
  return Math.ceil(info.levels[1].cost * info.growth ** countOf(state, kind));
}

/**
 * 시설을 한 단계 올리는 값을 구한다. 올릴 때는 기존 시설 값의 절반을 돌려받는다.
 *
 * @param state 게임 상태
 * @param tile 칸 번호
 * @returns 코인, 더 올릴 수 없거나 시설이 없으면 null
 */
export function upgradeCost(state, tile) {
  const cell = state.cells[tile];
  if (!cell) return null;
  const info = KINDS[cell.kind];
  const next = info.levels[cell.level + 1];
  if (!next) return null;
  const owned = countOf(state, cell.kind);
  return Math.max(1, Math.ceil(next.cost * info.growth ** (owned - 1)) - Math.floor(info.levels[cell.level].cost * REFUND));
}

/**
 * 고장난 서버를 고치는 값을 구한다.
 *
 * @param state 게임 상태
 * @param tile 칸 번호
 * @returns 코인
 */
export function repairCost(state, tile) {
  const cell = state.cells[tile];
  return Math.ceil(KINDS[cell.kind].levels[cell.level].cost * REPAIR_RATE);
}

/**
 * 시설을 철거할 때 돌려받는 코인을 구한다.
 *
 * @param state 게임 상태
 * @param tile 칸 번호
 * @returns 코인
 */
export function refundOf(state, tile) {
  const cell = state.cells[tile];
  return Math.floor(KINDS[cell.kind].levels[cell.level].cost * REFUND);
}

/**
 * 부지를 넓히는 값을 구한다.
 *
 * @param state 게임 상태
 * @returns 코인, 더 넓힐 수 없으면 null
 */
export function expandCost(state) {
  return LANDS[state.land + 1]?.cost ?? null;
}

/**
 * 로봇이 걸어 다닐 수 없는 칸(시설, 단말기, 부지 밖)의 집합을 구한다.
 *
 * @param state 게임 상태
 * @returns 칸 번호의 집합
 */
export function blockedTiles(state) {
  const blocked = new Set([TERMINAL_TILE]);
  for (let tile = 0; tile < AREA; tile += 1) {
    const [x, y] = xyOf(tile);
    if (state.cells[tile] || !inLand(state.land, x, y)) blocked.add(tile);
  }
  return blocked;
}

/**
 * 로봇이 옆까지 걸어갈 수 있는 시설 칸의 집합을 구한다. 시설을 빽빽이 막아 놓으면 안쪽 시설은 빠진다.
 *
 * @param state 게임 상태
 * @param from [x, y] 로봇이 선 칸
 * @returns 시설 칸 번호의 집합
 */
export function accessibleTiles(state, from = START) {
  const reach = reachable(blockedTiles(state), GRID_WIDTH, GRID_HEIGHT, from);
  const out = new Set();
  state.cells.forEach((cell, tile) => {
    if (!cell) return;
    const [x, y] = xyOf(tile);
    for (const [dx, dy] of STRAIGHT) {
      if (reach.has(tileOf(x + dx, y + dy))) {
        out.add(tile);
        break;
      }
    }
  });
  return out;
}

/**
 * 지금 센터의 문제를 사람이 읽을 문장으로 모은다.
 *
 * @param state 게임 상태
 * @param analysis analyze 결과
 * @param access accessibleTiles 결과
 * @returns { level, text } 목록, level은 "bad" 또는 "warn"
 */
export function diagnose(state, analysis, access) {
  const out = [];
  let trapped = 0;
  let broken = 0;
  let critical = 0;
  let warm = 0;
  let starved = 0;
  state.cells.forEach((cell, tile) => {
    if (!cell || cell.kind !== "server") return;
    if (cell.broken) {
      broken += 1;
      if (!access.has(tile)) trapped += 1;
      return;
    }
    if (analysis.heat[tile] >= LIMIT_TEMP) critical += 1;
    else if (analysis.heat[tile] > SAFE_TEMP) warm += 1;
    if (analysis.net.get(tile) < 0.5) starved += 1;
  });
  if (trapped) out.push({ level: "bad", text: `고장난 서버 ${trapped}대가 막혀서 로봇이 닿지 못해요. 주변 통로를 열어 주세요.` });
  if (broken - trapped > 0) out.push({ level: "bad", text: `고장난 서버 ${broken - trapped}대가 있어요. 로봇을 보내 고쳐 주세요.` });
  if (critical) out.push({ level: "bad", text: `서버 ${critical}대가 한계 온도예요. 곧 고장나요. 냉각기를 가까이 놓으세요.` });
  if (analysis.efficiency < 1) out.push({ level: "bad", text: `전력이 모자라 수익이 ${Math.round(analysis.efficiency * 100)}%예요. 발전기를 놓으세요.` });
  if (warm) out.push({ level: "warn", text: `서버 ${warm}대가 열 때문에 수익이 깎이고 있어요.` });
  if (starved) out.push({ level: "warn", text: `서버 ${starved}대가 허브에 제대로 연결되지 않았어요. 허브를 가까이 놓거나 더 좋은 허브로 올리세요.` });
  return out;
}

/**
 * 시설을 놓으면 어떻게 되는지 미리 계산한다. 코인과 칸 조건은 보지 않고 배치 효과만 본다.
 *
 * @param state 게임 상태
 * @param tile 칸 번호
 * @param kind 시설 종류
 * @param level 단계
 * @returns analyze 결과
 */
export function previewPlace(state, tile, kind, level = 1) {
  const cells = [...state.cells];
  cells[tile] = makeCell(kind, level);
  return analyze({ ...state, cells });
}

/**
 * 빈 칸에 시설을 놓는다.
 *
 * @param state 게임 상태
 * @param tile 칸 번호
 * @param kind 시설 종류
 * @returns { state, error }
 */
export function placeItem(state, tile, kind) {
  const [x, y] = xyOf(tile);
  if (!inLand(state.land, x, y)) return { state, error: "아직 넓히지 않은 땅이에요." };
  if (tile === TERMINAL_TILE) return { state, error: "단말기 자리예요." };
  if (state.cells[tile]) return { state, error: "이미 시설이 있어요." };
  const cost = placeCost(state, kind);
  if (state.coins < cost) return { state, error: "코인이 부족해요." };
  const cells = [...state.cells];
  cells[tile] = makeCell(kind, 1);
  return { state: { ...state, coins: state.coins - cost, cells }, error: null };
}

/**
 * 시설을 한 단계 올린다.
 *
 * @param state 게임 상태
 * @param tile 칸 번호
 * @returns { state, error }
 */
export function upgradeItem(state, tile) {
  const cell = state.cells[tile];
  if (!cell) return { state, error: "시설이 없어요." };
  if (cell.broken) return { state, error: "고장난 서버부터 고쳐 주세요." };
  const cost = upgradeCost(state, tile);
  if (cost === null) return { state, error: "이미 가장 높은 단계예요." };
  if (state.coins < cost) return { state, error: "코인이 부족해요." };
  const cells = [...state.cells];
  cells[tile] = { ...cell, level: cell.level + 1 };
  return { state: { ...state, coins: state.coins - cost, cells }, error: null };
}

/**
 * 고장난 서버를 고친다. 로봇이 시설 옆까지 걸어갈 수 있어야 한다.
 *
 * @param state 게임 상태
 * @param tile 칸 번호
 * @param from [x, y] 로봇이 선 칸
 * @returns { state, error }
 */
export function repairItem(state, tile, from = START) {
  const cell = state.cells[tile];
  if (!cell || !cell.broken) return { state, error: "고칠 것이 없어요." };
  if (!accessibleTiles(state, from).has(tile)) return { state, error: "로봇이 닿을 수 없어요. 주변 통로를 열어 주세요." };
  const cost = repairCost(state, tile);
  if (state.coins < cost) return { state, error: "코인이 부족해요." };
  const cells = [...state.cells];
  cells[tile] = { ...cell, broken: false, stress: 0 };
  return { state: { ...state, coins: state.coins - cost, cells }, error: null };
}

/**
 * 시설을 철거하고 값의 절반을 돌려받는다.
 *
 * @param state 게임 상태
 * @param tile 칸 번호
 * @returns { state, error }
 */
export function removeItem(state, tile) {
  if (!state.cells[tile]) return { state, error: "시설이 없어요." };
  const cells = [...state.cells];
  const refund = refundOf(state, tile);
  cells[tile] = null;
  return { state: { ...state, coins: state.coins + refund, cells }, error: null };
}

/**
 * 시설을 다른 빈 칸으로 옮긴다. 비용은 없고 단계와 상태는 그대로 따라간다.
 *
 * @param state 게임 상태
 * @param from 옮길 시설의 칸 번호
 * @param to 빈 칸 번호
 * @returns { state, error }
 */
export function moveItem(state, from, to) {
  const cell = state.cells[from];
  if (!cell) return { state, error: "시설이 없어요." };
  const [x, y] = xyOf(to);
  if (!inLand(state.land, x, y)) return { state, error: "아직 넓히지 않은 땅이에요." };
  if (to === TERMINAL_TILE) return { state, error: "단말기 자리예요." };
  if (state.cells[to]) return { state, error: "이미 시설이 있어요." };
  const cells = [...state.cells];
  cells[to] = cell;
  cells[from] = null;
  return { state: { ...state, cells }, error: null };
}

/**
 * 부지를 한 단계 넓힌다.
 *
 * @param state 게임 상태
 * @returns { state, error }
 */
export function expandLand(state) {
  const cost = expandCost(state);
  if (cost === null) return { state, error: "이미 가장 넓은 부지예요." };
  if (state.coins < cost) return { state, error: "코인이 부족해요." };
  return { state: { ...state, coins: state.coins - cost, land: state.land + 1 }, error: null };
}

/**
 * 누적 수익으로 센터 등급을 구한다.
 *
 * @param lifetime 누적 수익
 * @returns { index, name, next } next는 다음 등급에 필요한 누적 수익, 최고 등급이면 null
 */
export function gradeOf(lifetime) {
  let index = 0;
  for (let i = 0; i < GRADES.length; i += 1) if (lifetime >= GRADES[i].min) index = i;
  return { index, name: GRADES[index].name, next: GRADES[index + 1]?.min ?? null };
}

/**
 * 큰 수를 K, M, B 같은 약어로 줄여 쓴다. 1000 미만은 정수로 보여 준다.
 *
 * @param value 수
 * @returns 문자열
 */
export function formatNumber(value) {
  const n = Math.max(0, value);
  if (n < 1000) return String(Math.floor(n));
  let group = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  if (n / 1000 ** group >= 999.5 && group < SUFFIXES.length - 1) group += 1;
  const scaled = n / 1000 ** group;
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${SUFFIXES[group]}`;
}

/**
 * 초당 수익처럼 작은 값까지 보여 줄 때 쓰는 표기다. 10 미만은 소수 한 자리를 보여 준다.
 *
 * @param value 수
 * @returns 문자열
 */
export function formatRate(value) {
  return value < 10 ? value.toFixed(1) : formatNumber(value);
}

/**
 * 시간(초)을 "N시간 M분" 같은 문장으로 바꾼다.
 *
 * @param seconds 초
 * @returns 문자열
 */
export function formatSpan(seconds) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분`;
  return `${total}초`;
}