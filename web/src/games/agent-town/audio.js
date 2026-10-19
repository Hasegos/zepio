const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * 음 이름을 주파수로 바꾼다. 예: A4는 440Hz, Bb3은 B 플랫.
 *
 * @param note 음 이름(C, D, E, F, G, A, B + 선택 # 또는 b + 옥타브)
 * @returns 주파수(Hz), 쉼표(null)는 null
 */
export function noteFreq(note) {
  if (note === null) return null;
  const match = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!match) throw new Error(`알 수 없는 음: ${note}`);
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const midi = 12 + Number(match[3]) * 12 + SEMITONE[match[1]] + accidental;
  return 440 * 2 ** ((midi - 69) / 12);
}

const bars = (list) => list.flat();

export const TRACKS = {
  title: {
    bpm: 84,
    lead: { wave: "triangle", gain: 0.06, notes: bars([
      [["E5", 2], ["G5", 2]], [["A5", 2], ["G5", 2]], [["F5", 2], ["A5", 2]], [["G5", 4]],
      [["E5", 2], ["G5", 2]], [["C6", 2], ["B5", 2]], [["A5", 2], ["F5", 2]], [["E5", 4]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["C3", 4]], [["A2", 4]], [["F2", 4]], [["G2", 4]], [["C3", 4]], [["A2", 4]], [["F2", 4]], [["G2", 4]],
    ]) },
  },
  town: {
    bpm: 112,
    lead: { wave: "square", gain: 0.035, notes: bars([
      [["E5", 1], ["G5", 1], ["C6", 1], ["G5", 1]],
      [["A5", 1], ["G5", 1], ["E5", 2]],
      [["F5", 1], ["A5", 1], ["D6", 1], ["A5", 1]],
      [["G5", 1], ["E5", 1], ["D5", 2]],
      [["E5", 1], ["G5", 1], ["C6", 1], ["B5", 1]],
      [["A5", 1], ["C6", 1], ["G5", 2]],
      [["F5", 1], ["E5", 1], ["D5", 1], ["E5", 1]],
      [["C5", 3], [null, 1]],
    ]) },
    bass: { wave: "triangle", gain: 0.07, notes: bars([
      [["C3", 2], ["G3", 2]], [["A2", 2], ["E3", 2]], [["F2", 2], ["C3", 2]], [["G2", 2], ["D3", 2]],
      [["C3", 2], ["G3", 2]], [["A2", 2], ["E3", 2]], [["F2", 2], ["C3", 2]], [["G2", 2], ["D3", 2]],
    ]) },
  },
  forest: {
    bpm: 92,
    lead: { wave: "triangle", gain: 0.05, notes: bars([
      [["A4", 2], ["C5", 1], ["E5", 1]], [["D5", 2], ["C5", 2]],
      [["B4", 2], ["D5", 1], ["E5", 1]], [["A4", 3], [null, 1]],
      [["A4", 2], ["C5", 1], ["E5", 1]], [["G5", 2], ["E5", 2]],
      [["D5", 2], ["C5", 1], ["B4", 1]], [["A4", 3], [null, 1]],
    ]) },
    bass: { wave: "sine", gain: 0.08, notes: bars([
      [["A2", 4]], [["F2", 4]], [["G2", 4]], [["A2", 4]], [["A2", 4]], [["C3", 4]], [["F2", 4]], [["A2", 4]],
    ]) },
  },
  battle: {
    bpm: 152,
    lead: { wave: "square", gain: 0.035, notes: bars([
      [["A4", 0.5], ["C5", 0.5], ["E5", 0.5], ["A5", 0.5], ["G5", 0.5], ["E5", 0.5], ["C5", 0.5], ["E5", 0.5]],
      [["F5", 0.5], ["A5", 0.5], ["C6", 0.5], ["A5", 0.5], ["G5", 0.5], ["E5", 0.5], ["D5", 0.5], ["E5", 0.5]],
      [["D5", 0.5], ["F5", 0.5], ["A5", 0.5], ["F5", 0.5], ["E5", 0.5], ["G5", 0.5], ["C5", 0.5], ["B4", 0.5]],
      [["A4", 1], ["E5", 1], ["A5", 2]],
    ]) },
    bass: { wave: "triangle", gain: 0.08, notes: bars([
      [["A2", 1], ["A2", 1], ["A3", 1], ["A2", 1]],
      [["F2", 1], ["F2", 1], ["F3", 1], ["F2", 1]],
      [["D2", 1], ["D2", 1], ["D3", 1], ["D2", 1]],
      [["E2", 1], ["E2", 1], ["E3", 1], ["E2", 1]],
    ]) },
  },
  boss: {
    bpm: 168,
    lead: { wave: "sawtooth", gain: 0.03, notes: bars([
      [["D5", 0.5], ["D5", 0.5], ["F5", 0.5], ["A5", 0.5], ["G5", 1], ["F5", 1]],
      [["E5", 0.5], ["E5", 0.5], ["G5", 0.5], ["Bb5", 0.5], ["A5", 1], ["G5", 1]],
      [["D5", 0.5], ["F5", 0.5], ["A5", 0.5], ["D6", 0.5], ["C6", 1], ["A5", 1]],
      [["Bb5", 1], ["A5", 1], ["G5", 1], ["A5", 1]],
    ]) },
    bass: { wave: "square", gain: 0.04, notes: bars([
      [["D2", 0.5], ["D2", 0.5], ["D3", 0.5], ["D2", 0.5], ["D2", 0.5], ["D2", 0.5], ["D3", 0.5], ["D2", 0.5]],
      [["E2", 0.5], ["E2", 0.5], ["E3", 0.5], ["E2", 0.5], ["E2", 0.5], ["E2", 0.5], ["E3", 0.5], ["E2", 0.5]],
      [["F2", 0.5], ["F2", 0.5], ["F3", 0.5], ["F2", 0.5], ["F2", 0.5], ["F2", 0.5], ["F3", 0.5], ["F2", 0.5]],
      [["G2", 0.5], ["G2", 0.5], ["G3", 0.5], ["G2", 0.5], ["A2", 0.5], ["A2", 0.5], ["A3", 0.5], ["A2", 0.5]],
    ]) },
  },
  ending: {
    bpm: 76,
    lead: { wave: "sine", gain: 0.07, notes: bars([
      [["C5", 2], ["E5", 2]], [["G5", 2], ["E5", 2]], [["F5", 2], ["A5", 2]], [["G5", 4]],
      [["E5", 2], ["G5", 2]], [["C6", 4]], [["B5", 2], ["G5", 2]], [["C6", 4]],
    ]) },
    bass: { wave: "triangle", gain: 0.06, notes: bars([
      [["C3", 4]], [["C3", 4]], [["F2", 4]], [["G2", 4]], [["A2", 4]], [["F2", 4]], [["G2", 4]], [["C3", 4]],
    ]) },
  },
};

export const SFX = {
  step: [{ wave: "triangle", from: 170, to: 120, dur: 0.04, gain: 0.03 }],
  talk: [{ wave: "square", from: 520, to: 520, dur: 0.03, gain: 0.025 }],
  select: [{ wave: "square", from: 660, to: 880, dur: 0.07, gain: 0.04 }],
  encounter: [0, 0.16, 0.32].map((at) => ({ wave: "square", from: 900, to: 150, dur: 0.14, gain: 0.05, at })),
  hit: [{ wave: "sine", from: 160, to: 55, dur: 0.12, gain: 0.08 }, { noise: true, dur: 0.07, gain: 0.05 }],
  win: ["C5", "E5", "G5", "C6"].map((n, i) => ({ wave: "square", from: noteFreq(n), to: noteFreq(n), dur: i === 3 ? 0.36 : 0.11, gain: 0.05, at: i * 0.11 })),
  disaster: [{ wave: "sawtooth", from: 220, to: 40, dur: 0.55, gain: 0.06 }, { noise: true, dur: 0.3, gain: 0.05 }],
  block: [0, 0.09].map((at) => ({ wave: "square", from: 300, to: 260, dur: 0.07, gain: 0.05, at })),
  coin: [{ wave: "square", from: 988, to: 988, dur: 0.06, gain: 0.045 }, { wave: "square", from: 1319, to: 1319, dur: 0.16, gain: 0.045, at: 0.07 }],
  heal: [{ wave: "triangle", from: 440, to: 880, dur: 0.3, gain: 0.06 }],
  warp: ["C5", "G5", "E6"].map((n, i) => ({ wave: "triangle", from: noteFreq(n), to: noteFreq(n) * 1.5, dur: 0.12, gain: 0.05, at: i * 0.09 })),
  leave: ["E4", "C4", "A3"].map((n, i) => ({ wave: "triangle", from: noteFreq(n), to: noteFreq(n), dur: 0.14, gain: 0.05, at: i * 0.13 })),
};

const LOOKAHEAD = 0.35;
const TICK_MS = 90;

function eventsOf(track) {
  const beat = 60 / track.bpm;
  const out = [];
  let length = 0;
  for (const voice of [track.lead, track.bass]) {
    let at = 0;
    for (const [note, beats] of voice.notes) {
      if (note !== null) out.push({ at: at * beat, dur: beats * beat, freq: noteFreq(note), wave: voice.wave, gain: voice.gain });
      at += beats;
    }
    length = Math.max(length, at * beat);
  }
  return { events: out.sort((a, b) => a.at - b.at), length };
}

/**
 * WebAudio 합성 소리 컨트롤러를 만든다. 외부 파일 없이 배경음과 효과음을 직접 만든다.
 * 브라우저는 사용자 동작 전에는 소리를 막으므로 unlock을 첫 입력에서 불러야 한다.
 *
 * @param options.Context AudioContext 생성자(기본은 브라우저 것, 시험에서 바꾼다)
 * @param options.setTimer 반복 타이머 등록 함수(기본 setInterval)
 * @param options.clearTimer 타이머 해제 함수(기본 clearInterval)
 * @returns { unlock, setMuted, music, sfx, dispose }
 */
export function createAudio({ Context, setTimer = setInterval, clearTimer = clearInterval } = {}) {
  const Ctor = Context ?? (typeof window === "undefined" ? undefined : window.AudioContext ?? window.webkitAudioContext);
  let ctx = null;
  let master = null;
  let noise = null;
  let muted = false;
  let wanted = null;
  let playing = null;
  let timer = null;
  let cursor = null;

  function ensure() {
    if (ctx || !Ctor) return Boolean(ctx);
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return Boolean(ctx);
  }

  function tone(spec, start, wave, from, to, dur, gain) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + dur);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.linearRampToValueAtTime(gain, start + 0.01);
    amp.gain.linearRampToValueAtTime(0.0001, start + Math.max(0.02, dur * 0.95));
    osc.connect(amp);
    amp.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
    return spec;
  }

  function burst(start, dur, gain) {
    if (!noise) {
      const length = Math.floor(ctx.sampleRate * 0.4);
      noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    const amp = ctx.createGain();
    src.buffer = noise;
    amp.gain.setValueAtTime(gain, start);
    amp.gain.linearRampToValueAtTime(0.0001, start + dur);
    src.connect(amp);
    amp.connect(master);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  function stopLoop() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    playing = null;
    cursor = null;
  }

  function schedule() {
    if (!cursor || muted || !ctx) return;
    const { events, length } = cursor.data;
    while (cursor.loopStart + (events[cursor.index]?.at ?? length) < ctx.currentTime + LOOKAHEAD) {
      if (cursor.index >= events.length) {
        cursor.loopStart += length;
        cursor.index = 0;
        continue;
      }
      const e = events[cursor.index];
      tone(e, cursor.loopStart + e.at, e.wave, e.freq, e.freq, e.dur, e.gain);
      cursor.index += 1;
    }
  }

  function startLoop() {
    if (!wanted || muted || !ctx || playing === wanted) return;
    stopLoop();
    playing = wanted;
    cursor = { data: eventsOf(TRACKS[wanted]), index: 0, loopStart: ctx.currentTime + 0.05 };
    schedule();
    timer = setTimer(schedule, TICK_MS);
  }

  return {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === "suspended") ctx.resume?.();
      startLoop();
    },
    setMuted(value) {
      muted = Boolean(value);
      if (master) master.gain.value = muted ? 0 : 0.9;
      if (muted) stopLoop();
      else startLoop();
    },
    music(name) {
      if (name !== null && !TRACKS[name]) return;
      wanted = name;
      if (name === null) stopLoop();
      else if (playing !== name) {
        stopLoop();
        startLoop();
      }
    },
    sfx(name) {
      const spec = SFX[name];
      if (!spec || muted || !ctx) return;
      const now = ctx.currentTime;
      for (const part of spec) {
        if (part.noise) burst(now + (part.at ?? 0), part.dur, part.gain);
        else tone(part, now + (part.at ?? 0), part.wave, part.from, part.to, part.dur, part.gain);
      }
    },
    dispose() {
      stopLoop();
      wanted = null;
      ctx?.close?.();
      ctx = null;
    },
  };
}