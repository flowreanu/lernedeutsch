import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, canDeleteMessage } from '../lib/backend.js';
import { sfx } from '../lib/fx.js';
import MessageBody from '../components/MessageBody.jsx';

const tap = { whileHover: { scale: 1.04 }, whileTap: { scale: 0.92 } };
const PALETTE = ['#f5c443', '#ef4b3f', '#9aa0ad', '#ff9f43', '#e86a8f', '#5fb4ff', '#5fe08f'];
const colorOf = (id) => PALETTE[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const hhmm = (d) => new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
const isMuted = (u) => u?.muted_until && new Date(u.muted_until) > new Date();

const EMOJI = {
  '😀': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍', '🥰', '😘', '😎', '🤓', '🤔', '🤨', '😐', '🙄', '😏', '😴', '😮', '😲', '😳', '🥺', '😢', '😭', '😤', '😡', '🤯', '🥳', '🤩', '😇', '🤗', '🤫', '🤭', '😬', '🫡', '🤪'],
  '👍': ['👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '🤝', '✌️', '🤞', '👌', '🤙', '👀', '🫶', '✍️', '🤷', '🙋', '🙈', '💯', '✅', '❌', '⭐', '🔥', '⚡', '💥', '🎉', '🎊', '🏆', '🥇', '🎯'],
  '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💖', '💤', '💬', '💡', '❗', '❓'],
  '🇩🇪': ['🇩🇪', '🇷🇴', '🥨', '🍺', '🌭', '🥖', '🧀', '☕', '🍰', '🏰', '⚔️', '🛡️', '👑', '🗺️', '🚆', '🚗', '🏠', '📚', '📝', '🎓', '🐻', '🦅', '⛰️', '🌲', '🎄', '⚽', '🎮', '🎵'],
};

function EmojiPicker({ onPick, onClose }) {
  const [tab, setTab] = useState('😀');
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="absolute bottom-[calc(100%+8px)] left-0 z-30 w-[min(340px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-[#161b26]/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,.7)] backdrop-blur-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex gap-1 border-b border-white/10 pb-2">
        {Object.keys(EMOJI).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={'flex-1 rounded-lg border-0 py-1.5 text-lg ' + (tab === k ? 'bg-[#f5c443]/20' : 'bg-transparent')}>
            {k}
          </button>
        ))}
        <button type="button" onClick={onClose} className="rounded-lg border-0 bg-transparent px-2 text-white/40">
          ✕
        </button>
      </div>
      <div className="grid max-h-[210px] grid-cols-8 gap-0.5 overflow-y-auto">
        {EMOJI[tab].map((e) => (
          <motion.button key={e} type="button" whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.8 }} onClick={() => onPick(e)} className="grid h-10 place-items-center rounded-lg border-0 bg-transparent text-[22px] hover:bg-white/10">
            {e}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function RoleBadge({ role }) {
  if (role === 'admin') return <span className="rounded-md bg-[#f5c443]/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#f5c443]">👑 Admin</span>;
  if (role === 'moderator') return <span className="rounded-md bg-[#ef4b3f]/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#ff7a6e]">🛡️ Mod</span>;
  return null;
}

function Avatar({ id, name, size = 34 }) {
  const c = colorOf(id);
  return (
    <span className="grid flex-none place-items-center rounded-full font-black text-[#14161c]" style={{ width: size, height: size, fontSize: size * 0.42, background: `radial-gradient(circle at 35% 30%, #fff8, ${c} 60%)`, boxShadow: `0 0 12px ${c}55` }}>
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

// Fereastra de moderare pentru un utilizator
function ModSheet({ target, me, message, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const isAdmin = me.role === 'admin';
  const canMute = (isAdmin || me.role === 'moderator') && target.role !== 'admin' && !(me.role === 'moderator' && target.role === 'moderator') && target.id !== me.id;
  const run = async (fn, label) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      sfx.tap();
      onDone(label);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] rounded-t-3xl border border-white/10 bg-[#141924] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,.7)]"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
        <div className="flex items-center gap-3">
          <Avatar id={target.id} name={target.display_name} size={44} />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-lg font-black">
              {target.display_name} <RoleBadge role={target.role} />
            </div>
            <div className="text-xs font-bold text-white/50">
              {target.banned ? '⛔ Banat' : isMuted(target) ? `🔇 Mute până la ${hhmm(target.muted_until)}` : 'Activ'}
            </div>
          </div>
        </div>

        {canMute && (
          <>
            <div className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Mute temporar (nu poate scrie în chat)</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[5, 15, 30].map((m) => (
                <motion.button key={m} {...tap} disabled={busy} onClick={() => run(() => api.mute(target.id, m), `${target.display_name} are mute ${m} min`)} className="btn small !w-full !bg-none !bg-[#2a2f3c] !text-white !shadow-[0_4px_0_#0b0d12]">
                  🔇 {m} min
                </motion.button>
              ))}
            </div>
            {isMuted(target) && (
              <motion.button {...tap} disabled={busy} className="btn ghost" onClick={() => run(() => api.unmute(target.id), `${target.display_name} poate scrie din nou`)}>
                🔊 Scoate mute-ul
              </motion.button>
            )}
          </>
        )}

        {isAdmin && target.id !== me.id && target.role !== 'admin' && (
          <>
            <div className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Doar admin</div>
            {!target.banned && (
              <motion.button {...tap} disabled={busy} className="btn ghost" onClick={() => run(() => api.setRole(target.id, target.role === 'moderator' ? 'user' : 'moderator'), target.role === 'moderator' ? `${target.display_name} nu mai e moderator` : `${target.display_name} e acum moderator`)}>
                {target.role === 'moderator' ? '🛡️ Retrage rolul de moderator' : '🛡️ Numește moderator'}
              </motion.button>
            )}
            <motion.button {...tap} disabled={busy} className={'btn ' + (target.banned ? 'green' : 'red')} onClick={() => run(() => api.ban(target.id, !target.banned), target.banned ? `${target.display_name} a fost debanat` : `${target.display_name} a fost banat`)}>
              {target.banned ? '✅ Debanează' : '⛔ Banează utilizatorul'}
            </motion.button>
          </>
        )}

        {message && canDeleteMessage(me, target.id, target.role) && (
          <motion.button {...tap} disabled={busy} className="btn ghost" onClick={() => run(() => api.deleteMessage(message.id), 'Mesaj șters')}>
            🗑️ Șterge acest mesaj
          </motion.button>
        )}
        {isAdmin && target.id !== me.id && (
          <motion.button
            {...tap}
            disabled={busy}
            className="btn ghost"
            onClick={() => run(async () => { const n = await api.purgeMessages(target.id); return n; }, `Au fost șterse mesajele lui ${target.display_name}`)}
          >
            🧹 Șterge TOATE mesajele lui {target.display_name}
          </motion.button>
        )}
        {!canMute && !isAdmin && target.id !== me.id && <p className="mt-4 text-sm font-bold text-white/50">Nu ai drepturi asupra acestui utilizator (moderatorii nu au putere asupra altor moderatori sau a adminului).</p>}
        {err && <div className="msg bad">{err}</div>}
        <button className="link" onClick={onClose}>
          Închide
        </button>
      </motion.div>
    </motion.div>
  );
}

function UsersPanel({ me, onClose, onPick, version }) {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    api.listUsers().then(setUsers).catch(() => setUsers([]));
  }, [version]);
  const list = (users || []).filter((u) => !q || (u.display_name || '').toLowerCase().includes(q.toLowerCase()));
  return (
    <motion.div className="fixed inset-0 z-40 flex justify-center bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="mt-10 flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-3xl border border-white/10 bg-[#141924] p-4">
        <div className="flex items-center justify-between">
          <h2 className="m-0">🛡️ Moderare</h2>
          <button className="link !m-0" onClick={onClose}>
            Închide
          </button>
        </div>
        <p className="m-0 text-xs font-bold text-white/45">{me.role === 'admin' ? 'Ca admin poți da mute, bana și numi moderatori.' : 'Ca moderator poți da mute (5, 15 sau 30 de minute).'}</p>
        <input className="search mt-3" placeholder="Caută jucător…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-3 flex-1 overflow-y-auto">
          {!users && <p className="text-white/50">Se încarcă…</p>}
          {list.map((u, k) => (
            <motion.button key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.03 }} onClick={() => onPick(u)} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left">
              <Avatar id={u.id} name={u.display_name} />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-extrabold">
                  {u.display_name} {u.id === me.id && <small className="text-white/40">(tu)</small>} <RoleBadge role={u.role} />
                </span>
                <small className="font-bold text-white/45">{u.banned ? '⛔ Banat' : isMuted(u) ? `🔇 Mute până la ${hhmm(u.muted_until)}` : `${u.xp ?? 0} XP`}</small>
              </span>
              <span className="text-white/30">›</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Chat({ profile }) {
  const [me, setMe] = useState(profile);
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState(null);
  const [sheet, setSheet] = useState(null); // {target, message}
  const [usersOpen, setUsersOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [version, setVersion] = useState(0);
  const [confirmDel, setConfirmDel] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef();
  function insertEmoji(e) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = (text.slice(0, start) + e + text.slice(end)).slice(0, 500);
    setText(next);
    sfx.tap();
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + e.length;
      el.setSelectionRange(pos, pos);
    });
  }
  const listRef = useRef();
  const people = useRef({});
  const lastSend = useRef(0);
  const staff = me.role === 'admin' || me.role === 'moderator';

  // profilul meu (mute/ban) se reîmprospătează periodic
  useEffect(() => {
    const load = () => api.getProfile().then(setMe).catch(() => {});
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .listMessages()
      .then((m) => {
        if (!alive) return;
        m.forEach((x) => (people.current[x.user_id] = { display_name: x.name, role: x.role }));
        setMsgs(m);
      })
      .catch((e) => setErr(e.message));
    const unsub = api.subscribeChat({
      onInsert: async (m) => {
        let p = people.current[m.user_id];
        if (!p) {
          p = (await api.getUser(m.user_id).catch(() => null)) || { display_name: '?' };
          people.current[m.user_id] = p;
        }
        setMsgs((list) => (list && !list.some((x) => x.id === m.id) ? [...list, { ...m, name: p.display_name, role: p.role }] : list));
        if (m.user_id !== profile.id) sfx.message();
      },
      onDelete: (m) => setMsgs((list) => list && list.filter((x) => x.id !== m.id)),
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [profile.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs?.length]);

  const muted = isMuted(me);
  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || muted || me.banned) return;
    if (Date.now() - lastSend.current < 1200) return setErr('Prea repede — așteaptă o secundă.');
    lastSend.current = Date.now();
    setEmojiOpen(false);
    setErr(null);
    setText('');
    try {
      await api.sendMessage(body.slice(0, 500));
      sfx.tap();
    } catch (e2) {
      setText(body);
      const fresh = await api.getProfile().catch(() => null);
      if (fresh) setMe(fresh);
      setErr(isMuted(fresh) ? 'Ai primit mute și nu poți scrie momentan.' : e2.message);
    }
  }

  async function openSheet(userId, message) {
    if (!staff) return;
    const target = await api.getUser(userId);
    if (target) setSheet({ target, message });
  }
  function done(label) {
    setSheet(null);
    setToast(label);
    setTimeout(() => setToast(null), 2500);
    setVersion((v) => v + 1);
  }

  async function quickDelete(m) {
    if (confirmDel !== m.id) {
      setConfirmDel(m.id);
      setTimeout(() => setConfirmDel((c) => (c === m.id ? null : c)), 3000);
      return;
    }
    setConfirmDel(null);
    try {
      await api.deleteMessage(m.id);
      setMsgs((list) => list && list.filter((x) => x.id !== m.id));
      sfx.tap();
      setToast('Mesaj șters');
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      setErr(e.message);
    }
  }

  const grouped = useMemo(() => {
    return (msgs || []).map((m, i, a) => ({ ...m, first: i === 0 || a[i - 1].user_id !== m.user_id || new Date(m.created_at) - new Date(a[i - 1].created_at) > 5 * 60000 }));
  }, [msgs]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-86px)] max-w-[600px] flex-col px-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="brand">
            Lerne<span>Deutsch</span>
          </div>
          <div className="text-xs font-extrabold uppercase tracking-widest text-white/45">💬 Chat · Sprecht Deutsch! 😉</div>
        </div>
        {staff && (
          <motion.button {...tap} onClick={() => setUsersOpen(true)} className="rounded-xl border border-[#f5c443]/40 bg-[#f5c443]/10 px-3 py-2 text-sm font-black text-[#f5c443]">
            🛡️ Moderare
          </motion.button>
        )}
      </div>

      <div ref={listRef} onClick={() => setEmojiOpen(false)} className="glass mt-3 flex-1 overflow-y-auto px-3 py-3">
        {!msgs && !err && <p className="text-center text-white/45">Se încarcă…</p>}
        {msgs && !msgs.length && <p className="mt-10 text-center font-bold text-white/45">Niciun mesaj încă. Scrie primul! 👋</p>}
        <AnimatePresence initial={false}>
          {grouped.map((m) => {
            const mine = m.user_id === me.id;
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: mine ? 40 : -40 }}
                className={'flex gap-2 ' + (mine ? 'flex-row-reverse' : '') + (m.first ? ' mt-3' : ' mt-1')}
              >
                <button onClick={() => !mine && openSheet(m.user_id, m)} className={'h-[34px] w-[34px] flex-none border-0 bg-transparent p-0 ' + (m.first ? '' : 'invisible')}>
                  <Avatar id={m.user_id} name={m.name} />
                </button>
                <div className={'max-w-[78%] ' + (mine ? 'items-end text-right' : '')}>
                  {m.first && (
                    <button onClick={() => !mine && openSheet(m.user_id, m)} className={'mb-0.5 flex items-center gap-1.5 border-0 bg-transparent p-0 text-xs font-extrabold text-white/60 ' + (mine ? 'ml-auto flex-row-reverse' : '')}>
                      {mine ? 'Tu' : m.name} <RoleBadge role={m.role} /> <span className="font-bold text-white/30">{hhmm(m.created_at)}</span>
                    </button>
                  )}
                  <div className={'flex items-center gap-1.5 ' + (mine ? 'flex-row-reverse' : '')}>
                  <div
                    onClick={() => !mine && staff && openSheet(m.user_id, m)}
                    className={
                      'inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-[15px] font-semibold ' +
                      (mine ? 'rounded-tr-md bg-gradient-to-b from-[#ffd96b] to-[#f2b51f] text-[#2a1d00] shadow-[0_4px_14px_-4px_rgba(245,196,67,.5)]' : 'rounded-tl-md border border-white/10 bg-white/[.07] text-white')
                    }
                  >
                    <MessageBody text={m.body} me={me.display_name} mine={mine} />
                  </div>
                  {canDeleteMessage(me, m.user_id, m.role) && (
                    <motion.button
                      {...tap}
                      onClick={() => quickDelete(m)}
                      title="Șterge mesajul"
                      className={
                        'flex-none rounded-lg border px-1.5 py-1 text-xs font-black transition ' +
                        (confirmDel === m.id ? 'border-[#ef4b3f] bg-[#ef4b3f] text-white' : 'border-white/10 bg-white/5 text-white/40 hover:text-white')
                      }
                    >
                      {confirmDel === m.id ? 'Șterge?' : '🗑️'}
                    </motion.button>
                  )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {err && <div className="msg bad !mb-0">{err}</div>}
      <form onSubmit={send} className="relative my-3 flex items-end gap-2">
        {muted || me.banned ? (
          <div className="glass flex-1 px-4 py-3 text-sm font-bold text-[#ffb0a8]">🔇 Ai mute până la {hhmm(me.muted_until)}. Poți citi, dar nu poți scrie.</div>
        ) : (
          <>
            <AnimatePresence>{emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}</AnimatePresence>
            <motion.button
              type="button"
              {...tap}
              onClick={() => setEmojiOpen((o) => !o)}
              aria-label="Emoji"
              className={'grid h-[52px] w-[52px] flex-none place-items-center rounded-2xl border text-2xl ' + (emojiOpen ? 'border-[#f5c443] bg-[#f5c443]/15' : 'border-white/15 bg-black/30')}
            >
              😊
            </motion.button>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Scrie un mesaj…"
              className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/30 px-4 py-3.5 font-bold text-white outline-none focus:border-[#f5c443] focus:shadow-[0_0_0_3px_rgba(245,196,67,.2)]"
            />
            <motion.button {...tap} disabled={!text.trim()} className="btn !m-0 !w-auto !px-5" aria-label="Trimite">
              ➤
            </motion.button>
          </>
        )}
      </form>

      <AnimatePresence>
        {usersOpen && <UsersPanel version={version} me={me} onClose={() => setUsersOpen(false)} onPick={(u) => setSheet({ target: u })} />}
      </AnimatePresence>
      <AnimatePresence>{sheet && <ModSheet target={sheet.target} message={sheet.message} me={me} onClose={() => setSheet(null)} onDone={done} />}</AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} className="fixed inset-x-0 top-4 z-[60] mx-auto w-fit rounded-xl border border-[#f5c443]/50 bg-[#141924] px-4 py-2.5 text-sm font-black text-[#f5c443] shadow-gold">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
