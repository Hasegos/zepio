import { bars, createSynth, noteFreq } from "../_shared/audio.js";

const arpeggio = (notes, last) => notes.map((n, i) => ({ wave: "square", from: noteFreq(n), to: noteFreq(n), dur: i === notes.length - 1 ? last : 0.1, gain: 0.05, at: i * 0.1 }));

export const TRACKS = {
  menu: {
    bpm: 96,
    lead: { wave: "triangle", gain: 0.055, notes: bars([
      [["E5", 2], ["C5", 1], ["A4", 1]], [["F5", 1.5], ["E5", 0.5], ["D5", 2]], [["G4", 1], ["B4", 1], ["D5", 2]], [["E5", 3], [null, 1]],
      [["E5", 2], ["C5", 1], ["A4", 1]], [["F5", 1], ["E5", 1], ["D5", 2]], [["C5", 1], ["B4", 1], ["A4", 1], ["G#4", 1]], [["A4", 4]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["A2", 2], ["E3", 2]], [["D3", 2], ["A2", 2]], [["G2", 2], ["D3", 2]], [["E3", 2], ["B2", 2]],
      [["A2", 2], ["E3", 2]], [["F2", 2], ["C3", 2]], [["E3", 2], ["E2", 2]], [["A2", 4]],
    ]) },
  },
  level: {
    bpm: 112,
    lead: { wave: "square", gain: 0.03, notes: bars([
      [["E5", 0.5], [null, 0.5], ["E5", 0.5], [null, 0.5], ["G5", 1], ["E5", 1]], [["D5", 0.5], [null, 0.5], ["D5", 0.5], [null, 0.5], ["F5", 1], ["D5", 1]],
      [["C5", 0.5], [null, 0.5], ["C5", 0.5], [null, 0.5], ["E5", 1], ["C5", 1]], [["B4", 1], ["D5", 1], ["E5", 2]],
      [["E5", 0.5], [null, 0.5], ["E5", 0.5], [null, 0.5], ["A5", 1], ["G5", 1]], [["F5", 0.5], [null, 0.5], ["F5", 0.5], [null, 0.5], ["A5", 1], ["F5", 1]],
      [["G5", 1], ["E5", 1], ["D5", 1], ["B4", 1]], [["A4", 4]],
    ]) },
    bass: { wave: "triangle", gain: 0.07, notes: bars([
      [["A2", 2], ["E3", 2]], [["D3", 2], ["A2", 2]], [["C3", 2], ["G2", 2]], [["E3", 2], ["B2", 2]],
      [["A2", 2], ["E3", 2]], [["F2", 2], ["C3", 2]], [["G2", 2], ["D3", 2]], [["A2", 4]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  tick: [{ wave: "triangle", from: 520, to: 520, dur: 0.04, gain: 0.04 }],
  start: arpeggio(["E5", "A5"], 0.18),
  block: [{ wave: "triangle", from: 330, to: 440, dur: 0.12, gain: 0.06 }],
  pass: [{ wave: "square", from: 988, to: 988, dur: 0.06, gain: 0.04 }, { wave: "square", from: 1319, to: 1319, dur: 0.12, gain: 0.04, at: 0.07 }],
  breach: [{ wave: "sawtooth", from: 220, to: 90, dur: 0.28, gain: 0.05 }],
  clear: arpeggio(["C5", "E5", "G5", "C6"], 0.36),
  fail: [{ wave: "sawtooth", from: 260, to: 110, dur: 0.4, gain: 0.05 }],
};

/**
 * 프롬프트 요새의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(시험에서 Context와 타이머를 바꾼다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}