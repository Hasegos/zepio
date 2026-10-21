import { loadRecords } from "../lib/storage.js";

const link = document.querySelector("[data-play-now]");

/** Play Now 링크를 가장 최근에 기록이 남은 게임으로 바꾼다. 기록이 없으면 그대로 둔다. */
function point() {
  if (!link) return;
  const games = JSON.parse(link.dataset.games);
  const id = loadRecords().recent[0];
  if (typeof id === "string" && Object.hasOwn(games, id)) link.href = `/games/${games[id]}`;
}

window.addEventListener("pageshow", point);