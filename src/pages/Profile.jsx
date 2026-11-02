import React, { useState } from 'react';
import { api, isDemo } from '../lib/backend.js';

export default function Profile({ profile, setProfile }) {
  const [name, setName] = useState(profile.display_name);
  const [saved, setSaved] = useState(false);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  async function save(e) {
    e.preventDefault();
    const p = await api.updateProfile({ display_name: name.trim() || profile.display_name });
    setProfile(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="page">
      <h1>Profil</h1>
      <form className="card" onSubmit={save}>
        <label>Numele afișat (îl văd colegii)<input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} /></label>
        <button className="btn">{saved ? 'Salvat ✓' : 'Salvează'}</button>
      </form>
      <div className="stats">
        <div><b>{profile.xp}</b><span>XP</span></div>
        <div><b>{profile.streak || 0}</b><span>zile la rând</span></div>
        <div><b>{profile.games_won || 0}/{profile.games_played || 0}</b><span>jocuri câștigate</span></div>
      </div>
      <div className="card">
        <h3>Instalează pe telefon</h3>
        {ios ? (
          <p>În Safari apasă <b>Partajează</b> (pătratul cu săgeată) → <b>Adaugă pe ecranul principal</b>.</p>
        ) : (
          <p>În Chrome apasă meniul <b>⋮</b> → <b>Instalează aplicația</b> (sau „Adaugă pe ecranul de pornire”).</p>
        )}
        <p className="muted small">Aplicația se deschide apoi ca una normală, pe tot ecranul.</p>
      </div>
      <div className="card">
        <h3>Sfaturi pentru 30–60 de minute pe zi</h3>
        <ul className="tips">
          <li>Începe mereu cu <b>recapitularea</b> — 5–10 minute.</li>
          <li>O lecție nouă pe zi e suficient. Dacă ai o oră, refă lecția de ieri sau exersează liber.</li>
          <li>Apasă pe difuzor și <b>repetă cu voce tare</b> fiecare cuvânt.</li>
          <li>Seria de zile contează mai mult decât durata: mai bine 20 de minute zilnic decât 3 ore duminica.</li>
        </ul>
      </div>
      <button className="btn ghost wide" onClick={() => api.auth.signOut()}>Ieși din cont</button>
      {isDemo && <p className="muted small center-text">Versiune demo — fără server.</p>}
    </div>
  );
}
