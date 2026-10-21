import { arpeggio, bars, createSynth } from "../_shared/audio.js";

export const TRACKS = {
  play: {
    bpm: 108,
    lead: { wave: "triangle", gain: 0.05, notes: bars([
      [["D5", 0.5], [null, 0.5], ["D5", 0.5], [null, 0.5], ["G5", 1], ["D5", 1]], [["C5", 0.5], [null, 0.5], ["C5", 0.5], [null, 0.5], ["F5", 1], ["C5", 1]],
      [["Bb4", 0.5], [null, 0.5], ["Bb4", 0.5], [null, 0.5], ["Eb5", 1], ["Bb4", 1]], [["A4", 1], ["C5", 1], ["D5", 2]],
      [["G5", 0.5], [null, 0.5], ["G5", 0.5], [null, 0.5], ["F5", 1], ["D5", 1]], [["Eb5", 0.5], [null, 0.5], ["Eb5", 0.5], [null, 0.5], ["D5", 1], ["C5", 1]],
      [["Bb4", 1], ["C5", 1], ["D5", 1], ["F#5", 1]], [["G5", 3], [null, 1]],
    ]) },
    bass: { wave: "sine", gain: 0.07, notes: bars([
      [["G2", 2], ["D3", 2]], [["F2", 2], ["C3", 2]], [["Eb2", 2], ["Bb2", 2]], [["D3", 2], ["A2", 2]],
      [["G2", 2], ["D3", 2]], [["C3", 2], ["G2", 2]], [["D3", 2], ["A2", 2]], [["G2", 4]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  tick: [{ wave: "triangle", from: 520, to: 520, dur: 0.04, gain: 0.04 }],
  pass: [{ wave: "square", from: 988, to: 988, dur: 0.06, gain: 0.04 }, { wave: "square", from: 1319, to: 1319, dur: 0.12, gain: 0.04, at: 0.07 }],
  block: [{ wave: "triangle", from: 260, to: 200, dur: 0.12, gain: 0.05 }],
  correct: arpeggio(["C5", "E5", "G5", "C6"], 0.36),
  wrong: [{ wave: "sawtooth", from: 200, to: 90, dur: 0.3, gain: 0.05 }],
};

/**
 * Hidden Rule의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}