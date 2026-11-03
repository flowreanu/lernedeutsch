import React, { useMemo, useRef, useState } from 'react';
import { dueCards, grade, reviewExercise, shuffle } from '../lib/learn.js';
import { api } from '../lib/backend.js';
import { go } from '../lib/nav.js';
import Runner from './Runner.jsx';
import Bruno from '../components/Bruno.jsx';
import { confetti, sfx } from '../lib/fx.js';

export default function Review({ cards, refresh }) {
  const [mode, setMode] = useState(null); // null | 'due' | 'extra'
  const [result, setResult] = useState(null);
  const [round, setRound] = useState(0);
  const graded = useRef({});
  const due = useMemo(() => dueCards(cards), [cards]);
  const all = Object.values(cards);

  const steps = useMemo(() => {
    if (!mode) return [];
    const list = mode === 'due' ? shuffle(due).slice(0, 30) : shuffle(all).slice(0, 15);
    return list.map((c) => ({ ...reviewExercise(c), card: c }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, round]);

  function onStepResult(step, ok) {
    if (!step.card || graded.current[step.card.word_id]) return;
    graded.current[step.card.word_id] = mode === 'due' ? grade(step.card, ok) : ok ? null : grade(step.card, false);
  }
  // salvează ce s-a repetat până acum (și la ieșirea cu ✕ din mijlocul recapitulării)
  async function saveProgress() {
    const updated = Object.values(graded.current).filter(Boolean);
    graded.current = {};
    if (updated.length) await api.saveCards(updated);
    return updated.length;
  }
  async function exitEarly() {
    setMode(null);
    try {
      if (await saveProgress()) await refresh();
    } catch {}
  }
  async function finish(r) {
    const updated = Object.values(graded.current).filter(Boolean);
    graded.current = {};
    const xp = r.correct * 2;
    setResult({ ...r, xp });
    sfx.finish();
    confetti();
    try {
      await Promise.all([api.saveCards(updated), xp ? api.addXp(xp) : null]);
      await refresh();
    } catch (e) {
      setResult((x) => ({ ...x, err: e.message }));
    }
  }

  if (mode && !result && steps.length)
    return <Runner steps={steps} title={mode === 'due' ? 'Recapitulare' : 'Exersare liberă'} onExit={exitEarly} onFinish={finish} onStepResult={onStepResult} />;

  if (result)
    return (
      <div className="page center">
        <div className="done-card">
          <Bruno mood="cheer" size={130} />
          <h1>Recapitulare gata!</h1>
          <div className="done-stats">
            <div className="stat-tile gold"><small>XP câștigat</small><b>⭐ {result.xp}</b></div>
            <div className={'stat-tile ' + (result.score >= 80 ? 'green' : 'red')}><small>Precizie</small><b>🎯 {result.score}%</b></div>
          </div>
          <p>{result.correct} din {result.total} corecte</p>
          {result.err && <p className="msg bad">Nu s-a putut salva: {result.err}</p>}
          {mode === 'due' && due.length > 0 && !result.err ? (
            <>
              <p className="font-bold text-white/70">Mai ai <b className="text-[#f5c443]">{due.length}</b> {due.length === 1 ? 'cuvânt' : 'cuvinte'} de repetat azi.</p>
              <button className="btn" onClick={() => { setResult(null); setRound((x) => x + 1); }}>
                Continuă ({Math.min(30, due.length)})
              </button>
              <button className="btn ghost" onClick={() => go('')}>Gata pentru azi</button>
            </>
          ) : (
            <button className="btn" onClick={() => go('')}>Înapoi acasă</button>
          )}
        </div>
      </div>
    );

  return (
    <div className="page">
      <div className="bubble-row">
        <Bruno mood={due.length ? 'think' : 'happy'} size={80} />
        <div className="bubble">{due.length ? 'Hai să repetăm! Câteva minute pe zi și nu mai uiți nimic.' : all.length ? 'Super, ești la zi! Mâine revin alte cuvinte.' : 'Fă prima lecție și apoi ne vedem aici.'}</div>
      </div>
      <h1>Recapitulare</h1>
      <p className="muted">Repetiția spațiată: fiecare cuvânt revine exact când ești pe cale să-l uiți — după 1 zi, 3 zile, o săptămână, apoi tot mai rar. 10 minute pe zi fac minuni.</p>
      <div className="card review-card">
        <div className="big-num">{due.length}</div>
        <p>{due.length === 1 ? 'cuvânt de repetat azi' : 'cuvinte de repetat azi'}</p>
        {due.length > 0 ? (
          <>
            <button className="btn" onClick={() => setMode('due')}>Începe ({Math.min(30, due.length)})</button>
            {due.length > 30 && <p className="muted small">Se repetă în reprize de câte 30 de cuvinte.</p>}
          </>
        ) : all.length ? (
          <p className="ok-text">✓ Ești la zi!</p>
        ) : (
          <p className="muted">Fă prima lecție ca să apară cuvinte aici.</p>
        )}
        {all.length >= 4 && (
          <button className="btn ghost" onClick={() => setMode('extra')}>Exersează oricum (15 cuvinte la întâmplare)</button>
        )}
      </div>
      <p className="muted small">Total cuvinte în recapitulare: {all.length}</p>
    </div>
  );
}
