// Efecte: sunete scurte (generate, fără fișiere), vibrație, confetti.
const KEY = 'germana-sound';
export const soundOn = () => {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
};
export const setSound = (on) => {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
};

let ctx = null;
function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const c = ctx;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}
function play(notes) {
  if (!soundOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    notes.forEach((n) => tone(...n));
  } catch {}
}
export const sfx = {
  correct: () => play([[784, 0, 0.12, 'triangle'], [1175, 0.09, 0.22, 'triangle']]),
  wrong: () => {
    play([[220, 0, 0.18, 'sawtooth', 0.08], [180, 0.12, 0.25, 'sawtooth', 0.08]]);
    try { navigator.vibrate?.(120); } catch {}
  },
  finish: () => play([[523, 0, 0.15, 'triangle'], [659, 0.12, 0.15, 'triangle'], [784, 0.24, 0.15, 'triangle'], [1047, 0.36, 0.4, 'triangle']]),
  tap: () => play([[660, 0, 0.05, 'sine', 0.06]]),
};

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
    const colors = ['#d6372b', '#f2b705', '#2f6fd0', '#2e9e5b', '#1d2a3a', '#ff8fb1'];
    const parts = Array.from({ length: 140 }, () => ({
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
