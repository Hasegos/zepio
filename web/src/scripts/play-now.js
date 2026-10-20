import { loadRecords } from "../lib/storage.js";

const link = document.querySelector("[data-play-now]");

/** Play Now 링크를 가장 최근에 기록이 남은 게임으로 바꾼다. 기록이 없으면 그대로 둔다. */
function point() {
  if (!link) return;
  const slug = JSON.parse(link.dataset.games)[loadRecords().recent[0]];
  if (slug) link.href = `/games/${slug}`;
}

window.addEventListener("pageshow", point);