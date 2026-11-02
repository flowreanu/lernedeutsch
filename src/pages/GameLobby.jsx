import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api, isDemo } from '../lib/backend.js';
import { LESSONS } from '../data/lessons.js';
import { createState } from '../game/engine.js';
import { go } from '../lib/nav.js';
import { ModeCard } from './Game.jsx';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } } };
const tap = { whileHover: { scale: 1.02 }, whileTap: { scale: 0.95 } };

export default function GameLobby({ profile, progress, query }) {
  const doneCount = LESSONS.filter((l) => progress[l.id] !== undefined).length;
  const [maxLesson, setMaxLesson] = useState(Math.max(2, doneCount));
  const [mode, setMode] = useState('blitz');
  const [code, setCode] = useState(query.get('cod') || '');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const g = await api.createGame(createState({ id: profile.id, name: profile.display_name }, maxLesson, mode));
      go('joc/' + g.id);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }
  async function join(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      const g = await api.findGame(code);
      if (!g) throw new Error('Nu am găsit niciun joc cu acest cod.');
      go('joc/' + g.id);
    } catch (e2) {
      setMsg(e2.message);
    }
    setBusy(false);
  }

  return (
    <motion.div className="page" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise} className="flex items-center justify-between">
        <div className="brand">
          Lerne<span>Deutsch</span>
        </div>
        <span className="text-3xl">🏰</span>
      </motion.div>
      <motion.h1 variants={rise} className="mt-3 text-3xl">
        Cucerește <span className="text-[#f5c443] drop-shadow-[0_0_14px_rgba(245,196,67,.5)]">Germania</span>
      </motion.h1>
      <motion.p variants={rise} className="font-semibold text-white/60">
        Trei jucători, trei culori — <b className="text-[#f5c443]">auriu</b>, <b className="text-[#ff7a6e]">roșu</b> și <b className="text-[#b9bfcc]">negru</b>. Răspunde corect și cucerește landurile.
      </motion.p>

      {query.get('cod') && (
        <motion.form variants={rise} className="card invite" onSubmit={join}>
          <p>
            Ai fost invitat într-un joc: <b className="code">{query.get('cod')}</b>
          </p>
          <motion.button {...tap} className="btn" disabled={busy}>Intră în joc</motion.button>
        </motion.form>
      )}

      <motion.div variants={rise} className="mt-5 text-[11px] font-extrabold uppercase tracking-widest text-white/45">
        Alege modul de joc · Spielmodus
      </motion.div>
      <motion.div variants={rise} className="mt-2 grid gap-3">
        <ModeCard mode="blitz" selected={mode === 'blitz'} onClick={() => setMode('blitz')} />
        <ModeCard mode="conquest" selected={mode === 'conquest'} onClick={() => setMode('conquest')} />
      </motion.div>

      <motion.div variants={rise} className="card">
        <label>
          Întrebări din lecțiile 1–{maxLesson}
          <input type="range" min="1" max={LESSONS.length} value={maxLesson} onChange={(e) => setMaxLesson(+e.target.value)} />
        </label>
        <p className="muted small">Alege lecțiile pe care le-a făcut toată lumea. Tu ai terminat {doneCount}.</p>
        <motion.button {...tap} className="btn" onClick={create} disabled={busy}>
          Creează jocul
        </motion.button>
        {isDemo && <p className="muted small">În demo joci împotriva a doi boți (Stefan și Katrin).</p>}
      </motion.div>

      <motion.form variants={rise} className="card" onSubmit={join}>
        <h3>Intră într-un joc</h3>
        <div className="row">
          <input placeholder="Codul jocului (ex. K7M2P)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} />
          <motion.button {...tap} className="btn" disabled={busy || code.length < 5}>Intră</motion.button>
        </div>
      </motion.form>
      {msg && <div className="msg bad">{msg}</div>}
    </motion.div>
  );
}
