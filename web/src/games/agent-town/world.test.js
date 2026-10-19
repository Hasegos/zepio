import { describe, expect, it } from "vitest";
import {
  BOSS_TRUST,
  FOREST_TRUST,
  buildingAtDoor,
  BUILDINGS,
  facing,
  GATE_TRUST,
  HEIGHT,
  npcsFor,
  SIGNS,
  START,
  step,
  TERRAIN,
  tileAt,
  walkable,
  WIDTH,
} from "./world.js";

/**
 * 시작 칸에서 걸어서 닿을 수 있는 칸을 모두 찾는다.
 *
 * @param trust 신뢰 점수
 * @returns 닿는 칸 키("x,y")의 집합
 */
function reachable(trust) {
  const seen = new Set([`${START.x},${START.y}`]);
  const queue = [[START.x, START.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const dir of ["up", "down", "left", "right"]) {
      const [nx, ny] = step(x, y, dir);
      const key = `${nx},${ny}`;
      if (!seen.has(key) && walkable(nx, ny, trust)) {
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return seen;
}

describe("지도", () => {
  it("크기가 맞고 가장자리는 나무다", () => {
    expect(TERRAIN).toHaveLength(HEIGHT);
    for (const row of TERRAIN) expect(row).toHaveLength(WIDTH);
    expect(tileAt(-1, 0)).toBe("T");
    expect(tileAt(WIDTH, 3)).toBe("T");
    expect([...TERRAIN[0]].every((ch) => ch === "T")).toBe(true);
  });

  it("시작 칸은 걸을 수 있고 건물 입구는 길이다", () => {
    expect(walkable(START.x, START.y, 0)).toBe(true);
    for (const b of BUILDINGS) {
      expect(tileAt(b.door[0], b.door[1]), b.id).toBe("=");
      expect(buildingAtDoor(b.door[0], b.door[1]).id).toBe(b.id);
    }
  });

  it("건물 본체와 표지판은 걸을 수 없다", () => {
    for (const b of BUILDINGS) expect(walkable(b.x, b.y, 0), b.id).toBe(false);
    for (const s of SIGNS) expect(walkable(s.x, s.y, 0)).toBe(false);
  });
});

describe("길 찾기", () => {
  it("경비가 길을 막고 있으면 동쪽 풀숲과 작업장에 갈 수 없다", () => {
    const before = reachable(0);
    expect(before.has("25,4")).toBe(false);
    expect(before.has("20,12")).toBe(false);
    expect(before.has("4,4")).toBe(true);
    expect(before.has("11,4")).toBe(true);
    expect(before.has("3,13")).toBe(true);
    expect(before.has("10,13")).toBe(true);
  });

  it("신뢰가 쌓이면 경비가 비켜 주어 모든 건물과 풀숲에 닿는다", () => {
    const after = reachable(GATE_TRUST);
    for (const b of BUILDINGS) expect(after.has(`${b.door[0]},${b.door[1]}`), b.id).toBe(true);
    expect(after.has("20,12")).toBe(true);
    expect(after.has("18,4")).toBe(true);
  });

  it("모든 NPC와 표지판 앞에 서서 말을 걸 수 있다", () => {
    const after = reachable(BOSS_TRUST);
    const spots = [...npcsFor(BOSS_TRUST), ...SIGNS];
    for (const target of spots) {
      const near = ["up", "down", "left", "right"].some((dir) => {
        const [x, y] = step(target.x, target.y, dir);
        return after.has(`${x},${y}`);
      });
      expect(near, target.id).toBe(true);
    }
  });

  it("경비를 만나기 전 길의 NPC 중 막히는 칸이 길을 끊지 않는다(민수, 이 대리 등은 길가에 선다)", () => {
    const before = reachable(0);
    for (const id of ["minsu", "daeri", "zepi"]) {
      const npc = npcsFor(0).find((n) => n.id === id);
      const near = ["up", "down", "left", "right"].some((dir) => before.has(step(npc.x, npc.y, dir).join(",")));
      expect(near, id).toBe(true);
    }
  });
});

describe("마주 보기", () => {
  it("앞 칸의 NPC나 표지판을 찾는다", () => {
    expect(facing(8, 9, "up", 0).target.id).toBe("zepi");
    expect(facing(7, 9, "up", 0).type).toBe("sign");
    expect(facing(7, 9, "down", 0)).toBeNull();
  });

  it("경비는 신뢰가 쌓이면 길을 비킨다", () => {
    expect(npcsFor(0).find((n) => n.id === "guard")).toMatchObject({ x: 15, y: 9 });
    expect(npcsFor(GATE_TRUST).find((n) => n.id === "guard").x).toBeLessThan(15);
  });
});

describe("레거시 숲", () => {
  it("숲지기가 길을 막고 있는 동안은 숲에 갈 수 없고, 신뢰 16이면 비켜 준다", () => {
    const closed = reachable(BOSS_TRUST);
    expect(closed.has("35,5")).toBe(false);
    expect(closed.has("29,9")).toBe(false);
    expect(npcsFor(BOSS_TRUST).find((n) => n.id === "keeper")).toMatchObject({ x: 28, y: 9 });
    const open = reachable(FOREST_TRUST);
    expect(open.has("35,5")).toBe(true);
    expect(open.has("35,13")).toBe(true);
    expect(npcsFor(FOREST_TRUST).find((n) => n.id === "keeper").y).toBe(8);
  });

  it("숲에는 짙은 풀숲(f)이 있고 마을에는 없다", () => {
    const rows = TERRAIN.map((row) => [...row]);
    expect(rows.flatMap((row, y) => row.map((ch, x) => (ch === "f" ? x : -1)).filter((x) => x >= 0 && y >= 0)).every((x) => x >= 30)).toBe(true);
    expect(TERRAIN.some((row) => row.includes("f"))).toBe(true);
  });
});