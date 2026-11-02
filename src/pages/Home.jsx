import React from 'react';
import { LESSONS, LESSON_BY_ID, LEVELS } from '../data/lessons.js';
import { dueCards } from '../lib/learn.js';
import { todayStr } from '../lib/backend.js';
import { go } from '../lib/nav.js';

export default function Home({ profile, progress, cards }) {
  const due = dueCards(cards).length;
  const next = LESSONS.find((l) => progress[l.id] === undefined);
  const done = LESSONS.filter((l) => progress[l.id] !== undefined).length;
  const learnedWords = Object.keys(cards).length;
  const activeToday = profile.last_active === todayStr();
  const hour = new Date().getHours();
  const hello = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <div className="page">
      <header className="home-head">
        <div>
          <p className="eyebrow">{hello},</p>
          <h1>{profile.display_name}</h1>
        </div>
        <div className={'streak' + (activeToday ? ' lit' : '')} title="Zile consecutive">
          <span>🔥</span>
          <b>{profile.streak || 0}</b>
        </div>
      </header>

      <div className="stats">
        <div><b>{profile.xp}</b><span>XP</span></div>
        <div><b>{done}/{LESSONS.length}</b><span>lecții</span></div>
        <div><b>{learnedWords}</b><span>cuvinte</span></div>
      </div>

      <section className="today">
        <h2>Planul de azi</h2>
        <button className={'task' + (due === 0 ? ' done' : '')} onClick={() => go('recapitulare')}>
          <span className="num">1</span>
          <span className="t">
            <b>Recapitulare</b>
            <small>{due ? `${due} cuvinte de repetat · ~${Math.max(3, Math.round(due * 0.25))} min` : learnedWords ? 'Nimic de repetat azi ✓' : 'Apare după prima lecție'}</small>
          </span>
          <span className="arr">›</span>
        </button>
        {next ? (
          <button className="task primary" onClick={() => go('lectie/' + next.id)}>
            <span className="num">2</span>
            <span className="t">
              <b>Lecția {next.number}: {next.title}</b>
              <small>{next.goal} · ~20 min</small>
            </span>
            <span className="arr">›</span>
          </button>
        ) : (
          <div className="task done"><span className="num">2</span><span className="t"><b>Ai terminat toate lecțiile A1!</b><small>Continuă cu recapitularea și jocul. Urmează A2.</small></span></div>
        )}
        <button className="task" onClick={() => go('joc')}>
          <span className="num">3</span>
          <span className="t">
            <b>Bonus: Cucerește Germania</b>
            <small>Joc cu 2 colegi · ~10 min</small>
          </span>
          <span className="arr">›</span>
        </button>
      </section>

      {LEVELS.map((lv) => (
        <section key={lv.id} className="level">
          <h2>{lv.title}</h2>
          <div className="lesson-list">
            {lv.lessons.map((id) => {
              const l = LESSON_BY_ID[id];
              const sc = progress[id];
              const isNext = next?.id === id;
              return (
                <button key={id} className={'lesson-item' + (sc !== undefined ? ' done' : '') + (isNext ? ' next' : '')} onClick={() => go('lectie/' + id)}>
                  <span className="badge">{sc !== undefined ? '✓' : l.number}</span>
                  <span className="t">
                    <b>{l.title}</b>
                    <small>{sc !== undefined ? `Scor ${sc}% · repetă oricând` : `${l.words.length} cuvinte · ${l.grammar.title}`}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <section className="level">
        <h2>A2 — în curând</h2>
        <p className="muted">Perfect, dativ, prepoziții, la doctor, la Ausländerbehörde… Se adaugă după A1.</p>
      </section>
      <button className="btn ghost wide" onClick={() => go('vocabular')}>📖 Vocabularul meu</button>
    </div>
  );
}
