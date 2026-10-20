const PRODUCTION_REQUIRED = ["PUBLIC_SITE_URL", "PUBLIC_CONTACT_EMAIL"];

/**
 * production 빌드에 꼭 있어야 하는데 비어 있는 환경변수 이름을 모은다. production이 아니면 아무것도 요구하지 않는다.
 *
 * @param env 환경변수 객체
 * @returns 빠진 키 이름 목록
 */
export function missingProductionEnv(env) {
  if (env.PUBLIC_SITE_ENV !== "production") return [];
  return PRODUCTION_REQUIRED.filter((key) => !String(env[key] ?? "").trim());
}

/**
 * 사이트 주소와 경로로 canonical 주소를 만든다. sitemap과 같게 경로는 항상 슬래시로 끝난다.
 *
 * @param site 사이트 주소(URL 또는 문자열)
 * @param pathname 페이지 경로
 * @returns 절대 주소
 */
export function canonicalUrl(site, pathname) {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return new URL(path, site).href;
}

/**
 * JSON-LD 객체를 `<script>` 안에 넣을 문자열로 바꾼다. `<`는 이스케이프해서 `</script>`로 태그가 닫히지 않게 한다.
 *
 * @param data JSON-LD 객체
 * @returns 직렬화한 문자열
 */
export function jsonLdString(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * 애드센스 게시자 ID이면(ca-pub-숫자) 그대로 돌려주고, 비었거나 모양이 다르면 null이다.
 *
 * @param value 환경변수 값
 * @returns 게시자 ID 또는 null
 */
export function adsenseClient(value) {
  const id = String(value ?? "").trim();
  return /^ca-pub-\d{10,20}$/.test(id) ? id : null;
}