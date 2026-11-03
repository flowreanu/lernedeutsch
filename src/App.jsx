import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
import Chat from './pages/Chat.jsx';
import InviteWatcher from './components/InviteWatcher.jsx';
import { SocialProvider, useSocial } from './lib/social.jsx';
import { go, isLeft } from './lib/nav.js';

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

const ICONS = {
  joc: 'M7 9h2m-1-1v2m7 0h.01M17 8h.01M6 5h12a4 4 0 0 1 4 4v5a4 4 0 0 1-7 2.6L14 15h-4l-1 1.6A4 4 0 0 1 2 14V9a4 4 0 0 1 4-4z',
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  repeat: 'M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15m0 5v-5h5',
  chat: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5zM8 8.5h8M8 11.5h5',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3 3 0 1 0 0-6M2 21v-1a6 6 0 0 1 12 0v1m3-7a5 5 0 0 1 5 5v2',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-8 10a8 8 0 0 1 16 0',
};
const NAV = [
  { key: 'joc', label: 'Joc', icon: 'joc' },
  { key: '', label: 'Acasă', icon: 'home' },
  { key: 'chat', label: 'Chat', icon: 'chat' },
  { key: 'recapitulare', label: 'Repetă', icon: 'repeat' },
  { key: 'colegi', label: 'Colegi', icon: 'people' },
  { key: 'profil', label: 'Profil', icon: 'user' },
];

function BottomNav({ page }) {
  const social = useSocial();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto max-w-[600px] flex justify-around rounded-[22px] border border-white/10 bg-[#121722]/80 backdrop-blur-xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,.8)] px-1 py-1.5">
        {NAV.map((n) => {
          const active = (page || '') === n.key;
          return (
            <a key={n.key} href={'#/' + n.key} className="relative flex-1 no-underline">
              {active && (
                <motion.span layoutId="navpill" className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#f5c443]/20 to-[#ef4b3f]/10 border border-[#f5c443]/40 shadow-[0_0_20px_rgba(245,196,67,.25)]" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
              )}
              <motion.span whileTap={{ scale: 0.85 }} className={'relative flex flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-extrabold ' + (active ? 'text-[#f5c443]' : 'text-white/45')}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS[n.icon]} />
                </svg>
                {n.label}
                {n.key === 'chat' && social?.badge > 0 && (
                  <motion.span key={social.badge} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-[18%] top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#ef4b3f] px-1 text-[10px] font-black text-white shadow-red">
                    {social.badge}
                  </motion.span>
                )}
              </motion.span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

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

  // Cât timp sunt la o masă (lobby sau joc), aplicația mă ține în joc; chatul e în panoul din joc.
  const [lock, setLock] = useState(null);
  const routeKey = route.parts.join('/');
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    const check = () =>
      api
        .myActiveGame()
        .then((g) => alive && setLock(g && !isLeft(g.id) ? g : null))
        .catch(() => {});
    check();
    const iv = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [profile?.id, routeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!lock) return;
    if (isLeft(lock.id)) return setLock(null);
    if (!(route.parts[0] === 'joc' && route.parts[1] === lock.id)) go('joc/' + lock.id);
  }, [lock, routeKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (profile.banned)
    return (
      <div className="splash">
        <div className="card narrow text-center">
          <div className="text-5xl">⛔</div>
          <h2>Contul tău a fost suspendat</h2>
          <p className="muted">Un administrator ți-a restricționat accesul. Dacă e o greșeală, contactează adminul.</p>
          <button className="btn ghost" onClick={() => api.auth.signOut()}>Ieși din cont</button>
        </div>
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
    case 'chat':
      body = <Chat {...ctx} />;
      break;
    case 'profil':
      body = <Profile {...ctx} />;
      break;
    default:
      body = <Home {...ctx} />;
  }

  return (
    <SocialProvider profile={profile}>
    <div className={'app' + (fullscreen ? ' fullscreen' : '')}>
      {isDemo && !fullscreen && (
        <div className="demo-banner">Mod demo — progresul se salvează doar în acest browser.</div>
      )}
      <InviteWatcher profile={profile} />
      <main className="main">{body}</main>
      {!fullscreen && <BottomNav page={page} />}
    </div>
    </SocialProvider>
  );
}
