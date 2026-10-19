import { describe, expect, it } from "vitest";
import { runBots, simulate } from "./simulate.js";
import { EVENTS, storyEntry } from "./story.js";

const results=runBots();
describe("1차 40분 운영 봇과 신선도",()=>{
  it("여섯 정책 모두 다음 장의 관계 목표에 도달하고 방치도 막히지 않는다",()=>{
    expect(results).toHaveLength(6);
    for(const result of results) {
      expect(result.readyAt).not.toBeNull();
      expect(result.readyAt).toBeLessThanOrEqual(2400000);
      expect(Object.values(result.counts).every(count=>count>=20)).toBe(true);
    }
    expect(results.find(r=>r.policy==="direct").readyAt).toBeLessThan(results.find(r=>r.policy==="idle").readyAt);
  });
  it("음료와 디저트 편성이 처리량과 수익에서 서로 다른 장점을 갖는다",()=>{
    const drinks=results.find(r=>r.policy==="drinks");
    const desserts=results.find(r=>r.policy==="desserts");
    expect(drinks.served).toBeGreaterThan(desserts.served);
    expect(desserts.earned).toBeGreaterThan(drinks.earned);
    const arranged=results.filter(r=>["drinks","desserts","patience"].includes(r.policy));
    expect(Math.max(...arranged.map(r=>r.readyAt))/Math.min(...arranged.map(r=>r.readyAt))).toBeLessThan(1.5);
    expect(Math.max(...arranged.map(r=>r.earned))/Math.min(...arranged.map(r=>r.earned))).toBeLessThan(1.5);
  });
  it("공개한 실제 사건만 출력하며 모든 정책에서 3분 초과 공백이 없다",()=>{
    for(const result of results) {
      expect(result.gaps).toEqual([]);
      expect(new Set(result.timeline.map(e=>e.id)).size).toBe(result.timeline.length);
      for(const event of result.timeline) expect(storyEntry(event.id)).not.toBeNull();
      expect(result.timeline.some(e=>e.id===EVENTS.at(-1).id)).toBe(true);
    }
  });
  it("첫 주문은 30초, 첫 무료 선택은 5분 안에 열리고 시작 시각 때문에 진행이 막히지 않는다",()=>{
    const active=results.find(r=>r.policy==="direct");
    expect(active.firstOrder).toBeLessThanOrEqual(30000);
    expect(active.firstChoice).toBeLessThanOrEqual(300000);
    const later=simulate({policy:"idle",start:1700040000000});
    expect(later.served).toBe(results.find(r=>r.policy==="idle").served);
  });
});
