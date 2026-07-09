-- =============================================================================
-- Tatami — P5d: student self-service writes
-- -----------------------------------------------------------------------------
-- Students were read-only (016/018). Grant the narrow, own-only writes the
-- student app needs: book/cancel a class, join/leave the waitlist, check in, and
-- edit their own basic profile. Everything is scoped to the caller's OWN linked
-- student (auth_my_student_id) in their OWN academy — a student can never write
-- for another student or academy. Staff keep full access (from 016).
-- Run after 018_lock_staff_only_tables.sql
-- =============================================================================

-- ---- bookings: student can create + cancel their own -----------------------
drop policy if exists "bookings_student_insert" on bookings;
drop policy if exists "bookings_student_delete" on bookings;
create policy "bookings_student_insert" on bookings for insert
  with check (student_id = auth_my_student_id(academy_id));
create policy "bookings_student_delete" on bookings for delete
  using (student_id = auth_my_student_id(academy_id));

-- ---- waitlist: student can join + leave their own --------------------------
drop policy if exists "waitlist_student_insert" on waitlist;
drop policy if exists "waitlist_student_delete" on waitlist;
create policy "waitlist_student_insert" on waitlist for insert
  with check (student_id = auth_my_student_id(academy_id));
create policy "waitlist_student_delete" on waitlist for delete
  using (student_id = auth_my_student_id(academy_id));

-- ---- attendance: student can check themselves in (insert only) --------------
-- No update/delete: a student shouldn't rewrite their own attendance history.
drop policy if exists "attendance_student_insert" on attendance;
create policy "attendance_student_insert" on attendance for insert
  with check (student_id = auth_my_student_id(academy_id));

-- ---- profile edit: whitelisted columns on the caller's own student row ------
-- Done via a SECURITY DEFINER RPC (not a broad UPDATE policy) so a student can
-- only change these fields — never academy_id, user_id, tags, belt, inactive, …
create or replace function update_my_profile(
  p_name text, p_initials text, p_contact text, p_phone text,
  p_dob date, p_weight numeric
) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update students set
    name              = coalesce(nullif(btrim(p_name), ''), name),
    initials          = coalesce(nullif(btrim(p_initials), ''), initials),
    contact           = p_contact,
    phone             = p_phone,
    dob               = p_dob,
    weight_kg         = p_weight
  where user_id = uid;
end $$;
