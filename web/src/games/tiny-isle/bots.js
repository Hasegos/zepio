import { apply, createRun, finish, HAND_SIZE, isOver, legalCells } from "./engine.js";
import { change } from "./rules.js";

/**
 * 손패의 모든 (카드, 칸) 후보를 점수 변화와 함께 모은다.
 *
 * @param state 판 상태
 * @returns [{ slot, i, id, delta }]
 */
function candidates(state) {
  const out = [];
  for (let slot = 0; slot < HAND_SIZE; slot += 1) {
    const id = state.hand[slot];
    if (!id) continue;
    for (const i of legalCells(state, id)) out.push({ slot, i, id, delta: change(state.terrain, state.board, i, id).delta });
  }
  return out;
}

/**
 * 막혔을 때 쓸 수 있는 다시 뽑기 수를 만든다.
 *
 * @param state 판 상태
 * @returns reroll 수, 쓸 수 없으면 null
 */
function stuckMove(state) {
  const slot = state.hand.findIndex(Boolean);
  return slot >= 0 && state.rerolls > 0 ? { t: "reroll", slot } : null;
}

/**
 * 지금 점수가 가장 많이 오르는 수를 고른다(앞을 내다보지 않는다).
 *
 * @param state 판 상태
 * @returns 수, 둘 수 없으면 null
 */
export function greedyMove(state) {
  let best = null;
  for (const c of candidates(state)) if (!best || c.delta > best.delta) best = c;
  return best ? { t: "place", slot: best.slot, i: best.i } : stuckMove(state);
}

/**
 * 한 수 앞까지 보고 고른다. 놓은 뒤 남은 카드와 다음 카드로 얻을 최고 점수를 절반 넘게 반영한다.
 *
 * @param state 판 상태
 * @returns 수, 둘 수 없으면 null
 */
export function lookaheadMove(state) {
  let best = null;
  for (const c of candidates(state)) {
    const after = apply(state, { t: "place", slot: c.slot, i: c.i });
    const follow = candidates(after).reduce((top, n) => Math.max(top, n.delta), 0);
    const value = c.delta + 0.7 * follow;
    if (!best || value > best.value) best = { ...c, value };
  }
  return best ? { t: "place", slot: best.slot, i: best.i } : stuckMove(state);
}

/**
 * 규칙에 맞는 수 중 아무거나 두는 수를 만든다.
 *
 * @param rng 난수 함수
 * @returns 수를 고르는 함수
 */
export function randomPicker(rng) {
  return (state) => {
    const list = candidates(state);
    if (!list.length) return stuckMove(state);
    const c = list[Math.floor(rng() * list.length)];
    return { t: "place", slot: c.slot, i: c.i };
  };
}

/**
 * 봇이 한 판을 끝까지 둔다.
 *
 * @param island 섬
 * @param seed 시드
 * @param pick 상태를 받아 수를 돌려주는 함수
 * @returns 끝난 판 상태
 */
export function playOut(island, seed, pick) {
  let state = createRun(island, seed);
  while (!isOver(state)) {
    const move = pick(state);
    if (!move) break;
    const next = apply(state, move);
    if (next === state) break;
    state = next;
  }
  return state;
}
/**
 * 오늘의 섬에서 제피(점수만 보는 봇)가 두면 나오는 점수와, 그것으로 정한 별 기준을 구한다.
 *
 * @param island 섬
 * @param seed 시드
 * @returns { ghost, lines } lines는 별 1, 2, 3개를 받는 점수
 */
export function ghostLines(island, seed) {
  const ghost = finish(playOut(island, seed, greedyMove), null).score;
  return { ghost, lines: [Math.round(ghost * 0.75), ghost, Math.round(ghost * 1.08)] };
}
