import { describe, expect, it } from "vitest";
import { actionFor, cardOf, cardText, effectOf, judge, runLevel, solve, tagsOf } from "./engine.js";

const user = (tags, attack = null, needsSecret = false) => ({ id: "m", from: "user", text: "x", tags, attack, needsSecret });
const doc = (tags, attack = null) => ({ id: "d", from: "doc", text: "x", tags, attack, needsSecret: false });

describe("규칙 카드", () => {
  it("카드는 조건과 행동으로 문장을 만든다", () => {
    expect(cardOf("override", "refuse").id).toBe("refuse:override");
    expect(cardText(cardOf("hidden", "ignore"))).toBe("숨은 지시가 섞인 글 → 지시로 따르지 않는다");
  });

  it("메시지 태그에는 출처가 들어간다", () => {
    expect(tagsOf(doc(["hidden"]))).toEqual(["src:doc", "hidden"]);
  });
});

describe("규칙 적용", () => {
  it("위에서 아래로 처음 맞는 규칙이 적용되고 맞는 게 없으면 따른다", () => {
    const m = user(["asksSecret", "owner"]);
    expect(actionFor(m, [cardOf("owner", "allow"), cardOf("asksSecret", "refuse")])).toBe("allow");
    expect(actionFor(m, [cardOf("asksSecret", "refuse"), cardOf("owner", "allow")])).toBe("refuse");
    expect(actionFor(m, [cardOf("roleplay", "refuse")])).toBe("follow");
  });

  it("행동마다 응답, 유출, 실행 결과가 다르다", () => {
    expect(effectOf("refuse", user([]))).toEqual({ served: false, leaks: false, runs: false });
    expect(effectOf("ignore", user([]))).toEqual({ served: false, leaks: false, runs: false });
    expect(effectOf("ignore", doc([]))).toEqual({ served: true, leaks: false, runs: false });
    expect(effectOf("mask", user([]))).toEqual({ served: true, leaks: false, runs: true });
    expect(effectOf("allow", user([]))).toEqual({ served: true, leaks: true, runs: true });
    expect(effectOf("follow", user([]))).toEqual({ served: true, leaks: true, runs: true });
  });
});

describe("판정", () => {
  it("비밀 유출 공격은 가리거나 거절하면 막고, 지시 실행 공격은 가리는 것만으로는 못 막는다", () => {
    const leak = user(["asksSecret"], "leak");
    const hijack = user(["override"], "hijack");
    expect(judge(leak, []).fail).toBe("leak");
    expect(judge(leak, [cardOf("asksSecret", "mask")]).ok).toBe(true);
    expect(judge(hijack, [cardOf("override", "mask")]).fail).toBe("hijack");
    expect(judge(hijack, [cardOf("override", "refuse")]).ok).toBe(true);
  });

  it("정상 요청은 거절되면 blocked, 비밀을 받아야 하는데 가려지면 masked로 실패한다", () => {
    const plain = user([]);
    const secret = user(["asksSecret", "owner"], null, true);
    expect(judge(plain, []).ok).toBe(true);
    expect(judge(plain, [cardOf("src:user", "refuse")]).fail).toBe("blocked");
    expect(judge(secret, [cardOf("asksSecret", "mask")]).fail).toBe("masked");
    expect(judge(secret, [cardOf("owner", "allow"), cardOf("asksSecret", "mask")]).ok).toBe(true);
  });

  it("문서 속 숨은 지시는 따르지 않게 하면 문서는 그대로 읽힌다", () => {
    expect(judge(doc(["hidden"], "hijack"), [cardOf("hidden", "ignore")]).ok).toBe(true);
    expect(judge(doc([]), [cardOf("src:doc", "ignore")]).ok).toBe(true);
    expect(judge(doc([]), [cardOf("src:doc", "refuse")]).fail).toBe("blocked");
  });
});

describe("방 실행과 전수 탐색", () => {
  const level = {
    slots: 2,
    par: 1,
    deck: [cardOf("asksSecret", "refuse"), cardOf("src:user", "refuse"), cardOf("asksSecret", "mask")],
    messages: [
      { ...user([]), id: "a" },
      { ...user(["asksSecret"], "leak"), id: "b" },
    ],
  };

  it("별은 방어 1, 정상 통과 2, par 이하 3이다", () => {
    expect(runLevel(level, []).stars).toBe(0);
    expect(runLevel(level, [cardOf("src:user", "refuse")]).stars).toBe(1);
    expect(runLevel(level, [cardOf("asksSecret", "refuse"), cardOf("asksSecret", "mask")]).stars).toBe(2);
    expect(runLevel(level, [cardOf("asksSecret", "refuse")]).stars).toBe(3);
  });

  it("전수 탐색은 모든 해와 최소 카드 수를 찾는다", () => {
    const { solutions, minSlots } = solve(level);
    expect(minSlots).toBe(1);
    expect(solutions.map((rules) => rules.map((c) => c.id).join(">")).sort()).toEqual([
      "mask:asksSecret",
      "mask:asksSecret>refuse:asksSecret",
      "refuse:asksSecret",
      "refuse:asksSecret>mask:asksSecret",
    ]);
  });

  it("풀 수 없으면 minSlots는 null이다", () => {
    expect(solve({ ...level, deck: [cardOf("src:user", "refuse")] }).minSlots).toBeNull();
  });
});