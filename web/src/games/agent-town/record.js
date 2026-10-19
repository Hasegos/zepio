import { CONTEXT_CAP, USAGE_CAP } from "./battle.js";
import { ITEMS, MEMBERS } from "./party.js";
import { ALL_TASK_IDS, TRAINER_TASKS, WILD_TASKS } from "./tasks.js";
import { HEIGHT, START, WIDTH, walkable } from "./world.js";

const GEAR_IDS = ITEMS.map((it) => it.id);
const int = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;

/**
 * 진행 중인 게임 상태에서 저장할 부분만 뽑는다. 전투와 대화는 저장하지 않는다.
 *
 * @param state 게임 상태(지도 · 시설 · 엔딩 화면)
 * @returns 저장용 스냅샷
 */
export function snapshot(state) {
  return {
    seed: state.seed,
    player: state.player,
    trust: state.trust,
    coins: state.coins,
    context: state.context,
    usage: state.usage,
    gear: state.gear,
    party: state.party,
    cleared: state.cleared,
    seen: state.seen,
    pool: state.pool,
    cooldown: state.cooldown,
    bossPhase: 0,
    finished: state.finished,
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
  const wildIds = WILD_TASKS.map((t) => t.id);
  const ok =
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
    typeof raw.finished === "boolean" &&
    Array.isArray(raw.pool) &&
    raw.pool.every((id) => wildIds.includes(id)) &&
    new Set(raw.pool).size === raw.pool.length &&
    Array.isArray(raw.party) &&
    raw.party.every((id) => Object.hasOwn(MEMBERS, id)) &&
    new Set(raw.party).size === raw.party.length &&
    plain(raw.gear, GEAR_IDS) &&
    plain(raw.cleared, Object.keys(TRAINER_TASKS)) &&
    plain(raw.seen, ALL_TASK_IDS);
  if (!ok) return null;
  const x = Math.max(0, Math.min(WIDTH - 1, player.x));
  const y = Math.max(0, Math.min(HEIGHT - 1, player.y));
  const spot = walkable(x, y, raw.trust) ? { x, y, dir: player.dir } : { ...START };
  return {
    phase: "map",
    seed: raw.seed,
    player: spot,
    trust: raw.trust,
    coins: raw.coins,
    context: raw.context,
    usage: raw.usage,
    gear: raw.gear,
    party: raw.party,
    cleared: raw.cleared,
    seen: raw.seen,
    pool: raw.pool,
    cooldown: raw.cooldown,
    bossPhase: 0,
    finished: raw.finished,
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
 * @returns { v, save, best } save는 이어 할 진행(검증은 restore가 한다), best는 엔딩 기록
 */
export function readData(raw) {
  const valid = raw?.v === 1;
  const best = valid && raw.best && typeof raw.best === "object" ? raw.best : {};
  return {
    v: 1,
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
  const { best } = readData(prev);
  const disasters = best.disasters === null ? ending.disasters : Math.min(best.disasters, ending.disasters);
  return {
    v: 1,
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
  if (state) return `진행 중 · 신뢰 ${state.trust} · 도감 ${Object.keys(state.seen).length}/${ALL_TASK_IDS.length}`;
  return "";
}