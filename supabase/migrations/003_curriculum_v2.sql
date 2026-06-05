-- =============================================================================
-- Tatami — Curriculum v2 schema
-- Adds a rich technique master DB, modules (positional battles),
-- per-academy curriculum configs, and technique relationships.
-- Run after 002_seed.sql
-- =============================================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Modules — positional battle groupings (shared across academies)
-- ============================================================
create table modules (
  id            text primary key,
  name          text not null,
  description   text,
  position_type text,                 -- standing|passing|side|mount|back|guard|legs|submission|concept|drill
  default_order int not null default 0,
  created_at    timestamptz default now()
);

-- ============================================================
-- Techniques — master technique database (from BJJ_Curriculum.xlsx)
-- ============================================================
create table techniques (
  id                   text primary key,
  number               int,
  category             text not null,
  type                 text,
  name                 text not null,
  slug                 text unique not null,
  description          text,
  complexity           text not null default 'Beginner',  -- Beginner|Intermediate|Advanced|Expert
  key_details          text,
  ruleset              text not null default 'Both',       -- Both|Gi|No-Gi
  context              text not null default 'Both',       -- Self-Defense|Sport|Both
  leg_lock_tier        text not null default 'None',       -- None|Basic|Advanced
  wrestling_dependency boolean not null default false,
  default_module_id    text references modules(id) on delete set null,
  created_at           timestamptz default now()
);

create index on techniques (category);
create index on techniques (complexity);
create index on techniques (default_module_id);

-- ============================================================
-- Curriculum configs — one per academy curriculum (wizard output)
-- ============================================================
create table curriculum_configs (
  id             text primary key default gen_random_uuid()::text,
  academy_id     text references academies(id) on delete cascade,
  name           text not null,
  type_summary   text,                       -- e.g. "Sport No-Gi — Full Leg Locks"
  wizard_answers jsonb not null default '{}',
  created_at     timestamptz default now()
);

-- ============================================================
-- Curriculum techniques — technique membership per curriculum
-- ============================================================
create table curriculum_techniques (
  id             text primary key default gen_random_uuid()::text,
  curriculum_id  text references curriculum_configs(id) on delete cascade,
  technique_id   text references techniques(id) on delete cascade,
  module_id      text references modules(id) on delete set null,
  sequence_order int not null default 0,
  is_hidden      boolean not null default false,
  created_at     timestamptz default now(),
  unique (curriculum_id, technique_id)
);

create index on curriculum_techniques (curriculum_id);
create index on curriculum_techniques (module_id);

-- ============================================================
-- Technique relationships — prerequisite / chains_to graph
-- ============================================================
create table technique_relationships (
  id                   text primary key default gen_random_uuid()::text,
  technique_id         text references techniques(id) on delete cascade,
  related_technique_id text references techniques(id) on delete cascade,
  relationship_type    text not null,        -- 'prerequisite' | 'chains_to'
  created_at           timestamptz default now(),
  unique (technique_id, related_technique_id, relationship_type)
);

create index on technique_relationships (technique_id);

-- ============================================================
-- Row Level Security — enable + open policies (tighten with auth later)
-- ============================================================
alter table modules                  enable row level security;
alter table techniques               enable row level security;
alter table curriculum_configs       enable row level security;
alter table curriculum_techniques    enable row level security;
alter table technique_relationships  enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'modules','techniques','curriculum_configs',
    'curriculum_techniques','technique_relationships'
  ]
  loop
    execute format('create policy "allow_all_%s" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;
