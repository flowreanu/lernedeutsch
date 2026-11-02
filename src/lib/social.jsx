// Starea socială globală: prieteni, cereri, mesaje private necitite + notificări (toast).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './backend.js';
import { sfx } from './fx.js';
import { go } from './nav.js';

const Ctx = createContext(null);
export const useSocial = () => useContext(Ctx);

export function SocialProvider({ profile, children }) {
  const me = profile?.id;
  const [friendships, setFriendships] = useState([]);
  const [unread, setUnread] = useState({}); // userId -> număr necitite
  const [toast, setToast] = useState(null);
  const activeThread = useRef(null);
  const listeners = useRef(new Set()); // firele deschise ascultă mesajele noi

  const reload = useCallback(async () => {
    if (!me) return;
    try {
      setFriendships(await api.friendships());
    } catch {}
  }, [me]);

  const loadUnread = useCallback(async () => {
    if (!me) return;
    try {
      const rows = await api.dmRecent();
      const u = {};
      rows.forEach((m) => {
        if (m.recipient === me && !m.read_at) u[m.sender] = (u[m.sender] || 0) + 1;
      });
      setUnread(u);
    } catch {}
  }, [me]);

  useEffect(() => {
    if (!me) return;
    reload();
    loadUnread();
    const unsub = api.subscribeSocial({
      onDM: (m) => {
        listeners.current.forEach((fn) => fn(m));
        if (m.recipient !== me) return;
        if (activeThread.current === m.sender) {
          api.markRead(m.sender).catch(() => {});
          return;
        }
        setUnread((u) => ({ ...u, [m.sender]: (u[m.sender] || 0) + 1 }));
        const f = friendshipsRef.current.find((x) => x.requester === m.sender || x.addressee === m.sender);
        const other = f ? (f.requester === m.sender ? f.req : f.adr) : null;
        setToast({ kind: 'dm', id: m.id, from: m.sender, name: other?.display_name || 'Un prieten', body: m.body });
        sfx.message();
      },
      onFriendship: async (p) => {
        const fresh = await api.friendships().catch(() => null);
        if (!fresh) return;
        const prev = friendshipsRef.current;
        setFriendships(fresh);
        // cerere nouă primită
        const newIncoming = fresh.find((f) => f.addressee === me && f.status === 'pending' && !prev.some((x) => x.id === f.id));
        if (newIncoming) {
          setToast({ kind: 'request', id: 'r' + newIncoming.id, fid: newIncoming.id, name: newIncoming.req?.display_name || 'Cineva' });
          sfx.turn();
        }
        // cererea mea a fost acceptată
        const accepted = fresh.find((f) => f.requester === me && f.status === 'accepted' && prev.some((x) => x.id === f.id && x.status === 'pending'));
        if (accepted) {
          setToast({ kind: 'accepted', id: 'a' + accepted.id, name: accepted.adr?.display_name || 'Cineva', from: accepted.addressee });
          sfx.correct();
        }
      },
    });
    return unsub;
  }, [me, reload, loadUnread]);

  const friendshipsRef = useRef(friendships);
  friendshipsRef.current = friendships;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const other = (f) => (f.requester === me ? f.adr : f.req);
  const friends = friendships.filter((f) => f.status === 'accepted').map((f) => ({ ...other(f), fid: f.id }));
  const incoming = friendships.filter((f) => f.status === 'pending' && f.addressee === me).map((f) => ({ ...f.req, fid: f.id }));
  const outgoing = friendships.filter((f) => f.status === 'pending' && f.requester === me).map((f) => ({ ...f.adr, fid: f.id }));
  const relationTo = (userId) => {
    const f = friendships.find((x) => x.requester === userId || x.addressee === userId);
    if (!f) return { state: 'none' };
    if (f.status === 'accepted') return { state: 'friends', fid: f.id };
    return { state: f.requester === me ? 'sent' : 'received', fid: f.id };
  };
  const unreadTotal = Object.values(unread).reduce((a, b) => a + b, 0);

  const value = {
    friends,
    incoming,
    outgoing,
    relationTo,
    unread,
    unreadTotal,
    badge: unreadTotal + incoming.length,
    reload,
    openThread: (userId) => {
      activeThread.current = userId;
      setUnread((u) => ({ ...u, [userId]: 0 }));
      api.markRead(userId).catch(() => {});
    },
    closeThread: () => (activeThread.current = null),
    onDM: (fn) => {
      listeners.current.add(fn);
      return () => listeners.current.delete(fn);
    },
    async request(userId) {
      await api.sendFriendRequest(userId);
      await reload();
    },
    async accept(fid) {
      await api.acceptFriend(fid);
      await reload();
    },
    async remove(fid) {
      await api.removeFriend(fid);
      await reload();
    },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-[520px] items-center gap-3 rounded-2xl border border-[#f5c443]/50 bg-[#141924]/95 p-3 shadow-[0_0_40px_rgba(245,196,67,.3)] backdrop-blur-xl"
          >
            <span className="text-2xl">{toast.kind === 'dm' ? '✉️' : toast.kind === 'request' ? '🤝' : '🎉'}</span>
            <div className="min-w-0 flex-1">
              <b className="block truncate">
                {toast.kind === 'dm' ? toast.name : toast.kind === 'request' ? `${toast.name} vrea să fie prietenul tău` : `${toast.name} ți-a acceptat cererea!`}
              </b>
              {toast.kind === 'dm' && <small className="block truncate font-bold text-white/60">{toast.body}</small>}
            </div>
            {toast.kind === 'request' ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                className="btn small"
                onClick={async () => {
                  setToast(null);
                  await value.accept(toast.fid).catch(() => {});
                }}
              >
                Acceptă
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.92 }} className="btn small" onClick={() => { setToast(null); go('chat?pm=' + toast.from); }}>
                {toast.kind === 'dm' ? 'Răspunde' : 'Scrie-i'}
              </motion.button>
            )}
            <button className="border-0 bg-transparent px-1 text-white/40" onClick={() => setToast(null)} aria-label="Închide">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
