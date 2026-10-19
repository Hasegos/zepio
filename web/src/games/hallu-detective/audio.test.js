import { describe, expect, it, vi } from "vitest";
import { createAudio, SFX, TRACKS } from "./audio.js";
import { noteFreq } from "../audio.js";

describe("환각 탐정 소리", () => {
  it("곡은 사무소, 퍼즐, 엔딩이고 두 성부의 길이가 같다", () => {
    expect(Object.keys(TRACKS).sort()).toEqual(["ending", "office", "puzzle"]);
    for (const [name, track] of Object.entries(TRACKS)) {
      const beats = (voice) => voice.notes.reduce((sum, [, b]) => sum + b, 0);
      expect(beats(track.lead), name).toBe(beats(track.bass));
      for (const [note] of [...track.lead.notes, ...track.bass.notes]) if (note !== null) expect(noteFreq(note), `${name} ${note}`).toBeGreaterThan(0);
    }
  });

  it("효과음 이름이 모두 있고 조각마다 길이와 크기가 있다", () => {
    expect(Object.keys(SFX).sort()).toEqual(["coin", "correct", "hint", "select", "tick", "wrong"]);
    for (const parts of Object.values(SFX)) for (const part of parts) expect(part.dur && part.gain).toBeTruthy();
  });

  it("컨트롤러는 소리를 열기 전에는 아무것도 만들지 않고, 모르는 이름은 무시한다", () => {
    const Context = vi.fn();
    const audio = createAudio({ Context, setTimer: vi.fn(), clearTimer: vi.fn() });
    audio.music("office");
    audio.music("nope");
    audio.sfx("correct");
    audio.sfx("nope");
    expect(Context).not.toHaveBeenCalled();
  });
});