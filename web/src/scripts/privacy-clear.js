import { clearRecords } from "../lib/storage.js";

const button = document.querySelector("[data-clear-records]");
const status = document.querySelector("[data-clear-status]");

button?.addEventListener("click", () => {
  const confirmed = confirm("이 브라우저에 저장된 모든 게임의 기록과 진행 상황, 오늘의 도전 기록, 홈 정렬과 소리 끔 설정을 모두 지웁니다. 계속할까요?");
  if (!confirmed || !status) return;
  const cleared = clearRecords();
  status.textContent = cleared ? "기록을 지웠어요." : "기록을 지우지 못했어요. 브라우저 설정에서 사이트 데이터를 지워 주세요.";
});