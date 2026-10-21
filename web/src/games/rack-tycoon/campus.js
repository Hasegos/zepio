import { makeRng } from "../_shared/rng.js";
import { DISASTERS, effectsOf } from "./disaster.js";
import { advance, analyze, newState, OFFLINE_CAP_SECONDS, starterCells } from "./engine.js";
import { brandGain, MAX_SITES, REBRAND_MIN, SITE_TYPES, traitOf } from "./sites.js";

export const LINK_COST = 100000;
const LINK_GROWTH = 2.5;
const AID = 0.15;
const SHARE = 0.5;
const SPREAD = 0.35;

/**
 * 건물 하나를 게임 상태처럼 읽을 수 있게 꺼낸다. 보고 있는 건물이면 상태 그대로이고, 아니면 그 건물의 type, land, cells를 얹는다.
 *
 * @param state 게임 상태
 * @param index 건물 번호
 * @returns 한 건물만 담은 것처럼 보이는 게임 상태
 */
export function viewOf(state, index) {
  if (index === state.active) return state;
  const site = state.sites[index];
  return { ...state, type: site.type, land: site.land, cells: site.cells };
}

/**
 * viewOf로 꺼내 바꾼 건물을 캠퍼스 상태에 도로 넣는다. 코인, 누적 수익, 재난 기록은 view의 값을 따른다.
 *
 * @param state 바꾸기 전 게임 상태
 * @param index 건물 번호
 * @param view 바꾼 결과
 * @returns 게임 상태
 */
export function storeView(state, index, view) {
  if (index === state.active) return view;
  const sites = state.sites.map((site, i) => (i === index ? { type: site.type, land: view.land, cells: view.cells } : site));
  return { ...view, type: state.type, land: state.land, cells: state.cells, active: state.active, sites };
}

/**
 * 건물마다 함수를 한 번씩 돌려 바뀐 상태를 모은다.
 *
 * @param state 게임 상태
 * @param fn (view, index)를 받아 바뀐 view를 돌려주는 함수
 * @returns 게임 상태
 */
export function eachSite(state, fn) {
  let next = state;
  for (let i = 0; i < state.sites.length; i += 1) next = storeView(next, i, fn(viewOf(next, i), i));
  return next;
}

/**
 * 보고 있는 건물의 내용을 sites에 맞춘 건물 목록을 만든다.
 *
 * @param state 게임 상태
 * @returns { type, land, cells } 목록
 */
export function siteList(state) {
  return state.sites.map((site, i) => (i === state.active ? { type: state.type, land: state.land, cells: state.cells } : site));
}

/**
 * 모든 건물에 시간을 흘려보낸다. 코인은 건물 전체가 합쳐서 번다.
 *
 * @param state 게임 상태
 * @param seconds 흘릴 시간(초), MAX_STEP 이하
 * @param fxOf (view, index)를 받아 재난 효과를 돌려주는 함수
 * @returns { state, breaks } breaks는 이번에 고장난 칸의 수
 */
export function advanceAll(state, seconds, fxOf) {
  let breaks = 0;
  const next = eachSite(state, (view, i) => {
    const out = advance(view, seconds, fxOf(view, i));
    breaks += out.breaks.length;
    return out.state;
  });
  return { state: { ...next, time: state.time + seconds }, breaks };
}

/**
 * 접속하지 않은 동안 모든 건물이 번 수익을 한꺼번에 계산한다. 새 고장은 없고 최대 8시간까지만 인정한다.
 *
 * @param state 게임 상태
 * @param seconds 접속하지 않은 시간(초)
 * @returns { state, gain, seconds } seconds는 인정한 시간
 */
export function offlineAll(state, seconds) {
  const counted = Math.max(0, Math.min(seconds, OFFLINE_CAP_SECONDS));
  let rate = 0;
  for (let i = 0; i < state.sites.length; i += 1) rate += analyze(viewOf(state, i)).income;
  const gain = rate * counted;
  return { state: { ...state, coins: state.coins + gain, lifetime: state.lifetime + gain }, gain, seconds: counted };
}

/**
 * 보고 있는 건물을 바꾼다.
 *
 * @param state 게임 상태
 * @param index 건물 번호
 * @returns { state, error }
 */
export function switchSite(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.sites.length) return { state, error: "그런 건물이 없어요." };
  if (index === state.active) return { state };
  const sites = siteList(state);
  const site = sites[index];
  return { state: { ...state, sites, active: index, type: site.type, land: site.land, cells: site.cells } };
}

/**
 * 새 건물을 사서 캠퍼스에 더한다. 보고 있는 건물은 바뀌지 않는다.
 *
 * @param state 게임 상태
 * @param type 건물 종류
 * @returns { state, error }
 */
export function buySite(state, type) {
  if (!Object.hasOwn(SITE_TYPES, type)) return { state, error: "알 수 없는 건물이에요." };
  if (state.sites.length >= MAX_SITES) return { state, error: "더 늘릴 수 없어요." };
  if (state.sites.some((site, i) => (i === state.active ? state.type : site.type) === type)) return { state, error: "이미 가진 건물이에요." };
  const cost = traitOf(type).cost;
  if (state.coins < cost) return { state, error: "코인이 부족해요." };
  const sites = [...siteList(state), { type, land: 0, cells: starterCells() }];
  return { state: { ...state, coins: state.coins - cost, sites } };
}

/**
 * 건물 번호의 종류를 구한다.
 *
 * @param state 게임 상태
 * @param index 건물 번호
 * @returns 건물 종류
 */
function typeAt(state, index) {
  return index === state.active ? state.type : state.sites[index].type;
}

/**
 * 한 건물과 이어진 건물 번호를 모은다.
 *
 * @param state 게임 상태
 * @param index 건물 번호
 * @returns 이어진 건물 번호 목록
 */
function peersOf(state, index) {
  const type = typeAt(state, index);
  const out = [];
  for (const [a, b] of state.links) {
    const other = a === type ? b : b === type ? a : null;
    if (other === null) continue;
    const at = state.sites.findIndex((_, j) => typeAt(state, j) === other);
    if (at !== -1) out.push(at);
  }
  return out;
}

/**
 * 건물 두 개를 잇는 값을 구한다. 이을수록 비싸진다.
 *
 * @param state 게임 상태
 * @returns 코인
 */
export function linkCost(state) {
  return Math.ceil(LINK_COST * LINK_GROWTH ** state.links.length);
}

/**
 * 건물 두 개를 네트워크로 잇는다. 이어진 건물이 많을수록 수익이 늘지만 재난도 번질 수 있다.
 *
 * @param state 게임 상태
 * @param a 건물 종류
 * @param b 건물 종류
 * @returns { state, error }
 */
export function linkSites(state, a, b) {
  const owned = (type) => state.sites.some((_, i) => typeAt(state, i) === type);
  if (a === b || !owned(a) || !owned(b)) return { state, error: "가진 건물 두 개를 골라 주세요." };
  if (state.links.some((pair) => pair.includes(a) && pair.includes(b))) return { state, error: "이미 이어진 건물이에요." };
  const cost = linkCost(state);
  if (state.coins < cost) return { state, error: "코인이 부족해요." };
  return { state: { ...state, coins: state.coins - cost, links: [...state.links, [a, b]] } };
}

/**
 * 건물마다 지금 받는 재난 효과를 구한다. 이어진 건물이 있으면 정전 때 전력을 나눠 받고 트래픽 폭주 때 부하를 나눠 진다.
 *
 * @param state 게임 상태
 * @param evs 건물별 재난 진행 상태
 * @returns 건물 순서대로 analyze에 넘길 효과 목록
 */
export function campusFx(state, evs) {
  const live = (j, kind) => evs[j].event?.kind === kind && evs[j].event.phase === "live";
  return state.sites.map((_, i) => {
    const fx = effectsOf(viewOf(state, i), evs[i]);
    if (!live(i, "blackout") && !live(i, "surge")) return fx;
    const peers = peersOf(state, i);
    if (live(i, "blackout")) return { ...fx, capMul: Math.min(1, fx.capMul + AID * peers.filter((j) => !live(j, "blackout")).length) };
    return { ...fx, demandMul: 1 + (fx.demandMul - 1) / (1 + SHARE * peers.filter((j) => !live(j, "surge")).length) };
  });
}

/**
 * 새로 시작한 정전이나 트래픽 폭주가 이어진 건물로 번지게 한다. 화재는 번지지 않는다.
 *
 * @param state 게임 상태
 * @param before 시간을 흘리기 전 건물별 재난 상태
 * @param after 시간을 흘린 뒤 건물별 재난 상태
 * @returns 번짐을 반영한 건물별 재난 상태
 */
export function spreadEvents(state, before, after) {
  let next = after;
  after.forEach((ev, i) => {
    const e = ev.event;
    if (!e || before[i].event || e.kind === "fire") return;
    for (const j of peersOf(state, i)) {
      if (next[j].event || makeRng(ev.seed + ev.n * 31 + j)() >= SPREAD) continue;
      const event = { kind: e.kind, phase: "warn", left: DISASTERS[e.kind].warn, burning: {}, damage: 0 };
      next = next.map((other, k) => (k === j ? { ...other, event } : other));
    }
  });
  return next;
}

/**
 * 저장할 모양으로 정리한다. 보고 있는 건물의 내용을 sites에 맞춘다.
 *
 * @param state 게임 상태
 * @returns { coins, lifetime, time, difficulty, stats, active, links, codex, badges, title, brand, sites }
 */
export function snapshot(state) {
  const { coins, lifetime, time, difficulty, stats, active, links, codex, badges, title, brand } = state;
  return { coins, lifetime, time, difficulty, stats, active, links, codex, badges, title, brand, sites: siteList(state) };
}
/**
 * 리브랜딩한다. 코인, 건물, 시설, 연결, 누적 수익을 처음으로 돌리고, 도감, 업적, 칭호, 재난 기록, 난이도는 남긴다.
 * 누적 수익에 따라 브랜드 포인트를 얻고, 포인트 하나당 수익이 영구히 5% 늘어난다.
 *
 * @param state 게임 상태
 * @returns { state, error }
 */
export function rebrand(state) {
  if (state.lifetime < REBRAND_MIN) return { state, error: "아직 리브랜딩할 수 없어요." };
  const { difficulty, stats, codex, badges, title, brand } = state;
  const next = { points: brand.points + brandGain(state.lifetime), count: brand.count + 1 };
  return { state: { ...newState(), difficulty, stats, codex, badges, title, brand: next } };
}
