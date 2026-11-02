import React, { useState } from 'react';
import { LESSONS, LESSON_BY_ID, LEVELS } from '../data/lessons.js';
import { dueCards } from '../lib/learn.js';
import { todayStr } from '../lib/backend.js';
import { go } from '../lib/nav.js';
import Bruno from '../components/Bruno.jsx';

const UNIT_STYLE = ['red', 'gold', 'black', 'red'];
const OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52];

function LessonNode({ lesson, state, offset, color, open, onToggle }) {
  const icon = state === 'done' ? '✓' : state === 'next' ? '★' : '★';
  return (
    <div className="node-wrap" style={{ transform: `translateX(${offset}px)` }}>
      {state === 'next' && !open && <div className="start-tip">START</div>}
      <button className={`node ${state} u-${color}`} onClick={onToggle} aria-label={lesson.title}>
        <span className="node-icon">{icon}</span>
        {state === 'next' && <span className="node-ring" />}
      </button>
      {open && (
        <div className={`node-pop u-${color}`}>
          <b>
            {lesson.number}. {lesson.title}
          </b>
          <p>{lesson.goal}</p>
          <button className="btn light" onClick={() => go('lectie/' + lesson.id)}>
            {state === 'done' ? 'Repetă lecția +XP' : 'Începe · +20 XP'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home({ profile, progress, cards }) {
  const due = dueCards(cards).length;
  const next = LESSONS.find((l) => progress[l.id] === undefined);
  const [open, setOpen] = useState(next?.id || null);
  const done = LESSONS.filter((l) => progress[l.id] !== undefined).length;
  const learnedWords = Object.keys(cards).length;
  const activeToday = profile.last_active === todayStr();
  const hour = new Date().getHours();
  const hello = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  const message = !done && !learnedWords
    ? `${hello}, ${profile.display_name}! Eu sunt Bruno. Apasă pe primul cerc și începem!`
    : due
    ? `${hello}! Ai ${due} ${due === 1 ? 'cuvânt' : 'cuvinte'} de repetat. Întâi recapitularea, apoi lecția nouă!`
    : next
    ? `${hello}! Recapitularea e gata. Azi: „${next.title}”. Los geht’s!`
    : 'Ai terminat toate lecțiile. Ich bin stolz auf dich! 🏆';

  return (
    <div className="page home">
      <header className="topbar">
        <span className="flagchip" title="Germană">
          <i />
          <i />
          <i />
        </span>
        <span className={'stat-pill streak' + (activeToday ? ' lit' : '')} title="Zile la rând">
          🔥 <b>{profile.streak || 0}</b>
        </span>
        <span className="stat-pill" title="Experiență">
          ⭐ <b>{profile.xp}</b>
        </span>
        <span className="stat-pill" title="Cuvinte învățate">
          📖 <b>{learnedWords}</b>
        </span>
      </header>

      <div className="bubble-row">
        <Bruno mood={due ? 'think' : next ? 'hello' : 'cheer'} size={92} />
        <div className="bubble">{message}</div>
      </div>

      {learnedWords > 0 && (
        <button className={'review-banner' + (due ? '' : ' calm')} onClick={() => go('recapitulare')}>
          <span className="rb-icon">↻</span>
          <span className="rb-text">
            <b>{due ? 'Recapitularea de azi' : 'Exersează liber'}</b>
            <small>{due ? `${due} cuvinte · ~${Math.max(3, Math.round(due * 0.25))} min` : 'Nimic scadent azi ✓'}</small>
          </span>
          <span className="rb-go">{due ? 'START' : '›'}</span>
        </button>
      )}

      {LEVELS.map((lv, li) => {
        const color = UNIT_STYLE[li % UNIT_STYLE.length];
        const doneHere = lv.lessons.filter((id) => progress[id] !== undefined).length;
        return (
          <section key={lv.id} className="unit">
            <div className={`unit-head u-${color}`}>
              <div>
                <small>
                  Unitatea {li + 1} · {doneHere}/{lv.lessons.length}
                </small>
                <h2>{lv.title.split(' — ')[1] || lv.title}</h2>
                <span className="unit-level">{lv.id}</span>
              </div>
              <button className="unit-guide" onClick={() => go('vocabular')} title="Vocabular">
                📖
              </button>
            </div>
            <div className="path">
              {lv.lessons.map((id, k) => {
                const l = LESSON_BY_ID[id];
                const state = progress[id] !== undefined ? 'done' : next?.id === id ? 'next' : 'todo';
                return (
                  <LessonNode
                    key={id}
                    lesson={l}
                    state={state}
                    color={color}
                    offset={OFFSETS[k % OFFSETS.length]}
                    open={open === id}
                    onToggle={() => setOpen(open === id ? null : id)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <button className="game-banner" onClick={() => go('joc')}>
        <span className="gb-art">🏰</span>
        <span>
          <b>Cucerește Germania</b>
          <small>Joacă cu 2 colegi și cucerește landurile!</small>
        </span>
      </button>
    </div>
  );
}
