import React, { useState } from 'react';
import { api, isDemo } from '../lib/backend.js';
import Bruno from '../components/Bruno.jsx';

const ERR = {
  'Invalid login credentials': 'E-mail sau parolă greșită.',
  'Email not confirmed': 'Confirmă mai întâi adresa de e-mail (verifică inbox-ul și Spam).',
  'User already registered': 'Există deja un cont cu acest e-mail. Intră în cont.',
};
const tr = (m) => ERR[m] || (m?.includes('Password should be') ? 'Parola trebuie să aibă cel puțin 6 caractere.' : m);

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Scrie-ți numele (îl vor vedea colegii).');
        const r = await api.auth.signUp(email.trim(), pass, name.trim());
        if (r.needsConfirm) setMsg({ ok: true, text: 'Ți-am trimis un e-mail de confirmare. Apasă pe link, apoi intră în cont.' });
      } else if (mode === 'reset') {
        await api.auth.resetPassword(email.trim());
        setMsg({ ok: true, text: 'Dacă adresa există, ai primit un e-mail pentru resetarea parolei.' });
      } else {
        await api.auth.signIn(email.trim(), pass);
      }
    } catch (e2) {
      setMsg({ ok: false, text: tr(e2.message) });
    }
    setBusy(false);
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <Bruno mood="hello" size={120} />
        <h1>Germana pentru începători absoluți</h1>
        <p>De la zero la A2, câte puțin în fiecare zi. Cu lecții în română, recapitulare inteligentă și un joc pe harta Germaniei cu colegii.</p>
      </div>
      <form className="card auth-card" onSubmit={submit}>
        {mode !== 'reset' && (
          <div className="tabs">
            <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Intră în cont</button>
            <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Cont nou</button>
          </div>
        )}
        {mode === 'reset' && <h3>Resetează parola</h3>}
        {mode === 'register' && (
          <label>Numele tău<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Andrei" autoComplete="name" /></label>
        )}
        <label>E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nume@exemplu.ro" autoComplete="email" /></label>
        {mode !== 'reset' && (
          <label>Parolă<input type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="minim 6 caractere" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        )}
        {msg && <div className={'msg ' + (msg.ok ? 'ok' : 'bad')}>{msg.text}</div>}
        <button className="btn" disabled={busy}>
          {busy ? 'Așteaptă…' : mode === 'register' ? 'Creează contul' : mode === 'reset' ? 'Trimite e-mail' : 'Intră'}
        </button>
        {mode !== 'reset' && (
          <>
            <div className="or"><span>sau</span></div>
            <button type="button" className="btn google" onClick={() => api.auth.google().catch((e) => setMsg({ ok: false, text: tr(e.message) }))}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              Continuă cu Google
            </button>
          </>
        )}
        <button type="button" className="link" onClick={() => { setMsg(null); setMode(mode === 'reset' ? 'login' : 'reset'); }}>
          {mode === 'reset' ? '← Înapoi la autentificare' : 'Ai uitat parola?'}
        </button>
        {isDemo && <p className="hint">Mod demo: orice e-mail și parolă funcționează; datele rămân în acest browser.</p>}
      </form>
    </div>
  );
}
