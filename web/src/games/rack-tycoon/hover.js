import {
  analyze,
  expandCost,
  formatNumber,
  formatRate,
  KINDS,
  LIMIT_TEMP,
  moveItem,
  placeCost,
  previewPlace,
  refundOf,
  SAFE_TEMP,
  upgradeCost,
  xyOf,
} from "./engine.js";
import { inLand, LANDS, TERMINAL_TILE } from "./layout.js";
import { traitOf } from "./sites.js";

/**
 * 초당 수익 변화량을 부호를 붙여 적는다.
 *
 * @param delta 변화량
 * @returns "+1.2", "-0.5", "0.0" 같은 문자열
 */
function signed(delta) {
  if (Math.abs(delta) < 0.005) return "0.0";
  return `${delta > 0 ? "+" : "-"}${formatRate(Math.abs(delta))}`;
}

/**
 * 시설이 영향을 주는 범위를 거리별 세기(0~1)로 바꾼다. 냉각기와 허브는 멀수록 약해지고, 열을 내는 시설은 두 칸까지 퍼진다.
 *
 * @param kind 시설 종류
 * @param level 단계
 * @returns 거리 1, 2, ...의 세기 배열, 범위가 없으면 빈 배열
 */
export function falloffOf(kind, level) {
  const spec = KINDS[kind].levels[level];
  if (kind === "cooler") return Array.from({ length: spec.reach }, (_, i) => 1 - i / spec.reach);
  if (kind === "hub") return Array.from({ length: spec.reach }, (_, i) => 1 - (0.5 * i) / spec.reach);
  if (kind === "ext") return Array.from({ length: spec.reach }, () => 0.8);
  if (kind === "battery") return [];
  return spec.heat > 0 ? [0.5, 0.25] : [];
}

/**
 * 센터 상태를 3D 장면이 그릴 모양으로 바꾼다.
 *
 * @param state 게임 상태
 * @param analysis analyze 결과
 * @param ui { overlay, ghost, selected } 화면 쪽 상태
 * @returns scene.setWorld에 넘길 값
 */
export function worldOf(state, analysis, ui) {
  return {
    land: LANDS[state.land],
    nextLand: LANDS[state.land + 1] ?? null,
    items: state.cells.map((cell, tile) =>
      cell
        ? {
            kind: cell.kind,
            level: cell.level,
            broken: cell.broken,
            heat: cell.kind === "server" ? Math.min(1, Math.max(0, (analysis.heat[tile] - SAFE_TEMP) / (LIMIT_TEMP - SAFE_TEMP))) : 0,
          }
        : null,
    ),
    overlay: ui.overlay,
    tileHeat: ui.overlay === "heat" ? analysis.heat.map((h) => h / LIMIT_TEMP) : null,
    links: ui.overlay === "net" ? analysis.links.map((link) => ({ hub: link.hub, server: link.server, eff: analysis.net.get(link.server) })) : [],
    ghost: ui.ghost,
    selected: ui.selected,
    burning: ui.burning,
    mood: ui.mood,
    theme: traitOf(state.type).theme,
  };
}

/**
 * 시설 하나를 한 줄로 요약한다.
 *
 * @param state 게임 상태
 * @param analysis analyze 결과
 * @param tile 칸 번호
 * @returns 요약 문구
 */
export function summaryOf(state, analysis, tile) {
  const cell = state.cells[tile];
  const spec = KINDS[cell.kind].levels[cell.level];
  if (cell.kind === "server") {
    if (cell.broken) return `${spec.name} · 고장`;
    return `${spec.name} · 초당 ${formatRate(analysis.outputs[tile])} · 온도 ${analysis.heat[tile].toFixed(1)}`;
  }
  if (cell.kind === "cooler") return `${spec.name} · 반경 ${spec.reach}칸, 온도 -${spec.cool}`;
  if (cell.kind === "hub") {
    const hub = analysis.hubs.find((entry) => entry.tile === tile);
    return `${spec.name} · 대역폭 ${hub ? hub.used : 0}/${spec.cap}`;
  }
  if (cell.kind === "battery") return `${spec.name} · 정전 때 전력 +${spec.cap}`;
  if (cell.kind === "ext") return `${spec.name} · 반경 ${spec.reach}칸의 불을 꺼요`;
  return `${spec.name} · 전력 +${spec.cap}`;
}

/**
 * 마우스가 가리키는 칸에서 지금 도구로 무엇을 하게 되는지 설명하고, 놓을 자리에 띄울 미리보기를 만든다.
 *
 * @param args.state 게임 상태
 * @param args.analysis analyze 결과
 * @param args.tool 고른 도구(select, server, cooler, hub, gen, remove, move)
 * @param args.tile 가리키는 칸 번호, 없으면 null
 * @param args.carried 옮기려고 집은 시설의 칸 번호, 없으면 null
 * @returns { ghost, text, tone } tone은 "ok", "poor", "bad" 중 하나
 */
export function describeHover({ state, analysis, tool, tile, carried }) {
  const none = { ghost: null, text: "", tone: "ok" };
  if (tile === null) return none;
  const [x, y] = xyOf(tile);
  const inside = inLand(state.land, x, y);
  const cell = state.cells[tile];
  if (tool === "select") {
    if (tile === TERMINAL_TILE) return { ghost: null, text: "사무실 단말기 · 부지 확장과 센터 현황", tone: "ok" };
    if (cell) return { ghost: null, text: summaryOf(state, analysis, tile), tone: "ok" };
    if (!inside) return { ghost: null, text: "아직 넓히지 않은 땅이에요. 단말기에서 부지를 넓히세요.", tone: "bad" };
    return none;
  }
  if (tile === TERMINAL_TILE) return { ghost: null, text: "단말기 자리예요.", tone: "bad" };
  if (!inside) return { ghost: null, text: "아직 넓히지 않은 땅이에요.", tone: "bad" };
  if (tool === "remove") return cell ? { ghost: null, text: `철거하면 ${formatNumber(refundOf(state, tile))}코인을 돌려받아요.`, tone: "ok" } : none;
  if (tool === "move") {
    if (carried === null) return cell ? { ghost: null, text: "눌러서 옮길 시설을 집어요.", tone: "ok" } : none;
    if (cell) return { ghost: null, text: "빈 칸을 눌러 옮겨 놓으세요.", tone: "bad" };
    const moved = moveItem(state, carried, tile);
    const item = state.cells[carried];
    const delta = analyze(moved.state).income - analysis.income;
    return {
      ghost: { tile, kind: item.kind, valid: true, falloff: falloffOf(item.kind, item.level) },
      text: `여기로 옮기기 · 초당 ${signed(delta)}`,
      tone: delta < -0.05 ? "bad" : "ok",
    };
  }
  const label = KINDS[tool].levels[1].name;
  if (cell) {
    if (cell.broken) return { ghost: null, text: "고장난 서버예요. 눌러서 로봇을 보내 고치세요.", tone: "bad" };
    const cost = cell.kind === tool ? upgradeCost(state, tile) : null;
    if (cost === null) return { ghost: null, text: "이미 시설이 있어요.", tone: "bad" };
    const next = KINDS[tool].levels[cell.level + 1];
    return { ghost: null, text: `${next.name}로 올리기 · ${formatNumber(cost)}코인`, tone: state.coins < cost ? "poor" : "ok" };
  }
  const cost = placeCost(state, tool);
  const after = previewPlace(state, tile, tool);
  const delta = after.income - analysis.income;
  const warns = [];
  if (after.maxTemp >= LIMIT_TEMP && after.maxTemp > analysis.maxTemp) warns.push("과열 위험");
  if (after.efficiency < 1 && analysis.efficiency >= 1) warns.push("전력 부족");
  return {
    ghost: { tile, kind: tool, valid: true, falloff: falloffOf(tool, 1) },
    text: `${label} 설치 · ${formatNumber(cost)}코인 · 초당 ${signed(delta)}${warns.length ? ` · ${warns.join(", ")}` : ""}`,
    tone: warns.length ? "bad" : state.coins < cost ? "poor" : "ok",
  };
}
/**
 * 지금 센터 상황에 맞는 다음 목표나 요령을 한 줄로 알려 준다.
 *
 * @param state 게임 상태
 * @param analysis analyze 결과
 * @returns 안내 문구
 */
export function nextGoal(state, analysis) {
  const counts = analysis.counts;
  if (counts.server < 4) return "서버(1)를 허브 가까이에 놓아 보세요. 허브에서 가까울수록 수익이 높아요.";
  if (analysis.usage >= analysis.cap - 1) return "전력이 거의 찼어요. 발전기(4)를 놓으세요.";
  if (analysis.maxTemp > SAFE_TEMP) return "열지도(H)로 뜨거운 곳을 확인하고 냉각기(2)를 가까이 놓아 보세요.";
  if (counts.server >= 8 && counts.hub < 2) return "서버가 늘었어요. 허브(3)를 더 놓아 대역폭을 나누세요.";
  if (state.difficulty === "normal" || state.difficulty === "hard") {
    if (counts.battery === 0 && analysis.usage >= 20) return "정전에 대비해 배터리(5)를 놓아 보세요. 정전 때 전력을 보태 줘요.";
    if (counts.ext === 0 && counts.server >= 6) return "화재에 대비해 소화기(6)를 서버 가까이 놓아 보세요. 불을 자동으로 꺼요.";
  }
  const cost = expandCost(state);
  if (cost !== null && state.coins >= cost) return "부지를 넓힐 수 있어요. 위의 부지 넓히기 버튼을 눌러 보세요.";
  return "같은 단계 서버를 붙이면 수익이 오르지만 열도 올라요. 배치를 바꿔 가며 가장 좋은 모양을 찾아보세요.";
}
