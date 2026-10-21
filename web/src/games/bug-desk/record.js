import { isInt } from "../_shared/validate.js";
import { TOTAL } from "./engine.js";

export const MAX_SCORE = TOTAL;

/**
 * 한 판의 결과를 저장된 최고 기록과 합친다. 맞힌 개수가 많을수록 좋은 기록이다.
 * 저장된 값이 깨졌으면 기록이 없는 것으로 본다.
 *
 * @param prev 저장된 최고 기록 데이터 또는 null
 * @param result 이번 판의 score(맞힌 개수)
 * @returns 저장할 데이터와, 이전 기록을 넘어섰는지(isNewBest)
 */
export function mergeResult(prev, result) {
  const hasPrev = isInt(prev?.bestScore, 0, MAX_SCORE);
  const better = !hasPrev || result.score > prev.bestScore;
  return {
    data: better ? { bestScore: result.score } : prev,
    isNewBest: hasPrev && better,
  };
}

/**
 * 홈 카드에 보여줄 한 줄 요약을 만든다.
 *
 * @param data 저장된 최고 기록 데이터
 * @param plays 플레이 횟수
 * @returns 요약 문구, 데이터가 깨졌으면 빈 문자열
 */
export function summarize(data, plays) {
  if (!isInt(data?.bestScore, 0, MAX_SCORE)) return "";
  return `최고 ${data.bestScore} / ${MAX_SCORE}건 · ${plays}회 플레이`;
}