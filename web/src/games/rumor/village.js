import { makeRng, shuffle } from "../_shared/rng.js";

export const VILLAGERS = 60;
export const CLUSTERS = 6;
const PER_CLUSTER = VILLAGERS / CLUSTERS;
const TYPE_COUNTS = { gossip: 12, plain: 24, skeptic: 12, secret: 8, hub: 4 };

export const TYPES = {
  gossip: { label: "수다쟁이", mark: "수", note: "한 번만 들어도 믿고, 가까운 이웃 셋에게 두 턴 동안 말해요", threshold: 1, active: 2, tells: 3 },
  plain: { label: "보통 사람", mark: "보", note: "한 번 들으면 믿고, 가장 가까운 이웃에게 두 턴 동안 말해요", threshold: 1, active: 2, tells: 1 },
  skeptic: { label: "의심쟁이", mark: "의", note: "서로 다른 두 사람에게 들어야 믿고, 믿으면 가장 가까운 이웃에게 말해요", threshold: 2, active: 2, tells: 1 },
  secret: { label: "입 무거운 사람", mark: "입", note: "한 번 들으면 믿지만 아무에게도 말하지 않아요", threshold: 1, active: 0, tells: 0 },
  hub: { label: "확성기", mark: "확", note: "이웃이 아주 많아서, 믿는 턴에 모두에게 한 번 말해요", threshold: 1, active: 1, tells: Infinity },
};
export const TYPE_IDS = Object.keys(TYPES);

export const KINDS = {
  fun: { label: "재미있는 소문", note: "수다쟁이와 확성기가 한 턴 더 말해요" },
  scary: { label: "무서운 소문", note: "의심쟁이도 한 번만 들으면 믿어요" },
  warm: { label: "따뜻한 소문", note: "입 무거운 사람도 한 턴 동안 가장 가까운 이웃에게 말해요" },
};
export const KIND_IDS = Object.keys(KINDS);

/**
 * 소문 종류에 따라 바뀐 사람 유형의 성질을 돌려준다.
 *
 * @param type 사람 유형 id
 * @param kind 소문 종류 id
 * @returns { threshold, active, tells } 믿는 데 필요한 출처 수, 말하는 턴 수, 한 턴에 말하는 이웃 수
 */
export function profileOf(type, kind) {
  const base = TYPES[type];
  const profile = { threshold: base.threshold, active: base.active, tells: base.tells };
  if (kind === "fun" && (type === "gossip" || type === "hub")) profile.active += 1;
  if (kind === "scary" && type === "skeptic") profile.threshold = 1;
  if (kind === "warm" && type === "secret") {
    profile.active = 1;
    profile.tells = 1;
  }
  return profile;
}

/**
 * 한 칸에 놓을 사람들의 유형 목록을 섞어 만든다.
 *
 * @param random 난수 함수
 * @returns 유형 id 목록(길이 VILLAGERS)
 */
function typeList(random) {
  const list = Object.entries(TYPE_COUNTS).flatMap(([type, count]) => Array(count).fill(type));
  return shuffle(list, random);
}

/**
 * 두 사람 사이에 친밀도 1~3짜리 연결을 더한다. 이미 있으면 그대로 둔다.
 *
 * @param edges 연결 지도(키 "작은번호-큰번호", 값 친밀도)
 * @param a 한 사람의 번호
 * @param b 다른 사람의 번호
 * @param random 난수 함수
 */
function link(edges, a, b, random) {
  if (a === b) return;
  const key = a < b ? `${a}-${b}` : `${b}-${a}`;
  if (!edges.has(key)) edges.set(key, 1 + Math.floor(random() * 3));
}

/**
 * 시드로 마을 하나를 만든다. 이웃끼리 모인 여섯 동네와 동네를 잇는 다리, 이웃이 많은 확성기가 있다.
 *
 * @param seed 정수 시드
 * @returns { types, edges, adj, pos, cluster } adj[i]는 가까운 순으로 정렬한 { to, w } 목록, pos[i]는 0~100 좌표
 */
export function makeVillage(seed) {
  const random = makeRng(seed);
  const types = typeList(random);
  const edges = new Map();
  const members = (cluster) => Array.from({ length: PER_CLUSTER }, (_, i) => cluster * PER_CLUSTER + i);
  for (let cluster = 0; cluster < CLUSTERS; cluster += 1) {
    const list = members(cluster);
    list.forEach((person, i) => {
      link(edges, person, list[(i + 1) % PER_CLUSTER], random);
      for (let j = i + 2; j < PER_CLUSTER; j += 1) if (random() < 0.28) link(edges, person, list[j], random);
    });
    const next = members((cluster + 1) % CLUSTERS);
    for (let bridge = 0; bridge < 2; bridge += 1) link(edges, list[Math.floor(random() * PER_CLUSTER)], next[Math.floor(random() * PER_CLUSTER)], random);
  }
  for (let extra = 0; extra < 3; extra += 1) link(edges, Math.floor(random() * VILLAGERS), Math.floor(random() * VILLAGERS), random);
  types.forEach((type, person) => {
    if (type !== "hub") return;
    for (let k = 0; k < 3; k += 1) link(edges, person, Math.floor(random() * VILLAGERS), random);
  });
  const adj = Array.from({ length: VILLAGERS }, () => []);
  for (const [key, w] of edges) {
    const [a, b] = key.split("-").map(Number);
    adj[a].push({ to: b, w });
    adj[b].push({ to: a, w });
  }
  for (const list of adj) list.sort((x, y) => y.w - x.w || x.to - y.to);
  const pos = [];
  for (let cluster = 0; cluster < CLUSTERS; cluster += 1) {
    const angle = (cluster / CLUSTERS) * Math.PI * 2 - Math.PI / 2;
    const cx = 50 + Math.cos(angle) * 34;
    const cy = 50 + Math.sin(angle) * 33;
    for (let i = 0; i < PER_CLUSTER; i += 1) {
      const turn = (i / PER_CLUSTER) * Math.PI * 2 + (random() - 0.5) * 0.06;
      const radius = 10.8 + random() * 0.5;
      pos.push([Math.round((cx + Math.cos(turn) * radius) * 10) / 10, Math.round((cy + Math.sin(turn) * radius) * 10) / 10]);
    }
  }
  return { types, edges: [...edges].map(([key, w]) => [...key.split("-").map(Number), w]), adj, pos, cluster: (person) => Math.floor(person / PER_CLUSTER) };
}