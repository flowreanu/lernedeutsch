// Harta jocului: 12 regiuni cu contururile reale ale landurilor germane.
export { VIEWBOX, PATHS, LABELS } from './mapPaths.js';

export const REGIONS = {
  S: { name: 'Schleswig-Holstein & Hamburg', short: 'Schleswig-Holstein', city: 'Kiel' },
  M: { name: 'Mecklenburg-Vorpommern', short: 'Mecklenburg', city: 'Schwerin' },
  N: { name: 'Niedersachsen & Bremen', short: 'Niedersachsen', city: 'Hannover' },
  B: { name: 'Berlin & Brandenburg', short: 'Berlin', city: 'Berlin' },
  A: { name: 'Sachsen-Anhalt', short: 'Sachsen-Anhalt', city: 'Magdeburg' },
  W: { name: 'Nordrhein-Westfalen', short: 'NRW', city: 'Düsseldorf' },
  H: { name: 'Hessen', short: 'Hessen', city: 'Wiesbaden' },
  T: { name: 'Thüringen', short: 'Thüringen', city: 'Erfurt' },
  X: { name: 'Sachsen', short: 'Sachsen', city: 'Dresden' },
  R: { name: 'Rheinland-Pfalz & Saarland', short: 'Rheinland-Pfalz', city: 'Mainz' },
  K: { name: 'Baden-Württemberg', short: 'Baden-Württ.', city: 'Stuttgart' },
  Y: { name: 'Bayern', short: 'Bayern', city: 'München' },
};
export const REGION_IDS = Object.keys(REGIONS);

// Valoarea de bază (regiunile mari valorează mai mult)
export const BASE_VALUE = { S: 200, M: 300, N: 400, B: 300, A: 200, W: 300, H: 200, T: 200, X: 300, R: 200, K: 300, Y: 400 };

// Vecinătăți reale
export const ADJ = {
  S: ['N', 'M'],
  M: ['S', 'N', 'B'],
  N: ['S', 'M', 'B', 'A', 'W', 'H', 'T'],
  B: ['M', 'N', 'A', 'X'],
  A: ['N', 'B', 'X', 'T'],
  W: ['N', 'H', 'R'],
  H: ['N', 'W', 'R', 'K', 'Y', 'T'],
  T: ['N', 'A', 'X', 'Y', 'H'],
  X: ['B', 'A', 'T', 'Y'],
  R: ['W', 'H', 'K'],
  K: ['R', 'H', 'Y'],
  Y: ['K', 'H', 'T', 'X'],
};

// Capitalele de start (vest, est, sud) — castele cu 3 turnuri
export const CAPITALS = ['W', 'B', 'Y'];
// Culorile steagului german, ușor pastelate
export const COLORS = [
  { name: 'Roșu', fill: '#e0645a', light: '#ffab9f', dark: '#8e2a24', chip: '#e0645a' },
  { name: 'Negru', fill: '#3d3c42', light: '#7d7b85', dark: '#121115', chip: '#9d9aa6' },
  { name: 'Auriu', fill: '#f2bf3c', light: '#ffe8a3', dark: '#94690a', chip: '#f2bf3c' },
];
export const NEUTRAL = { fill: '#cfc3ab', light: '#f4ecdc', dark: '#8f8268' };
