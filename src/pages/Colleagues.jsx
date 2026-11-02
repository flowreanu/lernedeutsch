import React, { useEffect, useState } from 'react';
import { api, isDemo, todayStr } from '../lib/backend.js';

function Board({ rows, me }) {
  const [by, setBy] = useState('xp');
  const sorted = [...rows].sort((a, b) => (b[by] || 0) - (a[by] || 0));
  return (
    <>
      <div className="seg">
        <button className={by === 'xp' ? 'on' : ''} onClick={() => setBy('xp')}>XP lecții</button>
        <button className={by === 'game_points' ? 'on' : ''} onClick={() => setBy('game_points')}>Puncte joc</button>
        <button className={by === 'streak' ? 'on' : ''} onClick={() => setBy('streak')}>Serie zile</button>
      </div>
      <ol className="board">
        {sorted.map((p, i) => (
          <li key={p.id} className={p.id === me ? 'me' : ''}>
            <span className="rank">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
            <span className="nm">
              {p.display_name}
              {p.last_active === todayStr() && <small className="active-dot" title="Activ azi">●</small>}
            </span>
            <span className="val">
              {by === 'xp' && `${p.xp} XP`}
              {by === 'game_points' && `${p.game_points || 0} p · ${p.games_won || 0} 🏆`}
              {by === 'streak' && `${p.streak || 0} 🔥`}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function Colleagues({ profile, query }) {
  const [groups, setGroups] = useState([]);
  const [sel, setSel] = useState(null);
  const [members, setMembers] = useState([]);
  const [global, setGlobal] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState(query.get('cod') || '');
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const g = await api.myGroups();
      setGroups(g);
      setGlobal(await api.leaderboard());
      if (!sel && g.length) setSel(g[0].id);
    } catch (e) {
      setMsg(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (sel) api.groupMembers(sel).then(setMembers).catch((e) => setMsg(e.message));
  }, [sel]);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const g = await api.createGroup(name.trim());
      setName('');
      setSel(g.id);
      load();
    } catch (e2) {
      setMsg(e2.message);
    }
  }
  async function join(e) {
    e.preventDefault();
    try {
      const g = await api.joinGroup(code);
      setCode('');
      setSel(g.id);
      window.location.hash = '#/colegi';
      load();
    } catch (e2) {
      setMsg(e2.message);
    }
  }
  const group = groups.find((g) => g.id === sel);
  const invite = group ? `${location.origin}${location.pathname}#/colegi?cod=${group.code}` : '';
  async function share() {
    const text = `Hai să învățăm germană împreună! Intră în grupul „${group.name}”: ${invite}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Germana pentru începători absoluți', text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  return (
    <div className="page">
      <h1>Colegi</h1>
      {msg && <div className="msg bad" onClick={() => setMsg(null)}>{msg}</div>}

      {query.get('cod') && !groups.some((g) => g.code === query.get('cod')) && (
        <form className="card invite" onSubmit={join}>
          <p>Ai fost invitat într-un grup cu codul <b>{query.get('cod')}</b>.</p>
          <button className="btn">Intră în grup</button>
        </form>
      )}

      {groups.length > 0 && (
        <section>
          <div className="chips">
            {groups.map((g) => (
              <button key={g.id} className={'chip' + (g.id === sel ? ' on' : '')} onClick={() => setSel(g.id)}>{g.name}</button>
            ))}
          </div>
          {group && (
            <div className="card">
              <div className="group-head">
                <div>
                  <h3>{group.name}</h3>
                  <small className="muted">Cod: <b className="code">{group.code}</b> · {members.length} membri</small>
                </div>
                <button className="btn small" onClick={share}>{copied ? 'Copiat ✓' : 'Invită'}</button>
              </div>
              <Board rows={members} me={profile.id} />
              <button className="link small" onClick={async () => { await api.leaveGroup(group.id); setSel(null); load(); }}>Părăsește grupul</button>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h3>{groups.length ? 'Alt grup' : 'Învață împreună cu colegii'}</h3>
        <p className="muted small">Creează un grup (ex. „Echipa de tură”) și trimite colegilor linkul de invitație. Vedeți clasamentul doar între voi.</p>
        <form className="row" onSubmit={create}>
          <input placeholder="Numele grupului" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn">Creează</button>
        </form>
        <form className="row" onSubmit={join}>
          <input placeholder="Cod de invitație" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button className="btn ghost">Intră</button>
        </form>
      </section>

      <section className="card">
        <h3>Clasament general</h3>
        {isDemo && <p className="muted small">În demo apar 3 colegi de exemplu.</p>}
        <Board rows={global} me={profile.id} />
      </section>
    </div>
  );
}
