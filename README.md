# Atlas

A private record of a life. Aurora noir aesthetic, Supabase-backed, passkey auth.

## Setup (one-time)

### 1. Create Supabase project
- Go to https://supabase.com → new project.
- Note your project URL and anon key.

### 2. Run the schema
- Open the Supabase SQL Editor.
- Paste the contents of `SCHEMA.sql` and run it.
- This creates every table and locks them all to `auth.uid()` via RLS.

### 3. Fill in `config.js`
```js
export const CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",
  OWNER_EMAIL: "tanim97@proton.me"  // only this email can ever sign in
};
```

The anon key is safe in the browser — RLS + the `OWNER_EMAIL` allowlist mean no one else can read or write your data.

### 4. Deploy to GitHub Pages
- Put everything (including `.nojekyll`) in `tanim-mse.github.io/atlas/` or a standalone repo.
- The `.nojekyll` file is required — it stops GitHub from stripping the `_` directories and lets ES modules load.

### 5. First sign-in
1. Open the site → click **First time** tab → enter your email + password (min 8 chars).
2. Confirm via the email Supabase sends.
3. Come back, sign in normally.
4. Once signed in, you'll see a tip to enroll a passkey. Do it once — next time it's one tap.

## Auth model

- **Email + password** — traditional, works everywhere.
- **Passkey** — enrolled via Supabase's WebAuthn MFA. Next sign-ins are biometric / device-local. Still requires a brief session to challenge against; if your session expired, sign in with password once, then passkey works again.
- **Session** — persisted in `localStorage`, auto-refreshed. You stay signed in ~30 days on a device.
- **Owner allowlist** — `OWNER_EMAIL` in config gates every sign-in at the client. Combined with RLS at the database, only you can ever access data.

## Structure

```
atlas/
  index.html           shell + boot + auth screens
  style.css            aurora noir
  config.js            YOUR secrets
  supabase-client.js   sb client + auth helpers (passkey via MFA)
  util.js              DOM/date/toast/modal helpers
  app.js               boot flow + router
  view-today.js        dashboard
  view-journal.js      rich journal with autosave
  view-habits.js       habits with streaks + week grid
  view-mood.js         mood/energy chart over time
  view-goals.js        goals with progress + milestones
  view-tables.js       media, gaming, edits, finance, health
  SCHEMA.sql           run once in Supabase
  .nojekyll            GitHub Pages ES-module fix
```

## Security notes

- All tables have RLS enabled with `owner_all` policy: `auth.uid() = user_id`.
- The anon key in `config.js` is public by design — all access is gated by RLS.
- Setting `OWNER_EMAIL` gives a client-side allowlist too, so even if someone tries to sign up on your instance, they're bounced.
- `meta name="robots" content="noindex, nofollow"` keeps Atlas out of search engines.

## Keyboard

- In the journal: type and it autosaves every 700ms.
- Right-click a habit card to edit/archive it.
- Click any row in Media / Gaming / Edits / Finance / Health to edit.
