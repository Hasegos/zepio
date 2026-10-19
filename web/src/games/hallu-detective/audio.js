import { bars, createSynth, noteFreq } from "../audio.js";

const arpeggio = (notes, last) => notes.map((n, i) => ({ wave: "square", from: noteFreq(n), to: noteFreq(n), dur: i === notes.length - 1 ? last : 0.1, gain: 0.05, at: i * 0.1 }));

export const TRACKS = {
  office: {
    bpm: 88,
    lead: { wave: "triangle", gain: 0.05, notes: bars([
      [["D5", 1], ["F5", 1], ["A5", 1], ["G5", 1]], [["F5", 2], ["E5", 2]],
      [["D5", 1], ["F5", 1], ["A5", 1], ["C6", 1]], [["A5", 3], [null, 1]],
      [["Bb4", 1], ["D5", 1], ["F5", 1], ["E5", 1]], [["D5", 2], ["C5", 2]],
      [["A4", 1], ["C5", 1], ["E5", 1], ["G5", 1]], [["F5", 3], [null, 1]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["D3", 2], ["A2", 2]], [["Bb2", 2], ["F3", 2]], [["G2", 2], ["D3", 2]], [["A2", 2], ["E3", 2]],
      [["Bb2", 4]], [["C3", 2], ["G2", 2]], [["A2", 2], ["E3", 2]], [["D3", 4]],
    ]) },
  },
  puzzle: {
    bpm: 100,
    lead: { wave: "square", gain: 0.03, notes: bars([
      [["A4", 1], [null, 1], ["C5", 1], [null, 1]], [["E5", 1], [null, 1], ["D5", 1], ["C5", 1]],
      [["B4", 1], [null, 1], ["D5", 1], [null, 1]], [["C5", 2], ["A4", 2]],
      [["A4", 1], [null, 1], ["C5", 1], [null, 1]], [["F5", 1], [null, 1], ["E5", 1], ["D5", 1]],
      [["E5", 1], ["D5", 1], ["C5", 1], ["B4", 1]], [["A4", 4]],
    ]) },
    bass: { wave: "triangle", gain: 0.07, notes: bars([
      [["A2", 2], ["E3", 2]], [["A2", 2], ["E3", 2]], [["G2", 2], ["D3", 2]], [["A2", 2], ["E3", 2]],
      [["A2", 2], ["E3", 2]], [["D3", 2], ["A2", 2]], [["E3", 2], ["B2", 2]], [["A2", 4]],
    ]) },
  },
  ending: {
    bpm: 80,
    lead: { wave: "sine", gain: 0.07, notes: bars([
      [["E5", 2], ["G5", 2]], [["C6", 2], ["B5", 2]], [["A5", 2], ["G5", 2]], [["E5", 4]],
      [["F5", 2], ["A5", 2]], [["D6", 2], ["C6", 2]], [["B5", 2], ["G5", 2]], [["C6", 4]],
    ]) },
    bass: { wave: "triangle", gain: 0.06, notes: bars([
      [["C3", 4]], [["G2", 4]], [["A2", 4]], [["E3", 4]],
      [["F2", 4]], [["D3", 4]], [["G2", 4]], [["C3", 4]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  tick: [{ wave: "triangle", from: 520, to: 520, dur: 0.04, gain: 0.04 }],
  correct: arpeggio(["C5", "E5", "G5", "C6"], 0.36),
  wrong: [{ wave: "sawtooth", from: 200, to: 90, dur: 0.3, gain: 0.05 }],
  coin: [{ wave: "square", from: 988, to: 988, dur: 0.06, gain: 0.045 }, { wave: "square", from: 1319, to: 1319, dur: 0.16, gain: 0.045, at: 0.07 }],
  hint: [{ wave: "sine", from: 880, to: 1320, dur: 0.25, gain: 0.05 }],
};

/**
 * 환각 탐정의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(시험에서 Context와 타이머를 바꾼다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}