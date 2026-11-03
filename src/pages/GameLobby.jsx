import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const [visibility, setVisibility] = useState('public');
  const [tables, setTables] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => api.listPublicGames().then((t) => alive && setTables(t)).catch(() => alive && setTables([]));
    load();
    const iv = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // venit dintr-o invitație (buton „Intră” din chat) → intră direct în joc
  const qcode = query.get('cod');
  useEffect(() => {
    if (qcode) {
      setCode(qcode);
      join(null, qcode);
    }
  }, [qcode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    setBusy(true);
    try {
      const g = await api.createGame(createState({ id: profile.id, name: profile.display_name }, maxLesson, mode, visibility));
      go('joc/' + g.id);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }
  async function join(e, forced) {
    e?.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const g = await api.findGame(forced || code);
      if (!g) throw new Error('Nu am găsit niciun joc cu acest cod.');
      const st = g.state || {};
      const inIt = (st.players || []).some((p) => p.id === profile.id);
      if (st.status === 'finished') throw new Error(`Jocul ${g.code} s-a terminat deja. Creează unul nou!`);
      if (st.status === 'playing' && !inIt) throw new Error(`Jocul ${g.code} a început deja fără tine.`);
      if (st.status === 'lobby' && !inIt && (st.players || []).length >= 3) throw new Error(`Jocul ${g.code} e plin.`);
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

      <motion.div variants={rise} className="mt-5 text-[11px] font-extrabold uppercase tracking-widest text-white/45">
        Masa
      </motion.div>
      <motion.div variants={rise} className="mt-2 grid grid-cols-2 gap-2">
        {[
          ['public', '🌍 Publică', 'apare în lista meselor'],
          ['private', '🔒 Privată', 'doar cu cod / invitație'],
        ].map(([v, label, sub]) => {
          const on = visibility === v;
          return (
            <motion.button key={v} {...tap} onClick={() => setVisibility(v)} className={'flex items-center gap-2 rounded-2xl border px-3 py-3 text-left ' + (on ? 'border-[#f5c443] bg-[#f5c443]/10 shadow-gold' : 'border-white/10 bg-white/5')}>
              <span className={'grid h-5 w-5 flex-none place-items-center rounded-full border-2 ' + (on ? 'border-[#f5c443]' : 'border-white/30')}>{on && <span className="h-2.5 w-2.5 rounded-full bg-[#f5c443]" />}</span>
              <span>
                <b className="block">{label}</b>
                <small className="font-bold text-white/45">{sub}</small>
              </span>
            </motion.button>
          );
        })}
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

      <motion.div variants={rise} className="card">
        <div className="flex items-center justify-between">
          <h3 className="m-0">🌍 Mese deschise</h3>
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/40">
            <motion.span className="h-2 w-2 rounded-full bg-[#3ccf7a]" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} /> live
          </span>
        </div>
        {!tables && <p className="muted small">Se încarcă…</p>}
        {tables && !tables.length && <p className="muted small">Nicio masă publică acum. Creează tu una! 🏰</p>}
        <div className="mt-2 grid gap-2">
          <AnimatePresence initial={false}>
            {(tables || []).map((g) => {
              const st = g.state;
              const n = st.players?.length || 0;
              const open = st.status === 'lobby' && n < 3;
              return (
                <motion.div key={g.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={'flex items-center gap-3 rounded-2xl border px-3 py-2.5 ' + (open ? 'border-white/12 bg-white/5' : 'border-white/5 bg-white/[.02] opacity-60')}>
                  <span className="text-2xl">{st.mode === 'conquest' ? '🗺️' : '⚡'}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">Masa lui {st.players?.[0]?.name || '?'}</b>
                    <small className="font-bold text-white/50">
                      {st.mode === 'conquest' ? 'Eroberungskrieg' : 'Blitzkrieg'} · lecțiile 1–{st.maxLesson} · {st.status === 'lobby' ? 'în lobby' : 'în desfășurare'}
                    </small>
                  </span>
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map((k) => (
                      <span key={k} className={'h-2.5 w-2.5 rounded-full ' + (k < n ? 'bg-[#f5c443] shadow-[0_0_6px_rgba(245,196,67,.8)]' : 'bg-white/15')} />
                    ))}
                  </span>
                  {open ? (
                    <motion.button {...tap} className="btn small" onClick={() => go('joc?cod=' + g.code)}>
                      Intră
                    </motion.button>
                  ) : (
                    <span className="text-[11px] font-black uppercase text-white/40">{st.status === 'lobby' ? 'plin' : '⚔️'}</span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.form variants={rise} className="card" onSubmit={join}>
        <h3>Intră într-un joc privat</h3>
        <div className="row">
          <input placeholder="Codul jocului (ex. K7M2P)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} />
          <motion.button {...tap} className="btn" disabled={busy || code.length < 5}>Intră</motion.button>
        </div>
      </motion.form>
      {msg && <div className="msg bad">{msg}</div>}
    </motion.div>
  );
}
