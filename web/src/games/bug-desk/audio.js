import { arpeggio, bars, createSynth } from "../_shared/audio.js";

export const TRACKS = {
  play: {
    bpm: 124,
    lead: { wave: "sawtooth", gain: 0.022, notes: bars([
      [["E5", 0.5], ["E5", 0.5], ["G#5", 0.5], ["E5", 0.5], ["B4", 0.5], ["E5", 0.5], ["G#5", 1]],
      [["A4", 0.5], ["A4", 0.5], ["C#5", 0.5], ["A4", 0.5], ["E5", 0.5], ["A4", 0.5], ["C#5", 1]],
      [["B4", 0.5], ["B4", 0.5], ["D#5", 0.5], ["B4", 0.5], ["F#5", 0.5], ["B4", 0.5], ["D#5", 1]],
      [["E5", 1], ["G#5", 1], ["B5", 2]],
      [["C#5", 0.5], ["C#5", 0.5], ["E5", 0.5], ["C#5", 0.5], ["G#5", 0.5], ["C#5", 0.5], ["E5", 1]],
      [["A4", 0.5], ["A4", 0.5], ["C#5", 0.5], ["A4", 0.5], ["E5", 0.5], ["A4", 0.5], ["C#5", 1]],
      [["B4", 1], ["D#5", 1], ["F#5", 1], ["B5", 1]],
      [["E5", 2], ["B4", 1], ["E5", 1]],
    ]) },
    bass: { wave: "triangle", gain: 0.06, notes: bars([
      [["E3", 1], ["E3", 1], ["B2", 1], ["B2", 1]], [["A2", 1], ["A2", 1], ["E3", 1], ["E3", 1]], [["B2", 1], ["B2", 1], ["F#3", 1], ["F#3", 1]], [["E3", 2], ["B2", 2]],
      [["C#3", 1], ["C#3", 1], ["G#2", 1], ["G#2", 1]], [["A2", 1], ["A2", 1], ["E3", 1], ["E3", 1]], [["B2", 1], ["B2", 1], ["F#3", 1], ["F#3", 1]], [["E3", 2], ["B2", 1], ["E3", 1]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  stamp: [{ noise: true, dur: 0.06, gain: 0.05 }, { wave: "triangle", from: 180, to: 120, dur: 0.08, gain: 0.06 }],
  correct: arpeggio(["C5", "E5", "G5", "C6"], 0.36),
  wrong: [{ wave: "sawtooth", from: 200, to: 90, dur: 0.3, gain: 0.05 }],
};

/**
 * 버그 접수처의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}