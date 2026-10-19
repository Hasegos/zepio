import { describe, expect, it } from "vitest";
import { currentStreak, kstDate, nextDailyRecord, previousDate } from "./daily.js";

describe("kstDate", () => {
  it("UTC 15시를 넘으면 KST 다음 날이 된다", () => {
    expect(kstDate(Date.UTC(2026, 9, 19, 14, 59, 59))).toBe("2026-10-19");
    expect(kstDate(Date.UTC(2026, 9, 19, 15, 0, 0))).toBe("2026-10-20");
    expect(kstDate(Date.UTC(2026, 11, 31, 15, 0, 0))).toBe("2027-01-01");
  });
});

describe("previousDate", () => {
  it("달, 해, 윤년 경계를 넘는다", () => {
    expect(previousDate("2026-10-19")).toBe("2026-10-18");
    expect(previousDate("2026-11-01")).toBe("2026-10-31");
    expect(previousDate("2027-01-01")).toBe("2026-12-31");
    expect(previousDate("2028-03-01")).toBe("2028-02-29");
  });
});

describe("nextDailyRecord", () => {
  it("첫 기록은 연속 1일이다", () => {
    expect(nextDailyRecord(null, "2026-10-19", 4)).toEqual({
      last: "2026-10-19",
      streak: 1,
      max: 1,
      history: { "2026-10-19": 4 },
    });
  });

  it("어제 이어서 하면 늘리고 건너뛰면 1로 돌아가며 최고 연속은 유지한다", () => {
    let record = nextDailyRecord(null, "2026-10-17", 3);
    record = nextDailyRecord(record, "2026-10-18", 5);
    record = nextDailyRecord(record, "2026-10-19", 2);
    expect(record).toMatchObject({ streak: 3, max: 3 });
    record = nextDailyRecord(record, "2026-10-21", 4);
    expect(record).toMatchObject({ last: "2026-10-21", streak: 1, max: 3 });
  });

  it("같은 날짜나 이전 날짜는 기록을 바꾸지 않는다", () => {
    const record = nextDailyRecord(null, "2026-10-19", 4);
    expect(nextDailyRecord(record, "2026-10-19", 1)).toBe(record);
    expect(nextDailyRecord(record, "2026-10-18", 1)).toBe(record);
  });

  it("기록은 최근 60일만 남긴다", () => {
    let record = null;
    for (let day = 0; day < 70; day += 1) {
      record = nextDailyRecord(record, new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10), day);
    }
    expect(Object.keys(record.history)).toHaveLength(60);
    expect(record.streak).toBe(70);
  });

  it("깨진 저장 값은 기록이 없는 것으로 본다", () => {
    expect(nextDailyRecord({ last: 5 }, "2026-10-19", 1).streak).toBe(1);
    const brokenDate = { last: "zzz", streak: 9, max: 9, history: {} };
    expect(nextDailyRecord(brokenDate, "2026-10-19", 1)).toMatchObject({ last: "2026-10-19", streak: 1 });
    expect(currentStreak(brokenDate, "2026-10-19")).toBe(0);
    expect(nextDailyRecord({ last: "2026-10-18", streak: 2, max: 2, history: null }, "2026-10-19", 1).streak).toBe(1);
  });
});

describe("currentStreak", () => {
  const record = { last: "2026-10-18", streak: 4, max: 6, history: {} };

  it("오늘이나 어제까지 했으면 이어지고 그보다 오래되면 0이다", () => {
    expect(currentStreak(record, "2026-10-18")).toBe(4);
    expect(currentStreak(record, "2026-10-19")).toBe(4);
    expect(currentStreak(record, "2026-10-20")).toBe(0);
    expect(currentStreak(null, "2026-10-20")).toBe(0);
    expect(currentStreak(record, "")).toBe(0);
  });
});