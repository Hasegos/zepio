/**
 * 공유 글과 주소를 한 덩어리 글로 합친다. 복사하거나 직접 복사하게 할 때 쓴다.
 *
 * @param text 공유 글
 * @param url 게임 주소
 * @returns 글과 주소를 줄바꿈으로 이은 문자열
 */
export function withUrl(text, url) {
  return `${text}\n${url}`;
}

/**
 * 결과를 공유한다. 공유 창이 있으면 그것을, 없으면 클립보드 복사를 쓴다. 던지지 않는다.
 *
 * @param payload.title 공유 제목
 * @param payload.text 공유 글(주소 제외)
 * @param payload.url 게임 주소
 * @param nav 브라우저의 navigator(기본값은 전역 navigator)
 * @returns "shared" 공유 창으로 보냄, "cancelled" 사용자가 닫음, "copied" 클립보드에 복사함, "manual" 둘 다 안 되어 직접 복사해야 함
 */
export async function shareResult({ title, text, url }, nav = globalThis.navigator) {
  if (typeof nav?.share === "function") {
    try {
      await nav.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await nav.clipboard.writeText(withUrl(text, url));
    return "copied";
  } catch {
    return "manual";
  }
}