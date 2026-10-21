/**
 * 공유 글의 틀을 만든다. 첫 줄은 게임 이름이고, 오늘의 도전이면 둘째 줄이 그 이름과 날짜로 시작한다.
 *
 * @param game 게임 이름
 * @param result 결과 한 줄
 * @param daily 오늘의 도전이면 { label(오늘의 판, 오늘의 섬 등), date }, 아니면 null
 * @returns 공유 글(주소 제외)
 */
export function shareText(game, result, daily = null) {
  const prefix = daily ? `${daily.label} ${daily.date} · ` : "";
  return `Zepio ${game}\n${prefix}${result}`;
}
