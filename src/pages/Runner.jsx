import React, { useEffect, useMemo, useRef, useState } from 'react';
import { canSpeak, checkTyped, normalize, speak } from '../lib/learn.js';

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
export function SpeakBtn({ text, big }) {
  if (!canSpeak) return null;
  return (
    <button type="button" className={'speak' + (big ? ' big' : '')} onClick={() => speak(text)} aria-label="Ascultă">
      <svg viewBox="0 0 24 24" width={big ? 34 : 20} height={big ? 34 : 20}><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>
    </button>
  );
}
export function Rich({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith('*') ? <i key={i}>{p.slice(1, -1)}</i> : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

function Intro({ word }) {
  useEffect(() => {
    const t = setTimeout(() => speak(word.de), 250);
    return () => clearTimeout(t);
  }, [word]);
  return (
    <div className="intro">
      <p className="kind">Cuvânt nou</p>
      <div className={'intro-word ' + artClass(word.de)}>
        <Word de={word.de} />
        <SpeakBtn text={word.de} />
      </div>
      <p className="intro-ro">{word.ro}</p>
      {word.plural && <p className="plural">Plural: <b>{word.plural}</b></p>}
      <div className="example">
        <div>
          <span>{word.exDe}</span>
          <SpeakBtn text={word.exDe} />
        </div>
        <small>{word.exRo}</small>
      </div>
    </div>
  );
}

function Grammar({ lesson }) {
  return (
    <div className="grammar">
      <p className="kind">Gramatică</p>
      <h2>{lesson.grammar.title}</h2>
      {lesson.grammar.body.map((p, i) =>
        p.startsWith('• ') ? (
          <div key={i} className="bullet"><Rich text={p.slice(2)} /></div>
        ) : (
          <p key={i}><Rich text={p} /></p>
        )
      )}
    </div>
  );
}

function MC({ step, onAnswer, locked, chosen }) {
  useEffect(() => {
    if (step.type === 'listen') {
      const t = setTimeout(() => speak(step.speak), 300);
      return () => clearTimeout(t);
    }
  }, [step]);
  return (
    <div className="mc">
      <p className="kind">{step.kind}</p>
      {step.type === 'listen' ? (
        <div className="listen-box">
          <SpeakBtn text={step.speak} big />
          <button type="button" className="link small" onClick={() => speak(step.speak, 0.6)}>🐢 mai încet</button>
        </div>
      ) : (
        <div className="prompt">
          <span>{step.prompt}</span>
          {step.speak && <SpeakBtn text={step.speak} />}
        </div>
      )}
      {step.sub && <p className="sub">„{step.sub}”</p>}
      <div className={'options' + (step.articleColors ? ' articles' : '')}>
        {step.options.map((o, i) => {
          let cls = 'opt';
          if (step.articleColors) cls += ' art-' + o;
          if (locked) {
            if (i === step.answer) cls += ' right';
            else if (i === chosen) cls += ' wrong';
          }
          return (
            <button key={i} className={cls} disabled={locked} onClick={() => onAnswer(i === step.answer, i)}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TypeEx({ step, onAnswer, locked }) {
  const [v, setV] = useState('');
  const ref = useRef();
  useEffect(() => {
    setV('');
    ref.current?.focus();
  }, [step]);
  const add = (ch) => {
    setV((x) => x + ch);
    ref.current?.focus();
  };
  const submit = (e) => {
    e.preventDefault();
    if (!v.trim() || locked) return;
    const r = checkTyped(v, step.word);
    const note = {
      article: `Corect! Data viitoare scrie și articolul: ${step.word.de}`,
      typo: `Aproape! O mică greșeală de scriere: ${step.word.de}`,
      wrongArticle: `Cuvântul e bun, dar articolul e altul: ${step.word.de}`,
    }[r];
    onAnswer(r === 'ok' || r === 'article' || r === 'typo', null, note);
  };
  return (
    <form className="type" onSubmit={submit}>
      <p className="kind">{step.kind}</p>
      <div className="prompt"><span>{step.prompt}</span></div>
      <input ref={ref} value={v} onChange={(e) => setV(e.target.value)} disabled={locked} placeholder="Scrie aici…" autoCapitalize="off" autoCorrect="off" spellCheck="false" />
      <div className="umlauts">
        {['ä', 'ö', 'ü', 'ß'].map((c) => (
          <button type="button" key={c} onClick={() => add(c)} disabled={locked}>{c}</button>
        ))}
      </div>
      {!locked && <button className="btn" disabled={!v.trim()}>Verifică</button>}
    </form>
  );
}

function Order({ step, onAnswer, locked }) {
  const [picked, setPicked] = useState([]);
  useEffect(() => setPicked([]), [step]);
  const sentence = picked.map((i) => step.tokens.find((t) => t.i === i).t).join(' ');
  return (
    <div className="order">
      <p className="kind">{step.kind}</p>
      <div className="prompt small"><span>{step.prompt}</span></div>
      <div className="answer-line">
        {picked.map((i) => (
          <button key={i} className="tok" disabled={locked} onClick={() => setPicked(picked.filter((x) => x !== i))}>
            {step.tokens.find((t) => t.i === i).t}
          </button>
        ))}
      </div>
      <div className="bank">
        {step.tokens.map((t) => (
          <button key={t.i} className={'tok' + (picked.includes(t.i) ? ' used' : '')} disabled={locked || picked.includes(t.i)} onClick={() => setPicked([...picked, t.i])}>
            {t.t}
          </button>
        ))}
      </div>
      {!locked && (
        <button className="btn" disabled={picked.length !== step.tokens.length} onClick={() => onAnswer(normalize(sentence) === normalize(step.answer))}>
          Verifică
        </button>
      )}
    </div>
  );
}

function correctText(step) {
  if (step.type === 'type') return step.word.de;
  if (step.type === 'order') return step.answer;
  if (step.options) return step.speakAnswer && step.articleColors ? step.speakAnswer : step.options[step.answer];
  return '';
}

// Rulează o listă de pași (exerciții). Greșelile revin la final, o dată.
export default function Runner({ steps: initial, title, onExit, onFinish, onStepResult }) {
  const [queue, setQueue] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [fb, setFb] = useState(null);
  const [chosen, setChosen] = useState(null);
  const stats = useRef({ first: 0, firstOk: 0, seen: new Set(), words: {} });
  const step = queue[idx];
  const gradable = useMemo(() => initial.filter((s) => s.type !== 'intro' && s.type !== 'grammar').length, [initial]);

  function answer(ok, choice = null, note) {
    if (fb) return;
    setChosen(choice);
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
    if (ok && (step.speakAnswer || step.type === 'order')) speak(step.speakAnswer || step.answer);
    if (!ok && (step.retry || 0) < 2) setQueue((q) => [...q, { ...step, retry: (step.retry || 0) + 1, orig: step.orig || step }]);
    setFb({ ok, text: correctText(step), note });
  }
  function next() {
    setFb(null);
    setChosen(null);
    if (idx + 1 >= queue.length) {
      const st = stats.current;
      onFinish({ score: st.first ? Math.round((st.firstOk / st.first) * 100) : 100, correct: st.firstOk, total: st.first, words: st.words });
    } else setIdx(idx + 1);
  }

  if (!step) return null;
  const done = stats.current.first;
  const pct = Math.min(100, Math.round(((idx + (fb ? 1 : 0)) / queue.length) * 100));
  const passive = step.type === 'intro' || step.type === 'grammar';

  return (
    <div className="runner">
      <div className="runner-top">
        <button className="x" onClick={onExit} aria-label="Închide">✕</button>
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
        <span className="count">{done}/{gradable}</span>
      </div>
      {title && <p className="runner-title">{title}</p>}
      <div className="runner-body" key={idx}>
        {step.retry && <p className="retry">↺ Încă o dată</p>}
        {step.type === 'intro' && <Intro word={step.word} />}
        {step.type === 'grammar' && <Grammar lesson={step.lesson} />}
        {(step.type === 'mc' || step.type === 'listen') && <MC step={step} onAnswer={answer} locked={!!fb} chosen={chosen} />}
        {step.type === 'type' && <TypeEx step={step} onAnswer={answer} locked={!!fb} />}
        {step.type === 'order' && <Order step={step} onAnswer={answer} locked={!!fb} />}
      </div>
      <div className={'runner-foot' + (fb ? (fb.ok ? ' ok' : ' bad') : '')}>
        {fb && (
          <div className="fb">
            <b>{fb.ok ? (fb.note ? 'Bine!' : ['Super!', 'Richtig!', 'Corect!', 'Sehr gut!'][Math.floor(Math.random() * 4)]) : 'Răspunsul corect:'}</b>
            {(!fb.ok || fb.note) && <span>{fb.note || <Word de={fb.text} />}</span>}
          </div>
        )}
        {passive ? (
          <button className="btn" onClick={next}>{step.type === 'intro' ? 'Am înțeles' : 'Continuă'}</button>
        ) : (
          fb && <button className="btn" onClick={next} autoFocus>Continuă</button>
        )}
      </div>
    </div>
  );
}
