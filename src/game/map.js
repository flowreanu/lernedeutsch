// Hartă stilizată a Germaniei pe o grilă. Fiecare literă = o regiune (Land).
// Vecinătățile se calculează automat din grilă.
export const GRID = [
  '....S.....',
  '...SSMMMM.',
  '..NSSMMMMM',
  '.NNNNNBBBB',
  'NNNNNAABBB',
  'WWNNNAABBB',
  'WWWNHAAXXB',
  'WWWHHTTXXX',
  'RRWHHTTXX.',
  'RRRHHFFF..',
  'RRKKKFFFF.',
  '.KKKKYYYY.',
  '.KKKYYYYY.',
  '..KKYYYY..',
];

export const REGIONS = {
  S: { name: 'Schleswig-Holstein', short: 'Schleswig-H.', city: 'Kiel' },
  M: { name: 'Mecklenburg-Vorpommern', short: 'Mecklenburg', city: 'Schwerin' },
  N: { name: 'Niedersachsen', short: 'Niedersachsen', city: 'Hannover' },
  B: { name: 'Berlin-Brandenburg', short: 'Berlin-Brdbg.', city: 'Berlin' },
  A: { name: 'Sachsen-Anhalt', short: 'S.-Anhalt', city: 'Magdeburg' },
  W: { name: 'Nordrhein-Westfalen', short: 'NRW', city: 'Düsseldorf' },
  H: { name: 'Hessen', short: 'Hessen', city: 'Wiesbaden' },
  T: { name: 'Thüringen', short: 'Thüringen', city: 'Erfurt' },
  X: { name: 'Sachsen', short: 'Sachsen', city: 'Dresden' },
  R: { name: 'Rheinland-Pfalz & Saarland', short: 'Rheinland-Pf.', city: 'Mainz' },
  K: { name: 'Baden-Württemberg', short: 'Baden-W.', city: 'Stuttgart' },
  F: { name: 'Franken', short: 'Franken', city: 'Nürnberg' },
  Y: { name: 'Bayern', short: 'Bayern', city: 'München' },
};
export const REGION_IDS = Object.keys(REGIONS);

// Capitalele de start (vest, est, sud) — una pentru fiecare jucător
export const CAPITALS = ['W', 'B', 'Y'];
export const COLORS = [
  { name: 'Roșu', fill: '#d6453a', light: '#f4c3bd' },
  { name: 'Albastru', fill: '#2f6fd0', light: '#bcd2f3' },
  { name: 'Galben', fill: '#e2a500', light: '#f6e2a6' },
];

export const CELL = 40;
export const ROWS = GRID.length;
export const COLS = GRID[0].length;
export const cellAt = (r, c) => (r >= 0 && r < ROWS && c >= 0 && c < COLS ? GRID[r][c] : '.');

export const ADJ = (() => {
  const adj = Object.fromEntries(REGION_IDS.map((id) => [id, new Set()]));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const a = cellAt(r, c);
      if (a === '.') continue;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const b = cellAt(r + dr, c + dc);
        if (b !== '.' && b !== a) {
          adj[a].add(b);
          adj[b].add(a);
        }
      }
    }
  return Object.fromEntries(Object.entries(adj).map(([k, v]) => [k, [...v]]));
})();

// Centrul fiecărei regiuni (pentru etichete)
export const CENTERS = (() => {
  const acc = {};
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const a = cellAt(r, c);
      if (a === '.') continue;
      acc[a] = acc[a] || { x: 0, y: 0, n: 0, cells: [] };
      acc[a].x += c;
      acc[a].y += r;
      acc[a].n++;
      acc[a].cells.push([r, c]);
    }
  return Object.fromEntries(
    Object.entries(acc).map(([k, v]) => {
      const cx = v.x / v.n;
      const cy = v.y / v.n;
      // alege celula regiunii cea mai apropiată de centru (pentru forme concave)
      const best = v.cells.reduce((b, [r, c]) => {
        const d = (c - cx) ** 2 + (r - cy) ** 2;
        return d < b.d ? { d, r, c } : b;
      }, { d: Infinity });
      return [k, { x: (best.c + 0.5) * CELL, y: (best.r + 0.5) * CELL }];
    })
  );
})();
