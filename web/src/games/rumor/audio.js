import { arpeggio, bars, createSynth } from "../_shared/audio.js";

export const TRACKS = {
  play: {
    bpm: 120,
    lead: { wave: "triangle", gain: 0.045, notes: bars([
      [["E5", 0.5], ["E5", 0.5], [null, 1], ["G5", 0.5], ["E5", 0.5], [null, 1]], [["D5", 0.5], ["D5", 0.5], [null, 1], ["F#5", 0.5], ["D5", 0.5], [null, 1]],
      [["C5", 0.5], ["C5", 0.5], [null, 1], ["E5", 0.5], ["C5", 0.5], [null, 1]], [["B4", 1], ["D5", 1], ["E5", 2]],
      [["G5", 0.5], ["G5", 0.5], [null, 1], ["E5", 0.5], ["G5", 0.5], [null, 1]], [["F#5", 0.5], ["F#5", 0.5], [null, 1], ["D5", 0.5], ["F#5", 0.5], [null, 1]],
      [["E5", 0.5], ["E5", 0.5], ["G5", 0.5], ["B5", 0.5], ["A5", 1], ["G5", 1]], [["E5", 3], [null, 1]],
    ]) },
    bass: { wave: "sine", gain: 0.07, notes: bars([
      [["E3", 2], ["B2", 2]], [["D3", 2], ["A2", 2]], [["C3", 2], ["G2", 2]], [["B2", 2], ["E3", 2]],
      [["E3", 2], ["B2", 2]], [["D3", 2], ["A2", 2]], [["C3", 2], ["D3", 2]], [["E3", 4]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  tick: [{ wave: "triangle", from: 520, to: 520, dur: 0.04, gain: 0.04 }],
  start: [{ wave: "sawtooth", from: 280, to: 560, dur: 0.25, gain: 0.03 }],
  pop: [{ wave: "sine", from: 700, to: 900, dur: 0.05, gain: 0.035 }],
  good: arpeggio(["C5", "E5", "G5", "C6"], 0.36),
  fail: [{ wave: "sawtooth", from: 200, to: 90, dur: 0.3, gain: 0.05 }],
};

/**
 * 소문 한 마디의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}