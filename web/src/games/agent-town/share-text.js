import { ALL_TASK_IDS } from "./tasks.js";

/**
 * 엔딩을 본 뒤의 공유 글을 만든다. 칭호, 도감, 사고 횟수만 담는다.
 *
 * @param ending 엔딩 정보 { codex, disasters, title, league }
 * @returns 공유 글(주소 제외)
 */
export function townShareText(ending) {
  const head = ending.league ? "챔피언 리그 제패!" : "팀장 박의 시험 합격!";
  return `Zepio Agent Town\n${head} ${ending.title} · 도감 ${ending.codex}/${ALL_TASK_IDS.length} · 사고 ${ending.disasters}회`;
}