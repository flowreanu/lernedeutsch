# Germana pentru începători absoluți

Aplicație web (se instalează și pe telefon) pentru germană de la zero, cu:

- **12 lecții A1** în română (vocabular cu audio, gramatică, exerciții), inclusiv termenii de la examenul Goethe „Start Deutsch 1” / telc A1
- **Recapitulare cu repetiție spațiată**: cuvintele revin după 1 zi, 3 zile, o săptămână…
- **Conturi** cu e-mail + parolă sau Google, progres sincronizat între telefon și calculator
- **Grupuri de colegi** cu link de invitație și clasament (XP, puncte la joc, serie de zile)
- **Joc „Cucerește Germania”** pentru 3 jucători în timp real, cu boți pentru locurile goale

Costuri: **0 €** (planurile gratuite Supabase + Vercel ajung pentru zeci/sute de utilizatori).

---

## Pasul 1 — Baza de date (Supabase), ~10 minute

1. Intră pe **supabase.com** → *Start your project* → autentifică-te cu GitHub sau e-mail.
2. *New project* → nume `germana`, o parolă pentru baza de date (păstreaz-o), regiunea **Frankfurt (eu-central-1)** → *Create*.
3. După ce proiectul pornește: meniul din stânga → **SQL Editor** → *New query* → lipește tot conținutul fișierului `supabase/schema.sql` → **Run**. Trebuie să apară „Success”.
4. **Project Settings → API** (sau *Connect*): copiază
   - **Project URL** (ex. `https://abcd1234.supabase.co`)
   - cheia **anon public**

> **Despre e-mailurile de confirmare:** serverul gratuit de e-mail Supabase trimite doar câteva e-mailuri pe oră. Pentru un grup de colegi ai două variante:
> - simplu: **Authentication → Sign In / Providers → Email** → dezactivează **Confirm email** (contul merge imediat);
> - sau: **Authentication → Emails → SMTP Settings** și pui un SMTP propriu (ex. Brevo, gratuit 300 e-mailuri/zi).

### Pasul 1b — Chat și moderare (o singură dată)

**SQL Editor** → *New query* → lipește conținutul fișierului `supabase/update-2-chat-admin.sql` → **Run**.
Contul cu adresa **andreitufaru@proton.me** devine automat **admin** (și dacă îl creezi abia după).
Adminul poate da mute (5/15/30 min), bana și numi moderatori; moderatorii pot da doar mute.

## Pasul 2 — Publicarea online (Vercel), ~10 minute

1. Pune folderul proiectului pe **GitHub** (repo nou → *uploading an existing file* → tragi toate fișierele, **fără** `node_modules`).
2. Pe **vercel.com** → *Add New → Project* → alegi repo-ul → Framework: **Vite** (detectat automat).
3. La **Environment Variables** adaugi:
   - `VITE_SUPABASE_URL` = Project URL de la pasul 1
   - `VITE_SUPABASE_ANON_KEY` = cheia anon public
4. **Deploy**. Primești o adresă de forma `https://germana-xxx.vercel.app`.
5. Înapoi în Supabase: **Authentication → URL Configuration**
   - *Site URL* = adresa Vercel
   - *Redirect URLs* → adaugă adresa Vercel (și `http://localhost:5173` dacă lucrezi local)

## Pasul 3 — Login cu Google (opțional), ~10 minute

1. **console.cloud.google.com** → creează un proiect → *APIs & Services → OAuth consent screen* → *External*, completezi numele aplicației și e-mailul tău → salvezi și apeși **Publish app**.
2. *Credentials → Create credentials → OAuth client ID* → tip **Web application**.
   - *Authorized redirect URIs*: `https://<ID-PROIECT>.supabase.co/auth/v1/callback` (îl găsești gata scris în Supabase la pasul următor)
3. Copiezi **Client ID** și **Client secret**.
4. Supabase → **Authentication → Sign In / Providers → Google** → activezi, lipești cele două valori → *Save*.

## Pe telefon

Deschizi adresa Vercel în Chrome (Android) → meniul ⋮ → **Instalează aplicația**; pe iPhone în Safari → Partajează → **Adaugă pe ecranul principal**.

## Pentru colegi

- **Colegi → Creează grup** → **Invită** trimite un link pe WhatsApp. Cine îl deschide (după ce își face cont) intră direct în grup.
- **Joc → Creează jocul** → trimiți codul sau linkul celorlalți doi. Gazda ține aplicația deschisă (telefonul ei „conduce” jocul). Locurile libere se pot umple cu boți.

## Dezvoltare locală

```bash
npm install
cp .env.example .env      # completezi cu datele Supabase
npm run dev               # http://localhost:5173
npm run build:demo        # versiunea demo într-un singur fișier (dist-demo/index.html), fără server
```

Fără fișierul `.env`, aplicația pornește automat în **mod demo** (date salvate local, joc cu boți).

## Structura

```
src/data/lessons.js     ← tot conținutul lecțiilor (aici adaugi lecții noi / A2)
src/lib/learn.js        ← generare exerciții, verificare, repetiție spațiată, pronunție
src/lib/backend.js      ← Supabase + modul demo
src/game/               ← harta, regulile jocului, boții
src/pages/              ← ecranele aplicației
supabase/schema.sql     ← tabele + securitate (fiecare vede doar progresul lui)
```

**Cum adaugi o lecție:** copiezi un bloc din `lessons.js`, schimbi `id` (ex. `l13`), cuvintele, gramatica și întrebările, apoi adaugi id-ul în `LEVELS`. Exercițiile se generează automat.
