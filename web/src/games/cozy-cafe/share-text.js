import { formatCompact, formatSpan } from "./format.js";

/**
 * 체인점 오픈 공유 글을 만든다. 누적 수익, 직원 수, 걸린 시간만 담는다.
 *
 * @param econ 진행 상황
 * @returns 공유 글(주소 제외)
 */
export function cafeShareText(econ) {
  const time = econ.goalAt > 0 ? ` · ${formatSpan(econ.goalAt - econ.startedAt)}` : "";
  return `Zepio Cozy Cafe\n누적 수익 ${formatCompact(econ.total)} · 직원 ${econ.staff}명${time}`;
}