import React, { useState } from 'react';
import { api, isDemo } from '../lib/backend.js';
import { LESSONS } from '../data/lessons.js';
import { createState } from '../game/engine.js';
import { go } from '../lib/nav.js';

export default function GameLobby({ profile, progress, query }) {
  const doneCount = LESSONS.filter((l) => progress[l.id] !== undefined).length;
  const [maxLesson, setMaxLesson] = useState(Math.max(2, doneCount));
  const [code, setCode] = useState(query.get('cod') || '');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const g = await api.createGame(createState({ id: profile.id, name: profile.display_name }, maxLesson));
      go('joc/' + g.id);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }
  async function join(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      const g = await api.findGame(code);
      if (!g) throw new Error('Nu am găsit niciun joc cu acest cod.');
      go('joc/' + g.id);
    } catch (e2) {
      setMsg(e2.message);
    }
    setBusy(false);
  }

  return (
    <div className="page">
      <h1>Cucerește Germania</h1>
      <p className="muted">Trei jucători, trei culori, o hartă. Răspunzi corect și repede la întrebări din lecții și cucerești landurile Germaniei.</p>

      {query.get('cod') && (
        <form className="card invite" onSubmit={join}>
          <p>Ai fost invitat într-un joc: <b className="code">{query.get('cod')}</b></p>
          <button className="btn" disabled={busy}>Intră în joc</button>
        </form>
      )}

      <div className="card">
        <h3>Joc nou</h3>
        <label>
          Întrebări din lecțiile 1–{maxLesson}
          <input type="range" min="1" max={LESSONS.length} value={maxLesson} onChange={(e) => setMaxLesson(+e.target.value)} />
        </label>
        <p className="muted small">Alege lecțiile pe care le-a făcut toată lumea. Tu ai terminat {doneCount}.</p>
        <button className="btn" onClick={create} disabled={busy}>Creează jocul</button>
        {isDemo && <p className="muted small">În demo joci împotriva a doi boți.</p>}
      </div>

      <form className="card" onSubmit={join}>
        <h3>Intră într-un joc</h3>
        <div className="row">
          <input placeholder="Codul jocului (ex. K7M2P)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} />
          <button className="btn" disabled={busy || code.length < 5}>Intră</button>
        </div>
      </form>
      {msg && <div className="msg bad">{msg}</div>}

      <details className="card rules" open>
        <summary>Regulile jocului</summary>
        <ol>
          <li><b>Start:</b> fiecare jucător primește o capitală (★, 300 de puncte).</li>
          <li><b>Expansiune:</b> toți răspund la aceeași întrebare. Cel mai rapid răspuns corect alege <b>2 teritorii</b> libere, al doilea <b>1 teritoriu</b>. Se alege mai întâi lângă teritoriile tale.</li>
          <li><b>Bătălii (3 runde):</b> pe rând, fiecare atacă un teritoriu vecin al altui jucător. Atacatorul și apărătorul răspund la aceeași întrebare.</li>
          <li>Dacă atacatorul răspunde corect și mai repede, <b>cucerește</b> teritoriul. Dacă apărătorul răspunde corect, teritoriul e apărat și crește cu <b>+100</b>.</li>
          <li>La final câștigă cine are cele mai multe puncte. Punctele se adună în clasamentul general.</li>
        </ol>
      </details>
    </div>
  );
}
