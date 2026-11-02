// „Cucerește Germania” v2 — două moduri de joc. Funcții pure: (stare, mutare) → stare nouă.
// Rulează pe telefonul gazdei; ceilalți trimit mutări și primesc starea.
//
// BLITZKRIEG (Război rapid)
//  1) Expansiune: întrebare pentru toți; cel mai rapid corect alege 2 landuri, al doilea 1.
//  2) Bătălii: pe rând, atacatorul alege un land vecin; duel atacator–apărător (corect + mai rapid).
//     Capitala (Hauptstadtturm, 3 turnuri) se poate ataca doar dintr-un land vecin.
//     Turn zdrobit → turul NU se termină: întrebare nouă, asaltul continuă. Capitală căzută →
//     atacatorul ia tot teritoriul apărătorului și mai atacă o dată.
//
// EROBERUNGSKRIEG (Război de cucerire, varianta extinsă)
//  1) Fiecare alege un land de start (devine capitala lui).
//  2) Runde principale: fiecare alege în secret o țintă, apoi toți răspund. Corect → primește ținta
//     (timpul nu contează). Greșit → ținta rămâne cum era. Două ținte identice corecte → disputat, rămâne liber.
//  3) Stichfrage (departajare): pentru landurile rămase libere, cel mai rapid răspuns corect alege câte unul.
import { ADJ, BASE_VALUE, COLORS, REGION_IDS, REGIONS } from './map.js';
import { gameQuestion } from '../lib/learn.js';

export const MODES = {
  blitz: { id: 'blitz', de: 'Blitzkrieg', ro: 'Război rapid' },
  conquest: { id: 'conquest', de: 'Eroberungskrieg', ro: 'Război de cucerire' },
};
export const Q_MS = 15000;
export const CONQ_Q_MS = 20000;
export const PICK_MS = 12000;
export const TARGET_MS = 15000;
export const ATTACK_MS = 15000;
export const RESULT_MS = 3800;
export const BANNER_MS = 2600;
export const BATTLE_ROUNDS = 3;
export const CONQ_ROUNDS = 4;
export const CAPITAL_VALUE = 600;
export const CASTLE_HP = 3;
export const DEFEND_BONUS = 100;
export const BLITZ_CAPITALS = ['W', 'B', 'Y'];

const clone = (s) => JSON.parse(JSON.stringify(s));
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function createState(host, maxLesson = 12, mode = 'blitz') {
  return {
    v: 2,
    mode,
    status: 'lobby',
    phase: null,
    maxLesson,
    players: [{ id: host.id, name: host.name, color: 0, bot: false }],
    owner: Object.fromEntries(REGION_IDS.map((r) => [r, null])),
    value: { ...BASE_VALUE },
    castle: {}, // rid -> turnuri rămase
    capital: {}, // playerIndex -> rid
    q: null,
    answers: {},
    picks: [],
    battle: null,
    conq: null,
    result: null,
    banner: null,
    events: [], // pentru animații: {id, type: capture|hit|crush|defend, rid, by}
    timer: { seq: 0, ms: 0 },
    deadline: 0,
    scores: [0],
    log: [],
  };
}

// ------------------------------------------------------------------ utilitare
const setTimer = (s, ms, now) => {
  s.timer = { seq: s.timer.seq + 1, ms };
  s.deadline = now + ms;
};
const log = (s, text) => {
  s.log = [text, ...s.log].slice(0, 7);
};
let evId = 0;
const event = (s, type, rid, by) => {
  s.events = [...(s.events || []), { id: Date.now() + '-' + evId++, type, rid, by }].slice(-6);
};
const banner = (s, title, sub) => {
  s.banner = { title, sub, seq: (s.banner?.seq || 0) + 1 };
};
export const playerIndex = (s, userId) => s.players.findIndex((p) => p.id === userId);
export const freeRegions = (s) => REGION_IDS.filter((r) => s.owner[r] === null);
export const ownedBy = (s, i) => REGION_IDS.filter((r) => s.owner[r] === i);
export const landCount = (s, i) => ownedBy(s, i).length;
const isCapital = (s, r) => !!s.castle[r];
const adjacentToMine = (s, i, r) => ownedBy(s, i).some((m) => ADJ[m].includes(r));
function computeScores(s) {
  s.scores = s.players.map((_, i) => ownedBy(s, i).reduce((t, r) => t + s.value[r], 0));
}
const name = (s, i) => s.players[i]?.name || '?';

// Ce landuri poate alege jucătorul i acum
export function validPicks(s, i) {
  const free = freeRegions(s);
  if (s.phase === 'start-pick' || s.phase === 'tie-pick') return free;
  const adjacent = free.filter((r) => adjacentToMine(s, i, r));
  return adjacent.length ? adjacent : free;
}
// Ținte de atac (Blitzkrieg): vecine; capitala DOAR dacă e vecină
export function validTargets(s, i) {
  const enemy = REGION_IDS.filter((r) => s.owner[r] !== null && s.owner[r] !== i);
  const adjacent = enemy.filter((r) => adjacentToMine(s, i, r));
  if (adjacent.length) return adjacent;
  return enemy.filter((r) => !isCapital(s, r));
}
// Ținte în runda principală (Eroberungskrieg): libere oriunde + inamice vecine (inclusiv capitale vecine)
export function validConquestTargets(s, i) {
  const free = freeRegions(s);
  const enemy = REGION_IDS.filter((r) => s.owner[r] !== null && s.owner[r] !== i && adjacentToMine(s, i, r));
  return [...free, ...enemy];
}

export function answerers(s) {
  if (s.phase === 'expand-q' || s.phase === 'tie-q') return s.players.map((_, i) => i);
  if (s.phase === 'battle-q') return [s.battle.attacker, s.battle.defender];
  if (s.phase === 'conq-q') return s.players.map((_, i) => i).filter((i) => s.conq.targets[i]);
  return [];
}
// Cine trebuie să acționeze pe hartă acum
export function actors(s) {
  if (s.phase === 'expand-pick' || s.phase === 'tie-pick') return [s.picks[0]];
  if (s.phase === 'start-pick') return [s.conq.startOrder[s.conq.startTurn]];
  if (s.phase === 'battle-select') return [s.battle.attacker];
  if (s.phase === 'conq-target') return s.players.map((_, i) => i).filter((i) => s.conq.targets[i] === undefined);
  return [];
}

function newQuestion(s, phase, ms, now) {
  s.phase = phase;
  s.q = gameQuestion(s.maxLesson);
  s.answers = {};
  s.result = null;
  setTimer(s, ms, now);
}

// ------------------------------------------------------------------ start
function startGame(s, now) {
  s.status = 'playing';
  computeScores(s);
  if (s.mode === 'conquest') {
    s.conq = { round: 0, maxRounds: CONQ_ROUNDS, targets: {}, startOrder: s.players.map((_, i) => i), startTurn: 0 };
    s.phase = 'start-pick';
    banner(s, 'Eroberungskrieg', 'Fiecare își alege landul de start');
    log(s, 'Alegeți pe rând landul de start — devine capitala voastră.');
    setTimer(s, PICK_MS, now);
    return;
  }
  s.players.forEach((_, i) => {
    const cap = BLITZ_CAPITALS[i];
    makeCapital(s, i, cap);
  });
  banner(s, 'Blitzkrieg', 'Cel mai rapid răspuns corect câștigă!');
  log(s, 'Blitzkrieg! Fiecare are o capitală cu 3 turnuri.');
  computeScores(s);
  newQuestion(s, 'expand-q', Q_MS, now);
}
function makeCapital(s, i, rid) {
  s.owner[rid] = i;
  s.value[rid] = CAPITAL_VALUE;
  s.castle[rid] = CASTLE_HP;
  s.capital[i] = rid;
}

// ------------------------------------------------------------------ BLITZKRIEG
function resolveExpand(s, now) {
  const correct = Object.entries(s.answers)
    .filter(([, a]) => a.c === s.q.answer)
    .sort((a, b) => a[1].t - b[1].t)
    .map(([i]) => +i);
  const picks = [];
  if (correct[0] !== undefined) picks.push(correct[0], correct[0]);
  if (correct[1] !== undefined) picks.push(correct[1]);
  s.picks = picks.slice(0, freeRegions(s).length);
  s.result = {
    correctAnswer: s.q.answer,
    answers: s.answers,
    ranking: correct,
    text: correct.length
      ? `🥇 ${name(s, correct[0])}: 2 landuri` + (correct[1] !== undefined ? ` · 🥈 ${name(s, correct[1])}: 1 land` : '')
      : 'Nimeni nu a răspuns corect. Următoarea întrebare!',
  };
  s.phase = 'expand-result';
  setTimer(s, RESULT_MS, now);
}

function doExpandPick(s, i, rid, now) {
  s.owner[rid] = i;
  event(s, 'capture', rid, i);
  log(s, `${name(s, i)} a ocupat ${REGIONS[rid].name}.`);
  s.picks.shift();
  computeScores(s);
  if (!freeRegions(s).length) return startBattle(s, now);
  if (s.picks.length) setTimer(s, PICK_MS, now);
  else newQuestion(s, 'expand-q', Q_MS, now);
}

function startBattle(s, now) {
  const n = s.players.length;
  const order = [];
  for (let r = 0; r < BATTLE_ROUNDS; r++) for (let k = 0; k < n; k++) order.push((k + r) % n);
  s.battle = { order, turn: 0, attacker: order[0], defender: null, target: null, assault: 0 };
  s.picks = [];
  banner(s, 'Schlacht!', 'Harta e plină — încep bătăliile');
  log(s, 'Toată harta e ocupată. Încep bătăliile!');
  beginTurn(s, now);
}

function beginTurn(s, now) {
  const b = s.battle;
  while (b.turn < b.order.length && (!landCount(s, b.order[b.turn]) || !validTargets(s, b.order[b.turn]).length)) b.turn++;
  if (b.turn >= b.order.length) return finish(s);
  b.attacker = b.order[b.turn];
  b.assault = 0;
  selectPhase(s, now);
}
function selectPhase(s, now) {
  const b = s.battle;
  b.defender = null;
  b.target = null;
  s.q = null;
  s.answers = {};
  s.result = null;
  s.phase = 'battle-select';
  setTimer(s, ATTACK_MS, now);
}

function doAttack(s, rid, now) {
  const b = s.battle;
  b.target = rid;
  b.defender = s.owner[rid];
  log(s, `${name(s, b.attacker)} atacă ${REGIONS[rid].name}${isCapital(s, rid) ? ' (capitala!)' : ''}!`);
  newQuestion(s, 'battle-q', Q_MS, now);
}

function resolveBattle(s, now) {
  const b = s.battle;
  const A = s.answers[b.attacker];
  const D = s.answers[b.defender];
  const aOk = A && A.c === s.q.answer;
  const dOk = D && D.c === s.q.answer;
  let text;
  let outcome;
  b.next = 'turn';
  if (aOk && (!dOk || A.t < D.t)) {
    const fast = dOk ? ' (a fost mai rapid)' : '';
    if (isCapital(s, b.target)) {
      s.castle[b.target] -= 1;
      if (s.castle[b.target] > 0) {
        outcome = 'hit';
        event(s, 'crush', b.target, b.attacker);
        text = `💥 ${name(s, b.attacker)} a zdrobit un turn! Mai rămân ${s.castle[b.target]}. Asaltul continuă!` + fast;
        b.next = 'assault';
      } else {
        delete s.castle[b.target];
        const def = b.defender;
        const taken = ownedBy(s, def);
        taken.forEach((r) => {
          s.owner[r] = b.attacker;
          event(s, 'capture', r, b.attacker);
        });
        event(s, 'crush', b.target, b.attacker);
        delete s.capital[def];
        outcome = 'captured';
        text = `🏰 Capitala a căzut! ${name(s, b.attacker)} ia toate cele ${taken.length} landuri ale lui ${name(s, def)} și mai atacă o dată!`;
        b.next = 'bonus';
      }
    } else {
      s.owner[b.target] = b.attacker;
      event(s, 'capture', b.target, b.attacker);
      outcome = 'captured';
      text = `${name(s, b.attacker)} a cucerit ${REGIONS[b.target].name}!` + fast;
    }
  } else if (dOk) {
    s.value[b.target] += DEFEND_BONUS;
    event(s, 'defend', b.target, b.defender);
    outcome = 'defended';
    text = `🛡️ ${name(s, b.defender)} a apărat ${REGIONS[b.target].name} (+${DEFEND_BONUS}).`;
  } else {
    outcome = 'none';
    text = 'Niciun răspuns corect — nimic nu se schimbă.';
  }
  log(s, text);
  s.result = { outcome, correctAnswer: s.q.answer, answers: s.answers, text };
  computeScores(s);
  s.phase = 'battle-result';
  setTimer(s, RESULT_MS, now);
}

function afterBattleResult(s, now) {
  const b = s.battle;
  if (b.next === 'assault') {
    // turul nu se termină: întrebare nouă, aceeași capitală
    b.assault += 1;
    banner(s, 'Sturmangriff!', `${name(s, b.attacker)} continuă asaltul asupra capitalei`);
    newQuestion(s, 'battle-q', Q_MS, now);
    return;
  }
  if (b.next === 'bonus' && validTargets(s, b.attacker).length) {
    banner(s, 'Bonus!', `${name(s, b.attacker)} mai atacă o dată`);
    selectPhase(s, now);
    return;
  }
  b.turn++;
  beginTurn(s, now);
}

// ------------------------------------------------------------------ EROBERUNGSKRIEG
function doStartPick(s, i, rid, now) {
  makeCapital(s, i, rid);
  event(s, 'capture', rid, i);
  log(s, `${name(s, i)} pornește din ${REGIONS[rid].name}.`);
  computeScores(s);
  s.conq.startTurn++;
  if (s.conq.startTurn >= s.conq.startOrder.length) return startConquestRound(s, now);
  setTimer(s, PICK_MS, now);
}

function startConquestRound(s, now) {
  s.conq.round += 1;
  s.conq.targets = {};
  s.players.forEach((_, k) => {
    if (!validConquestTargets(s, k).length) s.conq.targets[k] = null; // nu are ce ataca
  });
  s.q = null;
  s.answers = {};
  s.result = null;
  s.phase = 'conq-target';
  banner(s, `Runde ${s.conq.round}/${s.conq.maxRounds}`, 'Alege în secret ce land vrei să cucerești');
  setTimer(s, TARGET_MS, now);
}

function doTarget(s, i, rid, now) {
  s.conq.targets[i] = rid;
  if (s.players.every((_, k) => s.conq.targets[k] !== undefined)) newQuestion(s, 'conq-q', CONQ_Q_MS, now);
}

function resolveConquest(s, now) {
  const T = Object.fromEntries(Object.entries(s.conq.targets).filter(([, r]) => r));
  const correct = Object.keys(T).map(Number).filter((i) => s.answers[i] && s.answers[i].c === s.q.answer);
  const claims = {};
  correct.forEach((i) => (claims[T[i]] = [...(claims[T[i]] || []), i]));
  const lines = [];
  Object.entries(claims).forEach(([rid, who]) => {
    if (who.length > 1) {
      lines.push(`⚔️ ${REGIONS[rid].short}: disputat de ${who.map((i) => name(s, i)).join(' și ')} — rămâne cum era`);
      return;
    }
    const i = who[0];
    const prev = s.owner[rid];
    if (prev === null) {
      s.owner[rid] = i;
      event(s, 'capture', rid, i);
      lines.push(`✅ ${name(s, i)} a ocupat ${REGIONS[rid].short}`);
    } else if (isCapital(s, rid)) {
      s.castle[rid] -= 1;
      if (s.castle[rid] > 0) {
        event(s, 'crush', rid, i);
        lines.push(`💥 ${name(s, i)} a zdrobit un turn din capitala lui ${name(s, prev)} (mai rămân ${s.castle[rid]})`);
      } else {
        delete s.castle[rid];
        delete s.capital[prev];
        const taken = ownedBy(s, prev);
        taken.forEach((r) => {
          s.owner[r] = i;
          event(s, 'capture', r, i);
        });
        event(s, 'crush', rid, i);
        lines.push(`🏰 ${name(s, i)} a cucerit capitala lui ${name(s, prev)} și toate cele ${taken.length} landuri!`);
      }
    } else {
      s.owner[rid] = i;
      event(s, 'capture', rid, i);
      lines.push(`⚔️ ${name(s, i)} i-a luat lui ${name(s, prev)} ${REGIONS[rid].short}`);
    }
  });
  Object.keys(T)
    .map(Number)
    .filter((i) => !correct.includes(i))
    .forEach((i) => lines.push(`❌ ${name(s, i)} a greșit — ${REGIONS[T[i]].short} rămâne neschimbat`));
  computeScores(s);
  lines.forEach((l) => log(s, l));
  s.result = { correctAnswer: s.q.answer, answers: s.answers, lines, text: lines[0] || '' };
  s.phase = 'conq-result';
  setTimer(s, RESULT_MS + 1200, now);
}

function afterConquestResult(s, now) {
  if (s.conq.round < s.conq.maxRounds) return startConquestRound(s, now);
  if (freeRegions(s).length) {
    s.phase = 'tie-banner';
    s.q = null;
    s.result = null;
    banner(s, 'Stichfrage', 'Faza de departajare — cel mai rapid ia landurile rămase');
    setTimer(s, BANNER_MS, now);
    return;
  }
  finish(s);
}

function resolveTie(s, now) {
  const correct = Object.entries(s.answers)
    .filter(([, a]) => a.c === s.q.answer)
    .sort((a, b) => a[1].t - b[1].t)
    .map(([i]) => +i);
  s.picks = correct.length ? [correct[0]] : [];
  s.result = {
    correctAnswer: s.q.answer,
    answers: s.answers,
    text: correct.length ? `⚡ ${name(s, correct[0])} a fost cel mai rapid și alege un land!` : 'Nimeni corect — încă o Stichfrage!',
  };
  s.phase = 'tie-result';
  setTimer(s, RESULT_MS, now);
}

function doTiePick(s, i, rid, now) {
  s.owner[rid] = i;
  event(s, 'capture', rid, i);
  log(s, `${name(s, i)} a câștigat departajarea: ${REGIONS[rid].name}.`);
  s.picks = [];
  computeScores(s);
  if (!freeRegions(s).length) return finish(s);
  newQuestion(s, 'tie-q', Q_MS, now);
}

// ------------------------------------------------------------------ final
function finish(s) {
  computeScores(s);
  s.status = 'finished';
  s.phase = 'finished';
  s.q = null;
  s.deadline = 0;
  s.timer = { seq: s.timer.seq + 1, ms: 0 };
  const best = Math.max(...s.scores);
  const winners = s.players.filter((_, i) => s.scores[i] === best).map((p) => p.name);
  banner(s, 'Sieg!', `${winners.join(' & ')} câștigă cu ${best} de puncte`);
  log(s, `Câștigător: ${winners.join(' & ')} cu ${best} de puncte!`);
}

// ------------------------------------------------------------------ API
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
    case 'mode': {
      if (s.status !== 'lobby' || i !== 0 || !MODES[move.mode]) return state;
      s.mode = move.mode;
      return s;
    }
    case 'start': {
      if (s.status !== 'lobby' || i !== 0 || s.players.length < 2) return state;
      startGame(s, now);
      return s;
    }
    case 'answer': {
      if (!s.q || move.qid !== s.q.id || !answerers(s).includes(i) || s.answers[i]) return state;
      const max = s.phase === 'conq-q' ? CONQ_Q_MS : Q_MS;
      s.answers[i] = { c: move.c, t: Math.max(0, Math.min(max, Math.round(+move.t) || max)) };
      if (answerers(s).every((k) => s.answers[k])) resolveQuestion(s, now);
      return s;
    }
    case 'pick': {
      if (!actors(s).includes(i) || !validPicks(s, i).includes(move.region)) return state;
      if (s.phase === 'expand-pick') doExpandPick(s, i, move.region, now);
      else if (s.phase === 'start-pick') doStartPick(s, i, move.region, now);
      else if (s.phase === 'tie-pick') doTiePick(s, i, move.region, now);
      else return state;
      return s;
    }
    case 'attack': {
      if (s.phase !== 'battle-select' || s.battle.attacker !== i || !validTargets(s, i).includes(move.region)) return state;
      doAttack(s, move.region, now);
      return s;
    }
    case 'target': {
      if (s.phase !== 'conq-target' || i < 0 || s.conq.targets[i] !== undefined || !validConquestTargets(s, i).includes(move.region)) return state;
      doTarget(s, i, move.region, now);
      return s;
    }
    default:
      return state;
  }
}

function resolveQuestion(s, now) {
  if (s.phase === 'expand-q') resolveExpand(s, now);
  else if (s.phase === 'battle-q') resolveBattle(s, now);
  else if (s.phase === 'conq-q') resolveConquest(s, now);
  else if (s.phase === 'tie-q') resolveTie(s, now);
}

// Apelat periodic de gazdă: avansează când expiră timpul
export function tick(state, now = Date.now()) {
  if (state.status !== 'playing' || !state.deadline || now < state.deadline) return state;
  const s = clone(state);
  switch (s.phase) {
    case 'expand-q':
    case 'battle-q':
    case 'conq-q':
    case 'tie-q':
      resolveQuestion(s, now);
      break;
    case 'expand-result':
      if (s.picks.length) {
        s.phase = 'expand-pick';
        setTimer(s, PICK_MS, now);
      } else newQuestion(s, 'expand-q', Q_MS, now);
      break;
    case 'expand-pick':
      doExpandPick(s, s.picks[0], rand(validPicks(s, s.picks[0])), now);
      break;
    case 'battle-select':
      doAttack(s, rand(validTargets(s, s.battle.attacker)), now);
      break;
    case 'battle-result':
      afterBattleResult(s, now);
      break;
    case 'start-pick': {
      const p = s.conq.startOrder[s.conq.startTurn];
      doStartPick(s, p, rand(validPicks(s, p)), now);
      break;
    }
    case 'conq-target':
      s.players.forEach((_, k) => {
        if (s.conq.targets[k] === undefined) s.conq.targets[k] = rand(validConquestTargets(s, k)) || null;
      });
      newQuestion(s, 'conq-q', CONQ_Q_MS, now);
      break;
    case 'conq-result':
      afterConquestResult(s, now);
      break;
    case 'tie-banner':
      newQuestion(s, 'tie-q', Q_MS, now);
      break;
    case 'tie-result':
      if (s.picks.length) {
        s.phase = 'tie-pick';
        setTimer(s, PICK_MS, now);
      } else newQuestion(s, 'tie-q', Q_MS, now);
      break;
    case 'tie-pick':
      doTiePick(s, s.picks[0], rand(validPicks(s, s.picks[0])), now);
      break;
  }
  return s;
}

// Boți: ce mutare face un bot acum (și după cât timp)
export function botAction(s, i) {
  const p = s.players[i];
  if (!p?.bot || s.status !== 'playing') return null;
  if (s.q && answerers(s).includes(i) && !s.answers[i]) {
    const delay = 2200 + Math.random() * 7000;
    const c = Math.random() < 0.62 ? s.q.answer : Math.floor(Math.random() * s.q.options.length);
    return { delay, move: { type: 'answer', qid: s.q.id, c, t: Math.round(delay) } };
  }
  if (!actors(s).includes(i)) return null;
  if (s.phase === 'battle-select') return { delay: 1800, move: { type: 'attack', region: rand(validTargets(s, i)) } };
  if (s.phase === 'conq-target') return { delay: 1200 + Math.random() * 2500, move: { type: 'target', region: rand(validConquestTargets(s, i)) } };
  return { delay: 1500, move: { type: 'pick', region: rand(validPicks(s, i)) } };
}

export const BOT_NAMES = ['Stefan', 'Katrin'];
export { COLORS };
