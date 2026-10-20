import { CELLS, LAND, ROCK, SIZE, WATER } from "./rules.js";
import { hashSeed, makeRng, shuffle } from "../_shared/rng.js";

export const REROLLS = 2;
export const DEMOLISH = 2;

const GLYPHS = { ".": LAND, "~": WATER, "#": ROCK };

export const ISLANDS = [
  {
    id: "sprout",
    name: "새싹섬",
    tip: "집 옆에 공원, 농장 옆에 풍차를 놓아 보세요.",
    mask: ["~~~~~~~~", "~~....~~", "~......~", "~......~", "~......~", "~......~", "~~....~~", "~~~~~~~~"],
    pool: { house: 8, farm: 5, windmill: 2, park: 6, shop: 4, forest: 4 },
    stars: [121, 161, 174],
  },
  {
    id: "shell",
    name: "조개섬",
    tip: "바다를 낀 칸에 등대와 부두가 빛나요.",
    mask: ["~~~~~~~~", "~.....~~", "~......~", "~......~", "~.....~~", "~~....~~", "~~~...~~", "~~~~~~~~"],
    pool: { house: 6, shop: 4, park: 4, lighthouse: 3, dock: 3, farm: 2, windmill: 1, forest: 2, school: 1 },
    stars: [84, 112, 121],
  },
  {
    id: "ring",
    name: "고리섬",
    tip: "가운데 호수가 모든 물가를 만들어 줘요.",
    mask: ["~~~~~~~~", "~......~", "~......~", "~..~~..~", "~..~~..~", "~......~", "~......~", "~~~~~~~~"],
    pool: { house: 6, shop: 4, park: 5, lighthouse: 2, dock: 2, farm: 3, windmill: 1, forest: 3, school: 2, factory: 1 },
    stars: [96, 129, 139],
  },
  {
    id: "archipelago",
    name: "작은 군도",
    tip: "섬이 갈라져 있어 학교와 숲은 두 칸 안에서만 통해요.",
    mask: ["~~~~~~~~", "~...~~..", "~...~~..", "~...~~..", "~~~~~~~~", "..~~~...", "..~~~...", "..~~~..."],
    pool: { house: 6, shop: 5, school: 3, park: 4, dock: 2, forest: 2, farm: 2, windmill: 1, lighthouse: 1, factory: 1 },
    stars: [77, 103, 111],
  },
  {
    id: "industry",
    name: "굴뚝섬",
    tip: "공장은 점수가 크지만 이웃이 깎여요. 어디에 모을까요?",
    mask: ["~~~~~~~~", "~......~", "~......~", "~.##...~", "~...##.~", "~......~", "~......~", "~~~~~~~~"],
    pool: { factory: 6, house: 6, shop: 4, dock: 3, park: 4, farm: 2, windmill: 1, forest: 2, school: 1 },
    stars: [99, 132, 143],
  },
  {
    id: "grand",
    name: "큰섬",
    tip: "열 가지 건물이 모두 나와요. 한 판이 가장 길어요.",
    mask: ["~~....~~", "~......~", "..#.....", "........", ".....#..", "........", "~......~", "~~....~~"],
    pool: { house: 10, shop: 6, park: 7, farm: 5, windmill: 2, forest: 4, school: 4, lighthouse: 2, dock: 2, factory: 4 },
    stars: [164, 219, 236],
  },
];

/**
 * 가로 8칸 문자열 여덟 줄을 지형 배열로 바꾼다. . 땅, ~ 물, # 바위.
 *
 * @param mask 여덟 줄의 문자열
 * @returns 길이 64의 지형 배열
 */
export function parseMask(mask) {
  return mask.flatMap((row) => [...row].map((glyph) => GLYPHS[glyph] ?? WATER));
}

/**
 * 건물 개수표를 카드 목록으로 펼친다.
 *
 * @param pool { 건물 id: 장수 }
 * @returns 카드(건물 id) 목록
 */
export function expandPool(pool) {
  return Object.entries(pool).flatMap(([id, count]) => Array.from({ length: count }, () => id));
}

/**
 * 섬 정의를 게임이 쓰는 모양(지형 배열과 카드 수 포함)으로 만든다.
 *
 * @param base 섬 정의(id, name, tip, mask, pool, stars)
 * @returns 지형과 카드 수가 더해진 섬
 */
function build(base) {
  return { ...base, terrain: parseMask(base.mask), deckSize: expandPool(base.pool).length };
}

export const ISLAND_LIST = ISLANDS.map(build);

/**
 * 섬 id로 섬을 찾는다. daily:YYYY-MM-DD는 그날의 섬을 만든다.
 *
 * @param id 섬 id
 * @returns 섬, 없으면 null
 */
export function findIsland(id) {
  if (typeof id !== "string") return null;
  if (id.startsWith("daily:")) return /^\d{4}-\d{2}-\d{2}$/.test(id.slice(6)) ? dailyIsland(id.slice(6)) : null;
  return ISLAND_LIST.find((island) => island.id === id) ?? null;
}

const DAILY_POOL_SIZE = 30;
const DAILY_LAND = 36;
const DAILY_ROCKS = 3;
const DAILY_CORE = ["house", "house", "house", "park", "park", "shop", "shop"];
const DAILY_OPTIONAL = ["house", "park", "shop", "farm", "windmill", "forest", "school", "lighthouse", "dock", "factory"];

/**
 * 날짜로 오늘의 섬을 만든다. 같은 날짜는 모두에게 같은 섬과 같은 카드 순서가 된다.
 *
 * @param date YYYY-MM-DD
 * @returns 오늘의 섬(id는 daily:날짜)
 */
export function dailyIsland(date) {
  const rng = makeRng(hashSeed(`isle-daily-${date}`));
  const cx = 3.5 + (rng() - 0.5) * 1.5;
  const cy = 3.5 + (rng() - 0.5) * 1.5;
  const ranked = Array.from({ length: CELLS }, (_, i) => {
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    return { i, d: Math.hypot(x - cx, y - cy) + rng() * 1.6 };
  }).sort((a, b) => a.d - b.d);
  const terrain = Array(CELLS).fill(WATER);
  const land = ranked.slice(0, DAILY_LAND).map((cell) => cell.i);
  land.forEach((i) => {
    terrain[i] = LAND;
  });
  shuffle(land, rng)
    .slice(0, DAILY_ROCKS)
    .forEach((i) => {
      terrain[i] = ROCK;
    });
  const optional = shuffle(
    DAILY_OPTIONAL.flatMap((id) => [id, id, id]),
    rng,
  ).slice(0, DAILY_POOL_SIZE - DAILY_CORE.length);
  const pool = {};
  [...DAILY_CORE, ...optional].forEach((id) => {
    pool[id] = (pool[id] ?? 0) + 1;
  });
  while ((pool.windmill ?? 0) > (pool.farm ?? 0)) {
    pool.windmill -= 1;
    pool.house += 1;
    if (!pool.windmill) delete pool.windmill;
  }
  return {
    id: `daily:${date}`,
    name: "오늘의 섬",
    tip: "오늘 하루 모두가 같은 섬과 같은 카드를 받아요.",
    mask: [],
    pool,
    stars: null,
    terrain,
    deckSize: DAILY_POOL_SIZE,
    daily: true,
  };
}