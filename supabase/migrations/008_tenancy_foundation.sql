-- =============================================================================
-- Tatami — multi-tenant foundation
-- -----------------------------------------------------------------------------
-- Adds the tenancy primitives: profiles, academy_members, academy_id on every
-- operational table, a membership helper, and tenant-scoped RLS that replaces
-- the temporary allow_all / read-only policies on those tables.
--
-- SCOPE / SAFETY:
--   * Only OPERATIONAL (per-academy) tables are locked to members here.
--   * Reference + curriculum tables (sports, modules, techniques,
--     grading_systems, curriculum_sections/items, curriculum_configs,
--     curriculum_techniques, technique_relationships) are intentionally left
--     untouched — the read-only demo reads them with the anon key, and they
--     get tenant policies during the curriculum data-cutover phase.
--   * Requires Supabase Auth to be enabled (auth.users exists by default).
-- =============================================================================

-- ---------- Identity --------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz default now()
);

create table if not exists academy_members (
  academy_id  text references academies(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  role        text not null default 'owner',   -- owner | instructor | front-desk | student
  created_at  timestamptz default now(),
  primary key (academy_id, user_id)
);

-- Membership check used by every tenant policy. SECURITY DEFINER so the policy
-- can read academy_members without recursing through its own RLS.
create or replace function auth_is_member(aid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from academy_members m
    where m.academy_id = aid and m.user_id = auth.uid()
  );
$$;

-- ---------- academy_id on operational tables --------------------------------
do $$
declare
  t text;
  op_tables text[] := array[
    'students','enrollments','recurring_templates','classes','bookings',
    'attendance','waitlist','grading_log','events','competition_results',
    'announcements','student_injuries','prospects','equipment','equipment_loans',
    'class_package_types','student_packages','discount_codes'
  ];
begin
  foreach t in array op_tables loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    execute format('alter table public.%I add column if not exists academy_id text references academies(id) on delete cascade', t);
    -- Backfill existing demo rows to the seed academy.
    execute format('update public.%I set academy_id = ''academy-1'' where academy_id is null', t);
    execute format('create index if not exists %I on public.%I (academy_id)', t || '_academy_idx', t);
  end loop;
end $$;

-- ---------- RLS: profiles & academy_members ---------------------------------
alter table profiles        enable row level security;
alter table academy_members enable row level security;

drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- A user can see their own memberships. (Inserts during onboarding go through a
-- SECURITY DEFINER RPC added in a later migration.)
drop policy if exists "members_self" on academy_members;
create policy "members_self" on academy_members for select
  using (user_id = auth.uid());

-- ---------- RLS: tenant policies on operational tables ----------------------
do $$
declare
  t text;
  op_tables text[] := array[
    'students','enrollments','recurring_templates','classes','bookings',
    'attendance','waitlist','grading_log','events','competition_results',
    'announcements','student_injuries','prospects','equipment','equipment_loans',
    'class_package_types','student_packages','discount_codes'
  ];
begin
  foreach t in array op_tables loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    -- remove the temporary open / read-only policies
    execute format('drop policy if exists "allow_all_%s" on public.%I', t, t);
    execute format('drop policy if exists "ro_select_%s" on public.%I', t, t);
    execute format('drop policy if exists "%s_member" on public.%I', t, t);
    -- members of the row's academy get full access; everyone else gets nothing
    execute format(
      'create policy "%s_member" on public.%I for all using (auth_is_member(academy_id)) with check (auth_is_member(academy_id))',
      t, t);
  end loop;
end $$;

-- ---------- academies + academy_sports: scope to members --------------------
drop policy if exists "allow_all_academies" on academies;
drop policy if exists "ro_select_academies" on academies;
drop policy if exists "academies_member" on academies;
create policy "academies_member" on academies for all
  using (auth_is_member(id)) with check (auth_is_member(id));

drop policy if exists "allow_all_academy_sports" on academy_sports;
drop policy if exists "ro_select_academy_sports" on academy_sports;
drop policy if exists "academy_sports_member" on academy_sports;
create policy "academy_sports_member" on academy_sports for all
  using (auth_is_member(academy_id)) with check (auth_is_member(academy_id));
