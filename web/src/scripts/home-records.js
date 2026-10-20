import { recordLoaders } from "../games/records.js";
import { currentStreak, kstDate } from "../lib/daily.js";
import { loadRecords } from "../lib/storage.js";

const { games, recent, daily } = loadRecords();
const cards = new Map(
  [...document.querySelectorAll("[data-game-card]")].map((card) => [card.dataset.gameCard, card]),
);

for (const [id, card] of cards) {
  const entry = games[id];
  const line = card.querySelector("[data-record]");
  if (!entry || !line) continue;
  const plays = Number.isInteger(entry.plays) ? entry.plays : 0;
  recordLoaders[id]?.().then(({ summarize }) => {
    const text = summarize(entry.data, plays);
    if (text) {
      line.textContent = text;
      line.hidden = false;
    }
  });
}

const banner = document.querySelector("[data-daily]");
const bannerText = document.querySelector("[data-daily-text]");
const record = banner ? daily[banner.dataset.gameId] : null;
if (bannerText && record) {
  const today = kstDate(Date.now());
  const streak = currentStreak(record, today);
  if (record.last === today) {
    bannerText.textContent = `오늘 완료 · 연속 ${streak}일. 내일 새로운 문제가 열려요.`;
  } else if (streak > 0) {
    bannerText.textContent = `오늘의 문제가 기다려요 · 연속 ${streak}일을 이어가는 중`;
  }
}

const list = document.querySelector("[data-recent-list]");
const section = document.querySelector("[data-recent]");
const ids = recent.filter((id) => cards.has(id));
if (list && section && ids.length) {
  for (const id of ids) {
    const card = cards.get(id);
    const link = document.createElement("a");
    link.href = `/games/${card.dataset.slug}`;
    link.textContent = card.dataset.name;
    link.className = "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary";
    const item = document.createElement("li");
    item.append(link);
    list.append(item);
  }
  section.hidden = false;
}