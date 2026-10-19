import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameData, loadRecords, saveResult } from "./storage.js";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("storage", () => {
  it("저장된 것이 없으면 빈 기록이다", () => {
    expect(loadRecords()).toEqual({ v: 1, games: {}, recent: [] });
    expect(getGameData("a")).toBeNull();
  });

  it("결과를 저장하면 횟수와 마지막 시간과 데이터가 남는다", () => {
    expect(saveResult("a", 1000, { best: 3 })).toEqual({ plays: 1, saved: true });
    expect(saveResult("a", 2000, { best: 4 })).toEqual({ plays: 2, saved: true });
    expect(loadRecords().games.a).toEqual({ plays: 2, lastAt: 2000, data: { best: 4 } });
    expect(getGameData("a")).toEqual({ best: 4 });
  });

  it("최근 목록은 중복 없이 최신이 앞이고 5개까지만 남긴다", () => {
    for (const id of ["a", "b", "c", "d", "e", "f", "a"]) saveResult(id, 1, null);
    expect(loadRecords().recent).toEqual(["a", "f", "e", "d", "c"]);
  });

  it("깨진 JSON이나 다른 버전이나 잘못된 모양이면 빈 기록으로 시작한다", () => {
    for (const raw of ["{broken", JSON.stringify({ v: 2, games: {}, recent: [] }), '{"v":1,"games":null,"recent":[]}']) {
      localStorage.setItem("zepio:v1", raw);
      expect(loadRecords()).toEqual({ v: 1, games: {}, recent: [] });
    }
  });

  it("잘못 저장된 횟수는 0으로 보고 이어간다", () => {
    localStorage.setItem("zepio:v1", JSON.stringify({ v: 1, games: { a: { plays: "x" } }, recent: [] }));
    expect(saveResult("a", 5, null).plays).toBe(1);
  });

  it("저장소를 읽거나 쓸 수 없어도 예외를 던지지 않는다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(loadRecords().games).toEqual({});
    expect(saveResult("a", 1, { best: 1 })).toEqual({ plays: 1, saved: false });
  });
});