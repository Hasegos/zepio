import { hashSeed, makeRng } from "../_shared/rng.js";
import { KIND_IDS, makeVillage, VILLAGERS } from "./village.js";
import { simulate, TURNS } from "./sim.js";

export const ROUNDS = 3;
export const PICKS = 3;
export const STARTERS = 2;
export const SPREAD_TURNS = 3;
export const MAX_STARS = ROUNDS * 3;
const ROUND_TYPES = ["spread", "stop", "spread"];
const RUN_TRIES = 60;

/**
 * 소문을 퍼뜨리는 최선의 계획을 탐욕적으로 찾는다. 소문 종류마다 한 명씩 가장 많이 퍼지는 사람을 고른다.
 *
 * @param village 마을
 * @returns { kind, picks, value } value는 SPREAD_TURNS턴 뒤 믿는 사람 수
 */
function bestSpread(village) {
  let best = null;
  for (const kind of KIND_IDS) {
    const picks = [];
    let value = 0;
    for (let step = 0; step < PICKS; step += 1) {
      let pick = -1;
      let top = -1;
      for (let person = 0; person < VILLAGERS; person += 1) {
        if (picks.includes(person)) continue;
        const reach = simulate(village, { kind, seeds: [...picks, person], immune: [] }).counts[SPREAD_TURNS];
        if (reach > top) {
          top = reach;
          pick = person;
        }
      }
      picks.push(pick);
      value = top;
    }
    if (!best || value > best.value) best = { kind, picks, value };
  }
  return best;
}

/**
 * 소문을 막는 최선의 계획을 찾는다. 소문이 가장 많은 사람을 거쳐 간 후보 열여섯 명 가운데 세 명을 모두 견준다.
 *
 * @param village 마을
 * @param kind 소문 종류
 * @param starters 소문을 처음 낸 사람들
 * @returns { picks, value } value는 마지막에 믿는 사람 수
 */
function bestStop(village, kind, starters) {
  const { from } = simulate(village, { kind, seeds: starters, immune: [] });
  const size = Array(VILLAGERS).fill(1);
  for (let person = 0; person < VILLAGERS; person += 1) {
    for (let at = from[person]; at !== -1; at = from[at]) size[at] += 1;
  }
  const pool = size
    .map((count, person) => ({ count, person }))
    .filter(({ person }) => !starters.includes(person))
    .sort((a, b) => b.count - a.count)
    .slice(0, 16)
    .map(({ person }) => person);
  let best = { picks: [], value: VILLAGERS };
  for (let a = 0; a < pool.length; a += 1) {
    for (let b = a + 1; b < pool.length; b += 1) {
      for (let c = b + 1; c < pool.length; c += 1) {
        const picks = [pool[a], pool[b], pool[c]];
        const value = simulate(village, { kind, seeds: starters, immune: picks }).counts[TURNS];
        if (value < best.value) best = { picks, value };
      }
    }
  }
  return best;
}

/**
 * 퍼뜨리기 라운드 하나를 만든다. 별 기준은 탐욕적 최선의 값에 비례한다. 기준이 서로 겹치면 null이다.
 *
 * @param seed 마을 시드
 * @returns 라운드 데이터 또는 null
 */
function makeSpread(seed) {
  const best = bestSpread(makeVillage(seed));
  const marks = [Math.floor(best.value * 0.45), Math.floor(best.value * 0.7), Math.floor(best.value * 0.9)];
  if (best.value < 24 || marks[0] < 8 || marks[0] >= marks[1] || marks[1] >= marks[2]) return null;
  return { type: "spread", seed, marks, best: best.value };
}

/**
 * 막기 라운드 하나를 만든다. 아무것도 안 했을 때와 최선의 차이가 작거나 기준이 겹치면 null이다.
 *
 * @param seed 마을 시드
 * @param random 난수 함수
 * @returns 라운드 데이터 또는 null
 */
function makeStop(seed, random) {
  const village = makeVillage(seed);
  const kind = KIND_IDS[Math.floor(random() * KIND_IDS.length)];
  const starters = [];
  while (starters.length < STARTERS) {
    const person = Math.floor(random() * VILLAGERS);
    if (!starters.includes(person) && village.types[person] !== "secret") starters.push(person);
  }
  const base = simulate(village, { kind, seeds: starters, immune: [] }).counts[TURNS];
  const best = bestStop(village, kind, starters).value;
  const gap = base - best;
  if (base < 28 || gap < 10) return null;
  const marks = [Math.ceil(gap * 0.15), Math.ceil(gap * 0.4), Math.ceil(gap * 0.7)].map((reduce) => best + reduce);
  return { type: "stop", seed, kind, starters, marks, base, best };
}

/**
 * 한 판의 라운드 목록을 시드로 만든다.
 *
 * @param seed 정수 시드
 * @returns 라운드 데이터 목록(길이 ROUNDS)
 */
export function makeRun(seed) {
  const random = makeRng(seed);
  return ROUND_TYPES.map((type) => {
    for (let tries = 0; tries < RUN_TRIES; tries += 1) {
      const village = Math.floor(random() * 4294967296);
      const round = type === "spread" ? makeSpread(village) : makeStop(village, random);
      if (round) return round;
    }
    throw new Error("rumor: 라운드를 만들지 못했습니다");
  });
}

/**
 * 날짜(YYYY-MM-DD)마다 같은 한 판을 만든다.
 *
 * @param date 한국 날짜
 * @returns 라운드 데이터 목록
 */
export function dailyRun(date) {
  return makeRun(hashSeed(`rumor:${date}`));
}

/**
 * 계획이 라운드 규칙에 맞는지 본다.
 *
 * @param round 라운드 데이터
 * @param plan { kind, picks } picks는 고른 사람 번호 목록
 * @returns 맞으면 true
 */
export function validPlan(round, plan) {
  const { kind, picks } = plan;
  if (!Array.isArray(picks) || picks.length > PICKS || new Set(picks).size !== picks.length) return false;
  if (!picks.every((person) => Number.isInteger(person) && person >= 0 && person < VILLAGERS)) return false;
  if (round.type === "spread") return KIND_IDS.includes(kind) && picks.length >= 1;
  return picks.every((person) => !round.starters.includes(person));
}

/**
 * 값으로 별 개수를 정한다. 퍼뜨리기는 많을수록, 막기는 적을수록 좋다.
 *
 * @param round 라운드 데이터
 * @param value 퍼뜨리기는 SPREAD_TURNS턴 뒤 믿는 사람 수, 막기는 마지막에 믿는 사람 수
 * @returns 0~3
 */
export function starsOf(round, value) {
  const good = round.type === "spread" ? (mark) => value >= mark : (mark) => value <= mark;
  const marks = round.type === "spread" ? round.marks : [...round.marks].reverse();
  return marks.filter(good).length;
}

/**
 * 계획대로 소문을 퍼뜨려 결과를 낸다.
 *
 * @param round 라운드 데이터
 * @param plan { kind, picks }
 * @returns { sim, value, stars } sim은 simulate의 결과
 */
export function evaluate(round, plan) {
  const sim =
    round.type === "spread"
      ? simulate(makeVillage(round.seed), { kind: plan.kind, seeds: plan.picks, immune: [] })
      : simulate(makeVillage(round.seed), { kind: round.kind, seeds: round.starters, immune: plan.picks });
  const value = sim.counts[round.type === "spread" ? SPREAD_TURNS : TURNS];
  return { sim, value, stars: starsOf(round, value) };
}