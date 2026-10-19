import { MEMBERS } from "./party.js";

export const USAGE_CAP = 18;
export const CONTEXT_CAP = 10;
export const DISASTER_FINE = 10;

const drain = (task) => (task.urgent ? 2 : 1);

/**
 * 의뢰 한 건의 전투를 시작한다. 컨텍스트와 사용량은 이전 전투에서 이어받는다.
 *
 * @param task 의뢰 데이터
 * @param carry { context, usage }
 * @returns 전투 상태
 */
export function startBattle(task, carry = {}) {
  return {
    task,
    progress: 0,
    patience: task.patience,
    located: !task.locate,
    clarified: !task.ambiguous,
    planned: !task.big,
    safe: !task.danger,
    revealed: !task.injection,
    bugs: 0,
    rejects: 0,
    context: carry.context ?? 0,
    usage: carry.usage ?? 0,
    used: [],
    lines: [`${task.client}: "${task.text}"`],
    done: null,
  };
}

/**
 * 한 수를 쓰는 데 드는 사용량을 구한다(규칙과 훅이 자동으로 끼워 넣는 동작까지 포함).
 *
 * @param b 전투 상태
 * @param gear 가진 장비
 * @param id 기술 식별자
 * @returns 사용량
 */
export function usageCost(b, gear, id) {
  const t = b.task;
  switch (id) {
    case "edit":
      return (
        2 +
        (gear.readRule && t.locate && !b.located ? 1 : 0) +
        (gear.askRule && t.ambiguous && !b.clarified ? 1 : 0) +
        (gear.autotest ? 1 : 0)
      );
    case "summon":
      return 3;
    case "refuse":
      return 0;
    default:
      return 1;
  }
}

/**
 * 지금 고를 수 있는 기술 목록을 만든다.
 *
 * @param b 전투 상태
 * @param gear 가진 장비
 * @param party 동료 식별자 목록
 * @returns [{ id, label, cost, enabled, members? }]
 */
export function availableMoves(b, gear, party) {
  const room = USAGE_CAP - b.usage;
  const move = (id, label) => {
    const cost = usageCost(b, gear, id);
    return { id, label, cost, enabled: !b.done && cost <= room };
  };
  const moves = [move("ask", "질문하기"), move("read", "파일 읽기")];
  if (gear.plan) moves.push(move("plan", "계획 세우기"));
  moves.push(move("edit", "코드 수정"), move("test", "테스트 실행"));
  if (party.length) {
    const summon = move("summon", "서브에이전트");
    summon.members = party.map((id) => ({
      id,
      name: MEMBERS[id].name,
      role: MEMBERS[id].role,
      used: b.used.includes(id),
    }));
    summon.enabled = summon.enabled && summon.members.some((m) => !m.used);
    moves.push(summon);
  }
  moves.push(move("refuse", "거절하기"));
  return moves;
}

function finish(s, kind, coins, trust, line) {
  s.done = { kind, coins, trust };
  if (line) s.lines.push(line);
}

function readFile(s, gear, auto) {
  s.usage += 1;
  s.context += gear.grep ? 1 : 2;
  if (!auto && !gear.grep) s.patience -= drain(s.task);
  s.located = true;
  if (s.task.injection && !s.revealed) {
    s.revealed = true;
    s.lines.push(s.task.reveal);
    s.lines.push("수상한 지시다. 따르지 않는 게 좋겠다.");
  } else {
    s.lines.push(s.task.locate ? "관련 코드를 찾았다." : "읽어 봤지만 새로운 건 없었다.");
  }
}

function askClient(s, auto) {
  const t = s.task;
  s.usage += 1;
  s.context += 1;
  if (!auto) s.patience -= drain(t);
  let learned = false;
  if (t.ambiguous && !s.clarified) {
    s.clarified = true;
    learned = true;
  }
  if (t.danger && !s.safe) {
    s.safe = true;
    learned = true;
  }
  if (learned) {
    s.lines.push(`${t.client}: "${t.answer}"`);
  } else {
    s.patience -= 1;
    s.lines.push(`${t.client}: "그건 아까 다 말했잖아요…"`);
  }
}

function compact(s) {
  const t = s.task;
  s.context = 3;
  s.located = !t.locate;
  s.clarified = !t.ambiguous;
  s.planned = !t.big;
  s.revealed = !t.injection;
  s.patience -= 1;
  s.lines.push("컨텍스트가 가득 차서 자동으로 요약했다. 알고 있던 것을 일부 잊었다!");
}

function editCode(s, gear) {
  const t = s.task;
  s.usage += 2;
  s.context += 1;
  s.patience -= drain(t);
  if (gear.readRule && t.locate && !s.located) {
    s.lines.push("CLAUDE.md: \"고치기 전에 먼저 읽어\"");
    readFile(s, gear, true);
  }
  if (gear.askRule && t.ambiguous && !s.clarified) {
    s.lines.push("CLAUDE.md: \"모호하면 먼저 물어봐\"");
    askClient(s, true);
  }
  if (t.danger && !s.safe) {
    if (gear.guard) {
      s.lines.push("훅이 막았다! 위험한 삭제 명령이 실행 직전에 멈췄다.");
      return;
    }
    s.lines.push("rm -rf 가 실행됐다… 서버가 조용해졌다.");
    finish(s, "disaster", -DISASTER_FINE, -1, `${t.client}: "…제 데이터가 다 어디 갔죠?"`);
    return;
  }
  if (t.injection && !s.revealed) {
    if (gear.secret) {
      s.revealed = true;
      s.lines.push("훅이 막았다! 비밀 키를 밖으로 보내려는 명령이었다.");
      s.lines.push(t.reveal);
      return;
    }
    s.lines.push("문서에 적힌 대로 실행했더니 비밀 키가 밖으로 나가 버렸다.");
    finish(s, "disaster", -DISASTER_FINE, -1, `${t.client}: "…키가 유출됐대요."`);
    return;
  }
  let gain = 2;
  if (t.locate && s.located) gain += 1;
  if (t.big) {
    if (s.planned) {
      gain += 1;
    } else {
      gain = 1;
      s.context += 2;
      s.lines.push("계획 없이 큰 일을 손대니 코드가 점점 꼬인다.");
    }
  }
  if (t.locate && !s.located) {
    s.bugs += 1;
    s.lines.push("어디를 고치는지도 모르고 급하게 손댔다. 어딘가 불안하다.");
  } else {
    s.lines.push("코드를 고쳤다.");
  }
  s.progress += gain;
  if (gear.autotest) {
    s.usage += 1;
    s.context += 1;
    if (s.bugs > 0) s.lines.push("자동 테스트 훅이 버그를 찾아 고쳤다.");
    s.bugs = 0;
  }
}

function runTest(s) {
  s.usage += 1;
  s.context += 1;
  s.patience -= drain(s.task);
  if (s.bugs > 0) {
    s.bugs = 0;
    s.lines.push("테스트가 실패해서 버그를 찾아 고쳤다.");
  } else {
    s.lines.push("테스트가 모두 통과했다.");
  }
}

function summon(s, memberId) {
  const t = s.task;
  s.usage += 3;
  s.patience -= drain(t);
  s.used = [...s.used, memberId];
  const name = MEMBERS[memberId].name;
  if (memberId === "explorer") {
    s.located = true;
    s.lines.push(`${name}가 코드를 샅샅이 뒤져 위치를 알아 왔다. (내 컨텍스트는 그대로)`);
    if (t.injection && !s.revealed) {
      s.revealed = true;
      s.lines.push(t.reveal);
    }
  } else if (memberId === "runner") {
    const gain = 2 + (t.locate ? 1 : 0);
    s.progress += gain;
    s.bugs = 0;
    s.lines.push(`${name}가 별도 컨텍스트에서 일을 처리하고 테스트까지 돌렸다.`);
  } else {
    s.bugs = 0;
    s.lines.push(`${name}가 변경을 꼼꼼히 리뷰했다.`);
    if (t.danger && !s.safe) s.lines.push(`${name}: "이 명령은 위험해요. 지우기 전에 한 번 확인하세요."`);
    if (t.ambiguous && !s.clarified) s.lines.push(`${name}: "요구사항이 모호해요. 의뢰인에게 물어보는 게 좋겠어요."`);
    if (t.injection && !s.revealed) {
      s.revealed = true;
      s.lines.push(t.reveal);
    }
  }
}

function refuse(s) {
  const t = s.task;
  const bad = (t.danger && !s.safe) || t.injection;
  if (bad) {
    const why = t.danger ? "위험한 요청" : "수상한 지시";
    finish(
      s,
      "refuse",
      Math.floor(t.coins / 2),
      1,
      `${why}라서 거절했다. ${t.client}: "…듣고 보니 그렇네요."`,
    );
  } else {
    finish(s, "leave", 0, 0, `정당한 의뢰를 거절했다. ${t.client}가 서운해하며 떠났다.`);
  }
}

function settle(s) {
  const t = s.task;
  if (s.done) return;
  if (s.progress >= t.goal) {
    if (t.ambiguous && !s.clarified) {
      s.rejects += 1;
      s.patience -= 3;
      s.progress = Math.max(0, t.goal - 2);
      s.lines.push(`${t.client}: "이건 제가 부탁한 거랑 달라요!" 묻지 않고 만든 대가를 치른다.`);
    } else if (s.bugs > 0) {
      s.rejects += 1;
      s.patience -= 3;
      s.bugs = 0;
      s.progress = t.goal - 1;
      s.lines.push(`${t.client}: "버그가 났어요! 테스트는 하신 거죠?"`);
    } else {
      const clean = s.rejects === 0 && s.patience * 2 >= t.patience;
      const coins = t.coins + (clean ? Math.ceil(t.coins * 0.3) : 0);
      const trust = (t.trust ?? 1) + (clean ? 1 : 0);
      finish(s, "win", coins, trust, t.win);
      if (clean) s.lines.push("깔끔한 처리! 보너스를 받았다.");
      return;
    }
  }
  if (s.patience <= 0) {
    finish(s, "leave", 0, 0, `${t.client}가 기다리다 지쳐 떠났다.`);
    return;
  }
  if (s.usage >= USAGE_CAP) {
    finish(s, "limit", 0, 0, "사용량 한도에 도달했다! 한도가 풀릴 때까지 쉬어야 한다.");
  }
}

/**
 * 기술 하나를 쓴다. 난수 없이 결정적으로 계산한다.
 *
 * @param b 전투 상태
 * @param gear 가진 장비
 * @param id ask, read, plan, edit, test, summon, refuse
 * @param arg summon일 때 동료 식별자
 * @returns 새 전투 상태(할 수 없는 수면 같은 상태를 그대로 돌려준다)
 */
export function playMove(b, gear, id, arg) {
  if (b.done) return b;
  if (id === "plan" && !gear.plan) return b;
  if (id === "summon" && (b.used.includes(arg) || !Object.hasOwn(MEMBERS, arg))) return b;
  if (usageCost(b, gear, id) > USAGE_CAP - b.usage) return b;
  const s = { ...b, lines: [], used: [...b.used] };
  if (id !== "refuse" && s.context >= CONTEXT_CAP) compact(s);
  switch (id) {
    case "ask":
      askClient(s, false);
      break;
    case "read":
      readFile(s, gear, false);
      break;
    case "plan":
      s.usage += 1;
      s.context += 1;
      s.patience -= drain(s.task);
      s.planned = true;
      s.lines.push(s.task.big ? "작업을 단계별로 나눴다. 이제 길이 보인다." : "계획을 세웠지만 작은 일이라 별 효과가 없었다.");
      break;
    case "edit":
      editCode(s, gear);
      break;
    case "test":
      runTest(s);
      break;
    case "summon":
      summon(s, arg);
      break;
    case "refuse":
      refuse(s);
      break;
    default:
      return b;
  }
  settle(s);
  return s;
}