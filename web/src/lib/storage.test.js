import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRecords, getDaily, getGameData, loadRecords, saveDaily, saveGameData, saveResult } from "./storage.js";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("storage", () => {
  it("저장된 것이 없으면 빈 기록이다", () => {
    expect(loadRecords()).toEqual({ v: 1, games: {}, recent: [], daily: {} });
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
      expect(loadRecords()).toEqual({ v: 1, games: {}, recent: [], daily: {} });
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

  it("진행 상황 저장은 플레이 횟수를 올리지 않고 데이터, 시간, 최근 목록만 갱신한다", () => {
    expect(saveGameData("a", 100, { coins: 1 })).toBe(true);
    expect(loadRecords().games.a).toEqual({ plays: 1, lastAt: 100, data: { coins: 1 } });
    saveGameData("a", 200, { coins: 2 });
    saveGameData("a", 300, { coins: 3 });
    expect(loadRecords().games.a).toEqual({ plays: 1, lastAt: 300, data: { coins: 3 } });
    saveResult("b", 1, null);
    saveGameData("a", 400, { coins: 4 });
    expect(loadRecords().recent).toEqual(["a", "b"]);
    saveResult("a", 500, { coins: 5 });
    expect(loadRecords().games.a.plays).toBe(2);
    saveGameData("a", 600, { coins: 6 });
    expect(loadRecords().games.a.plays).toBe(2);
  });

  it("진행 상황 저장도 저장소를 쓸 수 없으면 false를 돌려주고 던지지 않는다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveGameData("a", 1, { coins: 1 })).toBe(false);
  });

  it("일일 기록을 게임별로 저장하고, 결과 저장이 일일 기록을 지우지 않는다", () => {
    expect(getDaily("a")).toBeNull();
    expect(saveDaily("a", { last: "2026-10-19", streak: 1, max: 1, history: {} })).toBe(true);
    saveResult("a", 1, { best: 1 });
    expect(getDaily("a")).toEqual({ last: "2026-10-19", streak: 1, max: 1, history: {} });
    expect(getDaily("b")).toBeNull();
  });

  it("daily 없이 저장된 이전 기록도 읽고 daily가 잘못된 모양이면 빈 값으로 본다", () => {
    localStorage.setItem("zepio:v1", JSON.stringify({ v: 1, games: { a: { plays: 2 } }, recent: [] }));
    expect(loadRecords().daily).toEqual({});
    expect(loadRecords().games.a.plays).toBe(2);
    localStorage.setItem("zepio:v1", JSON.stringify({ v: 1, games: {}, recent: [], daily: [1] }));
    expect(loadRecords().daily).toEqual({});
  });

  it("일일 기록 저장도 저장소를 쓸 수 없으면 false를 돌려준다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveDaily("a", { last: "x", streak: 1, max: 1, history: {} })).toBe(false);
  });

  it("기록 지우기는 게임 기록과 일일 기록을 모두 지우고, 저장소를 못 써도 오류가 없다", () => {
    saveResult("a", 1, { best: 1 });
    saveDaily("a", { last: "2026-10-19", streak: 1, max: 1, history: {} });
    expect(clearRecords()).toBe(true);
    expect(localStorage.getItem("zepio:v1")).toBeNull();
    expect(loadRecords()).toEqual({ v: 1, games: {}, recent: [], daily: {} });

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(clearRecords()).toBe(false);
  });
});
