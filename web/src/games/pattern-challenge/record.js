import { RUN_SLOTS } from "./pick-puzzles.js";

/**
 * 한 판의 결과를 저장된 최고 기록과 합친다. 정답 수가 많을수록, 같으면 시간이 짧을수록 좋은 기록이다.
 * 저장된 값이 깨졌으면 기록이 없는 것으로 본다.
 *
 * @param prev 저장된 최고 기록 데이터 또는 null
 * @param result 이번 판의 correct(정답 수)와 ms(걸린 시간)
 * @returns 저장할 데이터와, 이전 기록을 넘어섰는지(isNewBest)
 */
export function mergeResult(prev, result) {
  const hasPrev = Number.isInteger(prev?.bestCorrect) && Number.isFinite(prev?.bestMs);
  const better =
    !hasPrev ||
    result.correct > prev.bestCorrect ||
    (result.correct === prev.bestCorrect && result.ms < prev.bestMs);
  return {
    data: better ? { bestCorrect: result.correct, bestMs: result.ms } : prev,
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
  if (!Number.isInteger(data?.bestCorrect)) return "";
  return `최고 ${data.bestCorrect} / ${RUN_SLOTS.length} 정답 · ${plays}회 플레이`;
}