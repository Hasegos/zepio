import { createGameHost } from "../lib/game-host.js";
import { getGame } from "../games/registry.js";

document.querySelectorAll("[data-game-stage]").forEach((root) => {
  const game = getGame(root.dataset.slug);
  if (!game) return;
  const skeleton = root.querySelector("[data-skeleton]");
  const host = createGameHost({ root, load: game.load, ctx: { mode: root.dataset.mode } });
  host.start().then(() => skeleton?.remove());
});
