import { describe, expect, it } from "vitest";
import {
  buildingAtDoor,
  facing,
  GATE_TRUST,
  LEAGUE_BADGES,
  MAPS,
  npcsFor,
  progressOf,
  START,
  step,
  tileAt,
  walkable,
  warpAt,
} from "./world.js";

const DIRS = ["up", "down", "left", "right"];
const TOWN = "town";
const FOREST = "forest";
const none = { trust: 0, badges: [] };

/**
 * 한 지도에서 시작 칸으로부터 걸어서 닿을 수 있는 칸을 모두 찾는다.
 *
 * @param mapId 지도 식별자
 * @param from 시작 칸 {x, y}
 * @param progress { trust, badges }
 * @returns 닿는 칸 키("x,y")의 집합
 */
function reachable(mapId, from, progress) {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [[from.x, from.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const dir of DIRS) {
      const [nx, ny] = step(x, y, dir);
      const key = `${nx},${ny}`;
      if (!seen.has(key) && walkable(mapId, nx, ny, progress)) {
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return seen;
}

const nextTo = (set, target) => DIRS.some((dir) => set.has(step(target.x, target.y, dir).join(",")));

describe("지도", () => {
  it("크기가 맞고 가장자리는 나무와 입구뿐이다", () => {
    for (const map of Object.values(MAPS)) {
      expect(map.terrain, map.id).toHaveLength(map.height);
      for (const row of map.terrain) expect(row, map.id).toHaveLength(map.width);
      expect(tileAt(map.id, -1, 0)).toBe("T");
      expect(tileAt(map.id, map.width, 3)).toBe("T");
      expect([...map.terrain[0]].every((ch) => "TW".includes(ch)), map.id).toBe(true);
    }
  });

  it("시작 칸은 걸을 수 있고 건물 입구는 길이다", () => {
    expect(walkable(TOWN, START.x, START.y, none)).toBe(true);
    for (const map of Object.values(MAPS)) {
      for (const b of map.buildings) {
        expect(tileAt(map.id, b.door[0], b.door[1]), b.id).toBe("=");
        expect(buildingAtDoor(map.id, b.door[0], b.door[1]).id).toBe(b.id);
      }
    }
  });

  it("건물 본체와 표지판은 걸을 수 없다", () => {
    for (const map of Object.values(MAPS)) {
      for (const b of map.buildings) expect(walkable(map.id, b.x, b.y, none), b.id).toBe(false);
      for (const s of map.signs) expect(walkable(map.id, s.x, s.y, none), s.id).toBe(false);
    }
  });

  it("입구(warp)는 서로 짝이 맞고 도착 칸은 걸을 수 있다", () => {
    for (const map of Object.values(MAPS)) {
      for (const w of map.warps) {
        expect(tileAt(map.id, w.x, w.y), `${map.id}→${w.to}`).toBe("W");
        expect(warpAt(map.id, w.x, w.y)).toBe(w);
        const back = MAPS[w.to].warps.find((b) => b.to === map.id);
        expect(back, `${w.to}→${map.id}`).toBeDefined();
        expect(walkable(w.to, w.tx, w.ty, { trust: 99, badges: LEAGUE_BADGES })).toBe(true);
        expect(Math.abs(back.x - w.tx) + Math.abs(back.y - w.ty)).toBe(1);
      }
    }
  });
});

describe("마을 길 찾기", () => {
  it("경비가 길을 막고 있으면 동쪽 풀숲과 작업장에 갈 수 없다", () => {
    const before = reachable(TOWN, START, none);
    expect(before.has("25,4")).toBe(false);
    expect(before.has("20,12")).toBe(false);
    expect(before.has("4,4")).toBe(true);
    expect(before.has("11,4")).toBe(true);
    expect(before.has("3,13")).toBe(true);
    expect(before.has("10,13")).toBe(true);
  });

  it("신뢰가 쌓이면 경비가 비켜 주어 모든 건물과 풀숲에 닿는다", () => {
    const after = reachable(TOWN, START, { trust: GATE_TRUST, badges: [] });
    for (const b of MAPS[TOWN].buildings) expect(after.has(`${b.door[0]},${b.door[1]}`), b.id).toBe(true);
    expect(after.has("20,12")).toBe(true);
    expect(after.has("18,4")).toBe(true);
  });

  it("모든 NPC와 표지판 앞에 서서 말을 걸 수 있다", () => {
    const progress = { trust: 30, badges: ["town"] };
    const after = reachable(TOWN, START, progress);
    for (const target of [...npcsFor(TOWN, progress), ...MAPS[TOWN].signs]) expect(nextTo(after, target), target.id).toBe(true);
  });

  it("경비를 만나기 전 길의 NPC 중 막히는 칸이 길을 끊지 않는다(민수, 이 대리 등은 길가에 선다)", () => {
    const before = reachable(TOWN, START, none);
    for (const id of ["minsu", "daeri", "zepi"]) {
      const npc = npcsFor(TOWN, none).find((n) => n.id === id);
      expect(nextTo(before, npc), id).toBe(true);
    }
  });
});

describe("마주 보기", () => {
  it("앞 칸의 NPC나 표지판을 찾는다", () => {
    expect(facing(TOWN, 8, 9, "up", none).target.id).toBe("zepi");
    expect(facing(TOWN, 7, 9, "up", none).type).toBe("sign");
    expect(facing(TOWN, 7, 9, "down", none)).toBeNull();
    expect(facing(FOREST, 1, 9, "up", none).type).toBe("sign");
  });

  it("경비는 신뢰가 쌓이면 길을 비킨다", () => {
    expect(npcsFor(TOWN, none).find((n) => n.id === "guard")).toMatchObject({ x: 15, y: 9 });
    expect(npcsFor(TOWN, { trust: GATE_TRUST, badges: [] }).find((n) => n.id === "guard").x).toBeLessThan(15);
  });

  it("progressOf는 신뢰와 뱃지만 뽑고, 뱃지가 없으면 빈 배열이다", () => {
    expect(progressOf({ trust: 4, badges: ["town"], coins: 9 })).toEqual({ trust: 4, badges: ["town"] });
    expect(progressOf({ trust: 4 })).toEqual({ trust: 4, badges: [] });
  });
});

describe("레거시 숲", () => {
  const warpIn = { x: 1, y: 9 };

  it("숲지기가 길을 막고 있는 동안은 숲 입구(29,9)에 갈 수 없고, 마을 뱃지가 있으면 비켜 준다", () => {
    const closed = reachable(TOWN, START, { trust: 30, badges: [] });
    expect(closed.has("29,9")).toBe(false);
    expect(npcsFor(TOWN, none).find((n) => n.id === "keeper")).toMatchObject({ x: 28, y: 9 });
    const open = reachable(TOWN, START, { trust: GATE_TRUST, badges: ["town"] });
    expect(open.has("29,9")).toBe(true);
    expect(npcsFor(TOWN, { trust: 0, badges: ["town"] }).find((n) => n.id === "keeper").y).toBe(8);
  });

  it("숲에서 야영지·옛 서고·오두막 입구와 모든 NPC·표지판·짙은 풀숲에 닿는다", () => {
    const seen = reachable(FOREST, warpIn, none);
    for (const b of MAPS[FOREST].buildings) expect(seen.has(`${b.door[0]},${b.door[1]}`), b.id).toBe(true);
    for (const target of [...npcsFor(FOREST, none), ...MAPS[FOREST].signs]) expect(nextTo(seen, target), target.id).toBe(true);
    const deep = MAPS[FOREST].terrain.flatMap((row, y) => [...row].map((ch, x) => (ch === "f" ? `${x},${y}` : null))).filter(Boolean);
    expect(deep.length).toBeGreaterThan(10);
    expect(deep.every((key) => seen.has(key))).toBe(true);
    expect(seen.has("0,9")).toBe(true);
  });

  it("짙은 풀숲(f)은 숲에만, 마을 풀숲(,)은 마을에만 있다", () => {
    const has = (id, ch) => MAPS[id].terrain.some((row) => row.includes(ch));
    expect(has(FOREST, "f")).toBe(true);
    expect(has(FOREST, ",")).toBe(false);
    expect(has(TOWN, "f")).toBe(false);
    expect(has(TOWN, ",")).toBe(true);
    expect(MAPS[FOREST].encounter).toBe("f");
    expect(MAPS[TOWN].encounter).toBe(",");
  });
});

describe("토큰 항구와 서버 동굴", () => {
  it("항구 문지기는 합격 뱃지가 있어야 남쪽 길을 비킨다", () => {
    const closed = reachable(TOWN, START, { trust: 30, badges: [] });
    expect(closed.has("7,19")).toBe(false);
    expect(npcsFor(TOWN, none).find((n) => n.id === "dockhand")).toMatchObject({ x: 7, y: 18 });
    const open = reachable(TOWN, START, { trust: GATE_TRUST, badges: ["town"] });
    expect(open.has("7,19")).toBe(true);
    expect(npcsFor(TOWN, { trust: 0, badges: ["town"] }).find((n) => n.id === "dockhand").x).toBe(8);
  });

  it("서버실 파수꾼은 근거 뱃지가 있어야 숲 북쪽 길을 비킨다", () => {
    const warpIn = { x: 1, y: 9 };
    expect(reachable(FOREST, warpIn, { trust: 30, badges: ["town"] }).has("27,0")).toBe(false);
    expect(reachable(FOREST, warpIn, { trust: 30, badges: ["town", "forest"] }).has("27,0")).toBe(true);
  });

  it("항구에서 건물 문, NPC, 표지판, 짙은 상자 칸에 모두 닿는다", () => {
    const seen = reachable("harbor", { x: 7, y: 1 }, none);
    for (const b of MAPS.harbor.buildings) expect(seen.has(`${b.door[0]},${b.door[1]}`), b.id).toBe(true);
    for (const target of [...npcsFor("harbor", none), ...MAPS.harbor.signs]) expect(nextTo(seen, target), target.id).toBe(true);
    const crates = MAPS.harbor.terrain.flatMap((row, y) => [...row].map((ch, x) => (ch === "b" ? `${x},${y}` : null))).filter(Boolean);
    expect(crates.length).toBeGreaterThan(10);
    expect(crates.every((key) => seen.has(key))).toBe(true);
    expect(seen.has("7,0")).toBe(true);
    expect(MAPS.harbor.encounter).toBe("b");
  });

  it("동굴은 어둡고 건물 문, NPC, 표지판, 케이블 바닥에 모두 닿는다", () => {
    expect(MAPS.cave.dark).toBe(true);
    for (const id of [TOWN, FOREST, "harbor"]) expect(MAPS[id].dark).toBeUndefined();
    const seen = reachable("cave", { x: 14, y: 18 }, none);
    for (const b of MAPS.cave.buildings) expect(seen.has(`${b.door[0]},${b.door[1]}`), b.id).toBe(true);
    for (const target of [...npcsFor("cave", none), ...MAPS.cave.signs]) expect(nextTo(seen, target), target.id).toBe(true);
    const cables = MAPS.cave.terrain.flatMap((row, y) => [...row].map((ch, x) => (ch === "c" ? `${x},${y}` : null))).filter(Boolean);
    expect(cables.length).toBeGreaterThan(10);
    expect(cables.every((key) => seen.has(key))).toBe(true);
    expect(seen.has("14,19")).toBe(true);
    expect(MAPS.cave.encounter).toBe("c");
  });

  it("지도마다 곡이 있고 체육관 문 앞 칸은 길이다", () => {
    for (const map of Object.values(MAPS)) {
      expect(map.track, map.id).toBeTruthy();
      const gym = map.buildings.find((b) => b.facility === "gym");
      expect(tileAt(map.id, gym.door[0], gym.door[1] + 1), map.id).toBe("=");
    }
  });
});

describe("챔피언 리그", () => {
  it("리그 접수원은 뱃지 네 개가 모두 있어야 길을 비킨다", () => {
    const three = { trust: 40, badges: ["town", "forest", "harbor"] };
    expect(reachable(TOWN, START, three).has("20,0")).toBe(false);
    expect(npcsFor(TOWN, three).find((n) => n.id === "clerk")).toMatchObject({ x: 20, y: 1 });
    const all = { trust: 40, badges: LEAGUE_BADGES };
    expect(reachable(TOWN, START, all).has("20,0")).toBe(true);
    expect(npcsFor(TOWN, all).find((n) => n.id === "clerk").x).toBe(19);
  });

  it("리그 홀에는 NPC가 없다", () => {
    expect(npcsFor("league", none)).toEqual([]);
  });

  it("리그 홀에서 건물 문, 표지판에 닿고 의뢰가 나오는 칸은 없다", () => {
    const seen = reachable("league", { x: 10, y: 10 }, none);
    for (const b of MAPS.league.buildings) expect(seen.has(`${b.door[0]},${b.door[1]}`), b.id).toBe(true);
    for (const target of MAPS.league.signs) expect(nextTo(seen, target), target.id).toBe(true);
    expect(seen.has("10,11")).toBe(true);
    expect(MAPS.league.terrain.some((row) => row.includes(MAPS.league.encounter))).toBe(false);
  });
});
