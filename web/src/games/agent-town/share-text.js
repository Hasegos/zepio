import { ALL_TASK_IDS } from "./tasks.js";

/**
 * 엔딩을 본 뒤의 공유 글을 만든다. 칭호, 도감, 사고 횟수만 담는다.
 *
 * @param ending 엔딩 정보 { codex, disasters, title }
 * @returns 공유 글(주소 제외)
 */
export function townShareText(ending) {
  return `Zepio Agent Town\n팀장 박의 시험 합격! ${ending.title} · 도감 ${ending.codex}/${ALL_TASK_IDS.length} · 사고 ${ending.disasters}회`;
}