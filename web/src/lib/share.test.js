import { describe, expect, it, vi } from "vitest";
import { shareResult, withUrl } from "./share.js";

const payload = { title: "제목", text: "글", url: "https://example.com/g/" };

describe("shareResult", () => {
  it("공유 창이 있으면 공유한다", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    expect(await shareResult(payload, { share })).toBe("shared");
    expect(share).toHaveBeenCalledWith(payload);
  });

  it("사용자가 공유 창을 닫으면 복사로 넘어가지 않는다", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" }));
    const writeText = vi.fn();
    expect(await shareResult(payload, { share, clipboard: { writeText } })).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("공유 창이 없으면 글과 주소를 복사한다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareResult(payload, { clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("글\nhttps://example.com/g/");
  });

  it("공유가 다른 이유로 실패하면 복사한다", async () => {
    const share = vi.fn().mockRejectedValue(new Error("not allowed"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareResult(payload, { share, clipboard: { writeText } })).toBe("copied");
  });

  it("복사도 안 되면 직접 복사하게 한다", async () => {
    expect(await shareResult(payload, {})).toBe("manual");
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    expect(await shareResult(payload, { clipboard: { writeText } })).toBe("manual");
  });

  it("글과 주소를 줄바꿈으로 잇는다", () => {
    expect(withUrl("a", "b")).toBe("a\nb");
  });
});