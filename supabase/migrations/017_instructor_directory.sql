-- =============================================================================
-- Tatami — P5b follow-up: stop leaking instructor pay to students
-- -----------------------------------------------------------------------------
-- 016's instructors_member_read let any academy member read the whole
-- instructors row — including pay_rate — and students are members. Lock the
-- table back to staff, and expose a name-only directory view members can read
-- for class cards. The view runs with definer rights (so it can read past the
-- now staff-only table RLS) but filters to the caller's academies via
-- auth_is_member and never selects pay_rate.
-- Run after 016_student_rls.sql
-- =============================================================================

-- Instructors table: staff only again (removes the member read-through).
drop policy if exists "instructors_member_read" on instructors;

-- Safe, name-only directory for any member (staff or student) in their academy.
create or replace view instructor_directory
  with (security_invoker = false) as
  select id, name, initials, academy_id
  from instructors
  where auth_is_member(academy_id);

grant select on instructor_directory to authenticated;
