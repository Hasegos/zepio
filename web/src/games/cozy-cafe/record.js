import { formatCompact } from "./format.js";

/**
 * 홈 카드에 보여줄 한 줄 요약을 만든다.
 *
 * @param data 저장된 진행 상황
 * @returns 요약 문구, 데이터가 깨졌으면 빈 문자열
 */
export function summarize(data) {
  if (!Number.isFinite(data?.total) || data.total <= 0) return "";
  return `누적 수익 ${formatCompact(data.total)}`;
}