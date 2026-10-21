import { isInt } from "../_shared/validate.js";
import { MAX_STARS } from "./engine.js";
import { TURNS } from "./sim.js";

/**
 * 한 판의 결과를 저장된 최고 기록과 합친다. 별이 많을수록, 별이 같으면 더 빨리 이길수록 좋은 기록이다.
 * 이기지 못한 판은 기록하지 않는다. 저장된 값이 깨졌으면 기록이 없는 것으로 본다.
 *
 * @param prev 저장된 최고 기록 데이터 또는 null
 * @param result 이번 판의 stars(0~3)와 turn(이긴 턴)
 * @returns 저장할 데이터와, 이전 기록을 넘어섰는지(isNewBest)
 */
export function mergeResult(prev, result) {
  const hasPrev = isInt(prev?.bestStars, 1, MAX_STARS) && isInt(prev?.bestTurn, 1, TURNS);
  if (result.stars < 1) return { data: hasPrev ? prev : null, isNewBest: false };
  const better = !hasPrev || result.stars > prev.bestStars || (result.stars === prev.bestStars && result.turn < prev.bestTurn);
  return {
    data: better ? { bestStars: result.stars, bestTurn: result.turn } : prev,
    isNewBest: hasPrev && better,
  };
}

/**
 * 홈 카드에 보여줄 한 줄 요약을 만든다.
 *
 * @param data 저장된 최고 기록 데이터
 * @param plays 플레이 횟수
 * @returns 요약 문구, 데이터가 없거나 깨졌으면 빈 문자열
 */
export function summarize(data, plays) {
  if (!isInt(data?.bestStars, 1, MAX_STARS) || !isInt(data?.bestTurn, 1, TURNS)) return "";
  return `최고 별 ${data.bestStars}개 · 최단 ${data.bestTurn}턴 · ${plays}회 플레이`;
}
