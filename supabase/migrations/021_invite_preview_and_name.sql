-- =============================================================================
-- Tatami — P6b: invite preview + invitee-set name
-- -----------------------------------------------------------------------------
-- Two gaps in the join flow:
--   1. The join page showed a generic "Join your academy" — the invitee had no
--      idea which academy, in what role, or whether the link was already used.
--   2. The name on the profile was whatever the admin typed at invite time; the
--      person joining never got to set their own.
--
-- invite_preview() answers "what am I being invited to?" before authentication.
-- It is deliberately callable by anon: the token IS the capability, and anyone
-- holding it was already going to redeem it. It exposes only the academy name,
-- role, and the name the admin entered — never the member list or any PII
-- beyond what the inviter already put in the link.
--
-- claim_invite() / claim_staff_invite() gain an optional p_name so the invitee
-- can set their own display name as they join.
-- Run after 020_staff_roles.sql
-- =============================================================================

-- ---- preview: what is this token for? --------------------------------------
create or replace function invite_preview(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  si  staff_invites;
  sti student_invites;
  an  text;
begin
  select * into si from staff_invites where token = p_token;
  if si.token is not null then
    select name into an from academies where id = si.academy_id;
    return jsonb_build_object(
      'kind',         'staff',
      'academy_name', coalesce(an, 'your academy'),
      'role',         si.role,
      'name',         (select name from instructors where id = si.instructor_id),
      'email',        si.email,
      'used',         si.used_at is not null,
      'expired',      (si.expires_at is not null and si.expires_at < now())
    );
  end if;

  select * into sti from student_invites where token = p_token;
  if sti.token is not null then
    select name into an from academies where id = sti.academy_id;
    return jsonb_build_object(
      'kind',         'student',
      'academy_name', coalesce(an, 'your academy'),
      'role',         'student',
      'name',         (select name from students where id = sti.student_id),
      'email',        null,
      'used',         sti.used_at is not null,
      'expired',      (sti.expires_at is not null and sti.expires_at < now())
    );
  end if;

  return jsonb_build_object('kind', 'invalid');
end $$;

-- ---- claim with an invitee-supplied name -----------------------------------
-- Replace the 1-arg forms outright: keeping both would make a 1-arg call
-- ambiguous once a defaulted 2-arg version exists.
drop function if exists claim_staff_invite(text);
drop function if exists claim_invite(text);

create or replace function claim_staff_invite(p_token text, p_name text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  inv staff_invites;
  uid uuid := auth.uid();
  nm  text := nullif(btrim(p_name), '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into inv from staff_invites where token = p_token;
  if inv.token is null then raise exception 'invalid invite'; end if;
  if inv.used_at is not null then raise exception 'invite already used'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'invite expired'; end if;

  update instructors set
    user_id  = uid,
    status   = 'active',
    name     = coalesce(nm, name),
    initials = case when nm is null then initials else
                 upper(left(nm, 1)) ||
                 coalesce(upper(left(split_part(nm, ' ', 2), 1)), '') end
  where id = inv.instructor_id
    and (user_id is null or user_id = uid);

  insert into academy_members (academy_id, user_id, role)
    values (inv.academy_id, uid, inv.role)
    on conflict (academy_id, user_id) do update set role = excluded.role;

  insert into profiles (id, full_name) values (uid, nm)
    on conflict (id) do update set full_name = coalesce(excluded.full_name, profiles.full_name);

  update staff_invites set used_at = now(), used_by = uid where token = p_token;
  return inv.academy_id;
end $$;

-- Student claim gains the same optional name.
create or replace function claim_student_invite(p_token text, p_name text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  inv student_invites;
  uid uuid := auth.uid();
  nm  text := nullif(btrim(p_name), '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into inv from student_invites where token = p_token;
  if inv.token is null then raise exception 'invalid invite'; end if;
  if inv.used_at is not null then raise exception 'invite already used'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'invite expired'; end if;

  update students set
    user_id  = uid,
    name     = coalesce(nm, name),
    initials = case when nm is null then initials else
                 upper(left(nm, 1)) ||
                 coalesce(upper(left(split_part(nm, ' ', 2), 1)), '') end
  where id = inv.student_id and academy_id = inv.academy_id
    and (user_id is null or user_id = uid);

  insert into academy_members (academy_id, user_id, role)
    values (inv.academy_id, uid, 'student')
    on conflict (academy_id, user_id) do nothing;

  update student_invites set used_at = now(), used_by = uid where token = p_token;
  return inv.academy_id;
end $$;

create or replace function claim_invite(p_token text, p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from staff_invites where token = p_token) then
    return jsonb_build_object('academy_id', claim_staff_invite(p_token, p_name), 'kind', 'staff');
  end if;
  return jsonb_build_object('academy_id', claim_student_invite(p_token, p_name), 'kind', 'student');
end $$;

-- ---- grants ----------------------------------------------------------------
grant execute on function invite_preview(text)                   to anon, authenticated;
grant execute on function claim_staff_invite(text, text)         to authenticated;
grant execute on function claim_student_invite(text, text)       to authenticated;
grant execute on function claim_invite(text, text)               to authenticated;
