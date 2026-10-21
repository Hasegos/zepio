import { arpeggio, bars, createSynth } from "../_shared/audio.js";

export const TRACKS = {
  play: {
    bpm: 100,
    lead: { wave: "square", gain: 0.025, notes: bars([
      [["A4", 0.5], ["C5", 0.5], ["E5", 0.5], ["A5", 0.5], ["E5", 0.5], ["C5", 0.5], ["A4", 1]],
      [["G4", 0.5], ["B4", 0.5], ["D5", 0.5], ["G5", 0.5], ["D5", 0.5], ["B4", 0.5], ["G4", 1]],
      [["F4", 0.5], ["A4", 0.5], ["C5", 0.5], ["F5", 0.5], ["C5", 0.5], ["A4", 0.5], ["F4", 1]],
      [["E4", 0.5], ["G#4", 0.5], ["B4", 0.5], ["E5", 0.5], ["B4", 0.5], ["G#4", 0.5], ["E4", 1]],
      [["A4", 0.5], ["C5", 0.5], ["E5", 0.5], ["A5", 0.5], ["G5", 0.5], ["E5", 0.5], ["C5", 1]],
      [["D5", 0.5], ["F5", 0.5], ["A5", 0.5], ["F5", 0.5], ["D5", 0.5], ["A4", 0.5], ["D5", 1]],
      [["E5", 0.5], ["G#5", 0.5], ["B5", 0.5], ["G#5", 0.5], ["E5", 0.5], ["B4", 0.5], ["E5", 1]],
      [["A4", 2], ["E5", 1], ["A4", 1]],
    ]) },
    bass: { wave: "triangle", gain: 0.06, notes: bars([
      [["A2", 2], ["E3", 2]], [["G2", 2], ["D3", 2]], [["F2", 2], ["C3", 2]], [["E2", 2], ["B2", 2]],
      [["A2", 2], ["E3", 2]], [["D3", 2], ["A2", 2]], [["E3", 2], ["B2", 2]], [["A2", 4]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  tick: [{ wave: "triangle", from: 520, to: 520, dur: 0.04, gain: 0.04 }],
  correct: arpeggio(["C5", "E5", "G5", "C6"], 0.36),
  wrong: [{ wave: "sawtooth", from: 200, to: 90, dur: 0.3, gain: 0.05 }],
};

/**
 * Pattern Challenge의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}