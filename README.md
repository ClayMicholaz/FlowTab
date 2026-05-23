# FlowTab — Personal Expense Tracker (Starter)

This repo is a starter scaffold for the FlowTab app (Next.js + Supabase).

Quick start

1. Copy `.env.local.example` to `.env.local` and fill with your Supabase project values.
2. Install dependencies:

```bash
npm install
```

3. Run the dev server:

```bash
npm run dev
```

Files created

- `app/` — Next.js App Router entry (`layout.js`, `page.js`)
- `src/lib/supabaseClient.js` — Supabase client helper
- `src/components/AuthForm.js` — Simple email sign-in form (magic link)
- `supabase/migrations/001_init.sql` — DB schema for initial tables

Next steps

- Set up a Supabase project and create the tables using the SQL migration.
- Add your Supabase keys to `.env.local`.
- Run `npm run dev` and open `http://localhost:3000`.
