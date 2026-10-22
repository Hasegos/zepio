import { recordLoaders } from "../games/records.js";
import { currentStreak, kstDate } from "../lib/daily.js";
import { getHomePrefs, loadRecords, setHomePrefs } from "../lib/storage.js";

const { games, recent, daily } = loadRecords();
const PLAYS_MAX = 999999;

/**
 * 저장된 플레이 횟수를 읽는다. 정수가 아니거나 범위를 벗어난 값은 0으로 본다.
 *
 * @param entry 저장된 게임 항목
 * @returns 플레이 횟수
 */
const playsOf = (entry) => (Number.isInteger(entry?.plays) && entry.plays >= 0 && entry.plays <= PLAYS_MAX ? entry.plays : 0);
const cards = new Map(
  [...document.querySelectorAll("[data-game-card]")].map((card) => [card.dataset.gameCard, card]),
);

for (const [id, card] of cards) {
  const entry = games[id];
  const line = card.querySelector("[data-record]");
  if (!entry || !line) continue;
  const plays = playsOf(entry);
  recordLoaders[id]?.().then(({ summarize }) => {
    const text = summarize(entry.data, plays);
    if (text) {
      line.textContent = text;
      line.hidden = false;
    }
  });
}

const dailyRows = [...document.querySelectorAll("[data-daily-game]")];
const dailySummary = document.querySelector("[data-daily-summary]");
if (dailyRows.length) {
  const today = kstDate(Date.now());
  let done = 0;
  for (const row of dailyRows) {
    const status = row.querySelector("[data-daily-status]");
    const record = daily[row.dataset.dailyGame];
    if (!status || !record) continue;
    const streak = currentStreak(record, today);
    if (record.last === today) {
      done += 1;
      row.dataset.done = "";
      status.textContent = `오늘 완료 · 연속 ${streak}일`;
    } else if (streak > 0) {
      status.textContent = `연속 ${streak}일 이어가는 중`;
    }
  }
  for (const row of dailyRows) if (row.dataset.done !== undefined) row.parentElement.append(row);
  if (dailySummary && Object.keys(daily).length) {
    dailySummary.textContent =
      done === dailyRows.length
        ? `오늘의 도전 ${done}개를 모두 마쳤어요. 내일 새 판이 열려요.`
        : `오늘 ${done}/${dailyRows.length}개 완료. 마치지 않은 게임에 도전해 보세요.`;
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

const gameList = document.querySelector("[data-game-list]");
const sortButtons = [...document.querySelectorAll("[data-sort]")];
const categoryButtons = [...document.querySelectorAll("[data-category-filter]")];
const hasRecords = Object.keys(games).length > 0;
const SORTERS = {
  recommended: (a, b) => a.order - b.order,
  newest: (a, b) => b.order - a.order,
  plays: (a, b) => b.plays - a.plays || a.order - b.order,
  recent: (a, b) => b.lastAt - a.lastAt || a.order - b.order,
  short: (a, b) => a.minutes - b.minutes || a.order - b.order,
};

if (gameList && sortButtons.length) {
  const saved = getHomePrefs();
  const usable = (id) => sortButtons.some((button) => button.dataset.sort === id && (hasRecords || button.dataset.needsRecords === undefined));
  const state = {
    sort: usable(saved.sort) ? saved.sort : "recommended",
    category: categoryButtons.some((button) => button.dataset.categoryFilter === saved.category) ? saved.category : "all",
  };
  for (const button of sortButtons) if (button.dataset.needsRecords !== undefined) button.hidden = !hasRecords;
  const items = [...cards.values()].map((card) => ({
    card,
    order: Number(card.dataset.order),
    minutes: Number(card.dataset.minutes),
    plays: playsOf(games[card.dataset.gameCard]),
    lastAt: Number.isFinite(games[card.dataset.gameCard]?.lastAt) ? games[card.dataset.gameCard].lastAt : 0,
  }));

  /**
   * 고른 정렬과 분류대로 카드를 다시 늘어놓고 버튼 모양을 맞춘다.
   */
  const apply = () => {
    items.sort(SORTERS[state.sort]);
    for (const item of items) {
      item.card.hidden = state.category !== "all" && item.card.dataset.category !== state.category;
      gameList.append(item.card);
    }
    for (const button of sortButtons) button.setAttribute("aria-pressed", String(button.dataset.sort === state.sort));
    for (const button of categoryButtons) button.setAttribute("aria-pressed", String(button.dataset.categoryFilter === state.category));
  };

  /**
   * 버튼을 눌렀을 때 설정을 바꾸고 저장한다.
   *
   * @param key 바꿀 설정(sort, category)
   * @param value 새 값
   */
  const choose = (key, value) => {
    state[key] = value;
    setHomePrefs({ ...state });
    apply();
  };
  for (const button of sortButtons) button.addEventListener("click", () => choose("sort", button.dataset.sort));
  for (const button of categoryButtons) button.addEventListener("click", () => choose("category", button.dataset.categoryFilter));
  apply();
}