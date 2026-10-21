import { arpeggio, bars, createSynth } from "../_shared/audio.js";

export const TRACKS = {
  menu: {
    bpm: 88,
    lead: { wave: "triangle", gain: 0.055, notes: bars([
      [["F5", 2], ["A5", 1], ["F5", 1]], [["E5", 2], ["C5", 2]], [["D5", 2], ["F5", 1], ["A5", 1]], [["G5", 3], [null, 1]],
      [["A5", 2], ["C6", 1], ["A5", 1]], [["G5", 2], ["E5", 2]], [["F5", 1], ["E5", 1], ["D5", 1], ["C5", 1]], [["F5", 3], [null, 1]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["F2", 2], ["C3", 2]], [["C3", 2], ["G2", 2]], [["Bb2", 2], ["F3", 2]], [["C3", 2], ["G3", 2]],
      [["F2", 2], ["C3", 2]], [["C3", 2], ["E3", 2]], [["Bb2", 2], ["C3", 2]], [["F2", 4]],
    ]) },
  },
  play: {
    bpm: 104,
    lead: { wave: "square", gain: 0.025, notes: bars([
      [["F5", 0.5], ["A5", 0.5], ["C6", 0.5], ["A5", 0.5], ["F5", 1], ["C5", 1]],
      [["E5", 0.5], ["G5", 0.5], ["C6", 0.5], ["G5", 0.5], ["E5", 1], ["C5", 1]],
      [["D5", 0.5], ["F5", 0.5], ["Bb5", 0.5], ["F5", 0.5], ["D5", 1], ["Bb4", 1]],
      [["C5", 1], ["E5", 1], ["G5", 2]],
      [["A5", 0.5], ["C6", 0.5], ["F6", 0.5], ["C6", 0.5], ["A5", 1], ["F5", 1]],
      [["G5", 0.5], ["E5", 0.5], ["C5", 0.5], ["E5", 0.5], ["G5", 1], ["C6", 1]],
      [["Bb5", 0.5], ["A5", 0.5], ["G5", 0.5], ["F5", 0.5], ["E5", 1], ["D5", 1]],
      [["F5", 3], [null, 1]],
    ]) },
    bass: { wave: "triangle", gain: 0.06, notes: bars([
      [["F2", 1], ["C3", 1], ["F2", 1], ["C3", 1]], [["C3", 1], ["G3", 1], ["C3", 1], ["G3", 1]], [["Bb2", 1], ["F3", 1], ["Bb2", 1], ["F3", 1]], [["C3", 1], ["G3", 1], ["C3", 1], ["G3", 1]],
      [["F2", 1], ["C3", 1], ["F2", 1], ["C3", 1]], [["C3", 1], ["G3", 1], ["C3", 1], ["G3", 1]], [["Bb2", 1], ["F3", 1], ["C3", 1], ["G2", 1]], [["F2", 3], [null, 1]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  tick: [{ wave: "triangle", from: 520, to: 520, dur: 0.04, gain: 0.04 }],
  build: [{ wave: "triangle", from: 330, to: 520, dur: 0.08, gain: 0.06 }, { wave: "square", from: 988, to: 988, dur: 0.1, gain: 0.04, at: 0.08 }],
  lose: [{ wave: "triangle", from: 300, to: 180, dur: 0.15, gain: 0.05 }],
  demolish: [{ noise: true, dur: 0.18, gain: 0.05 }, { wave: "sawtooth", from: 200, to: 80, dur: 0.2, gain: 0.04 }],
  clear: arpeggio(["F5", "A5", "C6", "F6"], 0.4),
};

/**
 * Tiny Isle의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}