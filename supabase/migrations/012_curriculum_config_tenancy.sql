-- =============================================================================
-- Tatami — scope per-academy curriculum config to tenants
-- curriculum_configs already has academy_id (003); curriculum_techniques gets it
-- here. Both move from allow_all to member-scoped RLS. The master library
-- (modules, techniques, curriculum_sections/items, grading_systems) stays
-- public-read — it's shared reference data.
-- Run after 011_schedule_tenancy.sql
-- =============================================================================

alter table curriculum_techniques add column if not exists academy_id text references academies(id) on delete cascade;
-- Backfill from the parent config.
update curriculum_techniques ct
  set academy_id = cc.academy_id
  from curriculum_configs cc
  where ct.curriculum_id = cc.id and ct.academy_id is null;
create index if not exists curriculum_techniques_academy_idx on curriculum_techniques (academy_id);

-- curriculum_configs: member-scoped
drop policy if exists "allow_all_curriculum_configs" on curriculum_configs;
drop policy if exists "ro_select_curriculum_configs" on curriculum_configs;
drop policy if exists "curriculum_configs_member"    on curriculum_configs;
create policy "curriculum_configs_member" on curriculum_configs for all
  using (academy_id is null or auth_is_member(academy_id))
  with check (auth_is_member(academy_id));

-- curriculum_techniques: member-scoped
drop policy if exists "allow_all_curriculum_techniques" on curriculum_techniques;
drop policy if exists "ro_select_curriculum_techniques" on curriculum_techniques;
drop policy if exists "curriculum_techniques_member"    on curriculum_techniques;
create policy "curriculum_techniques_member" on curriculum_techniques for all
  using (academy_id is null or auth_is_member(academy_id))
  with check (auth_is_member(academy_id));
