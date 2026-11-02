import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, isDemo } from '../lib/backend.js';
import {
  actors,
  answerers,
  applyMove,
  botAction,
  BOT_NAMES,
  COLORS,
  freeRegions,
  landCount,
  MODES,
  playerIndex,
  tick,
  validConquestTargets,
  validPicks,
  validTargets,
} from '../game/engine.js';
import { ADJ, REGIONS } from '../game/map.js';
import GermanyMap from '../game/GermanyMap.jsx';
import { go } from '../lib/nav.js';
import { confetti, musicOn, setMusic, setSound, sfx, soundOn, startMusic, stopMusic } from '../lib/fx.js';

function useNow(active) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => set((x) => x + 1), 200);
    return () => clearInterval(iv);
  }, [active]);
  return Date.now();
}

const tap = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.94 } };

function Avatar({ p, size = 40 }) {
  const c = COLORS[p.color];
  return (
    <span
      className="grid place-items-center rounded-full font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        color: c.text,
        background: `radial-gradient(circle at 35% 30%, ${c.light}, ${c.fill} 55%, ${c.dark})`,
        boxShadow: `0 0 0 2px rgba(255,255,255,.15), 0 0 18px ${c.glow}`,
      }}
    >
      {p.bot ? '🤖' : (p.name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

// Panou cu statistica landurilor cucerite
function StatsPanel({ state, me, activeSet }) {
  const order = state.players.map((p, i) => ({ p, i })).sort((a, b) => landCount(state, b.i) - landCount(state, a.i));
  return (
    <motion.div layout className="glass grid gap-2 p-2.5" style={{ gridTemplateColumns: `repeat(${Math.max(state.players.length, 2)}, minmax(0,1fr))` }}>
      {order.map(({ p, i }, rank) => {
        const c = COLORS[p.color];
        const active = activeSet.has(i);
        const cap = Object.entries(state.castle || {}).find(([r]) => state.owner[r] === i);
        return (
          <motion.div
            layout
            key={p.id}
            className="relative flex flex-col items-center rounded-2xl px-1 py-2 text-center"
            style={{ background: `linear-gradient(180deg, ${c.fill}22, transparent)`, border: `1px solid ${active ? c.fill : 'rgba(255,255,255,.08)'}`, boxShadow: active ? `0 0 22px ${c.glow}` : 'none' }}
            animate={active ? { y: [0, -3, 0] } : { y: 0 }}
            transition={active ? { repeat: Infinity, duration: 1.2 } : {}}
          >
            {state.status !== 'lobby' && rank === 0 && landCount(state, i) > 0 && <span className="absolute -top-3 text-lg">👑</span>}
            <Avatar p={p} size={36} />
            <div className={'mt-1 w-full truncate text-xs font-extrabold ' + (i === me ? 'text-[#f5c443]' : 'text-white/85')}>
              {p.name}
              {i === me ? ' (tu)' : ''}
            </div>
            <motion.div key={landCount(state, i)} initial={{ scale: 1.6, color: '#fff' }} animate={{ scale: 1, color: p.color === 2 ? c.light : c.fill }} className="text-2xl font-black leading-none">
              {landCount(state, i)}
            </motion.div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">Landuri</div>
            <div className="text-[11px] font-black text-white/70">{state.scores[i] || 0} p</div>
            <div className="text-[11px] tracking-wider text-[#f5c443]">{cap ? '♜'.repeat(cap[1]) + '·'.repeat(3 - cap[1]) : state.status === 'lobby' ? '♜♜♜' : '—'}</div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function Timer({ left, total }) {
  const pct = total ? Math.max(0, Math.min(1, left / total)) : 0;
  const low = left <= 5;
  return (
    <div className="relative grid h-12 w-12 flex-none place-items-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r="17" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
        <circle cx="20" cy="20" r="17" fill="none" stroke={low ? '#ef4b3f' : '#f5c443'} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct * 106.8} 106.8`} style={{ transition: 'stroke-dasharray .2s linear', filter: `drop-shadow(0 0 4px ${low ? '#ef4b3f' : '#f5c443'})` }} />
      </svg>
      <span className={'relative text-base font-black ' + (low ? 'text-[#ff7a6e]' : 'text-[#f5c443]')}>{Math.ceil(left)}</span>
    </div>
  );
}

function Banner({ banner }) {
  const [show, setShow] = useState(null);
  const last = useRef(banner?.seq);
  const timer = useRef();
  const seq = banner?.seq;
  useEffect(() => {
    if (!banner || seq === last.current) return;
    last.current = seq;
    setShow(banner);
    sfx.banner();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(null), 2300);
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div key={show.seq} className="pointer-events-none fixed inset-x-0 top-[28%] z-50 flex justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            initial={{ x: '-120%', skewX: -12 }}
            animate={{ x: 0, skewX: -12 }}
            exit={{ x: '120%', skewX: -12 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#f5c443]/60 bg-gradient-to-r from-[#1a1d25] via-[#3a1410] to-[#3a2c08] px-6 py-4 text-center shadow-[0_0_60px_rgba(245,196,67,.35)]"
          >
            <div className="absolute inset-x-0 top-0 flex h-1.5">
              <i className="flex-1 bg-[#24272f]" />
              <i className="flex-1 bg-[#ef4b3f]" />
              <i className="flex-1 bg-[#f5c443]" />
            </div>
            <div style={{ transform: 'skewX(12deg)' }}>
              <div className="text-3xl font-black tracking-wide text-[#f5c443] drop-shadow-[0_0_14px_rgba(245,196,67,.7)]">{show.title}</div>
              {show.sub && <div className="mt-1 text-sm font-extrabold text-white/80">{show.sub}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AudioToggles() {
  const [fx, setFx] = useState(soundOn());
  const [mu, setMu] = useState(musicOn());
  const btn = 'grid h-10 w-10 place-items-center rounded-xl border text-lg transition';
  return (
    <div className="flex gap-1.5">
      <motion.button
        {...tap}
        title={fx ? 'Oprește efectele sonore' : 'Pornește efectele sonore'}
        onClick={() => { setSound(!fx); setFx(!fx); if (!fx) setTimeout(sfx.tap, 30); }}
        className={btn + (fx ? ' border-[#f5c443]/50 bg-[#f5c443]/15' : ' border-white/10 bg-white/5 opacity-60')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={fx ? '#f5c443' : '#9aa0ad'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill={fx ? 'rgba(245,196,67,.25)' : 'none'} />
          {fx ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /> : <path d="M17 9l5 6M22 9l-5 6" />}
        </svg>
      </motion.button>
      <motion.button
        {...tap}
        title={mu ? 'Oprește muzica' : 'Pornește muzica'}
        onClick={() => { setMusic(!mu); setMu(!mu); }}
        className={btn + (mu ? ' border-[#ef4b3f]/50 bg-[#ef4b3f]/15' : ' border-white/10 bg-white/5 opacity-60')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={mu ? '#ff7a6e' : '#9aa0ad'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V6l11-2v12" />
          <circle cx="6.5" cy="18" r="2.5" fill={mu ? 'rgba(239,75,63,.35)' : 'none'} />
          <circle cx="17.5" cy="16" r="2.5" fill={mu ? 'rgba(239,75,63,.35)' : 'none'} />
          {!mu && <path d="M3 3l18 18" />}
        </svg>
      </motion.button>
    </div>
  );
}

export function ModeCard({ mode, selected, onClick, disabled }) {
  const m = MODES[mode];
  const isBlitz = mode === 'blitz';
  return (
    <motion.button
      {...(disabled ? {} : tap)}
      onClick={onClick}
      disabled={disabled}
      className={'relative w-full overflow-hidden rounded-2xl p-4 text-left transition ' + (selected ? 'border border-[#f5c443] bg-[#f5c443]/10 shadow-gold' : 'border border-white/10 bg-white/5')}
    >
      <div className="flex items-center gap-3">
        <span className={'grid h-12 w-12 place-items-center rounded-xl text-2xl ' + (isBlitz ? 'bg-gradient-to-b from-[#ff6b5f] to-[#a8231a]' : 'bg-gradient-to-b from-[#ffd96b] to-[#b9850a]')}>{isBlitz ? '⚡' : '🗺️'}</span>
        <div className="flex-1">
          <div className="text-lg font-black">{m.de}</div>
          <div className="text-sm font-bold text-white/60">{m.ro}</div>
        </div>
        {selected && <span className="text-xl text-[#f5c443]">✓</span>}
      </div>
      <p className="m-0 mt-2 text-[13px] font-semibold leading-snug text-white/55">
        {isBlitz
          ? 'Cel mai rapid răspuns corect ia 2 landuri, al doilea 1. Apoi bătălii; capitala (3 turnuri) se atacă doar din vecinătate — un turn zdrobit îți dă o nouă întrebare în același tur.'
          : 'Pe rând, fiecare alege un land liber (apoi vecin cu al lui; fără vecini liberi — oriunde). Corect = primești landul (200 p), greșit = rămâne liber. Când rămân mai puține landuri decât jucători: cel mai rapid corect ia câte unul (300 p). Apoi războiul — fiecare land cucerit valorează 400 p.'}
      </p>
    </motion.button>
  );
}

export default function Game({ gameId, user, profile, refresh }) {
  const [game, setGame] = useState(null);
  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [copied, setCopied] = useState(false);
  const stateRef = useRef(null);
  const localTimer = useRef({ seq: -1, deadline: 0, shownAt: 0, ms: 0 });
  const botTimers = useRef({});
  const recorded = useRef(false);
  const joinSent = useRef(0);
  const isHost = !!game && game.host === user.id;
  const hostRef = useRef(false);
  hostRef.current = isHost;

  // ---------------------------------------------------------------- încărcare
  useEffect(() => {
    api
      .getGame(gameId)
      .then((g) => {
        if (!g) return setErr('Jocul nu mai există.');
        setGame(g);
        stateRef.current = g.state;
        setState(g.state);
      })
      .catch((e) => setErr(e.message));
  }, [gameId]);

  const accept = useCallback((st) => {
    const cur = stateRef.current;
    if (cur && (st.rev || 0) < (cur.rev || 0)) return;
    stateRef.current = st;
    setState(st);
  }, []);

  const commit = useCallback(
    (next) => {
      if (next === stateRef.current) return;
      next.rev = (stateRef.current?.rev || 0) + 1;
      stateRef.current = next;
      setState(next);
      api.updateGame(gameId, next).catch((e) => setErr('Eroare la salvare: ' + e.message));
    },
    [gameId]
  );
  const hostApply = useCallback((uid, move) => commit(applyMove(stateRef.current, uid, move, Date.now())), [commit]);

  // ---------------------------------------------------------------- sincronizare
  useEffect(() => {
    if (!game) return;
    const seen = new Set();
    let lastId = 0;
    let ready = !hostRef.current;
    const onMove = (row) => {
      if (!hostRef.current || seen.has(row.id)) return;
      seen.add(row.id);
      lastId = Math.max(lastId, row.id);
      if (ready) hostApply(row.user_id, row.move);
    };
    if (hostRef.current)
      api.movesSince(game.id, 0).then((rows) => {
        rows.forEach((r) => {
          seen.add(r.id);
          lastId = Math.max(lastId, r.id);
        });
        // aplicăm "join"-urile vechi (sigure, idempotente) în caz că gazda a reîncărcat pagina
        rows.filter((r) => r.move.type === 'join').forEach((r) => hostApply(r.user_id, r.move));
        ready = true;
      });
    const unsub = api.subscribeGame(game.id, { onState: (st) => !hostRef.current && accept(st), onMove });
    const iv = setInterval(async () => {
      try {
        if (hostRef.current) {
          if (ready) (await api.movesSince(game.id, lastId)).forEach(onMove);
        } else {
          const g = await api.getGame(game.id);
          if (g) accept(g.state);
        }
      } catch {}
    }, 2500);
    return () => {
      unsub();
      clearInterval(iv);
    };
  }, [game, hostApply, accept]);

  // gazda: cronometru
  useEffect(() => {
    if (!isHost) return;
    const iv = setInterval(() => {
      const s = stateRef.current;
      if (!s || s.status !== 'playing') return;
      const n = tick(s, Date.now());
      if (n !== s) commit(n);
    }, 300);
    return () => clearInterval(iv);
  }, [isHost, commit]);

  // gazda: boți
  useEffect(() => {
    if (!isHost || !state || state.status !== 'playing') return;
    state.players.forEach((p, i) => {
      if (!p.bot) return;
      const key = `${state.timer.seq}-${i}`;
      if (botTimers.current[key]) return;
      const act = botAction(state, i);
      if (!act) return;
      botTimers.current[key] = setTimeout(() => hostApply(p.id, act.move), act.delay);
    });
  }, [isHost, state, hostApply]);
  useEffect(() => () => Object.values(botTimers.current).forEach(clearTimeout), []);

  // jucător: intră automat în lobby
  useEffect(() => {
    if (!state || !game || isHost || state.status !== 'lobby') return;
    if (playerIndex(state, user.id) >= 0 || state.players.length >= 3) return;
    if (Date.now() - joinSent.current < 4000) return;
    joinSent.current = Date.now();
    api.sendMove(game.id, { type: 'join', name: profile.display_name }).catch((e) => setErr(e.message));
  }, [state, game, isHost, user.id, profile.display_name]);

  // final: înregistrează rezultatul
  useEffect(() => {
    if (state?.status === 'finished' && !recorded.current && playerIndex(state, user.id) >= 0) {
      recorded.current = true;
      setTimeout(() => api.recordResult(gameId).then(refresh).catch(() => {}), isHost ? 300 : 1500);
    }
  }, [state, gameId, isHost, user.id, refresh]);

  // sunete la rezultate + confetti la victorie
  const lastFx = useRef(null);
  useEffect(() => {
    if (!state) return;
    const key = state.timer?.seq;
    if (lastFx.current === key) return;
    lastFx.current = key;
    const i = playerIndex(state, user.id);
    if (/-result$/.test(state.phase || '') && state.result?.answers?.[i]) {
      state.result.answers[i].c === state.result.correctAnswer ? sfx.correct() : sfx.wrong();
    }
    if (state.status === 'finished' && i >= 0) {
      if (state.scores[i] === Math.max(...state.scores)) {
        sfx.fanfare();
        confetti(3500);
      } else sfx.finish();
    }
  }, [state, user.id]);

  // muzica jocului
  useEffect(() => {
    startMusic();
    return () => stopMusic();
  }, []);

  // sunete pentru evenimente pe hartă (cucerire, turn zdrobit, apărare)
  const seenEv = useRef(null);
  useEffect(() => {
    const evs = state?.events || [];
    if (seenEv.current === null) {
      seenEv.current = new Set(evs.map((e) => e.id));
      return;
    }
    const fresh = evs.filter((e) => !seenEv.current.has(e.id));
    fresh.forEach((e) => seenEv.current.add(e.id));
    if (fresh.some((e) => e.type === 'crush')) sfx.boom();
    else if (fresh.some((e) => e.type === 'capture')) sfx.capture();
    else if (fresh.some((e) => e.type === 'defend')) sfx.defend();
  }, [state?.events]); // eslint-disable-line react-hooks/exhaustive-deps

  // e rândul tău / apare întrebarea
  const lastTurn = useRef(null);
  useEffect(() => {
    if (!state || state.status !== 'playing') return;
    const key = state.timer.seq;
    if (lastTurn.current === key) return;
    lastTurn.current = key;
    const i = playerIndex(state, user.id);
    if (state.q && answerers(state).includes(i)) sfx.go();
    else if (state.q) sfx.whoosh();
    else if (actors(state).includes(i)) sfx.turn();
  }, [state, user.id]);

  const playing = state?.status === 'playing';
  const now = useNow(playing);

  // tic-tac în numărătoarea 3-2-1
  const lastCount = useRef(null);
  const countNow = state?.phase === 'ready' ? Math.ceil(Math.max(0, (localTimer.current.deadline - now) / 1000)) : null;
  useEffect(() => {
    if (countNow && countNow !== lastCount.current && countNow <= 3) sfx.tick();
    lastCount.current = countNow;
  }, [countNow]);

  if (err)
    return (
      <div className="page">
        <div className="msg bad">{err}</div>
        <button className="btn" onClick={() => go('joc')}>Înapoi</button>
      </div>
    );
  if (!state) return <div className="hexbg min-h-screen p-6 text-center text-white/60">Se încarcă jocul…</div>;

  if (state.timer.seq !== localTimer.current.seq) {
    localTimer.current = { seq: state.timer.seq, deadline: Date.now() + state.timer.ms, shownAt: Date.now(), ms: state.timer.ms };
  }
  const left = Math.max(0, (localTimer.current.deadline - now) / 1000);
  const total = localTimer.current.ms / 1000;
  const me = playerIndex(state, user.id);
  const send = (move) => {
    sfx.tap();
    if (isHost) hostApply(user.id, move);
    else api.sendMove(game.id, move).catch((e) => setErr(e.message));
  };
  const nm = (i) => state.players[i]?.name || '?';
  const col = (i) => COLORS[state.players[i]?.color ?? 0];
  const Dot = ({ i }) => <span className="inline-block h-3 w-3 rounded-full align-middle" style={{ background: col(i).fill, boxShadow: `0 0 8px ${col(i).glow}` }} />;
  const ph = state.phase;
  const mode = MODES[state.mode || 'blitz'];

  const ans = answerers(state);
  const iAnswer = !!state.q && ans.includes(me);
  const answered = (state.answers && state.answers[me]) || (myAnswer && myAnswer.qid === state.q?.id);
  const acting = actors(state);

  let selectable = [];
  let moveType = null;
  if (acting.includes(me)) {
    if (ph === 'expand-pick' || ph === 'start-pick' || ph === 'tie-pick') {
      selectable = validPicks(state, me);
      moveType = 'pick';
    } else if (ph === 'battle-select') {
      selectable = validTargets(state, me);
      moveType = 'attack';
    } else if (ph === 'conq-target') {
      selectable = validConquestTargets(state, me);
      moveType = 'target';
    }
  }
  const myTarget = state.conq?.targets?.[me] || null;
  const activeSet = new Set([...acting, ...ans.filter((k) => !state.answers?.[k])]);

  function choose(c) {
    if (answered || !iAnswer) return;
    setMyAnswer({ qid: state.q.id, c });
    send({ type: 'answer', qid: state.q.id, c, t: Date.now() - localTimer.current.shownAt });
  }

  const invite = `${location.origin}${location.pathname}#/joc?cod=${game.code}`;
  async function share() {
    const text = `Hai la „Cucerește Germania” (${mode.de})! Cod: ${game.code} — ${invite}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  // ---------------------------------------------------------------- panouri
  const panelKey = `${ph}-${state.timer.seq}`;
  let panel = null;
  let panelOnTop = false;

  if (state.status === 'lobby') {
    panel = (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-white/45">Cod joc</div>
            <div className="code big">{game.code}</div>
          </div>
          <motion.button {...tap} className="btn small" onClick={share}>{copied ? 'Copiat ✓' : 'Invită'}</motion.button>
        </div>
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className={'flex items-center gap-3 rounded-xl px-3 py-2 ' + (state.players[i] ? 'border border-white/10 bg-white/5' : 'border border-dashed border-white/15')}>
              {state.players[i] ? (
                <>
                  <Avatar p={state.players[i]} size={30} />
                  <b className="flex-1">{state.players[i].name}</b>
                  <small className="font-bold text-white/45">{i === 0 ? 'gazdă' : COLORS[state.players[i].color].name}</small>
                </>
              ) : (
                <span className="py-1 text-sm font-bold text-white/35">Așteaptă un jucător…</span>
              )}
            </motion.div>
          ))}
        </div>
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-white/45">Modul de joc</div>
        <div className="grid gap-2">
          {['blitz', 'conquest'].map((m) => (
            <ModeCard key={m} mode={m} selected={state.mode === m} disabled={!isHost} onClick={() => isHost && send({ type: 'mode', mode: m })} />
          ))}
        </div>
        {isHost ? (
          <>
            {state.players.length < 3 && (
              <motion.button {...tap} className="btn ghost" onClick={() => {
                const n = state.players.filter((p) => p.bot).length;
                hostApply('bot-' + Math.random().toString(36).slice(2, 7), { type: 'join', name: BOT_NAMES[n] || 'Bot', bot: true });
              }}>+ Adaugă un bot</motion.button>
            )}
            <motion.button {...tap} className="btn" disabled={state.players.length < 2} onClick={() => send({ type: 'start' })}>
              Începe · {mode.de} ({state.players.length}/3)
            </motion.button>
            {!isDemo && <p className="text-center text-xs font-bold text-white/40">Ține aplicația deschisă — telefonul tău conduce jocul.</p>}
          </>
        ) : me >= 0 ? (
          <p className="text-center font-bold text-white/60">Ai intrat! Așteaptă ca gazda să înceapă.</p>
        ) : state.players.length >= 3 ? (
          <p className="msg bad">Jocul e plin.</p>
        ) : (
          <p className="text-white/50">Se intră în joc…</p>
        )}
      </div>
    );
  } else if (ph === 'ready' && state.pending) {
    panelOnTop = true;
    const pp = state.pending.phase;
    const n = Math.max(1, Math.ceil(left - 0.6));
    const what =
      pp === 'battle-q' ? (
        <>
          <Dot i={state.battle.attacker} /> <b>{nm(state.battle.attacker)}</b> atacă {state.castle?.[state.battle.target] ? '🏰 capitala lui' : REGIONS[state.battle.target].short + ' ·'} <Dot i={state.battle.defender} /> <b>{nm(state.battle.defender)}</b>
          {state.battle.assault > 0 && <div className="mt-1 text-xs font-black uppercase tracking-widest text-[#ff7a6e]">Asalt continuu #{state.battle.assault + 1}</div>}
        </>
      ) : pp === 'conq-q' ? (
        <>Răspuns corect = primești landul ales{myTarget ? <> · al tău: <b className="text-[#f5c443]">{REGIONS[myTarget].short}</b></> : ''}</>
      ) : pp === 'tie-q' ? (
        <><b className="text-[#ff7a6e]">⚡ Stichfrage</b> — cel mai rapid corect ia un land (+300 p)</>
      ) : (
        <>Întrebare pentru toți · 🥇 2 landuri · 🥈 1 land</>
      );
    const involvedMe = pp === 'battle-q' ? [state.battle.attacker, state.battle.defender].includes(me) : pp === 'conq-q' ? !!myTarget : true;
    panel = (
      <div className="py-2 text-center">
        <div className="text-[11px] font-black uppercase tracking-[.25em] text-white/45">{involvedMe ? 'Pregătește-te!' : 'Urmărește duelul'}</div>
        <div className="relative mx-auto my-2 grid h-28 w-28 place-items-center">
          <motion.span className="absolute inset-0 rounded-full border-4 border-[#f5c443]/30" animate={{ scale: [1, 1.25], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1 }} />
          <span className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe08a,#f5c443_45%,#b9850a)] shadow-gold" />
          <AnimatePresence mode="popLayout">
            <motion.span key={n} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} className="relative text-5xl font-black text-[#2a1d00]">
              {n}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="text-sm font-bold text-white/80">{what}</div>
      </div>
    );
  } else if (state.q && (ph === 'expand-q' || ph === 'battle-q' || ph === 'conq-q' || ph === 'tie-q')) {
    panelOnTop = true;
    const head =
      ph === 'battle-q' ? (
        <span>
          <Dot i={state.battle.attacker} /> <b>{nm(state.battle.attacker)}</b> atacă {state.castle?.[state.battle.target] ? '🏰 capitala' : REGIONS[state.battle.target].short} (<Dot i={state.battle.defender} /> {nm(state.battle.defender)})
          {state.battle.assault > 0 && <span className="ml-1 rounded-md bg-[#ef4b3f] px-1.5 py-0.5 text-[10px] font-black uppercase text-white">Asalt #{state.battle.assault + 1}</span>}
        </span>
      ) : ph === 'conq-q' ? (
        <span>
          {myTarget ? <>Landul tău: <b className="text-[#f5c443]">{REGIONS[myTarget].short}</b> · </> : null}
          <span className="text-white/55">timpul nu contează</span>
        </span>
      ) : ph === 'tie-q' ? (
        <span>
          <b className="text-[#ff7a6e]">⚡ Stichfrage!</b> <span className="text-white/55">Cel mai rapid corect alege un land</span>
        </span>
      ) : (
        <span>
          <b>Toată lumea!</b> <span className="text-white/55">1. ia 2 landuri · 2. ia 1</span>
        </span>
      );
    panel = (
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold leading-snug">{head}</div>
          <Timer left={left} total={total} />
        </div>
        <div className="mt-2 text-[11px] font-black uppercase tracking-widest text-white/45">{state.q.kind}</div>
        <div className="text-2xl font-black leading-tight">{state.q.prompt}</div>
        {state.q.sub && <div className="text-sm font-bold text-white/50">„{state.q.sub}”</div>}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {state.q.options.map((o, i) => {
            const picked = myAnswer?.qid === state.q.id && myAnswer.c === i;
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                whileHover={iAnswer && !answered ? { scale: 1.03 } : {}}
                whileTap={iAnswer && !answered ? { scale: 0.93 } : {}}
                disabled={!iAnswer || !!answered}
                onClick={() => choose(i)}
                className={
                  'rounded-2xl px-3 py-3.5 text-[15px] font-extrabold transition ' +
                  (picked
                    ? 'border border-[#f5c443] bg-gradient-to-b from-[#ffd96b] to-[#f2b51f] text-[#2a1d00] shadow-[0_4px_0_#b9850a,0_0_24px_rgba(245,196,67,.5)]'
                    : 'border border-white/12 bg-white/[.06] text-white shadow-[0_4px_0_rgba(0,0,0,.55)] ' + (!iAnswer || answered ? 'opacity-50' : 'hover:bg-white/10'))
                }
              >
                {o}
              </motion.button>
            );
          })}
        </div>
        <p className="m-0 mt-2.5 text-center text-xs font-bold text-white/45">
          {!iAnswer ? 'Doar cei implicați răspund acum — urmărește!' : answered ? 'Ai răspuns. Așteaptă ceilalți…' : ph === 'conq-q' ? 'Gândește-te bine — ai timp.' : 'Corect și repede!'}
          {' · '}Au răspuns: {Object.keys(state.answers).length}/{ans.length}
        </p>
      </div>
    );
  } else if (/-result$/.test(ph || '')) {
    panelOnTop = true;
    const r = state.result;
    const involved = ph === 'battle-result' ? [state.battle.attacker, state.battle.defender] : ph === 'conq-result' ? Object.keys(state.conq.targets).map(Number).filter((k) => state.conq.targets[k]) : state.players.map((_, k) => k);
    panel = (
      <div>
        {r.lines ? (
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {r.lines.map((l, k) => (
              <motion.li key={k} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 * k }} className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold">
                {l}
              </motion.li>
            ))}
          </ul>
        ) : (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={'rounded-xl px-3 py-2.5 text-center font-extrabold ' + (r.outcome === 'captured' ? 'bg-[#ef4b3f]/20 text-[#ffb0a8]' : r.outcome === 'hit' ? 'bg-[#f5c443]/20 text-[#ffe08a]' : r.outcome === 'defended' ? 'bg-[#3ccf7a]/15 text-[#9ff3c1]' : 'bg-white/5')}>
            {r.text}
          </motion.div>
        )}
        {state.q && (
          <p className="m-0 mt-2 text-center text-sm font-bold text-white/60">
            Răspuns corect: <b className="text-[#3ccf7a]">{state.q.options[r.correctAnswer]}</b>
          </p>
        )}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div key={state.timer.seq} className="h-full rounded-full bg-gradient-to-r from-[#ef4b3f] to-[#f5c443]" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: total, ease: 'linear' }} />
        </div>
        <p className="m-0 mt-1 text-center text-[11px] font-bold text-white/40">Continuăm în {Math.ceil(left)}s…</p>
        <div className="mt-2 grid gap-1">
          {involved.map((k) => {
            const a = r.answers?.[k];
            return (
              <div key={k} className="flex items-center gap-2 text-sm font-bold">
                <Dot i={k} /> {nm(k)}
                {state.mode === 'conquest' && ph === 'conq-result' && <span className="text-white/45">→ {REGIONS[state.conq.targets[k]]?.short}</span>}
                <span className="ml-auto">{a ? (a.c === r.correctAnswer ? '✅' : '❌') : '—'}</span>
                {a && ph !== 'conq-result' && <small className="w-12 text-right text-white/45">{(a.t / 1000).toFixed(2)}s</small>}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (ph === 'conq-target') {
    const who = acting[0];
    const mine = who === me;
    panel = (
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-[#f5c443]">Împărțirea · runda {state.conq.round}</div>
            <b className={mine ? 'text-[#f5c443]' : ''}>
              {mine ? (!landCount(state, me) ? 'Alege primul tău land (va fi capitala)' : selectable.every((r) => ADJ[r].some((o) => state.owner[o] === me)) ? 'Alege un land liber, vecin cu al tău' : 'Nu mai ai vecini liberi — alege orice land liber') : <><Dot i={who} /> {nm(who)} alege un land…</>}
            </b>
          </div>
          <Timer left={left} total={total} />
        </div>
        <div className="mt-2 grid gap-1">
          {state.conq.order.map((k, idx) => {
            const t = state.conq.targets[k];
            return (
              <div key={k} className={'flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold ' + (idx === state.conq.turn ? 'bg-[#f5c443]/10' : '')}>
                <span className="w-4 text-white/35">{idx + 1}.</span> <Dot i={k} /> {nm(k)}
                <span className="ml-auto text-white/60">{t ? REGIONS[t].short : t === null ? 'nu are vecini liberi' : idx === state.conq.turn ? 'alege…' : '—'}</span>
              </div>
            );
          })}
        </div>
        <p className="m-0 mt-2 text-xs font-bold text-white/45">Doar landuri libere, vecine cu ale tale (dacă nu mai ai vecini liberi — oriunde). Nu se poate alege același land de două ori. Răspuns corect = +200 p.</p>
      </div>
    );
  } else if (ph === 'expand-pick' || ph === 'start-pick' || ph === 'tie-pick' || ph === 'battle-select') {
    const who = acting[0];
    const mine = who === me;
    const verb = ph === 'battle-select' ? 'alege pe cine atacă' : ph === 'start-pick' ? 'alege landul de start' : 'alege un land';
    const myVerb =
      ph === 'battle-select' ? 'E rândul tău: alege ce ataci!' : ph === 'start-pick' ? 'Alege landul de start (devine capitala ta)' : ph === 'tie-pick' ? 'Ai câștigat Stichfrage — alege un land!' : 'Alege un land liber pe hartă!';
    panel = (
      <div className="flex items-center justify-between gap-3">
        <div>
          {ph === 'battle-select' && (
            <div className="text-[11px] font-black uppercase tracking-widest text-[#ff7a6e]">
              {state.mode === 'conquest' ? 'Război · ' : ''}Bătălia {state.battle.turn + 1}/{state.battle.order.length}
            </div>
          )}
          <b className={mine ? 'text-[#f5c443]' : ''}>{mine ? myVerb : <><Dot i={who} /> {nm(who)} {verb}…</>}</b>
          {mine && ph === 'battle-select' && <p className="m-0 mt-1 text-xs font-bold text-white/45">Capitalele (🏰) se pot ataca doar dintr-un land vecin.</p>}
          {mine && ph === 'expand-pick' && state.picks.filter((x) => x === me).length > 1 && <p className="m-0 mt-1 text-xs font-bold text-white/45">Mai ai o alegere după aceasta.</p>}
        </div>
        <Timer left={left} total={total} />
      </div>
    );
  } else if (ph === 'tie-banner') {
    panel = (
      <div className="text-center">
        <div className="text-2xl font-black text-[#ff7a6e]">⚡ Stichfrage</div>
        <p className="m-0 font-bold text-white/60">{freeRegions(state).length} {freeRegions(state).length === 1 ? 'land liber' : 'landuri libere'} · 1 întrebare = 1 land pentru cel mai rapid răspuns corect (+300 p)</p>
      </div>
    );
  } else if (state.status === 'finished') {
    panelOnTop = true;
    const order = state.players.map((p, i) => ({ p, i, s: state.scores[i] })).sort((a, b) => b.s - a.s);
    panel = (
      <div>
        <h2 className="text-center text-[#f5c443]">🏆 Sieg!</h2>
        <div className="flex items-end justify-center gap-3">
          {[order[1], order[0], order[2]].filter(Boolean).map((o) => {
            const rank = order.indexOf(o);
            return (
              <motion.div key={o.i} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + (2 - rank) * 0.15, type: 'spring' }} className="flex flex-col items-center">
                <span className="text-xl">{['👑', '🥈', '🥉'][rank]}</span>
                <Avatar p={o.p} size={rank === 0 ? 56 : 44} />
                <b className={'mt-1 text-sm ' + (o.i === me ? 'text-[#f5c443]' : '')}>{o.p.name}</b>
                <div className="mt-1 grid w-20 place-items-center rounded-t-xl border border-white/10 bg-white/5" style={{ height: [104, 88, 76][rank] }}>
                  <div className="text-xl font-black">{landCount(state, o.i)}</div>
                  <div className="text-[10px] font-bold uppercase text-white/45">landuri</div>
                  <div className="text-xs font-black text-[#f5c443]">{o.s} p</div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {me >= 0 && <p className="mt-3 text-center text-xs font-bold text-white/45">Punctele au fost adăugate în clasament.</p>}
        <motion.button {...tap} className="btn" onClick={() => go('joc')}>Joc nou</motion.button>
        <motion.button {...tap} className="btn ghost" onClick={() => go('colegi')}>Clasament</motion.button>
      </div>
    );
  }

  const target = state.battle?.target && (ph === 'battle-q' || ph === 'battle-result') ? state.battle.target : null;
  const reveal = state.conq && ['conq-target', 'ready', 'conq-q', 'conq-result'].includes(ph) && (ph !== 'ready' || state.pending?.phase === 'conq-q') ? state.conq.targets : null;

  const panelEl = panel && (
    <AnimatePresence mode="wait">
      <motion.div key={panelKey} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className="glass my-3 p-4">
        {panel}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="hexbg min-h-screen">
      <Banner banner={state.banner} />
      <div className="mx-auto max-w-[620px] px-4 pb-10 pt-3">
        <div className="flex items-center justify-between">
          <motion.button {...tap} onClick={() => go('joc')} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg">‹</motion.button>
          <div className="brand">Lerne<span>Deutsch</span></div>
          <AudioToggles />
        </div>
        <div className="mt-2 flex justify-center">
          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.2em] text-white/60">
            {state.mode === 'conquest' ? '🗺️' : '⚡'} {mode.de} · {state.players.length} jucători
          </span>
        </div>
        <div className="mt-3">
          <StatsPanel state={state} me={me} activeSet={activeSet} />
        </div>
        {panelOnTop && panelEl}
        <div className="mt-2">
          <GermanyMap state={state} selectable={selectable} onSelect={(rid) => moveType && send({ type: moveType, region: rid })} target={target} myTarget={['conq-target', 'conq-q', 'ready'].includes(ph) && state.conq ? myTarget : null} revealTargets={reveal} />
        </div>
        {!panelOnTop && panelEl}
        {state.log.length > 0 && (
          <ul className="m-0 mt-3 list-none rounded-2xl border border-white/5 bg-black/30 p-3 text-xs font-semibold text-white/50">
            <AnimatePresence initial={false}>
              {state.log.map((l, i) => (
                <motion.li key={l + i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={'py-0.5 ' + (i === 0 ? 'font-extrabold text-white/85' : '')}>
                  {l}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        <p className="mt-3 text-center text-[10px] text-white/25">Contururi hartă: @svg-maps/germany (CC BY 4.0)</p>
      </div>
    </div>
  );
}
