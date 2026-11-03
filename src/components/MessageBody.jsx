import React, { useEffect, useState } from 'react';
import { api } from '../lib/backend.js';
import { go } from '../lib/nav.js';

// Afișează textul unui mesaj: @mențiuni evidențiate și codurile de joc [ABCDE] ca buton,
// cu starea reală a jocului (deschis / în desfășurare / încheiat).
export const GAME_CODE_RE = /\[([A-Z0-9]{5})\]/;

const cache = new Map(); // cod -> { at, promise, data }
function fetchGame(code) {
  const c = cache.get(code);
  if (c && Date.now() - c.at < 20000) return c.promise;
  const promise = api
    .findGame(code)
    .then((g) => (g ? { status: g.state?.status, players: g.state?.players?.length || 0, ids: (g.state?.players || []).map((p) => p.id) } : { status: 'missing' }))
    .catch(() => ({ status: 'unknown' }));
  cache.set(code, { at: Date.now(), promise });
  return promise;
}

function GameChip({ code, meId }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetchGame(code).then((d) => alive && setInfo(d));
    load();
    const iv = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [code]);
  const mine = info?.ids?.includes(meId);
  const open = info?.status === 'lobby' && info.players < 3;
  const canGo = open || (mine && info?.status !== 'finished');
  const label = !info
    ? `… ${code}`
    : canGo
    ? mine && info.status === 'playing'
      ? `↩ Revino · ${code}`
      : `▶ Intră · ${code} (${info.players}/3)`
    : info.status === 'finished'
    ? `🏁 Joc încheiat · ${code}`
    : info.status === 'playing'
    ? `⚔️ În desfășurare · ${code}`
    : info.status === 'lobby'
    ? `Plin · ${code}`
    : `Expirat · ${code}`;
  return (
    <button
      disabled={!canGo}
      onClick={(e) => {
        e.stopPropagation();
        if (canGo) go('joc?cod=' + code);
      }}
      className={
        'mx-0.5 my-0.5 inline-flex items-center gap-1 rounded-lg border-0 px-2 py-1 align-middle text-xs font-black tracking-wider ' +
        (canGo ? 'bg-gradient-to-b from-[#ff6b5f] to-[#d93a2e] text-white shadow-[0_3px_0_#8c1a12]' : 'cursor-default bg-black/30 text-white/45')
      }
    >
      {label}
    </button>
  );
}

export default function MessageBody({ text, me, mine, meId }) {
  const parts = text.split(/(\[[A-Z0-9]{5}\]|@[^,@[\]\n]+)/g).filter(Boolean);
  return parts.map((p, i) => {
    const code = /^\[([A-Z0-9]{5})\]$/.exec(p);
    if (code) return <GameChip key={i} code={code[1]} meId={meId} />;
    if (p.startsWith('@')) {
      const isMe = me && p.trim() === '@' + me;
      return (
        <b key={i} className={'rounded px-0.5 ' + (isMe ? 'bg-[#f5c443] text-[#2a1d00]' : mine ? 'text-[#8a2a12]' : 'text-[#f5c443]')}>
          {p}
        </b>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}
