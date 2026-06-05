-- =============================================================================
-- Tatami — link techniques and curriculum configs to a sport
-- Run after 004_curriculum_v2_seed.sql
-- =============================================================================

-- Techniques belong to a sport (all seeded ones are BJJ for now)
alter table techniques add column if not exists sport_id text references sports(id);
update techniques set sport_id = 'sport-bjj' where sport_id is null;
create index if not exists techniques_sport_idx on techniques (sport_id);

-- Curriculum configs belong to a sport
alter table curriculum_configs add column if not exists sport_id text references sports(id);
create index if not exists curriculum_configs_sport_idx on curriculum_configs (sport_id);
