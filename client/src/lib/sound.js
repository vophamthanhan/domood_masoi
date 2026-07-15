let ctx = null;
let muted = localStorage.getItem('ms_sound_muted') === '1';

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  localStorage.setItem('ms_sound_muted', value ? '1' : '0');
}

function tone(freq, duration, { type = 'sine', gain = 0.2, delay = 0, sweepTo } = {}) {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + delay);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, audio.currentTime + delay + duration);
  g.gain.setValueAtTime(gain, audio.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(audio.currentTime + delay);
  osc.stop(audio.currentTime + delay + duration + 0.05);
}

function noiseBurst(duration, { gain = 0.3, delay = 0 } = {}) {
  if (muted) return;
  const audio = getCtx();
  if (!audio) return;
  const bufferSize = audio.sampleRate * duration;
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const g = audio.createGain();
  g.gain.setValueAtTime(gain, audio.currentTime + delay);
  src.connect(g);
  g.connect(audio.destination);
  src.start(audio.currentTime + delay);
}

export const sfx = {
  night() {
    tone(320, 1.1, { type: 'sawtooth', gain: 0.15, sweepTo: 90 }); // tiếng sói tru giả lập
  },
  day() {
    tone(660, 0.25, { type: 'triangle', gain: 0.2 });
    tone(880, 0.3, { type: 'triangle', gain: 0.15, delay: 0.15 });
  },
  vote() {
    tone(900, 0.15, { type: 'square', gain: 0.12 });
    tone(1200, 0.2, { type: 'square', gain: 0.1, delay: 0.12 });
  },
  turn() {
    tone(500, 0.12, { type: 'sine', gain: 0.15 });
  },
  cupid() {
    tone(700, 0.15, { gain: 0.15 });
    tone(900, 0.15, { gain: 0.15, delay: 0.12 });
    tone(1100, 0.2, { gain: 0.15, delay: 0.24 });
  },
  gunshot() {
    noiseBurst(0.25, { gain: 0.35 });
  },
  death() {
    tone(220, 0.6, { type: 'sine', gain: 0.18, sweepTo: 80 });
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, { gain: 0.15, delay: i * 0.12 }));
  },
};
