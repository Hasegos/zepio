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