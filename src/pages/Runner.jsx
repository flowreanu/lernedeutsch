import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canSpeak, checkTyped, normalize, speak } from '../lib/learn.js';
import { pic } from '../data/pics.js';
import { sfx } from '../lib/fx.js';
import Bruno from '../components/Bruno.jsx';

const artClass = (de) => {
  const m = /^(der|die|das) /.exec(de);
  return m ? 'art-' + m[1] : '';
};
export function Word({ de, className = '' }) {
  const m = /^(der|die|das) (.*)$/.exec(de);
  if (!m) return <span className={className}>{de}</span>;
  return (
    <span className={className}>
      <span className={'art art-' + m[1]}>{m[1]}</span> {m[2]}
    </span>
  );
}
export function SpeakBtn({ text, big, slow, onSpeak }) {
  if (!canSpeak) return null;
  return (
    <button
      type="button"
      className={'speak' + (big ? ' big' : '') + (slow ? ' slow' : '')}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, slow ? 0.6 : 0.9);
        onSpeak?.();
      }}
      aria-label={slow ? 'Ascultă încet' : 'Ascultă'}
    >
      {slow ? (
        <span className="turtle">🐢</span>
      ) : (
        <svg viewBox="0 0 24 24" width={big ? 34 : 20} height={big ? 34 : 20}>
          <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
        </svg>
      )}
    </button>
  );
}
export function Rich({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith('*') ? <i key={i}>{p.slice(1, -1)}</i> : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

const TITLES = {
  'Ce înseamnă?': 'Ce înseamnă acest cuvânt?',
  'Cum se spune în germană?': 'Cum se spune în germană?',
  'Alege articolul': 'Alege articolul corect',
  Gramatică: 'Alege răspunsul corect',
};
const PRAISE = ['Super!', 'Richtig!', 'Sehr gut!', 'Toll!', 'Perfekt!', 'Bravo!', 'Klasse!', 'Genau!'];
const OOPS = ['Hopa!', 'Aproape!', 'Nu-i nimic!', 'Mai încearcă!', 'Ups!'];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

function titleOf(step) {
  if (step.type === 'intro') return 'Cuvânt nou';
  if (step.type === 'grammar') return step.lesson.grammar.title;
  if (step.type === 'listen') return 'Ce ai auzit?';
  if (step.type === 'type') return 'Scrie în germană';
  if (step.type === 'order') return 'Tradu propoziția';
  return TITLES[step.kind] || step.kind;
}

// Ce spune Bruno în balon
function Speech({ step, onSpeak }) {
  if (step.type === 'intro') {
    const w = step.word;
    return (
      <div className="say-word">
        {pic(w.de) && <span className="say-pic">{pic(w.de)}</span>}
        <span className={'say-de ' + artClass(w.de)}>
          <Word de={w.de} />
        </span>
        <SpeakBtn text={w.de} onSpeak={onSpeak} />
      </div>
    );
  }
  if (step.type === 'grammar') return <span>Hai să învățăm o regulă nouă! Citește cu atenție, apoi exersăm. 👇</span>;
  if (step.type === 'listen')
    return (
      <div className="say-listen">
        <SpeakBtn text={step.speak} big onSpeak={onSpeak} />
        <SpeakBtn text={step.speak} slow onSpeak={onSpeak} />
      </div>
    );
  if (step.type === 'type' || step.type === 'order') return <span className="say-ro">{step.prompt}</span>;
  if (step.articleColors)
    return (
      <span className="say-de">
        <span className="blank">___</span> {step.prompt.replace(/^___ /, '')}
        <small className="say-sub">„{step.sub}”</small>
      </span>
    );
  return (
    <span className={step.speak ? 'say-de with-speak' : 'say-q'}>
      {step.speak && <SpeakBtn text={step.speak} onSpeak={onSpeak} />}
      {step.prompt}
    </span>
  );
}

function IntroDetails({ word, onSpeak }) {
  return (
    <div className="intro-details">
      <p className="intro-ro">{word.ro}</p>
      {word.plural && (
        <p className="plural">
          Plural: <b>{word.plural}</b>
        </p>
      )}
      <div className="example">
        <div>
          <span>{word.exDe}</span>
          <SpeakBtn text={word.exDe} onSpeak={onSpeak} />
        </div>
        <small>{word.exRo}</small>
      </div>
      <p className="tip">🗣️ Apasă pe difuzor și repetă cu voce tare.</p>
    </div>
  );
}

function Grammar({ lesson }) {
  return (
    <div className="grammar">
      {lesson.grammar.body.map((p, i) =>
        p.startsWith('• ') ? (
          <div key={i} className="bullet">
            <Rich text={p.slice(2)} />
          </div>
        ) : (
          <p key={i}>
            <Rich text={p} />
          </p>
        )
      )}
    </div>
  );
}

function Options({ step, draft, setDraft, locked }) {
  return (
    <div className={'options' + (step.articleColors ? ' articles' : '')}>
      {step.options.map((o, i) => {
        let cls = 'opt';
        if (step.articleColors) cls += ' art-' + o;
        if (draft === i) cls += ' selected';
        if (locked) {
          if (i === step.answer) cls += ' right';
          else if (i === draft) cls += ' wrong';
        }
        return (
          <button key={i} className={cls} disabled={locked} onClick={() => { sfx.tap(); setDraft(i); }}>
            {!step.articleColors && <span className="num">{i + 1}</span>}
            <span className="otext">{o}</span>
          </button>
        );
      })}
    </div>
  );
}

function TypeBox({ draft, setDraft, locked, onEnter }) {
  const ref = useRef();
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const add = (ch) => {
    setDraft((typeof draft === 'string' ? draft : '') + ch);
    ref.current?.focus();
  };
  return (
    <div className="type">
      <textarea
        ref={ref}
        rows={2}
        value={typeof draft === 'string' ? draft : ''}
        onChange={(e) => setDraft(e.target.value.replace(/\n/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
        disabled={locked}
        placeholder="Scrie în germană…"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
      />
      <div className="umlauts">
        {['ä', 'ö', 'ü', 'ß'].map((c) => (
          <button type="button" key={c} onClick={() => add(c)} disabled={locked}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderBoard({ step, draft, setDraft, locked }) {
  const picked = Array.isArray(draft) ? draft : [];
  const tok = (i) => step.tokens.find((t) => t.i === i).t;
  return (
    <div className="order">
      <div className="answer-lines">
        {picked.map((i) => (
          <button key={i} className="tok" disabled={locked} onClick={() => { sfx.tap(); setDraft(picked.filter((x) => x !== i)); }}>
            {tok(i)}
          </button>
        ))}
      </div>
      <div className="bank">
        {step.tokens.map((t) => (
          <span key={t.i} className="tok-slot">
            <button
              className={'tok' + (picked.includes(t.i) ? ' used' : '')}
              disabled={locked || picked.includes(t.i)}
              onClick={() => { sfx.tap(); setDraft([...picked, t.i]); }}
            >
              {t.t}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function correctText(step) {
  if (step.type === 'type') return step.word.de;
  if (step.type === 'order') return step.answer;
  if (step.options) return step.speakAnswer && step.articleColors ? step.speakAnswer : step.options[step.answer];
  return '';
}

// Rulează o listă de pași. Alegi răspunsul, apoi „Verifică”. Greșelile revin la final (max. 2 ori).
export default function Runner({ steps: initial, title, onExit, onFinish, onStepResult }) {
  const [queue, setQueue] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [fb, setFb] = useState(null);
  const [draft, setDraft] = useState(null);
  const [combo, setCombo] = useState(0);
  const [talking, setTalking] = useState(false);
  const talkTimer = useRef();
  const stats = useRef({ first: 0, firstOk: 0, seen: new Set(), words: {} });
  const step = queue[idx];
  const gradable = useMemo(() => initial.filter((s) => s.type !== 'intro' && s.type !== 'grammar').length, [initial]);
  const passive = step && (step.type === 'intro' || step.type === 'grammar');

  const talk = useCallback((ms = 1300) => {
    clearTimeout(talkTimer.current);
    setTalking(true);
    talkTimer.current = setTimeout(() => setTalking(false), ms);
  }, []);

  useEffect(() => {
    setDraft(null);
    talk(step?.type === 'grammar' ? 1800 : 1200);
    if (step?.type === 'intro') {
      const t = setTimeout(() => speak(step.word.de), 300);
      return () => clearTimeout(t);
    }
    if (step?.type === 'listen') {
      const t = setTimeout(() => speak(step.speak), 350);
      return () => clearTimeout(t);
    }
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const canCheck =
    !!step &&
    !fb &&
    ((step.options && typeof draft === 'number') ||
      (step.type === 'type' && typeof draft === 'string' && !!draft.trim()) ||
      (step.type === 'order' && Array.isArray(draft) && draft.length === step.tokens.length));

  function check() {
    if (!canCheck) return;
    let ok;
    let note;
    if (step.options) ok = draft === step.answer;
    else if (step.type === 'type') {
      const r = checkTyped(draft, step.word);
      ok = r === 'ok' || r === 'article' || r === 'typo';
      note = {
        article: `Corect! Data viitoare scrie și articolul: ${step.word.de}`,
        typo: `Aproape perfect! Atenție la scriere: ${step.word.de}`,
        wrongArticle: `Cuvântul e bun, dar articolul e altul: ${step.word.de}`,
      }[r];
    } else {
      const sentence = draft.map((i) => step.tokens.find((t) => t.i === i).t).join(' ');
      ok = normalize(sentence) === normalize(step.answer);
    }
    const st = stats.current;
    const key = step.orig || step;
    if (!st.seen.has(key)) {
      st.seen.add(key);
      st.first++;
      if (ok) st.firstOk++;
      if (step.wordId && st.words[step.wordId] === undefined) st.words[step.wordId] = ok;
      else if (step.wordId && !ok) st.words[step.wordId] = false;
      onStepResult?.(step, ok);
    }
    const newCombo = ok ? combo + 1 : 0;
    setCombo(newCombo);
    if (ok) sfx.correct();
    else sfx.wrong();
    if (ok && (step.speakAnswer || step.type === 'order')) setTimeout(() => speak(step.speakAnswer || step.answer), 380);
    if (!ok && (step.retry || 0) < 2) setQueue((q) => [...q, { ...step, retry: (step.retry || 0) + 1, orig: step.orig || step }]);
    let tip = null;
    if (!ok && step.articleColors) {
      const art = step.options[step.answer];
      tip = { der: 'der = masculin (albastru)', die: 'die = feminin sau plural (roșu)', das: 'das = neutru (verde)' }[art];
    }
    setFb({
      ok,
      text: correctText(step),
      note,
      tip,
      title: ok ? (newCombo >= 3 && newCombo % 3 === 0 ? `${newCombo} la rând! 🔥` : rnd(PRAISE)) : rnd(OOPS),
    });
    talk(900);
  }

  function next() {
    setFb(null);
    setDraft(null);
    if (idx + 1 >= queue.length) {
      const st = stats.current;
      onFinish({ score: st.first ? Math.round((st.firstOk / st.first) * 100) : 100, correct: st.firstOk, total: st.first, words: st.words });
    } else setIdx(idx + 1);
  }

  // tastatură: 1–4 alege, Enter verifică / continuă
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (fb || passive) next();
        else check();
      } else if (step?.options && !fb && /^[1-9]$/.test(e.key) && +e.key <= step.options.length) {
        setDraft(+e.key - 1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (!step) return null;
  const pct = Math.min(100, Math.round(((idx + (fb ? 1 : 0)) / queue.length) * 100));
  const mood = fb ? (fb.ok ? (combo >= 3 ? 'cheer' : 'happy') : 'sad') : step.type === 'intro' ? 'hello' : step.type === 'grammar' ? 'think' : 'idle';

  return (
    <div className="runner">
      <div className="runner-top">
        <button className="x" onClick={onExit} aria-label="Închide">
          ✕
        </button>
        <div className="bar">
          <i style={{ width: Math.max(4, pct) + '%' }} />
        </div>
        <span className={'combo' + (combo >= 2 ? ' on' : '')} title="Răspunsuri corecte la rând">
          🔥 {combo}
        </span>
      </div>
      {title && <p className="runner-title">{title}</p>}

      <div className="runner-body" key={idx}>
        {step.retry ? <p className="retry">↺ Greșeală de mai devreme — încă o dată</p> : null}
        <h2 className="q-title">{titleOf(step)}</h2>

        <div className="character">
          <div className="char-bruno">
            {fb && <div className={'reaction ' + (fb.ok ? 'ok' : 'bad')}>{fb.title}</div>}
            <Bruno mood={mood} talking={talking && !fb} size={step.type === 'intro' ? 110 : 96} />
          </div>
          <div className="speech">
            <Speech step={step} onSpeak={() => talk(1100)} />
          </div>
        </div>

        {step.type === 'intro' && <IntroDetails word={step.word} onSpeak={() => talk(1500)} />}
        {step.type === 'grammar' && <Grammar lesson={step.lesson} />}
        {step.options && <Options step={step} draft={draft} setDraft={setDraft} locked={!!fb} />}
        {step.type === 'type' && <TypeBox draft={draft} setDraft={setDraft} locked={!!fb} onEnter={() => (fb ? next() : check())} />}
        {step.type === 'order' && <OrderBoard step={step} draft={draft} setDraft={setDraft} locked={!!fb} />}
      </div>

      <div className={'runner-foot' + (fb ? (fb.ok ? ' ok' : ' bad') : '')}>
        <div className="foot-inner">
          {fb && (
            <div className="fb">
              <span className="fb-icon">{fb.ok ? '✓' : '✕'}</span>
              <div className="fb-text">
                <b>{fb.ok ? (fb.note ? 'Bine!' : fb.title) : 'Răspunsul corect:'}</b>
                {(!fb.ok || fb.note) && <span className="fb-answer">{fb.note || <Word de={fb.text} />}</span>}
                {fb.tip && <small className="fb-tip">💡 {fb.tip}</small>}
              </div>
            </div>
          )}
          {passive ? (
            <button className="btn" onClick={next}>
              {step.type === 'intro' ? 'Am înțeles' : 'Continuă'}
            </button>
          ) : fb ? (
            <button className={'btn ' + (fb.ok ? 'green' : 'red')} onClick={next} autoFocus>
              Continuă
            </button>
          ) : (
            <button className="btn" disabled={!canCheck} onClick={check}>
              Verifică
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
