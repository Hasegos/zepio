export const WIDTH = 320;
export const HEIGHT = 420;
export const BLOCK_H = 22;
export const BASE_W = 200;

const PERFECT_PX = 4;
const COMBO_FOR_GROW = 3;
const GROW_PX = 6;
const MIN_OVERLAP = 1;
const MAX_STEP_MS = 50;

/**
 * 층수에 맞는 블록 이동 속도를 구한다. 층이 오를수록 빨라지고 상한이 있다.
 *
 * @param floors 쌓은 층수
 * @returns 초당 이동 픽셀
 */
export function speedFor(floors) {
  return Math.min(110 + floors * 8, 330);
}

/**
 * 층수에 맞춰 양쪽 끝에서 번갈아 들어오는 새 블록을 만든다.
 *
 * @param w 블록 폭
 * @param floors 지금까지 쌓은 층수
 * @returns 움직이는 블록
 */
function startBlock(w, floors) {
  const fromLeft = floors % 2 === 0;
  return { x: fromLeft ? 0 : WIDTH - w, w, dir: fromLeft ? 1 : -1 };
}

/**
 * 첫 판 상태를 만든다. 가운데 놓인 바닥 블록 하나와 움직이는 블록 하나로 시작한다.
 *
 * @returns 게임 상태
 */
export function createState() {
  const base = { x: (WIDTH - BASE_W) / 2, w: BASE_W };
  return {
    blocks: [base],
    moving: startBlock(BASE_W, 0),
    floors: 0,
    perfects: 0,
    combo: 0,
    over: false,
    perfect: false,
    cut: null,
  };
}

/**
 * 시간을 흘려 움직이는 블록을 옮긴다. 양 끝에서 튕기고, 한 번에 흐르는 시간은 제한해 탭이 숨었다 돌아와도 튀지 않는다.
 *
 * @param state 게임 상태
 * @param ms 지난 시간(밀리초)
 * @returns 새 게임 상태
 */
export function step(state, ms) {
  if (state.over) return state;
  const { moving } = state;
  const max = WIDTH - moving.w;
  const dt = Math.min(ms, MAX_STEP_MS) / 1000;
  let x = moving.x + moving.dir * speedFor(state.floors) * dt;
  let dir = moving.dir;
  if (x < 0) {
    x = -x;
    dir = 1;
  } else if (x > max) {
    x = 2 * max - x;
    dir = -1;
  }
  return { ...state, moving: { ...moving, x: Math.min(max, Math.max(0, x)), dir } };
}

/**
 * 완성한 블록을 탑에 올리고 다음 블록을 내보낸다.
 *
 * @param state 게임 상태
 * @param block 올릴 블록(x, w)
 * @param cut 잘려 나간 조각 또는 null
 * @param combo 이어진 완벽 정렬 횟수
 * @param perfect 이번 블록이 완벽 정렬인지
 * @returns 새 게임 상태
 */
function place(state, block, cut, combo, perfect) {
  const floors = state.floors + 1;
  return {
    ...state,
    blocks: [...state.blocks, block],
    moving: startBlock(block.w, floors),
    floors,
    perfects: state.perfects + (perfect ? 1 : 0),
    combo,
    perfect,
    cut,
  };
}

/**
 * 움직이는 블록을 내려놓는다. 아래 블록과 겹친 만큼만 남고 나머지는 잘린다.
 * 오차가 작으면 완벽 정렬로 폭을 지키고, 연속 완벽 정렬이면 폭이 조금 늘어난다. 하나도 겹치지 못하면 끝난다.
 *
 * @param state 게임 상태
 * @returns 새 게임 상태, 끝난 판이면 그대로
 */
export function drop(state) {
  if (state.over) return state;
  const prev = state.blocks[state.blocks.length - 1];
  const { moving } = state;
  const dx = moving.x - prev.x;

  if (Math.abs(dx) <= PERFECT_PX) {
    const combo = state.combo + 1;
    const w = combo >= COMBO_FOR_GROW ? Math.min(prev.w + GROW_PX, BASE_W) : prev.w;
    const x = Math.min(WIDTH - w, Math.max(0, prev.x - (w - prev.w) / 2));
    return place(state, { x, w }, null, combo, true);
  }

  const overlap = prev.w - Math.abs(dx);
  if (overlap < MIN_OVERLAP) {
    return { ...state, over: true, perfect: false, cut: { x: moving.x, w: moving.w } };
  }
  const cut = dx > 0 ? { x: prev.x + prev.w, w: dx } : { x: moving.x, w: -dx };
  return place(state, { x: Math.max(moving.x, prev.x), w: overlap }, cut, 0, false);
}