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
let deVoice = null;
function pickVoice() {
  if (typeof speechSynthesis === 'undefined') return null;
  const vs = speechSynthesis.getVoices();
  deVoice = vs.find((v) => v.lang === 'de-DE' && /google|natural|premium/i.test(v.name)) || vs.find((v) => v.lang?.startsWith('de')) || null;
  return deVoice;
}
if (typeof speechSynthesis !== 'undefined') {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
export function speak(text, rate = 0.9) {
  try {
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/’/g, "'"));
    u.lang = 'de-DE';
    u.rate = rate;
    if (deVoice || pickVoice()) u.voice = deVoice;
    speechSynthesis.speak(u);
  } catch {}
}
export const canSpeak = typeof speechSynthesis !== 'undefined';

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
