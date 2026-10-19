import { GOAL, initialState, STATIONS, UPGRADES } from "./economy.js";
import { restoreSimulation } from "./simulation.js";

/** 저장 데이터의 코인 상한. 깨진 값이 무한대로 번지지 않게 한다. */
const COIN_MAX = 1e18;
const LEVEL_MAX = 1000;
const STAFF_MAX = 1000;

/**
 * 0 이상 max 이하의 유한한 수만 받아들이고 나머지는 0으로 본다.
 *
 * @param value 검사할 값
 * @param max 상한
 * @returns 정리된 수
 */
function clean(value, max) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(value, max) : 0;
}

/**
 * 시각 값을 받아들인다. 숫자가 아니거나 음수이거나 미래이면 fallback을 쓴다.
 *
 * @param value 검사할 값
 * @param now 현재 시각
 * @param fallback 쓸 수 없을 때의 값
 * @returns 0 이상 now 이하의 시각
 */
function cleanTime(value, now, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= now ? value : fallback;
}

/**
 * 저장된 데이터를 게임이 쓸 수 있는 진행 상황으로 바꾼다. 없거나 모양이 틀리거나 버전이 다르면 새 카페로 시작하고,
 * 일부만 깨졌으면 그 값만 걸러낸다(알 수 없는 설비와 업그레이드는 버린다). 미래 시각은 지금으로 보정한다.
 *
 * @param data 저장소에서 읽은 값
 * @param now 현재 시각(밀리초)
 * @returns 진행 상황
 */
export function parseSave(data, now) {
  if (data === null || typeof data !== "object" || data.v !== 1) return initialState(now);
  const fresh = initialState(now);
  const coins = clean(data.coins, COIN_MAX);
  const total = Math.max(clean(data.total, COIN_MAX), coins);
  const levels = Object.fromEntries(
    STATIONS.map((station) => [station.id, Math.floor(clean(data.levels?.[station.id], LEVEL_MAX))]),
  );
  const known = UPGRADES.map((upgrade) => upgrade.id);
  const upgrades = Array.isArray(data.upgrades)
    ? [...new Set(data.upgrades)].filter((id) => known.includes(id))
    : [];
  const lastAt = cleanTime(data.lastAt, now, now);
  const result = {
    ...fresh,
    coins,
    total,
    levels,
    staff: Math.floor(clean(data.staff, STAFF_MAX)),
    lastCheer: cleanTime(data.lastCheer, now, 0),
    managers: {},
    upgrades,
    lastAt,
    startedAt: cleanTime(data.startedAt, lastAt, lastAt),
    goalAt: total >= GOAL ? cleanTime(data.goalAt, now, now) : 0,
  };
  const assigned = STATIONS.filter((s) => levels[s.id] > 0 && (data.townVersion ? data.managers?.[s.id] === true : true)).slice(0, result.staff);
  result.managers = Object.fromEntries(assigned.map((s) => [s.id, true]));
  if (!levels.espresso) result.levels.espresso = 1;
  if (data.service) result.service = restoreSimulation(data.service, result);
  return result;
}
