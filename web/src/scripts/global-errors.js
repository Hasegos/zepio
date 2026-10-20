// 잡히지 않은 오류와 거절된 약속을 콘솔에만 남긴다. 사용자 정보 보호를 위해 어디로도 보내지 않는다.
window.addEventListener("error", (event) => {
  console.error("[zepio] uncaught error", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[zepio] unhandled rejection", event.reason);
});
