import { makeRng } from "../_shared/rng.js";

/**
 * 세계 권역 14곳. pop는 사용자 수, net는 인터넷 보급, power는 전력 안정, wealth는 컴퓨팅 자원,
 * reg는 규제 강도(0~1)이고, x와 y는 지도(100 x 56) 위 좌표다.
 */
export const REGIONS = [
  { id: "na-w", name: "북미 서부", x: 17, y: 20, pop: 0.5, net: 0.9, power: 0.9, wealth: 0.95, reg: 0.6 },
  { id: "na-e", name: "북미 동부", x: 28, y: 21, pop: 0.6, net: 0.9, power: 0.9, wealth: 0.9, reg: 0.6 },
  { id: "la", name: "중남미", x: 31, y: 40, pop: 0.6, net: 0.6, power: 0.6, wealth: 0.45, reg: 0.3 },
  { id: "eu-w", name: "서유럽", x: 46, y: 19, pop: 0.6, net: 0.9, power: 0.9, wealth: 0.85, reg: 0.95 },
  { id: "eu-e", name: "동유럽", x: 56, y: 17, pop: 0.4, net: 0.7, power: 0.7, wealth: 0.5, reg: 0.5 },
  { id: "me", name: "중동", x: 59, y: 30, pop: 0.4, net: 0.6, power: 0.85, wealth: 0.7, reg: 0.5 },
  { id: "af-n", name: "북아프리카", x: 48, y: 31, pop: 0.3, net: 0.45, power: 0.6, wealth: 0.3, reg: 0.3 },
  { id: "af-s", name: "사하라 이남", x: 52, y: 45, pop: 0.6, net: 0.25, power: 0.3, wealth: 0.15, reg: 0.2 },
  { id: "ca", name: "중앙아시아", x: 68, y: 22, pop: 0.3, net: 0.4, power: 0.6, wealth: 0.3, reg: 0.6 },
  { id: "sa", name: "남아시아", x: 70, y: 35, pop: 1, net: 0.5, power: 0.5, wealth: 0.35, reg: 0.4 },
  { id: "ea", name: "동아시아", x: 83, y: 24, pop: 1, net: 0.9, power: 0.85, wealth: 0.9, reg: 0.9 },
  { id: "sea", name: "동남아", x: 82, y: 39, pop: 0.7, net: 0.6, power: 0.6, wealth: 0.5, reg: 0.35 },
  { id: "oc", name: "오세아니아", x: 90, y: 49, pop: 0.2, net: 0.85, power: 0.8, wealth: 0.7, reg: 0.6 },
  { id: "no", name: "북아시아", x: 74, y: 10, pop: 0.3, net: 0.6, power: 0.8, wealth: 0.45, reg: 0.8 },
];

const BASE_LINKS = [
  ["na-w", "na-e", "land", 0.9],
  ["na-e", "la", "land", 0.5],
  ["eu-w", "eu-e", "land", 0.8],
  ["eu-e", "ca", "land", 0.5],
  ["eu-e", "me", "land", 0.5],
  ["eu-e", "no", "land", 0.5],
  ["me", "af-n", "land", 0.5],
  ["me", "ca", "land", 0.5],
  ["me", "sa", "land", 0.5],
  ["af-n", "af-s", "land", 0.35],
  ["ca", "sa", "land", 0.4],
  ["ca", "ea", "land", 0.5],
  ["ca", "no", "land", 0.4],
  ["no", "ea", "land", 0.4],
  ["sa", "sea", "land", 0.5],
  ["ea", "sea", "land", 0.6],
  ["na-e", "eu-w", "cable", 0.95],
  ["na-w", "ea", "cable", 0.9],
  ["na-w", "oc", "cable", 0.5],
  ["la", "eu-w", "cable", 0.4],
  ["la", "af-s", "cable", 0.25],
  ["af-s", "eu-w", "cable", 0.4],
  ["af-n", "eu-w", "cable", 0.6],
  ["me", "eu-w", "cable", 0.5],
  ["me", "sa", "cable", 0.6],
  ["af-s", "sa", "cable", 0.35],
  ["sa", "sea", "cable", 0.6],
  ["sea", "oc", "cable", 0.6],
  ["ea", "oc", "cable", 0.4],
];

export const LINK_TYPES = {
  land: "육상 광케이블",
  cable: "해저 케이블",
  cloud: "클라우드 리전 동기화",
  sat: "위성 인터넷",
};

const HUB_WEALTH = 0.7;
const SAT_NET = 0.5;

/**
 * 시드로 조금씩 달라진 세계를 만든다. 권역 수치는 ±0.08, 연결 용량은 ±0.1 안에서 흔들린다.
 * 클라우드 연결은 부유한 권역끼리, 위성 연결은 인터넷이 약한 권역을 향해 자동으로 생긴다.
 *
 * @param seed 정수 시드
 * @returns { regions, links } links는 { a, b, type, cap } 목록(a, b는 권역 번호)
 */
export function makeWorld(seed) {
  const random = makeRng(seed);
  const shake = (value, width) => Math.max(0.05, Math.min(1, Math.round((value + (random() * 2 - 1) * width) * 100) / 100));
  const regions = REGIONS.map((region) => ({
    ...region,
    pop: shake(region.pop, 0.08),
    net: shake(region.net, 0.08),
    power: shake(region.power, 0.08),
    wealth: shake(region.wealth, 0.08),
    reg: shake(region.reg, 0.08),
  }));
  const at = (id) => regions.findIndex((region) => region.id === id);
  const links = BASE_LINKS.map(([a, b, type, cap]) => ({ a: at(a), b: at(b), type, cap: shake(cap, 0.1) }));
  for (let a = 0; a < regions.length; a += 1) {
    for (let b = a + 1; b < regions.length; b += 1) {
      if (regions[a].wealth >= HUB_WEALTH && regions[b].wealth >= HUB_WEALTH) links.push({ a, b, type: "cloud", cap: 0.6 });
      if (Math.min(regions[a].net, regions[b].net) < SAT_NET) links.push({ a, b, type: "sat", cap: 0.1 });
    }
  }
  return { regions, links };
}