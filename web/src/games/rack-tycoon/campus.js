import { advance, analyze, OFFLINE_CAP_SECONDS, starterCells } from "./engine.js";
import { MAX_SITES, SITE_TYPES, traitOf } from "./sites.js";

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
 * 저장할 모양으로 정리한다. 보고 있는 건물의 내용을 sites에 맞춘다.
 *
 * @param state 게임 상태
 * @returns { coins, lifetime, time, difficulty, stats, active, sites }
 */
export function snapshot(state) {
  const { coins, lifetime, time, difficulty, stats, active } = state;
  return { coins, lifetime, time, difficulty, stats, active, sites: siteList(state) };
}