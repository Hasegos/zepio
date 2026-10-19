/**
 * robots.txt를 돌려준다. 모든 크롤러를 허용하고 sitemap 주소만 알린다. 색인 제어는 페이지의 noindex 메타가 맡는다.
 *
 * @param context.site 사이트 주소
 * @returns 텍스트 응답
 */
export function GET({ site }) {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site).href}\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}