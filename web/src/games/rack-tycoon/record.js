import { isInt, isObject } from "../_shared/validate.js";
import { analyze, DIFFICULTIES, formatRate, gradeOf, KINDS, newState, xyOf } from "./engine.js";
import { AREA, inLand, LANDS, TERMINAL_TILE } from "./layout.js";

const MAX_VALUE = 1e18;
const VERSION = 2;

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
 * @param land 부지 단계
 * @returns 칸 내용, 비었으면 null, 못 쓰면 undefined
 */
function readCell(cell, tile, land) {
  if (cell === null) return null;
  if (!isObject(cell) || !Object.hasOwn(KINDS, cell.kind)) return undefined;
  const [x, y] = xyOf(tile);
  if (tile === TERMINAL_TILE || !inLand(land, x, y)) return undefined;
  if (!isInt(cell.level, 1, KINDS[cell.kind].levels.length - 1) || typeof cell.broken !== "boolean") return undefined;
  if (typeof cell.stress !== "number" || !(cell.stress >= 0 && cell.stress < 1)) return undefined;
  if (cell.kind !== "server" && (cell.broken || cell.stress !== 0)) return undefined;
  return { kind: cell.kind, level: cell.level, stress: cell.stress, broken: cell.broken };
}

/**
 * 저장된 재난 기록을 안전한 모양으로 다듬는다. 없거나 깨진 값은 0으로 본다.
 *
 * @param raw 저장소에서 읽은 기록
 * @returns { surge, blackout, fire, saved }
 */
function readStats(raw) {
  const clean = {};
  for (const key of ["surge", "blackout", "fire", "saved"]) clean[key] = isObject(raw) && isInt(raw[key], 0, 1e9) ? raw[key] : 0;
  return clean;
}

/**
 * 저장된 상태가 게임에서 쓸 수 있는 모양인지 검사하고 안전한 복사본을 돌려준다.
 * 깨진 값이 하나라도 있으면 null이다.
 *
 * @param raw 저장소에서 읽은 센터 상태
 * @returns 게임 상태, 못 쓰면 null
 */
export function readState(raw) {
  if (!isObject(raw)) return null;
  const { coins, lifetime, land, cells, time } = raw;
  if (!money(coins) || !money(lifetime) || !money(time) || !isInt(land, 0, LANDS.length - 1)) return null;
  if (!Array.isArray(cells) || cells.length !== AREA) return null;
  const clean = [];
  for (let tile = 0; tile < AREA; tile += 1) {
    const cell = readCell(cells[tile], tile, land);
    if (cell === undefined) return null;
    clean.push(cell);
  }
  const difficulty = Object.hasOwn(DIFFICULTIES, raw.difficulty) ? raw.difficulty : null;
  return { coins, lifetime, land, cells: clean, time, difficulty, stats: readStats(raw.stats) };
}

/**
 * 저장소에서 읽은 값을 안전한 모양으로 다듬는다. 버전이 다르면 이어 할 수 없는 것으로 본다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns { save, savedAt } save는 이어 할 센터 상태(없으면 null), savedAt은 마지막으로 저장한 시각(밀리초)
 */
export function readData(raw) {
  const save = raw?.v === VERSION ? readState(raw.save) : null;
  const savedAt = typeof raw?.savedAt === "number" && Number.isFinite(raw.savedAt) && raw.savedAt > 0 ? raw.savedAt : 0;
  return { save, savedAt: save ? savedAt : 0 };
}

/**
 * 저장할 데이터를 만든다.
 *
 * @param state 센터 상태
 * @param now 지금 시각(밀리초)
 * @returns 저장소에 넣을 데이터
 */
export function makeData(state, now) {
  return { v: VERSION, save: state, savedAt: now };
}

/**
 * 처음 시작하는 상태를 돌려준다. 저장된 센터가 없을 때 쓴다.
 *
 * @param data readData가 돌려준 값
 * @returns 센터 상태
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
  return `${gradeOf(save.lifetime).name} · 초당 ${formatRate(analyze(save).income)} 수익`;
}