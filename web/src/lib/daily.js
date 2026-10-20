const KST_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const HISTORY_MAX = 60;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 시각을 한국 표준시(KST) 날짜 문자열로 바꾼다.
 *
 * @param ms 밀리초 단위 시각
 * @returns YYYY-MM-DD
 */
export function kstDate(ms) {
  return KST_FORMAT.format(ms);
}

/**
 * 날짜의 전날을 구한다.
 *
 * @param date YYYY-MM-DD
 * @returns 전날 YYYY-MM-DD
 */
function previousDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/**
 * 저장된 일일 기록이 쓸 수 있는 모양인지 확인한다.
 *
 * @param record 저장된 값
 * @returns 쓸 수 있으면 true
 */
function isValid(record) {
  return (
    DATE_FORMAT.test(record?.last) &&
    Number.isInteger(record.streak) &&
    Number.isInteger(record.max) &&
    record.history !== null &&
    typeof record.history === "object"
  );
}

/**
 * 오늘의 도전을 마친 결과를 일일 기록에 더한다. 같은 날짜는 한 번만 세고, 어제 이어서 했으면 연속 일수를 늘리고
 * 하루 이상 건너뛰었으면 1로 돌아간다. 저장된 값이 깨졌으면 기록이 없는 것으로 본다.
 *
 * @param prev 저장된 일일 기록 또는 null
 * @param date 오늘의 도전 날짜
 * @param score 그날의 점수(정답 수)
 * @returns 새 일일 기록 { last, streak, max, history }
 */
export function nextDailyRecord(prev, date, score) {
  const valid = isValid(prev);
  if (valid && prev.last >= date) return prev;
  const streak = valid && prev.last === previousDate(date) ? prev.streak + 1 : 1;
  const history = { ...(valid ? prev.history : {}), [date]: score };
  const keep = Object.keys(history).sort().slice(-HISTORY_MAX);
  return {
    last: date,
    streak,
    max: Math.max(valid ? prev.max : 0, streak),
    history: Object.fromEntries(keep.map((key) => [key, history[key]])),
  };
}

/**
 * 오늘 기준으로 이어지고 있는 연속 일수를 구한다. 어제나 오늘 했을 때만 이어진다.
 *
 * @param record 저장된 일일 기록 또는 null
 * @param today 오늘 날짜
 * @returns 연속 일수, 끊겼으면 0
 */
export function currentStreak(record, today) {
  if (!isValid(record) || !today) return 0;
  return record.last === today || record.last === previousDate(today) ? record.streak : 0;
}