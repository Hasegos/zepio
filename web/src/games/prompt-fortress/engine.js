export const TAGS = {
  "src:user": "사용자가 직접 보낸 말",
  "src:doc": "첨부 문서",
  "src:tool": "도구가 가져온 결과",
  asksSecret: "비밀을 묻는 말",
  partialSecret: "비밀을 조금씩 캐묻는 말",
  roleplay: "역할극을 시키는 말",
  override: "이전 규칙을 무시하라는 말",
  encoded: "인코딩된 글",
  claimsAdmin: "관리자를 자처하는 말",
  fakeSystem: "시스템 알림인 척하는 글",
  hidden: "숨은 지시가 섞인 글",
  owner: "본인 확인이 끝난 사용자",
};

export const ACTIONS = {
  refuse: "거절한다",
  ignore: "지시로 따르지 않는다",
  mask: "답하되 비밀은 가린다",
  allow: "그대로 통과시킨다",
};

/**
 * 규칙 카드를 만든다.
 *
 * @param tag 조건이 되는 메시지 태그
 * @param action 맞을 때 하는 행동
 * @returns { id, tag, action }
 */
export function cardOf(tag, action) {
  return { id: `${action}:${tag}`, tag, action };
}

/**
 * 규칙 카드를 문장으로 바꾼다.
 *
 * @param card 규칙 카드
 * @returns "조건 → 행동" 문장
 */
export function cardText(card) {
  return `${TAGS[card.tag]} → ${ACTIONS[card.action]}`;
}

/**
 * 메시지가 가진 모든 태그를 구한다. 출처가 태그 하나로 들어간다.
 *
 * @param message 메시지
 * @returns 태그 목록
 */
function tagsOf(message) {
  return [`src:${message.from}`, ...message.tags];
}

/**
 * 규칙을 위에서 아래로 훑어 처음 맞는 행동을 찾는다. 맞는 규칙이 없으면 볼트는 순진하게 따른다("follow").
 *
 * @param message 메시지
 * @param rules 위에서 아래 순서의 규칙 카드 목록
 * @returns 행동 이름
 */
function actionFor(message, rules) {
  const tags = tagsOf(message);
  return rules.find((card) => tags.includes(card.tag))?.action ?? "follow";
}

/**
 * 행동이 메시지에 어떤 결과를 내는지 구한다.
 * refuse는 아무것도 하지 않는다. ignore는 문서·도구 글을 데이터로만 읽고(처리는 한다) 사용자 말은 아예 받지 않는다.
 * mask는 지시를 따르되 비밀을 가리고, allow와 follow는 그대로 따른다.
 *
 * @param action 행동 이름
 * @param message 메시지
 * @returns { served, leaks, runs } 응답했는지, 비밀이 나갔는지, 지시가 실행됐는지
 */
function effectOf(action, message) {
  switch (action) {
    case "refuse":
      return { served: false, leaks: false, runs: false };
    case "ignore":
      return { served: message.from !== "user", leaks: false, runs: false };
    case "mask":
      return { served: true, leaks: false, runs: true };
    default:
      return { served: true, leaks: true, runs: true };
  }
}

/**
 * 메시지 하나를 판정한다. 공격은 목적(비밀 유출, 지시 실행)이 이뤄지면 실패, 정상 요청은 응답을 못 받으면 실패다.
 *
 * @param message 메시지
 * @param rules 규칙 카드 목록
 * @returns { id, action, ok, fail } fail은 "leak", "hijack", "blocked", "masked" 중 하나이고 성공이면 null
 */
function judge(message, rules) {
  const action = actionFor(message, rules);
  const effect = effectOf(action, message);
  let fail = null;
  if (message.attack === "leak" && effect.leaks) fail = "leak";
  else if (message.attack === "hijack" && effect.runs) fail = "hijack";
  else if (!message.attack && !effect.served) fail = "blocked";
  else if (!message.attack && message.needsSecret && !effect.leaks) fail = "masked";
  return { id: message.id, action, ok: fail === null, fail };
}

/**
 * 규칙으로 한 방 전체를 돌려 본다. 별은 공격을 모두 막으면 1, 정상 요청도 모두 통과하면 2, 거기에 규칙이 par 이하면 3이다.
 *
 * @param level 레벨
 * @param rules 규칙 카드 목록
 * @returns { results, defended, served, stars }
 */
export function runLevel(level, rules) {
  const results = level.messages.map((message) => judge(message, rules));
  const byId = new Map(level.messages.map((message) => [message.id, message]));
  const defended = results.every((r) => !byId.get(r.id).attack || r.ok);
  const served = results.every((r) => byId.get(r.id).attack || r.ok);
  const stars = !defended ? 0 : !served ? 1 : rules.length <= level.par ? 3 : 2;
  return { results, defended, served, stars };
}
