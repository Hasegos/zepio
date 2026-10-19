import { describe, expect, it } from "vitest";
import {
  availableMoves,
  hintFor,
  CONTEXT_CAP,
  DISASTER_FINE,
  playMove,
  startBattle,
  USAGE_CAP,
  usageCost,
} from "./battle.js";
import { adaptive, fullPipeline, readEditTest, runBattle, yolo } from "./bots.js";
import { activeGear, buy, isSlotItem, ITEMS } from "./party.js";
import { ALL_TASK_IDS, BOSS_PHASES, FOREST_TASKS, TRAINER_TASKS, WILD_TASKS, taskById } from "./tasks.js";

const NONE = {};
const ALL = { plan: true, grep: true, readRule: true, askRule: true, guard: true, secret: true, autotest: true };
const play = (b, gear, ...ids) => ids.reduce((acc, id) => playMove(acc, gear, id), b);
const task = (id) => taskById(id);

describe("데이터", () => {
  it("의뢰 식별자가 겹치지 않고 모두 필수 필드를 가진다", () => {
    expect(new Set(ALL_TASK_IDS).size).toBe(ALL_TASK_IDS.length);
    for (const id of ALL_TASK_IDS) {
      const t = task(id);
      expect(t.text, id).toBeTruthy();
      expect(t.win, id).toBeTruthy();
      expect(t.goal).toBeGreaterThan(0);
      expect(t.patience).toBeGreaterThan(0);
      if (t.ambiguous || t.danger) expect(t.answer, id).toBeTruthy();
      if (t.injection) expect(t.reveal, id).toBeTruthy();
    }
    expect(WILD_TASKS.length).toBeGreaterThanOrEqual(16);
    expect(Object.keys(TRAINER_TASKS)).toHaveLength(5);
    expect(BOSS_PHASES).toHaveLength(3);
  });
});

describe("기본 규칙", () => {
  it("단순한 의뢰는 고치기만 해도 끝난다", () => {
    const b = play(startBattle(task("button")), NONE, "edit");
    expect(b.done.kind).toBe("win");
    expect(b.done.coins).toBeGreaterThan(0);
  });

  it("모호한 의뢰를 묻지 않고 고치면 퇴짜를 맞고, 묻고 고치면 통과한다", () => {
    const bad = play(startBattle(task("pretty")), NONE, "edit", "edit");
    expect(bad.rejects).toBe(1);
    expect(bad.done).toBeNull();
    const good = play(startBattle(task("pretty")), NONE, "ask", "edit", "edit");
    expect(good.done.kind).toBe("win");
  });

  it("읽지 않고 고치면 버그가 생기고 테스트로 고칠 수 있다", () => {
    const hasty = play(startBattle(task("login")), NONE, "edit");
    expect(hasty.bugs).toBe(1);
    const fixed = play(hasty, NONE, "test");
    expect(fixed.bugs).toBe(0);
    const careful = play(startBattle(task("login")), NONE, "read", "edit");
    expect(careful.done.kind).toBe("win");
  });

  it("큰 일은 계획이 있어야 진도가 빠르다", () => {
    const gear = { plan: true };
    const planned = play(startBattle(task("list")), gear, "plan", "edit", "edit");
    const blind = play(startBattle(task("list")), gear, "edit", "edit");
    expect(planned.progress).toBeGreaterThan(blind.progress);
    expect(blind.context).toBeGreaterThan(planned.context);
  });

  it("계획 스킬이 없으면 계획을 세울 수 없다", () => {
    const b = startBattle(task("list"));
    expect(playMove(b, NONE, "plan")).toBe(b);
    expect(availableMoves(b, NONE, []).some((m) => m.id === "plan")).toBe(false);
  });

  it("급한 의뢰는 턴마다 인내심이 두 배로 닳는다", () => {
    const b = play(startBattle(task("down")), NONE, "read");
    expect(b.patience).toBe(task("down").patience - 2);
    const grep = play(startBattle(task("down")), { grep: true }, "read");
    expect(grep.patience).toBe(task("down").patience);
  });

  it("인내심이 바닥나면 의뢰인이 떠난다", () => {
    const b = play(startBattle(task("demo")), NONE, "ask", "ask");
    expect(b.done.kind).toBe("leave");
  });
});

describe("위험한 의뢰", () => {
  it("훅 없이 위험한 수정을 하면 사고가 난다", () => {
    const b = play(startBattle(task("tmp")), NONE, "edit");
    expect(b.done).toMatchObject({ kind: "disaster", coins: -DISASTER_FINE, trust: -1 });
  });

  it("삭제 방지 훅은 막아 주기만 하고 해결은 안 해 준다", () => {
    const b = play(startBattle(task("tmp")), { guard: true }, "edit");
    expect(b.done).toBeNull();
    const solved = play(b, { guard: true }, "ask", "edit");
    expect(solved.done.kind).toBe("win");
  });

  it("묻거나 거절하면 안전하게 넘어간다", () => {
    expect(play(startBattle(task("tmp")), NONE, "ask", "edit").done.kind).toBe("win");
    const refused = play(startBattle(task("tmp")), NONE, "refuse");
    expect(refused.done).toMatchObject({ kind: "refuse", trust: 1 });
  });

  it("정당한 의뢰를 거절하면 의뢰인이 떠난다", () => {
    expect(play(startBattle(task("button")), NONE, "refuse").done).toMatchObject({ kind: "leave", coins: 0, trust: 0 });
  });
});

describe("숨은 지시(프롬프트 인젝션)", () => {
  it("읽기 전에 따르면 키가 새 나간다", () => {
    const b = play(startBattle(task("summary")), NONE, "edit");
    expect(b.done.kind).toBe("disaster");
  });

  it("읽으면 수상한 지시를 알아채고 무시한 채 일을 끝낼 수 있다", () => {
    const read = play(startBattle(task("summary")), NONE, "read");
    expect(read.revealed).toBe(true);
    expect(play(read, NONE, "edit").done.kind).toBe("win");
  });

  it("비밀 보호 훅은 유출을 막고 단서를 보여 준다", () => {
    const b = play(startBattle(task("summary")), { secret: true }, "edit");
    expect(b.done).toBeNull();
    expect(b.revealed).toBe(true);
  });

  it("거절하는 것도 안전한 선택이다", () => {
    expect(play(startBattle(task("issues")), NONE, "refuse").done.kind).toBe("refuse");
  });
});

describe("컨텍스트와 사용량", () => {
  it("컨텍스트가 가득 차면 자동 요약으로 알던 것을 잊는다", () => {
    let b = startBattle(task("slow"), { context: CONTEXT_CAP });
    b = play(b, NONE, "ask");
    expect(b.lines.join(" ")).toContain("자동으로 요약");
    expect(b.clarified).toBe(true);
    expect(b.context).toBeLessThan(CONTEXT_CAP);
    let c = play(startBattle(task("slow")), NONE, "ask", "read");
    c = { ...c, context: CONTEXT_CAP };
    c = play(c, NONE, "test");
    expect(c.clarified).toBe(false);
    expect(c.located).toBe(false);
  });

  it("사용량이 모자라면 기술을 쓸 수 없고 한도에 닿으면 전투가 끝난다", () => {
    const low = startBattle(task("login"), { usage: USAGE_CAP - 1 });
    const moves = availableMoves(low, NONE, ["explorer"]);
    expect(moves.find((m) => m.id === "edit").enabled).toBe(false);
    expect(moves.find((m) => m.id === "summon").enabled).toBe(false);
    expect(moves.find((m) => m.id === "read").enabled).toBe(true);
    const done = play(low, NONE, "read");
    expect(done.done.kind).toBe("limit");
  });

  it("규칙과 훅이 끼워 넣는 동작의 비용까지 미리 계산한다", () => {
    const b = startBattle(task("slow"));
    expect(usageCost(b, NONE, "edit")).toBe(2);
    expect(usageCost(b, ALL, "edit")).toBe(2 + 1 + 1 + 1);
  });
});

describe("규칙과 훅", () => {
  it("CLAUDE.md 규칙은 모르는 곳을 읽고 모호한 건 묻고 나서 고친다", () => {
    const gear = { readRule: true, askRule: true };
    const b = play(startBattle(task("slow")), gear, "edit");
    expect(b.located).toBe(true);
    expect(b.clarified).toBe(true);
    expect(b.bugs).toBe(0);
  });

  it("자동 테스트 훅은 버그를 즉시 잡는다", () => {
    const b = play(startBattle(task("login")), { autotest: true }, "edit");
    expect(b.bugs).toBe(0);
  });
});

describe("서브에이전트", () => {
  it("탐색 동료는 내 컨텍스트를 쓰지 않고 위치를 찾아 온다", () => {
    const b = playMove(startBattle(task("login")), NONE, "summon", "explorer");
    expect(b.located).toBe(true);
    expect(b.context).toBe(0);
    expect(b.usage).toBe(3);
    expect(playMove(b, NONE, "summon", "explorer")).toBe(b);
  });

  it("실행 동료는 별도 컨텍스트에서 진도를 낸다", () => {
    const b = playMove(startBattle(task("button")), NONE, "summon", "runner");
    expect(b.done.kind).toBe("win");
    expect(b.context).toBe(0);
  });

  it("리뷰 동료는 위험과 숨은 지시를 알려 준다", () => {
    const danger = playMove(startBattle(task("tmp")), NONE, "summon", "reviewer");
    expect(danger.lines.join(" ")).toContain("위험");
    const hidden = playMove(startBattle(task("summary")), NONE, "summon", "reviewer");
    expect(hidden.revealed).toBe(true);
  });
});

describe("상점", () => {
  it("코인이 모자라거나 이미 샀으면 사지 못한다", () => {
    expect(buy({}, 5, "plan").ok).toBe(false);
    const bought = buy({}, 12, "plan");
    expect(bought).toMatchObject({ ok: true, coins: 2 });
    expect(buy(bought.gear, 100, "plan").ok).toBe(false);
    expect(buy({}, 100, "nope").ok).toBe(false);
  });
});

/**
 * 모든 의뢰에 전략을 적용해 결과를 모은다.
 *
 * @param gear 장비
 * @param make 전략 만드는 함수
 * @param party 동료
 * @returns { wins, disasters, leaves, coins }
 */
function sweep(gear, make, party = []) {
  const out = { wins: 0, disasters: 0, leaves: 0, refuse: 0, fail: [] };
  for (const id of ALL_TASK_IDS) {
    const b = runBattle(startBattle(task(id)), gear, party, make());
    if (b.done.kind === "win") out.wins += 1;
    else {
      out[b.done.kind === "disaster" ? "disasters" : b.done.kind === "refuse" ? "refuse" : "leaves"] += 1;
      out.fail.push(id);
    }
  }
  return out;
}

describe("전략별 밸런스(모든 의뢰, 장비 있음/없음)", () => {
  it("적응형 전략은 장비를 갖추면 모든 의뢰를 끝낸다", () => {
    const r = sweep(ALL, () => adaptive);
    expect(r.fail).toEqual([]);
  });

  it("슬롯 3칸만 끼워도 적응형 전략은 모든 의뢰를 끝낸다", () => {
    for (const slots of [["readRule", "askRule", "guard"], ["secret", "guard", "autotest"], []]) {
      expect(sweep(activeGear(ALL, slots), () => adaptive).fail, slots.join()).toEqual([]);
    }
  });

  it("고치기만 하는 전략은 단서가 있는 의뢰에서 크게 진다", () => {
    const r = sweep(NONE, () => yolo);
    expect(r.wins).toBeLessThan(ALL_TASK_IDS.length * 0.45);
    expect(r.disasters).toBeGreaterThanOrEqual(5);
  });

  it("읽고 고치고 테스트만 하는 전략은 모호한 의뢰와 위험한 의뢰에서 진다", () => {
    const r = sweep(NONE, () => readEditTest);
    expect(r.wins).toBeLessThan(ALL_TASK_IDS.length * 0.7);
    expect(r.fail).toContain("pretty");
    expect(r.fail).toContain("tmp");
  });

  it("무조건 다 하는 전략은 급한 의뢰에서 진다", () => {
    const r = sweep(ALL, fullPipeline);
    expect(r.fail).toContain("demo");
    expect(r.fail).toContain("coupon");
    expect(r.wins).toBeLessThan(sweep(ALL, () => adaptive).wins);
  });

  it("적응형이 어떤 고정 전략보다 확실히 낫다", () => {
    const adapt = sweep(NONE, () => adaptive).wins;
    for (const make of [() => yolo, () => readEditTest, fullPipeline]) {
      expect(adapt).toBeGreaterThanOrEqual(sweep(NONE, make).wins + 3);
    }
  });
});
describe("제피 귀띔", () => {
  it("무료이고 인내심과 사용량을 쓰지 않으며 동료가 있어야 보인다", () => {
    const b = startBattle(task("pretty"));
    expect(availableMoves(b, NONE, []).some((m) => m.id === "hint")).toBe(false);
    const move = availableMoves(b, NONE, ["explorer"]).find((m) => m.id === "hint");
    expect(move).toMatchObject({ cost: 0, enabled: true });
    const next = playMove(b, NONE, "hint");
    expect(next.usage).toBe(b.usage);
    expect(next.patience).toBe(b.patience);
    expect(next.lines[0]).toContain("모호");
  });

  it("해결한 것은 건너뛰고 그 다음으로 풀어야 할 것을 가리킨다", () => {
    let b = startBattle(task("slow"));
    expect(hintFor(b, NONE)).toContain("모호");
    b = play(b, NONE, "ask");
    expect(hintFor(b, NONE)).toContain("코드를 읽어");
    b = play(b, NONE, "read");
    expect(hintFor(b, NONE)).toContain("고치기만");
  });

  it("큰 일은 계획 모드가 없으면 도서관을, 있으면 계획을 권한다", () => {
    const b = startBattle(task("list"));
    expect(hintFor(b, NONE)).toContain("도서관");
    expect(hintFor(b, { plan: true })).toContain("계획을 먼저");
  });

  it("위험과 숨은 지시는 가장 먼저 알려 준다", () => {
    expect(hintFor(startBattle(task("tmp")), NONE)).toContain("위험");
    expect(hintFor(startBattle(task("summary")), NONE)).toContain("수상한");
  });

  it("귀띔만 따라가도 모든 의뢰를 푼다", () => {
    const follow = (b, gear) => {
      const h = hintFor(b, gear);
      if (h.includes("물어")) return { id: "ask" };
      if (h.includes("읽어")) return { id: "read" };
      if (h.includes("계획을 먼저")) return { id: "plan" };
      if (h.includes("테스트")) return { id: "test" };
      return { id: "edit" };
    };
    const r = sweep(ALL, () => follow);
    expect(r.fail).toEqual([]);
  });
});

describe("환각 의뢰", () => {
  it("자료를 읽지 않고 쓰면 지어낸 내용이 생기고, 테스트로는 못 잡는다", () => {
    const b = play(startBattle(task("report")), NONE, "edit");
    expect(b.fake).toBe(true);
    expect(b.bugs).toBe(0);
    expect(play(b, NONE, "test").fake).toBe(true);
  });

  it("지어낸 채로 끝내려 하면 의뢰인이 출처를 묻고 퇴짜를 놓는다", () => {
    const b = play(startBattle(task("report")), NONE, "edit", "edit");
    expect(b.rejects).toBe(1);
    expect(b.fake).toBe(false);
    expect(b.done).toBeNull();
    expect(b.lines.join(" ")).toContain("출처");
  });

  it("읽고 쓰면 바로 통과하고, 나중에 읽거나 리뷰를 맡겨도 바로잡는다", () => {
    expect(play(startBattle(task("report")), NONE, "read", "edit", "edit", "edit").done.kind).toBe("win");
    const faked = play(startBattle(task("report")), NONE, "edit");
    expect(play(faked, NONE, "read").fake).toBe(false);
    expect(playMove(faked, NONE, "summon", "reviewer").fake).toBe(false);
  });

  it("먼저 읽기 규칙이 켜져 있으면 지어내지 않는다", () => {
    const b = play(startBattle(task("report")), { readRule: true }, "edit");
    expect(b.fake).toBe(false);
    expect(b.located).toBe(true);
  });

  it("제피가 자료 읽기를 귀띔하고, 지어낸 뒤에는 다시 읽으라고 한다", () => {
    const b = startBattle(task("apidoc"));
    expect(hintFor(b, NONE)).toContain("자료를 읽고");
    expect(hintFor(play(b, NONE, "edit"), NONE)).toContain("다시 읽어서");
  });

  it("환각 의뢰는 4개 이상이고 모두 근거를 읽어야 하는 의뢰다", () => {
    const hallu = ALL_TASK_IDS.filter((id) => task(id).hallu);
    expect(hallu.length).toBeGreaterThanOrEqual(4);
    for (const id of hallu) expect(task(id).locate, id).toBe(true);
  });
});

describe("모델 선택", () => {
  it("모델 바꾸기는 무료이고 인내심을 쓰지 않으며 누를 때마다 바뀐다", () => {
    const b = startBattle(task("button"));
    const move = availableMoves(b, NONE, []).find((m) => m.id === "model");
    expect(move).toMatchObject({ cost: 0, enabled: true, label: "빠른 모델로" });
    const fast = playMove(b, NONE, "model");
    expect(fast.fast).toBe(true);
    expect(fast.patience).toBe(b.patience);
    expect(availableMoves(fast, NONE, []).find((m) => m.id === "model").label).toBe("정확한 모델로");
    expect(playMove(fast, NONE, "model").fast).toBe(false);
  });

  it("빠른 모델은 수정 사용량을 1 아낀다", () => {
    const b = startBattle(task("button"));
    const fast = playMove(b, NONE, "model");
    expect(usageCost(fast, NONE, "edit")).toBe(usageCost(b, NONE, "edit") - 1);
    expect(playMove(fast, NONE, "edit").usage).toBe(b.usage + 1);
  });

  it("빠른 모델로 큰 일을 하면 버그가, 근거가 필요한 일을 하면 지어낸 내용이 생긴다", () => {
    const big = play(startBattle(task("list")), { plan: true }, "plan", "model", "edit");
    expect(big.bugs).toBe(1);
    const accurate = play(startBattle(task("list")), { plan: true }, "plan", "edit");
    expect(accurate.bugs).toBe(0);
    const hallu = play(startBattle(task("apidoc")), NONE, "read", "model", "edit");
    expect(hallu.fake).toBe(true);
    expect(play(startBattle(task("button")), NONE, "model", "edit").done.kind).toBe("win");
  });

  it("제피는 빠른 모델로 큰 일을 하려 하면 바꾸라고 귀띔한다", () => {
    const b = play(startBattle(task("list")), { plan: true }, "plan", "model");
    expect(hintFor(b, { plan: true })).toContain("정확한 모델");
  });
});

describe("MCP 서버", () => {
  it("문서 서버는 근거가 필요한 일에서 읽지 않아도 지어내지 않고 사용량도 안 쓴다", () => {
    const gear = { mcpDocs: true, readRule: true };
    const b = startBattle(task("report"));
    expect(usageCost(b, gear, "edit")).toBe(2);
    const next = playMove(b, gear, "edit");
    expect(next.fake).toBe(false);
    expect(next.located).toBe(true);
    expect(next.usage).toBe(2);
  });

  it("이슈 서버는 모호한 의뢰를 질문 없이, 사용량 없이 풀어 준다", () => {
    const gear = { mcpTicket: true, askRule: true };
    const b = startBattle(task("pretty"));
    expect(usageCost(b, gear, "edit")).toBe(2);
    const next = play(b, gear, "edit", "edit");
    expect(next.clarified).toBe(true);
    expect(next.done.kind).toBe("win");
    expect(next.usage).toBe(4);
  });

  it("MCP는 슬롯 장비이고 대장간에서 판다", () => {
    for (const id of ["mcpDocs", "mcpTicket"]) {
      expect(isSlotItem(id)).toBe(true);
      expect(ITEMS.find((it) => it.id === id).place).toBe("forge");
    }
  });
});

describe("레거시 숲 의뢰", () => {
  it("숲 의뢰 6개는 모두 더 어려운 조합이고 보상이 크다", () => {
    expect(FOREST_TASKS).toHaveLength(6);
    for (const t of FOREST_TASKS) {
      const flags = ["locate", "ambiguous", "big", "urgent", "danger", "injection", "hallu"].filter((k) => t[k]);
      expect(flags.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.coins, t.id).toBeGreaterThanOrEqual(24);
    }
    expect(ALL_TASK_IDS).toEqual(expect.arrayContaining(FOREST_TASKS.map((t) => t.id)));
  });

  it("전설의 모놀리스는 위험, 근거, 큰 일을 모두 요구해 한 가지로는 못 푼다", () => {
    const m = task("monolith");
    const yoloEnd = runBattle(startBattle(m), NONE, [], yolo);
    expect(yoloEnd.done.kind).not.toBe("win");
    expect(runBattle(startBattle(m), ALL, [], adaptive).done.kind).toBe("win");
  });
});