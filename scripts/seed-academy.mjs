#!/usr/bin/env node
// =============================================================================
// seed-academy.mjs — build a realistic tenant academy to browse.
//
// Tenant mode starts empty, so signing in lands you on blank screens. This
// creates (or refreshes) a full academy in the DEV project: team, students with
// belts and tags, a weekly schedule, ten weeks of class history with realistic
// attendance, promotions, and upcoming events.
//
// Every row uses a deterministic `sd-*` id and is upserted, so re-running is
// safe and non-destructive — it refreshes the seed without touching anything
// you added by hand.
//
//   node scripts/seed-academy.mjs
//   SEED_EMAIL=me@example.com SEED_PASSWORD=... node scripts/seed-academy.mjs
//
// Only seeds modules that are actually reachable in tenant mode (students,
// instructors, schedule, classes, events, curriculum, grading). Memberships,
// billing, discounts, analytics and competition are still 'soon' in the module
// registry, so data there would not render.
// =============================================================================

const URL  = process.env.SUPABASE_URL || 'https://ozxvvpfhhzgoapbpwida.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eHZ2cGZoaHpnb2FwYnB3aWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDcwOTMsImV4cCI6MjA5NjMyMzA5M30.DiwfPyjaFR3rkmsfYs26G5lN9W6v7tomCoRzbPk0LoM';

const EMAIL    = process.env.SEED_EMAIL    || 'coach@openmat.test';
const PASSWORD = process.env.SEED_PASSWORD || 'openmat1234';
const ACADEMY  = process.env.SEED_ACADEMY  || 'Iron Roots BJJ';

const SPORT   = 'sport-bjj';
const GRADING = 'grading-bjj-adult-default';

let TOKEN = null;
const H = () => ({
  apikey: ANON,
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
});

async function api(path, opts = {}) {
  const res = await fetch(`${URL}${path}`, { ...opts, headers: { ...H(), ...(opts.headers || {}) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

// Upsert on the primary key so re-runs refresh rather than duplicate.
async function put(table, rows, onConflict) {
  if (!rows.length) return;
  const q = onConflict ? `?on_conflict=${onConflict}` : '';
  const r = await api(`/rest/v1/${table}${q}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  });
  if (!r.ok) {
    console.error(`  ✗ ${table}: HTTP ${r.status}`, JSON.stringify(r.body).slice(0, 300));
    throw new Error(`seed failed at ${table}`);
  }
  console.log(`  ✓ ${table.padEnd(20)} ${rows.length}`);
}

// ---- auth -------------------------------------------------------------------
async function auth() {
  const signup = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  }).then(r => r.json());

  if (signup.access_token) { TOKEN = signup.access_token; return 'created'; }

  const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  }).then(r => r.json());

  if (!login.access_token) {
    throw new Error(`could not authenticate as ${EMAIL}: ${login.msg || login.error_description || JSON.stringify(login)}`);
  }
  TOKEN = login.access_token;
  return 'existing';
}

// ---- helpers ----------------------------------------------------------------
const DAY = 86400000;
// The app pins CONFIG.today to a fixed date (data.js) rather than the wall
// clock, so seed history has to be centred there or everything lands in the
// app's future and every "this week" panel reads empty.
const now = new Date(process.env.SEED_TODAY || '2026-05-12T12:00:00Z');
const iso = d => d.toISOString();
const day = d => d.toISOString().slice(0, 10);
const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
// Deterministic pseudo-random so repeat runs produce identical data.
let _s = 42;
const rand = () => (_s = (_s * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = arr => arr[Math.floor(rand() * arr.length)];

// Monday of the current week.
function weekStart(base = now) {
  const d = new Date(base);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---- cast -------------------------------------------------------------------
const TEAM = [
  { id: 'sd-inst-01', name: 'Rui Almeida',   role: 'head',   rate: 32, status: 'active'  },
  { id: 'sd-inst-02', name: 'Marta Costa',   role: 'coach',  rate: 26, status: 'active'  },
  { id: 'sd-inst-03', name: 'Tiago Ferreira',role: 'coach',  rate: 24, status: 'active'  },
  { id: 'sd-inst-04', name: 'Sofia Nunes',   role: 'coach',  rate: 22, status: 'pending' }
];

// belt, stripes, months since joining, attendance habit, tags
const ROSTER = [
  ['Ana Pereira',        'bjj-blue',   2, 34, 'regular',  ['adult', 'women']],
  ['André Carvalho',     'bjj-blue',   3, 31, 'regular',  ['adult', 'competition']],
  ['Beatriz Costa',      'bjj-white',  1, 14, 'casual',   ['adult', 'women']],
  ['Catarina Lima',      'bjj-white',  0,  5, 'regular',  ['adult', 'women']],
  ['Diogo Neves',        'bjj-purple', 1, 52, 'regular',  ['adult', 'competition']],
  ['Francisco Pires',    'bjj-white',  3, 19, 'casual',   ['adult']],
  ['Inês Rodrigues',     'bjj-blue',   1, 26, 'regular',  ['adult', 'women', 'competition']],
  ['João Martins',       'bjj-white',  2, 11, 'lapsed',   ['adult']],
  ['Leonor Sousa',       'bjj-white',  0,  3, 'regular',  ['adult', 'women']],
  ['Miguel Santos',      'bjj-brown',  2, 71, 'regular',  ['adult', 'competition']],
  ['Nuno Gonçalves',     'bjj-blue',   4, 29, 'casual',   ['adult']],
  ['Patrícia Alves',     'bjj-white',  1,  8, 'regular',  ['adult', 'women']],
  ['Ricardo Matos',      'bjj-purple', 3, 58, 'casual',   ['adult']],
  ['Sara Fonseca',       'bjj-white',  2, 16, 'lapsed',   ['adult', 'women']],
  ['Tomás Ribeiro',      'bjj-blue',   0, 23, 'regular',  ['adult', 'competition']],
  ['Vasco Marques',      'bjj-white',  4, 21, 'regular',  ['adult']],
  ['Carolina Dias',      'bjj-white',  1,  7, 'casual',   ['adult', 'women']],
  ['Bruno Teixeira',     'bjj-black',  0, 96, 'casual',   ['adult']],
  ['Helena Barbosa',     'bjj-blue',   2, 27, 'regular',  ['adult', 'women']],
  ['Rafael Moreira',     'bjj-white',  0,  2, 'regular',  ['adult']],
  ['Duarte Cunha',       'bjj-white',  1,  9, 'lapsed',   ['adult']],
  ['Mariana Rocha',      'bjj-purple', 0, 47, 'regular',  ['adult', 'women', 'competition']],
  ['Gonçalo Faria',      'bjj-white',  2, 13, 'regular',  ['kid']],
  ['Matilde Correia',    'bjj-white',  1,  6, 'regular',  ['kid']]
];

// dow, time, type, instructor, capacity, audience
const SCHEDULE = [
  [1, '18:00', 'Fundamentals', 'sd-inst-01', 24, 'all'],
  [1, '19:30', 'Advanced',     'sd-inst-02', 18, 'all'],
  [2, '18:00', 'Fundamentals', 'sd-inst-03', 24, 'all'],
  [2, '17:00', 'Kids',         'sd-inst-02', 14, 'kids'],
  [3, '18:00', 'Fundamentals', 'sd-inst-01', 24, 'all'],
  [3, '19:30', 'No-Gi',        'sd-inst-02', 20, 'all'],
  [4, '18:00', 'Fundamentals', 'sd-inst-03', 24, 'all'],
  [4, '17:00', 'Kids',         'sd-inst-02', 14, 'kids'],
  [5, '19:00', 'Competition',  'sd-inst-01', 16, 'all'],
  [6, '10:00', 'Open Mat',     'sd-inst-01', 30, 'all']
];

const ATTEND_RATE = { regular: 0.82, casual: 0.42, lapsed: 0.15 };

// =============================================================================
async function main() {
  console.log(`\nSeeding "${ACADEMY}" into ${URL}\n`);

  const mode = await auth();
  console.log(`  ✓ signed in as ${EMAIL} (${mode} account)`);

  // Reuse the academy if this account already has one by that name.
  const found = await api(`/rest/v1/academies?select=id,name&name=eq.${encodeURIComponent(ACADEMY)}`);
  let aid = found.ok && found.body?.length ? found.body[0].id : null;
  if (aid) {
    console.log(`  ✓ reusing existing academy ${aid}`);
  } else {
    const r = await api('/rest/v1/rpc/create_academy', {
      method: 'POST',
      body: JSON.stringify({ p_name: ACADEMY, p_full_name: 'Marco Raposo' })
    });
    if (!r.ok) throw new Error(`create_academy failed: ${JSON.stringify(r.body)}`);
    aid = r.body;
    console.log(`  ✓ created academy ${aid}`);
  }

  console.log('\nseeding:');

  // ---- modules: turn on everything that is actually built ------------------
  const MODULES = ['students', 'settings', 'instructors', 'schedule', 'classes',
                   'events', 'curriculum', 'grading'];
  await put('academy_features', MODULES.map(m => ({
    academy_id: aid, module_id: m, enabled: true, updated_at: iso(now)
  })), 'academy_id,module_id');

  // ---- sport ---------------------------------------------------------------
  await put('academy_sports', [{ academy_id: aid, sport_id: SPORT }], 'academy_id,sport_id');

  // ---- team ----------------------------------------------------------------
  await put('instructors', TEAM.map(i => ({
    id: i.id, academy_id: aid, name: i.name, initials: initials(i.name),
    sport_ids: [SPORT], pay_rate: i.rate, teaches: true, status: i.status,
    email: i.name.toLowerCase().split(' ')[0] + '@ironroots.test'
  })));

  // ---- students + enrollments ---------------------------------------------
  const students = ROSTER.map(([name, belt, stripes, months, habit, tags], n) => {
    const id = `sd-stu-${String(n + 1).padStart(2, '0')}`;
    const joined = new Date(now.getTime() - months * 30.4 * DAY);
    const first = name.toLowerCase().split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '');
    return {
      id, academy_id: aid, name, initials: initials(name),
      joined_at: day(joined),
      contact: `${first}@example.com`,
      phone: `+3519${Math.floor(10000000 + rand() * 89999999)}`,
      dob: day(new Date(now.getTime() - (18 + Math.floor(rand() * 22)) * 365 * DAY)),
      weight_kg: Math.round(58 + rand() * 42),
      gender: tags.includes('women') ? 'female' : 'male',
      competes: tags.includes('competition'),
      tags, inactive: false,
      _belt: belt, _stripes: stripes, _habit: habit, _joined: joined
    };
  });

  await put('students', students.map(({ _belt, _stripes, _habit, _joined, ...s }) => s));

  await put('enrollments', students.map(s => ({
    id: `sd-enr-${s.id.slice(-2)}`,
    academy_id: aid, student_id: s.id, sport_id: SPORT,
    grading_system_id: GRADING,
    current_level_id: s._belt,
    current_stripes: s._stripes,
    level_since: day(new Date(now.getTime() - (60 + rand() * 400) * DAY)),
    membership: pick(['unlimited', 'unlimited', '2x-week', 'kids'])
  })), 'student_id,sport_id');

  // ---- weekly schedule -----------------------------------------------------
  await put('recurring_templates', SCHEDULE.map(([dow, time, type, inst, cap, aud], n) => ({
    id: `sd-tpl-${String(n + 1).padStart(2, '0')}`,
    academy_id: aid, dow, time, duration_min: type === 'Kids' ? 45 : 60,
    class_type: type, audience: aud, audience_tags: aud === 'kids' ? ['kid'] : [],
    instructor_id: inst, capacity: cap, sport_id: SPORT
  })));

  // ---- classes: 6 weeks back, 2 forward -------------------------------------
  // Kept deliberately short: tHydrate does not paginate, so PostgREST's default
  // 1000-row ceiling silently truncates bookings/attendance beyond that.
  const thisMon = weekStart();
  const classes = [];
  for (let w = -6; w <= 2; w++) {
    const mon = new Date(thisMon.getTime() + w * 7 * DAY);
    SCHEDULE.forEach(([dow, time, type, inst, cap], n) => {
      const d = new Date(mon);
      d.setDate(d.getDate() + ((dow + 6) % 7));
      const [hh, mm] = time.split(':').map(Number);
      d.setHours(hh, mm, 0, 0);
      // A couple of realistic cancellations in the past.
      const cancelled = w === -6 && dow === 6;
      classes.push({
        id: `sd-cls-${w < 0 ? 'm' : 'p'}${Math.abs(w)}-${n + 1}`,
        academy_id: aid, sport_id: SPORT, instructor_id: inst,
        starts_at: iso(d), duration_min: type === 'Kids' ? 45 : 60,
        class_type: type, capacity: cap,
        status: cancelled ? 'cancelled' : (d < now ? 'completed' : 'scheduled'),
        _past: d < now, _type: type
      });
    });
  }
  await put('classes', classes.map(({ _past, _type, ...c }) => c));

  // ---- bookings + attendance ----------------------------------------------
  const bookings = [], attendance = [];
  for (const c of classes) {
    if (c.status === 'cancelled') continue;
    const kids = c._type === 'Kids';
    for (const s of students) {
      const isKid = s.tags.includes('kid');
      if (kids !== isKid) continue;                       // kids only in kids classes
      if (c._type === 'Competition' && !s.competes) continue;
      if (new Date(c.starts_at) < s._joined) continue;    // not a member yet

      let p = ATTEND_RATE[s._habit];
      // Lapsed students taper off over the last two months.
      if (s._habit === 'lapsed' && (now - new Date(c.starts_at)) < 60 * DAY) p = 0.02;
      if (rand() > p) continue;

      bookings.push({
        id: `sd-bk-${c.id}-${s.id.slice(-2)}`,
        academy_id: aid, class_id: c.id, student_id: s.id,
        status: 'booked', booked_at: iso(new Date(new Date(c.starts_at).getTime() - 2 * DAY))
      });
      if (c._past) {
        const showed = rand() < 0.9;                      // small no-show rate
        attendance.push({
          id: `sd-at-${c.id}-${s.id.slice(-2)}`,
          academy_id: aid, class_id: c.id, student_id: s.id,
          attended: showed, confirmed_at: showed ? c.starts_at : null
        });
      }
    }
  }
  // Chunked: these are the big tables.
  for (let i = 0; i < bookings.length; i += 400)  await put('bookings',   bookings.slice(i, i + 400),   'class_id,student_id');
  for (let i = 0; i < attendance.length; i += 400) await put('attendance', attendance.slice(i, i + 400), 'class_id,student_id');

  // ---- promotion history ---------------------------------------------------
  const BELT_ORDER = ['bjj-white', 'bjj-blue', 'bjj-purple', 'bjj-brown', 'bjj-black'];
  const grading = [];
  students.forEach((s, n) => {
    const idx = BELT_ORDER.indexOf(s._belt);
    // One promotion per belt earned, oldest first.
    for (let b = 1; b <= idx; b++) {
      grading.push({
        id: `sd-gl-${s.id.slice(-2)}-p${b}`,
        academy_id: aid, student_id: s.id, sport_id: SPORT, type: 'promotion',
        level_id: BELT_ORDER[b], stripes: 0,
        date: day(new Date(now.getTime() - (idx - b + 1) * 420 * DAY)),
        note: `Promoted to ${BELT_ORDER[b].replace('bjj-', '')}`
      });
    }
    // Recent stripes at the current belt.
    for (let st = 1; st <= s._stripes; st++) {
      grading.push({
        id: `sd-gl-${s.id.slice(-2)}-s${st}`,
        academy_id: aid, student_id: s.id, sport_id: SPORT, type: 'stripe',
        level_id: s._belt, stripes: st,
        date: day(new Date(now.getTime() - (s._stripes - st + 1) * 110 * DAY)),
        note: null
      });
    }
  });
  await put('grading_log', grading);

  // ---- events --------------------------------------------------------------
  const compIds = students.filter(s => s.competes).map(s => s.id);
  await put('events', [
    { id: 'sd-ev-01', academy_id: aid, title: 'Lisbon Open — IBJJF', type: 'tournament',
      date: day(new Date(now.getTime() + 26 * DAY)), time: '09:00', location: 'Pavilhão Casal Vistoso',
      capacity: 20, registered_student_ids: compIds.slice(0, 5),
      notes: 'Registration closes two weeks before. Gi only.' },
    { id: 'sd-ev-02', academy_id: aid, title: 'Leg Lock Seminar — guest black belt', type: 'seminar',
      date: day(new Date(now.getTime() + 12 * DAY)), time: '14:00', location: 'Main mat',
      capacity: 30, registered_student_ids: compIds.slice(0, 3), notes: 'No-gi. €40 for members.' },
    { id: 'sd-ev-03', academy_id: aid, title: 'Autumn Belt Test', type: 'belt-test',
      date: day(new Date(now.getTime() + 40 * DAY)), time: '18:00', location: 'Main mat',
      capacity: null, registered_student_ids: [], notes: 'Fundamentals syllabus.' },
    { id: 'sd-ev-04', academy_id: aid, title: 'Open Mat — all levels', type: 'open-mat',
      date: day(new Date(now.getTime() + 5 * DAY)), time: '10:00', location: 'Main mat',
      capacity: 40, registered_student_ids: [], notes: 'Visitors welcome.' },
    { id: 'sd-ev-05', academy_id: aid, title: 'Porto Winter Cup', type: 'tournament',
      date: day(new Date(now.getTime() - 34 * DAY)), time: '09:00', location: 'Porto',
      capacity: 20, registered_student_ids: compIds.slice(0, 4), notes: 'Past event.' }
  ]);

  // ---- announcements -------------------------------------------------------
  await put('announcements', [
    { id: 'sd-an-01', academy_id: aid, title: 'Gi wash reminder',
      body: 'Please wash your gi after every session. No exceptions — it is a health issue for everyone on the mat.',
      pinned: true, expires_at: null },
    { id: 'sd-an-02', academy_id: aid, title: 'Friday competition class moved to 19:00',
      body: 'From this week the competition class starts thirty minutes later so people can get here from work.',
      pinned: false, expires_at: iso(new Date(now.getTime() + 21 * DAY)) },
    { id: 'sd-an-03', academy_id: aid, title: 'Seminar spots are filling up',
      body: 'The leg lock seminar has ten places left. Sign up at the front desk.',
      pinned: false, expires_at: iso(new Date(now.getTime() + 12 * DAY)) }
  ]);

  // ---- summary -------------------------------------------------------------
  const past = classes.filter(c => c._past && c.status !== 'cancelled').length;
  console.log(`
Done.

  Academy    ${ACADEMY}  (${aid})
  Sign in    ${EMAIL}  /  ${PASSWORD}
  Open       http://localhost:8099/admin.html

  ${students.length} students · ${TEAM.length} team · ${classes.length} classes (${past} completed)
  ${bookings.length} bookings · ${attendance.length} attendance records
  ${grading.length} promotions/stripes · 5 events · 3 announcements

Re-running refreshes the same rows — it will not duplicate.
`);
}

main().catch(e => { console.error('\n✗', e.message, '\n'); process.exit(1); });
