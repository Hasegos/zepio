import { describe, expect, it } from "vitest";
import { USAGE_CAP } from "./battle.js";
import { adaptive } from "./bots.js";
import { ITEMS } from "./party.js";
import { mergeEnding, readData, restore, snapshot, summarize } from "./record.js";
import { COOLDOWN, initialState, newGame, reducer } from "./reducer.js";
import { ALL_TASK_IDS, BOSS_PHASES, FOREST_TASKS, TRAINER_TASKS, WILD_TASKS } from "./tasks.js";
import { BOSS_TRUST, FOREST_GYM_TRUST, GATE_TRUST } from "./world.js";

const run = (state, ...actions) => actions.reduce(reducer, state);
const talkThrough = (state) => {
  let s = state;
  for (let i = 0; i < 40 && s.dialog; i += 1) s = reducer(s, { type: "advance" });
  return s;
};
const started = (seed = 1) => talkThrough(newGame(seed));
const at = (state, x, y, dir) => ({ ...state, player: { x, y, dir } });
const FULL = { plan: true, grep: true, readRule: true, askRule: true, guard: true, secret: true, autotest: true };
const pool = (...ids) => ({ pools: { town: ids, forest: [] } });

/** 전투를 전략대로 끝내고 닫는다(보스 전투는 이어지는 단계까지 모두 진행한다). */
function fight(state, strategy = adaptive) {
  let s = state;
  for (let i = 0; i < 200 && s.phase === "battle"; i += 1) {
    const { b } = s.battle;
    if (b.done) {
      s = reducer(s, { type: "battleClose" });
      continue;
    }
    const pick = strategy(b, s.gear, s.party);
    const next = reducer(s, { type: "battleMove", id: pick.id, arg: pick.arg });
    s = next === s ? reducer(s, { type: "battleMove", id: "refuse" }) : next;
  }
  return s;
}

describe("시작", () => {
  it("제목 화면에서 새 게임을 시작하면 제피가 소개하고 동료가 된다", () => {
    expect(initialState().phase).toBe("title");
    const game = newGame(1);
    expect(game.dialog.lines.length).toBeGreaterThan(1);
    const after = talkThrough(game);
    expect(after.party).toEqual(["explorer"]);
    expect(after.dialog).toBeNull();
    expect(after.pools.town).toHaveLength(WILD_TASKS.length);
    expect(after.map).toBe("town");
    expect(after.badges).toEqual([]);
  });

  it("대화 중에는 움직일 수 없다", () => {
    const game = newGame(1);
    expect(run(game, { type: "move", dir: "right", roll: 1 })).toBe(game);
  });
});

describe("걷기와 풀숲", () => {
  it("길을 걷고, 막힌 곳은 방향만 바꾼다", () => {
    const s = started();
    const moved = run(s, { type: "move", dir: "left", roll: 1 });
    expect(moved.player).toMatchObject({ x: 6, y: 9, dir: "left" });
    const blocked = run(s, { type: "move", dir: "up", roll: 1 });
    expect(blocked.player).toMatchObject({ x: 7, y: 9, dir: "up" });
    expect(blocked.steps).toBe(s.steps);
  });

  it("풀숲에서는 쿨다운이 지난 뒤 확률로 야생 의뢰가 나타난다", () => {
    const grass = { ...at(started(), 17, 8, "up"), trust: GATE_TRUST, cooldown: 0 };
    const quiet = run(grass, { type: "move", dir: "up", roll: 0.99 });
    expect(quiet.phase).toBe("map");
    const hit = run(grass, { type: "move", dir: "up", roll: 0 });
    expect(hit.phase).toBe("battle");
    expect(hit.battle.kind).toBe("wild");
    expect(hit.cooldown).toBe(COOLDOWN);
    expect(hit.pools.town).toHaveLength(WILD_TASKS.length - 1);
    expect(hit.seen[hit.battle.id]).toBe(true);
    const cooled = run({ ...grass, cooldown: 2 }, { type: "move", dir: "up", roll: 0 });
    expect(cooled.phase).toBe("map");
    expect(cooled.cooldown).toBe(1);
  });

  it("길과 땅에서는 의뢰가 나타나지 않는다", () => {
    const s = { ...started(), cooldown: 0 };
    expect(run(s, { type: "move", dir: "right", roll: 0 }).phase).toBe("map");
  });
});

describe("말 걸기", () => {
  it("표지판은 CLAUDE.md 팁을 차례로 보여 준다", () => {
    const s = at(started(), 7, 9, "up");
    const a = run(s, { type: "interact" });
    expect(a.dialog.lines[0].text).toContain("CLAUDE.md");
    const b = run(talkThrough(a), { type: "interact" });
    expect(b.dialog.lines[0].text).not.toBe(a.dialog.lines[0].text);
  });

  it("경비 로봇은 신뢰가 쌓이기 전에는 막고 있다", () => {
    const s = at(started(), 14, 9, "right");
    expect(run(s, { type: "move", dir: "right", roll: 1 }).player.x).toBe(14);
    expect(run(s, { type: "interact" }).dialog.lines[0].who).toBe("경비 로봇");
  });

  it("트레이너는 대화 뒤 전투가 되고, 이기면 사라지고 동료가 된다", () => {
    const s = at(started(), 12, 9, "up");
    const talk = run(s, { type: "interact" });
    expect(talk.dialog.then).toEqual({ type: "trainer", id: "minsu" });
    const battle = talkThrough(talk);
    expect(battle.phase).toBe("battle");
    const won = fight(battle);
    expect(won.cleared.minsu).toBeTruthy();
    expect(won.party).toContain("runner");
    expect(won.trust).toBeGreaterThanOrEqual(TRAINER_TASKS.minsu.trust);
    const again = run(talkThrough(won), { type: "interact" });
    expect(again.dialog.lines[0].who).toBe("민수");
    expect(again.dialog.then).toBeNull();
  });
});

describe("준비 안 된 도전 경고", () => {
  it("큰 일을 맡기는 트레이너는 계획 모드가 없으면 제피가 미리 알려 준다", () => {
    const s = at(started(), 6, 9, "down");
    const warned = run(s, { type: "interact" });
    expect(warned.dialog.lines.at(-1)).toMatchObject({ who: "제피" });
    expect(warned.dialog.lines.at(-1).text).toContain("계획 모드");
    const ready = run({ ...s, gear: { plan: true } }, { type: "interact" });
    expect(ready.dialog.lines.at(-1).who).toBe("이 대리");
  });

  it("제피는 코인이 모이면 계획 모드를 권한다", () => {
    const s = { ...at(started(), 8, 9, "up"), coins: 12 };
    expect(run(s, { type: "interact" }).dialog.lines.at(-1).text).toContain("계획 모드");
    expect(run({ ...s, gear: { plan: true } }, { type: "interact" }).dialog.lines.at(-1).text).not.toContain("계획 모드");
  });
});

describe("전투 결과", () => {
  it("의뢰를 끝내면 코인과 신뢰를 받고 컨텍스트와 사용량이 이어진다", () => {
    const grass = { ...at(started(), 17, 8, "up"), trust: 1, cooldown: 0, gear: FULL };
    const battle = run(grass, { type: "move", dir: "up", roll: 0 });
    const won = fight(battle);
    expect(won.phase).toBe("map");
    expect(won.coins).toBeGreaterThan(0);
    expect(won.trust).toBeGreaterThan(1);
    expect(won.usage).toBeGreaterThan(0);
    expect(won.context).toBeGreaterThan(0);
  });

  it("사고가 나면 코인과 신뢰를 잃는다", () => {
    const grass = { ...at(started(), 17, 8, "up"), trust: 6, coins: 30, cooldown: 0, ...pool("tmp", "button") };
    const battle = run(grass, { type: "move", dir: "up", roll: 0 });
    const lost = fight(battle, () => ({ id: "edit" }));
    expect(lost.coins).toBe(20);
    expect(lost.trust).toBe(5);
    expect(lost.disasters).toBe(1);
  });

  it("한 번 경비를 지나갈 신뢰를 얻으면 사고가 나도 그 아래로 떨어지지 않는다", () => {
    const grass = { ...at(started(), 17, 8, "up"), trust: GATE_TRUST, coins: 0, cooldown: 0, ...pool("tmp") };
    const lost = fight(run(grass, { type: "move", dir: "up", roll: 0 }), () => ({ id: "edit" }));
    expect(lost.disasters).toBe(1);
    expect(lost.trust).toBe(GATE_TRUST);
  });

  it("의뢰인이 떠나거나 사고가 난 야생 의뢰는 풀 뒤로 돌아와 다시 만날 수 있다", () => {
    const grass = { ...at(started(), 17, 8, "up"), trust: 6, cooldown: 0, ...pool("tmp", "button") };
    const lost = fight(run(grass, { type: "move", dir: "up", roll: 0 }), () => ({ id: "edit" }));
    expect(lost.pools.town).toEqual(["button", "tmp"]);
    const legit = { ...grass, ...pool("button", "tmp") };
    const left = fight(run(legit, { type: "move", dir: "up", roll: 0 }), () => ({ id: "refuse" }));
    expect(left.pools.town).toEqual(["tmp", "button"]);
  });

  it("한도에서 이겨도 쉼터에서 쉬고 사용량이 돌아온다", () => {
    const grass = { ...at(started(), 17, 8, "up"), usage: USAGE_CAP - 2, cooldown: 0, ...pool("button") };
    const won = fight(run(grass, { type: "move", dir: "up", roll: 0 }), () => ({ id: "edit" }));
    expect(won.coins).toBeGreaterThan(0);
    expect(won.usage).toBe(0);
    expect(won.player).toMatchObject({ x: 3, y: 14 });
  });

  it("사용량 한도에 닿으면 쉼터에서 쉬고 사용량이 돌아온다", () => {
    const grass = { ...at(started(), 17, 8, "up"), usage: USAGE_CAP - 1, cooldown: 0, ...pool("login") };
    const battle = run(grass, { type: "move", dir: "up", roll: 0 });
    const s = reducer(battle, { type: "battleMove", id: "read" });
    expect(s.battle.b.done.kind).toBe("limit");
    const rested = reducer(s, { type: "battleClose" });
    expect(rested.usage).toBe(0);
    expect(rested.player).toMatchObject({ x: 3, y: 14 });
    expect(rested.dialog.lines[0].text).toContain("사용량");
  });

  it("전투 중에는 걷지 못하고 끝나기 전에는 닫을 수 없다", () => {
    const grass = { ...at(started(), 17, 8, "up"), cooldown: 0 };
    const battle = run(grass, { type: "move", dir: "up", roll: 0 });
    expect(run(battle, { type: "move", dir: "up", roll: 0 })).toBe(battle);
    expect(run(battle, { type: "battleClose" })).toBe(battle);
  });
});

describe("시설", () => {
  it("건물 입구에 들어가면 시설 화면이 되고 나올 수 있다", () => {
    const s = at(started(), 4, 5, "up");
    const inLibrary = run(s, { type: "move", dir: "up", roll: 1 });
    expect(inLibrary).toMatchObject({ phase: "facility", facility: "library" });
    expect(run(inLibrary, { type: "leave" }).phase).toBe("map");
  });

  it("도서관과 훅 대장간에서 코인으로 장비를 산다", () => {
    const lib = { ...at(started(), 4, 4, "up"), phase: "facility", facility: "library", coins: 12 };
    const bought = run(lib, { type: "buy", id: "plan" });
    expect(bought.gear.plan).toBe(true);
    expect(bought.coins).toBe(2);
    expect(run(bought, { type: "buy", id: "grep" }).notice).toContain("코인");
    expect(run(lib, { type: "buy", id: "guard" }).notice).toContain("여기서는");
    expect(run(bought, { type: "buy", id: "plan" }).notice).toContain("이미");
  });

  it("정리소는 컨텍스트를, 쉼터는 사용량을 비워 준다", () => {
    const compact = { ...started(), phase: "facility", facility: "compact", context: 9 };
    expect(run(compact, { type: "compact" }).context).toBe(2);
    const rest = { ...started(), phase: "facility", facility: "rest", usage: 15 };
    expect(run(rest, { type: "rest" }).usage).toBe(0);
    expect(run(rest, { type: "compact" })).toBe(rest);
  });
});

describe("마을 체육관(팀장 박)", () => {
  const door = (trust, extra = {}) => run({ ...at(started(), 25, 5, "up"), trust, gear: FULL, slots: ["readRule", "guard", "secret"], ...extra }, { type: "move", dir: "up", roll: 1 });

  it("신뢰가 모자라면 들어갈 수 없다", () => {
    const s = door(BOSS_TRUST - 1);
    expect(s.dialog.lines[0].who).toBe("비서");
  });

  it("신뢰가 충분하면 세 단계를 거쳐 합격 뱃지를 받고 엔딩에 닿는다", () => {
    let s = talkThrough(door(BOSS_TRUST));
    expect(s.phase).toBe("battle");
    expect(s.battle.kind).toBe("gym");
    expect(s.battle.gym).toBe("town");
    expect(s.battle.b.usage).toBe(0);
    s = fight(s);
    expect(s.phase).toBe("ending");
    expect(s.badges).toEqual(["town"]);
    expect(s.ending.trust).toBeGreaterThanOrEqual(BOSS_TRUST);
    s = talkThrough(s);
    expect(run(s, { type: "resume" }).phase).toBe("map");
  });

  it("장비가 없으면 지고 문 앞으로 돌아오며 뱃지는 없다", () => {
    let s = talkThrough(door(BOSS_TRUST, { gear: {} }));
    s = fight(s, () => ({ id: "edit" }));
    expect(s.phase).toBe("map");
    expect(s.badges).toEqual([]);
    expect(s.gymPhase).toBe(0);
    expect(s.player).toMatchObject({ x: 25, y: 5 });
    expect(s.dialog.lines[0].who).toBe("팀장 박");
  });

  it("뱃지를 받은 뒤 다시 들어가면 전투 없이 인사만 한다", () => {
    const s = door(BOSS_TRUST, { badges: ["town"] });
    expect(s.phase).toBe("map");
    expect(s.dialog.lines[0].who).toBe("팀장 박");
    expect(talkThrough(s).phase).toBe("map");
  });
});

describe("저장", () => {
  it("스냅샷으로 저장하고 복원하면 같은 진행이다", () => {
    const s = { ...started(7), trust: 5, coins: 33, gear: { plan: true }, cleared: { minsu: "win" }, party: ["explorer", "runner"] };
    const back = restore(JSON.parse(JSON.stringify(snapshot(s))));
    expect(back).toMatchObject({ trust: 5, coins: 33, gear: { plan: true }, party: ["explorer", "runner"], phase: "map", dialog: null });
    expect(back.pools).toEqual(s.pools);
    expect(back).toMatchObject({ map: "town", badges: [] });
  });

  it("깨진 저장은 버린다", () => {
    const good = snapshot(started());
    expect(restore(null)).toBeNull();
    expect(restore({ ...good, trust: -1 })).toBeNull();
    expect(restore({ ...good, ...pool("nope") })).toBeNull();
    expect(restore({ ...good, ...pool("button", "button") })).toBeNull();
    expect(restore({ ...good, pools: { ...good.pools, forest: ["button"] } })).toBeNull();
    expect(restore({ ...good, pools: { ...good.pools, mars: [] } })).toBeNull();
    expect(restore({ ...good, badges: ["mars"] })).toBeNull();
    expect(restore({ ...good, badges: ["town", "town"] })).toBeNull();
    expect(restore({ ...good, map: "mars" })).toBeNull();
    expect(restore({ ...good, party: ["ghost"] })).toBeNull();
    expect(restore({ ...good, gear: { hack: true } })).toBeNull();
    expect(restore({ ...good, cleared: { minsu: 5 } })).toBeNull();
    expect(restore({ ...good, player: { x: 1.5, y: 2, dir: "up" } })).toBeNull();
  });

  it("막힌 칸에 서 있는 저장은 시작 위치로 옮긴다", () => {
    const back = restore({ ...snapshot(started()), player: { x: 0, y: 0, dir: "up" } });
    expect(back.player).toMatchObject({ x: 7, y: 9 });
  });

  it("엔딩 기록은 도감 최대, 사고 최소로 합친다", () => {
    const first = mergeEnding(null, { trust: 20, disasters: 3, codex: 18 }, null);
    const second = mergeEnding(first, { trust: 16, disasters: 1, codex: 21 }, null);
    expect(second.best).toEqual({ endings: 2, codex: 21, trust: 20, disasters: 1 });
    expect(readData(null).best.disasters).toBeNull();
    expect(readData({ v: 1, best: { endings: -5 } }).best.endings).toBe(0);
  });

  it("홈 카드 요약은 엔딩 > 진행 중 > 없음 순으로 보여 준다", () => {
    expect(summarize(null)).toBe("");
    const play = { v: 1, save: snapshot({ ...started(), trust: 4 }), best: {} };
    expect(summarize(play)).toContain("진행 중");
    expect(summarize(mergeEnding(play, { trust: 15, disasters: 0, codex: 20 }, null))).toBe(`엔딩 1회 · 도감 20/${ALL_TASK_IDS.length}`);
  });
});

describe("경제", () => {
  it("의뢰 보상 총합이 장비 값과 보스 신뢰 조건을 넉넉히 넘는다", () => {
    const tasks = [...WILD_TASKS, ...Object.values(TRAINER_TASKS)];
    const coins = tasks.reduce((sum, t) => sum + t.coins, 0);
    const trust = tasks.reduce((sum, t) => sum + (t.trust ?? 1), 0);
    expect(coins).toBeGreaterThan(ITEMS.reduce((sum, it) => sum + it.cost, 0) * 2);
    expect(trust).toBeGreaterThan(BOSS_TRUST);
    expect(BOSS_PHASES).toHaveLength(3);
  });
});

describe("장비 슬롯과 도감", () => {
  const shop = (extra = {}) => ({ ...at(started(), 4, 4, "up"), phase: "facility", facility: "forge", coins: 100, ...extra });

  it("산 규칙과 훅은 슬롯이 비어 있으면 자동으로 끼우고, 가득 차면 보관만 한다", () => {
    let s = shop();
    for (const id of ["guard", "secret", "autotest"]) s = run(s, { type: "buy", id });
    expect(s.slots).toEqual(["guard", "secret", "autotest"]);
    const full = run({ ...s, facility: "library", coins: 100 }, { type: "buy", id: "readRule" });
    expect(full.gear.readRule).toBe(true);
    expect(full.slots).toEqual(["guard", "secret", "autotest"]);
    expect(full.notice).toContain("가득");
  });

  it("끼우고 빼는 행동은 시설에서만 되고 저장 신호를 올린다", () => {
    const s = shop({ gear: { guard: true, secret: true }, slots: ["guard"] });
    const out = run(s, { type: "equip", id: "secret" });
    expect(out.slots).toEqual(["guard", "secret"]);
    expect(out.saveTick).toBe(s.saveTick + 1);
    expect(run(out, { type: "equip", id: "guard" }).slots).toEqual(["secret"]);
    expect(run({ ...s, phase: "map" }, { type: "equip", id: "secret" }).slots).toEqual(["guard"]);
    expect(run(s, { type: "equip", id: "plan" }).notice).toContain("끼울 수 없는");
  });

  it("의뢰를 해결하면 도감에 해결로 남는다", () => {
    let s = { ...started(), ...pool("button"), cooldown: 0, trust: 3, player: { x: 16, y: 11, dir: "right" } };
    s = run(s, { type: "move", dir: "right", roll: 0 });
    expect(s.seen.button).toBe(true);
    s = fight(s);
    expect(s.seen.button).toBe("win");
  });

  it("도감 화면을 열면 걷지도 말을 걸지도 못하고, 닫으면 다시 걷는다", () => {
    const s = started();
    const open = run(s, { type: "codex" });
    expect(open.codex).toBe(true);
    expect(run(open, { type: "move", dir: "left", roll: 1 })).toBe(open);
    expect(run(open, { type: "interact" })).toBe(open);
    expect(run(open, { type: "codex" }).codex).toBe(false);
    expect(run({ phase: "title" }, { type: "codex" }).codex).toBeUndefined();
  });

  it("엔딩 정보에 대표 칭호가 담긴다", () => {
    const door = { ...at(started(), 25, 5, "up"), trust: BOSS_TRUST, gear: FULL, slots: ["readRule", "guard", "secret"] };
    const end = fight(talkThrough(run(door, { type: "move", dir: "up", roll: 1 })));
    expect(end.ending.title).toBe("신뢰받는 에이전트");
  });

  it("슬롯은 저장하고 복원하며, 없는 저장은 예전 방식으로, 어긋난 저장은 버린다", () => {
    const s = { ...started(7), gear: { guard: true, secret: true, plan: true }, slots: ["secret"] };
    const raw = JSON.parse(JSON.stringify(snapshot(s)));
    expect(restore(raw).slots).toEqual(["secret"]);
    const { slots, ...old } = raw;
    expect(slots).toEqual(["secret"]);
    expect(restore(old).slots).toEqual(["guard", "secret"]);
    expect(restore({ ...raw, slots: ["autotest"] })).toBeNull();
    expect(restore({ ...raw, slots: ["plan"] })).toBeNull();
    expect(restore({ ...raw, slots: ["guard", "guard"] })).toBeNull();
    expect(restore({ ...raw, slots: "x" })).toBeNull();
  });
});

describe("지역 이동", () => {
  const pass = { trust: 16, badges: ["town"] };

  it("마을 동쪽 입구로 나가면 레거시 숲 입구에 서고, 돌아오면 마을 동쪽 길이다", () => {
    const s = { ...at(started(), 28, 9, "right"), ...pass };
    const in1 = run(s, { type: "move", dir: "right", roll: 1 });
    expect(in1).toMatchObject({ map: "forest", phase: "map", player: { x: 1, y: 9, dir: "right" }, saveTick: s.saveTick + 1 });
    expect(in1.notice).toContain("레거시 숲");
    expect(in1.cooldown).toBeGreaterThanOrEqual(2);
    const out = run({ ...in1, player: { x: 1, y: 9, dir: "left" } }, { type: "move", dir: "left", roll: 1 });
    expect(out).toMatchObject({ map: "town", player: { x: 28, y: 9, dir: "left" } });
  });

  it("합격 뱃지가 없으면 숲지기가 길을 막는다", () => {
    const s = { ...at(started(), 27, 9, "right"), trust: 16 };
    expect(run(s, { type: "move", dir: "right", roll: 1 }).player.x).toBe(27);
    const line = (badges) => run({ ...at(started(), 28, badges.length ? 8 : 9, "right"), ...pass, badges, player: { x: 27, y: badges.length ? 8 : 9, dir: "right" } }, { type: "interact" }).dialog.lines.map((l) => l.text).join(" ");
    expect(line([])).toContain("뱃지");
    expect(line(["town"])).toContain(String(FOREST_GYM_TRUST));
  });
});

describe("레거시 숲", () => {
  const forest = (extra = {}) => ({
    ...at(started(), 4, 6, "down"),
    map: "forest",
    trust: 16,
    badges: ["town"],
    cooldown: 0,
    ...extra,
  });
  const gearUp = { gear: { ...FULL, mcpDocs: true, mcpTicket: true }, slots: ["readRule", "guard", "mcpDocs"] };

  it("새 게임은 지역별 의뢰 대기열을 따로 섞어 두고 서로 겹치지 않는다", () => {
    const g = started(3);
    expect(g.pools.forest).toHaveLength(FOREST_TASKS.length);
    expect(new Set(g.pools.forest).size).toBe(FOREST_TASKS.length);
    expect(g.pools.town.some((id) => g.pools.forest.includes(id))).toBe(false);
  });

  it("짙은 풀숲을 걸으면 숲 의뢰가, 마을 풀숲에서는 야생 의뢰가 나온다", () => {
    const s = forest({ pools: { town: ["button"], forest: ["monolith", "cron"] } });
    const hit = run(s, { type: "move", dir: "down", roll: 0 });
    expect(hit.phase).toBe("battle");
    expect(hit.battle.id).toBe("monolith");
    expect(hit.pools).toEqual({ town: ["button"], forest: ["cron"] });
    const town = run({ ...at(started(), 17, 8, "up"), trust: 3, cooldown: 0, ...pool("button") }, { type: "move", dir: "up", roll: 0 });
    expect(town.battle.id).toBe("button");
  });

  it("실패한 숲 의뢰는 숲 대기열 뒤로 돌아가고, 해결하면 돌아가지 않는다", () => {
    const s = forest({ pools: { town: [], forest: ["cron"] }, ...gearUp });
    const lost = fight(run(s, { type: "move", dir: "down", roll: 0 }), () => ({ id: "test" }));
    expect(lost.pools.forest).toContain("cron");
    expect(lost.pools.town).toEqual([]);
    const won = fight(run(s, { type: "move", dir: "down", roll: 0 }));
    expect(won.pools.forest).not.toContain("cron");
    expect(won.seen.cron).toBe("win");
  });

  it("사용량 한도에 닿으면 마을이 아니라 숲의 야영지에서 쉰다", () => {
    const s = forest({ pools: { town: [], forest: ["cron"] }, usage: USAGE_CAP - 1 });
    const battle = run(s, { type: "move", dir: "down", roll: 0 });
    const end = fight(battle, () => ({ id: "read" }));
    expect(end.map).toBe("forest");
    expect(end.usage).toBe(0);
    expect(end.player).toMatchObject({ x: 5, y: 5 });
  });

  it("체육관 시험 중 사용량 한도로 지면 그 지역 쉼터에서 쉬고 사용량이 돌아온다", () => {
    const s = { ...forest({ trust: FOREST_GYM_TRUST, ...gearUp }), player: { x: 24, y: 4, dir: "up" } };
    const battle = talkThrough(run(s, { type: "move", dir: "up", roll: 1 }));
    const limit = { ...battle, battle: { ...battle.battle, b: { ...battle.battle.b, usage: USAGE_CAP, done: { kind: "limit" } } } };
    const end = run(limit, { type: "battleClose" });
    expect(end).toMatchObject({ map: "forest", usage: 0, gymPhase: 0, player: { x: 5, y: 5 } });
    expect(end.dialog.lines.at(-1).text).toContain("사용량");
  });

  it("사고가 나도 신뢰는 경비 신뢰 밑으로만 보호하고 그 위는 그대로 깎인다", () => {
    const b = { ...started(), trust: 25, battle: { kind: "wild", id: "tmp", b: { done: { kind: "disaster", coins: -10, trust: -10 }, context: 0, usage: 0 } }, phase: "battle" };
    expect(run(b, { type: "battleClose" }).trust).toBe(15);
  });

  it("숲의 오두막은 신뢰가 모자라면 들어갈 수 없고, 충분하면 숲의 주인과 시험을 본다", () => {
    const door = (trust, extra = {}) => run({ ...forest({ trust, ...gearUp, ...extra }), player: { x: 24, y: 4, dir: "up" } }, { type: "move", dir: "up", roll: 1 });
    expect(door(FOREST_GYM_TRUST - 1).dialog.lines[0].who).toBe("숲의 주인");
    expect(door(FOREST_GYM_TRUST - 1).phase).toBe("map");
    const start = talkThrough(door(FOREST_GYM_TRUST));
    expect(start.phase).toBe("battle");
    expect(start.battle).toMatchObject({ kind: "gym", gym: "forest", id: "fg1" });
    expect(start.battle.b.usage).toBe(0);
    expect(door(FOREST_GYM_TRUST, { badges: ["town", "forest"] }).phase).toBe("map");
  });

  it("시험에 지면 문 앞으로 돌아오고, 이기면 근거 뱃지만 받을 뿐 엔딩은 없다", () => {
    const door = (extra = {}) => talkThrough(run({ ...forest({ trust: FOREST_GYM_TRUST, ...extra }), player: { x: 24, y: 4, dir: "up" } }, { type: "move", dir: "up", roll: 1 }));
    const lost = fight(door({ gear: {} }), () => ({ id: "edit" }));
    expect(lost.badges).toEqual(["town"]);
    expect(lost.gymPhase).toBe(0);
    expect(lost.player).toMatchObject({ x: 24, y: 4 });
    expect(lost.map).toBe("forest");
    const won = fight(door(gearUp));
    expect(won.phase).toBe("map");
    expect(won.badges).toEqual(["town", "forest"]);
    expect(won.dialog.lines[0].who).toBe("숲의 주인");
    expect(won.ending).toBeNull();
  });
});

describe("지역 저장", () => {
  const snap = (extra = {}) => JSON.parse(JSON.stringify(snapshot({ ...started(7), map: "forest", player: { x: 4, y: 6, dir: "down" }, badges: ["town"], ...extra })));

  it("지도와 뱃지와 지역별 대기열을 저장하고 복원한다", () => {
    const raw = snap({ pools: { town: ["button"], forest: ["cron", "deps"] } });
    expect(restore(raw)).toMatchObject({ map: "forest", badges: ["town"], player: { x: 4, y: 6 }, pools: { town: ["button"], forest: ["cron", "deps"] } });
  });

  it("예전 저장(pool, forestPool, finished)은 마을 뱃지와 지역 대기열로 옮긴다", () => {
    const raw = snap();
    const rest = Object.fromEntries(Object.entries(raw).filter(([key]) => !["pools", "badges", "map"].includes(key)));
    const old = { ...rest, pool: ["button"], forestPool: ["cron"], finished: true };
    expect(restore(old)).toMatchObject({ map: "town", badges: ["town"], pools: { town: ["button"], forest: ["cron"] } });
    expect(restore({ ...old, finished: false }).badges).toEqual([]);
  });

  it("예전 저장에 숲 대기열이 없으면 안 푼 숲 의뢰로 채운다", () => {
    const raw = snap();
    const rest = Object.fromEntries(Object.entries(raw).filter(([key]) => !["pools", "badges", "map"].includes(key)));
    const back = restore({ ...rest, pool: ["button"], finished: false, seen: { cron: "win" } });
    expect(back.pools.forest).not.toContain("cron");
    expect(back.pools.forest).toHaveLength(FOREST_TASKS.length - 1);
  });

  it("막힌 칸에 서 있는 숲 저장은 그 지역 쉼터로 옮긴다", () => {
    const back = restore({ ...snap(), player: { x: 0, y: 0, dir: "up" } });
    expect(back).toMatchObject({ map: "forest", player: { x: 5, y: 5 } });
  });

  it("홈 카드 요약에 뱃지 수가 나온다", () => {
    const play = { v: 1, save: snapshot({ ...started(), badges: ["town"] }), best: {} };
    expect(summarize(play)).toContain("뱃지 1/4");
  });
});

describe("토큰 항구와 서버 동굴", () => {
  const pass = { trust: 40, badges: ["town", "forest"] };
  const geared = { gear: { ...FULL, cache: true, lantern: true, mcpDocs: true, mcpTicket: true }, slots: ["readRule", "guard", "secret"] };
  const walk = (state, dir, roll = 1) => run(state, { type: "move", dir, roll });

  it("새 게임은 네 지역의 대기열을 모두 따로 섞는다", () => {
    const g = started(3);
    expect(Object.keys(g.pools).sort()).toEqual(["cave", "forest", "harbor", "town"]);
    expect(g.pools.harbor).toHaveLength(6);
    expect(g.pools.cave).toHaveLength(6);
    const all = Object.values(g.pools).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it("마을 남쪽 입구는 항구로, 항구 북쪽 입구는 마을로 이어진다", () => {
    const s = { ...at(started(), 7, 18, "down"), ...pass };
    const harbor = walk(s, "down");
    expect(harbor).toMatchObject({ map: "harbor", player: { x: 7, y: 1, dir: "down" } });
    expect(harbor.notice).toContain("토큰 항구");
    const back = walk({ ...harbor, player: { x: 7, y: 1, dir: "up" } }, "up");
    expect(back).toMatchObject({ map: "town", player: { x: 7, y: 18, dir: "up" } });
  });

  it("합격 뱃지가 없으면 항구 문지기가 길을 막고 말해 준다", () => {
    const s = { ...at(started(), 7, 17, "down"), trust: 40 };
    expect(walk(s, "down").player.y).toBe(17);
    const lines = (badges) => run({ ...started(), map: "town", trust: 40, badges, player: { x: 7, y: 17, dir: "down" } }, { type: "interact" }).dialog.lines.map((l) => l.text).join(" ");
    expect(lines([])).toContain("합격 뱃지");
    const open = run({ ...started(), map: "town", trust: 40, badges: ["town"], player: { x: 8, y: 17, dir: "down" } }, { type: "interact" });
    expect(open.dialog.lines.map((l) => l.text).join(" ")).toContain("캐시");
  });

  it("숲 북쪽 입구는 근거 뱃지가 있어야 서버 동굴로 이어지고, 돌아올 수 있다", () => {
    const s = { ...at(started(), 27, 1, "up"), map: "forest", ...pass };
    const cave = walk(s, "up");
    expect(cave).toMatchObject({ map: "cave", player: { x: 14, y: 18, dir: "up" } });
    const back = walk({ ...cave, player: { x: 14, y: 18, dir: "down" } }, "down");
    expect(back).toMatchObject({ map: "forest", player: { x: 27, y: 1, dir: "down" } });
    const blocked = walk({ ...at(started(), 27, 3, "up"), map: "forest", trust: 40, badges: ["town"] }, "up");
    expect(blocked.player).toMatchObject({ x: 27, y: 3 });
    const talk = run({ ...blocked, player: { x: 27, y: 3, dir: "up" } }, { type: "interact" });
    expect(talk.dialog.lines.map((l) => l.text).join(" ")).toContain("근거 뱃지");
  });

  it("항구 상자 칸에서는 피크 요금 의뢰가 나오고 전투 로그에 알린다", () => {
    const s = { ...at(started(), 4, 10, "down"), map: "harbor", ...pass, cooldown: 0, pools: { ...started().pools, harbor: ["invoice"] } };
    const hit = walk(s, "down", 0);
    expect(hit.phase).toBe("battle");
    expect(hit.battle.id).toBe("invoice");
    expect(hit.battle.b.peak).toBe(true);
    expect(hit.battle.b.lines.join(" ")).toContain("피크");
    const cached = walk({ ...s, gear: { cache: true } }, "down", 0);
    expect(cached.battle.b.lines.join(" ")).toContain("캐시가 추가 요금을 막아");
  });

  it("동굴 케이블 바닥에서는 동굴 의뢰가 나오고, 한도에 닿으면 대피소에서 쉰다", () => {
    const s = { ...at(started(), 4, 9, "down"), map: "cave", ...pass, cooldown: 0, usage: USAGE_CAP - 1, pools: { ...started().pools, cave: ["certs"] } };
    const hit = walk(s, "down", 0);
    expect(hit.battle.id).toBe("certs");
    const end = fight(hit, () => ({ id: "read" }));
    expect(end).toMatchObject({ map: "cave", usage: 0, player: { x: 5, y: 5 } });
  });

  it("항구 체육관은 신뢰 26 이상이어야 열리고 정산 뱃지를 준다", () => {
    const door = (trust, extra = {}) => walk({ ...at(started(), 23, 5, "up"), map: "harbor", ...pass, trust, ...geared, ...extra }, "up");
    expect(door(25).dialog.lines[0].who).toBe("경리부장");
    expect(door(25).phase).toBe("map");
    const start = talkThrough(door(26));
    expect(start.battle).toMatchObject({ kind: "gym", gym: "harbor", id: "hg1" });
    const won = fight(start);
    expect(won.badges).toEqual(["town", "forest", "harbor"]);
    expect(won.ending).toBeNull();
    expect(won.player).toMatchObject({ x: 23, y: 5 });
    expect(door(26, { badges: ["town", "forest", "harbor"] }).phase).toBe("map");
  });

  it("체육관 마지막 단계를 사용량 한도에서 이겨도 뱃지를 받고 사용량이 풀린다", () => {
    const b = { done: { kind: "win", coins: 0, trust: 0 }, context: 0, usage: USAGE_CAP };
    const s = { ...started(), map: "harbor", ...pass, gymPhase: 2, phase: "battle", battle: { kind: "gym", gym: "harbor", id: "hg3", b } };
    const end = run(s, { type: "battleClose" });
    expect(end.badges).toContain("harbor");
    expect(end.usage).toBe(0);
    expect(end.dialog.lines.at(-1).text).toContain("사용량");
  });

  it("캐시가 없으면 항구 시험에서 사용량이 바닥나 쉼터로 돌아간다", () => {
    const door = { ...at(started(), 23, 5, "up"), map: "harbor", ...pass, trust: 26, gear: { ...geared.gear, cache: false }, slots: geared.slots };
    const lost = fight(talkThrough(walk(door, "up")), () => ({ id: "read" }));
    expect(lost.badges).not.toContain("harbor");
    expect(lost.gymPhase).toBe(0);
  });

  it("동굴 체육관은 신뢰 30 이상이어야 열리고 보안 뱃지를 준다", () => {
    const door = (trust, extra = {}) => walk({ ...at(started(), 25, 5, "up"), map: "cave", ...pass, trust, ...geared, ...extra }, "up");
    expect(door(29).dialog.lines[0].who).toBe("보안팀장");
    const start = talkThrough(door(30));
    expect(start.battle).toMatchObject({ kind: "gym", gym: "cave", id: "cg1" });
    const won = fight(start);
    expect(won.badges).toContain("cave");
    expect(won.map).toBe("cave");
    expect(won.dialog.lines[0].who).toBe("보안팀장");
  });

  it("예전 저장에 항구와 동굴 대기열이 없으면 안 푼 의뢰로 채워 읽는다", () => {
    const raw = JSON.parse(JSON.stringify(snapshot({ ...started(7), seen: { invoice: "win" } })));
    const { harbor, cave, ...rest } = raw.pools;
    expect(harbor).toHaveLength(6);
    expect(cave).toHaveLength(6);
    const back = restore({ ...raw, pools: rest });
    expect(back.pools.harbor).not.toContain("invoice");
    expect(back.pools.harbor).toHaveLength(5);
    expect(back.pools.cave).toHaveLength(6);
    expect(restore({ ...raw, pools: { ...raw.pools, harbor: ["button"] } })).toBeNull();
  });

  it("지역 저장: 항구와 동굴 위치와 정산 · 보안 뱃지를 복원한다", () => {
    const harbor = restore(JSON.parse(JSON.stringify(snapshot({ ...started(7), map: "harbor", player: { x: 7, y: 1, dir: "down" }, badges: ["town", "harbor"] }))));
    expect(harbor).toMatchObject({ map: "harbor", badges: ["town", "harbor"], player: { x: 7, y: 1 } });
    const cave = restore({ ...JSON.parse(JSON.stringify(snapshot({ ...started(7), map: "cave", badges: ["cave"] }))), player: { x: 0, y: 0, dir: "up" } });
    expect(cave).toMatchObject({ map: "cave", player: { x: 5, y: 5 } });
  });
});
