import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { COLORS, LABELS, NEUTRAL, PATHS, REGIONS, VIEWBOX } from './map.js';

const VB = VIEWBOX.split(' ').map(Number);

// Pin 3D animat (sferă + ac), deasupra capitalelor
function Pin({ x, y, color, name, hp, active }) {
  const c = COLORS[color];
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <ellipse cx="0" cy="2" rx="13" ry="4.5" fill="rgba(0,0,0,.55)" />
      <motion.g animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: active ? 0.9 : 2.2, ease: 'easeInOut' }}>
        <path d="M-2.2 -6 L0 2 L2.2 -6 Z" fill="#c9ccd4" />
        <rect x="-2" y="-34" width="4" height="30" rx="2" fill={`url(#pin-stem-${color})`} />
        <circle cx="0" cy="-40" r="15" fill={`url(#pin-ball-${color})`} stroke={c.dark} strokeWidth="1.2" />
        <ellipse cx="-5" cy="-46" rx="5" ry="3.4" fill="rgba(255,255,255,.65)" />
        {name && (
          <g transform="translate(0,-68)">
            <rect x={-(name.length * 5.2 + 14) / 2} y="-13" width={name.length * 5.2 + 14} height="22" rx="7" fill="rgba(10,12,18,.88)" stroke={c.fill} strokeWidth="1.4" />
            <text x="0" y="3" textAnchor="middle" className="fill-white" style={{ font: '900 11.5px Nunito, sans-serif' }}>
              {name}
            </text>
          </g>
        )}
      </motion.g>
      {/* turnurile capitalei */}
      <g transform="translate(0,16)">
        {[0, 1, 2].map((k) => {
          const alive = k < hp;
          return (
            <g key={k} transform={`translate(${(k - 1) * 13},0)`}>
              <rect x="-5" y={alive ? -12 : -4} width="10" height={alive ? 12 : 4} rx="1" fill={alive ? '#f5c443' : 'rgba(255,255,255,.2)'} stroke={alive ? '#7a5203' : 'none'} strokeWidth="1" />
              {alive && <path d="M-5 -12 v-3 h3 v3 h4 v-3 h3 v3" fill="#f5c443" stroke="#7a5203" strokeWidth="1" />}
            </g>
          );
        })}
      </g>
    </g>
  );
}

// Efecte: ripple la cucerire, explozie de particule la zdrobirea unui turn
function Effects({ events, onShake }) {
  const seen = useRef(new Set());
  const [fx, setFx] = useState([]);
  useEffect(() => {
    const fresh = (events || []).filter((e) => !seen.current.has(e.id));
    if (!fresh.length) return;
    fresh.forEach((e) => seen.current.add(e.id));
    if (seen.current.size === fresh.length && fresh.length > 3) return; // la încărcare nu redăm istoricul
    setFx((f) => [...f, ...fresh]);
    if (fresh.some((e) => e.type === 'crush')) onShake?.();
    const t = setTimeout(() => setFx((f) => f.filter((x) => !fresh.includes(x))), 1600);
    return () => clearTimeout(t);
  }, [events, onShake]);
  return (
    <g pointerEvents="none">
      {fx.map((e) => {
        const p = LABELS[e.rid];
        const c = COLORS[e.by]?.fill || '#fff';
        if (e.type === 'crush')
          return (
            <g key={e.id}>
              {Array.from({ length: 14 }).map((_, k) => {
                const a = (k / 14) * Math.PI * 2;
                return (
                  <motion.circle key={k} cx={p.x} cy={p.y} r={4 + (k % 3)} fill={k % 2 ? '#f5c443' : c} initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos(a) * 70, y: Math.sin(a) * 70 + 20, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
                );
              })}
              <motion.text x={p.x} y={p.y} textAnchor="middle" fontSize="42" initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
                💥
              </motion.text>
            </g>
          );
        return (
          <g key={e.id} clipPath={`url(#clip-${e.rid})`}>
            <motion.circle cx={p.x} cy={p.y} fill={c} initial={{ r: 0, opacity: 0.9 }} animate={{ r: 220, opacity: 0 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
            <motion.circle cx={p.x} cy={p.y} fill="none" stroke="#fff" strokeWidth="4" initial={{ r: 0, opacity: 1 }} animate={{ r: 140, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
          </g>
        );
      })}
    </g>
  );
}

export default function GermanyMap({ state, selectable = [], onSelect, target, myTarget, revealTargets }) {
  const sel = new Set(selectable);
  const shake = useAnimationControls();
  const fillOf = (rid) => {
    const o = state.owner[rid];
    return o === null || o === undefined ? NEUTRAL.fill : COLORS[state.players[o]?.color ?? o].fill;
  };
  const doShake = React.useCallback(() => {
    shake.start({ x: [0, -12, 11, -8, 6, -3, 0], y: [0, 4, -5, 3, -2, 0, 0], transition: { duration: 0.55 } });
    try {
      navigator.vibrate?.([60, 40, 90]);
    } catch {}
  }, [shake]);
  const capitals = Object.entries(state.castle || {});
  const lobbyPins = state.status === 'lobby';

  return (
    <motion.div animate={shake} className="relative mx-auto w-full max-w-[460px]">
      <svg viewBox={`${VB[0] - 10} ${VB[1] - 90} ${VB[2] + 20} ${VB[3] + 110}`} className="block w-full overflow-visible" role="img" aria-label="Harta Germaniei">
        <defs>
          <pattern id="mhex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(0.3)">
            <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="3" />
          </pattern>
          <radialGradient id="shine" cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,.38)" />
            <stop offset="45%" stopColor="rgba(255,255,255,.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,.35)" />
          </radialGradient>
          {COLORS.map((c, i) => (
            <React.Fragment key={i}>
              <radialGradient id={`pin-ball-${i}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="25%" stopColor={c.light} />
                <stop offset="70%" stopColor={c.fill} />
                <stop offset="100%" stopColor={c.dark} />
              </radialGradient>
              <linearGradient id={`pin-stem-${i}`} x1="0" x2="1">
                <stop offset="0%" stopColor="#8d919c" />
                <stop offset="50%" stopColor="#f1f2f5" />
                <stop offset="100%" stopColor="#6c707b" />
              </linearGradient>
            </React.Fragment>
          ))}
          {Object.entries(PATHS).map(([rid, ps]) => (
            <clipPath key={rid} id={`clip-${rid}`}>
              {ps.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </clipPath>
          ))}
          <filter id="mglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* „grosimea” 3D a hărții */}
        <g transform="translate(0,10)" opacity="0.95">
          {Object.entries(PATHS).map(([rid, ps]) =>
            ps.map((d, i) => <path key={rid + i} d={d} fill="#05070b" stroke="#05070b" strokeWidth="6" strokeLinejoin="round" />)
          )}
        </g>

        {Object.entries(PATHS).map(([rid, ps]) => {
          const selectableHere = sel.has(rid);
          return (
            <g key={rid} onClick={() => selectableHere && onSelect?.(rid)} style={{ cursor: selectableHere ? 'pointer' : 'default' }}>
              {ps.map((d, i) => (
                <g key={i}>
                  <motion.path d={d} initial={false} animate={{ fill: fillOf(rid) }} transition={{ duration: 0.7 }} />
                  <path d={d} fill="url(#shine)" pointerEvents="none" />
                  <path d={d} fill="url(#mhex)" pointerEvents="none" />
                </g>
              ))}
            </g>
          );
        })}

        {/* contur interior în culoarea jucătorului (îl face ușor de recunoscut, mai ales pe negru) */}
        <g pointerEvents="none">
          {Object.entries(PATHS).map(([rid, ps]) => {
            const o = state.owner[rid];
            if (o === null || o === undefined) return null;
            const c = COLORS[state.players[o]?.color ?? o];
            return ps.map((d, i) => <path key={'in' + rid + i} d={d} fill="none" stroke={c.light} strokeOpacity="0.85" strokeWidth="5" clipPath={`url(#clip-${rid})`} />);
          })}
        </g>

        {/* granițe */}
        <g pointerEvents="none">
          {Object.entries(PATHS).map(([rid, ps]) =>
            ps.map((d, i) => <path key={'b' + rid + i} d={d} fill="none" stroke="#090b10" strokeWidth="3.4" strokeLinejoin="round" />)
          )}
          {Object.entries(PATHS).map(([rid, ps]) =>
            ps.map((d, i) => <path key={'g' + rid + i} d={d} fill="none" stroke="rgba(255,225,150,.35)" strokeWidth="0.9" strokeLinejoin="round" />)
          )}
        </g>

        {/* landuri valide: glow auriu */}
        <g pointerEvents="none">
          {selectable.map((rid) =>
            PATHS[rid].map((d, i) => (
              <motion.path key={'s' + rid + i} d={d} fill="rgba(255,240,180,.12)" stroke="#ffe08a" strokeWidth="3.5" strokeLinejoin="round" filter="url(#mglow)" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ repeat: Infinity, duration: 1.3 }} />
            ))
          )}
          {myTarget &&
            PATHS[myTarget].map((d, i) => (
              <motion.path key={'m' + i} d={d} fill="rgba(245,196,67,.25)" stroke="#fff" strokeWidth="4" strokeDasharray="10 6" strokeLinejoin="round" animate={{ strokeDashoffset: [0, -32] }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
            ))}
          {target &&
            PATHS[target].map((d, i) => (
              <motion.path key={'t' + i} d={d} fill="rgba(239,75,63,.18)" stroke="#ff5a4e" strokeWidth="5" strokeLinejoin="round" filter="url(#mglow)" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.7 }} />
            ))}
        </g>

        <Effects events={state.events} onShake={doShake} />

        {/* valori */}
        <g pointerEvents="none">
          {Object.entries(LABELS).map(([rid, p]) => {
            if (state.castle?.[rid]) return null;
            const dark = state.owner[rid] !== null && state.players[state.owner[rid]]?.color === 0;
            return (
              <g key={rid}>
                <text x={p.x} y={p.y - 10} textAnchor="middle" style={{ font: '800 10px Nunito, sans-serif', fill: dark ? 'rgba(40,28,0,.8)' : 'rgba(255,255,255,.75)', letterSpacing: '.02em' }}>
                  {REGIONS[rid].short}
                </text>
                {state.status !== 'lobby' && (
                  <text x={p.x} y={p.y + 15} textAnchor="middle" style={{ font: '900 23px Nunito, sans-serif', fill: '#fff', paintOrder: 'stroke', stroke: 'rgba(8,10,14,.85)', strokeWidth: 5, strokeLinejoin: 'round' }}>
                    {state.value[rid]}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* ținte dezvăluite (Eroberungskrieg) */}
        <AnimatePresence>
          {revealTargets &&
            Object.entries(revealTargets)
              .filter(([, r]) => r)
              .map(([i, r], k) => (
                <motion.g key={'rv' + i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.15 * k, type: 'spring' }}>
                  <circle cx={LABELS[r].x + (k - 1) * 18} cy={LABELS[r].y + 30} r="9" fill={COLORS[state.players[i]?.color ?? i].fill} stroke="#fff" strokeWidth="2" />
                </motion.g>
              ))}
        </AnimatePresence>

        {/* pin-uri 3D pe capitale */}
        {lobbyPins
          ? state.mode !== 'conquest' &&
            state.players.map((p, i) => {
              const rid = ['W', 'B', 'Y'][i];
              return <Pin key={i} x={LABELS[rid].x} y={LABELS[rid].y} color={p.color} name={p.name} hp={3} />;
            })
          : capitals.map(([rid, hp]) => {
              const o = state.owner[rid];
              const p = state.players[o];
              return <Pin key={rid} x={LABELS[rid].x} y={LABELS[rid].y} color={p?.color ?? 0} name={p?.name} hp={hp} active={target === rid} />;
            })}
      </svg>
    </motion.div>
  );
}
