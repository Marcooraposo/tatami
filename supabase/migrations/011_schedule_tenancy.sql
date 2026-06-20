-- =============================================================================
-- Tatami — schedule cutover prep (Phase 2a)
-- Adds academy_id + tenant RLS to instructors, and audience_tags columns the
-- app writes for recurring_templates and classes.
-- Run after 010_student_fields.sql
-- =============================================================================

-- audience tags (multi-select) on schedule rows
alter table recurring_templates add column if not exists audience_tags text[] default '{}';
alter table classes             add column if not exists audience_tags text[] default '{}';

-- Instructors were not tenant-scoped in 008 — fix that now.
alter table instructors add column if not exists academy_id text references academies(id) on delete cascade;
update instructors set academy_id = 'academy-1' where academy_id is null;
create index if not exists instructors_academy_idx on instructors (academy_id);

-- Replace the temporary open/read-only policies with a member-scoped policy.
drop policy if exists "allow_all_instructors" on instructors;
drop policy if exists "ro_select_instructors" on instructors;
drop policy if exists "instructors_member"    on instructors;
create policy "instructors_member" on instructors for all
  using (auth_is_member(academy_id)) with check (auth_is_member(academy_id));
