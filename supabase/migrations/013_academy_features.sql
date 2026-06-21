-- =============================================================================
-- Tatami — per-academy module toggles (P3 modularity framework)
-- One row per (academy, module) the academy has explicitly turned on/off.
-- Absence of a row = registry default (available modules default ON), so the
-- app degrades gracefully if this table is empty or this migration hasn't run.
-- Run after 012_curriculum_config_tenancy.sql
-- =============================================================================

create table if not exists academy_features (
  academy_id text not null references academies(id) on delete cascade,
  module_id  text not null,
  enabled    boolean not null default true,
  updated_at timestamptz default now(),
  primary key (academy_id, module_id)
);

create index if not exists academy_features_academy_idx on academy_features (academy_id);

alter table academy_features enable row level security;

drop policy if exists "academy_features_member" on academy_features;
create policy "academy_features_member" on academy_features for all
  using (auth_is_member(academy_id)) with check (auth_is_member(academy_id));
