import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, isDemo } from '../lib/backend.js';
import { applyMove, answerers, botAction, BOT_NAMES, COLORS, playerIndex, tick, validPicks, validTargets } from '../game/engine.js';
import { REGIONS } from '../game/map.js';
import GermanyMap from '../game/GermanyMap.jsx';
import { go } from '../lib/nav.js';

function useNow(active) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => set((x) => x + 1), 250);
    return () => clearInterval(iv);
  }, [active]);
  return Date.now();
}

export default function Game({ gameId, user, profile, refresh }) {
  const [game, setGame] = useState(null);
  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null); // {qid, c}
  const [copied, setCopied] = useState(false);
  const stateRef = useRef(null);
  const localTimer = useRef({ seq: -1, deadline: 0, shownAt: 0 });
  const botTimers = useRef({});
  const recorded = useRef(false);
  const joinSent = useRef(0);
  const isHost = !!game && game.host === user.id;
  const hostRef = useRef(false);
  hostRef.current = isHost;

  // ---------------------------------------------------------------- încărcare
  useEffect(() => {
    api
      .getGame(gameId)
      .then((g) => {
        if (!g) return setErr('Jocul nu mai există.');
        setGame(g);
        stateRef.current = g.state;
        setState(g.state);
      })
      .catch((e) => setErr(e.message));
  }, [gameId]);

  const accept = useCallback((st) => {
    const cur = stateRef.current;
    if (cur && (st.rev || 0) < (cur.rev || 0)) return;
    stateRef.current = st;
    setState(st);
  }, []);

  const commit = useCallback(
    (next) => {
      if (next === stateRef.current) return;
      next.rev = (stateRef.current?.rev || 0) + 1;
      stateRef.current = next;
      setState(next);
      api.updateGame(gameId, next).catch((e) => setErr('Eroare la salvare: ' + e.message));
    },
    [gameId]
  );
  const hostApply = useCallback((uid, move) => commit(applyMove(stateRef.current, uid, move, Date.now())), [commit]);

  // ---------------------------------------------------------------- sincronizare
  useEffect(() => {
    if (!game) return;
    const seen = new Set();
    let lastId = 0;
    let ready = !hostRef.current;
    const onMove = (row) => {
      if (!hostRef.current || seen.has(row.id)) return;
      seen.add(row.id);
      lastId = Math.max(lastId, row.id);
      if (ready) hostApply(row.user_id, row.move);
    };
    if (hostRef.current)
      api.movesSince(game.id, 0).then((rows) => {
        rows.forEach((r) => {
          seen.add(r.id);
          lastId = Math.max(lastId, r.id);
        });
        // aplicăm "join"-urile vechi (sigure, idempotente) în caz că gazda a reîncărcat pagina
        rows.filter((r) => r.move.type === 'join').forEach((r) => hostApply(r.user_id, r.move));
        ready = true;
      });
    const unsub = api.subscribeGame(game.id, { onState: (st) => !hostRef.current && accept(st), onMove });
    const iv = setInterval(async () => {
      try {
        if (hostRef.current) {
          if (ready) (await api.movesSince(game.id, lastId)).forEach(onMove);
        } else {
          const g = await api.getGame(game.id);
          if (g) accept(g.state);
        }
      } catch {}
    }, 2500);
    return () => {
      unsub();
      clearInterval(iv);
    };
  }, [game, hostApply, accept]);

  // gazda: cronometru
  useEffect(() => {
    if (!isHost) return;
    const iv = setInterval(() => {
      const s = stateRef.current;
      if (!s || s.status !== 'playing') return;
      const n = tick(s, Date.now());
      if (n !== s) commit(n);
    }, 300);
    return () => clearInterval(iv);
  }, [isHost, commit]);

  // gazda: boți
  useEffect(() => {
    if (!isHost || !state || state.status !== 'playing') return;
    state.players.forEach((p, i) => {
      if (!p.bot) return;
      const key = `${state.timer.seq}-${i}`;
      if (botTimers.current[key]) return;
      const act = botAction(state, i);
      if (!act) return;
      botTimers.current[key] = setTimeout(() => hostApply(p.id, act.move), act.delay);
    });
  }, [isHost, state, hostApply]);
  useEffect(() => () => Object.values(botTimers.current).forEach(clearTimeout), []);

  // jucător: intră automat în lobby
  useEffect(() => {
    if (!state || !game || isHost || state.status !== 'lobby') return;
    if (playerIndex(state, user.id) >= 0 || state.players.length >= 3) return;
    if (Date.now() - joinSent.current < 4000) return;
    joinSent.current = Date.now();
    api.sendMove(game.id, { type: 'join', name: profile.display_name }).catch((e) => setErr(e.message));
  }, [state, game, isHost, user.id, profile.display_name]);

  // final: înregistrează rezultatul
  useEffect(() => {
    if (state?.status === 'finished' && !recorded.current && playerIndex(state, user.id) >= 0) {
      recorded.current = true;
      setTimeout(() => api.recordResult(gameId).then(refresh).catch(() => {}), isHost ? 300 : 1500);
    }
  }, [state, gameId, isHost, user.id, refresh]);

  const playing = state?.status === 'playing';
  const now = useNow(playing);

  if (err) return <div className="page"><div className="msg bad">{err}</div><button className="btn" onClick={() => go('joc')}>Înapoi</button></div>;
  if (!state) return <div className="page">Se încarcă jocul…</div>;

  // cronometru local (independent de ceasul gazdei)
  if (state.timer.seq !== localTimer.current.seq) {
    localTimer.current = { seq: state.timer.seq, deadline: Date.now() + state.timer.ms, shownAt: Date.now() };
  }
  const left = Math.max(0, Math.ceil((localTimer.current.deadline - now) / 1000));
  const me = playerIndex(state, user.id);
  const send = (move) => {
    if (isHost) hostApply(user.id, move);
    else api.sendMove(game.id, move).catch((e) => setErr(e.message));
  };

  const ans = answerers(state);
  const iAnswer = state.q && ans.includes(me);
  const answeredAlready = (state.answers && state.answers[me]) || (myAnswer && myAnswer.qid === state.q?.id);
  let selectable = [];
  if (state.phase === 'expand-pick' && state.picks[0] === me) selectable = validPicks(state, me);
  if (state.phase === 'battle-select' && state.battle.attacker === me) selectable = validTargets(state, me);
  const onSelect = (rid) => send({ type: state.phase === 'expand-pick' ? 'pick' : 'attack', region: rid });
  const name = (i) => state.players[i]?.name || '?';
  const dot = (i) => <i className="pdot" style={{ background: COLORS[state.players[i]?.color ?? 0].fill }} />;

  const invite = `${location.origin}${location.pathname}#/joc?cod=${game.code}`;
  async function share() {
    const text = `Hai la un joc de germană „Cucerește Germania”! Cod: ${game.code} — ${invite}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  function choose(c) {
    if (answeredAlready) return;
    setMyAnswer({ qid: state.q.id, c });
    send({ type: 'answer', qid: state.q.id, c, t: Date.now() - localTimer.current.shownAt });
  }

  // ---------------------------------------------------------------- panou
  let panel = null;
  if (state.status === 'lobby') {
    panel = (
      <div className="gpanel">
        <div className="code-box">
          <span>Cod joc</span>
          <b className="code big">{game.code}</b>
          <button className="btn small" onClick={share}>{copied ? 'Copiat ✓' : 'Invită colegi'}</button>
        </div>
        <div className="slots">
          {[0, 1, 2].map((i) => (
            <div key={i} className={'slot' + (state.players[i] ? ' full' : '')}>
              {state.players[i] ? (
                <>
                  {dot(i)} <b>{state.players[i].name}</b> {i === 0 && <small>(gazdă)</small>}
                </>
              ) : (
                <span className="muted">Așteaptă un jucător…</span>
              )}
            </div>
          ))}
        </div>
        {isHost ? (
          <div className="col">
            {state.players.length < 3 && (
              <button className="btn ghost" onClick={() => {
                const n = state.players.filter((p) => p.bot).length;
                hostApply('bot-' + Math.random().toString(36).slice(2, 7), { type: 'join', name: BOT_NAMES[n] || 'Bot', bot: true });
              }}>+ Adaugă un bot</button>
            )}
            <button className="btn" disabled={state.players.length < 2} onClick={() => send({ type: 'start' })}>
              Începe jocul ({state.players.length}/3)
            </button>
            {!isDemo && <p className="muted small">Ține aplicația deschisă până la final — telefonul tău conduce jocul.</p>}
          </div>
        ) : me >= 0 ? (
          <p className="muted center-text">Ai intrat! Așteaptă ca gazda să înceapă jocul.</p>
        ) : state.players.length >= 3 ? (
          <p className="msg bad">Jocul e plin.</p>
        ) : (
          <p className="muted">Se intră în joc…</p>
        )}
      </div>
    );
  } else if (state.phase === 'expand-q' || state.phase === 'battle-q') {
    const title =
      state.phase === 'expand-q'
        ? 'Toată lumea răspunde!'
        : (
          <>
            {dot(state.battle.attacker)} {name(state.battle.attacker)} atacă {REGIONS[state.battle.target].name} ({dot(state.battle.defender)} {name(state.battle.defender)})
          </>
        );
    panel = (
      <div className="gpanel">
        <div className="qhead">
          <span>{title}</span>
          <span className={'timer' + (left <= 5 ? ' low' : '')}>{left}s</span>
        </div>
        <div className="qcard">
          <small>{state.q.kind}</small>
          <div className="qprompt">{state.q.prompt}</div>
          {state.q.sub && <div className="sub">„{state.q.sub}”</div>}
          <div className="options">
            {state.q.options.map((o, i) => (
              <button
                key={i}
                className={'opt' + (myAnswer?.qid === state.q.id && myAnswer.c === i ? ' picked' : '')}
                disabled={!iAnswer || !!answeredAlready}
                onClick={() => choose(i)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <p className="muted small center-text">
          {!iAnswer ? 'Doar atacatorul și apărătorul răspund. Urmărește!' : answeredAlready ? 'Ai răspuns. Așteaptă ceilalți…' : 'Corect și repede!'}
          {' · '}Au răspuns: {Object.keys(state.answers).length}/{ans.length}
        </p>
      </div>
    );
  } else if (state.phase === 'expand-result' || state.phase === 'battle-result') {
    const r = state.result;
    panel = (
      <div className="gpanel">
        <div className={'result ' + (r.outcome || '')}>{r.text}</div>
        {state.q && <p className="center-text">Răspuns corect: <b>{state.q.options[r.correctAnswer]}</b></p>}
        <ul className="answers">
          {Object.entries(r.answers).map(([i, a]) => (
            <li key={i}>
              {dot(+i)} {name(+i)}: {a.c === r.correctAnswer ? '✓' : '✗'} <small>{(a.t / 1000).toFixed(1)}s</small>
            </li>
          ))}
          {(state.phase === 'expand-result' ? state.players.map((_, i) => i) : [state.battle.attacker, state.battle.defender])
            .filter((i) => !r.answers[i])
            .map((i) => (
              <li key={'n' + i}>{dot(i)} {name(i)}: — <small>fără răspuns</small></li>
            ))}
        </ul>
      </div>
    );
  } else if (state.phase === 'expand-pick') {
    const p = state.picks[0];
    panel = (
      <div className="gpanel">
        <div className="qhead">
          <span>{p === me ? <b>Alege un teritoriu liber pe hartă!</b> : <>{dot(p)} {name(p)} alege un teritoriu…</>}</span>
          <span className={'timer' + (left <= 4 ? ' low' : '')}>{left}s</span>
        </div>
        {p === me && <p className="muted small">Teritoriile care pulsează sunt disponibile. {state.picks.filter((x) => x === me).length > 1 ? 'Mai ai o alegere după aceasta.' : ''}</p>}
      </div>
    );
  } else if (state.phase === 'battle-select') {
    const a = state.battle.attacker;
    panel = (
      <div className="gpanel">
        <div className="qhead">
          <span>{a === me ? <b>E rândul tău: alege pe cine ataci!</b> : <>{dot(a)} {name(a)} alege pe cine atacă…</>}</span>
          <span className={'timer' + (left <= 4 ? ' low' : '')}>{left}s</span>
        </div>
        <p className="muted small">Bătălia {state.battle.turn + 1} din {state.battle.order.length} · runda {Math.floor(state.battle.turn / state.players.length) + 1}/3</p>
      </div>
    );
  } else if (state.status === 'finished') {
    const order = state.players.map((p, i) => ({ ...p, i, s: state.scores[i] })).sort((a, b) => b.s - a.s);
    panel = (
      <div className="gpanel">
        <h2 className="center-text">Final!</h2>
        <ol className="podium">
          {order.map((p, k) => (
            <li key={p.i} className={p.i === me ? 'me' : ''}>
              <span>{['🥇', '🥈', '🥉'][k]}</span> {dot(p.i)} <b>{p.name}</b> <span className="val">{p.s} p</span>
            </li>
          ))}
        </ol>
        {me >= 0 && <p className="muted small center-text">Punctele tale au fost adăugate în clasamentul general.</p>}
        <div className="col">
          <button className="btn" onClick={() => go('joc')}>Joc nou</button>
          <button className="btn ghost" onClick={() => go('colegi')}>Vezi clasamentul</button>
        </div>
      </div>
    );
  }

  const panelFirst = ['expand-q', 'battle-q', 'expand-result', 'battle-result', 'finished'].includes(state.phase);
  return (
    <div className="page game">
      <div className="game-top">
        <button className="link" onClick={() => go('joc')}>← Ieși</button>
        <b>Cucerește Germania</b>
        <span className="muted small">{state.status === 'lobby' ? 'Lobby' : state.phase?.startsWith('expand') ? 'Expansiune' : state.phase?.startsWith('battle') ? 'Bătălii' : 'Final'}</span>
      </div>
      <div className="players">
        {state.players.map((p, i) => {
          const active =
            (state.phase === 'expand-pick' && state.picks[0] === i) ||
            (state.phase === 'battle-select' && state.battle.attacker === i) ||
            (state.q && ans.includes(i) && !state.answers[i]);
          return (
            <div key={p.id} className={'pchip' + (active ? ' active' : '') + (i === me ? ' me' : '')} style={{ '--pc': COLORS[p.color].fill }}>
              <span className="pname">{p.name}{p.bot ? ' 🤖' : ''}</span>
              <span className="pscore">{state.scores[i] || 0}</span>
            </div>
          );
        })}
      </div>
      {panelFirst && panel}
      <GermanyMap state={state} selectable={selectable} onSelect={onSelect} target={state.battle?.target && state.phase?.startsWith('battle-') && state.phase !== 'battle-select' ? state.battle.target : null} />
      {!panelFirst && panel}
      {state.log.length > 0 && (
        <ul className="glog">
          {state.log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
