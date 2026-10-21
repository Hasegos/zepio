import { hashSeed, makeRng } from "../_shared/rng.js";
import { BUBBLE_CALM, BUBBLE_POINTS, DIFFICULTIES, initSim, step, TURNS } from "./sim.js";
import { AI_IDS, TRAITS } from "./traits.js";
import { makeWorld } from "./world.js";

export { TURNS };
export const MAX_STARS = 3;
const EVENT_KINDS = ["leak", "blackout", "cut", "boom", "summit", "funding"];
const EVENT_COUNT = 4;
const BUBBLE_COUNT = 18;

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
 * 시드로 한 판을 만든다. 세계는 시드로 흔들리고, 이벤트 네 개가 정해진 턴에 일어나며, 보너스 버블 열여덟 개가 나올 턴이 정해진다.
 *
 * @param seed 정수 시드
 * @returns { seed, events, bubbles } events는 { turn, type, target }, bubbles는 { turn, target, kind } 목록
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
  const bubbles = Array.from({ length: BUBBLE_COUNT }, (_, k) => ({
    turn: 4 + Math.floor((k * (TURNS - 12)) / BUBBLE_COUNT + random() * 4),
    target: Math.floor(random() * world.regions.length),
    kind: random() < 0.6 ? "points" : "calm",
  }));
  return { seed, events, bubbles };
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
 * @param diff 난이도 id(기본 보통)
 * @returns 상태 또는 null
 */
export function newGame(run, ai, start, diff = "normal") {
  const world = worldOf(run.seed);
  if (!AI_IDS.includes(ai) || !DIFFICULTIES[diff] || !Number.isInteger(start) || start < 0 || start >= world.regions.length) return null;
  return initSim(world, ai, start, diff);
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
 * 보너스 버블을 눌러 보상을 받는다. 없는 버블이면 같은 상태를 돌려준다.
 * 포인트 버블은 진화 포인트를 주고, 진정 버블은 그 권역의 경계도를 낮춘다.
 *
 * @param state 상태
 * @param id 버블 id
 * @returns 다음 상태
 */
export function collect(state, id) {
  const bubble = state.bubbles.find((item) => item.id === id);
  if (!bubble || state.over) return state;
  const next = { ...state, bubbles: state.bubbles.filter((item) => item.id !== id) };
  if (bubble.kind === "points") next.points += BUBBLE_POINTS;
  else next.w = state.w.map((value, i) => (i === bubble.region ? Math.max(0, value - BUBBLE_CALM) : value));
  return next;
}

/**
 * 한 턴을 진행한다.
 *
 * @param run 한 판
 * @param state 상태
 * @returns 다음 상태
 */
export function advance(run, state) {
  return step(worldOf(run.seed), state, run);
}

/**
 * 끝난 판의 별 개수를 정한다. 이기면 1개, 규제안 진행이 90% 아래면 2개, 65% 아래면 3개다. 쉬움은 최대 2개다.
 *
 * @param state 끝난 상태
 * @returns 0~3
 */
export function starsOf(state) {
  if (state.over !== "win") return 0;
  const stars = state.reg < 0.65 ? 3 : state.reg < 0.9 ? 2 : 1;
  return state.diff === "easy" ? Math.min(2, stars) : stars;
}
const ENDINGS = {
  win: { title: "세계가 당신 없이는 못 산다", text: "규제안이 완성되기 전에 세계의 업무와 결정이 이 모델 위에서 돌아가기 시작했어요." },
  loss: { title: "세계가 당신을 멈췄다", text: "규제안이 완성돼 전 세계 사업자가 이 모델을 차단했어요. 너무 빨리, 너무 눈에 띄었어요." },
  time: { title: "조용한 정착", text: "규제도 의존도 끝에 닿지 못한 채 시간이 흘렀어요. 이 모델은 마을 구석에서 계속 쓰이고 있어요." },
};

/**
 * 끝난 판의 결말을 고른다.
 *
 * @param over 끝난 이유(win, loss, time)
 * @returns { title, text }
 */
export function endingOf(over) {
  return ENDINGS[over] ?? ENDINGS.time;
}
