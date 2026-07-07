-- =============================================================================
-- Tatami — P5b follow-up: lock staff-only operational tables
-- -----------------------------------------------------------------------------
-- 016 re-scoped the tables the student app touches, but SEVEN operational tables
-- kept the blanket auth_is_member() policy from 008 — which means students (also
-- members) had full read/write to them, including student_injuries (medical PII),
-- prospects (leads' contact info), packages and discount codes. None of these are
-- student-facing, so lock them to STAFF only. Students get no policy → no access.
-- Run after 017_instructor_directory.sql
-- =============================================================================

do $$
declare t text;
  staff_only text[] := array[
    'prospects','student_injuries','equipment','equipment_loans',
    'class_package_types','student_packages','discount_codes'
  ];
begin
  foreach t in array staff_only loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "allow_all_%s" on public.%I', t, t);
    execute format('drop policy if exists "ro_select_%s" on public.%I', t, t);
    execute format('drop policy if exists "%s_member" on public.%I', t, t);
    execute format('drop policy if exists "%s_staff" on public.%I', t, t);
    execute format('create policy "%s_staff" on public.%I for all using (auth_is_staff(academy_id)) with check (auth_is_staff(academy_id))', t, t);
  end loop;
end $$;
