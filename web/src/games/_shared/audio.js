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

export const bars = (list) => list.flat();

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
 * @param options.tracks 곡 데이터 { 이름: { bpm, lead, bass } }
 * @param options.sfx 효과음 데이터 { 이름: [소리 조각] }
 * @param options.Context AudioContext 생성자(기본은 브라우저 것)
 * @param options.setTimer 반복 타이머 등록 함수(기본 setInterval)
 * @param options.clearTimer 타이머 해제 함수(기본 clearInterval)
 * @returns { unlock, suspend, resume, setMuted, music, sfx, dispose } suspend는 시계까지 멈춰 곡이 그 자리에서 쉬고, resume은 음소거가 아닐 때만 이어 간다
 */
export function createSynth({ tracks, sfx, Context, setTimer = setInterval, clearTimer = clearInterval }) {
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
    cursor = { data: eventsOf(tracks[wanted]), index: 0, loopStart: ctx.currentTime + 0.05 };
    schedule();
    timer = setTimer(schedule, TICK_MS);
  }

  return {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === "suspended") ctx.resume?.();
      startLoop();
    },
    suspend() {
      ctx?.suspend?.();
    },
    resume() {
      if (!muted) ctx?.resume?.();
    },
    setMuted(value) {
      muted = Boolean(value);
      if (master) master.gain.value = muted ? 0 : 0.9;
      if (muted) stopLoop();
      else startLoop();
    },
    music(name) {
      if (name !== null && !tracks[name]) return;
      wanted = name;
      if (name === null) stopLoop();
      else if (playing !== name) {
        stopLoop();
        startLoop();
      }
    },
    sfx(name) {
      const spec = sfx[name];
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