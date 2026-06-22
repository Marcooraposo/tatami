-- =============================================================================
-- Tatami — P4 hardening: lock the shared master/reference library read-only
-- -----------------------------------------------------------------------------
-- These tables are global reference data shared by every academy (the curriculum
-- master library + sport/grading definitions). 001/003 created them with open
-- "allow_all" policies (writable by anyone), and 008 deliberately left them
-- alone. 006 locked them down ON THE DEMO PROJECT only. This migration makes the
-- same lockdown part of the standard chain so DEV and PROD get it too:
--   * SELECT allowed for everyone (the app reads the library to build curricula).
--   * No INSERT/UPDATE/DELETE policy → all writes denied (incl. authed members).
-- Tenant curriculum lives in curriculum_configs / curriculum_techniques, which
-- are member-scoped (012) and unaffected here.
-- Run after 013_academy_features.sql
-- =============================================================================

do $$
declare
  t text;
  ref_tables text[] := array[
    'sports','modules','techniques','grading_systems',
    'curriculum_sections','curriculum_items','technique_relationships'
  ];
begin
  foreach t in array ref_tables loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    -- Drop any prior open / member policies on these reference tables.
    execute format('drop policy if exists "allow_all_%s" on public.%I', t, t);
    execute format('drop policy if exists "ro_select_%s" on public.%I', t, t);
    execute format('drop policy if exists "%s_member" on public.%I', t, t);
    -- Public read-only. (No write policy = writes denied for all roles.)
    execute format('create policy "ro_select_%s" on public.%I for select using (true)', t, t);
  end loop;
end $$;

-- Belt-and-braces: re-assert member-scoped RLS on the operational tables in case
-- a fresh PROD project somehow still carries an open policy from 001. Idempotent.
do $$
declare
  t text;
  op_tables text[] := array[
    'students','enrollments','recurring_templates','classes','bookings',
    'attendance','waitlist','grading_log','events','competition_results',
    'announcements','student_injuries','prospects','equipment','equipment_loans',
    'class_package_types','student_packages','discount_codes','instructors'
  ];
begin
  foreach t in array op_tables loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "allow_all_%s" on public.%I', t, t);
    execute format('drop policy if exists "ro_select_%s" on public.%I', t, t);
    execute format('drop policy if exists "%s_member" on public.%I', t, t);
    execute format(
      'create policy "%s_member" on public.%I for all using (auth_is_member(academy_id)) with check (auth_is_member(academy_id))',
      t, t);
  end loop;
end $$;
