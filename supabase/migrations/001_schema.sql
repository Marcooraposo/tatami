-- ============================================================
-- Tatami — full schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- Academy
-- ============================================================
create table academies (
  id           text primary key,
  name         text not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- Sports
-- ============================================================
create table sports (
  id           text primary key,
  name         jsonb not null,           -- { en: '...', pt: '...' }
  default_grading_system_id text,
  created_at   timestamptz default now()
);

create table academy_sports (
  academy_id          text references academies(id) on delete cascade,
  sport_id            text references sports(id) on delete cascade,
  grading_system_id   text,
  primary key (academy_id, sport_id)
);

-- ============================================================
-- Grading systems
-- ============================================================
create table grading_systems (
  id           text primary key,
  name         jsonb not null,
  sport_id     text references sports(id) on delete cascade,
  academy_id   text references academies(id) on delete set null,
  is_default   boolean default false,
  type         text not null default 'belt-stripe',
  levels       jsonb not null default '[]',   -- array of level objects
  promotion_rules jsonb default '{}',
  created_at   timestamptz default now()
);

-- ============================================================
-- Curriculum
-- ============================================================
create table curriculum_sections (
  id           text primary key,
  sport_id     text references sports(id) on delete cascade,
  name         jsonb not null,
  level        text not null,   -- 'basics' | 'intermediate' | 'advanced'
  sort_order   int  not null default 0,
  created_at   timestamptz default now()
);

create table curriculum_items (
  id           text primary key,
  section_id   text references curriculum_sections(id) on delete cascade,
  name         jsonb not null,
  complexity   text not null,  -- 'beginner' | 'intermediate' | 'advanced'
  sort_order   int  not null default 0,
  created_at   timestamptz default now()
);

-- ============================================================
-- People
-- ============================================================
create table instructors (
  id           text primary key,
  name         text not null,
  initials     text,
  sport_ids    text[] default '{}',
  pay_rate     numeric(8,2),
  created_at   timestamptz default now()
);

create table students (
  id           text primary key,
  name         text not null,
  initials     text,
  dob          date,
  weight_kg    numeric(5,1),
  joined_at    date not null,
  contact      text,
  referred_by  text references students(id) on delete set null,
  created_at   timestamptz default now()
);

-- ============================================================
-- Enrollments (per-student, per-sport grading state)
-- ============================================================
create table enrollments (
  id                  text primary key,
  student_id          text references students(id) on delete cascade,
  sport_id            text references sports(id) on delete cascade,
  grading_system_id   text references grading_systems(id) on delete set null,
  current_level_id    text not null,
  current_stripes     int not null default 0,
  level_since         date not null,
  last_promotion_at   date,
  membership          text,
  created_at          timestamptz default now(),
  unique (student_id, sport_id)
);

-- ============================================================
-- Recurring templates & classes
-- ============================================================
create table recurring_templates (
  id            text primary key,
  dow           int not null,             -- 0=Sun … 6=Sat
  time          text not null,            -- 'HH:MM'
  duration_min  int not null default 60,
  class_type    text not null,
  audience      text,
  instructor_id text references instructors(id) on delete set null,
  capacity      int not null default 20,
  sport_id      text references sports(id) on delete cascade,
  created_at    timestamptz default now()
);

create table classes (
  id              text primary key,
  sport_id        text references sports(id) on delete cascade,
  instructor_id   text references instructors(id) on delete set null,
  starts_at       timestamptz not null,
  duration_min    int not null default 60,
  class_type      text not null,
  capacity        int not null default 20,
  planned_item_ids text[] default '{}',
  status          text not null default 'scheduled',  -- 'scheduled' | 'completed' | 'cancelled'
  created_at      timestamptz default now()
);

create index on classes (starts_at);
create index on classes (status);

-- ============================================================
-- Bookings & attendance
-- ============================================================
create table bookings (
  id          text primary key,
  class_id    text references classes(id) on delete cascade,
  student_id  text references students(id) on delete cascade,
  booked_at   timestamptz not null,
  status      text not null default 'booked',  -- 'booked' | 'cancelled' | 'waitlist'
  created_at  timestamptz default now(),
  unique (class_id, student_id)
);

create table attendance (
  id            text primary key,
  class_id      text references classes(id) on delete cascade,
  student_id    text references students(id) on delete cascade,
  attended      boolean not null default false,
  confirmed_at  timestamptz,
  created_at    timestamptz default now(),
  unique (class_id, student_id)
);

create table waitlist (
  id          text primary key,
  class_id    text references classes(id) on delete cascade,
  student_id  text references students(id) on delete cascade,
  queued_at   timestamptz not null,
  unique (class_id, student_id)
);

-- ============================================================
-- Grading log
-- ============================================================
create table grading_log (
  id          text primary key,
  student_id  text references students(id) on delete cascade,
  sport_id    text references sports(id) on delete cascade,
  type        text not null,    -- 'stripe' | 'promotion'
  level_id    text not null,
  stripes     int,
  date        date not null,
  note        text,
  created_at  timestamptz default now()
);

-- ============================================================
-- Events & competition results
-- ============================================================
create table events (
  id                    text primary key,
  title                 text not null,
  type                  text not null,   -- 'open-mat' | 'belt-test' | 'seminar' | 'tournament'
  date                  date not null,
  time                  text,
  duration_min          int,
  location              text,
  capacity              int,
  notes                 text,
  registered_student_ids text[] default '{}',
  created_at            timestamptz default now()
);

create table competition_results (
  id          text primary key,
  event_id    text references events(id) on delete cascade,
  student_id  text references students(id) on delete cascade,
  division    text,
  placement   text,
  medal       text,   -- 'gold' | 'silver' | 'bronze' | 'none'
  notes       text,
  logged_at   timestamptz default now()
);

-- ============================================================
-- Announcements
-- ============================================================
create table announcements (
  id          text primary key,
  title       text not null,
  body        text,
  pinned      boolean default false,
  created_at  timestamptz default now(),
  expires_at  timestamptz
);

-- ============================================================
-- Injuries
-- ============================================================
create table student_injuries (
  id          text primary key,
  student_id  text references students(id) on delete cascade,
  date        date not null,
  type        text not null,   -- 'sprain' | 'strain' | 'bruise' | 'soreness' | 'fracture' | 'other'
  body_part   text,
  status      text not null default 'active',  -- 'active' | 'recovered'
  notes       text,
  logged_at   timestamptz default now()
);

-- ============================================================
-- Prospects / lead pipeline
-- ============================================================
create table prospects (
  id          text primary key,
  name        text not null,
  contact     text,
  source      text,   -- 'referral' | 'instagram' | 'google' | 'walk-in' | 'event' | 'other'
  sport_id    text references sports(id) on delete set null,
  status      text not null default 'new',
  trial_date  date,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- Equipment
-- ============================================================
create table equipment (
  id          text primary key,
  category    text not null,
  name        text not null,
  qty         int not null default 1,
  condition   text not null default 'good',  -- 'new' | 'good' | 'fair' | 'poor'
  notes       text,
  created_at  timestamptz default now()
);

create table equipment_loans (
  id            text primary key,
  equipment_id  text references equipment(id) on delete cascade,
  student_id    text references students(id) on delete cascade,
  borrowed_at   date not null,
  returned_at   date,
  notes         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- Class packages / punch cards
-- ============================================================
create table class_package_types (
  id             text primary key,
  name           text not null,
  class_count    int not null,
  price          numeric(8,2) not null,
  validity_days  int not null,
  active         boolean default true,
  created_at     timestamptz default now()
);

create table student_packages (
  id              text primary key,
  student_id      text references students(id) on delete cascade,
  package_type_id text references class_package_types(id) on delete set null,
  purchased_at    date not null,
  expires_at      date,
  classes_used    int not null default 0,
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- Discount codes
-- ============================================================
create table discount_codes (
  id          text primary key,
  code        text not null unique,
  type        text not null,    -- 'percent' | 'fixed'
  value       numeric(8,2) not null,
  max_uses    int,
  uses        int not null default 0,
  expires_at  date,
  note        text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- Row Level Security (enable but open for now — tighten per-auth later)
-- ============================================================
alter table academies           enable row level security;
alter table sports              enable row level security;
alter table academy_sports      enable row level security;
alter table grading_systems     enable row level security;
alter table curriculum_sections enable row level security;
alter table curriculum_items    enable row level security;
alter table instructors         enable row level security;
alter table students            enable row level security;
alter table enrollments         enable row level security;
alter table recurring_templates enable row level security;
alter table classes             enable row level security;
alter table bookings            enable row level security;
alter table attendance          enable row level security;
alter table waitlist            enable row level security;
alter table grading_log         enable row level security;
alter table events              enable row level security;
alter table competition_results enable row level security;
alter table announcements       enable row level security;
alter table student_injuries    enable row level security;
alter table prospects           enable row level security;
alter table equipment           enable row level security;
alter table equipment_loans     enable row level security;
alter table class_package_types enable row level security;
alter table student_packages    enable row level security;
alter table discount_codes      enable row level security;

-- Temporary open policy (replace with proper auth policies later)
do $$
declare
  t text;
begin
  foreach t in array array[
    'academies','sports','academy_sports','grading_systems',
    'curriculum_sections','curriculum_items','instructors','students',
    'enrollments','recurring_templates','classes','bookings','attendance',
    'waitlist','grading_log','events','competition_results','announcements',
    'student_injuries','prospects','equipment','equipment_loans',
    'class_package_types','student_packages','discount_codes'
  ]
  loop
    execute format('create policy "allow_all_%s" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;
