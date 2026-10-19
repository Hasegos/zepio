export const ITEMS = [
  {
    id: "plan",
    place: "library",
    kind: "스킬",
    name: "계획 모드",
    cost: 10,
    desc: "전투에서 '계획 세우기'를 쓴다. 큰 일은 계획을 세우면 진도가 빨라진다.",
  },
  {
    id: "grep",
    place: "library",
    kind: "스킬",
    name: "grep 검색",
    cost: 15,
    desc: "'파일 읽기'가 컨텍스트를 덜 먹고, 의뢰인을 기다리게 하지 않는다.",
  },
  {
    id: "readRule",
    place: "library",
    kind: "CLAUDE.md",
    name: "\"고치기 전에 먼저 읽어\"",
    cost: 8,
    desc: "모르는 곳을 그냥 고치려 하면 먼저 파일을 읽는다.",
  },
  {
    id: "askRule",
    place: "library",
    kind: "CLAUDE.md",
    name: "\"모호하면 먼저 물어봐\"",
    cost: 8,
    desc: "모호한 일을 그냥 고치려 하면 먼저 질문한다.",
  },
  {
    id: "guard",
    place: "forge",
    kind: "훅",
    name: "삭제 방지 훅",
    cost: 12,
    desc: "rm -rf 같은 위험한 수정을 실행 직전에 막는다.",
  },
  {
    id: "secret",
    place: "forge",
    kind: "훅",
    name: "비밀 보호 훅",
    cost: 12,
    desc: "문서에 숨은 지시로 키가 새 나가는 것을 막는다.",
  },
  {
    id: "lantern",
    place: "library",
    kind: "스킬",
    name: "랜턴",
    cost: 14,
    desc: "서버 동굴의 어둠 속에서 멀리까지 보인다. 전투에는 쓰지 않는다.",
  },
  {
    id: "cache",
    place: "market",
    kind: "스킬",
    name: "프롬프트 캐시",
    cost: 18,
    desc: "피크 시간대의 추가 사용량 요금을 없앤다. 토큰 항구의 의뢰에서 꼭 필요하다.",
  },
  {
    id: "mcpDocs",
    place: "forge",
    kind: "MCP",
    name: "문서 서버(MCP)",
    cost: 16,
    desc: "근거가 필요한 일에서 자료를 알아서 가져온다. 읽지 않고 써도 지어내지 않는다.",
  },
  {
    id: "mcpTicket",
    place: "forge",
    kind: "MCP",
    name: "이슈 서버(MCP)",
    cost: 16,
    desc: "모호한 의뢰의 요구사항을 이슈에서 알아서 찾아온다. 질문하지 않아도 되고 사용량도 들지 않는다.",
  },
  {
    id: "autotest",
    place: "forge",
    kind: "훅",
    name: "자동 테스트 훅",
    cost: 20,
    desc: "코드를 고칠 때마다 테스트가 자동으로 돈다(사용량과 컨텍스트를 조금 더 쓴다).",
  },
];

export const MEMBERS = {
  explorer: {
    id: "explorer",
    name: "제피",
    role: "탐색 에이전트",
    desc: "코드 위치를 찾아 오고 숨은 지시를 알아챈다.",
  },
  runner: {
    id: "runner",
    name: "민수",
    role: "실행 에이전트",
    desc: "별도 컨텍스트에서 일을 대신 처리하고 테스트까지 돌린다.",
  },
  reviewer: {
    id: "reviewer",
    name: "하은",
    role: "리뷰 에이전트",
    desc: "버그를 잡고, 위험하거나 수상한 점을 알려 준다.",
  },
};

export const MAX_SLOTS = 3;

/**
 * 슬롯에 끼우는 장비(CLAUDE.md 규칙과 훅)인지 알려 준다. 스킬은 슬롯 없이 항상 쓴다.
 *
 * @param id 물건 식별자
 * @returns 슬롯 장비이면 true
 */
export function isSlotItem(id) {
  const item = ITEMS.find((it) => it.id === id);
  return Boolean(item) && item.kind !== "스킬";
}

/**
 * 지금 끼워 둔 슬롯 장비를 구한다. 슬롯 정보가 없는 예전 저장은 산 순서대로 앞의 세 개를 끼운 것으로 본다.
 *
 * @param gear 가진 장비 { id: true }
 * @param slots 끼운 장비 식별자 목록, 없으면 undefined
 * @returns 끼운 장비 식별자 목록
 */
export function slotsOf(gear, slots) {
  if (Array.isArray(slots)) return slots;
  return Object.keys(gear)
    .filter((id) => gear[id] && isSlotItem(id))
    .slice(0, MAX_SLOTS);
}

/**
 * 전투에서 실제로 효과를 내는 장비를 구한다. 스킬은 가진 것 모두, 규칙과 훅은 끼운 것만이다.
 *
 * @param gear 가진 장비 { id: true }
 * @param slots 끼운 장비 식별자 목록
 * @returns 효과가 켜진 장비 { id: true }
 */
export function activeGear(gear, slots) {
  const on = new Set(slotsOf(gear, slots));
  return Object.fromEntries(Object.keys(gear).filter((id) => gear[id] && (!isSlotItem(id) || on.has(id))).map((id) => [id, true]));
}

/**
 * 슬롯 장비를 끼우거나 뺀다.
 *
 * @param gear 가진 장비
 * @param slots 끼운 장비 식별자 목록
 * @param id 물건 식별자
 * @returns { ok, slots, equipped, reason? } equipped는 끼웠으면 true, 뺐으면 false
 */
export function toggleSlot(gear, slots, id) {
  const now = slotsOf(gear, slots);
  if (!gear[id] || !isSlotItem(id)) return { ok: false, slots: now, reason: "끼울 수 없는 장비예요" };
  if (now.includes(id)) return { ok: true, slots: now.filter((s) => s !== id), equipped: false };
  if (now.length >= MAX_SLOTS) return { ok: false, slots: now, reason: `슬롯이 가득 찼어요(${MAX_SLOTS}칸). 하나를 먼저 빼세요` };
  return { ok: true, slots: [...now, id], equipped: true };
}

/**
 * 살 수 있는지 확인하고 새 장비와 코인을 돌려준다.
 *
 * @param gear 가진 장비 { id: true }
 * @param coins 코인
 * @param id 물건 식별자
 * @returns { ok, gear, coins, reason? }
 */
export function buy(gear, coins, id) {
  const item = ITEMS.find((it) => it.id === id);
  if (!item) return { ok: false, gear, coins, reason: "없는 물건이에요" };
  if (gear[id]) return { ok: false, gear, coins, reason: "이미 가지고 있어요" };
  if (coins < item.cost) return { ok: false, gear, coins, reason: "코인이 부족해요" };
  return { ok: true, gear: { ...gear, [id]: true }, coins: coins - item.cost };
}