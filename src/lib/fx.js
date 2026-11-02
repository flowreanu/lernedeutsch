// Efecte sonore și muzică — generate în browser (WebAudio), fără fișiere audio.
const KEY = 'germana-sound';
const MKEY = 'germana-music';
const read = (k, def) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? def : v === 'on';
  } catch {
    return def;
  }
};
const write = (k, on) => {
  try {
    localStorage.setItem(k, on ? 'on' : 'off');
  } catch {}
};
export const soundOn = () => read(KEY, true);
export const setSound = (on) => write(KEY, on);
export const musicOn = () => read(MKEY, true);

let ctx = null;
let master = null;
function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// deblochează sunetul la prima atingere (cerință a browserelor)
if (typeof window !== 'undefined') {
  const unlock = () => {
    try {
      ac();
    } catch {}
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
}

function tone(freq, start, dur, type = 'sine', vol = 0.18, slideTo) {
  const c = ctx;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + start;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
function noise(start, dur, vol = 0.3, filterFreq = 900) {
  const c = ctx;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(c.currentTime + start);
}
function play(fn) {
  if (!soundOn()) return;
  try {
    ac();
    fn();
  } catch {}
}
const vib = (p) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

export const sfx = {
  correct: () => play(() => { tone(784, 0, 0.12, 'triangle'); tone(1175, 0.09, 0.25, 'triangle'); }),
  wrong: () => {
    play(() => { tone(220, 0, 0.18, 'sawtooth', 0.07); tone(170, 0.12, 0.28, 'sawtooth', 0.07); });
    vib(120);
  },
  finish: () => play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, i === 3 ? 0.45 : 0.16, 'triangle'))),
  tap: () => play(() => tone(660, 0, 0.05, 'sine', 0.06)),
  tick: () => play(() => tone(1200, 0, 0.06, 'square', 0.05)),
  go: () => play(() => { tone(880, 0, 0.1, 'square', 0.07); tone(1320, 0.08, 0.22, 'square', 0.07); }),
  whoosh: () => play(() => noise(0, 0.35, 0.18, 2400)),
  capture: () => play(() => { tone(392, 0, 0.12, 'triangle', 0.15, 784); tone(988, 0.1, 0.2, 'triangle', 0.12); }),
  boom: () => {
    play(() => { noise(0, 0.6, 0.6, 500); tone(110, 0, 0.5, 'sine', 0.35, 40); });
    vib([60, 40, 100]);
  },
  defend: () => play(() => { tone(523, 0, 0.1, 'square', 0.06); tone(523, 0.12, 0.25, 'square', 0.06); }),
  turn: () => play(() => { tone(659, 0, 0.1, 'triangle', 0.12); tone(880, 0.1, 0.18, 'triangle', 0.12); }),
  banner: () => play(() => { tone(392, 0, 0.18, 'sawtooth', 0.06); tone(523, 0.15, 0.18, 'sawtooth', 0.06); tone(659, 0.3, 0.35, 'sawtooth', 0.06); }),
  fanfare: () => play(() => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, i === 6 ? 0.7 : 0.14, 'sawtooth', 0.07))),
  message: () => play(() => tone(1046, 0, 0.08, 'sine', 0.08)),
};

// ------------------------------------------------------------------ muzică (buclă generată)
// Progresie epică în la minor: Am – F – C – G, ~96 BPM, bas + arpegiu + tobă discretă.
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [48, 52, 55], // C
  [55, 59, 62], // G
];
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
let music = null;
export function startMusic() {
  if (music || !musicOn()) return;
  try {
    ac();
  } catch {
    return;
  }
  const bus = ctx.createGain();
  bus.gain.value = 0.0001;
  bus.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + 2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  bus.connect(lp).connect(master);
  const beat = 60 / 96 / 2; // optimi
  let step = 0;
  let next = ctx.currentTime + 0.1;
  const note = (f, t, dur, type, vol) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const kick = (t) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.25);
  };
  const schedule = () => {
    while (next < ctx.currentTime + 0.3) {
      const chord = CHORDS[Math.floor(step / 16) % 4];
      const s = step % 16;
      if (s === 0) chord.forEach((m) => note(mtof(m), next, beat * 15, 'sawtooth', 0.025)); // pad
      if (s % 4 === 0) note(mtof(chord[0] - 12), next, beat * 1.8, 'triangle', 0.18); // bas
      if (s % 4 === 0) kick(next);
      const arp = [0, 1, 2, 1, 2, 0, 2, 1][s % 8];
      note(mtof(chord[arp] + 12), next, beat * 0.9, 'triangle', 0.05); // arpegiu
      next += beat;
      step++;
    }
  };
  schedule();
  const iv = setInterval(schedule, 100);
  music = { bus, iv };
}
export function stopMusic() {
  if (!music) return;
  const m = music;
  music = null;
  clearInterval(m.iv);
  try {
    m.bus.gain.cancelScheduledValues(ctx.currentTime);
    m.bus.gain.setValueAtTime(m.bus.gain.value, ctx.currentTime);
    m.bus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    setTimeout(() => m.bus.disconnect(), 800);
  } catch {}
}
export function setMusic(on) {
  write(MKEY, on);
  if (on) startMusic();
  else stopMusic();
}

export function confetti(duration = 2600) {
  try {
    const cv = document.createElement('canvas');
    cv.className = 'confetti-canvas';
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    const colors = ['#ef4b3f', '#f5c443', '#24272f', '#ffe08a', '#ff7a6e', '#ffffff'];
    const parts = Array.from({ length: 150 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    const step = (t) => {
      const el = t - t0;
      g.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.globalAlpha = Math.max(0, 1 - el / duration);
        g.fillStyle = p.c;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
      });
      if (el < duration) requestAnimationFrame(step);
      else cv.remove();
    };
    requestAnimationFrame(step);
  } catch {}
}
