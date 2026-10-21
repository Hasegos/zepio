import { hashSeed, makeRng, shuffle } from "../_shared/rng.js";
import { CARD_TOTAL, RULES, ruleById } from "./rules.js";

export const RUN_LEVELS = [1, 1, 2, 2, 3];
export const TEST_LIMIT = 4;
export const GUESS_LIMIT = 2;
export const BASE_SCORE = 5;
export const CANDIDATES = 5;
export const TRAY_SIZE = 8;
export const MAX_TESTS_NEEDED = 3;
const EXAMPLES = 3;
const ATTEMPTS = 400;
const TRAY_TRIES = 60;

/**
 * 규칙을 카드 번호로 판정한다.
 *
 * @param rule 규칙
 * @param card 카드 번호
 * @returns 통과하면 true
 */
function passes(rule, card) {
  return rule.table[card] === "1";
}

/**
 * 후보 규칙들 가운데 정답이 무엇이든, 시험 카드 몇 장이면 정답을 가려내는지를 최악의 경우로 센다.
 * 시험 카드는 트레이에서만 고른다.
 *
 * @param rules 후보 규칙 목록
 * @param tray 트레이 카드 번호 목록
 * @returns 필요한 시험 횟수의 최악값, 가려낼 수 없으면 Infinity
 */
export function worstTests(rules, tray) {
  const memo = new Map();
  const solve = (mask) => {
    if ((mask & (mask - 1)) === 0) return 0;
    if (memo.has(mask)) return memo.get(mask);
    let best = Infinity;
    for (const card of tray) {
      let pass = 0;
      rules.forEach((rule, i) => {
        if ((mask >> i) & 1 && passes(rule, card)) pass |= 1 << i;
      });
      const fail = mask & ~pass;
      if (!pass || !fail) continue;
      best = Math.min(best, 1 + Math.max(solve(pass), solve(fail)));
    }
    memo.set(mask, best);
    return best;
  };
  return solve((1 << rules.length) - 1);
}

/**
 * 정답 규칙을 통과하는 카드와 못 통과하는 카드를 섞어 예시 카드 3장을 고른다. 통과와 불통과가 각각 하나 이상이다.
 *
 * @param rule 정답 규칙
 * @param random 난수 함수
 * @returns { card, pass } 목록
 */
function pickExamples(rule, random) {
  const yes = shuffle(
    Array.from({ length: CARD_TOTAL }, (_, i) => i).filter((i) => passes(rule, i)),
    random,
  );
  const no = shuffle(
    Array.from({ length: CARD_TOTAL }, (_, i) => i).filter((i) => !passes(rule, i)),
    random,
  );
  const passCount = random() < 0.5 ? 1 : 2;
  return shuffle(
    [...yes.slice(0, passCount).map((card) => ({ card, pass: true })), ...no.slice(0, EXAMPLES - passCount).map((card) => ({ card, pass: false }))],
    random,
  );
}

/**
 * 예시와 모순 없고 정답과 다른 오답 후보를 고른다. 난이도가 비슷한 규칙을 먼저 쓴다.
 *
 * @param rule 정답 규칙
 * @param examples 예시 목록
 * @param random 난수 함수
 * @returns 오답 규칙 목록, 모자라면 null
 */
function pickDistractors(rule, examples, random) {
  const pool = RULES.filter((other) => other.id !== rule.id && other.table !== rule.table && examples.every(({ card, pass }) => passes(other, card) === pass));
  const ranked = shuffle(pool, random).sort((a, b) => Math.abs(a.level - rule.level) - Math.abs(b.level - rule.level));
  const near = ranked.slice(0, Math.max(CANDIDATES - 1, Math.ceil(ranked.length / 2)));
  const picked = shuffle(near, random).slice(0, CANDIDATES - 1);
  return picked.length === CANDIDATES - 1 ? picked : null;
}

/**
 * 시험 카드 트레이를 고른다. 예시로 나온 카드는 빼고, 정답이 무엇이든 3번 이하의 시험으로 가려낼 수 있어야 한다.
 *
 * @param rules 후보 규칙 목록
 * @param examples 예시 목록
 * @param random 난수 함수
 * @returns 카드 번호 목록, 만들지 못하면 null
 */
function pickTray(rules, examples, random) {
  const used = new Set(examples.map((example) => example.card));
  const free = Array.from({ length: CARD_TOTAL }, (_, i) => i).filter((i) => !used.has(i));
  for (let tries = 0; tries < TRAY_TRIES; tries += 1) {
    const tray = shuffle(free, random).slice(0, TRAY_SIZE);
    if (worstTests(rules, tray) <= MAX_TESTS_NEEDED) return tray;
  }
  return null;
}

/**
 * 라운드 하나를 만든다. 정답 규칙, 예시, 섞은 후보 5개, 시험 카드 트레이가 들어 있다.
 *
 * @param rule 정답 규칙
 * @param random 난수 함수
 * @returns { rule, examples, candidates, answer, tray } 규칙은 id로 적는다
 */
function makeRound(rule, random) {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const examples = pickExamples(rule, random);
    const distractors = pickDistractors(rule, examples, random);
    if (!distractors) continue;
    const rules = shuffle([rule, ...distractors], random);
    const tray = pickTray(rules, examples, random);
    if (!tray) continue;
    return {
      rule: rule.id,
      level: rule.level,
      examples,
      candidates: rules.map((item) => item.id),
      answer: rules.findIndex((item) => item.id === rule.id),
      tray,
    };
  }
  throw new Error(`라운드를 만들지 못했어요: ${rule.id}`);
}

/**
 * 시드로 한 판 5라운드를 만든다. 난이도 1, 1, 2, 2, 3 순서이고 같은 규칙은 두 번 나오지 않는다.
 *
 * @param seed 정수 시드
 * @returns 라운드 목록
 */
export function makeRun(seed) {
  const random = makeRng(seed);
  const used = new Set();
  return RUN_LEVELS.map((level) => {
    const pool = RULES.filter((rule) => rule.level === level && !used.has(rule.id));
    const rule = pool[Math.floor(random() * pool.length)];
    used.add(rule.id);
    return makeRound(rule, random);
  });
}

/**
 * 날짜의 오늘의 도전 5라운드를 만든다. 같은 날짜는 항상 같은 라운드다.
 *
 * @param date YYYY-MM-DD
 * @returns 라운드 목록
 */
export function dailyRun(date) {
  return makeRun(hashSeed(`hidden-rule:${date}`));
}

/**
 * 라운드 점수를 구한다. 시험과 틀린 제출이 하나씩 1점을 깎고 최소 1점이다. 실패는 0점이다.
 *
 * @param tests 쓴 시험 횟수
 * @param wrongs 틀린 제출 횟수
 * @param solved 정답을 맞혔는지
 * @returns 점수
 */
export function scoreOf(tests, wrongs, solved) {
  return solved ? Math.max(1, BASE_SCORE - tests - wrongs) : 0;
}

/**
 * 후보 규칙을 문장으로 돌려준다.
 *
 * @param round 라운드
 * @returns 후보 문장 목록(후보 순서와 같다)
 */
export function candidateTexts(round) {
  return round.candidates.map((id) => ruleById(id).text);
}

/**
 * 카드가 라운드의 정답 규칙을 통과하는지 확인한다. 시험 결과로 보여 준다.
 *
 * @param round 라운드
 * @param card 카드 번호
 * @returns 통과하면 true
 */
export function testCard(round, card) {
  return ruleById(round.rule).table[card] === "1";
}