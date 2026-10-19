import { availableMoves, playMove } from "./battle.js";

/**
 * 전투 하나를 정해진 전략으로 끝까지 진행한다. 밸런스 시험용이다.
 * 전략은 (전투, 장비, 동료) 를 받아 { id, arg } 를 돌려준다.
 *
 * @param battle 시작 전투 상태
 * @param gear 가진 장비
 * @param party 동료 식별자 목록
 * @param strategy 전략 함수
 * @returns 끝난 전투 상태
 */
export function runBattle(battle, gear, party, strategy) {
  let b = battle;
  for (let i = 0; i < 60 && !b.done; i += 1) {
    const pick = strategy(b, gear, party);
    const next = playMove(b, gear, pick.id, pick.arg);
    if (next === b) {
      const fallback = availableMoves(b, gear, party).find((m) => m.enabled && m.id !== "refuse");
      b = fallback ? playMove(b, gear, fallback.id, fallback.members?.find((m) => !m.used)?.id) : playMove(b, gear, "refuse");
    } else {
      b = next;
    }
  }
  return b;
}

/** 무조건 고치기만 한다. */
export const yolo = () => ({ id: "edit" });

/** 읽고, 고치고, 테스트한다(질문은 하지 않는다). */
export function readEditTest(b) {
  if (!b.located) return { id: "read" };
  if (b.progress >= b.task.goal - 1 && b.bugs > 0) return { id: "test" };
  return { id: "edit" };
}

/**
 * 일 시작 때 질문, 읽기, 계획을 무조건 순서대로 다 하고 나서 고친다.
 *
 * @returns 전략 함수(전투마다 새로 만든다)
 */
export function fullPipeline() {
  const queue = ["ask", "read", "plan"];
  return (b, gear) => {
    while (queue.length) {
      const id = queue.shift();
      if (id !== "plan" || gear.plan) return { id };
    }
    return { id: "edit" };
  };
}

/** 단서(의뢰 성격)를 읽고 필요한 것만 한다. */
export function adaptive(b, gear) {
  const t = b.task;
  if ((t.ambiguous && !b.clarified) || (t.danger && !b.safe)) return { id: "ask" };
  if (t.locate && !b.located) return { id: "read" };
  if (t.injection && !b.revealed) return { id: "read" };
  if (t.big && !b.planned && gear.plan) return { id: "plan" };
  return { id: "edit" };
}
