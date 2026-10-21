import { hashSeed, makeRng } from "../_shared/rng.js";
import { initSim, step, TURNS } from "./sim.js";
import { AI_IDS, TRAITS } from "./traits.js";
import { makeWorld } from "./world.js";

export { TURNS };
export const MAX_STARS = 3;
const EVENT_KINDS = ["leak", "blackout", "cut", "boom", "summit", "funding"];
const EVENT_COUNT = 4;

let cached = null;

/**
 * 판의 시드로 세계를 만든다. 같은 시드는 마지막 결과를 다시 쓴다.
 *
 * @param seed 판의 시드
 * @returns makeWorld의 결과
 */
export function worldOf(seed) {
  if (cached?.seed !== seed) cached = { seed, world: makeWorld(seed) };
  return cached.world;
}

/**
 * 시드로 한 판을 만든다. 세계는 시드로 흔들리고, 이벤트 네 개가 정해진 턴에 일어난다.
 *
 * @param seed 정수 시드
 * @returns { seed, events } events는 { turn, type, target } 목록
 */
export function makeRun(seed) {
  const random = makeRng(seed ^ 0x5bd1e995);
  const world = worldOf(seed);
  const cables = world.links.map((link, index) => (link.type === "cable" ? index : -1)).filter((index) => index !== -1);
  const slot = (TURNS - 12) / EVENT_COUNT;
  const events = Array.from({ length: EVENT_COUNT }, (_, k) => {
    const type = EVENT_KINDS[Math.floor(random() * EVENT_KINDS.length)];
    const turn = 8 + Math.floor(k * slot + random() * slot);
    const target = type === "cut" ? cables[Math.floor(random() * cables.length)] : Math.floor(random() * world.regions.length);
    return { turn, type, target };
  });
  return { seed, events };
}

/**
 * 날짜(YYYY-MM-DD)마다 같은 한 판을 만든다.
 *
 * @param date 한국 날짜
 * @returns 한 판
 */
export function dailyRun(date) {
  return makeRun(hashSeed(`rogue-model:${date}`));
}

/**
 * 유형과 시작 권역을 골라 첫 상태를 만든다. 잘못된 선택이면 null이다.
 *
 * @param run 한 판
 * @param ai AI 유형 id
 * @param start 시작 권역 번호
 * @returns 상태 또는 null
 */
export function newGame(run, ai, start) {
  const world = worldOf(run.seed);
  if (!AI_IDS.includes(ai) || !Number.isInteger(start) || start < 0 || start >= world.regions.length) return null;
  return initSim(world, ai, start);
}

/**
 * 능력을 한 단계 올릴 수 있는지 본다.
 *
 * @param state 상태
 * @param id 능력 id
 * @returns 살 수 있으면 비용, 아니면 0
 */
export function costOf(state, id) {
  const trait = TRAITS.find((item) => item.id === id);
  if (!trait || state.over) return 0;
  const cost = trait.costs[state.levels[id] ?? 0];
  return cost !== undefined && cost <= state.points ? cost : 0;
}

/**
 * 능력을 한 단계 올린다. 못 사면 같은 상태를 돌려준다.
 *
 * @param state 상태
 * @param id 능력 id
 * @returns 다음 상태
 */
export function buy(state, id) {
  const cost = costOf(state, id);
  if (!cost) return state;
  return { ...state, points: state.points - cost, levels: { ...state.levels, [id]: (state.levels[id] ?? 0) + 1 } };
}

/**
 * 한 턴을 진행한다.
 *
 * @param run 한 판
 * @param state 상태
 * @returns 다음 상태
 */
export function advance(run, state) {
  return step(worldOf(run.seed), state, run.events);
}

/**
 * 끝난 판의 별 개수를 정한다. 이기면 1개, 규제안 진행이 90% 아래면 2개, 65% 아래면 3개다.
 *
 * @param state 끝난 상태
 * @returns 0~3
 */
export function starsOf(state) {
  if (state.over !== "win") return 0;
  return state.reg < 0.65 ? 3 : state.reg < 0.9 ? 2 : 1;
}