import { isInt, isObject } from "../_shared/validate.js";
import { analyze, DIFFICULTIES, formatRate, gradeOf, KINDS, newState, VARIANTS, xyOf } from "./engine.js";
import { snapshot, viewOf } from "./campus.js";
import { AREA, GRID_HEIGHT, GRID_WIDTH, inLand, LANDS, TERMINAL_TILE } from "./layout.js";
import { BADGE_IDS, PART_KEYS } from "./collection.js";
import { MAX_SITES, RESEARCH, ROBOT_UPS, SITE_TYPES } from "./sites.js";

const MAX_VALUE = 1e18;
const VERSION = 3;
const OLD_LANDS = [
  [8, 6],
  [10, 8],
  [12, 10],
  [16, 12],
  [20, 16],
];
const OLD_TO_NEW_LAND = [0, 1, 1, 2, 2];
const OLD_REFUND = 0.5;

/**
 * 저장된 값이 0 이상의 유한한 수인지 확인한다.
 *
 * @param n 확인할 값
 * @returns 맞으면 true
 */
const money = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= MAX_VALUE;

/**
 * 저장된 칸 하나가 쓸 수 있는 모양인지 검사하고 안전한 복사본을 돌려준다.
 *
 * @param cell 저장소에서 읽은 칸
 * @param tile 칸 번호
 * @param inside 부지 안의 칸인지 알려 주는 함수 (x, y)
 * @returns 칸 내용, 비었으면 null, 못 쓰면 undefined
 */
function readCell(cell, tile, inside) {
  if (cell === null) return null;
  if (!isObject(cell) || !Object.hasOwn(KINDS, cell.kind)) return undefined;
  const [x, y] = xyOf(tile);
  if (tile === TERMINAL_TILE || !inside(x, y)) return undefined;
  if (!isInt(cell.level, 1, KINDS[cell.kind].levels.length - 1) || typeof cell.broken !== "boolean") return undefined;
  if (typeof cell.stress !== "number" || !(cell.stress >= 0 && cell.stress < 1)) return undefined;
  if (cell.kind !== "server" && (cell.broken || cell.stress !== 0)) return undefined;
  const clean = { kind: cell.kind, level: cell.level, stress: cell.stress, broken: cell.broken };
  if (cell.kind === "server" && typeof cell.variant === "string" && cell.variant !== "base" && Object.hasOwn(VARIANTS, cell.variant)) clean.variant = cell.variant;
  return clean;
}

/**
 * 저장된 칸 배열 전체를 검사하고 안전한 복사본을 돌려준다.
 *
 * @param cells 저장소에서 읽은 칸 배열
 * @param inside 부지 안의 칸인지 알려 주는 함수 (x, y)
 * @returns 칸 배열, 못 쓰면 null
 */
function readCells(cells, inside) {
  if (!Array.isArray(cells) || cells.length !== AREA) return null;
  const clean = [];
  for (let tile = 0; tile < AREA; tile += 1) {
    const cell = readCell(cells[tile], tile, inside);
    if (cell === undefined) return null;
    clean.push(cell);
  }
  return clean;
}

/**
 * 저장된 재난 기록을 안전한 모양으로 다듬는다. 없거나 깨진 값은 0으로 본다.
 *
 * @param raw 저장소에서 읽은 기록
 * @returns { surge, blackout, fire, saved, contracts }
 */
function readStats(raw) {
  const clean = {};
  for (const key of ["surge", "blackout", "fire", "saved", "contracts"]) clean[key] = isObject(raw) && isInt(raw[key], 0, 1e9) ? raw[key] : 0;
  return clean;
}

/**
 * 저장된 건물 하나를 검사한다.
 *
 * @param raw 저장소에서 읽은 건물
 * @returns { type, land, cells }, 못 쓰면 null
 */
function readSite(raw) {
  if (!isObject(raw) || !Object.hasOwn(SITE_TYPES, raw.type) || !isInt(raw.land, 0, LANDS.length - 1)) return null;
  const cells = readCells(raw.cells, (x, y) => inLand(raw.land, x, y));
  return cells ? { type: raw.type, land: raw.land, cells } : null;
}

/**
 * 저장된 건물 연결을 검사한다. 가진 건물 두 개를 잇는 쌍만 남기고 겹치는 쌍은 하나로 합친다. 없거나 깨지면 빈 목록이다.
 *
 * @param raw 저장소에서 읽은 연결 목록
 * @param sites 검사를 마친 건물 목록
 * @returns 건물 종류 쌍의 목록
 */
function readLinks(raw, sites) {
  const types = new Set(sites.map((site) => site.type));
  const seen = new Set();
  const out = [];
  if (!Array.isArray(raw)) return out;
  for (const pair of raw) {
    if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || !types.has(pair[0]) || !types.has(pair[1])) continue;
    const key = [...pair].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([pair[0], pair[1]]);
  }
  return out;
}

/**
 * 저장된 도감, 업적, 칭호를 안전한 모양으로 다듬는다. 모르는 항목은 버리고 겹치는 항목은 하나로 합친다.
 *
 * @param raw 저장소에서 읽은 센터 상태
 * @returns { codex, badges, title }
 */
function readCollection(raw) {
  const pick = (list, known) => (Array.isArray(list) ? [...new Set(list.filter((key) => typeof key === "string" && known.has(key)))] : []);
  const badges = pick(raw.badges, BADGE_IDS);
  return { codex: pick(raw.codex, PART_KEYS), badges, title: typeof raw.title === "string" && badges.includes(raw.title) ? raw.title : null };
}

/**
 * 저장된 브랜드 기록을 안전한 모양으로 다듬는다. 없거나 깨진 값은 0으로 본다.
 *
 * @param raw 저장소에서 읽은 기록
 * @returns { points, count }
 */
function readBrand(raw) {
  return { points: isObject(raw) && isInt(raw.points, 0, 1e6) ? raw.points : 0, count: isObject(raw) && isInt(raw.count, 0, 1e6) ? raw.count : 0 };
}

/**
 * 저장된 로봇 강화 단계를 안전한 모양으로 다듬는다. 없거나 범위를 벗어난 값은 0으로 본다.
 *
 * @param raw 저장소에서 읽은 기록
 * @returns { speed, discount, drone }
 */
function readRobot(raw) {
  const clean = {};
  for (const [key, up] of Object.entries(ROBOT_UPS)) clean[key] = isObject(raw) && isInt(raw[key], 0, up.max) ? raw[key] : 0;
  return clean;
}

/**
 * 저장된 연구 단계를 안전한 모양으로 다듬는다. 없거나 범위를 벗어난 값은 0으로 본다.
 *
 * @param raw 저장소에서 읽은 기록
 * @returns 연구 종류별 단계
 */
function readResearch(raw) {
  const clean = {};
  for (const [key, item] of Object.entries(RESEARCH)) clean[key] = isObject(raw) && isInt(raw[key], 0, item.max) ? raw[key] : 0;
  return clean;
}

/**
 * 건물 목록과 보고 있는 건물로 게임 상태를 만든다.
 *
 * @param base { coins, lifetime, time, difficulty, stats, links, brand, robot, research, codex, badges, title }
 * @param sites 건물 목록
 * @param active 보고 있는 건물 번호
 * @returns 게임 상태
 */
function build(base, sites, active) {
  const site = sites[active];
  return { ...base, type: site.type, land: site.land, cells: site.cells, active, sites };
}

/**
 * 저장된 캠퍼스가 게임에서 쓸 수 있는 모양인지 검사하고 안전한 복사본을 돌려준다.
 * 깨진 값이 하나라도 있으면 null이다.
 *
 * @param raw 저장소에서 읽은 캠퍼스 상태
 * @returns 게임 상태, 못 쓰면 null
 */
export function readState(raw) {
  if (!isObject(raw)) return null;
  const { coins, lifetime, time, sites, active } = raw;
  if (!money(coins) || !money(lifetime) || !money(time)) return null;
  if (!Array.isArray(sites) || sites.length < 1 || sites.length > MAX_SITES || !isInt(active, 0, sites.length - 1)) return null;
  const clean = sites.map(readSite);
  if (clean.some((site) => site === null) || new Set(clean.map((site) => site.type)).size !== clean.length) return null;
  const difficulty = Object.hasOwn(DIFFICULTIES, raw.difficulty) ? raw.difficulty : null;
  return build({ coins, lifetime, time, difficulty, stats: readStats(raw.stats), links: readLinks(raw.links, clean), brand: readBrand(raw.brand), robot: readRobot(raw.robot), research: readResearch(raw.research), ...readCollection(raw) }, clean, active);
}

/**
 * 건물이 하나뿐이던 이전 저장(v2)을 캠퍼스 상태로 옮긴다. 부지가 3단계로 줄어서 새 부지 밖에 놓인 시설은 값의 절반을 돌려준다.
 *
 * @param raw 저장소에서 읽은 이전 센터 상태
 * @returns 게임 상태, 못 쓰면 null
 */
function migrateV2(raw) {
  if (!isObject(raw)) return null;
  const { coins, lifetime, land, time } = raw;
  if (!money(coins) || !money(lifetime) || !money(time) || !isInt(land, 0, OLD_LANDS.length - 1)) return null;
  const [w, h] = OLD_LANDS[land];
  const x0 = (GRID_WIDTH - w) / 2;
  const y0 = (GRID_HEIGHT - h) / 2;
  const cells = readCells(raw.cells, (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h);
  if (!cells) return null;
  const nextLand = OLD_TO_NEW_LAND[land];
  let refund = 0;
  const kept = cells.map((cell, tile) => {
    if (!cell) return null;
    const [x, y] = xyOf(tile);
    if (inLand(nextLand, x, y)) return cell;
    refund += Math.floor(KINDS[cell.kind].levels[cell.level].cost * OLD_REFUND);
    return null;
  });
  const difficulty = Object.hasOwn(DIFFICULTIES, raw.difficulty) ? raw.difficulty : null;
  const base = { coins: Math.min(MAX_VALUE, coins + refund), lifetime, time, difficulty, stats: readStats(raw.stats), links: [], brand: readBrand(raw.brand), robot: readRobot(raw.robot), research: readResearch(raw.research), ...readCollection(raw) };
  return build(base, [{ type: "basement", land: nextLand, cells: kept }], 0);
}

/**
 * 저장소에서 읽은 값을 안전한 모양으로 다듬는다. 이전 버전(v2)은 옮겨 오고, 그보다 오래됐으면 이어 할 수 없는 것으로 본다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns { save, savedAt } save는 이어 할 캠퍼스 상태(없으면 null), savedAt은 마지막으로 저장한 시각(밀리초)
 */
export function readData(raw) {
  let save = null;
  if (raw?.v === VERSION) save = readState(raw.save);
  else if (raw?.v === 2) save = migrateV2(raw.save);
  const savedAt = typeof raw?.savedAt === "number" && Number.isFinite(raw.savedAt) && raw.savedAt > 0 ? raw.savedAt : 0;
  return { save, savedAt: save ? savedAt : 0 };
}

/**
 * 저장할 데이터를 만든다.
 *
 * @param state 캠퍼스 상태
 * @param now 지금 시각(밀리초)
 * @returns 저장소에 넣을 데이터
 */
export function makeData(state, now) {
  return { v: VERSION, save: snapshot(state), savedAt: now };
}

/**
 * 처음 시작하는 상태를 돌려준다. 저장된 캠퍼스가 없을 때 쓴다.
 *
 * @param data readData가 돌려준 값
 * @returns 캠퍼스 상태
 */
export function stateFrom(data) {
  return data.save ?? newState();
}

/**
 * 홈 카드에 보여줄 한 줄 요약을 만든다.
 *
 * @param data 저장된 데이터
 * @param plays 플레이 횟수
 * @returns 요약 문구, 보여줄 것이 없으면 빈 문자열
 */
export function summarize(data, plays) {
  const { save } = readData(data);
  if (!save) return plays > 0 ? `${plays}회 플레이` : "";
  let rate = 0;
  for (let i = 0; i < save.sites.length; i += 1) rate += analyze(viewOf(save, i)).income;
  return `${gradeOf(save.lifetime).name} · 초당 ${formatRate(rate)} 수익`;
}