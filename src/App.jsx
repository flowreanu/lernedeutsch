import React, { useCallback, useEffect, useState } from 'react';
import { api, isDemo } from './lib/backend.js';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Lesson from './pages/Lesson.jsx';
import Review from './pages/Review.jsx';
import Vocab from './pages/Vocab.jsx';
import Colleagues from './pages/Colleagues.jsx';
import GameLobby from './pages/GameLobby.jsx';
import Game from './pages/Game.jsx';
import Profile from './pages/Profile.jsx';

function useHashRoute() {
  const parse = () => {
    const h = window.location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs || '') };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const f = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route;
}

const NAV = [
  { key: '', label: 'Acasă', icon: '⌂' },
  { key: 'recapitulare', label: 'Repetă', icon: '↻' },
  { key: 'joc', label: 'Joc', icon: '⚑' },
  { key: 'colegi', label: 'Colegi', icon: '☰' },
  { key: 'profil', label: 'Profil', icon: '◉' },
];

export default function App() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState({});
  const [cards, setCards] = useState({});
  const [err, setErr] = useState(null);
  const route = useHashRoute();

  useEffect(() => {
    api.auth.getUser().then(setUser);
    return api.auth.onChange(setUser);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [p, pr, c] = await Promise.all([api.getProfile(), api.getProgress(), api.getCards()]);
      setProfile(p);
      setProgress(pr);
      setCards(c);
      setErr(null);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else {
      setProfile(null);
      setProgress({});
      setCards({});
    }
  }, [user, refresh]);

  if (user === undefined) return <div className="splash">Se încarcă…</div>;
  if (!user) return <Auth />;
  if (!profile)
    return (
      <div className="splash">
        {err ? (
          <div className="card narrow">
            <p>Nu m-am putut conecta la baza de date:</p>
            <pre className="err">{err}</pre>
            <button className="btn" onClick={refresh}>Încearcă din nou</button>
            <button className="btn ghost" onClick={() => api.auth.signOut()}>Ieși din cont</button>
          </div>
        ) : (
          'Se încarcă profilul…'
        )}
      </div>
    );

  const [page, arg] = route.parts;
  const ctx = { user, profile, progress, cards, refresh, setProfile, query: route.query };
  let body;
  const fullscreen = page === 'lectie' || (page === 'joc' && !!arg);
  switch (page) {
    case 'lectie':
      body = <Lesson {...ctx} lessonId={arg} />;
      break;
    case 'recapitulare':
      body = <Review {...ctx} />;
      break;
    case 'vocabular':
      body = <Vocab {...ctx} />;
      break;
    case 'colegi':
      body = <Colleagues {...ctx} />;
      break;
    case 'joc':
      body = arg ? <Game {...ctx} gameId={arg} /> : <GameLobby {...ctx} />;
      break;
    case 'profil':
      body = <Profile {...ctx} />;
      break;
    default:
      body = <Home {...ctx} />;
  }

  return (
    <div className={'app' + (fullscreen ? ' fullscreen' : '')}>
      {isDemo && !fullscreen && (
        <div className="demo-banner">Mod demo — progresul se salvează doar în acest browser.</div>
      )}
      <main className="main">{body}</main>
      {!fullscreen && (
        <nav className="bottom-nav">
          {NAV.map((n) => (
            <a key={n.key} href={'#/' + n.key} className={(page || '') === n.key ? 'active' : ''}>
              <span className="ico">{n.icon}</span>
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
