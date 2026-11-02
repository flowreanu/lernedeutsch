import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/backend.js';
import { sfx } from '../lib/fx.js';
import { go } from '../lib/nav.js';
import { GAME_CODE_RE } from './MessageBody.jsx';

// Ascultă chatul oriunde în aplicație: dacă cineva te menționează cu un cod de joc → notificare.
export default function InviteWatcher({ profile }) {
  const [inv, setInv] = useState(null);
  useEffect(() => {
    if (!profile?.display_name) return;
    return api.subscribeChat({
      onInsert: async (m) => {
        if (m.user_id === profile.id) return;
        const code = GAME_CODE_RE.exec(m.body || '');
        if (!code || !(m.body || '').includes('@' + profile.display_name)) return;
        const from = (await api.getUser(m.user_id).catch(() => null))?.display_name || 'Cineva';
        setInv({ code: code[1], from, id: m.id });
        sfx.turn();
      },
    });
  }, [profile?.id, profile?.display_name]);
  useEffect(() => {
    if (!inv) return;
    const t = setTimeout(() => setInv(null), 20000);
    return () => clearTimeout(t);
  }, [inv]);
  return (
    <AnimatePresence>
      {inv && (
        <motion.div
          key={inv.id}
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-[520px] items-center gap-3 rounded-2xl border border-[#f5c443]/60 bg-[#141924]/95 p-3 shadow-[0_0_40px_rgba(245,196,67,.35)] backdrop-blur-xl"
        >
          <span className="text-3xl">🏰</span>
          <div className="flex-1">
            <b className="block">{inv.from} te invită la joc!</b>
            <small className="font-bold text-white/55">Cod: {inv.code}</small>
          </div>
          <motion.button whileTap={{ scale: 0.92 }} className="btn red small" onClick={() => { setInv(null); go('joc?cod=' + inv.code); }}>
            Intră
          </motion.button>
          <button className="border-0 bg-transparent px-1 text-white/40" onClick={() => setInv(null)} aria-label="Închide">
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
