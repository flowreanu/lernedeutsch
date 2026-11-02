// Logica jocului „Cucerește Germania”. Funcții pure: (stare, mutare) -> stare nouă.
// Rulează doar pe telefonul gazdei (host); ceilalți trimit mutări și primesc starea.
import { ADJ, CAPITALS, COLORS, REGION_IDS, REGIONS } from './map.js';
import { gameQuestion } from '../lib/learn.js';

export const Q_MS = 15000;
export const PICK_MS = 12000;
export const ATTACK_MS = 15000;
export const RESULT_MS = 3500;
export const BATTLE_ROUNDS = 3;
export const CAPITAL_VALUE = 300;
export const REGION_VALUE = 200;
export const DEFEND_BONUS = 100;

const clone = (s) => JSON.parse(JSON.stringify(s));

export function createState(host, maxLesson = 12) {
  return {
    v: 1,
    status: 'lobby',
    phase: null,
    maxLesson,
    players: [{ id: host.id, name: host.name, color: 0, bot: false }],
    owner: Object.fromEntries(REGION_IDS.map((r) => [r, null])),
    value: Object.fromEntries(REGION_IDS.map((r) => [r, REGION_VALUE])),
    q: null,
    answers: {},
    picks: [],
    battle: null,
    result: null,
    timer: { seq: 0, ms: 0 },
    deadline: 0,
    scores: [0],
    log: [],
  };
}

const setTimer = (s, ms, now) => {
  s.timer = { seq: s.timer.seq + 1, ms };
  s.deadline = now + ms;
};
const log = (s, text) => {
  s.log = [text, ...s.log].slice(0, 6);
};
export const playerIndex = (s, userId) => s.players.findIndex((p) => p.id === userId);
export const freeRegions = (s) => REGION_IDS.filter((r) => s.owner[r] === null);
export const ownedBy = (s, i) => REGION_IDS.filter((r) => s.owner[r] === i);
function computeScores(s) {
  s.scores = s.players.map((_, i) => ownedBy(s, i).reduce((t, r) => t + s.value[r], 0));
}

export function validPicks(s, i) {
  const free = freeRegions(s);
  const mine = ownedBy(s, i);
  const adjacent = free.filter((r) => mine.some((m) => ADJ[m].includes(r)));
  return adjacent.length ? adjacent : free;
}
export function validTargets(s, i) {
  const enemy = REGION_IDS.filter((r) => s.owner[r] !== null && s.owner[r] !== i);
  const mine = ownedBy(s, i);
  const adjacent = enemy.filter((r) => mine.some((m) => ADJ[m].includes(r)));
  return adjacent.length ? adjacent : enemy;
}

// Cine trebuie să răspundă la întrebarea curentă
export function answerers(s) {
  if (s.phase === 'expand-q') return s.players.map((_, i) => i);
  if (s.phase === 'battle-q') return [s.battle.attacker, s.battle.defender];
  return [];
}

function newExpandQuestion(s, now) {
  s.phase = 'expand-q';
  s.q = gameQuestion(s.maxLesson);
  s.answers = {};
  s.result = null;
  setTimer(s, Q_MS, now);
}

function startGame(s, now) {
  s.status = 'playing';
  s.players.forEach((p, i) => {
    const cap = CAPITALS[i];
    s.owner[cap] = i;
    s.value[cap] = CAPITAL_VALUE;
  });
  log(s, 'Jocul a început! Fiecare are o capitală.');
  computeScores(s);
  newExpandQuestion(s, now);
}

function resolveExpand(s, now) {
  const correct = Object.entries(s.answers)
    .filter(([, a]) => a.c === s.q.answer)
    .sort((a, b) => a[1].t - b[1].t)
    .map(([i]) => +i);
  const free = freeRegions(s).length;
  const picks = [];
  if (correct[0] !== undefined) picks.push(correct[0], correct[0]);
  if (correct[1] !== undefined) picks.push(correct[1]);
  s.picks = picks.slice(0, free);
  s.result = {
    kind: 'expand',
    correctAnswer: s.q.answer,
    answers: s.answers,
    ranking: correct,
    text: correct.length
      ? `${s.players[correct[0]].name} a fost cel mai rapid (2 teritorii)` + (correct[1] !== undefined ? `, ${s.players[correct[1]].name} al doilea (1 teritoriu)` : '')
      : 'Nimeni nu a răspuns corect. Următoarea întrebare!',
  };
  s.phase = 'expand-result';
  setTimer(s, RESULT_MS, now);
}

function nextAfterExpandResult(s, now) {
  if (s.picks.length) {
    s.phase = 'expand-pick';
    setTimer(s, PICK_MS, now);
  } else newExpandQuestion(s, now);
}

function doPick(s, i, region, now) {
  s.owner[region] = i;
  log(s, `${s.players[i].name} a ocupat ${REGIONS[region].name}.`);
  s.picks.shift();
  computeScores(s);
  if (!freeRegions(s).length) return startBattle(s, now);
  if (s.picks.length) setTimer(s, PICK_MS, now);
  else newExpandQuestion(s, now);
}

function startBattle(s, now) {
  const n = s.players.length;
  const order = [];
  for (let r = 0; r < BATTLE_ROUNDS; r++) for (let k = 0; k < n; k++) order.push((k + r) % n);
  s.battle = { order, turn: 0, attacker: order[0], defender: null, target: null };
  s.picks = [];
  log(s, 'Toată harta e ocupată. Încep bătăliile!');
  beginTurn(s, now);
}

function beginTurn(s, now) {
  const b = s.battle;
  while (b.turn < b.order.length && (!ownedBy(s, b.order[b.turn]).length || !validTargets(s, b.order[b.turn]).length)) b.turn++;
  if (b.turn >= b.order.length) return finish(s);
  b.attacker = b.order[b.turn];
  b.defender = null;
  b.target = null;
  s.q = null;
  s.answers = {};
  s.result = null;
  s.phase = 'battle-select';
  setTimer(s, ATTACK_MS, now);
}

function doAttack(s, region, now) {
  const b = s.battle;
  b.target = region;
  b.defender = s.owner[region];
  s.q = gameQuestion(s.maxLesson);
  s.answers = {};
  s.phase = 'battle-q';
  log(s, `${s.players[b.attacker].name} atacă ${REGIONS[region].name}!`);
  setTimer(s, Q_MS, now);
}

function resolveBattle(s, now) {
  const b = s.battle;
  const A = s.answers[b.attacker];
  const D = s.answers[b.defender];
  const aOk = A && A.c === s.q.answer;
  const dOk = D && D.c === s.q.answer;
  let text;
  let outcome;
  if (aOk && (!dOk || A.t < D.t)) {
    s.owner[b.target] = b.attacker;
    outcome = 'captured';
    text = `${s.players[b.attacker].name} a cucerit ${REGIONS[b.target].name}!` + (dOk ? ' (a fost mai rapid)' : '');
  } else if (dOk) {
    s.value[b.target] += DEFEND_BONUS;
    outcome = 'defended';
    text = `${s.players[b.defender].name} a apărat ${REGIONS[b.target].name} (+${DEFEND_BONUS} puncte pentru teritoriu).`;
  } else {
    outcome = 'none';
    text = 'Niciun răspuns corect — teritoriul rămâne cum era.';
  }
  log(s, text);
  s.result = { kind: 'battle', outcome, correctAnswer: s.q.answer, answers: s.answers, text };
  computeScores(s);
  s.phase = 'battle-result';
  setTimer(s, RESULT_MS, now);
}

function finish(s) {
  computeScores(s);
  s.status = 'finished';
  s.phase = 'finished';
  s.q = null;
  s.deadline = 0;
  s.timer = { seq: s.timer.seq + 1, ms: 0 };
  const best = Math.max(...s.scores);
  const winners = s.players.filter((_, i) => s.scores[i] === best).map((p) => p.name);
  log(s, `Câștigător: ${winners.join(' & ')} cu ${best} de puncte!`);
}

// ------------------------------------------------------------------ API principal
export function applyMove(state, userId, move, now = Date.now()) {
  const s = clone(state);
  const i = playerIndex(s, userId);
  switch (move.type) {
    case 'join': {
      if (s.status !== 'lobby' || i >= 0 || s.players.length >= 3) return state;
      const used = s.players.map((p) => p.color);
      s.players.push({ id: userId, name: (move.name || 'Jucător').slice(0, 20), color: [0, 1, 2].find((c) => !used.includes(c)), bot: !!move.bot });
      s.scores = s.players.map(() => 0);
      return s;
    }
    case 'leave': {
      if (s.status !== 'lobby' || i <= 0) return state;
      s.players.splice(i, 1);
      s.scores = s.players.map(() => 0);
      return s;
    }
    case 'start': {
      if (s.status !== 'lobby' || i !== 0 || s.players.length < 2) return state;
      startGame(s, now);
      return s;
    }
    case 'answer': {
      if (!s.q || move.qid !== s.q.id || !answerers(s).includes(i) || s.answers[i]) return state;
      s.answers[i] = { c: move.c, t: Math.max(0, Math.min(Q_MS, +move.t || Q_MS)) };
      if (answerers(s).every((k) => s.answers[k])) {
        if (s.phase === 'expand-q') resolveExpand(s, now);
        else resolveBattle(s, now);
      }
      return s;
    }
    case 'pick': {
      if (s.phase !== 'expand-pick' || s.picks[0] !== i || !validPicks(s, i).includes(move.region)) return state;
      doPick(s, i, move.region, now);
      return s;
    }
    case 'attack': {
      if (s.phase !== 'battle-select' || s.battle.attacker !== i || !validTargets(s, i).includes(move.region)) return state;
      doAttack(s, move.region, now);
      return s;
    }
    default:
      return state;
  }
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Apelat periodic de gazdă: trece mai departe când expiră timpul
export function tick(state, now = Date.now()) {
  if (state.status !== 'playing' || !state.deadline || now < state.deadline) return state;
  const s = clone(state);
  switch (s.phase) {
    case 'expand-q':
      resolveExpand(s, now);
      break;
    case 'expand-result':
      nextAfterExpandResult(s, now);
      break;
    case 'expand-pick':
      doPick(s, s.picks[0], rand(validPicks(s, s.picks[0])), now);
      break;
    case 'battle-select':
      doAttack(s, rand(validTargets(s, s.battle.attacker)), now);
      break;
    case 'battle-q':
      resolveBattle(s, now);
      break;
    case 'battle-result':
      s.battle.turn++;
      beginTurn(s, now);
      break;
  }
  return s;
}

// Boți: ce mutare ar face un bot acum (și după cât timp)
export function botAction(s, i) {
  const p = s.players[i];
  if (!p?.bot || s.status !== 'playing') return null;
  if ((s.phase === 'expand-q' || s.phase === 'battle-q') && answerers(s).includes(i) && !s.answers[i]) {
    const delay = 2500 + Math.random() * 7500;
    const c = Math.random() < 0.6 ? s.q.answer : Math.floor(Math.random() * s.q.options.length);
    return { delay, move: { type: 'answer', qid: s.q.id, c, t: Math.round(delay) } };
  }
  if (s.phase === 'expand-pick' && s.picks[0] === i) return { delay: 1500, move: { type: 'pick', region: rand(validPicks(s, i)) } };
  if (s.phase === 'battle-select' && s.battle.attacker === i) return { delay: 2000, move: { type: 'attack', region: rand(validTargets(s, i)) } };
  return null;
}

export const BOT_NAMES = ['Bot Hans', 'Bot Greta'];
export { COLORS };
