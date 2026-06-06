-- =============================================================================
-- Tatami — seed data (mirrors data.js prototype data)
-- Run after 001_schema.sql
-- =============================================================================

-- Academy
insert into academies (id, name) values
  ('academy-1', 'Iron Roots Academy')
on conflict do nothing;

-- Sports
insert into sports (id, name, default_grading_system_id) values
  ('sport-bjj', '{"en":"Brazilian Jiu-Jitsu","pt":"Jiu-Jitsu Brasileiro"}', 'grading-bjj-adult-default')
on conflict do nothing;

insert into academy_sports (academy_id, sport_id, grading_system_id) values
  ('academy-1', 'sport-bjj', 'grading-bjj-adult-default')
on conflict do nothing;

-- Grading systems
insert into grading_systems (id, name, sport_id, is_default, type, levels, promotion_rules) values (
  'grading-bjj-adult-default',
  '{"en":"BJJ Adult Belts (IBJJF)","pt":"Faixas Adulto BJJ (IBJJF)"}',
  'sport-bjj',
  true,
  'belt-stripe',
  '[
    {"id":"bjj-white",  "name":{"en":"White", "pt":"Branca"},   "order":0,"color":"#f8fafc","textColor":"#0f172a","maxStripes":4},
    {"id":"bjj-blue",   "name":{"en":"Blue",  "pt":"Azul"},     "order":1,"color":"#1e40af","textColor":"#ffffff","maxStripes":4},
    {"id":"bjj-purple", "name":{"en":"Purple","pt":"Roxa"},     "order":2,"color":"#6b21a8","textColor":"#ffffff","maxStripes":4},
    {"id":"bjj-brown",  "name":{"en":"Brown", "pt":"Castanha"}, "order":3,"color":"#78350f","textColor":"#ffffff","maxStripes":4},
    {"id":"bjj-black",  "name":{"en":"Black", "pt":"Preta"},    "order":4,"color":"#0f172a","textColor":"#ffffff","maxStripes":6}
  ]',
  '{"bjj-white-to-bjj-blue":{"minMonthsAtLevel":12,"minStripes":4,"minBasicsCoveragePct":0.80,"minClassesAtLevel":80}}'
) on conflict do nothing;

-- Curriculum sections
insert into curriculum_sections (id, sport_id, name, level, sort_order) values
  ('sec-mount',       'sport-bjj', '{"en":"Mount","pt":"Montada"}',             'basics',       1),
  ('sec-guard',       'sport-bjj', '{"en":"Guard","pt":"Guarda"}',              'basics',       2),
  ('sec-sidecontrol', 'sport-bjj', '{"en":"Side Control","pt":"Cem Quilos"}',   'basics',       3),
  ('sec-takedowns',   'sport-bjj', '{"en":"Takedowns","pt":"Quedas"}',          'basics',       4),
  ('sec-escapes',     'sport-bjj', '{"en":"Escapes","pt":"Saídas"}',            'basics',       5),
  ('sec-submissions', 'sport-bjj', '{"en":"Submissions","pt":"Finalizações"}',  'intermediate', 6)
on conflict do nothing;

-- Curriculum items
insert into curriculum_items (id, section_id, name, complexity, sort_order) values
  ('item-mount-1', 'sec-mount', '{"en":"Mount Maintenance","pt":"Manutenção da Montada"}',            'beginner',     1),
  ('item-mount-2', 'sec-mount', '{"en":"Trap and Roll","pt":"Armadilha e Rolar"}',                    'beginner',     2),
  ('item-mount-3', 'sec-mount', '{"en":"Cross-Collar Choke","pt":"Estrangulamento Cruzado"}',         'intermediate', 3),
  ('item-mount-4', 'sec-mount', '{"en":"Armbar from Mount","pt":"Chave de Braço da Montada"}',        'advanced',     4),
  ('item-guard-1', 'sec-guard', '{"en":"Closed Guard Basics","pt":"Guarda Fechada Básica"}',          'beginner',     1),
  ('item-guard-2', 'sec-guard', '{"en":"Hip Bump Sweep","pt":"Raspagem de Subida"}',                  'beginner',     2),
  ('item-guard-3', 'sec-guard', '{"en":"Scissor Sweep","pt":"Raspagem de Tesoura"}',                  'intermediate', 3),
  ('item-guard-4', 'sec-guard', '{"en":"Triangle from Guard","pt":"Triângulo da Guarda"}',            'advanced',     4),
  ('item-side-1', 'sec-sidecontrol', '{"en":"Side Control Maintenance","pt":"Manutenção do Cem Quilos"}', 'beginner', 1),
  ('item-side-2', 'sec-sidecontrol', '{"en":"Americana","pt":"Americana"}',                           'beginner',     2),
  ('item-side-3', 'sec-sidecontrol', '{"en":"Knee-on-Belly","pt":"Joelho na Barriga"}',               'intermediate', 3),
  ('item-side-4', 'sec-sidecontrol', '{"en":"North-South Choke","pt":"Estrangulamento Norte-Sul"}',   'advanced',     4),
  ('item-td-1', 'sec-takedowns', '{"en":"Double Leg Takedown","pt":"Baiana"}',                        'beginner',     1),
  ('item-td-2', 'sec-takedowns', '{"en":"Single Leg Takedown","pt":"Queda de Uma Perna"}',            'intermediate', 2),
  ('item-td-3', 'sec-takedowns', '{"en":"Osoto Gari","pt":"Osoto Gari"}',                             'intermediate', 3),
  ('item-td-4', 'sec-takedowns', '{"en":"Ankle Pick","pt":"Gancho de Tornozelo"}',                    'advanced',     4),
  ('item-esc-1', 'sec-escapes', '{"en":"Upa Escape","pt":"Upa"}',                                     'beginner',     1),
  ('item-esc-2', 'sec-escapes', '{"en":"Elbow Escape","pt":"Recomposição de Cotovelo"}',              'beginner',     2),
  ('item-esc-3', 'sec-escapes', '{"en":"Side Control Escape","pt":"Saída do Cem Quilos"}',            'intermediate', 3),
  ('item-esc-4', 'sec-escapes', '{"en":"Turtle Recovery","pt":"Recuperação da Tartaruga"}',           'advanced',     4),
  ('item-sub-1', 'sec-submissions', '{"en":"Rear Naked Choke","pt":"Mata-Leão"}',                     'intermediate', 1),
  ('item-sub-2', 'sec-submissions', '{"en":"Guillotine Choke","pt":"Guilhotina"}',                    'intermediate', 2),
  ('item-sub-3', 'sec-submissions', '{"en":"Kimura","pt":"Kimura"}',                                  'intermediate', 3),
  ('item-sub-4', 'sec-submissions', '{"en":"Arm Triangle","pt":"Triângulo de Braço"}',                'advanced',     4)
on conflict do nothing;

-- Instructors
insert into instructors (id, name, initials, sport_ids, pay_rate) values
  ('inst-1', 'Rui Almeida', 'RA', '{sport-bjj}', 25),
  ('inst-2', 'Marta Costa', 'MC', '{sport-bjj}', 25)
on conflict do nothing;

-- Students
insert into students (id, name, initials, dob, weight_kg, joined_at, contact, referred_by) values
  ('s-1',  'João Silva',      'JS', '1992-04-12', 78,  '2025-09-15', 'joao@example.com',     's-3'),
  ('s-2',  'Ana Pereira',     'AP', '1988-11-03', 62,  '2024-02-20', 'ana@example.com',      null),
  ('s-3',  'Miguel Santos',   'MS', '1995-07-22', 84,  '2023-06-10', 'miguel@example.com',   null),
  ('s-4',  'Sofia Martins',   'SM', '1998-01-30', 58,  '2026-04-01', 'sofia@example.com',    's-3'),
  ('s-5',  'Pedro Oliveira',  'PO', '1985-09-17', 92,  '2022-03-15', 'pedro@example.com',    's-2'),
  ('s-6',  'Inês Rodrigues',  'IR', '1994-03-08', 60,  '2024-08-12', 'ines.r@example.com',   's-2'),
  ('s-7',  'Tomás Ferreira',  'TF', '1990-12-25', 88,  '2023-11-05', 'tomas@example.com',    null),
  ('s-8',  'Beatriz Costa',   'BC', '2000-06-14', 55,  '2025-03-20', 'bea.costa@example.com','s-1'),
  ('s-9',  'Rúben Gomes',     'RG', '1987-09-02', 80,  '2022-11-01', 'ruben@example.com',    null),
  ('s-10', 'Catarina Lima',   'CL', '1996-02-19', 63,  '2026-01-10', 'cat.lima@example.com', 's-3'),
  ('s-11', 'Diogo Neves',     'DN', '1993-08-30', 76,  '2024-05-22', 'diogo.n@example.com',  's-7'),
  ('s-12', 'Mariana Fonseca', 'MF', '1991-11-11', 59,  '2025-07-01', 'mariana@example.com',  's-2'),
  ('s-13', 'André Carvalho',  'AC', '1989-05-17', 85,  '2023-02-14', 'andre.c@example.com',  null),
  ('s-14', 'Lara Mendes',     'LM', '1997-07-04', 57,  '2026-03-15', 'lara.m@example.com',   's-4'),
  ('s-15', 'Francisco Pires', 'FP', '1983-01-28', 95,  '2024-10-08', null,                   null)
on conflict do nothing;

-- Enrollments
insert into enrollments (id, student_id, sport_id, grading_system_id, current_level_id, current_stripes, level_since, last_promotion_at, membership) values
  ('e-1',  's-1',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  2, '2025-09-15', '2026-02-10', 'plan-monthly'),
  ('e-2',  's-2',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  4, '2024-02-20', '2026-03-05', 'plan-unlimited'),
  ('e-3',  's-3',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-blue',   2, '2024-06-15', '2025-11-20', 'plan-annual'),
  ('e-4',  's-4',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  0, '2026-04-01', null,         'plan-monthly'),
  ('e-5',  's-5',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-purple', 1, '2024-10-10', '2025-08-15', 'plan-unlimited'),
  ('e-6',  's-6',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  3, '2024-08-12', '2025-06-20', 'plan-monthly'),
  ('e-7',  's-7',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-blue',   1, '2024-11-05', '2025-09-10', 'plan-unlimited'),
  ('e-8',  's-8',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  1, '2025-03-20', '2025-10-15', 'plan-monthly'),
  ('e-9',  's-9',  'sport-bjj', 'grading-bjj-adult-default', 'bjj-purple', 3, '2023-05-01', '2024-08-20', 'plan-annual'),
  ('e-10', 's-10', 'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  0, '2026-01-10', null,         'plan-monthly'),
  ('e-11', 's-11', 'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  2, '2024-05-22', '2025-04-10', 'plan-monthly'),
  ('e-12', 's-12', 'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  1, '2025-07-01', '2025-12-05', 'plan-monthly'),
  ('e-13', 's-13', 'sport-bjj', 'grading-bjj-adult-default', 'bjj-blue',   3, '2023-08-14', '2025-02-28', 'plan-unlimited'),
  ('e-14', 's-14', 'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  0, '2026-03-15', null,         'plan-monthly'),
  ('e-15', 's-15', 'sport-bjj', 'grading-bjj-adult-default', 'bjj-white',  3, '2024-10-08', '2025-07-01', 'plan-unlimited')
on conflict do nothing;

-- Recurring templates
insert into recurring_templates (id, dow, time, duration_min, class_type, audience, instructor_id, capacity, sport_id) values
  ('rt-1', 1, '19:00', 60, 'Fundamentals', 'Adults',      'inst-1', 20, 'sport-bjj'),
  ('rt-2', 2, '19:00', 60, 'Open Class',   'Adults',      'inst-2', 20, 'sport-bjj'),
  ('rt-3', 3, '19:00', 60, 'Fundamentals', 'Adults',      'inst-1', 20, 'sport-bjj'),
  ('rt-4', 4, '19:00', 60, 'Open Class',   'Adults',      'inst-2', 20, 'sport-bjj'),
  ('rt-5', 5, '19:00', 60, 'Fundamentals', 'Adults',      'inst-1', 20, 'sport-bjj'),
  ('rt-6', 6, '10:00', 75, 'Advanced',     'Competition', 'inst-2', 20, 'sport-bjj')
on conflict do nothing;

-- Events
insert into events (id, title, type, date, time, duration_min, location, capacity, notes, registered_student_ids) values
  ('evt-001', 'Summer Open Mat',                       'open-mat',   '2026-06-07', '10:00', 120, 'Main Mat',          40, 'Free open mat for all levels.',                        '{s-1,s-2,s-3}'),
  ('evt-002', 'Quarterly Belt Test',                   'belt-test',  '2026-06-28', '10:00',  90, 'Main Mat',          20, 'Promotion grading for promotion-ready students.',      '{s-4,s-5}'),
  ('evt-003', 'Guard Passing Seminar — Prof. Carlos Lima', 'seminar','2026-07-12', '13:00', 180, 'Main Mat',          30, 'Special seminar on guard passing. R$150 per person.',  '{s-1,s-6}'),
  ('evt-004', 'City BJJ Open Championship',            'tournament', '2026-08-02', '08:00', 480, 'City Sports Arena', 60, 'IBJJF-format city championship. Weigh-ins at 08:00.',  '{s-2,s-7,s-8}'),
  ('evt-005', 'Spring Invitational Tournament',        'tournament', '2026-03-15', '09:00', 360, 'Riverside Sports Hall', 50, 'Internal invitational with 4 guest academies.',    '{s-1,s-2,s-3,s-4,s-5}')
on conflict do nothing;

-- Competition results
insert into competition_results (id, event_id, student_id, division, placement, medal, notes) values
  ('cr-1', 'evt-005', 's-1', 'Adult White Belt -70kg', '1st', 'gold',   'Won all 3 matches by points.'),
  ('cr-2', 'evt-005', 's-2', 'Adult Blue Belt -76kg',  '2nd', 'silver', 'Lost final by advantage.'),
  ('cr-3', 'evt-005', 's-3', 'Adult White Belt -76kg', '3rd', 'bronze', 'Won bronze match by rear naked choke.'),
  ('cr-4', 'evt-005', 's-4', 'Adult Blue Belt -82kg',  '1st', 'gold',   'Submitted all opponents.'),
  ('cr-5', 'evt-005', 's-5', 'Adult White Belt -82kg', '5th', 'none',   'Lost first match by points.')
on conflict do nothing;

-- Announcements
insert into announcements (id, title, body, pinned, created_at, expires_at) values
  ('ann-1', 'Summer Open Mat — June 7',
   'Join us for a free open mat session on Saturday June 7th at 10:00. All levels welcome.',
   true, '2026-05-28T10:00:00Z', '2026-06-08T00:00:00Z'),
  ('ann-2', 'Gi inspection at next grading',
   'Gis must comply with IBJJF standards for the upcoming grading session.',
   false, '2026-05-20T09:00:00Z', null)
on conflict do nothing;

-- Student injuries
insert into student_injuries (id, student_id, date, type, body_part, status, notes) values
  ('inj-1', 's-1', '2026-05-10', 'sprain',   'Left knee',      'active',    'Twisted during guard pass. Avoiding leg locks.'),
  ('inj-2', 's-2', '2026-04-22', 'soreness', 'Right shoulder', 'recovered', 'Rotator cuff soreness after competition. Cleared.'),
  ('inj-3', 's-3', '2026-05-18', 'bruise',   'Ribs',           'active',    'Took a hard knee during sparring. No fracture.')
on conflict do nothing;

-- Prospects
insert into prospects (id, name, contact, source, sport_id, status, trial_date, notes, created_at) values
  ('pr-1', 'Tiago Ferreira', 'tiago.f@gmail.com', 'instagram', 'sport-bjj', 'trial-attended',  '2026-05-10', 'Watched a highlight reel, very keen on comp training.',     '2026-05-08T10:00:00Z'),
  ('pr-2', 'Lena Brandt',    'lena.b@email.de',   'referral',  'sport-bjj', 'follow-up',       '2026-05-15', 'Referred by Miguel. Attended Monday Fundamentals.',          '2026-05-12T09:00:00Z'),
  ('pr-3', 'Carlos Mota',    'cmota@hotmail.com', 'walk-in',   'sport-bjj', 'trial-scheduled', '2026-06-02', 'Walked in off the street, confirmed trial for Monday.',      '2026-05-27T14:00:00Z'),
  ('pr-4', 'Rita Pinho',     'rita.pinho@me.com', 'google',    'sport-bjj', 'new',             null,         'Found us on Google Maps, asked about kids classes.',          '2026-05-29T08:30:00Z'),
  ('pr-5', 'Fábio Nunes',    'fabio@outlook.pt',  'event',     'sport-bjj', 'lost',            '2026-04-20', 'Met at city tournament, did trial but didn''t sign up.',     '2026-04-18T16:00:00Z')
on conflict do nothing;

-- Equipment
insert into equipment (id, category, name, qty, condition, notes) values
  ('eq-gi-a1', 'Loaner Gi',    'Gi A1 (XS)',              2,  'good', ''),
  ('eq-gi-a2', 'Loaner Gi',    'Gi A2 (S)',               3,  'good', ''),
  ('eq-gi-a3', 'Loaner Gi',    'Gi A3 (M)',               4,  'good', ''),
  ('eq-gi-a4', 'Loaner Gi',    'Gi A4 (L)',               2,  'fair', 'Two sets need re-stitching on collar'),
  ('eq-gi-a5', 'Loaner Gi',    'Gi A5 (XL)',              1,  'good', ''),
  ('eq-rg-s',  'Rash Guard',   'Rash Guard S',            2,  'good', ''),
  ('eq-rg-m',  'Rash Guard',   'Rash Guard M',            3,  'good', ''),
  ('eq-rg-l',  'Rash Guard',   'Rash Guard L',            2,  'fair', ''),
  ('eq-dummy', 'Training Gear','Grappling Dummy',          1,  'good', 'For solo drilling'),
  ('eq-pads',  'Training Gear','Focus Mitts (pair)',       4,  'good', ''),
  ('eq-shield','Training Gear','Body Shield',              2,  'fair', 'One has minor tear on handle'),
  ('eq-mat1',  'Mat',          'Roll-out mat section (2x1m)', 20, 'good', ''),
  ('eq-mat2',  'Mat',          'Crash pad',               2,  'good', ''),
  ('eq-tape',  'Supplies',     'Athletic tape (rolls)',   8,  'new',  'Restocked 2026-05-01'),
  ('eq-mg',    'Supplies',     'Mouth guard (sealed)',    5,  'new',  '')
on conflict do nothing;

-- Equipment loans
insert into equipment_loans (id, equipment_id, student_id, borrowed_at, returned_at, notes) values
  ('loan-1', 'eq-gi-a2', 's-4', '2026-04-20', null, 'Trial class loan'),
  ('loan-2', 'eq-gi-a3', 's-1', '2026-05-01', null, ''),
  ('loan-3', 'eq-rg-m',  's-3', '2026-05-05', null, '')
on conflict do nothing;

-- Class package types
insert into class_package_types (id, name, class_count, price, validity_days, active) values
  ('pkg-drop', 'Drop-in',       1,  15,  7, true),
  ('pkg-5',    'Starter Pack',  5,  40, 30, true),
  ('pkg-10',   '10-Class Pack', 10, 75, 60, true),
  ('pkg-20',   '20-Class Pack', 20, 130, 90, true)
on conflict do nothing;

-- Student packages
insert into student_packages (id, student_id, package_type_id, purchased_at, expires_at, classes_used) values
  ('sp-1', 's-1', 'pkg-10',   '2026-04-15', '2026-06-14', 4),
  ('sp-2', 's-3', 'pkg-20',   '2026-05-01', '2026-07-30', 6),
  ('sp-3', 's-4', 'pkg-5',    '2026-04-01', '2026-05-01', 5),
  ('sp-4', 's-4', 'pkg-drop', '2026-05-10', '2026-05-17', 0)
on conflict do nothing;

-- Discount codes
insert into discount_codes (id, code, type, value, max_uses, uses, expires_at, note, active) values
  ('dc-1', 'SUMMER20', 'percent', 20,  50,   12, '2026-08-31', 'Summer promotion',          true),
  ('dc-2', 'REFER10',  'fixed',   10,  null, 8,  null,         'Referral reward — €10 off', true),
  ('dc-3', 'FIRSTMO',  'percent', 100, 20,   20, '2026-06-30', 'First month free (maxed)',  false),
  ('dc-4', 'FAMILY15', 'percent', 15,  null, 5,  null,         'Family groups discount',    true)
on conflict do nothing;
