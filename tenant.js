// =============================================================================
// tenant.js — multi-tenant context + data layer for the admin app
// -----------------------------------------------------------------------------
// Loaded after supabase-client.js and data.js. In "tenant mode" (a logged-in
// user opening their academy) it hydrates the in-memory globals (STUDENTS,
// ENROLLMENTS, …) from Supabase for the active academy, so the existing
// synchronous screens render unchanged, and write-through helpers persist
// mutations back to Supabase. In "demo mode" (no session, or the /demo path)
// nothing here runs and the app keeps using data.js untouched.
//
// Phase 1 scope: Students (+ enrollments). Other modules are emptied so demo
// data never leaks into a real academy; they're cut over in later phases.
// =============================================================================

const TENANT = { mode: 'demo', academyId: null, role: null, academyName: null, userId: null, academies: [] };
function isTenant() { return TENANT.mode === 'tenant'; }
function activeAcademyId() { return TENANT.academyId; }

// Per-academy module overrides loaded from academy_features. Keyed by module_id
// → boolean. Absence of a key = registry default (see isModuleEnabled). Empty
// until tHydrate runs, and stays empty if the table/migration isn't there yet.
const ENABLED_FEATURES = {};
let FEATURES_LOADED = false; // true once academy_features has been read (rows or not)

// Resolve tenant vs demo. Demo path (/demo) always stays the showcase.
async function initTenant() {
  try {
    if (/\/demo(\b|\/|$)/.test(location.pathname)) return TENANT;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return TENANT;
    TENANT.userId = session.user.id;
    const { data: mems, error } = await sb
      .from('academy_members').select('academy_id, role, academies(name)');
    if (error) { console.error('[tenant] membership load:', error); return TENANT; }
    if (!mems || !mems.length) { location.href = '/app'; return TENANT; } // no academy → onboard
    let aid = null; try { aid = localStorage.getItem('tatami_active_academy'); } catch {}
    const m = mems.find(x => x.academy_id === aid) || mems[0];
    TENANT.mode = 'tenant';
    TENANT.academyId = m.academy_id;
    TENANT.role = m.role;
    TENANT.academyName = (m.academies && m.academies.name) || 'My Academy';
    TENANT.academies = mems.map(x => ({ id: x.academy_id, role: x.role, name: (x.academies && x.academies.name) || 'My Academy' }));
    // Point the app's academy identity at the real tenant.
    if (typeof ACADEMY !== 'undefined') { ACADEMY.id = m.academy_id; ACADEMY.name = TENANT.academyName; }
  } catch (e) { console.error('[tenant] init:', e); }
  return TENANT;
}

// ---- snake_case (DB) <-> camelCase (in-memory) mappers ---------------------
function studentFromDb(r) {
  return {
    id: r.id, name: r.name, initials: r.initials, dob: r.dob,
    weightKg: r.weight_kg, joinedAt: r.joined_at, contact: r.contact,
    referredBy: r.referred_by, gender: r.gender, competes: !!r.competes,
    tags: r.tags || [], inactive: !!r.inactive, phone: r.phone,
    emergencyContact: r.emergency_contact, notes: r.notes
  };
}
function studentToDb(s) {
  return {
    id: s.id, name: s.name, initials: s.initials, dob: s.dob || null,
    weight_kg: s.weightKg ?? null, joined_at: (s.joinedAt || new Date().toISOString().slice(0, 10)),
    contact: s.contact || null, referred_by: s.referredBy || null,
    gender: s.gender || null, competes: !!s.competes, tags: s.tags || [],
    inactive: !!s.inactive, phone: s.phone || null,
    emergency_contact: s.emergencyContact || null, notes: s.notes || null,
    academy_id: TENANT.academyId
  };
}
function enrollmentFromDb(r) {
  return {
    id: r.id, studentId: r.student_id, sportId: r.sport_id,
    gradingSystemId: r.grading_system_id, currentLevelId: r.current_level_id,
    currentStripes: r.current_stripes, levelSince: r.level_since,
    lastPromotionAt: r.last_promotion_at, membership: r.membership
  };
}
function enrollmentToDb(e) {
  return {
    id: e.id, student_id: e.studentId, sport_id: e.sportId,
    grading_system_id: e.gradingSystemId, current_level_id: e.currentLevelId,
    current_stripes: e.currentStripes ?? 0, level_since: e.levelSince || new Date().toISOString().slice(0, 10),
    last_promotion_at: e.lastPromotionAt || null, membership: e.membership || null,
    academy_id: TENANT.academyId
  };
}

function instructorFromDb(r) {
  return { id: r.id, name: r.name, initials: r.initials, sportIds: r.sport_ids || [],
    payRate: r.pay_rate, status: r.status || 'active', teaches: r.teaches !== false,
    userId: r.user_id || null, email: r.email || null };
}
// team_directory (migration 020) — what an instructor may see: no pay_rate,
// no email. Same in-memory shape so the schedule screens are unchanged.
function instructorFromDirectory(r) {
  return { id: r.id, name: r.name, initials: r.initials, sportIds: r.sport_ids || [],
    payRate: null, status: r.status || 'active', teaches: r.teaches !== false,
    userId: null, email: null };
}
function instructorToDb(i) {
  return { id: i.id, name: i.name, initials: i.initials, sport_ids: i.sportIds || [],
    pay_rate: i.payRate ?? null, academy_id: TENANT.academyId,
    status: i.status || 'active', teaches: i.teaches !== false };
}
function templateFromDb(r) {
  return { id: r.id, dow: r.dow, time: r.time, durationMin: r.duration_min, classType: r.class_type,
    audience: r.audience, audienceTags: r.audience_tags || [], instructorId: r.instructor_id,
    capacity: r.capacity, sportId: r.sport_id };
}
function templateToDb(t) {
  return { id: t.id, dow: t.dow, time: t.time, duration_min: t.durationMin ?? 60, class_type: t.classType,
    audience: t.audience || null, audience_tags: t.audienceTags || [], instructor_id: t.instructorId || null,
    capacity: t.capacity ?? 20, sport_id: t.sportId || 'sport-bjj', academy_id: TENANT.academyId };
}
function classFromDb(r) {
  return { id: r.id, sportId: r.sport_id, instructorId: r.instructor_id, startsAt: r.starts_at,
    durationMin: r.duration_min, classType: r.class_type, capacity: r.capacity,
    plannedItemIds: r.planned_item_ids || [], status: r.status, audienceTags: r.audience_tags || [] };
}
function classToDb(c) {
  return { id: c.id, sport_id: c.sportId || 'sport-bjj', instructor_id: c.instructorId || null,
    starts_at: c.startsAt, duration_min: c.durationMin ?? 60, class_type: c.classType,
    capacity: c.capacity ?? 20, planned_item_ids: c.plannedItemIds || [], status: c.status || 'scheduled',
    audience_tags: c.audienceTags || [], academy_id: TENANT.academyId };
}

function bookingFromDb(r) {
  return { id: r.id, classId: r.class_id, studentId: r.student_id, status: r.status, bookedAt: r.booked_at };
}
function bookingToDb(b) {
  return { id: b.id, class_id: b.classId, student_id: b.studentId, status: b.status || 'booked',
    booked_at: b.bookedAt || new Date().toISOString(), academy_id: TENANT.academyId };
}
function attendanceFromDb(r) {
  return { id: r.id, classId: r.class_id, studentId: r.student_id, attended: !!r.attended, markedAt: r.confirmed_at };
}
function attendanceToDb(a) {
  return { id: a.id || ('at-' + a.classId + '-' + a.studentId), class_id: a.classId, student_id: a.studentId,
    attended: !!a.attended, confirmed_at: a.markedAt || new Date().toISOString(), academy_id: TENANT.academyId };
}
function waitlistFromDb(r) {
  return { id: r.id, classId: r.class_id, studentId: r.student_id, addedAt: r.queued_at };
}
function waitlistToDb(w) {
  return { id: w.id, class_id: w.classId, student_id: w.studentId,
    queued_at: w.addedAt || new Date().toISOString(), academy_id: TENANT.academyId };
}
function gradingLogFromDb(r) {
  return { id: r.id, studentId: r.student_id, sportId: r.sport_id, type: r.type,
    levelId: r.level_id, stripes: r.stripes, date: r.date, note: r.note };
}
function gradingLogToDb(g) {
  return { id: g.id, student_id: g.studentId, sport_id: g.sportId, type: g.type,
    level_id: g.levelId, stripes: g.stripes ?? null, date: g.date || new Date().toISOString().slice(0, 10),
    note: g.note || null, academy_id: TENANT.academyId };
}
function eventFromDb(r) {
  return { id: r.id, title: r.title, type: r.type, date: r.date, time: r.time, durationMin: r.duration_min,
    location: r.location, capacity: r.capacity, notes: r.notes, registeredStudentIds: r.registered_student_ids || [],
    source: r.source, externalUrl: r.external_url, externalId: r.external_id, image: r.image, createdAt: r.created_at };
}
function eventToDb(e) {
  return { id: e.id, title: e.title, type: e.type, date: e.date || null, time: e.time || null,
    duration_min: e.durationMin ?? null, location: e.location || null, capacity: e.capacity ?? null,
    notes: e.notes || null, registered_student_ids: e.registeredStudentIds || [], source: e.source || null,
    external_url: e.externalUrl || null, external_id: e.externalId || null, image: e.image || null,
    academy_id: TENANT.academyId };
}
function compResultFromDb(r) {
  return { id: r.id, eventId: r.event_id, studentId: r.student_id, division: r.division,
    placement: r.placement, medal: r.medal, notes: r.notes, loggedAt: r.logged_at };
}
function compResultToDb(c) {
  return { id: c.id, event_id: c.eventId, student_id: c.studentId, division: c.division || null,
    placement: c.placement || null, medal: c.medal || null, notes: c.notes || null,
    logged_at: c.loggedAt || new Date().toISOString(), academy_id: TENANT.academyId };
}

function _replace(arr, rows) { if (Array.isArray(arr)) { arr.length = 0; rows.forEach(r => arr.push(r)); } }
function _empty(arr) { if (Array.isArray(arr)) arr.length = 0; }

// Load the academy's data into the in-memory globals. Phase 1: students +
// enrollments; everything else starts empty (no demo data in a real academy).
async function tHydrate() {
  if (!isTenant()) return;
  const aid = TENANT.academyId;
  const [stu, enr, inst, tpl, cls, bk, att, wl, gl, ev, cr] = await Promise.all([
    sb.from('students').select('*').eq('academy_id', aid),
    sb.from('enrollments').select('*').eq('academy_id', aid),
    // instructors is admin-only after 020 (it carries pay_rate); instructors
    // read the same roster through team_directory, which omits pay and email.
    (tIsAdmin()
      ? sb.from('instructors').select('*').eq('academy_id', aid)
      : sb.from('team_directory').select('*').eq('academy_id', aid)),
    sb.from('recurring_templates').select('*').eq('academy_id', aid),
    sb.from('classes').select('*').eq('academy_id', aid),
    sb.from('bookings').select('*').eq('academy_id', aid),
    sb.from('attendance').select('*').eq('academy_id', aid),
    sb.from('waitlist').select('*').eq('academy_id', aid),
    sb.from('grading_log').select('*').eq('academy_id', aid),
    sb.from('events').select('*').eq('academy_id', aid),
    sb.from('competition_results').select('*').eq('academy_id', aid)
  ]);
  if (typeof STUDENTS !== 'undefined')            _replace(STUDENTS, (stu.data || []).map(studentFromDb));
  if (typeof ENROLLMENTS !== 'undefined')         _replace(ENROLLMENTS, (enr.data || []).map(enrollmentFromDb));
  if (typeof INSTRUCTORS !== 'undefined')         _replace(INSTRUCTORS, (inst.data || []).map(tIsAdmin() ? instructorFromDb : instructorFromDirectory));
  if (typeof RECURRING_TEMPLATES !== 'undefined') _replace(RECURRING_TEMPLATES, (tpl.data || []).map(templateFromDb));
  if (typeof CLASSES !== 'undefined')             _replace(CLASSES, (cls.data || []).map(classFromDb));
  if (typeof BOOKINGS !== 'undefined')            _replace(BOOKINGS, (bk.data || []).map(bookingFromDb));
  if (typeof ATTENDANCE !== 'undefined')          _replace(ATTENDANCE, (att.data || []).map(attendanceFromDb));
  if (typeof WAITLIST !== 'undefined')            _replace(WAITLIST, (wl.data || []).map(waitlistFromDb));
  if (typeof GRADING_LOG !== 'undefined')         _replace(GRADING_LOG, (gl.data || []).map(gradingLogFromDb));
  if (typeof EVENTS !== 'undefined')              _replace(EVENTS, (ev.data || []).map(eventFromDb));
  if (typeof COMPETITION_RESULTS !== 'undefined') _replace(COMPETITION_RESULTS, (cr.data || []).map(compResultFromDb));
  // Not-yet-cut modules: empty so demo data doesn't appear in a real academy.
  ['ANNOUNCEMENTS','STUDENT_INJURIES','PROSPECTS','EQUIPMENT','EQUIPMENT_LOANS',
   'STUDENT_PACKAGES','FAMILY_GROUPS'].forEach(n => { try { _empty(eval(n)); } catch {} });
  await tLoadFeatures();
}

// Generic write-through for an already-DB-shaped row (academy_id attached).
async function tInsertDb(table, dbRow) {
  if (!isTenant()) return { ok: true };
  const r = await sb.from(table).insert(dbRow);
  if (r.error) console.error(`[tenant] insert ${table}:`, r.error);
  return { ok: !r.error, error: r.error };
}
async function tUpsertDb(table, dbRow) {
  if (!isTenant()) return { ok: true };
  const r = await sb.from(table).upsert(dbRow);
  if (r.error) console.error(`[tenant] upsert ${table}:`, r.error);
  return { ok: !r.error, error: r.error };
}
async function tSaveInstructor(i) { return tInsertDb('instructors', instructorToDb(i)); }
async function tSaveTemplate(t)   { return tUpsertDb('recurring_templates', templateToDb(t)); }
async function tSaveClass(c)      { return tInsertDb('classes', classToDb(c)); }

// Ensure a class instance exists in the DB before booking/attendance reference
// it (handles slots created in-memory). Idempotent upsert on the class PK.
async function tEnsureClass(classId) {
  if (!isTenant()) return;
  const c = (typeof DB !== 'undefined') ? DB.class(classId) : null;
  if (c) await sb.from('classes').upsert(classToDb(c));
}
async function tSaveBooking(b) {
  if (!isTenant()) return { ok: true };
  await tEnsureClass(b.classId);
  const r = await sb.from('bookings').upsert(bookingToDb(b), { onConflict: 'class_id,student_id' });
  if (r.error) console.error('[tenant] booking:', r.error);
  return { ok: !r.error, error: r.error };
}
async function tSaveAttendance(a) {
  if (!isTenant()) return { ok: true };
  await tEnsureClass(a.classId);
  const r = await sb.from('attendance').upsert(attendanceToDb(a), { onConflict: 'class_id,student_id' });
  if (r.error) console.error('[tenant] attendance:', r.error);
  return { ok: !r.error, error: r.error };
}
async function tSaveWaitlist(w) {
  if (!isTenant()) return { ok: true };
  await tEnsureClass(w.classId);
  const r = await sb.from('waitlist').upsert(waitlistToDb(w), { onConflict: 'class_id,student_id' });
  if (r.error) console.error('[tenant] waitlist:', r.error);
  return { ok: !r.error, error: r.error };
}
async function tDeleteWaitlist(classId, studentId) {
  if (!isTenant()) return;
  await sb.from('waitlist').delete().eq('class_id', classId).eq('student_id', studentId).eq('academy_id', TENANT.academyId);
}
async function tInsertGradingLog(entry) { return tInsertDb('grading_log', gradingLogToDb(entry)); }
async function tSaveEvent(e) { return tUpsertDb('events', eventToDb(e)); }
async function tDeleteEvent(id) { if (!isTenant()) return; await sb.from('events').delete().eq('id', id).eq('academy_id', TENANT.academyId); }
async function tInsertCompResult(c) { return tInsertDb('competition_results', compResultToDb(c)); }

// ---- Write-through helpers (no-ops in demo mode) ---------------------------
async function tSaveNewStudent(student, enrollment) {
  if (!isTenant()) return { ok: true };
  const s = await sb.from('students').insert(studentToDb(student));
  if (s.error) { console.error('[tenant] insert student:', s.error); return { ok: false, error: s.error }; }
  if (enrollment) {
    const e = await sb.from('enrollments').insert(enrollmentToDb(enrollment));
    if (e.error) { console.error('[tenant] insert enrollment:', e.error); return { ok: false, error: e.error }; }
  }
  return { ok: true };
}
async function tUpdateStudent(id, patchInMemoryShape) {
  if (!isTenant()) return { ok: true };
  // translate camel patch keys to db columns
  const map = { weightKg:'weight_kg', joinedAt:'joined_at', referredBy:'referred_by',
    emergencyContact:'emergency_contact' };
  const db = {};
  Object.entries(patchInMemoryShape).forEach(([k, v]) => { db[map[k] || k] = v; });
  const r = await sb.from('students').update(db).eq('id', id).eq('academy_id', TENANT.academyId);
  if (r.error) console.error('[tenant] update student:', r.error);
  return { ok: !r.error, error: r.error };
}
async function tUpdateEnrollment(studentId, patchInMemoryShape) {
  if (!isTenant()) return { ok: true };
  const map = { gradingSystemId:'grading_system_id', currentLevelId:'current_level_id',
    currentStripes:'current_stripes', levelSince:'level_since', lastPromotionAt:'last_promotion_at',
    sportId:'sport_id' };
  const db = {};
  Object.entries(patchInMemoryShape).forEach(([k, v]) => { db[map[k] || k] = v; });
  const r = await sb.from('enrollments').update(db).eq('student_id', studentId).eq('academy_id', TENANT.academyId);
  if (r.error) console.error('[tenant] update enrollment:', r.error);
  return { ok: !r.error, error: r.error };
}

async function tenantSignOut() { try { await sb.auth.signOut(); } catch {} location.href = '/app'; }

// Create a one-time student invite and return a shareable /join link. Demo mode
// returns { demo:true } so the caller can fall back to the demo deep-link.
async function tCreateStudentInvite(studentId) {
  if (!isTenant()) return { ok: false, demo: true };
  const token = (self.crypto && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, '')
    : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
  const r = await sb.from('student_invites').insert({
    token, academy_id: TENANT.academyId, student_id: studentId,
    created_by: TENANT.userId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  if (r.error) { console.error('[tenant] create invite (run migration 015?):', r.error); return { ok: false, error: r.error }; }
  return { ok: true, token, url: location.origin + '/join#token=' + token };
}

// Switch the active academy: persist the choice and reload so tHydrate re-runs.
function switchAcademy(id) {
  if (!id || id === TENANT.academyId) return;
  try { localStorage.setItem('tatami_active_academy', id); } catch {}
  location.reload();
}

// =============================================================================
// P3 — per-academy module system
// -----------------------------------------------------------------------------
// MODULE_REGISTRY is the single source of truth for the tenant module catalogue.
//   base    — mandatory, always on, can't be turned off (People, Settings).
//   status  — 'available' (cut over, toggleable) | 'soon' (not built yet, shown
//             disabled in Settings, never reachable).
//   requires — other module ids that must be on for this one to be on (enforced
//             both ways: enabling pulls prerequisites on, disabling cascades to
//             dependents).
// Sub-routes (wizard/detail pages) aren't modules; they inherit their parent's
// enabled state via TENANT_SUBROUTES below.
// =============================================================================
const MODULE_REGISTRY = [
  { id: 'students',    label: 'Students',     group: 'People',      base: true,  status: 'available', requires: [] },
  { id: 'settings',    label: 'Settings',     group: 'People',      base: true,  status: 'available', requires: [] },
  { id: 'instructors', label: 'Instructors',  group: 'People',      base: false, status: 'available', requires: [] },
  { id: 'schedule',    label: 'Schedule',     group: 'Schedule',    base: false, status: 'available', requires: [] },
  { id: 'classes',     label: 'Classes',      group: 'Schedule',    base: false, status: 'available', requires: [] },
  { id: 'events',      label: 'Events',       group: 'Schedule',    base: false, status: 'available', requires: [] },
  { id: 'curriculum',  label: 'Curriculum',   group: 'Programme',   base: false, status: 'available', requires: [] },
  { id: 'grading',     label: 'Grading',      group: 'Programme',   base: false, status: 'available', requires: [] },
  // ---- coming soon (declare deps now so the framework is exercised) ----
  { id: 'families',      label: 'Families',      group: 'People',      base: false, status: 'soon', requires: [] },
  { id: 'memberships',   label: 'Memberships',   group: 'Finance',     base: false, status: 'soon', requires: [] },
  { id: 'discounts',     label: 'Discounts',     group: 'Finance',     base: false, status: 'soon', requires: ['memberships'] },
  { id: 'billing',       label: 'Billing',       group: 'Finance',     base: false, status: 'soon', requires: ['memberships'] },
  { id: 'competition',   label: 'Competition',   group: 'Competition', base: false, status: 'soon', requires: ['events'] },
  { id: 'analytics',     label: 'Analytics',     group: 'Insights',    base: false, status: 'soon', requires: [] },
  { id: 'attendance-log',label: 'Attendance Log',group: 'Insights',    base: false, status: 'soon', requires: ['classes'] },
  { id: 'ratings',       label: 'Feedback',      group: 'Insights',    base: false, status: 'soon', requires: [] },
  { id: 'goals',         label: 'Goals',         group: 'Insights',    base: false, status: 'soon', requires: [] },
  { id: 'announcements', label: 'Announcements', group: 'Comms',       base: false, status: 'soon', requires: [] },
];
// Sub-route → owning module. A sub-route is reachable iff its parent is enabled.
const TENANT_SUBROUTES = {
  'curriculum-wizard': 'curriculum', 'curriculum-tech': 'curriculum',
  'promotion-rules': 'curriculum', 'templates': 'schedule', 'closures': 'schedule',
};
function moduleMeta(id) { return MODULE_REGISTRY.find(m => m.id === id) || null; }
function moduleResolve(id) { return TENANT_SUBROUTES[id] || id; }

// Is a module on for the active academy? base → always; soon → never; otherwise
// the explicit academy_features override, defaulting to ON for available modules.
function isModuleEnabled(id) {
  const meta = moduleMeta(moduleResolve(id));
  if (!meta) return false;                 // not a tenant module (demo-only)
  if (meta.base) return true;
  if (meta.status === 'soon') return false;
  if (Object.prototype.hasOwnProperty.call(ENABLED_FEATURES, meta.id)) return !!ENABLED_FEATURES[meta.id];
  return true;                             // available modules default on
}
// Modules eligible to appear as toggles in Settings (everything except mandatory).
function toggleableModules() { return MODULE_REGISTRY.filter(m => !m.base); }

// Load the academy's overrides. Tolerant: a missing table (pre-migration) just
// leaves ENABLED_FEATURES empty → defaults apply, nothing breaks.
async function tLoadFeatures() {
  if (!isTenant()) return;
  Object.keys(ENABLED_FEATURES).forEach(k => delete ENABLED_FEATURES[k]);
  const r = await sb.from('academy_features').select('module_id, enabled').eq('academy_id', TENANT.academyId);
  if (r.error) { console.warn('[tenant] academy_features load (run migration 013?):', r.error.message); FEATURES_LOADED = false; return; }
  (r.data || []).forEach(row => { ENABLED_FEATURES[row.module_id] = !!row.enabled; });
  FEATURES_LOADED = true;
}
// True when this academy has never configured modules (first-run picker trigger).
function featuresUnconfigured() { return FEATURES_LOADED && Object.keys(ENABLED_FEATURES).length === 0; }

// Persist one toggle, cascading prerequisites/dependents per requires[].
// Returns { ok, changed:[ids] } so the caller can re-render.
async function tSetModuleEnabled(id, enabled) {
  const meta = moduleMeta(id);
  if (!meta || meta.base) return { ok: false, changed: [] };
  const changed = {};
  const want = (mid, on) => {
    const mm = moduleMeta(mid); if (!mm || mm.base) return;
    changed[mid] = on;
  };
  want(id, !!enabled);
  if (enabled) {
    // turning on → pull in every prerequisite (transitively)
    const visit = (mid) => (moduleMeta(mid)?.requires || []).forEach(req => { if (!(req in changed)) { want(req, true); visit(req); } });
    visit(id);
  } else {
    // turning off → cascade to anything that requires it (transitively)
    const dependents = (mid) => MODULE_REGISTRY.filter(m => (m.requires || []).includes(mid));
    const visit = (mid) => dependents(mid).forEach(d => { if (!(d.id in changed)) { want(d.id, false); visit(d.id); } });
    visit(id);
  }
  // Apply locally first so the UI reflects immediately even in demo mode.
  Object.entries(changed).forEach(([mid, on]) => { ENABLED_FEATURES[mid] = on; });
  FEATURES_LOADED = true;
  if (!isTenant()) return { ok: true, changed: Object.keys(changed) };
  const rows = Object.entries(changed).map(([module_id, on]) => ({ academy_id: TENANT.academyId, module_id, enabled: on, updated_at: new Date().toISOString() }));
  const r = await sb.from('academy_features').upsert(rows, { onConflict: 'academy_id,module_id' });
  if (r.error) console.error('[tenant] set module:', r.error);
  return { ok: !r.error, changed: Object.keys(changed), error: r.error };
}
// First-run: persist the picked set (and explicit OFFs) in one shot.
async function tInitFeatures(enabledIds) {
  const want = new Set(enabledIds);
  const rows = toggleableModules()
    .filter(m => m.status === 'available')
    .map(m => ({ academy_id: TENANT.academyId, module_id: m.id, enabled: want.has(m.id), updated_at: new Date().toISOString() }));
  rows.forEach(r => { ENABLED_FEATURES[r.module_id] = r.enabled; });
  FEATURES_LOADED = true;
  if (!isTenant()) return { ok: true };
  const r = await sb.from('academy_features').upsert(rows, { onConflict: 'academy_id,module_id' });
  if (r.error) console.error('[tenant] init features:', r.error);
  return { ok: !r.error, error: r.error };
}

// ---- P6a: staff roles + team management ------------------------------------
// Demo mode has no membership row, so it behaves as an admin — the showcase
// must keep every screen reachable. In tenant mode the role comes from
// academy_members via initTenant(). These gate the UI only; RLS (migration 020)
// is the real boundary.
function tIsAdmin()   { return !isTenant() || ['owner', 'admin'].includes(TENANT.role); }
function tCanTeach()  { return !isTenant() || ['owner', 'admin', 'instructor'].includes(TENANT.role); }

const STAFF_JOIN_URL = t => location.origin + '/join#token=' + t;

// Invite a NEW team member: creates the pending instructor profile + the invite.
async function tInviteStaff({ name, email, role = 'instructor', teaches = true }) {
  if (!isTenant()) return { ok: false, demo: true };
  const r = await sb.rpc('invite_staff', {
    p_academy_id: TENANT.academyId, p_name: name, p_email: email || null,
    p_role: role, p_teaches: teaches
  });
  if (r.error) { console.error('[tenant] invite staff (run migration 020?):', r.error); return { ok: false, error: r.error }; }
  return { ok: true, token: r.data, url: STAFF_JOIN_URL(r.data) };
}

// Re-invite an existing instructor row (legacy rows, or an unclaimed invite).
async function tInviteExistingStaff(instructorId, email, role = 'instructor') {
  if (!isTenant()) return { ok: false, demo: true };
  const r = await sb.rpc('invite_existing_staff', {
    p_instructor_id: instructorId, p_email: email || null, p_role: role
  });
  if (r.error) { console.error('[tenant] re-invite staff:', r.error); return { ok: false, error: r.error }; }
  return { ok: true, token: r.data, url: STAFF_JOIN_URL(r.data) };
}

// Admin-only roster: instructor profile + membership role + link status.
async function tListMembers() {
  if (!isTenant()) return { ok: false, demo: true, rows: [] };
  const r = await sb.rpc('list_academy_members', { p_academy_id: TENANT.academyId });
  if (r.error) { console.error('[tenant] list members:', r.error); return { ok: false, error: r.error, rows: [] }; }
  return { ok: true, rows: r.data || [] };
}

async function tSetMemberRole(userId, role) {
  if (!isTenant()) return { ok: false, demo: true };
  const r = await sb.rpc('set_member_role', {
    p_academy_id: TENANT.academyId, p_user_id: userId, p_role: role
  });
  if (r.error) console.error('[tenant] set role:', r.error);
  return { ok: !r.error, error: r.error };
}

// Works for both claimed members and pending invitees.
async function tRevokeInstructor(instructorId) {
  if (!isTenant()) return { ok: false, demo: true };
  const r = await sb.rpc('revoke_instructor', { p_instructor_id: instructorId });
  if (r.error) console.error('[tenant] revoke:', r.error);
  return { ok: !r.error, error: r.error };
}

window.TENANT = TENANT; window.isTenant = isTenant;
window.tenantSignOut = tenantSignOut; window.switchAcademy = switchAcademy;
window.tCreateStudentInvite = tCreateStudentInvite;
window.tIsAdmin = tIsAdmin; window.tCanTeach = tCanTeach;
window.tInviteStaff = tInviteStaff; window.tInviteExistingStaff = tInviteExistingStaff;
window.tListMembers = tListMembers; window.tSetMemberRole = tSetMemberRole;
window.tRevokeInstructor = tRevokeInstructor;
window.MODULE_REGISTRY = MODULE_REGISTRY; window.isModuleEnabled = isModuleEnabled;
window.toggleableModules = toggleableModules; window.moduleMeta = moduleMeta;
window.tSetModuleEnabled = tSetModuleEnabled; window.tInitFeatures = tInitFeatures;
window.featuresUnconfigured = featuresUnconfigured;
