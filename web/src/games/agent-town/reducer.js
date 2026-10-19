import { CONTEXT_CAP, playMove, startBattle, USAGE_CAP } from "./battle.js";
import { currentTitle } from "./codex.js";
import { activeGear, buy, isSlotItem, ITEMS, MEMBERS, slotsOf, toggleSlot, MAX_SLOTS } from "./party.js";
import { makeRng, shuffle } from "./rng.js";
import {
  BOSS_DONE,
  BOSS_FAIL,
  BOSS_INTRO,
  BOSS_LOCKED,
  ENDING,
  guardLines,
  INTRO,
  TIPS,
  TRAINER_TALK,
  zepiLines,
} from "./story.js";
import { BOSS_PHASES, TRAINER_TASKS, WILD_TASKS } from "./tasks.js";
import { BOSS_TRUST, buildingAtDoor, facing, GATE_TRUST, START, step, tileAt, walkable } from "./world.js";

export const ENCOUNTER_RATE = 0.14;
export const COOLDOWN = 4;
const REST_SPOT = { x: 3, y: 14, dir: "up" };
const BOSS_SPOT = { x: 25, y: 5, dir: "down" };
const BOSS_USAGE_REFRESH = 8;

/**
 * 첫 화면 상태를 만든다.
 *
 * @returns 제목 화면 상태
 */
export function initialState() {
  return { phase: "title" };
}

/**
 * 새 게임 상태를 만든다. 풀숲에 나올 의뢰 순서는 시드로 정해진다.
 *
 * @param seed 정수 시드
 * @returns 지도 화면 상태(제피의 소개 대사가 먼저 나온다)
 */
export function newGame(seed) {
  return {
    phase: "map",
    seed,
    player: { ...START },
    trust: 0,
    coins: 0,
    context: 0,
    usage: 0,
    gear: {},
    slots: [],
    party: [],
    cleared: {},
    seen: {},
    pool: shuffle(
      WILD_TASKS.map((t) => t.id),
      makeRng(seed),
    ),
    cooldown: 2,
    bossPhase: 0,
    finished: false,
    tip: 0,
    steps: 0,
    disasters: 0,
    tasksDone: 0,
    dialog: { lines: INTRO, i: 0, then: { type: "join", id: "explorer" } },
    battle: null,
    facility: null,
    notice: "",
    ending: null,
    saveTick: 0,
  };
}

function say(s, lines, then = null) {
  return { ...s, phase: "map", facility: null, dialog: { lines, i: 0, then } };
}

function openBattle(s, task, kind, carry = {}) {
  const b = startBattle(task, { context: carry.context ?? s.context, usage: carry.usage ?? s.usage });
  const intro =
    kind === "wild"
      ? `야생의 「${task.name}」 의뢰가 나타났다!`
      : kind === "trainer"
        ? `${task.client}가 승부를 걸어왔다!`
        : `팀장 박의 시험 ${s.bossPhase + 1}단계!`;
  b.lines = [intro, ...b.lines];
  return {
    ...s,
    phase: "battle",
    dialog: null,
    facility: null,
    battle: { b, kind, id: task.id },
    seen: { ...s.seen, [task.id]: true },
  };
}

function startBoss(s) {
  return openBattle({ ...s, bossPhase: 0 }, BOSS_PHASES[0], "boss", { context: 2, usage: 0 });
}

function gainMember(s, id) {
  if (s.party.includes(id)) return s;
  return { ...s, party: [...s.party, id], saveTick: s.saveTick + 1 };
}

function afterDialog(s, then) {
  if (!then) return { ...s, dialog: null, saveTick: s.saveTick + 1 };
  const clear = { ...s, dialog: null };
  if (then.type === "join") return gainMember({ ...clear, notice: `${MEMBERS[then.id].name}가 동료가 되었다!` }, then.id);
  if (then.type === "trainer") return openBattle(clear, TRAINER_TASKS[then.id], "trainer");
  if (then.type === "boss") return startBoss(clear);
  return clear;
}

function walk(s, dir, roll) {
  const [nx, ny] = step(s.player.x, s.player.y, dir);
  const turned = { ...s, notice: "", player: { ...s.player, dir } };
  if (!walkable(nx, ny, s.trust)) return turned;
  const moved = { ...turned, player: { x: nx, y: ny, dir }, steps: s.steps + 1 };
  const place = buildingAtDoor(nx, ny);
  if (place) {
    if (place.id !== "gym") return { ...moved, phase: "facility", facility: place.id };
    if (s.finished) return say(moved, BOSS_DONE);
    if (s.trust < BOSS_TRUST) return say(moved, BOSS_LOCKED);
    return say(moved, BOSS_INTRO, { type: "boss" });
  }
  if (tileAt(nx, ny) !== ",") return moved;
  if (moved.cooldown > 0) return { ...moved, cooldown: moved.cooldown - 1 };
  if (roll < ENCOUNTER_RATE && moved.pool.length) {
    const [id, ...rest] = moved.pool;
    const task = WILD_TASKS.find((t) => t.id === id);
    return openBattle({ ...moved, pool: rest, cooldown: COOLDOWN }, task, "wild");
  }
  return moved;
}

function interact(s) {
  const front = facing(s.player.x, s.player.y, s.player.dir, s.trust);
  if (!front) return s;
  if (front.type === "sign") return say({ ...s, tip: s.tip + 1 }, [{ who: "게시판", text: TIPS[s.tip % TIPS.length] }]);
  const npc = front.target;
  if (npc.id === "zepi") return say(s, zepiLines(s));
  if (npc.id === "guard") return say(s, guardLines(s));
  const talk = TRAINER_TALK[npc.id];
  if (s.cleared[npc.id]) return say(s, talk.after);
  const warn =
    TRAINER_TASKS[npc.id].big && !s.gear.plan
      ? [{ who: "제피", text: "이 일은 꽤 커 보여. 도서관에서 계획 모드를 먼저 사 두는 게 좋을 거야." }]
      : [];
  return say(s, [...talk.before, ...warn], { type: "trainer", id: npc.id });
}

function applyPayout(s, b, kind, id) {
  const d = b.done;
  const solved = d.kind === "win" || d.kind === "refuse";
  const base = {
    ...s,
    context: Math.min(b.context, CONTEXT_CAP),
    usage: Math.min(b.usage, USAGE_CAP),
    battle: null,
    seen: solved ? { ...s.seen, [id]: "win" } : s.seen,
  };
  const settled = { ...base, phase: "map", saveTick: s.saveTick + 1 };
  if (kind === "boss") return afterBossPhase(settled, d);
  let next = settled;
  if (d.kind === "win" || d.kind === "refuse") {
    next = {
      ...next,
      coins: next.coins + d.coins,
      trust: next.trust + d.trust,
      cleared: kind === "trainer" ? { ...next.cleared, [id]: d.kind } : next.cleared,
      tasksDone: next.tasksDone + 1,
    };
    const reward = kind === "trainer" ? TRAINER_TASKS[id].reward : null;
    if (reward) {
      next = say(gainMember(next, reward), [{ who: "알림", text: `${MEMBERS[reward].name}가 동료가 되었다! 이제 서브에이전트로 부를 수 있다.` }]);
    }
  } else if (d.kind === "disaster") {
    next = {
      ...next,
      coins: Math.max(0, next.coins + d.coins),
      trust: Math.max(Math.min(next.trust, GATE_TRUST), next.trust + d.trust),
      disasters: next.disasters + 1,
    };
  }
  if (kind === "wild" && d.kind !== "win" && d.kind !== "refuse") next = { ...next, pool: [...next.pool, id] };
  if (next.usage >= USAGE_CAP) {
    const lines = [...(next.dialog?.lines ?? []), { who: "알림", text: "사용량 한도! 쉼터에서 한도가 풀릴 때까지 푹 쉬었다. (사용량 회복)" }];
    next = say({ ...next, player: { ...REST_SPOT }, usage: 0 }, lines);
  }
  return next;
}

function afterBossPhase(s, d) {
  if (d.kind !== "win" && d.kind !== "refuse") {
    return say({ ...s, bossPhase: 0, player: { ...BOSS_SPOT }, steps: s.steps }, BOSS_FAIL);
  }
  const bossPhase = s.bossPhase + 1;
  if (bossPhase >= BOSS_PHASES.length) {
    return {
      ...s,
      bossPhase,
      finished: true,
      phase: "ending",
      dialog: { lines: ENDING, i: 0, then: null },
      ending: {
        trust: s.trust,
        coins: s.coins,
        tasksDone: s.tasksDone,
        disasters: s.disasters,
        steps: s.steps,
        codex: Object.keys(s.seen).length,
        title: currentTitle({ ...s, finished: true }),
      },
    };
  }
  const refreshed = { ...s, bossPhase, usage: Math.max(0, s.usage - BOSS_USAGE_REFRESH) };
  return openBattle(refreshed, BOSS_PHASES[bossPhase], "boss");
}

/**
 * 게임 상태를 바꾼다. 난수는 행동에 실어 보낸다(move의 roll).
 *
 * @param state 현재 상태
 * @param action 행동
 * @returns 새 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "new":
      return newGame(action.seed);
    case "load":
      return action.state;
    case "title":
      return initialState();
    case "move":
      return state.phase === "map" && !state.dialog && !state.codex ? walk(state, action.dir, action.roll ?? 1) : state;
    case "interact":
      return state.phase === "map" && !state.dialog && !state.codex ? interact(state) : state;
    case "codex":
      return state.phase === "map" && !state.dialog ? { ...state, codex: !state.codex } : state;
    case "advance": {
      if (!state.dialog) return state;
      const { dialog } = state;
      if (dialog.i < dialog.lines.length - 1) return { ...state, dialog: { ...dialog, i: dialog.i + 1 } };
      if (state.phase === "ending") return { ...state, dialog: null };
      return afterDialog(state, dialog.then);
    }
    case "battleMove": {
      if (state.phase !== "battle") return state;
      const { b } = state.battle;
      const next = playMove(b, activeGear(state.gear, state.slots), action.id, action.arg);
      return next === b ? state : { ...state, battle: { ...state.battle, b: next } };
    }
    case "battleClose": {
      if (state.phase !== "battle" || !state.battle.b.done) return state;
      return applyPayout(state, state.battle.b, state.battle.kind, state.battle.id);
    }
    case "buy": {
      if (state.phase !== "facility") return state;
      const item = ITEMS.find((it) => it.id === action.id);
      if (item?.place !== state.facility) return { ...state, notice: "여기서는 살 수 없어요" };
      const r = buy(state.gear, state.coins, action.id);
      if (!r.ok) return { ...state, notice: r.reason };
      const now = slotsOf(state.gear, state.slots);
      const slots = isSlotItem(item.id) && now.length < MAX_SLOTS ? [...now, item.id] : now;
      const fitted = slots.includes(item.id) ? " 슬롯에 끼웠다." : isSlotItem(item.id) ? " 슬롯이 가득 차서 보관해 둔다." : "";
      return { ...state, gear: r.gear, slots, coins: r.coins, notice: `${item.name}을(를) 갖췄다!${fitted}`, saveTick: state.saveTick + 1 };
    }
    case "equip": {
      if (state.phase !== "facility") return state;
      const r = toggleSlot(state.gear, state.slots, action.id);
      if (!r.ok) return { ...state, notice: r.reason };
      const name = ITEMS.find((it) => it.id === action.id).name;
      return { ...state, slots: r.slots, notice: r.equipped ? `${name}을(를) 슬롯에 끼웠다.` : `${name}을(를) 슬롯에서 뺐다.`, saveTick: state.saveTick + 1 };
    }
    case "compact":
      return state.phase === "facility" && state.facility === "compact"
        ? { ...state, context: 2, notice: "컨텍스트를 요약해 비웠다.", saveTick: state.saveTick + 1 }
        : state;
    case "rest":
      return state.phase === "facility" && state.facility === "rest"
        ? { ...state, usage: 0, notice: "한도가 풀렸다. 사용량이 가득 찼다!", saveTick: state.saveTick + 1 }
        : state;
    case "leave":
      return state.phase === "facility" ? { ...state, phase: "map", facility: null, notice: "" } : state;
    case "resume":
      return state.phase === "ending" && !state.dialog ? { ...state, phase: "map", ending: null } : state;
    default:
      return state;
  }
}