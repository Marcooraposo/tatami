-- =============================================================================
-- Tatami — make a project READ-ONLY for the anon role (demo hardening)
-- -----------------------------------------------------------------------------
-- Run this ONLY on the demo Supabase project. It replaces the open "allow_all"
-- policies with select-only access for anon, so a public visitor can read every
-- table but cannot insert / update / delete anything.
--
-- Do NOT run this on prod (prod gets proper auth-scoped policies later).
-- To revert (e.g. on dev), drop the *_ro policies and recreate allow_all.
-- =============================================================================

do $$
declare
  t text;
  tbls text[] := array[
    -- 001 schema
    'academies','sports','academy_sports','grading_systems',
    'curriculum_sections','curriculum_items','instructors','students',
    'enrollments','recurring_templates','classes','bookings','attendance',
    'waitlist','grading_log','events','competition_results','announcements',
    'student_injuries','prospects','equipment','equipment_loans',
    'class_package_types','student_packages','discount_codes',
    -- 003 curriculum v2
    'modules','techniques','curriculum_configs','curriculum_techniques',
    'technique_relationships'
  ];
begin
  foreach t in array tbls loop
    -- only touch tables that exist
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    -- drop the permissive allow_all policy if present
    execute format('drop policy if exists "allow_all_%s" on public.%I', t, t);
    -- drop any prior read-only policy so this migration is re-runnable
    execute format('drop policy if exists "ro_select_%s" on public.%I', t, t);
    -- recreate as SELECT-only for anon + authenticated
    execute format(
      'create policy "ro_select_%s" on public.%I for select using (true)', t, t);
  end loop;
end $$;
