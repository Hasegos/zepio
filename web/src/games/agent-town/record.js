import { CONTEXT_CAP, USAGE_CAP } from "./battle.js";
import { isSlotItem, ITEMS, MAX_SLOTS, MEMBERS, slotsOf } from "./party.js";
import { GYM_IDS } from "./gyms.js";
import { newPools } from "./reducer.js";
import { ALL_TASK_IDS, REGION_TASKS, TRAINER_TASKS } from "./tasks.js";
import { MAPS, START, START_MAP, walkable } from "./world.js";
import { isInt } from "../_shared/validate.js";

const GEAR_IDS = ITEMS.map((it) => it.id);
const int = (n, max) => isInt(n, 0, max);

/**
 * 진행 중인 게임 상태에서 저장할 부분만 뽑는다. 전투와 대화는 저장하지 않는다.
 *
 * @param state 게임 상태(지도 · 시설 · 엔딩 화면)
 * @returns 저장용 스냅샷
 */
export function snapshot(state) {
  return {
    seed: state.seed,
    map: state.map,
    player: state.player,
    trust: state.trust,
    coins: state.coins,
    context: state.context,
    usage: state.usage,
    gear: state.gear,
    slots: slotsOf(state.gear, state.slots),
    party: state.party,
    cleared: state.cleared,
    seen: state.seen,
    pools: state.pools,
    badges: state.badges,
    cooldown: state.cooldown,
    gymPhase: 0,
    tip: state.tip,
    steps: state.steps,
    disasters: state.disasters,
    tasksDone: state.tasksDone,
  };
}

/**
 * 저장된 스냅샷을 검증해 게임 상태로 되살린다. 깨진 값이 하나라도 있으면 null이다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns 지도 화면 상태, 못 쓰면 null
 */
export function restore(raw) {
  if (!raw || typeof raw !== "object") return null;
  const { player } = raw;
  const map = raw.map ?? START_MAP;
  const badges = raw.badges ?? (raw.finished === true ? ["town"] : []);
  const ok =
    typeof map === "string" &&
    Object.hasOwn(MAPS, map) &&
    badgesOk(badges) &&
    Number.isInteger(raw.seed) &&
    Number.isInteger(player?.x) &&
    Number.isInteger(player?.y) &&
    ["up", "down", "left", "right"].includes(player?.dir) &&
    int(raw.trust, 999) &&
    int(raw.coins, 99999) &&
    int(raw.context, CONTEXT_CAP) &&
    int(raw.usage, USAGE_CAP) &&
    int(raw.cooldown, 10) &&
    int(raw.tip, 99999) &&
    int(raw.steps, 9999999) &&
    int(raw.disasters, 9999) &&
    int(raw.tasksDone, 9999) &&
    Array.isArray(raw.party) &&
    raw.party.every((id) => Object.hasOwn(MEMBERS, id)) &&
    new Set(raw.party).size === raw.party.length &&
    plain(raw.gear, GEAR_IDS) &&
    slotsOk(raw.slots, raw.gear) &&
    plain(raw.cleared, Object.keys(TRAINER_TASKS)) &&
    plain(raw.seen, ALL_TASK_IDS);
  if (!ok) return null;
  const pools = readPools(raw);
  if (!pools) return null;
  const { x, y } = player;
  const inside = x >= 0 && y >= 0 && x < MAPS[map].width && y < MAPS[map].height;
  const fallback = map === START_MAP ? { ...START } : { ...MAPS[map].rest };
  const spot = inside && walkable(map, x, y, { trust: raw.trust, badges }) ? { x, y, dir: player.dir } : fallback;
  return {
    phase: "map",
    seed: raw.seed,
    map,
    player: spot,
    trust: raw.trust,
    coins: raw.coins,
    context: raw.context,
    usage: raw.usage,
    gear: raw.gear,
    slots: slotsOf(raw.gear, raw.slots),
    party: raw.party,
    cleared: raw.cleared,
    seen: raw.seen,
    pools,
    badges,
    cooldown: raw.cooldown,
    gymPhase: 0,
    tip: raw.tip,
    steps: raw.steps,
    disasters: raw.disasters,
    tasksDone: raw.tasksDone,
    dialog: null,
    battle: null,
    facility: null,
    notice: "",
    ending: null,
    saveTick: 0,
  };
}

/** 뱃지는 체육관 식별자만 중복 없이 담겨야 한다. */
function badgesOk(badges) {
  return Array.isArray(badges) && badges.every((id) => GYM_IDS.includes(id)) && new Set(badges).size === badges.length;
}

/**
 * 지역별 의뢰 대기열을 읽는다. 예전 저장(pool, forestPool)은 옮겨 담고, 없는 지역은 아직 해결하지 않은 의뢰로 채운다.
 *
 * @param raw 저장소에서 읽은 값(seed와 seen은 이미 검증됨)
 * @returns { 지역: [id] }, 어긋나면 null
 */
function readPools(raw) {
  const source = raw.pools ?? { town: raw.pool, ...(raw.forestPool === undefined ? {} : { forest: raw.forestPool }) };
  if (source === null || typeof source !== "object" || Array.isArray(source)) return null;
  const regions = Object.keys(REGION_TASKS);
  if (!Object.keys(source).every((key) => regions.includes(key))) return null;
  const fresh = newPools(raw.seed);
  const out = {};
  for (const region of regions) {
    const ids = REGION_TASKS[region].map((t) => t.id);
    const list = source[region];
    if (list === undefined) {
      if (region === "town") return null;
      out[region] = fresh[region].filter((id) => raw.seen[id] !== "win");
    } else if (Array.isArray(list) && list.every((id) => ids.includes(id)) && new Set(list).size === list.length) {
      out[region] = list;
    } else {
      return null;
    }
  }
  return out;
}

/** 슬롯 정보가 없으면(예전 저장) 통과, 있으면 가진 슬롯 장비만 중복 없이 칸 수 안에서 담겨야 한다. */
function slotsOk(slots, gear) {
  if (slots === undefined) return true;
  return (
    Array.isArray(slots) &&
    slots.length <= MAX_SLOTS &&
    new Set(slots).size === slots.length &&
    slots.every((id) => isSlotItem(id) && gear?.[id] === true)
  );
}

function plain(obj, allowed) {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    Object.entries(obj).every(([key, value]) => allowed.includes(key) && (value === true || typeof value === "string"))
  );
}

/**
 * 저장소 값을 안전한 모양으로 다듬는다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns { v, save, best, muted } save는 이어 할 진행(검증은 restore가 한다), best는 엔딩 기록, muted는 소리 끔 설정
 */
export function readData(raw) {
  const valid = raw?.v === 1;
  const best = valid && raw.best && typeof raw.best === "object" ? raw.best : {};
  return {
    v: 1,
    muted: valid && raw.muted === true,
    save: valid && raw.save && typeof raw.save === "object" ? raw.save : null,
    best: {
      endings: int(best.endings, 99999) ? best.endings : 0,
      codex: int(best.codex, ALL_TASK_IDS.length) ? best.codex : 0,
      trust: int(best.trust, 999) ? best.trust : 0,
      disasters: int(best.disasters, 9999) ? best.disasters : null,
    },
  };
}

/**
 * 엔딩 결과를 최고 기록과 합친다. 도감은 많을수록, 사고는 적을수록 좋은 기록이다.
 *
 * @param prev 읽은 저장 데이터
 * @param ending 엔딩 정보 { trust, disasters, codex }
 * @param save 이어 할 진행 스냅샷
 * @returns 저장할 데이터
 */
export function mergeEnding(prev, ending, save) {
  const { best, muted } = readData(prev);
  const disasters = best.disasters === null ? ending.disasters : Math.min(best.disasters, ending.disasters);
  return {
    v: 1,
    muted,
    save,
    best: {
      endings: best.endings + 1,
      codex: Math.max(best.codex, ending.codex),
      trust: Math.max(best.trust, ending.trust),
      disasters,
    },
  };
}

/**
 * 홈 카드에 보여줄 한 줄 요약을 만든다.
 *
 * @param data 저장된 데이터
 * @returns 요약 문구, 기록이 없으면 빈 문자열
 */
export function summarize(data) {
  const { save, best } = readData(data);
  const state = restore(save);
  if (best.endings) return `엔딩 ${best.endings}회 · 도감 ${best.codex}/${ALL_TASK_IDS.length}`;
  if (state) return `진행 중 · 뱃지 ${state.badges.length}/${GYM_IDS.length} · 신뢰 ${state.trust} · 도감 ${Object.keys(state.seen).length}/${ALL_TASK_IDS.length}`;
  return "";
}