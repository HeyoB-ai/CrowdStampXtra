-- ============================================================================
-- 000_base_schema.sql — basisschema CrowdStamp
-- ============================================================================
-- Gereconstrueerd uit app.html (supabaseGet/Post/Patch, sb.storage) en
-- netlify/functions/*.js. Idempotent en niet-destructief: veilig om opnieuw te draaien.
--
-- Bevat: companies, profiles, registrations, updated_at-triggers, indexen,
--        RLS AAN (policies staan in 004_rls_model_b.sql), helper app_role(),
--        storage-bucket "werkfotos" (privé). Storage-POLICIES staan in 005.
--
-- Volgorde: zie supabase/SETUP.md. Draai dit als EERSTE, in de Supabase SQL Editor.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ── updated_at-trigger (gedeeld) ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── companies ───────────────────────────────────────────────────────────────
-- Kolommen uit signup.js / engage-contractor.js (insert name, plan, status,
-- trial_ends_at), stripe-webhook.js (stripe_customer_id, plan, status) en
-- app.html (name, plan, status, trial_ends_at, stripe_customer_id, created_at).
create table if not exists public.companies (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  -- trial | starter | growth | groei (legacy alias) | pro — bewust zonder CHECK
  plan               text not null default 'trial',
  -- accountstatus, gezet door superuser/webhook: active | paused | blocked
  status             text not null default 'active',
  trial_ends_at      timestamptz,
  stripe_customer_id text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.companies add column if not exists plan text not null default 'trial';
alter table public.companies add column if not exists status text not null default 'active';
alter table public.companies add column if not exists trial_ends_at timestamptz;
alter table public.companies add column if not exists stripe_customer_id text;
alter table public.companies add column if not exists created_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'companies_status_check') then
    alter table public.companies
      add constraint companies_status_check check (status in ('active', 'paused', 'blocked'));
  end if;
end $$;

create unique index if not exists companies_stripe_customer_id_key
  on public.companies (stripe_customer_id) where stripe_customer_id is not null;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute procedure public.set_updated_at();

-- ── profiles ────────────────────────────────────────────────────────────────
-- 1-op-1 met auth.users. Kolommen uit 003_handle_new_user.sql, invite-member.js,
-- remove-member.js (status invited/active/inactive) en app.html (loadMembers).
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'worker',
  company_id uuid references public.companies (id) on delete set null,
  full_name  text,
  -- medewerker | onderaannemer | service_monteur — NULL voor admins
  functie    text,
  status     text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'worker';
alter table public.profiles add column if not exists company_id uuid references public.companies (id) on delete set null;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists functie text;
alter table public.profiles add column if not exists status text not null default 'invited';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('superuser', 'admin', 'worker'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles
      add constraint profiles_status_check check (status in ('invited', 'active', 'inactive'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_functie_check') then
    alter table public.profiles
      add constraint profiles_functie_check
      check (functie is null or functie in ('medewerker', 'onderaannemer', 'service_monteur'));
  end if;
end $$;

create index if not exists profiles_company_id_idx on public.profiles (company_id);
create index if not exists profiles_email_idx      on public.profiles (lower(email));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── registrations ───────────────────────────────────────────────────────────
-- Eén rij per medewerker per dag (app.html: loadTodayRegistration, handlePunch,
-- doSubmit, urenstaat). Tijden en totaal zijn TEXT zoals de app ze schrijft
-- ("07:32", "8u 15m"); coördinaten double precision; photo_urls = storage-paden.
create table if not exists public.registrations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  company_id        uuid not null references public.companies (id) on delete cascade,
  -- Model B: opdrachtgever waarvoor is gewerkt (002 voegt deze kolom ook toe als hij ontbreekt)
  client_company_id uuid references public.companies (id),
  full_name         text,
  project_name      text,
  date              date not null default current_date,
  check_in_time     text,
  check_out_time    text,
  check_in_lat      double precision,
  check_in_lng      double precision,
  check_in_acc      double precision,
  check_out_lat     double precision,
  check_out_lng     double precision,
  check_out_acc     double precision,
  total_hours       text,
  notes             text,
  photo_urls        text[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.registrations add column if not exists client_company_id uuid references public.companies (id);
alter table public.registrations add column if not exists full_name text;
alter table public.registrations add column if not exists project_name text;
alter table public.registrations add column if not exists check_in_time text;
alter table public.registrations add column if not exists check_out_time text;
alter table public.registrations add column if not exists check_in_lat double precision;
alter table public.registrations add column if not exists check_in_lng double precision;
alter table public.registrations add column if not exists check_in_acc double precision;
alter table public.registrations add column if not exists check_out_lat double precision;
alter table public.registrations add column if not exists check_out_lng double precision;
alter table public.registrations add column if not exists check_out_acc double precision;
alter table public.registrations add column if not exists total_hours text;
alter table public.registrations add column if not exists notes text;
alter table public.registrations add column if not exists photo_urls text[] not null default '{}';
alter table public.registrations add column if not exists created_at timestamptz not null default now();
alter table public.registrations add column if not exists updated_at timestamptz not null default now();

create index if not exists registrations_company_id_idx        on public.registrations (company_id);
create index if not exists registrations_client_company_id_idx on public.registrations (client_company_id);
create index if not exists registrations_user_id_idx           on public.registrations (user_id);
create index if not exists registrations_date_idx              on public.registrations (date);
create index if not exists registrations_user_date_idx         on public.registrations (user_id, date);

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at
  before update on public.registrations
  for each row execute procedure public.set_updated_at();

-- ── helper: rol van de ingelogde gebruiker ──────────────────────────────────
-- Heet bewust app_role() en niet current_role(): dat laatste botst met de
-- ingebouwde SQL-functie CURRENT_ROLE. SECURITY DEFINER → omzeilt RLS op profiles,
-- zodat policies die dit gebruiken niet in recursie raken.
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ── RLS AAN ─────────────────────────────────────────────────────────────────
-- LET OP: zonder policies ziet de browser (anon key + JWT) nu NIETS. Draai direct
-- daarna 001 t/m 005 (policies in 004_rls_model_b.sql, storage in 005).
-- De Netlify-functies gebruiken de service role en zijn niet geraakt.
alter table public.companies     enable row level security;
alter table public.profiles      enable row level security;
alter table public.registrations enable row level security;

-- ── storage-bucket werkfotos (privé) ────────────────────────────────────────
-- app.html uploadt naar "<company_id>/<user_id>/<timestamp>_<i>_<naam>" en leest
-- via createSignedUrl(pad, 3600). Policies op storage.objects staan in 005.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('werkfotos', 'werkfotos', false, 10485760, array['image/*'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
