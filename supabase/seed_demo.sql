-- ============================================================================
-- seed_demo.sql — één demo-account voor CrowdStamp (geen signup, geen Stripe)
-- ============================================================================
-- VOORAF (handmatig, in het Supabase-dashboard):
--   Authentication → Users → "Add user" → "Create new user":
--     e-mail  = het adres dat je hieronder bij DEMO_EMAIL invult
--     wachtwoord = zelf kiezen (hiermee log je in op /app)
--     "Auto Confirm User" AAN
--   De trigger uit 003 maakt dan automatisch een profiel (status 'invited').
--
-- DAARNA dit bestand in de SQL Editor draaien. Vervang eerst:
--   <DEMO_EMAIL>  → het e-mailadres van de zojuist aangemaakte gebruiker
--
-- Wat dit doet:
--   1. Bedrijf "Demo Bouw BV" (plan pro, status active, trial_ends_at +1 jaar).
--   2. Profiel van <DEMO_EMAIL> → admin van dat bedrijf, status active.
--   3. Drie demo-medewerkers (auth.users + profiles) zodat de urenstaat gevuld is.
--      Ze kunnen ook inloggen, wachtwoord: DemoWerker2026!  (zie WERKER_WACHTWOORD)
--   4. Registraties voor de afgelopen 2 weken (werkdagen), incl. één open check-in vandaag.
--
-- Idempotent: opnieuw draaien vervangt de demo-registraties en werkt bedrijf/profielen bij.
-- Vereist: 000 t/m 005 zijn al uitgevoerd.
-- ============================================================================

do $$
declare
  demo_email        text := '<DEMO_EMAIL>';
  werker_wachtwoord text := 'DemoWerker2026!';

  demo_company uuid := 'd3a0c0de-0000-4000-8000-000000000001';
  admin_id     uuid;

  -- vaste id's zodat opnieuw draaien geen duplicaten geeft
  w1 uuid := 'd3a0c0de-0000-4000-8000-000000000101';
  w2 uuid := 'd3a0c0de-0000-4000-8000-000000000102';
  w3 uuid := 'd3a0c0de-0000-4000-8000-000000000103';

  w      record;
  d      int;
  dag    date;
  dow    int;
  v_in   time;
  v_uit  time;
  v_tot  interval;
  proj   text;
  lat    double precision;
  lng    double precision;
  notitie text;
begin
  if demo_email = '<DEMO_EMAIL>' then
    raise exception 'Vervang eerst <DEMO_EMAIL> door het e-mailadres van de demo-gebruiker.';
  end if;

  -- ── 1. Bedrijf ─────────────────────────────────────────────────────────────
  insert into public.companies (id, name, plan, status, trial_ends_at)
  values (demo_company, 'Demo Bouw BV', 'pro', 'active', now() + interval '1 year')
  on conflict (id) do update
    set name = excluded.name,
        plan = excluded.plan,
        status = excluded.status,
        trial_ends_at = excluded.trial_ends_at;

  -- ── 2. Admin-profiel koppelen ──────────────────────────────────────────────
  select id into admin_id from auth.users where lower(email) = lower(demo_email);
  if admin_id is null then
    raise exception 'Geen auth-gebruiker met e-mail %. Maak die eerst aan via Authentication → Users.', demo_email;
  end if;

  insert into public.profiles (id, email, role, company_id, full_name, functie, status)
  values (admin_id, demo_email, 'admin', demo_company, 'Demo Beheerder', null, 'active')
  on conflict (id) do update
    set email      = excluded.email,
        role       = 'admin',
        company_id = demo_company,
        full_name  = coalesce(public.profiles.full_name, 'Demo Beheerder'),
        status     = 'active';

  -- ── 3. Demo-medewerkers (auth.users → trigger 003 maakt profiles) ──────────
  for w in
    select * from (values
      (w1, 'jeroen.bakker@demobouw.nl',  'Jeroen Bakker',   'medewerker'),
      (w2, 'sander.willems@demobouw.nl', 'Sander Willems',  'medewerker'),
      (w3, 'marco.visser@demobouw.nl',   'Marco Visser',    'onderaannemer')
    ) as t(id, email, naam, functie)
  loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      is_sso_user, is_anonymous
    ) values (
      w.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      w.email, extensions.crypt(werker_wachtwoord, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role', 'worker', 'company_id', demo_company, 'full_name', w.naam, 'functie', w.functie),
      now() - interval '30 days', now(),
      '', '', '', '', '', '', '', '',
      false, false
    )
    on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      w.id, w.id, w.id::text,
      jsonb_build_object('sub', w.id::text, 'email', w.email, 'email_verified', true),
      'email', now() - interval '29 days', now() - interval '30 days', now()
    )
    on conflict (provider_id, provider) do nothing;

    -- Profiel: trigger 003 heeft hem (status invited) aangemaakt; hier actief maken.
    insert into public.profiles (id, email, role, company_id, full_name, functie, status)
    values (w.id, w.email, 'worker', demo_company, w.naam, w.functie, 'active')
    on conflict (id) do update
      set email = excluded.email, role = 'worker', company_id = demo_company,
          full_name = excluded.full_name, functie = excluded.functie, status = 'active';
  end loop;

  -- ── 4. Registraties afgelopen 2 weken ──────────────────────────────────────
  delete from public.registrations where company_id = demo_company and user_id in (w1, w2, w3);

  for d in reverse 14 .. 0 loop
    dag := current_date - d;
    dow := extract(isodow from dag);
    if dow > 5 then continue; end if;   -- geen weekend

    for w in
      select * from (values
        (w1, 'Jeroen Bakker',  0),
        (w2, 'Sander Willems', 1),
        (w3, 'Marco Visser',   2)
      ) as t(id, naam, n)
    loop
      -- Marco (onderaannemer) werkt niet op vrijdag
      if w.n = 2 and dow = 5 then continue; end if;

      -- project per medewerker, wisselend per week
      proj := case
        when w.n = 0 then case when (d / 7) % 2 = 0 then 'Renovatie Molenwijk – Woerden' else 'Nieuwbouw De Kade – Utrecht' end
        when w.n = 1 then case when (d / 7) % 2 = 0 then 'Nieuwbouw De Kade – Utrecht' else 'Renovatie Molenwijk – Woerden' end
        else 'Tegelwerk Parkzicht – Nieuwegein'
      end;
      lat := case when proj like '%Woerden%' then 52.0812 when proj like '%Utrecht%' then 52.1027 else 52.0296 end
             + ((d * 7 + w.n * 13) % 9 - 4) * 0.00004;
      lng := case when proj like '%Woerden%' then 4.8934  when proj like '%Utrecht%' then 5.0512  else 5.0851  end
             + ((d * 5 + w.n * 11) % 9 - 4) * 0.00005;

      v_in  := time '07:00' + make_interval(mins => 10 + (d * 7 + w.n * 5) % 35);
      v_uit := time '15:45' + make_interval(mins => (d * 3 + w.n * 9) % 40);
      -- één keer overwerk
      if d = 6 and w.n = 2 then v_uit := time '18:20'; end if;
      v_tot := v_uit - v_in;

      notitie := case
        when d = 9 and w.n = 0 then 'Bewoner nr. 104 niet thuis, badkamer 106 eerder opgepakt.'
        when d = 6 and w.n = 2 then 'Ondergrond slechter dan verwacht, extra uitvlakken – overwerk.'
        when d = 3 and w.n = 1 then 'Materiaal (PEX-leiding) bijbesteld, levering morgen.'
        when d = 1 and w.n = 0 then 'Opname met opzichter, restpunten genoteerd.'
        else null
      end;

      if d = 0 then
        -- Vandaag: Jeroen is ingecheckt (nog geen uitcheck), Sander heeft al uitgecheckt,
        -- Marco komt later (geen rij).
        if w.n = 2 then continue; end if;
        insert into public.registrations (
          user_id, company_id, full_name, project_name, date,
          check_in_time, check_in_lat, check_in_lng, check_in_acc,
          check_out_time, check_out_lat, check_out_lng, check_out_acc, total_hours, notes
        ) values (
          w.id, demo_company, w.naam, proj, dag,
          to_char(v_in, 'HH24:MI'), lat, lng, 12 + w.n * 3,
          case when w.n = 1 then to_char(time '15:10', 'HH24:MI') end,
          case when w.n = 1 then lat + 0.00003 end,
          case when w.n = 1 then lng - 0.00002 end,
          case when w.n = 1 then 9 end,
          case when w.n = 1 then extract(hour from (time '15:10' - v_in))::int || 'u ' || extract(minute from (time '15:10' - v_in))::int || 'm' end,
          null
        );
      else
        insert into public.registrations (
          user_id, company_id, full_name, project_name, date,
          check_in_time, check_in_lat, check_in_lng, check_in_acc,
          check_out_time, check_out_lat, check_out_lng, check_out_acc, total_hours, notes,
          created_at, updated_at
        ) values (
          w.id, demo_company, w.naam, proj, dag,
          to_char(v_in, 'HH24:MI'), lat, lng, 8 + (d + w.n) % 14,
          to_char(v_uit, 'HH24:MI'), lat + 0.00002, lng + 0.00003, 7 + (d * 2 + w.n) % 12,
          extract(hour from v_tot)::int || 'u ' || extract(minute from v_tot)::int || 'm',
          notitie,
          dag + v_in, dag + v_uit
        );
      end if;
    end loop;
  end loop;

  raise notice 'Demo-seed klaar: bedrijf %, admin %, % registraties.',
    demo_company, demo_email,
    (select count(*) from public.registrations where company_id = demo_company);
end $$;

-- Controle:
-- select p.full_name, p.role, p.status, c.name, c.plan from public.profiles p join public.companies c on c.id = p.company_id;
-- select date, full_name, project_name, check_in_time, check_out_time, total_hours from public.registrations order by date desc, full_name;
