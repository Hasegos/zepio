import { formatDuration } from "../_shared/time.js";
import { isInt, isObject } from "../_shared/validate.js";
import { LEVEL_IDS, LEVELS } from "./engine.js";

const MAX_SECONDS = 5999;

/**
 * 저장소에서 읽은 값을 안전한 모양으로 다듬는다. 깨진 값은 기록이 없는 것으로 본다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns { best, streak, maxStreak } best는 난이도별 최단 시간(초), streak는 이어지는 승리 수
 */
export function readData(raw) {
  const best = {};
  if (isObject(raw?.best)) {
    for (const id of LEVEL_IDS) if (isInt(raw.best[id], 1, MAX_SECONDS)) best[id] = raw.best[id];
  }
  return {
    best,
    streak: isInt(raw?.streak, 0, 9999) ? raw.streak : 0,
    maxStreak: isInt(raw?.maxStreak, 0, 9999) ? raw.maxStreak : 0,
  };
}

/**
 * 한 판의 결과를 저장된 기록과 합친다. 이기면 연승이 늘고 최단 시간을 갱신하며, 지면 연승이 0으로 돌아간다.
 *
 * @param prev 저장된 기록 데이터 또는 null
 * @param result 이번 판의 level, won(이겼는지), seconds(걸린 초)
 * @returns 저장할 데이터와, 이전 최단 시간을 넘어섰는지(isNewBest)
 */
export function mergeResult(prev, result) {
  const data = readData(prev);
  if (!result.won) return { data: { ...data, streak: 0 }, isNewBest: false };
  const old = data.best[result.level];
  const better = old === undefined || result.seconds < old;
  const streak = data.streak + 1;
  return {
    data: {
      best: better ? { ...data.best, [result.level]: Math.min(result.seconds, MAX_SECONDS) } : data.best,
      streak,
      maxStreak: Math.max(data.maxStreak, streak),
    },
    isNewBest: old !== undefined && better,
  };
}

/**
 * 홈 카드에 보여줄 한 줄 요약을 만든다. 기록이 있는 가장 어려운 난이도의 최단 시간을 보여준다.
 *
 * @param data 저장된 기록 데이터
 * @param plays 플레이 횟수
 * @returns 요약 문구, 보여줄 것이 없으면 빈 문자열
 */
export function summarize(data, plays) {
  const { best } = readData(data);
  const level = [...LEVEL_IDS].reverse().find((id) => best[id] !== undefined);
  if (!level) return plays > 0 ? `${plays}회 플레이` : "";
  return `${LEVELS[level].name} 최고 ${formatDuration(best[level] * 1000)} · ${plays}회 플레이`;
}