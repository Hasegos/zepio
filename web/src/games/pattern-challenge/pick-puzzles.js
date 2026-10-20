import { hashSeed, makeRng } from "../_shared/rng.js";

export const RUN_SLOTS = [1, 1, 2, 2, 3];

/**
 * 문제 풀에서 한 판에 쓸 문제를 난이도 슬롯(1, 1, 2, 2, 3)에 맞춰 뽑는다. 같은 문제는 한 번만 뽑는다.
 *
 * @param pool 문제 목록. 난이도마다 슬롯 수 이상이 있어야 한다
 * @param random 0 이상 1 미만의 수를 돌려주는 함수
 * @returns 슬롯 순서대로 놓인 문제 목록
 */
export function pickPuzzles(pool, random = Math.random) {
  const used = new Set();
  return RUN_SLOTS.map((difficulty) => {
    const candidates = pool.filter((puzzle) => puzzle.difficulty === difficulty && !used.has(puzzle.id));
    const chosen = candidates[Math.floor(random() * candidates.length)];
    used.add(chosen.id);
    return chosen;
  });
}

/**
 * 날짜의 일일 문제 5개를 뽑는다. 같은 날짜는 항상 같은 문제를 낸다.
 *
 * @param pool 문제 목록
 * @param date 날짜(YYYY-MM-DD)
 * @returns 슬롯 순서대로 놓인 문제 목록
 */
export function pickDaily(pool, date) {
  return pickPuzzles(pool, makeRng(hashSeed(`zepio-pattern-${date}`)));
}
