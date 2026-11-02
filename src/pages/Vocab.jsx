import React, { useState } from 'react';
import { LESSONS } from '../data/lessons.js';
import { normalize } from '../lib/learn.js';
import { SpeakBtn, Word } from './Runner.jsx';

export default function Vocab({ cards }) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const n = normalize(q);
  return (
    <div className="page">
      <h1>Vocabular</h1>
      <input className="search" placeholder="Caută în germană sau română…" value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Arată și cuvintele din lecțiile neîncepute</label>
      {LESSONS.map((l) => {
        const words = l.words.filter((w) => (all || cards[w.id]) && (!n || normalize(w.de).includes(n) || normalize(w.ro).includes(n)));
        if (!words.length) return null;
        return (
          <section key={l.id} className="vocab-sec">
            <h3>Lecția {l.number} · {l.title}</h3>
            {words.map((w) => (
              <div key={w.id} className="vocab-row">
                <div>
                  <Word de={w.de} className="vde" />
                  {w.plural && <small className="pl"> · pl. {w.plural}</small>}
                  <div className="vro">{w.ro}</div>
                </div>
                <SpeakBtn text={w.de} />
              </div>
            ))}
          </section>
        );
      })}
      {!Object.keys(cards).length && !all && <p className="muted">Încă nu ai cuvinte învățate. Bifează opțiunea de mai sus ca să vezi tot vocabularul A1.</p>}
    </div>
  );
}
