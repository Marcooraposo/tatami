-- =============================================================================
-- Tatami — onboarding RPC: create an academy + owner membership atomically
-- -----------------------------------------------------------------------------
-- academy_members inserts are locked by RLS, so academy creation goes through
-- this SECURITY DEFINER function: it creates the academy and makes the caller
-- its owner in one transaction. Also upserts a profile row.
-- Run after 008_tenancy_foundation.sql.
-- =============================================================================

create or replace function create_academy(p_name text, p_full_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  aid text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'academy name required';
  end if;

  aid := 'acad-' || replace(gen_random_uuid()::text, '-', '');
  insert into academies (id, name) values (aid, trim(p_name));
  insert into academy_members (academy_id, user_id, role) values (aid, auth.uid(), 'owner');

  insert into profiles (id, full_name)
    values (auth.uid(), p_full_name)
    on conflict (id) do update set full_name = coalesce(excluded.full_name, profiles.full_name);

  return aid;
end $$;

grant execute on function create_academy(text, text) to authenticated;
