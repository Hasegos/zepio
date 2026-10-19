import { describe, expect, it, vi } from "vitest";
import day from "../../../public/data/daily/2026-10-19.json";
import { fetchDaily } from "./daily.js";

const reply = (body, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body });

describe("fetchDaily", () => {
  it("올바른 파일이면 문제 5개를 돌려주고 날짜별 주소로 요청한다", async () => {
    const fetchImpl = reply(day);
    const signal = new AbortController().signal;
    expect(await fetchDaily("2026-10-19", signal, fetchImpl)).toHaveLength(5);
    expect(fetchImpl).toHaveBeenCalledWith("/data/daily/2026-10-19.json", {
      signal: expect.any(AbortSignal),
    });
  });

  it("404나 요청 실패나 JSON 오류면 null이다", async () => {
    expect(await fetchDaily("2026-10-19", undefined, reply(null, false))).toBeNull();
    expect(await fetchDaily("2026-10-19", undefined, vi.fn().mockRejectedValue(new Error("offline")))).toBeNull();
    const badJson = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("bad");
      },
    });
    expect(await fetchDaily("2026-10-19", undefined, badJson)).toBeNull();
  });

  it("날짜가 다르거나 문제 수가 5개가 아니거나 문제 모양이 틀리면 null이다", async () => {
    expect(await fetchDaily("2026-10-20", undefined, reply(day))).toBeNull();
    expect(await fetchDaily("2026-10-19", undefined, reply({ ...day, puzzles: day.puzzles.slice(1) }))).toBeNull();
    const brokenOptions = { ...day, puzzles: [{ ...day.puzzles[0], options: [] }, ...day.puzzles.slice(1)] };
    expect(await fetchDaily("2026-10-19", undefined, reply(brokenOptions))).toBeNull();
    const noBlank = { ...day, puzzles: [{ ...day.puzzles[0], cells: [{ n: 1 }, { n: 2 }] }, ...day.puzzles.slice(1)] };
    expect(await fetchDaily("2026-10-19", undefined, reply(noBlank))).toBeNull();
    expect(await fetchDaily("2026-10-19", undefined, reply("text"))).toBeNull();
  });

  it("요청이 취소되면 null이다", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    expect(await fetchDaily("2026-10-19", controller.signal, fetchImpl)).toBeNull();
  });
});