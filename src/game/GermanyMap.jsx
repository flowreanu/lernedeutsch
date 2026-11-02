import React, { useMemo } from 'react';
import { CAPITALS, CELL, CENTERS, COLORS, COLS, GRID, REGIONS, ROWS, cellAt } from './map.js';

export default function GermanyMap({ state, selectable = [], onSelect, target, flash }) {
  const W = COLS * CELL;
  const H = ROWS * CELL;
  const sel = new Set(selectable);

  const edges = useMemo(() => {
    const inner = [];
    const outer = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const a = cellAt(r, c);
        if (a === '.') continue;
        const x = c * CELL;
        const y = r * CELL;
        const sides = [
          [cellAt(r - 1, c), x, y, x + CELL, y],
          [cellAt(r + 1, c), x, y + CELL, x + CELL, y + CELL],
          [cellAt(r, c - 1), x, y, x, y + CELL],
          [cellAt(r, c + 1), x + CELL, y, x + CELL, y + CELL],
        ];
        for (const [b, x1, y1, x2, y2] of sides) {
          if (b === '.') outer.push([x1, y1, x2, y2]);
          else if (b !== a && a < b) inner.push([x1, y1, x2, y2]);
        }
      }
    return { inner, outer };
  }, []);

  const fillOf = (rid) => {
    const o = state.owner[rid];
    if (o === null || o === undefined) return '#e8e0cf';
    return COLORS[state.players[o]?.color ?? o].fill;
  };

  return (
    <svg className="gmap" viewBox={`-6 -6 ${W + 12} ${H + 12}`} role="img" aria-label="Harta Germaniei">
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="transparent" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,.55)" strokeWidth="4" />
        </pattern>
      </defs>
      {GRID.map((row, r) =>
        [...row].map((rid, c) =>
          rid === '.' ? null : (
            <g key={r + '-' + c} onClick={() => sel.has(rid) && onSelect?.(rid)} className={sel.has(rid) ? 'cell selectable' : 'cell'}>
              <rect x={c * CELL} y={r * CELL} width={CELL + 0.5} height={CELL + 0.5} fill={fillOf(rid)} className={'rfill r-' + rid + (flash === rid ? ' flash' : '')} />
              {sel.has(rid) && <rect x={c * CELL} y={r * CELL} width={CELL + 0.5} height={CELL + 0.5} className="sel-overlay" />}
              {target === rid && <rect x={c * CELL} y={r * CELL} width={CELL + 0.5} height={CELL + 0.5} fill="url(#hatch)" />}
            </g>
          )
        )
      )}
      {edges.inner.map(([x1, y1, x2, y2], i) => (
        <line key={'i' + i} x1={x1} y1={y1} x2={x2} y2={y2} className="edge-in" />
      ))}
      {edges.outer.map(([x1, y1, x2, y2], i) => (
        <line key={'o' + i} x1={x1} y1={y1} x2={x2} y2={y2} className="edge-out" />
      ))}
      {Object.entries(CENTERS).map(([rid, p]) => {
        const capOf = CAPITALS.indexOf(rid);
        const isCap = capOf >= 0 && capOf < state.players.length;
        return (
          <g key={rid} className="label" pointerEvents="none">
            <text x={p.x} y={p.y - 3} textAnchor="middle" className="lname">{isCap ? '★ ' : ''}{REGIONS[rid].short}</text>
            {state.status !== 'lobby' && (
              <text x={p.x} y={p.y + 11} textAnchor="middle" className="lval">{state.value[rid]}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
