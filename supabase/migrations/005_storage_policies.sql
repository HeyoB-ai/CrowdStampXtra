-- ============================================================================
-- 005_storage_policies.sql — policies voor de privé-bucket "werkfotos"
-- ============================================================================
-- Vereist: 000 (bucket, tabellen) en 004 (helpers current_company_id() en
-- has_active_relationship()). Idempotent.
--
-- Padconventie uit app.html (doSubmit):
--   <company_id>/<user_id>/<timestamp>_<i>_<bestandsnaam>
-- (storage.foldername(name))[1] = company_id, [2] = user_id.
--
-- Uploaden: alleen in de map van je eigen company én je eigen user_id.
-- Lezen (signed URL's): eigen company (Model A) óf jouw company is via een actieve
-- relatie de opdrachtgever van de company in het pad (Model B, zoals registrations_select).
-- Geen UPDATE/DELETE: de app wijzigt of verwijdert geen foto's (upsert: false).
-- ============================================================================

drop policy if exists werkfotos_insert on storage.objects;
create policy werkfotos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'werkfotos'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists werkfotos_select on storage.objects;
create policy werkfotos_select on storage.objects
for select to authenticated
using (
  bucket_id = 'werkfotos'
  and (
    (storage.foldername(name))[1] = public.current_company_id()::text
    or public.has_active_relationship(
         public.current_company_id(),
         nullif((storage.foldername(name))[1], '')::uuid
       )
  )
);

-- company_relationships (aangemaakt in 001) heeft in 004 een select-policy maar
-- RLS stond daar bewust uitgecommentarieerd; hier alsnog aanzetten zodat alle
-- tabellen onder RLS vallen. De policies uit 004 blijven gelden.
alter table public.company_relationships enable row level security;

-- Indexen voor company_relationships (001 heeft alleen de unique-constraint).
create index if not exists company_relationships_contractor_idx
  on public.company_relationships (contractor_company_id);
create index if not exists company_relationships_client_idx
  on public.company_relationships (client_company_id);
