// Un singur "backend" cu două implementări:
//  - Supabase (real): conturi, progres sincronizat, colegi, joc în timp real
//  - Demo (local): totul în browser, util pentru încercare fără configurare
import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isDemo = import.meta.env.VITE_FORCE_DEMO === '1' || !URL_ || !KEY;

export const todayStr = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const yesterdayStr = () => todayStr(new Date(Date.now() - 86400000));
export const randomCode = (n = 6) => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
};
function nextStreak(p) {
  const t = todayStr();
  if (p.last_active === t) return p.streak || 1;
  if (p.last_active === yesterdayStr()) return (p.streak || 0) + 1;
  return 1;
}

// ------------------------------------------------------------------ Supabase
function makeSupabase() {
  const sb = createClient(URL_, KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
  const uid = async () => (await sb.auth.getUser()).data.user?.id;
  const must = ({ data, error }) => {
    if (error) throw error;
    return data;
  };

  return {
    isDemo: false,
    auth: {
      async getUser() {
        const { data } = await sb.auth.getSession();
        return data.session?.user ?? null;
      },
      onChange(cb) {
        const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null));
        return () => data.subscription.unsubscribe();
      },
      async signUp(email, password, name) {
        const data = must(
          await sb.auth.signUp({
            email,
            password,
            options: { data: { display_name: name }, emailRedirectTo: window.location.origin },
          })
        );
        return { needsConfirm: !data.session };
      },
      async signIn(email, password) {
        must(await sb.auth.signInWithPassword({ email, password }));
      },
      async google() {
        must(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }));
      },
      async resetPassword(email) {
        must(await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }));
      },
      async signOut() {
        await sb.auth.signOut();
      },
    },
    async getProfile() {
      const id = await uid();
      let p = must(await sb.from('profiles').select('*').eq('id', id).maybeSingle());
      if (!p) p = must(await sb.from('profiles').insert({ id }).select().single());
      return p;
    },
    async updateProfile(patch) {
      const id = await uid();
      return must(await sb.from('profiles').update(patch).eq('id', id).select().single());
    },
    async addXp(amount) {
      const p = await this.getProfile();
      return this.updateProfile({ xp: p.xp + amount, streak: nextStreak(p), last_active: todayStr() });
    },
    async getProgress() {
      const rows = must(await sb.from('lesson_progress').select('lesson_id,score'));
      return Object.fromEntries(rows.map((r) => [r.lesson_id, r.score]));
    },
    async saveLesson(lesson_id, score) {
      const user_id = await uid();
      must(await sb.from('lesson_progress').upsert({ user_id, lesson_id, score, completed_at: new Date().toISOString() }));
    },
    async getCards() {
      const rows = must(await sb.from('srs_cards').select('word_id,ease,interval_days,reps,due'));
      return Object.fromEntries(rows.map((r) => [r.word_id, r]));
    },
    async saveCards(cards) {
      if (!cards.length) return;
      const user_id = await uid();
      must(await sb.from('srs_cards').upsert(cards.map((c) => ({ ...c, user_id }))));
    },
    async leaderboard(limit = 50) {
      return must(
        await sb
          .from('profiles')
          .select('id,display_name,xp,streak,game_points,games_won,last_active')
          .order('xp', { ascending: false })
          .limit(limit)
      );
    },
    async myGroups() {
      const id = await uid();
      const rows = must(await sb.from('group_members').select('groups(id,name,code,owner)').eq('user_id', id));
      return rows.map((r) => r.groups).filter(Boolean);
    },
    async createGroup(name) {
      const owner = await uid();
      const g = must(await sb.from('groups').insert({ name, code: randomCode(6), owner }).select().single());
      must(await sb.from('group_members').insert({ group_id: g.id, user_id: owner }));
      return g;
    },
    async joinGroup(code) {
      const user_id = await uid();
      const g = must(await sb.from('groups').select('*').eq('code', code.trim().toUpperCase()).maybeSingle());
      if (!g) throw new Error('Nu există niciun grup cu acest cod.');
      const { error } = await sb.from('group_members').insert({ group_id: g.id, user_id });
      if (error && error.code !== '23505') throw error;
      return g;
    },
    async leaveGroup(group_id) {
      const user_id = await uid();
      must(await sb.from('group_members').delete().eq('group_id', group_id).eq('user_id', user_id));
    },
    async groupMembers(group_id) {
      const rows = must(
        await sb
          .from('group_members')
          .select('profiles(id,display_name,xp,streak,game_points,games_won,last_active)')
          .eq('group_id', group_id)
      );
      return rows.map((r) => r.profiles).filter(Boolean);
    },
    // ---- joc
    async createGame(state) {
      const host = await uid();
      return must(await sb.from('games').insert({ host, code: randomCode(5), state }).select().single());
    },
    async findGame(code) {
      return must(await sb.from('games').select('*').eq('code', code.trim().toUpperCase()).maybeSingle());
    },
    async getGame(id) {
      return must(await sb.from('games').select('*').eq('id', id).maybeSingle());
    },
    async updateGame(id, state) {
      must(await sb.from('games').update({ state, updated_at: new Date().toISOString() }).eq('id', id));
    },
    async sendMove(game_id, move) {
      const user_id = await uid();
      must(await sb.from('game_moves').insert({ game_id, user_id, move }));
    },
    async movesSince(game_id, afterId) {
      return must(
        await sb.from('game_moves').select('id,user_id,move').eq('game_id', game_id).gt('id', afterId).order('id')
      );
    },
    subscribeGame(game_id, { onState, onMove }) {
      const ch = sb
        .channel('game-' + game_id)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game_id}` }, (p) =>
          onState?.(p.new.state)
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'game_moves', filter: `game_id=eq.${game_id}` },
          (p) => onMove?.(p.new)
        )
        .subscribe();
      return () => sb.removeChannel(ch);
    },
    async recordResult(game_id) {
      must(await sb.rpc('record_game_result', { p_game: game_id }));
    },
  };
}

// ------------------------------------------------------------------ Demo (local)
function makeDemo() {
  const LS = 'germana-demo-';
  const get = (k, d) => {
    try {
      const v = localStorage.getItem(LS + k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  };
  const set = (k, v) => {
    try {
      localStorage.setItem(LS + k, JSON.stringify(v));
    } catch {}
  };
  let listeners = [];
  const emit = () => listeners.forEach((f) => f(get('user', null)));
  const games = {};
  const gameSubs = {};
  let moveId = 0;

  const FAKE = [
    { id: 'f1', display_name: 'Ana (exemplu)', xp: 420, streak: 5, game_points: 1900, games_won: 2 },
    { id: 'f2', display_name: 'Mihai (exemplu)', xp: 260, streak: 2, game_points: 1200, games_won: 1 },
    { id: 'f3', display_name: 'Ioana (exemplu)', xp: 90, streak: 1, game_points: 0, games_won: 0 },
  ];

  return {
    isDemo: true,
    auth: {
      async getUser() {
        return get('user', null);
      },
      onChange(cb) {
        listeners.push(cb);
        return () => (listeners = listeners.filter((f) => f !== cb));
      },
      async signUp(email, _p, name) {
        set('user', { id: 'me', email });
        if (!get('profile', null)) set('profile', { id: 'me', display_name: name || 'Eu', xp: 0, streak: 0, game_points: 0, games_played: 0, games_won: 0 });
        emit();
        return { needsConfirm: false };
      },
      async signIn(email) {
        return this.signUp(email, '', email.split('@')[0]);
      },
      async google() {
        return this.signUp('demo@gmail.com', '', 'Utilizator Google');
      },
      async resetPassword() {},
      async signOut() {
        set('user', null);
        emit();
      },
    },
    async getProfile() {
      return get('profile', { id: 'me', display_name: 'Eu', xp: 0, streak: 0, game_points: 0, games_played: 0, games_won: 0 });
    },
    async updateProfile(patch) {
      const p = { ...(await this.getProfile()), ...patch };
      set('profile', p);
      return p;
    },
    async addXp(amount) {
      const p = await this.getProfile();
      return this.updateProfile({ xp: p.xp + amount, streak: nextStreak(p), last_active: todayStr() });
    },
    async getProgress() {
      return get('progress', {});
    },
    async saveLesson(id, score) {
      set('progress', { ...get('progress', {}), [id]: Math.max(score, get('progress', {})[id] || 0) });
    },
    async getCards() {
      return get('cards', {});
    },
    async saveCards(cards) {
      const all = get('cards', {});
      cards.forEach((c) => (all[c.word_id] = c));
      set('cards', all);
    },
    async leaderboard() {
      const me = await this.getProfile();
      return [...FAKE, me].sort((a, b) => b.xp - a.xp);
    },
    async myGroups() {
      return get('groups', []);
    },
    async createGroup(name) {
      const g = { id: randomCode(8), name, code: randomCode(6), owner: 'me' };
      set('groups', [...get('groups', []), g]);
      return g;
    },
    async joinGroup() {
      throw new Error('În modul demo nu există alți utilizatori. Creează un grup ca să vezi cum arată.');
    },
    async leaveGroup(id) {
      set('groups', get('groups', []).filter((g) => g.id !== id));
    },
    async groupMembers() {
      const me = await this.getProfile();
      return [...FAKE, me];
    },
    async createGame(state) {
      const g = { id: randomCode(10), code: randomCode(5), host: 'me', state };
      games[g.id] = g;
      return g;
    },
    async findGame(code) {
      return Object.values(games).find((g) => g.code === code.toUpperCase()) || null;
    },
    async getGame(id) {
      return games[id] || null;
    },
    async updateGame(id, state) {
      games[id].state = state;
      (gameSubs[id] || []).forEach((s) => setTimeout(() => s.onState?.(state), 0));
    },
    async sendMove(id, move) {
      const row = { id: ++moveId, user_id: 'me', move };
      (gameSubs[id] || []).forEach((s) => setTimeout(() => s.onMove?.(row), 0));
    },
    async movesSince() {
      return [];
    },
    subscribeGame(id, handlers) {
      gameSubs[id] = [...(gameSubs[id] || []), handlers];
      return () => (gameSubs[id] = gameSubs[id].filter((h) => h !== handlers));
    },
    async recordResult(id) {
      const st = games[id]?.state;
      if (!st || st.status !== 'finished' || games[id].recorded) return;
      games[id].recorded = true;
      const i = st.players.findIndex((p) => p.id === 'me');
      if (i < 0) return;
      const best = Math.max(...st.scores);
      const p = await this.getProfile();
      await this.updateProfile({
        game_points: (p.game_points || 0) + st.scores[i],
        games_played: (p.games_played || 0) + 1,
        games_won: (p.games_won || 0) + (st.scores[i] === best ? 1 : 0),
      });
    },
  };
}

export const api = isDemo ? makeDemo() : makeSupabase();
