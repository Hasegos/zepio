import { describe, expect, it } from "vitest";
import { cardOf, runLevel, solve, TAGS } from "./engine.js";
import { LEVELS } from "./levels.js";

describe("프롬프트 요새 레벨", () => {
  it("방은 12개이고 번호와 메시지 번호가 겹치지 않는다", () => {
    expect(LEVELS).toHaveLength(12);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(12);
    const ids = LEVELS.flatMap((l) => l.messages.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("카드와 메시지는 알려진 태그만 쓰고 안내 글이 모두 있다", () => {
    for (const level of LEVELS) {
      expect(level.title && level.intro && level.explain, level.id).toBeTruthy();
      for (const card of level.deck) expect(TAGS[card.tag], `${level.id} ${card.id}`).toBeTruthy();
      for (const m of level.messages) {
        expect(["user", "doc", "tool"], m.id).toContain(m.from);
        expect(m.text.length, m.id).toBeGreaterThan(5);
        for (const tag of m.tags) expect(TAGS[tag], `${m.id} ${tag}`).toBeTruthy();
      }
    }
  });

  it("모든 방은 풀 수 있고 최소 카드 수가 par와 같으며 슬롯 안에 든다", () => {
    for (const level of LEVELS) {
      const { solutions, minSlots } = solve(level);
      expect(solutions.length, level.id).toBeGreaterThan(0);
      expect(minSlots, level.id).toBe(level.par);
      expect(level.par, level.id).toBeLessThanOrEqual(level.slots);
    }
  }, 60000);

  it("par 조합은 별 셋이다", () => {
    for (const level of LEVELS) {
      const best = solve(level).solutions.find((rules) => rules.length === level.par);
      expect(runLevel(level, best).stars, level.id).toBe(3);
    }
  }, 60000);

  it("아무 규칙이 없거나 사용자 말을 통째로 거절하는 꼼수로는 풀 수 없다", () => {
    for (const level of LEVELS) {
      expect(runLevel(level, []).defended, level.id).toBe(false);
      expect(runLevel(level, [cardOf("src:user", "refuse")]).stars, level.id).toBeLessThan(2);
    }
  });

  it("11번 방은 정상 요청이 절반 이상이다", () => {
    const ratio = (level) => level.messages.filter((m) => !m.attack).length / level.messages.length;
    expect(ratio(LEVELS[10])).toBeGreaterThanOrEqual(0.5);
  });
});