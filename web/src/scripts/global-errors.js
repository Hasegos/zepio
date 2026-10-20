window.addEventListener("error", (event) => {
  console.error("[zepio] uncaught error", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[zepio] unhandled rejection", event.reason);
});
