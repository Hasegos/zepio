const KEY = "zepio:v1";
const VERSION = 1;
const RECENT_MAX = 5;

/**
 * 비어 있는 기록을 만든다.
 *
 * @returns 기록 객체
 */
function emptyRecords() {
  return { v: VERSION, games: {}, recent: [], daily: {} };
}

/**
 * 저장된 기록을 읽는다. 저장소를 쓸 수 없거나 내용이 깨졌거나 버전이 다르면 빈 기록을 돌려준다.
 *
 * @returns 기록 객체
 */
export function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    const valid =
      parsed?.v === VERSION &&
      parsed.games !== null &&
      typeof parsed.games === "object" &&
      Array.isArray(parsed.recent);
    if (!valid) return emptyRecords();
    const hasDaily = parsed.daily !== null && typeof parsed.daily === "object" && !Array.isArray(parsed.daily);
    return { ...parsed, daily: hasDaily ? parsed.daily : {} };
  } catch {
    return emptyRecords();
  }
}

/**
 * 한 게임의 저장된 최고 기록 데이터를 읽는다.
 *
 * @param id 게임 id
 * @returns 저장된 데이터, 없으면 null
 */
export function getGameData(id) {
  return loadRecords().games[id]?.data ?? null;
}

/**
 * 한 판의 결과를 저장한다. 플레이 횟수를 하나 늘리고 마지막 플레이 시간과 최근 목록을 갱신한다.
 * 저장소에 쓸 수 없어도 오류를 내지 않고 이번 계산 결과만 돌려준다.
 *
 * @param id 게임 id
 * @param now 현재 시각(밀리초)
 * @param data 게임이 계산한 최고 기록 데이터
 * @returns 저장한 플레이 횟수와 저장 성공 여부
 */
export function saveResult(id, now, data) {
  const records = loadRecords();
  const plays = (Number.isInteger(records.games[id]?.plays) ? records.games[id].plays : 0) + 1;
  records.games[id] = { plays, lastAt: now, data };
  records.recent = [id, ...records.recent.filter((recent) => recent !== id)].slice(0, RECENT_MAX);
  return { plays, saved: writeRecords(records) };
}

/**
 * 한 게임의 일일 기록을 읽는다.
 *
 * @param id 게임 id
 * @returns 저장된 일일 기록, 없으면 null
 */
export function getDaily(id) {
  return loadRecords().daily[id] ?? null;
}

/**
 * 한 게임의 일일 기록을 저장한다. 저장소에 쓸 수 없어도 오류를 내지 않는다.
 *
 * @param id 게임 id
 * @param daily 저장할 일일 기록
 * @returns 저장에 성공했는지
 */
export function saveDaily(id, daily) {
  const records = loadRecords();
  records.daily[id] = daily;
  return writeRecords(records);
}

/**
 * 기록 전체를 저장소에 쓴다.
 *
 * @param records 기록 객체
 * @returns 저장에 성공했는지
 */
function writeRecords(records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}