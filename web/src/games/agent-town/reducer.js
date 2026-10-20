import { CONTEXT_CAP, playMove, startBattle, USAGE_CAP } from "./battle.js";
import { currentTitle } from "./codex.js";
import { GYMS } from "./gyms.js";
import { activeGear, buy, isSlotItem, ITEMS, MAX_SLOTS, MEMBERS, slotsOf, toggleSlot } from "./party.js";
import { makeRng, shuffle } from "../_shared/rng.js";
import { clerkLines, dockLines, guardLines, INTRO, keeperLines, SIGN_TIPS, TRAINER_TALK, wardenLines, zepiLines } from "./story.js";
import { REGION_TASKS, TRAINER_TASKS } from "./tasks.js";
import { buildingAtDoor, facing, GATE_TRUST, MAPS, progressOf, START, START_MAP, step, tileAt, walkable, warpAt } from "./world.js";

const ENCOUNTER_RATE = 0.14;
const COOLDOWN = 4;

/**
 * 지역별 의뢰 대기열을 만든다. 지역마다 시드에 1씩 더해 따로 섞는다.
 *
 * @param seed 정수 시드
 * @returns { town: [id], forest: [id], harbor: [id], cave: [id] }
 */
export function newPools(seed) {
  return Object.fromEntries(
    Object.entries(REGION_TASKS).map(([region, tasks], i) => [
      region,
      shuffle(
        tasks.map((t) => t.id),
        makeRng(seed + i),
      ),
    ]),
  );
}

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
function newGame(seed) {
  return {
    phase: "map",
    seed,
    map: START_MAP,
    player: { ...START },
    trust: 0,
    coins: 0,
    context: 0,
    usage: 0,
    gear: {},
    slots: [],
    party: [],
    badges: [],
    cleared: {},
    seen: {},
    pools: newPools(seed),
    cooldown: 2,
    gymPhase: 0,
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

function openBattle(s, task, kind, carry = {}, gymId = null) {
  const b = startBattle(task, { context: carry.context ?? s.context, usage: carry.usage ?? s.usage });
  const intro =
    kind === "wild"
      ? `야생의 「${task.name}」 의뢰가 나타났다!`
      : kind === "trainer"
        ? `${task.client}가 승부를 걸어왔다!`
        : `${GYMS[gymId].leader}의 시험 ${s.gymPhase + 1}단계!`;
  const peak = task.peak ? [s.gear.cache ? "피크 시간대지만 프롬프트 캐시가 추가 요금을 막아 준다." : "피크 시간대! 행동마다 사용량이 1 더 든다."] : [];
  b.lines = [intro, ...peak, ...b.lines];
  return {
    ...s,
    phase: "battle",
    dialog: null,
    facility: null,
    battle: { b, kind, id: task.id, gym: gymId },
    seen: { ...s.seen, [task.id]: true },
  };
}

function startGym(s, gymId) {
  return openBattle({ ...s, gymPhase: 0 }, GYMS[gymId].phases[0], "gym", { context: 2, usage: 0 }, gymId);
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
  if (then.type === "gym") return startGym(clear, then.id);
  return clear;
}

function walk(s, dir, roll) {
  const [nx, ny] = step(s.player.x, s.player.y, dir);
  const turned = { ...s, notice: "", player: { ...s.player, dir } };
  const progress = progressOf(s);
  if (!walkable(s.map, nx, ny, progress)) return turned;
  const moved = { ...turned, player: { x: nx, y: ny, dir }, steps: s.steps + 1 };
  const warp = warpAt(s.map, nx, ny);
  if (warp) {
    return {
      ...moved,
      map: warp.to,
      player: { x: warp.tx, y: warp.ty, dir: warp.dir },
      cooldown: Math.max(moved.cooldown, 2),
      notice: `${MAPS[warp.to].name}에 들어섰다.`,
      saveTick: s.saveTick + 1,
    };
  }
  const place = buildingAtDoor(s.map, nx, ny);
  if (place) {
    if (place.facility !== "gym") return { ...moved, phase: "facility", facility: place.facility };
    const gym = GYMS[s.map];
    if (s.badges.includes(gym.id)) return say(moved, gym.done);
    if (s.trust < gym.trust) return say(moved, gym.locked);
    return say(moved, gym.intro, { type: "gym", id: gym.id });
  }
  if (tileAt(s.map, nx, ny) !== MAPS[s.map].encounter) return moved;
  if (moved.cooldown > 0) return { ...moved, cooldown: moved.cooldown - 1 };
  const list = s.pools[s.map] ?? [];
  if (roll < ENCOUNTER_RATE && list.length) {
    const [id, ...rest] = list;
    const task = REGION_TASKS[s.map].find((t) => t.id === id);
    return openBattle({ ...moved, pools: { ...moved.pools, [s.map]: rest }, cooldown: COOLDOWN }, task, "wild");
  }
  return moved;
}

function interact(s) {
  const front = facing(s.map, s.player.x, s.player.y, s.player.dir, progressOf(s));
  if (!front) return s;
  if (front.type === "sign") {
    const tips = SIGN_TIPS[s.map];
    return say({ ...s, tip: s.tip + 1 }, [{ who: front.target.name, text: tips[s.tip % tips.length] }]);
  }
  const npc = front.target;
  if (npc.id === "zepi") return say(s, zepiLines(s));
  if (npc.id === "guard") return say(s, guardLines(s));
  if (npc.id === "keeper") return say(s, keeperLines(s));
  if (npc.id === "dockhand") return say(s, dockLines(s));
  if (npc.id === "warden") return say(s, wardenLines(s));
  if (npc.id === "clerk") return say(s, clerkLines(s));
  const talk = TRAINER_TALK[npc.id];
  if (s.cleared[npc.id]) return say(s, talk.after);
  const warn =
    TRAINER_TASKS[npc.id].big && !s.gear.plan
      ? [{ who: "제피", text: "이 일은 꽤 커 보여. 도서관에서 계획 모드를 먼저 사 두는 게 좋을 거야." }]
      : [];
  return say(s, [...talk.before, ...warn], { type: "trainer", id: npc.id });
}

function applyPayout(s, battle) {
  const { b, kind, id } = battle;
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
  if (kind === "gym") return afterGymPhase(settled, battle.gym, d);
  let next = settled;
  if (solved) {
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
  if (kind === "wild" && !solved) {
    const region = Object.keys(REGION_TASKS).find((key) => REGION_TASKS[key].some((t) => t.id === id));
    next = { ...next, pools: { ...next.pools, [region]: [...(next.pools[region] ?? []), id] } };
  }
  if (next.usage >= USAGE_CAP) {
    const lines = [...(next.dialog?.lines ?? []), { who: "알림", text: "사용량 한도! 쉼터에서 한도가 풀릴 때까지 푹 쉬었다. (사용량 회복)" }];
    next = say({ ...next, player: { ...MAPS[next.map].rest }, usage: 0 }, lines);
  }
  return next;
}

function afterGymPhase(s, gymId, d) {
  const gym = GYMS[gymId];
  if (d.kind !== "win" && d.kind !== "refuse") {
    const lost = { ...s, gymPhase: 0, player: { ...gym.spot } };
    if (s.usage < USAGE_CAP) return say(lost, gym.fail);
    const tired = { who: "알림", text: "사용량 한도! 쉼터에서 한도가 풀릴 때까지 푹 쉬었다. (사용량 회복)" };
    return say({ ...lost, player: { ...MAPS[s.map].rest }, usage: 0 }, [...gym.fail, tired]);
  }
  const gymPhase = s.gymPhase + 1;
  if (gymPhase < gym.phases.length) {
    const refreshed = { ...s, gymPhase, usage: Math.max(0, s.usage - gym.refresh) };
    return openBattle(refreshed, gym.phases[gymPhase], "gym", {}, gymId);
  }
  const badges = [...s.badges, gymId];
  const tired = s.usage >= USAGE_CAP;
  const won = { ...s, gymPhase: 0, badges, usage: tired ? 0 : s.usage, player: { ...gym.spot } };
  if (!gym.ending) {
    const rested = { who: "알림", text: "사용량 한도에 닿았지만 시험이 끝나 한도가 풀렸다. (사용량 회복)" };
    return say(won, tired ? [...gym.win, rested] : gym.win);
  }
  return {
    ...won,
    phase: "ending",
    dialog: { lines: gym.endingLines, i: 0, then: null },
    ending: {
      trust: s.trust,
      coins: s.coins,
      tasksDone: s.tasksDone,
      disasters: s.disasters,
      steps: s.steps,
      codex: Object.keys(s.seen).length,
      title: currentTitle(won),
      league: gymId === "league",
    },
  };
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
      return applyPayout(state, state.battle);
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