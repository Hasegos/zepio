import { shareText } from "../_shared/share-text.js";
import { endingOf, MAX_STARS, worldOf } from "./engine.js";
import { DIFFICULTIES, TURNS, weighted } from "./sim.js";
import { AI_TYPES } from "./traits.js";
import { resultStars } from "./reducer.js";

/**
 * 끝난 판의 공유 글을 만든다. 결말, 별, 걸린 턴, 채택률과 의존도만 담고, 고른 능력이나 시작 권역은 담지 않는다.
 *
 * @param state 끝난 판의 상태
 * @param date 오늘의 도전이면 날짜(YYYY-MM-DD), 아니면 비워 둔다
 * @returns 공유 글(주소 제외)
 */
export function rogueShareText(state, date) {
  const { sim, run } = state;
  const stars = resultStars(state);
  const world = worldOf(run.seed);
  const mark = `${"★".repeat(stars)}${"☆".repeat(MAX_STARS - stars)}`;
  const lines = [
    `${mark} · ${endingOf(sim.over).title}`,
    `${AI_TYPES[sim.ai].name} · ${sim.turn}턴${sim.diff === "normal" ? "" : ` · ${DIFFICULTIES[sim.diff].label}`}`,
    `채택 ${Math.round(weighted(world, sim.a) * 100)}% · 의존 ${Math.round(weighted(world, sim.d) * 100)}% · 규제 ${Math.round(sim.reg * 100)}%`,
  ];
  return shareText("폭주 모델", lines.join("\n"), date && { label: "오늘의 도전", date });
}


/**
 * 오늘의 도전 결과를 도전장 링크의 vs 값으로 만든다.
 *
 * @param state 끝난 판의 상태
 * @param date 오늘의 도전 날짜(YYYY-MM-DD)
 * @returns 날짜.별.턴, 예: 2026-10-23.2.41
 */
export function challengeParam(state, date) {
  return `${date}.${resultStars(state)}.${state.sim.turn}`;
}

/**
 * 도전장 링크의 vs 값을 읽는다. 주소는 누구나 고칠 수 있어서 날짜 모양, 별 0~MAX_STARS, 턴 1~TURNS 정수인지 확인한다.
 *
 * @param value vs 값, 없으면 null
 * @returns { date, stars, turn }, 모양이나 범위가 맞지 않으면 null
 */
export function parseChallenge(value) {
  const match = /^(\d{4}-\d{2}-\d{2})\.(\d)\.(\d{1,2})$/.exec(value ?? "");
  if (!match) return null;
  const stars = Number(match[2]);
  const turn = Number(match[3]);
  return stars <= MAX_STARS && turn >= 1 && turn <= TURNS ? { date: match[1], stars, turn } : null;
}