import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LESSONS, LESSON_BY_ID, LEVELS } from '../data/lessons.js';
import { dueCards } from '../lib/learn.js';
import { todayStr } from '../lib/backend.js';
import { go } from '../lib/nav.js';
import Bruno from '../components/Bruno.jsx';

const W = 320; // lățimea logică a traseului
const STEP = 108; // distanța verticală între lecții
const OFFSETS = [0, 70, 96, 60, -10, -78, -96, -58];
const UNIT_ACCENT = ['#ef4b3f', '#f5c443', '#9aa0ad', '#ef4b3f'];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const rise = { hidden: { opacity: 0, y: 24, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

function pathThrough(points) {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const m = (b.y - a.y) / 2;
    d += ` C ${a.x} ${a.y + m}, ${b.x} ${b.y - m}, ${b.x} ${b.y}`;
  }
  return d;
}

function Icon({ state }) {
  if (state === 'done')
    return (
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#1f6b3c" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5 10 17 19 7" />
      </svg>
    );
  if (state === 'next')
    return (
      <svg viewBox="0 0 24 24" width="32" height="32">
        <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="#fff6d6" stroke="#8a1c14" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2.2" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const DISC = {
  done: 'bg-[radial-gradient(circle_at_35%_30%,#fff1b8,#f5c443_45%,#c9910f)] shadow-[0_8px_0_#8a6206,0_14px_26px_-6px_rgba(245,196,67,.6),inset_0_-6px_10px_rgba(0,0,0,.18)]',
  next: 'bg-[radial-gradient(circle_at_35%_30%,#ffb3aa,#ef4b3f_45%,#a8231a)] shadow-[0_8px_0_#6e140e,0_0_40px_rgba(239,75,63,.7),inset_0_-6px_10px_rgba(0,0,0,.2)]',
  todo: 'bg-[radial-gradient(circle_at_35%_30%,#4a505e,#2b2f39_55%,#1b1e25)] shadow-[0_8px_0_#0d0f13,0_12px_20px_-6px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.12)]',
};

function Unit({ level, index, progress, next, open, setOpen }) {
  const ids = level.lessons;
  const points = ids.map((_, k) => ({ x: W / 2 + OFFSETS[k % OFFSETS.length], y: 56 + k * STEP }));
  const d = pathThrough(points);
  const height = points[points.length - 1].y + 70;
  const doneCount = ids.filter((id) => progress[id] !== undefined).length;
  const nextIdx = ids.indexOf(next?.id);
  const reach = nextIdx >= 0 ? nextIdx : doneCount === ids.length ? ids.length - 1 : doneCount > 0 ? doneCount - 1 : 0;
  const frac = ids.length > 1 ? reach / (ids.length - 1) : 1;
  const filled = doneCount > 0 || nextIdx >= 0;
  const brunoAt = nextIdx >= 0 ? points[nextIdx] : null;

  return (
    <motion.section variants={rise} className="mt-7">
      <div className="glass relative overflow-hidden px-4 py-3.5 flex items-center justify-between">
        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: `linear-gradient(${UNIT_ACCENT[index % 4]}, transparent)` }} />
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-white/50">
            Unitatea {index + 1} · {level.id} · {doneCount}/{ids.length}
          </div>
          <h2 className="m-0 text-xl font-black">{level.title.split(' — ')[1] || level.title}</h2>
        </div>
        <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }} onClick={() => go('vocabular')} className="h-11 w-11 rounded-xl border border-white/15 bg-white/5 text-xl" title="Vocabular">
          📖
        </motion.button>
      </div>

      <div className="relative mx-auto" style={{ width: W, height }}>
        <svg className="absolute inset-0 overflow-visible" width={W} height={height} viewBox={`0 0 ${W} ${height}`}>
          <defs>
            <filter id={'glow-r' + index} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* drumul: bordură închisă + asfalt */}
          <path d={d} fill="none" stroke="#06080c" strokeWidth="40" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#1a1f29" strokeWidth="32" strokeLinecap="round" />
          <path d={d} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2" strokeDasharray="2 12" strokeLinecap="round" />
          {/* magistrala: roșu + galben-auriu, se umple pe măsură ce avansezi */}
          {filled && (
            <>
              <motion.path d={d} fill="none" stroke="#ef4b3f" strokeWidth="24" strokeLinecap="round" filter={`url(#glow-r${index})`} initial={{ pathLength: 0 }} animate={{ pathLength: frac }} transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }} />
              <motion.path d={d} fill="none" stroke="#f5c443" strokeWidth="9" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: frac }} transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }} style={{ filter: 'drop-shadow(0 0 6px rgba(245,196,67,.9))' }} />
              <motion.path d={d} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: frac }} transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }} />
            </>
          )}
        </svg>

        {brunoAt && (
          <motion.div
            initial={{ opacity: 0, x: brunoAt.x > W / 2 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="absolute pointer-events-none"
            style={{ left: brunoAt.x > W / 2 ? brunoAt.x - 150 : brunoAt.x + 52, top: brunoAt.y - 66 }}
          >
            <Bruno mood="hello" size={96} />
          </motion.div>
        )}

        {ids.map((id, k) => {
          const l = LESSON_BY_ID[id];
          const p = points[k];
          const state = progress[id] !== undefined ? 'done' : next?.id === id ? 'next' : 'todo';
          const isOpen = open === id;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.4, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 + k * 0.08 }}
              className="absolute"
              style={{ left: p.x - 38, top: p.y - 36, zIndex: isOpen ? 30 : 5 }}
            >
              {state === 'next' && !isOpen && (
                <div className="absolute -top-11 inset-x-0 flex justify-center">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    className="rounded-xl border border-[#ef4b3f]/60 bg-[#1b1f29] px-3 py-1 text-xs font-black tracking-widest text-[#ff7a6e] shadow-red whitespace-nowrap"
                  >
                    START
                  </motion.div>
                </div>
              )}
              {state === 'next' && (
                <motion.span
                  className="absolute -inset-[9px] rounded-full border-4 border-[#ef4b3f]/70"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.9, 0.2, 0.9] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                />
              )}
              <motion.button
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.9, y: 6 }}
                onClick={() => setOpen(isOpen ? null : id)}
                className={`relative grid h-[72px] w-[76px] place-items-center rounded-full border-0 ${DISC[state]}`}
                aria-label={l.title}
              >
                <span className="absolute inset-x-3 top-1.5 h-4 rounded-full bg-white/25 blur-[2px]" />
                <Icon state={state} />
              </motion.button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                    className="glass absolute top-[88px] w-[272px] p-4 text-left !bg-[#1a1f2a]/95"
                    style={{ left: 38 - 136 + Math.max(136 - p.x, Math.min(0, W - 136 - p.x)) }}
                  >
                    <div className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: state === 'todo' ? '#9aa0ad' : state === 'done' ? '#f5c443' : '#ff7a6e' }}>
                      Lecția {l.number} {state === 'done' ? '· terminată ✓' : state === 'todo' ? '· blocată' : '· următoarea'}
                    </div>
                    <div className="mt-1 text-lg font-black leading-tight">{l.title}</div>
                    <p className="m-0 mt-1 text-sm font-semibold text-white/60">{l.goal}</p>
                    {state === 'todo' ? (
                      <button className="btn ghost" onClick={() => go('lectie/' + l.id)}>
                        🔒 Încearcă oricum
                      </button>
                    ) : (
                      <button className={'btn' + (state === 'next' ? ' red' : '')} onClick={() => go('lectie/' + l.id)}>
                        {state === 'done' ? 'Repetă · +XP' : 'Începe · +20 XP'}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

export default function Home({ profile, progress, cards }) {
  const due = dueCards(cards).length;
  const next = LESSONS.find((l) => progress[l.id] === undefined);
  const [open, setOpen] = useState(next?.id || null);
  const done = LESSONS.filter((l) => progress[l.id] !== undefined).length;
  const learnedWords = Object.keys(cards).length;
  const activeToday = profile.last_active === todayStr();
  const hour = new Date().getHours();
  const hello = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
  const message = !done && !learnedWords
    ? `${hello}, ${profile.display_name}! Eu sunt Bruno. Apasă pe steaua roșie și începem!`
    : due
    ? `${hello}! Ai ${due} ${due === 1 ? 'cuvânt' : 'cuvinte'} de repetat. Întâi recapitularea, apoi lecția nouă!`
    : next
    ? `${hello}! Recapitularea e gata. Azi: „${next.title}”. Los geht’s!`
    : 'Ai terminat toate lecțiile. Ich bin stolz auf dich! 🏆';

  return (
    <motion.div className="page" variants={stagger} initial="hidden" animate="show">
      <motion.header variants={rise} className="flex items-center justify-between">
        <div className="brand">
          Lerne<span>Deutsch</span>
        </div>
        <div className="flex gap-2">
          {[
            ['🔥', profile.streak || 0, activeToday ? 'text-[#ffb347]' : 'text-white/35 grayscale'],
            ['⭐', profile.xp, 'text-[#f5c443]'],
            ['📖', learnedWords, 'text-white/80'],
          ].map(([ic, v, cls], i) => (
            <motion.span key={i} whileTap={{ scale: 0.9 }} className={'glass flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm font-black ' + cls}>
              <span className={cls.includes('grayscale') ? 'grayscale' : ''}>{ic}</span> {v}
            </motion.span>
          ))}
        </div>
      </motion.header>

      <motion.div variants={rise} className="bubble-row">
        <Bruno mood={due ? 'think' : next ? 'idle' : 'cheer'} size={88} />
        <div className="bubble">{message}</div>
      </motion.div>

      {learnedWords > 0 && (
        <motion.button
          variants={rise}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => go('recapitulare')}
          className={'glass flex w-full items-center gap-3 px-4 py-3.5 text-left ' + (due ? 'border-[#ef4b3f]/50 shadow-red' : '')}
        >
          <span className={'grid h-11 w-11 place-items-center rounded-xl text-xl font-black ' + (due ? 'bg-gradient-to-b from-[#ff6b5f] to-[#c42a1f] text-white' : 'bg-white/10 text-[#f5c443]')}>↻</span>
          <span className="flex-1">
            <b className="block">{due ? 'Recapitularea de azi' : 'Exersează liber'}</b>
            <small className="font-bold text-white/55">{due ? `${due} cuvinte · ~${Math.max(3, Math.round(due * 0.25))} min${due > 30 ? ` · ${Math.ceil(due / 30)} reprize` : ''}` : 'Nimic scadent azi ✓'}</small>
          </span>
          <span className="rounded-lg bg-[#f5c443] px-3 py-1.5 text-xs font-black tracking-widest text-[#2a1d00]">{due ? 'START' : 'GO'}</span>
        </motion.button>
      )}

      {LEVELS.map((lv, li) => (
        <Unit key={lv.id} level={lv} index={li} progress={progress} next={next} open={open} setOpen={setOpen} />
      ))}

      <motion.button
        variants={rise}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => go('joc')}
        className="relative mt-8 flex w-full items-center gap-3 overflow-hidden rounded-[20px] border border-[#f5c443]/40 bg-gradient-to-r from-[#1b1f29] via-[#2a1614] to-[#2b2410] px-4 py-4 text-left shadow-gold"
      >
        <span className="text-4xl">🏰</span>
        <span className="flex-1">
          <b className="block text-lg">Cucerește Germania</b>
          <small className="font-bold text-white/60">Blitzkrieg sau Eroberungskrieg · 3 jucători</small>
        </span>
        <span className="text-2xl text-[#f5c443]">›</span>
      </motion.button>
    </motion.div>
  );
}
