import { describe, expect, it } from "vitest";
import { formatDuration } from "./time.js";

describe("formatDuration", () => {
  it("밀리초를 mm:ss로 바꾸고 음수는 0으로 본다", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65_000)).toBe("01:05");
    expect(formatDuration(3_600_000)).toBe("60:00");
    expect(formatDuration(-5)).toBe("00:00");
  });
});
