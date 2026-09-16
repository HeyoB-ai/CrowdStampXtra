# CrowdStamp
Field registration app for subcontractors.
- GPS check-in / check-out
- Photo upload
- Comments
- Daily report submission

Built with HTML/CSS/JS. Deployed via Netlify.

## Demo-omgeving (CrowdStampXtra)

Deze repo is de losstaande demo op https://crowdstampxtra.netlify.app, met één demo-account
en zonder signup of Stripe. Supabase inrichten: zie `supabase/SETUP.md` (SQL-volgorde
`migrations/000` t/m `005`, daarna `seed_demo.sql`). Vul daarna `SUPABASE_URL` en
`SUPABASE_ANON_KEY` in bovenaan `app.html`.
