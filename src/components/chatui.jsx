import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const tap = { whileHover: { scale: 1.04 }, whileTap: { scale: 0.92 } };
export const PALETTE = ['#f5c443', '#ef4b3f', '#9aa0ad', '#ff9f43', '#e86a8f', '#5fb4ff', '#5fe08f'];
export const colorOf = (id) => PALETTE[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
export const hhmm = (d) => new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
export const isMuted = (u) => u?.muted_until && new Date(u.muted_until) > new Date();

export const EMOJI = {
  '😀': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍', '🥰', '😘', '😎', '🤓', '🤔', '🤨', '😐', '🙄', '😏', '😴', '😮', '😲', '😳', '🥺', '😢', '😭', '😤', '😡', '🤯', '🥳', '🤩', '😇', '🤗', '🤫', '🤭', '😬', '🫡', '🤪'],
  '👍': ['👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '🤝', '✌️', '🤞', '👌', '🤙', '👀', '🫶', '✍️', '🤷', '🙋', '🙈', '💯', '✅', '❌', '⭐', '🔥', '⚡', '💥', '🎉', '🎊', '🏆', '🥇', '🎯'],
  '❤️': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💖', '💤', '💬', '💡', '❗', '❓'],
  '🇩🇪': ['🇩🇪', '🇷🇴', '🥨', '🍺', '🌭', '🥖', '🧀', '☕', '🍰', '🏰', '⚔️', '🛡️', '👑', '🗺️', '🚆', '🚗', '🏠', '📚', '📝', '🎓', '🐻', '🦅', '⛰️', '🌲', '🎄', '⚽', '🎮', '🎵'],
};

export function EmojiPicker({ onPick, onClose }) {
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

export function RoleBadge({ role }) {
  if (role === 'admin') return <span className="rounded-md bg-[#f5c443]/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#f5c443]">👑 Admin</span>;
  if (role === 'moderator') return <span className="rounded-md bg-[#ef4b3f]/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#ff7a6e]">🛡️ Mod</span>;
  return null;
}

export function Avatar({ id, name, size = 34 }) {
  const c = colorOf(id);
  return (
    <span className="grid flex-none place-items-center rounded-full font-black text-[#14161c]" style={{ width: size, height: size, fontSize: size * 0.42, background: `radial-gradient(circle at 35% 30%, #fff8, ${c} 60%)`, boxShadow: `0 0 12px ${c}55` }}>
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

