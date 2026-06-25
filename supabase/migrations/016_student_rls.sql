-- =============================================================================
-- Tatami — P5b: student-role RLS
-- -----------------------------------------------------------------------------
-- Until now every academy member (incl. students) had full access via
-- auth_is_member(). That's too broad for students — they'd see every other
-- student's PII. This splits access two ways:
--   * STAFF (owner/instructor/front-desk) keep full read/write (auth_is_staff).
--   * STUDENTS get read-only: their OWN records + academy-PUBLIC data only.
-- Student self-service writes (book/check-in/register) come in P5d as scoped
-- insert policies; here students are read-only.
-- Run after 015_student_identity.sql
-- =============================================================================

-- ---- helpers ---------------------------------------------------------------
create or replace function auth_is_staff(aid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from academy_members m
    where m.academy_id = aid and m.user_id = auth.uid()
      and m.role in ('owner','instructor','front-desk','admin')
  );
$$;

-- The student row linked to the current user in a given academy (NULL if none).
create or replace function auth_my_student_id(aid text)
returns text language sql stable security definer set search_path = public as $$
  select id from students
  where academy_id = aid and user_id = auth.uid()
  limit 1;
$$;

-- ---- students: staff full; student reads only own row ----------------------
drop policy if exists "students_member" on students;
drop policy if exists "students_staff" on students;
drop policy if exists "students_self_read" on students;
create policy "students_staff" on students for all
  using (auth_is_staff(academy_id)) with check (auth_is_staff(academy_id));
create policy "students_self_read" on students for select
  using (user_id = auth.uid());

-- ---- per-student PII (student_id-keyed): staff full; student reads own ------
do $$
declare t text;
  pii text[] := array['enrollments','grading_log','attendance','bookings','waitlist','competition_results'];
begin
  foreach t in array pii loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    execute format('drop policy if exists "%s_member" on public.%I', t, t);
    execute format('drop policy if exists "%s_staff" on public.%I', t, t);
    execute format('drop policy if exists "%s_student_read" on public.%I', t, t);
    execute format('create policy "%s_staff" on public.%I for all using (auth_is_staff(academy_id)) with check (auth_is_staff(academy_id))', t, t);
    execute format('create policy "%s_student_read" on public.%I for select using (student_id = auth_my_student_id(academy_id))', t, t);
  end loop;
end $$;

-- ---- academy-public read (staff full; any member incl. student may read) ----
do $$
declare t text;
  pub text[] := array['classes','recurring_templates','instructors','events','announcements','academy_features'];
begin
  foreach t in array pub loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    execute format('drop policy if exists "%s_member" on public.%I', t, t);
    execute format('drop policy if exists "%s_staff" on public.%I', t, t);
    execute format('drop policy if exists "%s_member_read" on public.%I', t, t);
    execute format('create policy "%s_staff" on public.%I for all using (auth_is_staff(academy_id)) with check (auth_is_staff(academy_id))', t, t);
    execute format('create policy "%s_member_read" on public.%I for select using (auth_is_member(academy_id))', t, t);
  end loop;
end $$;

-- ---- curriculum config: members read (master + own); staff write -----------
drop policy if exists "curriculum_configs_member" on curriculum_configs;
drop policy if exists "curriculum_configs_staff"  on curriculum_configs;
drop policy if exists "curriculum_configs_read"   on curriculum_configs;
create policy "curriculum_configs_staff" on curriculum_configs for all
  using (auth_is_staff(academy_id)) with check (auth_is_staff(academy_id));
create policy "curriculum_configs_read" on curriculum_configs for select
  using (academy_id is null or auth_is_member(academy_id));

drop policy if exists "curriculum_techniques_member" on curriculum_techniques;
drop policy if exists "curriculum_techniques_staff"  on curriculum_techniques;
drop policy if exists "curriculum_techniques_read"   on curriculum_techniques;
create policy "curriculum_techniques_staff" on curriculum_techniques for all
  using (auth_is_staff(academy_id)) with check (auth_is_staff(academy_id));
create policy "curriculum_techniques_read" on curriculum_techniques for select
  using (academy_id is null or auth_is_member(academy_id));

-- ---- academy identity: members read; staff write ---------------------------
drop policy if exists "academies_member" on academies;
drop policy if exists "academies_staff"  on academies;
drop policy if exists "academies_read"   on academies;
create policy "academies_staff" on academies for all
  using (auth_is_staff(id)) with check (auth_is_staff(id));
create policy "academies_read" on academies for select
  using (auth_is_member(id));

drop policy if exists "academy_sports_member" on academy_sports;
drop policy if exists "academy_sports_staff"  on academy_sports;
drop policy if exists "academy_sports_read"   on academy_sports;
create policy "academy_sports_staff" on academy_sports for all
  using (auth_is_staff(academy_id)) with check (auth_is_staff(academy_id));
create policy "academy_sports_read" on academy_sports for select
  using (auth_is_member(academy_id));

-- ---- invites: staff only (students redeem via the SECURITY DEFINER RPC) -----
drop policy if exists "student_invites_member" on student_invites;
drop policy if exists "student_invites_staff"  on student_invites;
create policy "student_invites_staff" on student_invites for all
  using (auth_is_staff(academy_id)) with check (auth_is_staff(academy_id));
