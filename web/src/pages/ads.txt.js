import { adsenseClient } from "../lib/site.js";

/**
 * ads.txt를 돌려준다. 애드센스 게시자 ID가 있으면 한 줄을 적고, 없으면 빈 파일이다.
 *
 * @returns 텍스트 응답
 */
export function GET() {
  const client = adsenseClient(import.meta.env.PUBLIC_ADSENSE_CLIENT);
  const body = client ? `google.com, ${client.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n` : "";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
