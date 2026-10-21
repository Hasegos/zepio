import { arpeggio, bars, createSynth } from "../_shared/audio.js";

const alternate = (a, b) => Array.from({ length: 4 }, () => [[a, 0.5], [b, 0.5]]).flat();
const pulse = (note) => Array.from({ length: 8 }, () => [note, 0.5]);

export const TRACKS = {
  hall: {
    bpm: 100,
    lead: { wave: "triangle", gain: 0.04, notes: bars([
      [["E5", 1], [null, 1], ["B4", 1], [null, 1]], [["G5", 1], [null, 1], ["E5", 1], [null, 1]], [["D5", 1], [null, 1], ["A4", 1], [null, 1]], [["F#5", 1], [null, 1], ["D5", 1], [null, 1]],
      [["E5", 1], [null, 1], ["B4", 1], [null, 1]], [["G5", 1], [null, 1], ["B5", 1], [null, 1]], [["A5", 1], [null, 1], ["F#5", 1], [null, 1]], [["E5", 2], [null, 2]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["E2", 1], ["E2", 1], ["B2", 1], ["E2", 1]], [["C3", 1], ["C3", 1], ["G2", 1], ["C3", 1]], [["D3", 1], ["D3", 1], ["A2", 1], ["D3", 1]], [["B2", 1], ["B2", 1], ["F#2", 1], ["B2", 1]],
      [["E2", 1], ["E2", 1], ["B2", 1], ["E2", 1]], [["C3", 1], ["C3", 1], ["G2", 1], ["C3", 1]], [["A2", 1], ["A2", 1], ["E3", 1], ["A2", 1]], [["E2", 4]],
    ]) },
  },
  alert: {
    bpm: 132,
    lead: { wave: "sawtooth", gain: 0.03, notes: bars([
      alternate("E5", "B4"), alternate("F5", "B4"), alternate("E5", "B4"),
      [["G5", 0.5], ["B4", 0.5], ["G5", 0.5], ["B4", 0.5], ["F5", 0.5], ["B4", 0.5], ["E5", 0.5], ["B4", 0.5]],
      alternate("E5", "B4"), alternate("F5", "B4"), alternate("E5", "B4"),
      [["G5", 0.5], ["B4", 0.5], ["G5", 0.5], ["B4", 0.5], ["F5", 0.5], ["B4", 0.5], ["E5", 0.5], ["B4", 0.5]],
    ]) },
    bass: { wave: "triangle", gain: 0.07, notes: bars([
      pulse("E2"), pulse("F2"), pulse("E2"), [["E2", 2], ["F2", 2]],
      pulse("E2"), pulse("F2"), pulse("E2"), [["E2", 2], ["F2", 2]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  place: [{ wave: "square", from: 520, to: 700, dur: 0.06, gain: 0.045 }],
  remove: [{ wave: "triangle", from: 400, to: 200, dur: 0.1, gain: 0.05 }, { noise: true, dur: 0.05, gain: 0.03 }],
  nope: [{ wave: "triangle", from: 250, to: 200, dur: 0.12, gain: 0.04 }],
  good: arpeggio(["E5", "G5", "B5"], 0.22),
};

/**
 * Rack Tycoon의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}