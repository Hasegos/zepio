import { describe, expect, it } from "vitest";
import { createAudio, noteFreq, SFX, TRACKS } from "./audio.js";

/** AudioContext 대신 쓰는 가짜. 만든 소리 개수와 닫힘 여부만 센다. */
function fake() {
  const log = { oscillators: 0, closed: false, ctx: null };
  class Context {
    constructor() {
      log.ctx = this;
      this.currentTime = 0;
      this.state = "running";
      this.sampleRate = 8000;
      this.destination = {};
    }
    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} };
    }
    createOscillator() {
      log.oscillators += 1;
      return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(8) };
    }
    createBufferSource() {
      return { connect() {}, start() {}, stop() {} };
    }
    close() {
      log.closed = true;
    }
  }
  const timers = new Map();
  let next = 1;
  const setTimer = (fn) => {
    timers.set(next, fn);
    return next++;
  };
  const clearTimer = (id) => timers.delete(id);
  const tick = () => [...timers.values()].forEach((fn) => fn());
  return { log, timers, tick, audio: createAudio({ Context, setTimer, clearTimer }) };
}

describe("noteFreq", () => {
  it("음 이름을 주파수로 바꾼다", () => {
    expect(noteFreq("A4")).toBeCloseTo(440);
    expect(noteFreq("C5")).toBeCloseTo(523.25, 1);
    expect(noteFreq("Bb3")).toBeCloseTo(233.08, 1);
    expect(noteFreq(null)).toBeNull();
    expect(() => noteFreq("H9")).toThrow();
  });
});

describe("곡 데이터", () => {
  it("모든 곡의 선율과 베이스 길이가 같아 반복해도 어긋나지 않는다", () => {
    for (const [name, track] of Object.entries(TRACKS)) {
      const beats = (v) => v.notes.reduce((sum, [, b]) => sum + b, 0);
      expect(beats(track.lead), name).toBe(beats(track.bass));
      for (const [note] of [...track.lead.notes, ...track.bass.notes]) noteFreq(note);
    }
  });

  it("효과음은 모두 길이와 볼륨을 가진다", () => {
    for (const parts of Object.values(SFX)) {
      expect(parts.length).toBeGreaterThan(0);
      for (const p of parts) {
        expect(p.dur).toBeGreaterThan(0);
        expect(p.gain).toBeGreaterThan(0);
      }
    }
  });
});

describe("createAudio", () => {
  it("첫 입력(unlock) 전에는 소리를 만들지 않는다", () => {
    const { audio, log, timers } = fake();
    audio.music("town");
    audio.sfx("select");
    expect(log.oscillators).toBe(0);
    expect(timers.size).toBe(0);
  });

  it("unlock 하면 기다리던 배경음을 틀고 다음 구간을 이어 예약한다", () => {
    const { audio, log, tick } = fake();
    audio.music("town");
    audio.unlock();
    const first = log.oscillators;
    expect(first).toBeGreaterThan(0);
    log.ctx.currentTime = 30;
    tick();
    expect(log.oscillators).toBeGreaterThan(first);
  });

  it("곡을 바꾸면 이전 반복을 멈추고 새 곡을 튼다", () => {
    const { audio, timers } = fake();
    audio.unlock();
    audio.music("town");
    const [first] = timers.keys();
    audio.music("battle");
    expect(timers.has(first)).toBe(false);
    expect(timers.size).toBe(1);
    audio.music(null);
    expect(timers.size).toBe(0);
  });

  it("음소거하면 배경음과 효과음이 멈추고, 풀면 배경음이 다시 시작된다", () => {
    const { audio, log, timers } = fake();
    audio.unlock();
    audio.music("town");
    audio.setMuted(true);
    expect(timers.size).toBe(0);
    const before = log.oscillators;
    audio.sfx("win");
    expect(log.oscillators).toBe(before);
    audio.setMuted(false);
    expect(timers.size).toBe(1);
    audio.sfx("select");
    expect(log.oscillators).toBeGreaterThan(before);
  });

  it("알 수 없는 곡과 효과음 이름은 무시한다", () => {
    const { audio, log } = fake();
    audio.unlock();
    audio.music("nope");
    audio.sfx("nope");
    expect(log.oscillators).toBe(0);
  });

  it("dispose 하면 반복을 멈추고 컨텍스트를 닫는다", () => {
    const { audio, log, timers } = fake();
    audio.unlock();
    audio.music("boss");
    audio.dispose();
    expect(timers.size).toBe(0);
    expect(log.closed).toBe(true);
  });

  it("AudioContext가 없는 환경에서도 에러 없이 조용하다", () => {
    const audio = createAudio();
    audio.unlock();
    audio.music("town");
    audio.sfx("step");
    audio.setMuted(true);
    audio.dispose();
  });
});