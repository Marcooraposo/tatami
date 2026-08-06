-- =============================================================================
-- Tatami — P6a: staff roles (admin / instructor), invites, and team management
-- -----------------------------------------------------------------------------
-- Until now every non-student member was equal: auth_is_staff() lumped owner,
-- instructor and front-desk together, so an instructor had full access to
-- billing, discounts, packages and instructor pay. This splits staff two ways:
--
--   * ADMIN  (owner | admin)      — everything, incl. finance + team management.
--   * INSTRUCTOR                  — students, classes, schedule, curriculum,
--                                   grading, competition. No finance, no pay,
--                                   no role management, no academy settings.
--
-- It also makes an instructor a real, invited team member instead of a
-- free-floating label: instructors gain user_id / status / email, and are
-- created through an invite that grants academy_members access on claim.
-- Run after 019_student_writes.sql
-- =============================================================================

-- ---- role vocabulary -------------------------------------------------------
-- 'front-desk' was defined in auth_is_staff but never issued by any code path.
-- Fold any stragglers into 'instructor' before constraining the column.
update academy_members set role = 'instructor' where role = 'front-desk';

alter table academy_members drop constraint if exists academy_members_role_chk;
alter table academy_members add constraint academy_members_role_chk
  check (role in ('owner', 'admin', 'instructor', 'student'));

-- ---- helpers ---------------------------------------------------------------
-- Full administrative rights over an academy.
create or replace function auth_is_admin(aid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from academy_members m
    where m.academy_id = aid and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

-- Teaching staff: admins plus instructors. Everything an instructor may touch.
create or replace function auth_is_instructor(aid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from academy_members m
    where m.academy_id = aid and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'instructor')
  );
$$;

-- auth_is_staff is kept (many policies from 016/018 reference it) but is now
-- exactly "teaching staff" — front-desk is gone from the vocabulary. Policies
-- that must be admin-only are repointed to auth_is_admin further down.
create or replace function auth_is_staff(aid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from academy_members m
    where m.academy_id = aid and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'instructor')
  );
$$;

-- ---- instructors become real team members ----------------------------------
-- user_id is null until the invite is claimed, so staff can be rostered onto
-- classes before they have logged in. The row is never hard-deleted on revoke:
-- classes.instructor_id / recurring_templates.instructor_id point at it and
-- past schedules must keep rendering a name.
alter table instructors add column if not exists user_id  uuid references auth.users(id);
alter table instructors add column if not exists email    text;
alter table instructors add column if not exists teaches  boolean not null default true;
alter table instructors add column if not exists status   text not null default 'active';

alter table instructors drop constraint if exists instructors_status_chk;
alter table instructors add constraint instructors_status_chk
  check (status in ('pending', 'active', 'revoked'));

create index if not exists instructors_user_id_idx on instructors (user_id);
create unique index if not exists instructors_user_academy_uniq
  on instructors (academy_id, user_id) where user_id is not null;

-- ---- staff invites ---------------------------------------------------------
create table if not exists staff_invites (
  token         text primary key,
  academy_id    text not null references academies(id) on delete cascade,
  instructor_id text references instructors(id) on delete cascade,
  role          text not null default 'instructor' check (role in ('admin', 'instructor')),
  email         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now(),
  expires_at    timestamptz,
  used_at       timestamptz,
  used_by       uuid references auth.users(id)
);
create index if not exists staff_invites_academy_idx on staff_invites (academy_id);

alter table staff_invites enable row level security;
-- Granting access is an admin act. Invitees never read this table; they redeem
-- through the SECURITY DEFINER claim RPC below.
drop policy if exists "staff_invites_admin" on staff_invites;
create policy "staff_invites_admin" on staff_invites for all
  using (auth_is_admin(academy_id)) with check (auth_is_admin(academy_id));

-- ---- RLS: admin-only tables ------------------------------------------------
-- Finance, inventory, lead pipeline, module config and the instructors table
-- itself (it carries pay_rate). Instructors get no policy here → no access.
do $$
declare t text;
  admin_only text[] := array[
    'instructors','prospects','equipment','equipment_loans',
    'class_package_types','student_packages','discount_codes','academy_features'
  ];
begin
  foreach t in array admin_only loop
    if to_regclass(format('public.%I', t)) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_member" on public.%I', t, t);
    execute format('drop policy if exists "%s_staff" on public.%I', t, t);
    execute format('drop policy if exists "%s_member_read" on public.%I', t, t);
    execute format('drop policy if exists "%s_admin" on public.%I', t, t);
    execute format('create policy "%s_admin" on public.%I for all using (auth_is_admin(academy_id)) with check (auth_is_admin(academy_id))', t, t);
  end loop;
end $$;

-- academy_features is read by every member to gate nav modules — restore that
-- read while keeping writes admin-only.
drop policy if exists "academy_features_member_read" on academy_features;
create policy "academy_features_member_read" on academy_features for select
  using (auth_is_member(academy_id));

-- Announcements: instructors read, admins write.
drop policy if exists "announcements_staff" on announcements;
drop policy if exists "announcements_admin" on announcements;
create policy "announcements_admin" on announcements for all
  using (auth_is_admin(academy_id)) with check (auth_is_admin(academy_id));
-- (announcements_member_read from 016 stays: any member may read.)

-- Academy identity + sports: admins write, members read (016 gave any staff
-- write access; settings are an admin surface).
drop policy if exists "academies_staff" on academies;
drop policy if exists "academies_admin" on academies;
create policy "academies_admin" on academies for all
  using (auth_is_admin(id)) with check (auth_is_admin(id));

drop policy if exists "academy_sports_staff" on academy_sports;
drop policy if exists "academy_sports_admin" on academy_sports;
create policy "academy_sports_admin" on academy_sports for all
  using (auth_is_admin(academy_id)) with check (auth_is_admin(academy_id));

-- ---- RLS: instructor-accessible tables -------------------------------------
-- These keep the auth_is_staff() policies written in 016, which now resolve to
-- "teaching staff". Listed explicitly so the intent is greppable:
--   students, enrollments, grading_log, attendance, bookings, waitlist,
--   competition_results, classes, recurring_templates, events,
--   curriculum_configs, curriculum_techniques, student_invites
--
-- student_injuries is staff-only in 018 (auth_is_staff) — instructors keep read
-- access for safety, but only admins may write.
drop policy if exists "student_injuries_staff" on student_injuries;
drop policy if exists "student_injuries_admin" on student_injuries;
drop policy if exists "student_injuries_instructor_read" on student_injuries;
create policy "student_injuries_admin" on student_injuries for all
  using (auth_is_admin(academy_id)) with check (auth_is_admin(academy_id));
create policy "student_injuries_instructor_read" on student_injuries for select
  using (auth_is_instructor(academy_id));

-- ---- team directory --------------------------------------------------------
-- Instructors need the team roster (names, who teaches what) but must not see
-- pay_rate or contact email. Definer view filtered to the caller's academies,
-- mirroring the 017 instructor_directory pattern.
drop view if exists team_directory;
create or replace view team_directory
  with (security_invoker = false) as
  select i.id, i.academy_id, i.name, i.initials, i.sport_ids,
         i.teaches, i.status,
         coalesce(m.role, 'instructor') as role,
         (i.user_id is not null) as linked
  from instructors i
  left join academy_members m
    on m.academy_id = i.academy_id and m.user_id = i.user_id
  where auth_is_instructor(i.academy_id);

grant select on team_directory to authenticated;

-- ---- RPC: invite a team member ---------------------------------------------
-- Creates the instructor profile (pending) and the invite in one transaction,
-- and returns the token. Admin-only.
create or replace function invite_staff(
  p_academy_id text, p_name text, p_email text,
  p_role text default 'instructor', p_teaches boolean default true
) returns text language plpgsql security definer set search_path = public as $$
declare
  iid text;
  tok text;
begin
  if not auth_is_admin(p_academy_id) then raise exception 'not permitted'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'name required'; end if;
  if p_role not in ('admin', 'instructor') then raise exception 'invalid role'; end if;

  iid := 'inst-' || replace(gen_random_uuid()::text, '-', '');
  tok := replace(gen_random_uuid()::text, '-', '');

  insert into instructors (id, academy_id, name, initials, email, teaches, status)
  values (
    iid, p_academy_id, btrim(p_name),
    upper(left(btrim(p_name), 1)) ||
      coalesce(upper(left(split_part(btrim(p_name), ' ', 2), 1)), ''),
    nullif(btrim(p_email), ''), coalesce(p_teaches, true), 'pending'
  );

  insert into staff_invites (token, academy_id, instructor_id, role, email, created_by, expires_at)
  values (tok, p_academy_id, iid, p_role, nullif(btrim(p_email), ''), auth.uid(),
          now() + interval '30 days');

  return tok;
end $$;

-- Re-invite an EXISTING instructor row (legacy rows created before this
-- migration, or someone who never claimed their first link).
create or replace function invite_existing_staff(
  p_instructor_id text, p_email text, p_role text default 'instructor'
) returns text language plpgsql security definer set search_path = public as $$
declare
  inst instructors;
  tok  text;
begin
  select * into inst from instructors where id = p_instructor_id;
  if inst.id is null then raise exception 'instructor not found'; end if;
  if not auth_is_admin(inst.academy_id) then raise exception 'not permitted'; end if;
  if inst.user_id is not null then raise exception 'already linked to an account'; end if;
  if p_role not in ('admin', 'instructor') then raise exception 'invalid role'; end if;

  tok := replace(gen_random_uuid()::text, '-', '');
  update instructors set
    email  = coalesce(nullif(btrim(p_email), ''), email),
    status = 'pending'
  where id = p_instructor_id;

  insert into staff_invites (token, academy_id, instructor_id, role, email, created_by, expires_at)
  values (tok, inst.academy_id, inst.id, p_role, nullif(btrim(p_email), ''), auth.uid(),
          now() + interval '30 days');

  return tok;
end $$;

-- ---- RPC: claim a staff invite ---------------------------------------------
create or replace function claim_staff_invite(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare
  inv staff_invites;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into inv from staff_invites where token = p_token;
  if inv.token is null then raise exception 'invalid invite'; end if;
  if inv.used_at is not null then raise exception 'invite already used'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'invite expired'; end if;

  update instructors set user_id = uid, status = 'active'
    where id = inv.instructor_id
      and (user_id is null or user_id = uid);

  insert into academy_members (academy_id, user_id, role)
    values (inv.academy_id, uid, inv.role)
    on conflict (academy_id, user_id) do update set role = excluded.role;

  insert into profiles (id) values (uid) on conflict (id) do nothing;

  update staff_invites set used_at = now(), used_by = uid where token = p_token;
  return inv.academy_id;
end $$;

-- ---- RPC: unified claim (join.html handles one link type) -------------------
-- Returns { academy_id, kind } so the join page knows whether to open the admin
-- app or the student app.
create or replace function claim_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from staff_invites where token = p_token) then
    return jsonb_build_object('academy_id', claim_staff_invite(p_token), 'kind', 'staff');
  end if;
  return jsonb_build_object('academy_id', claim_student_invite(p_token), 'kind', 'student');
end $$;

-- ---- RPC: list the team ----------------------------------------------------
-- Admin-only: returns the roster with role, link status and contact email.
create or replace function list_academy_members(p_academy_id text)
returns table (
  instructor_id text, user_id uuid, name text, initials text,
  email text, role text, status text, teaches boolean, sport_ids text[]
) language plpgsql security definer set search_path = public as $$
begin
  if not auth_is_admin(p_academy_id) then raise exception 'not permitted'; end if;
  return query
    select i.id, i.user_id, i.name, i.initials,
           coalesce(i.email, u.email::text),
           coalesce(m.role, 'instructor'),
           i.status, i.teaches, i.sport_ids
    from instructors i
    left join academy_members m on m.academy_id = i.academy_id and m.user_id = i.user_id
    left join auth.users u on u.id = i.user_id
    where i.academy_id = p_academy_id
    order by (i.status = 'revoked'), i.name;
end $$;

-- ---- RPC: change a member's role -------------------------------------------
-- Guards against the two ways an academy can lock itself out: demoting the
-- owner, and demoting yourself.
create or replace function set_member_role(
  p_academy_id text, p_user_id uuid, p_role text
) returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if not auth_is_admin(p_academy_id) then raise exception 'not permitted'; end if;
  if p_role not in ('admin', 'instructor') then raise exception 'invalid role'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot change your own role'; end if;

  select role into cur from academy_members
    where academy_id = p_academy_id and user_id = p_user_id;
  if cur is null then raise exception 'not a member of this academy'; end if;
  if cur = 'owner' then raise exception 'the owner role cannot be changed'; end if;
  if cur = 'student' then raise exception 'not a staff member'; end if;

  update academy_members set role = p_role
    where academy_id = p_academy_id and user_id = p_user_id;
end $$;

-- ---- RPC: revoke a team member ---------------------------------------------
-- Drops access but keeps the instructor profile so past classes still resolve
-- a name (classes.instructor_id is ON DELETE SET NULL).
create or replace function revoke_member(p_academy_id text, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if not auth_is_admin(p_academy_id) then raise exception 'not permitted'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot remove yourself'; end if;

  select role into cur from academy_members
    where academy_id = p_academy_id and user_id = p_user_id;
  if cur is null then raise exception 'not a member of this academy'; end if;
  if cur = 'owner' then raise exception 'the owner cannot be removed'; end if;

  delete from academy_members where academy_id = p_academy_id and user_id = p_user_id;
  update instructors set status = 'revoked'
    where academy_id = p_academy_id and user_id = p_user_id;
end $$;

-- Revoke a pending invitee who never claimed (no user_id to remove).
create or replace function revoke_instructor(p_instructor_id text)
returns void language plpgsql security definer set search_path = public as $$
declare inst instructors;
begin
  select * into inst from instructors where id = p_instructor_id;
  if inst.id is null then raise exception 'instructor not found'; end if;
  if not auth_is_admin(inst.academy_id) then raise exception 'not permitted'; end if;
  if inst.user_id = auth.uid() then raise exception 'cannot remove yourself'; end if;

  if inst.user_id is not null then
    perform revoke_member(inst.academy_id, inst.user_id);
  else
    update instructors set status = 'revoked' where id = p_instructor_id;
    delete from staff_invites where instructor_id = p_instructor_id and used_at is null;
  end if;
end $$;

-- ---- grants ----------------------------------------------------------------
grant execute on function auth_is_admin(text)                            to authenticated;
grant execute on function auth_is_instructor(text)                       to authenticated;
grant execute on function invite_staff(text, text, text, text, boolean)  to authenticated;
grant execute on function invite_existing_staff(text, text, text)        to authenticated;
grant execute on function claim_staff_invite(text)                       to authenticated;
grant execute on function claim_invite(text)                             to authenticated;
grant execute on function list_academy_members(text)                     to authenticated;
grant execute on function set_member_role(text, uuid, text)              to authenticated;
grant execute on function revoke_member(text, uuid)                      to authenticated;
grant execute on function revoke_instructor(text)                        to authenticated;
