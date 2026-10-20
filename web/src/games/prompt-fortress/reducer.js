import { runLevel } from "./engine.js";
import { dailyLevelId } from "./daily.js";
import { LEVELS } from "./levels.js";

/**
 * 처음 상태를 만든다.
 *
 * @param stars 저장돼 있던 방별 최고 별
 * @returns { phase, stars, level } 방 목록 화면, 방별 최고 별, 열린 방(없으면 null)
 */
export function initialState(stars = {}) {
  return { phase: "menu", stars, level: null };
}

/**
 * 방이 열려 있는지 확인한다. 첫 방은 항상 열려 있고 나머지는 앞 방을 별 하나 이상으로 깨야 열린다.
 *
 * @param stars 방별 최고 별
 * @param index 방 순서(0부터)
 * @returns 열려 있으면 true
 */
export function isOpen(stars, index) {
  return index === 0 || (stars[LEVELS[index - 1].id] ?? 0) >= 1;
}

function levelOf(id) {
  return LEVELS.find((level) => level.id === id);
}

function finish(state, shown) {
  const { level } = state;
  const def = levelOf(level.id);
  const done = shown >= def.messages.length;
  const stars = done ? { ...state.stars, [def.id]: Math.max(state.stars[def.id] ?? 0, level.run.stars) } : state.stars;
  return { ...state, stars, level: { ...level, run: { ...level.run, shown } } };
}

/**
 * 한 번의 행동으로 상태를 바꾼다. 상태에 맞지 않는 행동은 같은 상태를 돌려준다.
 *
 * @param state 현재 상태
 * @param action open(daily에 오늘 날짜를 주면 잠긴 방도 오늘의 방으로 연다), add, remove, move, clear, run, tick, skip, retry, next, leave 중 하나
 * @returns 새 상태
 */
export function reducer(state, action) {
  const { level } = state;
  const editing = state.phase === "level" && level && !level.run;
  switch (action.type) {
    case "open": {
      const index = LEVELS.findIndex((l) => l.id === action.id);
      const daily = typeof action.daily === "string" && dailyLevelId(action.daily) === action.id ? action.daily : null;
      if (index < 0 || !(daily || isOpen(state.stars, index))) return state;
      return { ...state, phase: "level", level: { id: action.id, rules: [], run: null, daily } };
    }
    case "add": {
      if (!editing) return state;
      const def = levelOf(level.id);
      const card = def.deck.find((c) => c.id === action.id);
      if (!card || level.rules.some((c) => c.id === card.id) || level.rules.length >= def.slots) return state;
      return { ...state, level: { ...level, rules: [...level.rules, card] } };
    }
    case "remove": {
      if (!editing || !Number.isInteger(action.i) || action.i < 0 || action.i >= level.rules.length) return state;
      return { ...state, level: { ...level, rules: level.rules.filter((_, i) => i !== action.i) } };
    }
    case "move": {
      const to = action.i + action.dir;
      if (!editing || !Number.isInteger(action.i) || action.i < 0 || to < 0 || to >= level.rules.length) return state;
      const rules = [...level.rules];
      [rules[action.i], rules[to]] = [rules[to], rules[action.i]];
      return { ...state, level: { ...level, rules } };
    }
    case "clear":
      return editing ? { ...state, level: { ...level, rules: [] } } : state;
    case "run": {
      if (!editing || level.rules.length === 0) return state;
      const { results, stars } = runLevel(levelOf(level.id), level.rules);
      return { ...state, level: { ...level, run: { results, stars, shown: 0 } } };
    }
    case "tick": {
      if (state.phase !== "level" || !level?.run) return state;
      const total = levelOf(level.id).messages.length;
      return level.run.shown >= total ? state : finish(state, level.run.shown + 1);
    }
    case "skip":
      return state.phase === "level" && level?.run ? finish(state, levelOf(level.id).messages.length) : state;
    case "retry":
      return state.phase === "level" && level?.run ? { ...state, level: { ...level, run: null } } : state;
    case "next": {
      if (state.phase !== "level" || !level?.run) return state;
      const index = LEVELS.findIndex((l) => l.id === level.id);
      const done = level.run.shown >= levelOf(level.id).messages.length;
      const next = LEVELS[index + 1];
      if (!done || !next || !isOpen(state.stars, index + 1)) return state;
      return { ...state, level: { id: next.id, rules: [], run: null, daily: null } };
    }
    case "leave":
      return state.phase === "level" ? { ...state, phase: "menu", level: null } : state;
    default:
      return state;
  }
}