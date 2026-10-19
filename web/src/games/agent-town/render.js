import { BUILDINGS, HEIGHT, TILE, tileAt, VIEW_H, VIEW_W, WIDTH } from "./world.js";

export const VIEW_PX_W = VIEW_W * TILE;
export const VIEW_PX_H = VIEW_H * TILE;

const THEMES = {
  blue: { roof: "#3f6fb8", roofDark: "#2f568f", wall: "#dbe6f5" },
  green: { roof: "#4f9a5a", roofDark: "#3b7a45", wall: "#e0f0d8" },
  pink: { roof: "#d6779f", roofDark: "#b25a80", wall: "#f8e0ea" },
  gray: { roof: "#737b8c", roofDark: "#575e6e", wall: "#e2e5ea" },
  orange: { roof: "#e0803a", roofDark: "#b9631f", wall: "#fbe6cf" },
};

/**
 * 칸 좌표에서 고정된 의사 난수(0 이상 1 미만)를 만든다. 칸마다 무늬가 달라 보이게 한다.
 *
 * @param x 가로 칸
 * @param y 세로 칸
 * @param k 무늬 번호
 * @returns 0 이상 1 미만의 수
 */
function noise(x, y, k = 0) {
  let h = Math.imul(x * 374761393 + y * 668265263 + k * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const px = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

function drawGround(ctx, x, y, tx, ty) {
  px(ctx, x, y, TILE, TILE, "#92d16c");
  for (let i = 0; i < 3; i += 1) {
    const a = Math.floor(noise(tx, ty, i) * 14);
    const b = Math.floor(noise(tx, ty, i + 9) * 14);
    px(ctx, x + a, y + b, 1, 1, "#7bbd57");
  }
  if (noise(tx, ty, 20) > 0.86) {
    const a = 3 + Math.floor(noise(tx, ty, 21) * 9);
    const b = 3 + Math.floor(noise(tx, ty, 22) * 9);
    px(ctx, x + a, y + b, 2, 2, "#fff2a8");
    px(ctx, x + a, y + b, 1, 1, "#f6a1b8");
  }
}

function drawTall(ctx, x, y, tx, ty) {
  px(ctx, x, y, TILE, TILE, "#4f9f45");
  for (let i = 0; i < 6; i += 1) {
    const a = 1 + Math.floor(noise(tx, ty, i) * 12);
    const b = 3 + Math.floor(noise(tx, ty, i + 5) * 10);
    px(ctx, x + a, y + b, 1, 3, "#2f7a35");
    px(ctx, x + a + 1, y + b - 1, 1, 2, "#7ccf63");
    px(ctx, x + a - 1, y + b - 1, 1, 2, "#7ccf63");
  }
}

function drawPath(ctx, x, y, tx, ty) {
  px(ctx, x, y, TILE, TILE, "#dcc48f");
  for (let i = 0; i < 4; i += 1) {
    const a = Math.floor(noise(tx, ty, i) * 14);
    const b = Math.floor(noise(tx, ty, i + 7) * 14);
    px(ctx, x + a, y + b, 2, 1, "#c4a96f");
  }
}

function drawWater(ctx, x, y, tx, ty) {
  px(ctx, x, y, TILE, TILE, "#5aa9e6");
  for (let i = 0; i < 2; i += 1) {
    const a = Math.floor(noise(tx, ty, i) * 10);
    const b = 2 + Math.floor(noise(tx, ty, i + 3) * 10);
    px(ctx, x + a, y + b, 4, 1, "#9ad1f6");
  }
}

function drawTree(ctx, x, y, tx, ty) {
  drawGround(ctx, x, y, tx, ty);
  px(ctx, x + 6, y + 10, 4, 6, "#7a4e2a");
  px(ctx, x + 2, y + 2, 12, 9, "#2f8a3c");
  px(ctx, x + 1, y + 4, 14, 5, "#2f8a3c");
  px(ctx, x + 4, y + 1, 8, 2, "#2f8a3c");
  px(ctx, x + 4, y + 3, 4, 3, "#58b653");
  px(ctx, x + 9, y + 7, 4, 2, "#226b2e");
}

function drawSign(ctx, x, y, tx, ty) {
  drawGround(ctx, x, y, tx, ty);
  px(ctx, x + 7, y + 8, 2, 7, "#7a4e2a");
  px(ctx, x + 2, y + 2, 12, 7, "#d9a867");
  px(ctx, x + 2, y + 2, 12, 1, "#f0cf94");
  px(ctx, x + 4, y + 4, 8, 1, "#7a4e2a");
  px(ctx, x + 4, y + 6, 6, 1, "#7a4e2a");
}

function drawBuilding(ctx, b) {
  const theme = THEMES[b.theme];
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  px(ctx, x + 2, y + h - 2, w, 4, "rgba(0,0,0,0.18)");
  px(ctx, x, y, w, h, theme.wall);
  px(ctx, x, y, w, TILE + 6, theme.roof);
  for (let i = 0; i < w; i += 8) px(ctx, x + i, y + TILE + 4, 4, 2, theme.roofDark);
  px(ctx, x, y + TILE + 6, w, 2, theme.roofDark);
  px(ctx, x, y, w, 1, "rgba(255,255,255,0.35)");
  px(ctx, x, y, 1, h, "#00000022");
  px(ctx, x + w - 1, y, 1, h, "#00000033");
  px(ctx, x, y + h - 1, w, 1, "#00000033");
  for (let tx = 0; tx < b.w; tx += 1) {
    const dx = x + tx * TILE;
    if (b.x + tx === b.door[0]) continue;
    px(ctx, dx + 4, y + h - 13, 8, 7, "#7fb4e6");
    px(ctx, dx + 4, y + h - 13, 8, 1, "#ffffff");
    px(ctx, dx + 7, y + h - 13, 1, 7, "#ffffff");
  }
  const door = { x: b.door[0] * TILE, y: b.door[1] * TILE };
  px(ctx, door.x + 3, door.y + 3, 10, 13, "#5a3a22");
  px(ctx, door.x + 4, door.y + 4, 8, 12, "#8b5a34");
  px(ctx, door.x + 10, door.y + 10, 1, 1, "#ffe08a");
}

/**
 * 지도 전체를 한 번만 그려 둔 그림을 만든다. 움직이는 것은 매 프레임 이 위에 그린다.
 *
 * @param canvas 그릴 캔버스(크기는 이 함수가 맞춘다)
 * @returns 그렸으면 true, 캔버스를 쓸 수 없으면 false
 */
export function drawWorld(canvas) {
  canvas.width = WIDTH * TILE;
  canvas.height = HEIGHT * TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  for (let ty = 0; ty < HEIGHT; ty += 1) {
    for (let tx = 0; tx < WIDTH; tx += 1) {
      const x = tx * TILE;
      const y = ty * TILE;
      const ch = tileAt(tx, ty);
      if (ch === "," ) drawTall(ctx, x, y, tx, ty);
      else if (ch === "=") drawPath(ctx, x, y, tx, ty);
      else if (ch === "~") drawWater(ctx, x, y, tx, ty);
      else if (ch === "T") drawTree(ctx, x, y, tx, ty);
      else if (ch === "S") drawSign(ctx, x, y, tx, ty);
      else drawGround(ctx, x, y, tx, ty);
    }
  }
  for (const b of BUILDINGS) drawBuilding(ctx, b);
  return true;
}

/**
 * 클로드풍 주황 도트 캐릭터를 그린다. 몸은 직사각형, 눈은 검은 세로 막대이고 팔과 다리가 달려 있다.
 *
 * @param ctx 2D 컨텍스트
 * @param x 왼쪽 위 화면 x
 * @param y 왼쪽 위 화면 y
 * @param dir up, down, left, right
 * @param frame 걷는 모양(0 또는 1)
 * @param scale 확대 배율(제목과 전투 화면용)
 */
export function drawAgent(ctx, x, y, dir, frame, scale = 1) {
  const r = (dx, dy, w, h, color) => px(ctx, x + dx * scale, y + dy * scale, w * scale, h * scale, color);
  const body = "#d97757";
  const dark = "#b95d3f";
  const bob = frame ? 1 : 0;
  r(3, 14, 10, 1, "rgba(0,0,0,0.22)");
  const step = frame ? 1 : 0;
  r(4, 11 - bob, 2, 3 + step, dark);
  r(10, 11 - bob, 2, 3 + (frame ? 0 : 1), dark);
  r(0, 6 - bob, 3, 3, body);
  r(13, 6 - bob, 3, 3, body);
  r(2, 3 - bob, 12, 9, body);
  r(2, 11 - bob, 12, 1, dark);
  r(2, 3 - bob, 12, 1, "#eb9272");
  if (dir === "up") return;
  if (dir === "down") {
    r(5, 5 - bob, 2, 4, "#1a1410");
    r(9, 5 - bob, 2, 4, "#1a1410");
  } else if (dir === "left") {
    r(3, 5 - bob, 2, 4, "#1a1410");
    r(7, 5 - bob, 2, 4, "#1a1410");
  } else {
    r(7, 5 - bob, 2, 4, "#1a1410");
    r(11, 5 - bob, 2, 4, "#1a1410");
  }
}

/**
 * 마을 사람(또는 경비 로봇)을 그린다.
 *
 * @param ctx 2D 컨텍스트
 * @param x 왼쪽 위 화면 x
 * @param y 왼쪽 위 화면 y
 * @param npc { kind, look: { shirt, hair, skin } }
 * @param frame 숨쉬는 모양(0 또는 1)
 * @param scale 확대 배율
 */
export function drawNpc(ctx, x, y, npc, frame, scale = 1) {
  const r = (dx, dy, w, h, color) => px(ctx, x + dx * scale, y + dy * scale, w * scale, h * scale, color);
  const bob = frame ? 1 : 0;
  const { shirt, hair, skin } = npc.look;
  r(3, 15, 10, 1, "rgba(0,0,0,0.22)");
  if (npc.kind === "guard") {
    r(7, 0 - bob, 2, 2, "#c24a4a");
    r(3, 3 - bob, 10, 8, shirt);
    r(3, 3 - bob, 10, 1, "#c8cfd9");
    r(5, 5 - bob, 6, 3, "#23262f");
    r(6, 6 - bob, 1, 1, "#ff6b6b");
    r(9, 6 - bob, 1, 1, "#ff6b6b");
    r(4, 11, 3, 4, hair);
    r(9, 11, 3, 4, hair);
    r(1, 5 - bob, 2, 5, hair);
    r(13, 5 - bob, 2, 5, hair);
    return;
  }
  r(4, 11, 3, 4, "#3a3550");
  r(9, 11, 3, 4, "#3a3550");
  r(3, 7 - bob, 10, 5, shirt);
  r(2, 8 - bob, 2, 3, skin);
  r(12, 8 - bob, 2, 3, skin);
  r(4, 1 - bob, 8, 7, skin);
  r(3, 0 - bob, 10, 3, hair);
  r(3, 3 - bob, 2, 3, hair);
  r(11, 3 - bob, 2, 3, hair);
  r(6, 4 - bob, 1, 2, "#1a1410");
  r(9, 4 - bob, 1, 2, "#1a1410");
  if (npc.id === "redcap") {
    r(3, -1 - bob, 10, 3, "#d94a4a");
    r(9, 1 - bob, 5, 1, "#b03838");
  }
}

/**
 * 의뢰를 뜻하는 말풍선 몬스터를 그린다. 위험한 의뢰는 붉고, 숨은 지시가 있으면 보라색이다.
 *
 * @param ctx 2D 컨텍스트
 * @param x 왼쪽 위 화면 x
 * @param y 왼쪽 위 화면 y
 * @param task 의뢰
 * @param frame 숨쉬는 모양(0 또는 1)
 * @param scale 확대 배율
 */
export function drawRequest(ctx, x, y, task, frame, scale = 1) {
  const r = (dx, dy, w, h, color) => px(ctx, x + dx * scale, y + dy * scale, w * scale, h * scale, color);
  const tone = task.danger ? "#e8685c" : task.injection ? "#a07ae0" : task.urgent ? "#f2c14e" : "#f4efe3";
  const edge = task.danger ? "#a53a31" : task.injection ? "#6a45a8" : task.urgent ? "#b88a1a" : "#a89f8a";
  const bob = frame ? 1 : 0;
  r(3, 14, 10, 1, "rgba(0,0,0,0.2)");
  r(1, 2 - bob, 14, 10, edge);
  r(2, 1 - bob, 12, 12, edge);
  r(2, 3 - bob, 12, 8, tone);
  r(3, 2 - bob, 10, 10, tone);
  r(3, 12 - bob, 3, 3, edge);
  r(3, 12 - bob, 2, 2, tone);
  r(5, 5 - bob, 2, 3, "#1a1410");
  r(10, 5 - bob, 2, 3, "#1a1410");
  r(6, 9 - bob, 4, 1, "#1a1410");
  if (task.ambiguous) r(7, 0 - bob, 2, 2, "#1a1410");
}

/**
 * 한 프레임을 그린다. 카메라는 플레이어를 가운데에 두고 지도 끝에서 멈춘다.
 *
 * @param ctx 화면 캔버스 컨텍스트
 * @param world drawWorld로 그려 둔 지도 그림
 * @param view { player: {x, y, dir}, from: {x, y}|null, t: 0~1, npcs, tick }
 */
export function drawFrame(ctx, world, view) {
  const { player, from, t, npcs, tick } = view;
  const fx = from ? from.x + (player.x - from.x) * t : player.x;
  const fy = from ? from.y + (player.y - from.y) * t : player.y;
  const maxX = WIDTH * TILE - VIEW_PX_W;
  const maxY = HEIGHT * TILE - VIEW_PX_H;
  const camX = Math.max(0, Math.min(maxX, Math.round(fx * TILE + TILE / 2 - VIEW_PX_W / 2)));
  const camY = Math.max(0, Math.min(maxY, Math.round(fy * TILE + TILE / 2 - VIEW_PX_H / 2)));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(world, camX, camY, VIEW_PX_W, VIEW_PX_H, 0, 0, VIEW_PX_W, VIEW_PX_H);
  const idle = Math.floor(tick / 500) % 2;
  const things = [
    ...npcs.map((npc) => ({ y: npc.y, draw: () => drawNpc(ctx, npc.x * TILE - camX, npc.y * TILE - camY, npc, idle) })),
    {
      y: fy,
      draw: () =>
        drawAgent(ctx, Math.round(fx * TILE) - camX, Math.round(fy * TILE) - camY, player.dir, t < 1 ? Math.floor(t * 2) % 2 : 0),
    },
  ].sort((a, b) => a.y - b.y);
  for (const thing of things) thing.draw();
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  for (const b of BUILDINGS) {
    const cx = (b.x + b.w / 2) * TILE - camX;
    const cy = b.y * TILE - camY + 12;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillText(b.name, cx + 1, cy + 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(b.name, cx, cy);
  }
}