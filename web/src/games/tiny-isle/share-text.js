/**
 * 끝난 판의 공유 글을 만든다. 점수, 별, 섬 이름만 담는다.
 *
 * @param island 섬
 * @param result 결과 { score, stars }
 * @returns 공유 글(주소 제외)
 */
export function isleShareText(island, result) {
  const stars = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
  const place = island.daily ? `오늘의 섬 ${island.id.slice(6)}` : island.name;
  return `Zepio Tiny Isle\n${place} ${stars} ${result.score}점`;
}