import { siteList } from "./campus.js";
import { KINDS } from "./engine.js";
import { SITE_IDS, traitOf } from "./sites.js";

export const BADGES = [
  { id: "coin1k", name: "작은 시작", text: "누적 수익 1,000 코인", test: (s) => s.lifetime >= 1000 },
  { id: "coin100k", name: "동네 센터장", text: "누적 수익 10만 코인", test: (s) => s.lifetime >= 100000 },
  { id: "coin10m", name: "클라우드 사업가", text: "누적 수익 1,000만 코인", test: (s) => s.lifetime >= 1e7 },
  { id: "coin1b", name: "데이터 제국", text: "누적 수익 10억 코인", test: (s) => s.lifetime >= 1e9 },
  { id: "rack4", name: "하이퍼스케일", text: "하이퍼스케일 랙 설치", test: (s, c) => c.topServer >= 4 },
  { id: "servers30", name: "서버 농장", text: "서버를 모두 합쳐 30대 운영", test: (s, c) => c.servers >= 30 },
  { id: "fire5", name: "소방관", text: "서버를 하나도 잃지 않고 화재 5번 진압", test: (s) => s.stats.saved >= 5 },
  { id: "survivor", name: "재난 생존자", text: "트래픽 폭주, 정전, 화재를 모두 겪기", test: (s) => s.stats.surge > 0 && s.stats.blackout > 0 && s.stats.fire > 0 },
  { id: "veteran", name: "재난 베테랑", text: "재난을 모두 합쳐 20번 겪기", test: (s) => s.stats.surge + s.stats.blackout + s.stats.fire >= 20 },
  { id: "sites3", name: "건물주", text: "건물 3개 보유", test: (s) => s.sites.length >= 3 },
  { id: "sites5", name: "캠퍼스 총괄", text: "건물 5개 모두 보유", test: (s) => s.sites.length >= 5 },
  { id: "links3", name: "네트워크 건축가", text: "건물 연결 3개", test: (s) => s.links.length >= 3 },
  { id: "hard1m", name: "위험을 즐기는 사람", text: "위험 난이도로 누적 수익 100만 코인", test: (s) => s.difficulty === "hard" && s.lifetime >= 1e6 },
];
export const BADGE_IDS = new Set(BADGES.map((badge) => badge.id));

/**
 * 도감에 실을 수 있는 항목의 키를 모두 만든다. 시설은 "종류:단계", 건물은 "site:종류"이다.
 *
 * @returns 키 배열
 */
export function partKeys() {
  const keys = [];
  for (const [kind, info] of Object.entries(KINDS)) for (let level = 1; level < info.levels.length; level += 1) keys.push(`${kind}:${level}`);
  for (const type of SITE_IDS) keys.push(`site:${type}`);
  return keys;
}
export const PART_KEYS = new Set(partKeys());

/**
 * 도감 키의 이름을 구한다.
 *
 * @param key 도감 키
 * @returns 이름
 */
export function partName(key) {
  const [kind, rest] = key.split(":");
  return kind === "site" ? traitOf(rest).name : KINDS[kind].levels[Number(rest)].name;
}

/**
 * 도감에서 시설 한 단계의 대표 수치를 한 줄로 적는다.
 *
 * @param kind 시설 종류
 * @param level 단계
 * @returns 짧은 설명
 */
export function partNote(kind, level) {
  const spec = KINDS[kind].levels[level];
  if (kind === "server") return `수익 ${spec.output}, 열 ${spec.heat}`;
  if (kind === "cooler") return `냉각 ${spec.cool}, 범위 ${spec.reach}`;
  if (kind === "hub") return `대역폭 ${spec.cap}, 범위 ${spec.reach}`;
  if (kind === "gen") return `발전 +${spec.cap}, 열 ${spec.heat}`;
  if (kind === "battery") return `비상 전력 +${spec.cap}`;
  return `진화 범위 ${spec.reach}`;
}

/**
 * 도감과 업적을 새로 얻은 것이 있는지 살펴 반영한다. 건물마다 놓인 시설과 건물 종류가 도감에, 조건을 채운 업적이 업적에 들어간다.
 *
 * @param state 게임 상태
 * @returns { state, fresh } fresh는 이번에 새로 얻은 항목의 이름 목록, 없으면 state 그대로
 */
export function collect(state) {
  const codex = new Set(state.codex);
  const fresh = [];
  let servers = 0;
  let topServer = 0;
  for (const site of siteList(state)) {
    codex.add(`site:${site.type}`);
    for (const cell of site.cells) {
      if (!cell) continue;
      codex.add(`${cell.kind}:${cell.level}`);
      if (cell.kind === "server") {
        servers += 1;
        topServer = Math.max(topServer, cell.level);
      }
    }
  }
  const added = [...codex].filter((key) => !state.codex.includes(key));
  for (const key of added) fresh.push(`도감 ${partName(key)}`);
  const badges = [...state.badges];
  const context = { servers, topServer };
  for (const badge of BADGES) {
    if (badges.includes(badge.id) || !badge.test(state, context)) continue;
    badges.push(badge.id);
    fresh.push(`업적 ${badge.name}`);
  }
  if (!fresh.length) return { state, fresh };
  return { state: { ...state, codex: [...state.codex, ...added], badges }, fresh };
}

/**
 * HUD에 보일 칭호를 고른다. 얻은 업적의 이름만 쓸 수 있고, null이면 칭호를 내린다.
 *
 * @param state 게임 상태
 * @param id 업적 id 또는 null
 * @returns { state, error }
 */
export function setTitle(state, id) {
  if (id !== null && !state.badges.includes(id)) return { state, error: "얻지 못한 업적이에요." };
  return { state: { ...state, title: id } };
}