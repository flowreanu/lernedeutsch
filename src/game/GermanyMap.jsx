import React from 'react';
import { CAPITALS, COLORS, LABELS, NEUTRAL, PATHS, REGIONS, VIEWBOX } from './map.js';

function Castle({ x, y, color, hp, name }) {
  return (
    <g transform={`translate(${x},${y})`} className="castle" pointerEvents="none">
      {name && (
        <text y={-34} textAnchor="middle" className="castle-name">{name}</text>
      )}
      <circle r="24" fill="url(#gold-ring)" filter="url(#soft-shadow)" />
      <circle r="19" fill={color} stroke="#3a2600" strokeWidth="1.5" />
      <circle r="19" fill="url(#hex)" opacity="0.6" />
      {/* castelul: 3 turnuri; cele dărâmate apar ca ruine */}
      {[-10, 0, 10].map((dx, i) => {
        const alive = i < hp;
        const h = i === 1 ? 20 : 15;
        return (
          <g key={i} transform={`translate(${dx},${i === 1 ? 2 : 4})`} opacity={alive ? 1 : 0.35}>
            <rect x={-4} y={-h + 6} width={8} height={alive ? h : h * 0.45} fill="#ffd35c" stroke="#5a3c00" strokeWidth="1" transform={alive ? '' : `translate(0 ${h * 0.55})`} />
            {alive && (
              <path d={`M-4.5 ${-h + 6} h2 v-2.5 h1.5 v2.5 h2 v-2.5 h1.5 v2.5 h2 v-2.5 h-9 z`} fill="#ffd35c" stroke="#5a3c00" strokeWidth="0.8" />
            )}
          </g>
        );
      })}
      <rect x="-14" y="9" width="28" height="4" rx="1" fill="#ffd35c" stroke="#5a3c00" strokeWidth="1" />
    </g>
  );
}

export default function GermanyMap({ state, selectable = [], onSelect, target }) {
  const sel = new Set(selectable);
  const colorOf = (rid) => {
    const o = state.owner[rid];
    return o === null || o === undefined ? NEUTRAL : COLORS[state.players[o]?.color ?? o];
  };
  const gradId = (rid) => {
    const o = state.owner[rid];
    return o === null || o === undefined ? 'g-n' : 'g-' + (state.players[o]?.color ?? o);
  };
  const castles = state.castle || {};

  return (
    <svg className="gmap" viewBox={VIEWBOX} role="img" aria-label="Harta Germaniei">
      <defs>
        <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(0.32)">
          <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="3" />
          <path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="3" />
        </pattern>
        {[...COLORS, NEUTRAL].map((c, i) => (
          <radialGradient key={i} id={i < 3 ? 'g-' + i : 'g-n'} cx="45%" cy="40%" r="75%">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="55%" stopColor={c.fill} />
            <stop offset="100%" stopColor={c.dark} />
          </radialGradient>
        ))}
        <radialGradient id="gold-ring" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff2b0" />
          <stop offset="50%" stopColor="#f0b528" />
          <stop offset="100%" stopColor="#8a5a00" />
        </radialGradient>
        <filter id="map-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.6" />
        </filter>
        <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.6" />
        </filter>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#map-shadow)">
        {Object.entries(PATHS).map(([rid, ps]) =>
          ps.map((d, i) => <path key={rid + i} d={d} fill="#1a0f05" stroke="#1a0f05" strokeWidth="9" strokeLinejoin="round" />)
        )}
      </g>

      {Object.entries(PATHS).map(([rid, ps]) => (
        <g
          key={rid}
          className={'region' + (sel.has(rid) ? ' selectable' : '') + (target === rid ? ' target' : '')}
          onClick={() => sel.has(rid) && onSelect?.(rid)}
        >
          {ps.map((d, i) => (
            <g key={i}>
              <path d={d} fill={`url(#${gradId(rid)})`} className="rfill" />
              <path d={d} fill="url(#hex)" pointerEvents="none" />
            </g>
          ))}
        </g>
      ))}

      {/* granițe: maro închis + linie aurie */}
      <g pointerEvents="none">
        {Object.entries(PATHS).map(([rid, ps]) =>
          ps.map((d, i) => <path key={'b' + rid + i} d={d} fill="none" stroke="#2b1806" strokeWidth="4" strokeLinejoin="round" />)
        )}
        {Object.entries(PATHS).map(([rid, ps]) =>
          ps.map((d, i) => <path key={'g' + rid + i} d={d} fill="none" stroke="#e9c46a" strokeWidth="1.3" strokeLinejoin="round" opacity="0.9" />)
        )}
      </g>

      {/* evidențiere: teritorii de ales / ținta atacului */}
      <g pointerEvents="none">
        {selectable.map((rid) =>
          PATHS[rid].map((d, i) => <path key={'s' + rid + i} d={d} className="sel-outline" filter="url(#glow)" />)
        )}
        {target &&
          PATHS[target].map((d, i) => <path key={'t' + i} d={d} className="target-outline" filter="url(#glow)" />)}
      </g>

      {/* valori și nume */}
      <g pointerEvents="none">
        {Object.entries(LABELS).map(([rid, p]) => {
          if (castles[rid]) return null;
          return (
            <g key={rid}>
              <text x={p.x} y={p.y - 12} textAnchor="middle" className="lname">{REGIONS[rid].short}</text>
              {state.status !== 'lobby' && (
                <text x={p.x} y={p.y + 14} textAnchor="middle" className="lval">{state.value[rid]}</text>
              )}
            </g>
          );
        })}
      </g>

      {/* castele */}
      {state.status === 'lobby'
        ? state.players.map((p, i) => (
            <Castle key={i} x={LABELS[CAPITALS[i]].x} y={LABELS[CAPITALS[i]].y} color={COLORS[p.color].fill} hp={3} name={p.name} />
          ))
        : Object.entries(castles).map(([rid, hp]) => {
            const o = state.owner[rid];
            const p = state.players[o];
            return (
              <g key={rid}>
                <Castle x={LABELS[rid].x} y={LABELS[rid].y} color={colorOf(rid).fill} hp={hp} name={p?.name} />
                <text x={LABELS[rid].x} y={LABELS[rid].y + 44} textAnchor="middle" className="lval">{state.value[rid]}</text>
              </g>
            );
          })}
    </svg>
  );
}
