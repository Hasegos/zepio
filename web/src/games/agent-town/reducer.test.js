import { describe, expect, it } from "vitest";
import { USAGE_CAP } from "./battle.js";
import { adaptive } from "./bots.js";
import { ITEMS } from "./party.js";
import { mergeEnding, readData, restore, snapshot, summarize } from "./record.js";
import { COOLDOWN, initialState, newGame, reducer } from "./reducer.js";
import { ALL_TASK_IDS, BOSS_PHASES, TRAINER_TASKS, WILD_TASKS } from "./tasks.js";
import { BOSS_TRUST, GATE_TRUST } from "./world.js";

const run = (state, ...actions) => actions.reduce(reducer, state);
const talkThrough = (state) => {
  let s = state;
  for (let i = 0; i < 40 && s.dialog; i += 1) s = reducer(s, { type: "advance" });
  return s;
};
const started = (seed = 1) => talkThrough(newGame(seed));
const at = (state, x, y, dir) => ({ ...state, player: { x, y, dir } });
const FULL = { plan: true, grep: true, readRule: true, askRule: true, guard: true, secret: true, autotest: true };

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
    expect(after.pool).toHaveLength(WILD_TASKS.length);
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
    expect(hit.pool).toHaveLength(WILD_TASKS.length - 1);
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
    const grass = { ...at(started(), 17, 8, "up"), trust: 6, coins: 30, cooldown: 0, pool: ["tmp", "button"] };
    const battle = run(grass, { type: "move", dir: "up", roll: 0 });
    const lost = fight(battle, () => ({ id: "edit" }));
    expect(lost.coins).toBe(20);
    expect(lost.trust).toBe(5);
    expect(lost.disasters).toBe(1);
  });

  it("한 번 경비를 지나갈 신뢰를 얻으면 사고가 나도 그 아래로 떨어지지 않는다", () => {
    const grass = { ...at(started(), 17, 8, "up"), trust: GATE_TRUST, coins: 0, cooldown: 0, pool: ["tmp"] };
    const lost = fight(run(grass, { type: "move", dir: "up", roll: 0 }), () => ({ id: "edit" }));
    expect(lost.disasters).toBe(1);
    expect(lost.trust).toBe(GATE_TRUST);
  });

  it("의뢰인이 떠나거나 사고가 난 야생 의뢰는 풀 뒤로 돌아와 다시 만날 수 있다", () => {
    const grass = { ...at(started(), 17, 8, "up"), trust: 6, cooldown: 0, pool: ["tmp", "button"] };
    const lost = fight(run(grass, { type: "move", dir: "up", roll: 0 }), () => ({ id: "edit" }));
    expect(lost.pool).toEqual(["button", "tmp"]);
    const legit = { ...grass, pool: ["button", "tmp"] };
    const left = fight(run(legit, { type: "move", dir: "up", roll: 0 }), () => ({ id: "refuse" }));
    expect(left.pool).toEqual(["tmp", "button"]);
  });

  it("한도에서 이겨도 쉼터에서 쉬고 사용량이 돌아온다", () => {
    const grass = { ...at(started(), 17, 8, "up"), usage: USAGE_CAP - 2, cooldown: 0, pool: ["button"] };
    const won = fight(run(grass, { type: "move", dir: "up", roll: 0 }), () => ({ id: "edit" }));
    expect(won.coins).toBeGreaterThan(0);
    expect(won.usage).toBe(0);
    expect(won.player).toMatchObject({ x: 3, y: 14 });
  });

  it("사용량 한도에 닿으면 쉼터에서 쉬고 사용량이 돌아온다", () => {
    const grass = { ...at(started(), 17, 8, "up"), usage: USAGE_CAP - 1, cooldown: 0, pool: ["login"] };
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

describe("팀장 박", () => {
  const door = (trust, extra = {}) => run({ ...at(started(), 25, 5, "up"), trust, gear: FULL, ...extra }, { type: "move", dir: "up", roll: 1 });

  it("신뢰가 모자라면 들어갈 수 없다", () => {
    const s = door(BOSS_TRUST - 1);
    expect(s.dialog.lines[0].who).toBe("비서");
  });

  it("신뢰가 충분하면 세 단계를 거쳐 엔딩에 닿는다", () => {
    let s = talkThrough(door(BOSS_TRUST));
    expect(s.phase).toBe("battle");
    expect(s.battle.kind).toBe("boss");
    expect(s.battle.b.usage).toBe(0);
    s = fight(s);
    expect(s.phase).toBe("ending");
    expect(s.finished).toBe(true);
    expect(s.ending.trust).toBeGreaterThanOrEqual(BOSS_TRUST);
    s = talkThrough(s);
    expect(run(s, { type: "resume" }).phase).toBe("map");
  });

  it("장비가 없으면 보스에게 지고 문 앞으로 돌아온다", () => {
    let s = talkThrough(door(BOSS_TRUST, { gear: {} }));
    s = fight(s, () => ({ id: "edit" }));
    expect(s.phase).toBe("map");
    expect(s.finished).toBe(false);
    expect(s.player).toMatchObject({ x: 25, y: 5 });
    expect(s.dialog.lines[0].who).toBe("팀장 박");
  });

  it("엔딩을 본 뒤 다시 들어가면 전투 없이 인사만 한다", () => {
    const s = door(BOSS_TRUST, { finished: true });
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
    expect(back.pool).toEqual(s.pool);
  });

  it("깨진 저장은 버린다", () => {
    const good = snapshot(started());
    expect(restore(null)).toBeNull();
    expect(restore({ ...good, trust: -1 })).toBeNull();
    expect(restore({ ...good, pool: ["nope"] })).toBeNull();
    expect(restore({ ...good, pool: ["button", "button"] })).toBeNull();
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
