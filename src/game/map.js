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
// Culorile drapelului: Andrei (gazda) = galben-auriu, al 2-lea = roșu, al 3-lea = negru/grafit
export const COLORS = [
  { name: 'Auriu', fill: '#f5c443', light: '#ffe58f', dark: '#a87505', glow: 'rgba(245,196,67,.75)', text: '#2a1d00' },
  { name: 'Roșu', fill: '#ef4b3f', light: '#ff8f84', dark: '#8c1a12', glow: 'rgba(239,75,63,.75)', text: '#ffffff' },
  { name: 'Negru', fill: '#16181e', light: '#aab0bd', dark: '#050608', glow: 'rgba(170,176,190,.6)', text: '#ffffff' },
];
export const NEUTRAL = { fill: '#6b7180', light: '#8f95a3', dark: '#454a55' };
