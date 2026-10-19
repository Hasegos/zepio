import { DEMOLISH, expandPool, findIsland, REROLLS } from "./islands.js";
import { pickQuests, QUEST_BONUS, questById } from "./quests.js";
import { makeRng, shuffle } from "./rng.js";
import { breakdown, canBuild, CELLS, change, scoreBoard } from "./rules.js";

export const HAND_SIZE = 3;

/**
 * 손패의 빈 칸을 덱 앞에서부터 채운다.
 *
 * @param state 판 상태
 * @returns 손패가 채워진 새 상태
 */
function refill(state) {
  const hand = [...state.hand];
  let next = state.next;
  for (let slot = 0; slot < HAND_SIZE; slot += 1) {
    if (hand[slot] === null && next < state.deck.length) {
      hand[slot] = state.deck[next];
      next += 1;
    }
  }
  return { ...state, hand, next };
}

/**
 * 새 판을 만든다. 섬과 시드가 같으면 카드 순서와 의뢰가 같다.
 *
 * @param island 섬
 * @param seed 정수 시드
 * @returns 판 상태 { island, seed, terrain, board, deck, next, hand, rerolls, demolish, quests, moves }
 */
export function createRun(island, seed) {
  const rng = makeRng(seed);
  const deck = shuffle(expandPool(island.pool), rng);
  return refill({
    island,
    seed,
    terrain: island.terrain,
    board: Array(CELLS).fill(null),
    deck,
    next: 0,
    hand: Array(HAND_SIZE).fill(null),
    rerolls: REROLLS,
    demolish: DEMOLISH,
    quests: pickQuests(island.pool, rng),
    moves: [],
  });
}

/**
 * 손패의 카드를 놓을 수 있는 칸 번호를 모은다.
 *
 * @param state 판 상태
 * @param id 건물 id
 * @returns 칸 번호 목록
 */
export function legalCells(state, id) {
  const out = [];
  for (let i = 0; i < CELLS; i += 1) if (canBuild(state.terrain, state.board, id, i)) out.push(i);
  return out;
}

/**
 * 한 수를 적용한다. 규칙에 어긋나면 같은 상태 객체를 돌려준다.
 * 수는 place(slot, i) 카드를 칸에 놓기, reroll(slot) 카드를 덱 맨 뒤로 보내고 새로 뽑기, demolish(i) 건물 철거 중 하나다.
 *
 * @param state 판 상태
 * @param move 수
 * @returns 새 상태, 잘못된 수면 같은 상태
 */
export function apply(state, move) {
  if (isOver(state)) return state;
  const slotOk = Number.isInteger(move.slot) && move.slot >= 0 && move.slot < HAND_SIZE;
  if ((move.t === "place" || move.t === "reroll") && !slotOk) return state;
  if (move.t === "place") {
    const id = state.hand[move.slot];
    if (!id || !Number.isInteger(move.i) || !canBuild(state.terrain, state.board, id, move.i)) return state;
    const board = [...state.board];
    board[move.i] = id;
    const hand = [...state.hand];
    hand[move.slot] = null;
    return refill({ ...state, board, hand, moves: [...state.moves, move] });
  }
  if (move.t === "reroll") {
    const id = state.hand[move.slot];
    if (!id || state.rerolls < 1 || state.next >= state.deck.length) return state;
    const hand = [...state.hand];
    hand[move.slot] = state.deck[state.next];
    return { ...state, hand, deck: [...state.deck, id], next: state.next + 1, rerolls: state.rerolls - 1, moves: [...state.moves, move] };
  }
  if (move.t === "demolish") {
    if (state.demolish < 1 || !Number.isInteger(move.i) || !state.board[move.i]) return state;
    const board = [...state.board];
    board[move.i] = null;
    return { ...state, board, demolish: state.demolish - 1, moves: [...state.moves, move] };
  }
  return state;
}

/**
 * 판이 끝났는지 확인한다. 손패가 비었거나, 놓을 수 있는 칸이 없고 새로 뽑을 수도 없으면 끝이다.
 *
 * @param state 판 상태
 * @returns 끝났으면 true
 */
export function isOver(state) {
  const cards = state.hand.filter(Boolean);
  if (cards.length === 0) return true;
  if (cards.some((id) => legalCells(state, id).length > 0)) return false;
  return !(state.rerolls > 0 && state.next < state.deck.length);
}

/**
 * 한 수를 놓았을 때 점수가 얼마나 달라지는지 미리 계산한다.
 *
 * @param state 판 상태
 * @param id 건물 id, 철거면 null
 * @param i 칸 번호
 * @returns { delta, changes }
 */
export function preview(state, id, i) {
  return change(state.terrain, state.board, i, id);
}

/**
 * 지금까지의 건물 점수 합을 구한다.
 *
 * @param state 판 상태
 * @returns 점수
 */
export function currentScore(state) {
  return scoreBoard(state.terrain, state.board);
}

/**
 * 의뢰 달성 여부를 확인한다.
 *
 * @param state 판 상태
 * @returns [{ id, name, desc, done, progress }]
 */
export function questStatus(state) {
  return state.quests.map((id) => {
    const quest = questById(id);
    return {
      id,
      name: quest.name,
      desc: quest.desc,
      done: quest.test(state.terrain, state.board),
      progress: quest.progress(state.terrain, state.board),
    };
  });
}

/**
 * 끝난 판의 결과를 계산한다.
 *
 * @param state 판 상태
 * @param lines 별 1, 2, 3개를 받는 점수 기준(기본은 섬의 기준, 오늘의 섬은 제피의 기록으로 정한 값을 받는다)
 * @returns { base, bonus, score, stars, quests, parts }
 */
export function finish(state, lines = state.island.stars) {
  const base = currentScore(state);
  const quests = questStatus(state);
  const bonus = quests.filter((quest) => quest.done).length * QUEST_BONUS;
  const score = base + bonus;
  return {
    base,
    bonus,
    score,
    stars: (lines ?? []).filter((line) => score >= line).length,
    quests,
    parts: breakdown(state.terrain, state.board),
  };
}

/**
 * 판을 저장할 수 있는 작은 데이터로 바꾼다. 섬, 시드, 수만 담고 나머지는 다시 재생해 만든다.
 *
 * @param state 판 상태
 * @returns { v, island, seed, moves }
 */
export function serializeRun(state) {
  return { v: 1, island: state.island.id, seed: state.seed, moves: state.moves };
}

/**
 * 저장된 판을 처음부터 재생해 되살린다. 모양이 틀렸거나 규칙에 어긋나는 수가 있으면 null이다.
 *
 * @param data 저장된 데이터
 * @returns 판 상태, 되살릴 수 없으면 null
 */
export function restoreRun(data) {
  const island = data?.v === 1 ? findIsland(data.island) : null;
  if (!island || !Number.isInteger(data.seed) || !Array.isArray(data.moves) || data.moves.length > 200) return null;
  let state = createRun(island, data.seed);
  for (const move of data.moves) {
    if (typeof move !== "object" || move === null) return null;
    const next = apply(state, move);
    if (next === state) return null;
    state = next;
  }
  return state;
}