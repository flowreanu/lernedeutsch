import React, { useEffect, useState } from 'react';
import { api, isDemo } from '../lib/backend.js';
import { sfx, setSound, soundOn } from '../lib/fx.js';
import { germanVoices, getVoicePref, ONLINE_VOICE, setVoicePref, speak } from '../lib/learn.js';

function VoicePicker() {
  const [voices, setVoices] = useState([]);
  const [pref, setPref] = useState(getVoicePref());
  useEffect(() => {
    const load = () => setVoices(germanVoices());
    load();
    const t = setTimeout(load, 1000);
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      clearTimeout(t);
      if ('speechSynthesis' in window) speechSynthesis.removeEventListener('voiceschanged', load);
    };
  }, []);
  const choose = (v) => {
    setPref(v);
    setVoicePref(v);
    setTimeout(() => speak('Hallo! Guten Morgen. Ich heiße Anna und ich komme aus Deutschland.'), 50);
  };
  return (
    <div className="card">
      <h3>Vocea germană</h3>
      <p className="muted small">Alege vocea care sună cel mai natural. Apasă pe una ca s-o asculți.</p>
      <div className="voices">
        <button className={'voice' + (pref === '' ? ' on' : '')} onClick={() => choose('')}>
          <b>Automat</b>
          <small>{voices[0] ? voices[0].name : 'voce online'}</small>
        </button>
        {voices.map((v) => (
          <button key={v.name} className={'voice' + (pref === v.name ? ' on' : '')} onClick={() => choose(v.name)}>
            <b>{v.name.replace(/^Microsoft /, '').replace(/ - German.*$/, '')}</b>
            <small>{v.lang}{v.localService ? ' · pe dispozitiv' : ' · online'}</small>
          </button>
        ))}
        <button className={'voice' + (pref === ONLINE_VOICE ? ' on' : '')} onClick={() => choose(ONLINE_VOICE)}>
          <b>Google Translate (online)</b>
          <small>merge pe orice dispozitiv, cere internet</small>
        </button>
      </div>
      {voices.length === 0 && (
        <p className="muted small">Pe acest dispozitiv nu e instalată nicio voce germană, așa că se folosește vocea online. Pe Windows poți adăuga una din Setări → Oră și limbă → Vorbire → Adăugați voci → Deutsch.</p>
      )}
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(soundOn());
  return (
    <div className="card row-between">
      <div>
        <h3>Efecte sonore</h3>
        <p className="muted small">Sunete scurte la răspuns corect/greșit și vibrație pe telefon.</p>
      </div>
      <button className={'switch' + (on ? ' on' : '')} onClick={() => { setSound(!on); setOn(!on); if (!on) setTimeout(sfx.correct, 50); }} aria-label="Efecte sonore">
        <i />
      </button>
    </div>
  );
}

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
      <VoicePicker />
      <SoundToggle />
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
