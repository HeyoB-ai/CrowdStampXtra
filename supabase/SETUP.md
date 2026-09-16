# Supabase opzetten voor CrowdStampXtra (één demo-account)

Doel: `app.html` laten werken op een nieuw, leeg Supabase-project met één demo-beheerder en drie demo-medewerkers. Geen signup, geen Stripe — de Netlify-functies antwoorden met 503 zolang hun env-variabelen ontbreken en worden door de app niet gebruikt voor inloggen, check-in of urenstaat.

Alle SQL draai je **handmatig** in **Supabase → SQL Editor**, bestand voor bestand, in exact deze volgorde. Elk bestand is idempotent (opnieuw draaien is veilig).

## Stap 0 – Project aanmaken

1. Nieuw project op supabase.com (regio West-EU). Kies een database-wachtwoord en bewaar dat.
2. Noteer uit **Project Settings → API**:
   - **Project URL** → gaat in `app.html` als `SUPABASE_URL`
   - **anon public** key → gaat in `app.html` als `SUPABASE_ANON_KEY`
   - (De `service_role`-key is voor deze demo niet nodig.)
3. **Authentication → Providers → Email**: Email aan; "Confirm email" mag uit (we maken de gebruiker handmatig, bevestigd). Magic link/OTP is niet nodig — de app logt in met e-mail + wachtwoord.
4. **Authentication → URL Configuration**: Site URL = `https://crowdstampxtra.netlify.app`, Redirect URL toevoegen: `https://crowdstampxtra.netlify.app/app` (alleen relevant voor wachtwoord-reset-mails).

## Stap 1 – SQL, in deze volgorde

| # | Bestand | Wat |
|---|---|---|
| 1 | `migrations/000_base_schema.sql` | tabellen `companies`, `profiles`, `registrations`, indexen, `updated_at`-triggers, helper `app_role()`, **RLS aan**, bucket `werkfotos` (privé, 10 MB, image/*) |
| 2 | `migrations/001_company_relationships.sql` | tabel `company_relationships` (Model B) |
| 3 | `migrations/002_registrations_client_company.sql` | kolom `registrations.client_company_id` (bestaat al door 000; blijft idempotent) |
| 4 | `migrations/003_handle_new_user.sql` | trigger op `auth.users`: maakt automatisch een profiel aan |
| 5 | `migrations/004_rls_model_b.sql` | helpers `current_company_id()`, `has_active_relationship()` en alle RLS-policies (de `enable`-regels onderaan blijven uitgecommentarieerd: 000 en 005 doen dat al) |
| 6 | `migrations/005_storage_policies.sql` | upload-/leespolicies op `storage.objects` voor `werkfotos`, RLS aan op `company_relationships`, indexen |

> Na stap 1 (000) staat RLS aan zonder policies: de browser ziet dan nog niets. Dat is verwacht — na 004 is het compleet.

### Verificatie na stap 1 t/m 6

```sql
-- Tabellen + RLS-status (verwacht: 4 rijen, rowsecurity = true)
select relname, relrowsecurity as rls
from pg_class where relnamespace = 'public'::regnamespace
  and relname in ('companies','profiles','registrations','company_relationships')
order by relname;

-- Policies op de tabellen (verwacht: registrations 3, company_relationships 1, companies 1, profiles 1)
select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename, policyname;

-- Helpers aanwezig (verwacht: app_role, current_company_id, has_active_relationship, handle_new_user, set_updated_at)
select proname from pg_proc where pronamespace = 'public'::regnamespace order by proname;

-- Trigger op auth.users (verwacht: on_auth_user_created)
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- Bucket (verwacht: werkfotos, public = false, 10485760, {image/*})
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'werkfotos';

-- Storage-policies (verwacht: werkfotos_insert, werkfotos_select)
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'werkfotos%';
```

## Stap 2 – Demo-gebruiker aanmaken (dashboard)

**Authentication → Users → Add user → Create new user**
- Email: het demo-adres (bijv. `demo@crowdstampxtra.nl` — hoeft niet te bestaan, er wordt niets gemaild)
- Password: zelf kiezen; dit is het wachtwoord om in te loggen op `/app`
- **Auto Confirm User: aan**

Controle: de trigger uit 003 heeft nu een profiel aangemaakt:

```sql
select id, email, role, status, company_id from public.profiles;
-- verwacht: 1 rij, role = worker, status = invited, company_id = null
```

## Stap 3 – Seed draaien

Open `supabase/seed_demo.sql`, vervang `<DEMO_EMAIL>` (één plek, bovenin het `declare`-blok) door het adres uit stap 2 en plak het geheel in de SQL Editor. Het script:

- maakt bedrijf **Demo Bouw BV** (plan `pro`, status `active`, `trial_ends_at` = nu + 1 jaar);
- maakt van jouw gebruiker de **admin** van dat bedrijf (status `active`);
- maakt drie medewerkers aan (Jeroen Bakker, Sander Willems, Marco Visser – onderaannemer) met wachtwoord `DemoWerker2026!`, zodat je ook de check-in-flow als monteur kunt tonen;
- vult **registraties voor de afgelopen twee weken** (werkdagen), met projecten in Woerden/Utrecht/Nieuwegein, GPS-punten, notities, één overwerkdag en vandaag één open check-in.

### Verificatie na de seed

```sql
-- Bedrijf + profielen (verwacht: 4 profielen, 1 admin active, 3 workers active)
select p.full_name, p.email, p.role, p.status, c.name, c.plan, c.status as bedrijf_status
from public.profiles p left join public.companies c on c.id = p.company_id
order by p.role, p.full_name;

-- Registraties (verwacht: ~30 rijen, laatste 14 dagen, één rij zonder check_out_time op vandaag)
select date, full_name, project_name, check_in_time, check_out_time, total_hours
from public.registrations order by date desc, full_name limit 40;

-- Test de RLS-blik van de admin (vervang <ADMIN_UUID> door profiles.id van je admin):
select set_config('request.jwt.claims', json_build_object('sub', '<ADMIN_UUID>', 'role', 'authenticated')::text, true);
set local role authenticated;
select count(*) from public.registrations;         -- verwacht: alle demo-registraties
select app_role(), current_company_id();           -- verwacht: admin, <bedrijf-uuid>
reset role;
```

## Stap 4 – app.html invullen en deployen

Bovenaan `app.html` (blok **CONFIGURATIE**, direct onder `<title>`):

```js
const SUPABASE_URL = 'https://JOUWPROJECT.supabase.co';  // → Project URL
const SUPABASE_ANON_KEY = 'JOUW_ANON_KEY';                 // → anon public key
```

Zolang de placeholders staan, toont het inlogscherm "Supabase is nog niet geconfigureerd". Commit, push naar `origin main`, Netlify deployt.

Inloggen op `https://crowdstampxtra.netlify.app/app`:
- beheerder: het demo-adres + het wachtwoord uit stap 2 → urenstaat, medewerkers, onderaannemers
- monteur: `jeroen.bakker@demobouw.nl` / `DemoWerker2026!` → check-in/uit, foto's, rapportage

## Wat bewust níet werkt in deze opzet

- **Signup, uitnodigen, verwijderen, onderaannemer inschakelen, Stripe**: de Netlify-functies hebben geen env-variabelen en geven 503 (`Tijdelijk niet beschikbaar`). Wil je die wél, zet dan in Netlify `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (en voor Stripe `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_GROWTH_PRICE_ID`, `STRIPE_PRO_PRICE_ID`) en redeploy.
- **Superuser-rol**: `004_rls_model_b.sql` heeft geen superuser-policies; de demo gebruikt alleen admin en worker.
- **Profielen wijzigen vanuit de browser**: er is geen UPDATE-policy op `profiles` of `companies`, dus dat kan alleen via de service role of de SQL Editor (veilig standaardgedrag).

## Opnieuw beginnen

Seed opnieuw draaien vervangt de demo-registraties en zet bedrijf/profielen terug. Alles wissen:

```sql
delete from public.registrations; delete from public.company_relationships;
delete from public.profiles; delete from public.companies;
delete from auth.users;  -- inclusief de demo-gebruiker; daarna stap 2 en 3 opnieuw
```
