import { arpeggio, bars, createSynth } from "../_shared/audio.js";

export const TRACKS = {
  menu: {
    bpm: 84,
    lead: { wave: "sine", gain: 0.06, notes: bars([
      [["E5", 2], ["G5", 1], ["E5", 1]], [["D5", 2], ["C5", 1], ["D5", 1]], [["E5", 2], ["G5", 1], ["A5", 1]], [["G5", 3], [null, 1]],
      [["A5", 2], ["G5", 1], ["E5", 1]], [["F5", 2], ["E5", 1], ["D5", 1]], [["E5", 1], ["D5", 1], ["C5", 2]], [["C5", 3], [null, 1]],
    ]) },
    bass: { wave: "triangle", gain: 0.06, notes: bars([
      [["C3", 2], ["G3", 2]], [["G2", 2], ["D3", 2]], [["A2", 2], ["E3", 2]], [["E3", 2], ["C3", 2]],
      [["F2", 2], ["C3", 2]], [["G2", 2], ["D3", 2]], [["C3", 2], ["E3", 2]], [["C3", 4]],
    ]) },
  },
  play: {
    bpm: 96,
    lead: { wave: "triangle", gain: 0.05, notes: bars([
      [["C5", 1], [null, 1], ["E5", 1], [null, 1]], [["G5", 1], [null, 1], ["E5", 1], [null, 1]], [["A4", 1], [null, 1], ["C5", 1], [null, 1]], [["E5", 1], [null, 1], ["D5", 1], [null, 1]],
      [["F5", 1], [null, 1], ["A5", 1], [null, 1]], [["G5", 1], [null, 1], ["E5", 1], [null, 1]], [["D5", 1], [null, 1], ["B4", 1], [null, 1]], [["C5", 2], [null, 2]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["C3", 2], ["G2", 2]], [["C3", 2], ["G2", 2]], [["A2", 2], ["E3", 2]], [["A2", 2], ["E3", 2]],
      [["F2", 2], ["C3", 2]], [["C3", 2], ["G2", 2]], [["G2", 2], ["D3", 2]], [["C3", 4]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  flip: [{ wave: "triangle", from: 620, to: 780, dur: 0.06, gain: 0.05 }],
  undo: [{ wave: "triangle", from: 440, to: 300, dur: 0.08, gain: 0.045 }],
  clear: arpeggio(["C5", "E5", "G5", "C6"], 0.36),
};

/**
 * Light Flip의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}