-- =============================================================================
-- Tatami — extra student columns used by the admin UI (tenant cutover)
-- Adds fields the app reads/writes that weren't in the original schema.
-- Run after 009_create_academy_rpc.sql
-- =============================================================================
alter table students add column if not exists gender            text;
alter table students add column if not exists competes          boolean default false;
alter table students add column if not exists tags              text[] default '{}';
alter table students add column if not exists inactive          boolean default false;
alter table students add column if not exists phone             text;
alter table students add column if not exists emergency_contact text;
alter table students add column if not exists notes             text;
