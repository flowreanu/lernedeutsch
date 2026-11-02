// Generare exerciții, verificare răspunsuri, repetiție spațiată, pronunție.
import { ALL_WORDS, LESSONS, WORD_BY_ID } from '../data/lessons.js';
import { todayStr } from './backend.js';

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);

// ---------------------------------------------------------------- pronunție
// Ordinea preferințelor: vocea aleasă în Profil → cea mai bună voce germană din
// sistem (Microsoft „Natural”/„Online”, Google Deutsch…) → voce germană online.
const hasSynth = typeof window !== 'undefined' && 'speechSynthesis' in window;
const VOICE_KEY = 'germana-voice';
export const ONLINE_VOICE = 'online';
const isGerman = (v) => (v.lang || '').replace('_', '-').toLowerCase().startsWith('de');

function score(v) {
  const n = v.name.toLowerCase();
  let s = 0;
  if ((v.lang || '').replace('_', '-').toLowerCase() === 'de-de') s += 5;
  if (/natural|online|neural|premium|enhanced/.test(n)) s += 20;
  if (/google/.test(n)) s += 12;
  if (/katja|conrad|amala|seraphina|florian|anna|petra|markus|yannick/.test(n)) s += 4;
  if (!v.localService) s += 2;
  return s;
}
export function germanVoices() {
  if (!hasSynth) return [];
  return speechSynthesis.getVoices().filter(isGerman).sort((a, b) => score(b) - score(a));
}
let voicesReady = null;
function waitVoices() {
  if (!hasSynth) return Promise.resolve();
  if (speechSynthesis.getVoices().length) return Promise.resolve();
  if (!voicesReady)
    voicesReady = new Promise((res) => {
      const t = setTimeout(res, 1200);
      speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); res(); }, { once: true });
      speechSynthesis.getVoices();
    });
  return voicesReady;
}
if (hasSynth) waitVoices();

export function getVoicePref() {
  try { return localStorage.getItem(VOICE_KEY) || ''; } catch { return ''; }
}
export function setVoicePref(name) {
  try { localStorage.setItem(VOICE_KEY, name); } catch {}
}

let audio = null;
function speakOnline(text, rate) {
  try {
    if (audio) audio.pause();
    const slow = rate < 0.8;
    // Pe site-ul publicat trecem prin funcția proprie (/api/tts); local/demo direct.
    const onSite = /^https?:$/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) && !import.meta.env.VITE_FORCE_DEMO;
    const src = onSite
      ? `/api/tts?q=${encodeURIComponent(text)}${slow ? '&slow=1' : ''}`
      : `https://translate.google.com/translate_tts?ie=UTF-8&tl=de&client=tw-ob${slow ? '&ttsspeed=0.3' : ''}&q=${encodeURIComponent(text)}`;
    audio = new Audio(src);
    audio.play().catch((e) => console.warn('Audio online indisponibil:', e));
  } catch {}
}

export async function speak(text, rate = 0.9) {
  text = text.replace(/’/g, "'");
  const pref = getVoicePref();
  if (pref === ONLINE_VOICE || !hasSynth) return speakOnline(text, rate);
  await waitVoices();
  const list = germanVoices();
  const voice = list.find((v) => v.name === pref) || list[0];
  if (!voice) return speakOnline(text, rate); // nicio voce germană în sistem
  try {
    if (audio) audio.pause();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = rate;
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
      setTimeout(() => speechSynthesis.speak(u), 60);
    } else speechSynthesis.speak(u);
  } catch {
    speakOnline(text, rate);
  }
}
export const canSpeak = true;

// ---------------------------------------------------------------- verificare text
export function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .replace(/[.,!?;:¿¡"„“”]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}
const stripArticle = (s) => s.replace(/^(der|die|das) /, '');
// Returnează: 'ok' | 'article' (corect, dar fără articol) | 'typo' (o literă diferență) | 'wrong'
export function checkTyped(input, word) {
  const a = normalize(input);
  const full = normalize(word.de);
  const bare = stripArticle(full);
  if (a === full) return 'ok';
  if (word.art && a === bare) return 'article';
  if (word.art && /^(der|die|das) /.test(a) && stripArticle(a) === bare) return 'wrongArticle';
  if (lev(stripArticle(a), bare) === 1 && bare.length > 3) return 'typo';
  return 'wrong';
}
function lev(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

// ---------------------------------------------------------------- exerciții
function mcOptions(correct, pool, n = 4) {
  const distract = sample(
    [...new Set(pool.filter((x) => x !== correct))],
    n - 1
  );
  const options = shuffle([correct, ...distract]);
  return { options, answer: options.indexOf(correct) };
}
function distractorPool(word, field) {
  const same = LESSON_WORDS(word.lessonId);
  const pool = same.length >= 6 ? same : ALL_WORDS;
  return pool.map((w) => w[field]);
}
const LESSON_WORDS = (lid) => ALL_WORDS.filter((w) => w.lessonId === lid);

export function exDeToRo(word) {
  return { type: 'mc', kind: 'Ce înseamnă?', prompt: word.de, speak: word.de, wordId: word.id, ...mcOptions(word.ro, distractorPool(word, 'ro')) };
}
export function exRoToDe(word) {
  return { type: 'mc', kind: 'Cum se spune în germană?', prompt: word.ro, wordId: word.id, ...mcOptions(word.de, distractorPool(word, 'de')), speakAnswer: word.de };
}
export function exArticle(word) {
  const bare = word.de.replace(/^(der|die|das) /, '');
  const options = ['der', 'die', 'das'];
  return { type: 'mc', kind: 'Alege articolul', prompt: `___ ${bare}`, sub: word.ro, wordId: word.id, options, answer: options.indexOf(word.art), speakAnswer: word.de, articleColors: true };
}
export function exListen(word) {
  return { type: 'listen', kind: 'Ascultă și alege', speak: word.de, wordId: word.id, ...mcOptions(word.de, distractorPool(word, 'de')) };
}
export function exType(word) {
  return { type: 'type', kind: 'Scrie în germană', prompt: word.ro, wordId: word.id, word };
}
export function exOrder([de, ro]) {
  const tokens = de.split(' ');
  return { type: 'order', kind: 'Pune cuvintele în ordine', prompt: ro, answer: de, tokens: shuffle(tokens.map((t, i) => ({ t, i }))) };
}
export function exQuiz(q) {
  const order = shuffle(q.options.map((o, i) => i));
  return { type: 'mc', kind: 'Gramatică', prompt: q.q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.a) };
}

export function buildLesson(lesson) {
  const steps = [];
  const words = lesson.words;
  for (let i = 0; i < words.length; i += 5) {
    const chunk = words.slice(i, i + 5);
    chunk.forEach((w) => steps.push({ type: 'intro', word: w }));
    shuffle(chunk).forEach((w) => steps.push(exDeToRo(w)));
    shuffle(chunk).forEach((w) => steps.push(w.art ? exArticle(w) : exListen(w)));
  }
  steps.push({ type: 'grammar', lesson });
  lesson.quiz.forEach((q) => steps.push(exQuiz(q)));
  lesson.sentences.forEach((s) => steps.push(exOrder(s)));
  const mix = [...sample(words, 4).map(exType), ...sample(words, 3).map(exRoToDe), ...sample(words, 2).map(exListen)];
  return [...steps, ...shuffle(mix)];
}

// ---------------------------------------------------------------- repetiție spațiată
const addDays = (n) => todayStr(new Date(Date.now() + n * 86400000));
export function newCard(wordId) {
  return { word_id: wordId, ease: 2.3, interval_days: 0, reps: 0, due: todayStr() };
}
export function grade(card, correct) {
  const c = { ...card };
  if (correct) {
    c.reps += 1;
    c.interval_days = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.round(Math.max(1, c.interval_days) * c.ease);
    c.ease = Math.min(3, c.ease + 0.05);
  } else {
    c.reps = 0;
    c.interval_days = 1;
    c.ease = Math.max(1.3, c.ease - 0.2);
  }
  c.due = addDays(c.interval_days);
  return c;
}
export const dueCards = (cards) => Object.values(cards).filter((c) => c.due <= todayStr() && WORD_BY_ID[c.word_id]);

export function reviewExercise(card) {
  const w = WORD_BY_ID[card.word_id];
  const makers = [exDeToRo, exRoToDe, exListen];
  if (card.reps >= 1) makers.push(exType, exType);
  if (w.art) makers.push(exArticle);
  return makers[Math.floor(Math.random() * makers.length)](w);
}

// ---------------------------------------------------------------- întrebări pentru joc
export function gameQuestion(maxLesson = 12) {
  const lessons = LESSONS.slice(0, Math.max(1, maxLesson));
  const words = lessons.flatMap((l) => l.words);
  const r = Math.random();
  let ex;
  if (r < 0.2) {
    const l = lessons[Math.floor(Math.random() * lessons.length)];
    ex = exQuiz(l.quiz[Math.floor(Math.random() * l.quiz.length)]);
  } else {
    const w = words[Math.floor(Math.random() * words.length)];
    const pool = (f) => words.map((x) => x[f]);
    if (r < 0.45 && w.art) {
      ex = exArticle(w);
    } else if (r < 0.7) {
      ex = { kind: 'Ce înseamnă?', prompt: w.de, ...mcOptions(w.ro, pool('ro')) };
    } else {
      ex = { kind: 'Cum se spune în germană?', prompt: w.ro, ...mcOptions(w.de, pool('de')) };
    }
  }
  return { id: Math.random().toString(36).slice(2, 9), kind: ex.kind, prompt: ex.prompt, sub: ex.sub || null, options: ex.options, answer: ex.answer };
}
