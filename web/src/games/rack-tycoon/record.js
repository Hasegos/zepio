import { isInt, isObject } from "../_shared/validate.js";
import { analyze, COOLERS, formatRate, gradeOf, newState, POWER_LEVELS, TIERS } from "./engine.js";
import { COOLER_PADS, PADS, UNLOCK_RANK } from "./layout.js";

const MAX_VALUE = 1e18;
const VERSION = 1;

/**
 * 저장된 값이 0 이상의 유한한 수인지 확인한다.
 *
 * @param n 확인할 값
 * @returns 맞으면 true
 */
const money = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= MAX_VALUE;

/**
 * 저장된 상태가 게임에서 쓸 수 있는 모양인지 검사하고 안전한 복사본을 돌려준다.
 * 깨진 값이 하나라도 있으면 null이다.
 *
 * @param raw 저장소에서 읽은 센터 상태
 * @returns 게임 상태, 못 쓰면 null
 */
export function readState(raw) {
  if (!isObject(raw)) return null;
  const { coins, lifetime, unlocked, racks, coolers, power, time } = raw;
  const ok =
    money(coins) &&
    money(lifetime) &&
    money(time) &&
    isInt(unlocked, 2, PADS.length) &&
    isInt(power, 0, POWER_LEVELS.length - 1) &&
    Array.isArray(racks) &&
    racks.length === PADS.length &&
    Array.isArray(coolers) &&
    coolers.length === COOLER_PADS.length &&
    coolers.every((level) => isInt(level, 0, COOLERS.length - 1));
  if (!ok) return null;
  const clean = [];
  for (let i = 0; i < racks.length; i += 1) {
    const rack = racks[i];
    if (!isObject(rack) || !isInt(rack.tier, 0, TIERS.length - 1) || typeof rack.broken !== "boolean") return null;
    if (typeof rack.stress !== "number" || !(rack.stress >= 0 && rack.stress < 1)) return null;
    if ((rack.tier > 0 && UNLOCK_RANK[i] >= unlocked) || (rack.tier === 0 && rack.broken)) return null;
    clean.push({ tier: rack.tier, stress: rack.stress, broken: rack.broken });
  }
  return { coins, lifetime, unlocked, racks: clean, coolers: [...coolers], power, time };
}

/**
 * 저장소에서 읽은 값을 안전한 모양으로 다듬는다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns { save, savedAt } save는 이어 할 센터 상태(없으면 null), savedAt은 마지막으로 저장한 시각(밀리초)
 */
export function readData(raw) {
  const save = readState(raw?.save);
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