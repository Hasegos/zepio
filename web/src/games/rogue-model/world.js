import { makeRng } from "../_shared/rng.js";

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 454;

/**
 * 경도와 위도를 지도 좌표(1000 x 454)로 바꾼다.
 *
 * @param lon 경도
 * @param lat 위도
 * @returns [x, y]
 */
export function project(lon, lat) {
  return [Math.round(((lon + 180) * MAP_WIDTH) / 360), Math.round((84 - lat) * 3.2)];
}

const SPEC = [
  ["us", "미국", -97, 38, 0.6, 0.92, 0.9, 1, 0.55],
  ["ca", "캐나다", -100, 55, 0.15, 0.9, 0.9, 0.8, 0.65],
  ["mx", "중미", -101, 22, 0.5, 0.6, 0.65, 0.4, 0.3],
  ["br", "브라질", -52, -11, 0.6, 0.7, 0.75, 0.45, 0.4],
  ["an", "안데스", -73, 0, 0.5, 0.55, 0.6, 0.3, 0.3],
  ["sc", "남미 남부", -65, -35, 0.25, 0.65, 0.7, 0.4, 0.35],
  ["uk", "영국", -2, 54, 0.2, 0.95, 0.95, 0.85, 0.8],
  ["we", "서유럽", 6, 48, 0.45, 0.92, 0.92, 0.9, 0.95],
  ["so", "남유럽", 5, 42, 0.35, 0.85, 0.85, 0.7, 0.85],
  ["no", "북유럽", 15, 62, 0.15, 0.95, 0.95, 0.85, 0.85],
  ["ee", "동유럽", 28, 50, 0.4, 0.75, 0.75, 0.5, 0.55],
  ["ru", "러시아", 60, 58, 0.35, 0.75, 0.8, 0.5, 0.8],
  ["me", "중동", 46, 27, 0.5, 0.65, 0.8, 0.65, 0.5],
  ["na", "북아프리카", 12, 28, 0.45, 0.5, 0.65, 0.3, 0.35],
  ["wa", "서아프리카", -2, 10, 0.7, 0.25, 0.3, 0.15, 0.2],
  ["ea", "동아프리카", 38, 3, 0.6, 0.25, 0.3, 0.15, 0.25],
  ["sf", "남부 아프리카", 24, -18, 0.45, 0.35, 0.4, 0.2, 0.3],
  ["cas", "중앙아시아", 66, 44, 0.35, 0.45, 0.6, 0.3, 0.6],
  ["sas", "남아시아", 78, 23, 1, 0.5, 0.55, 0.35, 0.4],
  ["cn", "중국", 105, 34, 1, 0.85, 0.9, 0.9, 0.9],
  ["ne", "한일", 133, 36, 0.35, 0.95, 0.95, 0.9, 0.75],
  ["sea", "동남아", 105, 12, 0.7, 0.6, 0.6, 0.5, 0.35],
  ["oc", "오세아니아", 134, -25, 0.15, 0.85, 0.85, 0.7, 0.6],
];

/**
 * 세계 권역 23곳. pop는 사용자 수, net는 인터넷 보급, power는 전력 안정, wealth는 컴퓨팅 자원,
 * reg는 규제 강도(0~1)이고, x와 y는 지도(1000 x 454) 위 좌표다.
 */
export const REGIONS = SPEC.map(([id, name, lon, lat, pop, net, power, wealth, reg]) => {
  const [x, y] = project(lon, lat);
  return { id, name, x, y, pop, net, power, wealth, reg };
});

const BASE_LINKS = [
  ["us", "ca", "land", 0.9],
  ["us", "mx", "land", 0.8],
  ["mx", "an", "land", 0.4],
  ["an", "br", "land", 0.6],
  ["an", "sc", "land", 0.4],
  ["br", "sc", "land", 0.6],
  ["uk", "we", "land", 0.7],
  ["we", "so", "land", 0.8],
  ["we", "no", "land", 0.6],
  ["we", "ee", "land", 0.8],
  ["no", "ee", "land", 0.5],
  ["no", "ru", "land", 0.5],
  ["ee", "ru", "land", 0.7],
  ["ee", "so", "land", 0.5],
  ["ee", "me", "land", 0.5],
  ["ru", "cas", "land", 0.6],
  ["ru", "cn", "land", 0.5],
  ["ru", "ne", "land", 0.3],
  ["me", "na", "land", 0.5],
  ["me", "cas", "land", 0.4],
  ["me", "sas", "land", 0.4],
  ["na", "wa", "land", 0.35],
  ["na", "ea", "land", 0.35],
  ["wa", "ea", "land", 0.3],
  ["wa", "sf", "land", 0.3],
  ["ea", "sf", "land", 0.45],
  ["cas", "cn", "land", 0.5],
  ["cas", "sas", "land", 0.4],
  ["sas", "cn", "land", 0.4],
  ["sas", "sea", "land", 0.5],
  ["cn", "sea", "land", 0.6],
  ["cn", "ne", "land", 0.6],
  ["us", "uk", "cable", 0.95],
  ["us", "so", "cable", 0.6],
  ["ca", "uk", "cable", 0.5],
  ["us", "an", "cable", 0.4],
  ["br", "so", "cable", 0.5],
  ["br", "wa", "cable", 0.4],
  ["sc", "sf", "cable", 0.3],
  ["uk", "no", "cable", 0.5],
  ["so", "na", "cable", 0.6],
  ["so", "me", "cable", 0.5],
  ["so", "wa", "cable", 0.4],
  ["uk", "wa", "cable", 0.3],
  ["me", "ea", "cable", 0.5],
  ["me", "sas", "cable", 0.7],
  ["me", "sea", "cable", 0.5],
  ["ea", "sas", "cable", 0.5],
  ["sf", "sas", "cable", 0.3],
  ["sas", "sea", "cable", 0.7],
  ["sea", "cn", "cable", 0.6],
  ["sea", "ne", "cable", 0.6],
  ["sea", "oc", "cable", 0.6],
  ["cn", "ne", "cable", 0.6],
  ["ne", "oc", "cable", 0.4],
  ["us", "ne", "cable", 0.95],
  ["us", "cn", "cable", 0.5],
  ["us", "sea", "cable", 0.5],
  ["us", "oc", "cable", 0.5],
  ["ca", "ne", "cable", 0.4],
];

export const LINK_TYPES = {
  land: "육상 광케이블",
  cable: "해저 케이블",
  cloud: "클라우드 리전 동기화",
  sat: "위성 인터넷",
};

const HUB_WEALTH = 0.75;
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