/**
 * 끝난 판의 공유 글을 만든다. 탑 모양은 담지 않는다.
 *
 * @param result 이번 판의 floors(층수)와 perfects(완벽 정렬 횟수)
 * @returns 공유 글(주소 제외)
 */
export function stackTowerShareText(result) {
  return `Zepio Stack Tower\n${result.floors}층 · 완벽 정렬 ${result.perfects}회`;
}