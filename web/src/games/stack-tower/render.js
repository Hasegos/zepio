import { BLOCK_H, HEIGHT, WIDTH } from "./engine.js";

export const SCALE = 2;

const GROUND = 24;
const VISIBLE_ROWS = 7;

/**
 * 층마다 색을 돌려 입힌다.
 *
 * @param row 블록이 놓인 층(0부터)
 * @returns CSS 색
 */
function colorOf(row) {
  return `hsl(${(235 + row * 11) % 360} 72% 56%)`;
}

/**
 * 층의 위쪽 모서리가 그려질 화면 y를 구한다.
 *
 * @param row 층(0부터)
 * @param camera 카메라가 올라간 층 수
 * @returns 화면 y
 */
function topOf(row, camera) {
  return HEIGHT - GROUND - (row + 1) * BLOCK_H + camera * BLOCK_H;
}

/**
 * 블록 하나를 그린다. 윗면에 밝은 띠를 둬서 두께가 보이게 한다.
 *
 * @param ctx 캔버스 2D 컨텍스트
 * @param block 블록(x, w)
 * @param row 층(0부터)
 * @param camera 카메라가 올라간 층 수
 */
function drawBlock(ctx, block, row, camera) {
  const y = topOf(row, camera);
  if (y > HEIGHT || y < -BLOCK_H) return;
  ctx.fillStyle = colorOf(row);
  ctx.fillRect(block.x, y, block.w, BLOCK_H - 1);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(block.x, y, block.w, 4);
}

/**
 * 새 화면 상태를 만든다. 게임 상태 밖에서 연출만 맡는 값(카메라, 떨어지는 조각, 반짝임)을 담는다.
 *
 * @param state 게임 상태
 * @returns 화면 상태
 */
export function createView(state) {
  return { state, camera: 0, pieces: [], flash: 0 };
}

/**
 * 잘려 나간 조각을 떨어지게 등록한다.
 *
 * @param view 화면 상태
 * @param cut 조각(x, w)
 * @param row 조각이 있던 층
 */
export function addPiece(view, cut, row) {
  view.pieces.push({ x: cut.x, w: cut.w, row, y: 0, vy: 0, alpha: 1 });
}

/**
 * 연출을 한 프레임 진행한다. 카메라는 탑 꼭대기를 따라 올라가고 조각은 떨어지며 사라진다.
 *
 * @param view 화면 상태
 * @param ms 지난 시간(밀리초)
 * @param reduce true이면 카메라를 바로 옮긴다
 */
export function advance(view, ms, reduce) {
  const dt = Math.min(ms, 50) / 1000;
  const target = Math.max(0, view.state.blocks.length - VISIBLE_ROWS);
  view.camera = reduce ? target : view.camera + (target - view.camera) * Math.min(1, dt * 8);
  view.flash = Math.max(0, view.flash - dt * 3);
  view.pieces = view.pieces
    .map((p) => ({ ...p, vy: p.vy + 900 * dt, y: p.y + p.vy * dt, alpha: p.alpha - dt * 1.2 }))
    .filter((p) => p.alpha > 0);
}

/**
 * 화면 전체를 그린다. 배경, 바닥, 쌓인 블록, 움직이는 블록, 가이드 선, 떨어지는 조각 순서다.
 *
 * @param ctx 캔버스 2D 컨텍스트
 * @param view 화면 상태
 */
export function draw(ctx, view) {
  const { state, camera } = view;
  const last = state.blocks[state.blocks.length - 1];
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#c7d2fe");
  sky.addColorStop(1, "#f8fafc");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#334155";
  ctx.fillRect(0, HEIGHT - GROUND + camera * BLOCK_H, WIDTH, GROUND + BLOCK_H);

  state.blocks.forEach((block, row) => drawBlock(ctx, block, row, camera));

  if (!state.over) {
    const lastTop = topOf(state.blocks.length - 1, camera);
    ctx.strokeStyle = "rgba(79,70,229,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(last.x, lastTop);
    ctx.lineTo(last.x, 0);
    ctx.moveTo(last.x + last.w, lastTop);
    ctx.lineTo(last.x + last.w, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    drawBlock(ctx, state.moving, state.blocks.length, camera);
  }

  if (view.flash > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${view.flash})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(last.x, topOf(state.blocks.length - 1, camera), last.w, BLOCK_H - 1);
  }

  view.pieces.forEach((p) => {
    ctx.globalAlpha = p.alpha;
    drawBlock(ctx, { x: p.x, w: p.w }, p.row, camera + p.y / BLOCK_H);
  });
  ctx.globalAlpha = 1;
}