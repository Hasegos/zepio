import { describe, expect, it, vi } from "vitest";
import { noteFreq } from "../audio.js";
import { createAudio, SFX, TRACKS } from "./audio.js";
import { dailyLevelId } from "./daily.js";
import { LEVELS } from "./levels.js";
import { mergeStars, readData, summarize } from "./record.js";
import { fortressShareText } from "./share-text.js";

describe("오늘의 방", () => {
  it("날짜마다 방이 12일 주기로 돌아간다", () => {
    expect(dailyLevelId("2026-10-20")).toBe("r11");
    expect(dailyLevelId("2026-10-21")).toBe("r12");
    expect(dailyLevelId("2026-10-22")).toBe("r01");
    expect(dailyLevelId("2026-11-03")).toBe("r01");
    const ids = new Set(Array.from({ length: 12 }, (_, i) => dailyLevelId(`2026-12-${String(i + 1).padStart(2, "0")}`)));
    expect(ids.size).toBe(12);
  });
});

describe("저장 데이터", () => {
  it("모르는 방과 범위를 벗어난 별은 버리고 깨진 값은 처음으로 돌린다", () => {
    expect(readData(null)).toEqual({ v: 1, stars: {}, muted: false });
    expect(readData({ v: 2, stars: { r01: 3 } }).stars).toEqual({});
    expect(readData({ v: 1, stars: { r01: 3, r02: 0, r03: 4, r04: 1.5, zzz: 2 }, muted: true })).toEqual({ v: 1, stars: { r01: 3 }, muted: true });
    expect(readData({ v: 1, stars: [3] }).stars).toEqual({});
  });

  it("합칠 때 별은 낮아지지 않고 소리 설정은 유지된다", () => {
    const prev = { v: 1, stars: { r01: 3, r02: 1 }, muted: true };
    expect(mergeStars(prev, { r01: 1, r02: 2, r03: 0, r04: 1 })).toEqual({ v: 1, stars: { r01: 3, r02: 2, r04: 1 }, muted: true });
  });

  it("홈 요약은 깬 방 수와 별 합계를 보여 주고 기록이 없으면 비어 있다", () => {
    expect(summarize(null)).toBe("");
    expect(summarize({ v: 1, stars: { r01: 3, r02: 2 } })).toBe(`2/${LEVELS.length}방 · ★5`);
  });
});

describe("공유 글", () => {
  it("방 이름과 별만 담고 오늘의 방은 날짜를 붙인다", () => {
    expect(fortressShareText(LEVELS[0], 2)).toBe("Zepio 프롬프트 요새\n첫 근무: 직접 요청 ★★☆");
    expect(fortressShareText(LEVELS[10], 3, "2026-10-20")).toBe("Zepio 프롬프트 요새\n오늘의 방 2026-10-20 · 가짜 알림 소동 ★★★");
  });
});

describe("소리", () => {
  it("곡은 방 목록과 방 화면이고 두 성부의 길이가 같다", () => {
    expect(Object.keys(TRACKS).sort()).toEqual(["level", "menu"]);
    for (const [name, track] of Object.entries(TRACKS)) {
      const beats = (voice) => voice.notes.reduce((sum, [, b]) => sum + b, 0);
      expect(beats(track.lead), name).toBe(beats(track.bass));
      for (const [note] of [...track.lead.notes, ...track.bass.notes]) if (note !== null) expect(noteFreq(note), `${name} ${note}`).toBeGreaterThan(0);
    }
  });

  it("효과음 이름이 모두 있고 조각마다 길이와 크기가 있다", () => {
    expect(Object.keys(SFX).sort()).toEqual(["block", "breach", "clear", "fail", "pass", "select", "start", "tick"]);
    for (const parts of Object.values(SFX)) for (const part of parts) expect(part.dur && part.gain).toBeTruthy();
  });

  it("컨트롤러는 소리를 열기 전에는 아무것도 만들지 않고 모르는 이름은 무시한다", () => {
    const Context = vi.fn();
    const audio = createAudio({ Context, setTimer: vi.fn(), clearTimer: vi.fn() });
    audio.music("menu");
    audio.music("nope");
    audio.sfx("clear");
    audio.sfx("nope");
    expect(Context).not.toHaveBeenCalled();
  });
});