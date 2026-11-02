import React from 'react';
import { go } from '../lib/nav.js';

// Afișează textul unui mesaj: @mențiuni evidențiate și codurile de joc [ABCDE] ca buton „Intră”.
export const GAME_CODE_RE = /\[([A-Z0-9]{5})\]/;

export default function MessageBody({ text, me, mine }) {
  const parts = text.split(/(\[[A-Z0-9]{5}\]|@[^,@[\]\n]+)/g).filter(Boolean);
  return parts.map((p, i) => {
    const code = /^\[([A-Z0-9]{5})\]$/.exec(p);
    if (code)
      return (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            go('joc?cod=' + code[1]);
          }}
          className="mx-0.5 my-0.5 inline-flex items-center gap-1 rounded-lg border-0 bg-gradient-to-b from-[#ff6b5f] to-[#d93a2e] px-2 py-1 align-middle text-xs font-black tracking-wider text-white shadow-[0_3px_0_#8c1a12]"
        >
          ▶ Intră · {code[1]}
        </button>
      );
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
