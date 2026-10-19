import { describe, expect, it } from "vitest";
import { ACT_COUNTS, FIRST_REGULARS, REGULARS } from "./characters.js";
import { initialSimulation } from "./simulation.js";
import { CHOICES, choose, EVENTS, freshnessGaps, refreshStory, storyEntry } from "./story.js";

describe("골목의 이야기",()=>{
  it("단골 열 명의 설정과 첫 세 명의 사연을 복사 없이 갖춘다",()=>{
    expect(REGULARS).toHaveLength(10);
    const lines=FIRST_REGULARS.flatMap(person=>person.acts.flatMap(act=>act.lines));
    expect(new Set(lines).size).toBe(lines.length);
    expect(FIRST_REGULARS.every(person=>person.acts.length===3)).toBe(true);
    expect(new Set(EVENTS.map(event=>event.text)).size).toBe(EVENTS.length);
  });
  it("5·20·50회에만 사연이 열리고 반복 정산해도 보관함이 늘지 않는다",()=>{
    let s=initialSimulation(1);
    for(let act=0;act<3;act++) {
      s={...s,counts:{...s.counts,doyun:ACT_COUNTS[act]-1}};
      expect(refreshStory(s).seen).not.toContain(`doyun-${act}`);
      s=refreshStory({...s,counts:{...s.counts,doyun:ACT_COUNTS[act]}});
      expect(s.seen).toContain(`doyun-${act}`);
      expect(storyEntry(`doyun-${act}`).text).toContain(FIRST_REGULARS[0].acts[act].lines[0]);
    }
    expect(refreshStory(s).inbox).toEqual(s.inbox);
  });
  it("첫 분기는 5분 전 열리고 변경은 30코인만 든다",()=>{
    let s={...initialSimulation(1),elapsed:180000};
    expect(CHOICES[0].at).toBeLessThanOrEqual(300000);
    s=choose(s,"style","meal");
    expect(s.choices.style).toBe("meal");
    expect(choose(s,"style","rest")).toBe(s);
    s=choose({...s,coins:50},"style","rest");
    expect(s.coins).toBe(20);
    expect(choose(s,"style","rest")).toBe(s);
  });
  it("임의의 큰 빈 구간을 실제로 실패로 검출한다",()=>{
    expect(freshnessGaps([{at:0,id:"a"},{at:181000,id:"b"}],181000)).toHaveLength(1);
    expect(freshnessGaps([{at:0,id:"a"},{at:180000,id:"b"}],180000)).toEqual([]);
  });
});
