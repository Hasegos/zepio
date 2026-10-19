import { ISLAND_LIST } from "./islands.js";

/**
 * 저장 데이터를 안전한 모양으로 다듬는다. 깨진 항목은 버리고 빈 기록에서 시작한다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns { v, best, run } best는 { 섬 id: { score, stars } }, run은 이어 할 판(검증은 쓰는 쪽에서 한다)
 */
export function readData(raw) {
  const best = {};
  if (raw?.v === 1 && raw.best !== null && typeof raw.best === "object") {
    for (const island of ISLAND_LIST) {
      const entry = raw.best[island.id];
      if (Number.isInteger(entry?.score) && entry.score >= 0 && [0, 1, 2, 3].includes(entry.stars)) {
        best[island.id] = { score: entry.score, stars: entry.stars };
      }
    }
  }
  return { v: 1, best, run: raw?.v === 1 && raw.run && typeof raw.run === "object" ? raw.run : null };
}

/**
 * 한 판의 결과를 섬별 최고 기록과 합친다. 점수가 높을수록 좋은 기록이다.
 *
 * @param prev 읽은 저장 데이터
 * @param islandId 섬 id
 * @param result score와 stars
 * @returns 저장할 데이터(run은 비운다)와 새 기록 여부
 */
export function mergeBest(prev, islandId, result) {
  const data = readData(prev);
  const old = data.best[islandId];
  const better = !old || result.score > old.score;
  const entry = { score: better ? result.score : old.score, stars: Math.max(old?.stars ?? 0, result.stars) };
  return { data: { ...data, best: { ...data.best, [islandId]: entry }, run: null }, isNewBest: Boolean(old) && better };
}

/**
 * 모은 별 개수의 합을 구한다.
 *
 * @param data 읽은 저장 데이터
 * @returns 별 개수
 */
export function totalStars(data) {
  return Object.values(readData(data).best).reduce((sum, entry) => sum + entry.stars, 0);
}

/**
 * 섬이 열려 있는지 확인한다. 첫 섬은 항상 열려 있고, 그 뒤는 섬마다 별 두 개가 더 필요하다.
 *
 * @param data 읽은 저장 데이터
 * @param index 섬 순서(0부터)
 * @returns 열려 있으면 true
 */
export function isUnlocked(data, index) {
  return totalStars(data) >= unlockStars(index);
}

/**
 * 섬을 여는 데 필요한 별 개수를 구한다.
 *
 * @param index 섬 순서(0부터)
 * @returns 별 개수
 */
export function unlockStars(index) {
  return index * 2;
}

/**
 * 홈 카드에 보여줄 한 줄 요약을 만든다.
 *
 * @param data 저장된 데이터
 * @returns 요약 문구, 기록이 없으면 빈 문자열
 */
export function summarize(data) {
  const { best } = readData(data);
  const scores = Object.values(best).map((entry) => entry.score);
  if (!scores.length) return "";
  return `별 ${totalStars(data)}개 · 최고 ${Math.max(...scores)}점`;
}