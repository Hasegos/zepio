import { arpeggio, bars, createSynth } from "../_shared/audio.js";

export const TRACKS = {
  menu: {
    bpm: 92,
    lead: { wave: "triangle", gain: 0.05, notes: bars([
      [["D5", 2], ["F5", 1], ["A4", 1]], [["G4", 2], ["Bb4", 2]], [["A4", 2], ["C5", 1], ["E5", 1]], [["D5", 3], [null, 1]],
      [["F5", 2], ["E5", 1], ["D5", 1]], [["Bb4", 2], ["A4", 2]], [["G4", 1], ["A4", 1], ["Bb4", 1], ["C#5", 1]], [["D5", 3], [null, 1]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["D3", 2], ["A2", 2]], [["G2", 2], ["D3", 2]], [["A2", 2], ["E3", 2]], [["D3", 2], ["A2", 2]],
      [["D3", 2], ["A2", 2]], [["Bb2", 2], ["F3", 2]], [["G2", 2], ["A2", 2]], [["D3", 4]],
    ]) },
  },
  play: {
    bpm: 100,
    lead: { wave: "square", gain: 0.022, notes: bars([
      [["D5", 0.5], [null, 1.5], ["F5", 0.5], [null, 1.5]], [["A4", 0.5], [null, 1.5], ["D5", 0.5], [null, 1.5]], [["Bb4", 0.5], [null, 1.5], ["G5", 0.5], [null, 1.5]], [["A4", 0.5], [null, 0.5], ["C#5", 0.5], [null, 0.5], ["E5", 2]],
      [["D5", 0.5], [null, 1.5], ["F5", 0.5], [null, 1.5]], [["Bb4", 0.5], [null, 1.5], ["D5", 0.5], [null, 1.5]], [["G4", 0.5], [null, 1.5], ["Bb4", 0.5], [null, 1.5]], [["A4", 0.5], [null, 0.5], ["E5", 0.5], [null, 0.5], ["D5", 2]],
    ]) },
    bass: { wave: "triangle", gain: 0.06, notes: bars([
      [["D3", 1], ["D3", 1], ["A2", 1], ["D3", 1]], [["G2", 1], ["G2", 1], ["D3", 1], ["G2", 1]], [["Bb2", 1], ["Bb2", 1], ["F3", 1], ["Bb2", 1]], [["A2", 1], ["A2", 1], ["E3", 1], ["A2", 1]],
      [["D3", 1], ["D3", 1], ["A2", 1], ["D3", 1]], [["Bb2", 1], ["Bb2", 1], ["F3", 1], ["Bb2", 1]], [["G2", 1], ["G2", 1], ["D3", 1], ["G2", 1]], [["A2", 1], ["E3", 1], ["A2", 1], ["D3", 1]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  tick: [{ wave: "triangle", from: 520, to: 520, dur: 0.04, gain: 0.04 }],
  flag: [{ wave: "square", from: 440, to: 660, dur: 0.06, gain: 0.04 }],
  boom: [{ noise: true, dur: 0.4, gain: 0.08 }, { wave: "sawtooth", from: 180, to: 50, dur: 0.45, gain: 0.05 }],
  win: arpeggio(["C5", "E5", "G5", "C6", "E6"], 0.4),
};

/**
 * Bug Sweeper의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}