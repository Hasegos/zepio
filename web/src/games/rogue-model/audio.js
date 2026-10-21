import { arpeggio, bars, createSynth } from "../_shared/audio.js";

const arp = (low, mid, high) => [low, mid, high, mid, low, mid, high, mid].map((note) => [note, 0.5]);

export const TRACKS = {
  menu: {
    bpm: 90,
    lead: { wave: "triangle", gain: 0.05, notes: bars([
      [["A4", 2], ["C5", 1], ["E5", 1]], [["D5", 2], ["C5", 1], ["B4", 1]], [["A4", 2], ["E5", 1], ["G5", 1]], [["E5", 3], [null, 1]],
      [["F5", 2], ["E5", 1], ["C5", 1]], [["D5", 2], ["B4", 2]], [["C5", 1], ["B4", 1], ["A4", 1], ["G#4", 1]], [["A4", 3], [null, 1]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["A2", 2], ["E3", 2]], [["D3", 2], ["G2", 2]], [["A2", 2], ["C3", 2]], [["E3", 2], ["E2", 2]],
      [["F2", 2], ["C3", 2]], [["D3", 2], ["G2", 2]], [["E3", 4]], [["A2", 4]],
    ]) },
  },
  play: {
    bpm: 112,
    lead: { wave: "square", gain: 0.022, notes: bars([
      arp("C5", "G5", "C6"), arp("Bb4", "F5", "Bb5"), arp("Ab4", "Eb5", "Ab5"),
      [["G4", 0.5], ["D5", 0.5], ["G5", 0.5], ["D5", 0.5], ["B4", 0.5], ["D5", 0.5], ["G5", 0.5], ["D5", 0.5]],
      arp("C5", "G5", "C6"),
      [["F5", 0.5], ["C5", 0.5], ["F5", 0.5], ["Ab5", 0.5], ["F5", 0.5], ["C5", 0.5], ["F5", 0.5], ["Ab5", 0.5]],
      [["G5", 0.5], ["D5", 0.5], ["G5", 0.5], ["B5", 0.5], ["G5", 0.5], ["D5", 0.5], ["G5", 0.5], ["B5", 0.5]],
      [["C5", 2], ["G5", 1], ["C6", 1]],
    ]) },
    bass: { wave: "triangle", gain: 0.06, notes: bars([
      [["C3", 2], ["G3", 2]], [["Bb2", 2], ["F3", 2]], [["Ab2", 2], ["Eb3", 2]], [["G2", 2], ["D3", 2]],
      [["C3", 2], ["G3", 2]], [["F3", 2], ["C3", 2]], [["G3", 2], ["D3", 2]], [["C3", 4]],
    ]) },
  },
};

export const SFX = {
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  tick: [{ wave: "triangle", from: 520, to: 520, dur: 0.04, gain: 0.04 }],
  buy: arpeggio(["E5", "A5", "E6"], 0.2, "sine", 0.06),
  coin: [{ wave: "square", from: 988, to: 988, dur: 0.06, gain: 0.045 }, { wave: "square", from: 1319, to: 1319, dur: 0.16, gain: 0.045, at: 0.07 }],
  start: arpeggio(["A4", "E5", "A5"], 0.3, "triangle", 0.06),
  alert: [{ wave: "square", from: 880, to: 880, dur: 0.1, gain: 0.04 }, { wave: "square", from: 660, to: 660, dur: 0.16, gain: 0.04, at: 0.12 }],
  adopt: [{ wave: "sine", from: 600, to: 900, dur: 0.08, gain: 0.05 }],
  win: arpeggio(["C5", "E5", "G5", "C6", "E6"], 0.5),
  lose: [{ wave: "sawtooth", from: 300, to: 60, dur: 0.6, gain: 0.05 }, { noise: true, dur: 0.25, gain: 0.04 }],
};

/**
 * 폭주 모델의 곡과 효과음을 담은 소리 컨트롤러를 만든다.
 *
 * @param options createSynth 옵션(Context와 타이머를 바꿔 끼울 수 있다)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio(options = {}) {
  return createSynth({ tracks: TRACKS, sfx: SFX, ...options });
}