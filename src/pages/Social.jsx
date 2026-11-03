import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/backend.js';
import { useSocial } from '../lib/social.jsx';
import { sfx } from '../lib/fx.js';
import { Avatar, EmojiPicker, RoleBadge, hhmm, isMuted, tap } from '../components/chatui.jsx';
import MessageBody from '../components/MessageBody.jsx';

const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'acum';
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' });
};

// Butonul de relație (prieten) pentru un utilizator — folosit și în fișa din chat
export function FriendActions({ userId, onPM, compact }) {
  const s = useSocial();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const rel = s.relationTo(userId);
  const run = async (fn) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      sfx.tap();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };
  const cls = compact ? 'btn small' : 'btn';
  return (
    <div className={compact ? 'flex gap-1.5' : ''}>
      {rel.state === 'none' && (
        <motion.button {...tap} disabled={busy} className={cls} onClick={() => run(() => s.request(userId))}>
          ➕ {compact ? 'Adaugă' : 'Adaugă prieten'}
        </motion.button>
      )}
      {rel.state === 'sent' && (
        <motion.button {...tap} disabled={busy} className={cls + ' ghost'} onClick={() => run(() => s.remove(rel.fid))}>
          ⏳ {compact ? 'Anulează' : 'Cerere trimisă · Anulează'}
        </motion.button>
      )}
      {rel.state === 'received' && (
        <>
          <motion.button {...tap} disabled={busy} className={cls + ' green'} onClick={() => run(() => s.accept(rel.fid))}>
            ✓ Acceptă
          </motion.button>
          <motion.button {...tap} disabled={busy} className={cls + ' ghost'} onClick={() => run(() => s.remove(rel.fid))}>
            Refuză
          </motion.button>
        </>
      )}
      {rel.state === 'friends' && (
        <>
          {onPM && (
            <motion.button {...tap} className={cls} onClick={() => onPM(userId)}>
              ✉️ {compact ? 'Mesaj' : 'Mesaj privat'}
            </motion.button>
          )}
          <motion.button {...tap} disabled={busy} className={cls + ' ghost'} onClick={() => run(() => s.remove(rel.fid))}>
            {compact ? '✕' : '👋 Elimină din prieteni'}
          </motion.button>
        </>
      )}
      {err && <div className="msg bad">{err}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- fila Prieteni
export function FriendsTab({ onPM, onUser }) {
  const s = useSocial();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => api.searchUsers(q).then(setResults).catch(() => setResults([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  const friendIds = new Set([...s.friends, ...s.incoming, ...s.outgoing].map((f) => f.id));
  const Row = ({ u, children, k }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (k || 0) * 0.03 }} className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
      <button className="border-0 bg-transparent p-0" onClick={() => onUser(u.id)}>
        <Avatar id={u.id} name={u.display_name} />
      </button>
      <button className="flex min-w-0 flex-1 items-center gap-2 border-0 bg-transparent p-0 text-left font-extrabold" onClick={() => onUser(u.id)}>
        <span className="truncate">{u.display_name}</span> <RoleBadge role={u.role} />
      </button>
      {children}
    </motion.div>
  );
  const Section = ({ title, count, children }) => (
    <div className="mt-4">
      <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-white/45">
        {title} {count != null && <span className="text-[#f5c443]">· {count}</span>}
      </div>
      {children}
    </div>
  );
  return (
    <div className="glass mt-3 min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <input className="search !mt-0" placeholder="🔎 Caută jucători după nume…" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim() && (
        <Section title="Rezultate">
          {!results && <p className="text-white/45">Se caută…</p>}
          {results && !results.length && <p className="text-sm font-bold text-white/45">Niciun jucător găsit.</p>}
          {(results || []).map((u, k) => (
            <Row key={u.id} u={u} k={k}>
              <FriendActions userId={u.id} onPM={onPM} compact />
            </Row>
          ))}
        </Section>
      )}
      {s.incoming.length > 0 && (
        <Section title="Cereri primite" count={s.incoming.length}>
          {s.incoming.map((u, k) => (
            <Row key={u.fid} u={u} k={k}>
              <FriendActions userId={u.id} compact />
            </Row>
          ))}
        </Section>
      )}
      <Section title="Prietenii mei" count={s.friends.length}>
        {!s.friends.length && <p className="text-sm font-bold text-white/45">Încă nu ai prieteni. Caută un coleg mai sus sau apasă pe numele cuiva în chat. 🤝</p>}
        {s.friends.map((u, k) => (
          <Row key={u.fid} u={u} k={k}>
            <FriendActions userId={u.id} onPM={onPM} compact />
          </Row>
        ))}
      </Section>
      {s.outgoing.length > 0 && (
        <Section title="Cereri trimise" count={s.outgoing.length}>
          {s.outgoing.map((u, k) => (
            <Row key={u.fid} u={u} k={k}>
              <FriendActions userId={u.id} compact />
            </Row>
          ))}
        </Section>
      )}
      {!q.trim() && results && results.filter((u) => !friendIds.has(u.id)).length > 0 && (
        <Section title="Poate îi cunoști">
          {results
            .filter((u) => !friendIds.has(u.id))
            .slice(0, 8)
            .map((u, k) => (
              <Row key={u.id} u={u} k={k}>
                <FriendActions userId={u.id} compact />
              </Row>
            ))}
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- fila Privat
export function PrivateTab({ me, pmUser, setPmUser, onUser }) {
  const s = useSocial();
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    if (pmUser) return;
    api.dmRecent().then(setRecent).catch(() => {});
    return s.onDM(() => api.dmRecent().then(setRecent).catch(() => {}));
  }, [pmUser]); // eslint-disable-line react-hooks/exhaustive-deps

  if (pmUser) return <Thread me={me} otherId={pmUser} onBack={() => setPmUser(null)} onUser={onUser} />;

  const last = {};
  recent.forEach((m) => {
    const other = m.sender === me.id ? m.recipient : m.sender;
    if (!last[other]) last[other] = m;
  });
  const convs = s.friends
    .map((f) => ({ f, m: last[f.id] }))
    .sort((a, b) => (b.m ? new Date(b.m.created_at) : 0) - (a.m ? new Date(a.m.created_at) : 0));

  return (
    <div className="glass mt-3 min-h-0 flex-1 overflow-y-auto px-3 py-3">
      {!convs.length && (
        <div className="mt-8 text-center">
          <div className="text-4xl">✉️</div>
          <p className="font-bold text-white/55">Mesajele private se pot trimite doar prietenilor.</p>
          <p className="text-sm font-bold text-white/40">Adaugă colegi din fila „Prieteni”.</p>
        </div>
      )}
      {convs.map(({ f, m }, k) => {
        const n = s.unread[f.id] || 0;
        return (
          <motion.button
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: k * 0.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPmUser(f.id)}
            className={'mb-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ' + (n ? 'border-[#f5c443]/50 bg-[#f5c443]/10' : 'border-white/10 bg-white/5')}
          >
            <Avatar id={f.id} name={f.display_name} size={42} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <b className="truncate">{f.display_name}</b>
                <RoleBadge role={f.role} />
                {m && <small className="ml-auto flex-none font-bold text-white/40">{ago(m.created_at)}</small>}
              </span>
              <small className={'block truncate font-bold ' + (n ? 'text-white' : 'text-white/50')}>{m ? (m.sender === me.id ? 'Tu: ' : '') + m.body : 'Spune-i „Hallo!” 👋'}</small>
            </span>
            {n > 0 && <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-[#ef4b3f] px-1.5 text-xs font-black text-white shadow-red">{n}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

function Thread({ me, otherId, onBack, onUser }) {
  const s = useSocial();
  const [msgs, setMsgs] = useState(null);
  const [other, setOther] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const listRef = useRef();
  const inputRef = useRef();
  const isFriend = s.relationTo(otherId).state === 'friends';

  useEffect(() => {
    s.openThread(otherId);
    api.getUser(otherId).then(setOther).catch(() => {});
    api.dmThread(otherId).then(setMsgs).catch((e) => setErr(e.message));
    const off = s.onDM((m) => {
      if ((m.sender === otherId && m.recipient === me.id) || (m.sender === me.id && m.recipient === otherId))
        setMsgs((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list));
    });
    return () => {
      off();
      s.closeThread();
    };
  }, [otherId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs?.length]);

  const muted = isMuted(me);
  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || muted) return;
    setText('');
    setEmojiOpen(false);
    setErr(null);
    try {
      const m = await api.sendDM(otherId, body.slice(0, 1000));
      if (m) setMsgs((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list));
      sfx.tap();
    } catch (e2) {
      setText(body);
      setErr(e2.message?.includes('row-level') ? 'Poți scrie doar prietenilor (și doar dacă nu ai mute).' : e2.message);
    }
  }
  function insertEmoji(em) {
    const el = inputRef.current;
    const a = el?.selectionStart ?? text.length;
    const b = el?.selectionEnd ?? text.length;
    setText((text.slice(0, a) + em + text.slice(b)).slice(0, 1000));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + em.length, a + em.length);
    });
  }

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      <div className="glass flex items-center gap-3 px-3 py-2">
        <motion.button {...tap} onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg">
          ‹
        </motion.button>
        <button className="flex flex-1 items-center gap-2 border-0 bg-transparent p-0 text-left" onClick={() => onUser(otherId)}>
          <Avatar id={otherId} name={other?.display_name} />
          <span>
            <b className="flex items-center gap-1.5">
              {other?.display_name || '…'} <RoleBadge role={other?.role} />
            </b>
            <small className="font-bold text-white/45">🔒 Conversație privată</small>
          </span>
        </button>
      </div>
      <div ref={listRef} onClick={() => setEmojiOpen(false)} className="glass mt-2 min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!msgs && <p className="text-center text-white/45">Se încarcă…</p>}
        {msgs && !msgs.length && <p className="mt-10 text-center font-bold text-white/45">Începe conversația — scrie „Hallo!” 👋</p>}
        <AnimatePresence initial={false}>
          {(msgs || []).map((m, i, a) => {
            const mine = m.sender === me.id;
            const first = i === 0 || a[i - 1].sender !== m.sender || new Date(m.created_at) - new Date(a[i - 1].created_at) > 5 * 60000;
            return (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={'flex ' + (mine ? 'justify-end' : '') + (first ? ' mt-3' : ' mt-1')}>
                <div className={'max-w-[80%] ' + (mine ? 'text-right' : '')}>
                  {first && <div className="mb-0.5 text-[11px] font-bold text-white/35">{hhmm(m.created_at)}</div>}
                  <div
                    className={
                      'inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-[15px] font-semibold ' +
                      (mine ? 'rounded-tr-md bg-gradient-to-b from-[#ffd96b] to-[#f2b51f] text-[#2a1d00]' : 'rounded-tl-md border border-white/10 bg-white/[.07] text-white')
                    }
                  >
                    <MessageBody text={m.body} me={me.display_name} mine={mine} meId={me.id} />
                  </div>
                  {mine && i === a.length - 1 && <div className="mt-0.5 text-[10px] font-bold text-white/35">{m.read_at ? 'Văzut ✓✓' : 'Trimis ✓'}</div>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {err && <div className="msg bad !mb-0">{err}</div>}
      <form onSubmit={send} className="relative my-3 flex items-end gap-2">
        {!isFriend ? (
          <div className="glass flex-1 px-4 py-3 text-sm font-bold text-white/60">Nu mai sunteți prieteni — nu poți trimite mesaje.</div>
        ) : muted ? (
          <div className="glass flex-1 px-4 py-3 text-sm font-bold text-[#ffb0a8]">🔇 Ai mute până la {hhmm(me.muted_until)}.</div>
        ) : (
          <>
            <AnimatePresence>{emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}</AnimatePresence>
            <motion.button type="button" {...tap} onClick={() => setEmojiOpen((o) => !o)} aria-label="Emoji" className={'grid h-[52px] w-[52px] flex-none place-items-center rounded-2xl border text-2xl ' + (emojiOpen ? 'border-[#f5c443] bg-[#f5c443]/15' : 'border-white/15 bg-black/30')}>
              😊
            </motion.button>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder={`Mesaj pentru ${other?.display_name || '…'}`}
              className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/30 px-4 py-3.5 font-bold text-white outline-none focus:border-[#f5c443] focus:shadow-[0_0_0_3px_rgba(245,196,67,.2)]"
            />
            <motion.button {...tap} disabled={!text.trim()} className="btn !m-0 !w-auto !px-5" aria-label="Trimite">
              ➤
            </motion.button>
          </>
        )}
      </form>
    </div>
  );
}
