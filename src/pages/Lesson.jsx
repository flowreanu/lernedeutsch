import React, { useMemo, useState } from 'react';
import { LESSON_BY_ID, LESSONS } from '../data/lessons.js';
import { buildLesson, grade, newCard } from '../lib/learn.js';
import { api } from '../lib/backend.js';
import { go } from '../lib/nav.js';
import Runner from './Runner.jsx';
import Bruno from '../components/Bruno.jsx';
import { confetti, sfx } from '../lib/fx.js';

export default function Lesson({ lessonId, cards, refresh }) {
  const lesson = LESSON_BY_ID[lessonId];
  const steps = useMemo(() => (lesson ? buildLesson(lesson) : []), [lesson]);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  if (!lesson) return <div className="page"><p>Lecția nu există.</p><a href="#/">Înapoi</a></div>;

  async function finish(r) {
    setResult(r);
    sfx.finish();
    if (r.score >= 60) confetti();
    setSaving(true);
    try {
      const updated = lesson.words.map((w) => {
        const base = cards[w.id] || newCard(w.id);
        const ok = r.words[w.id] !== false;
        // cuvinte noi: corect → mâine; greșit → tot mâine dar cu ușurință mai mică
        return grade(base, ok);
      });
      const xp = 20 + r.correct;
      await Promise.all([api.saveLesson(lesson.id, r.score), api.saveCards(updated), api.addXp(xp)]);
      r.xp = xp;
      await refresh();
    } catch (e) {
      setSaveErr(e.message);
    }
    setSaving(false);
  }

  if (result) {
    const nextLesson = LESSONS[lesson.number];
    return (
      <div className="page center">
        <div className="done-card">
          <Bruno mood={result.score >= 60 ? 'cheer' : 'happy'} size={130} />
          <h1>Lecția {lesson.number} terminată!</h1>
          <div className="done-stats">
            <div className="stat-tile gold">
              <small>XP câștigat</small>
              <b>⭐ {result.xp ?? 20 + result.correct}</b>
            </div>
            <div className={'stat-tile ' + (result.score >= 80 ? 'green' : result.score >= 50 ? 'red' : 'black')}>
              <small>Precizie</small>
              <b>🎯 {result.score}%</b>
            </div>
          </div>
          <p>{result.correct} din {result.total} corecte din prima încercare</p>
          <p className="muted">Cuvintele noi au intrat în recapitulare. Le vei revedea mâine, apoi la intervale tot mai mari.</p>
          {saving && <p className="muted">Se salvează…</p>}
          {saveErr && <p className="msg bad">Nu s-a putut salva: {saveErr}</p>}
          <div className="col">
            {nextLesson && <button className="btn" onClick={() => go('lectie/' + nextLesson.id)}>Lecția următoare: {nextLesson.title}</button>}
            <button className="btn ghost" onClick={() => go('')}>Înapoi acasă</button>
          </div>
        </div>
      </div>
    );
  }

  return <Runner steps={steps} title={`Lecția ${lesson.number} · ${lesson.title}`} onExit={() => go('')} onFinish={finish} />;
}
