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

const TENANT = { mode: 'demo', academyId: null, role: null, academyName: null, userId: null };
function isTenant() { return TENANT.mode === 'tenant'; }
function activeAcademyId() { return TENANT.academyId; }

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
  return { id: r.id, name: r.name, initials: r.initials, sportIds: r.sport_ids || [], payRate: r.pay_rate };
}
function instructorToDb(i) {
  return { id: i.id, name: i.name, initials: i.initials, sport_ids: i.sportIds || [],
    pay_rate: i.payRate ?? null, academy_id: TENANT.academyId };
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

function _replace(arr, rows) { if (Array.isArray(arr)) { arr.length = 0; rows.forEach(r => arr.push(r)); } }
function _empty(arr) { if (Array.isArray(arr)) arr.length = 0; }

// Load the academy's data into the in-memory globals. Phase 1: students +
// enrollments; everything else starts empty (no demo data in a real academy).
async function tHydrate() {
  if (!isTenant()) return;
  const aid = TENANT.academyId;
  const [stu, enr, inst, tpl, cls, bk, att, wl] = await Promise.all([
    sb.from('students').select('*').eq('academy_id', aid),
    sb.from('enrollments').select('*').eq('academy_id', aid),
    sb.from('instructors').select('*').eq('academy_id', aid),
    sb.from('recurring_templates').select('*').eq('academy_id', aid),
    sb.from('classes').select('*').eq('academy_id', aid),
    sb.from('bookings').select('*').eq('academy_id', aid),
    sb.from('attendance').select('*').eq('academy_id', aid),
    sb.from('waitlist').select('*').eq('academy_id', aid)
  ]);
  if (typeof STUDENTS !== 'undefined')            _replace(STUDENTS, (stu.data || []).map(studentFromDb));
  if (typeof ENROLLMENTS !== 'undefined')         _replace(ENROLLMENTS, (enr.data || []).map(enrollmentFromDb));
  if (typeof INSTRUCTORS !== 'undefined')         _replace(INSTRUCTORS, (inst.data || []).map(instructorFromDb));
  if (typeof RECURRING_TEMPLATES !== 'undefined') _replace(RECURRING_TEMPLATES, (tpl.data || []).map(templateFromDb));
  if (typeof CLASSES !== 'undefined')             _replace(CLASSES, (cls.data || []).map(classFromDb));
  if (typeof BOOKINGS !== 'undefined')            _replace(BOOKINGS, (bk.data || []).map(bookingFromDb));
  if (typeof ATTENDANCE !== 'undefined')          _replace(ATTENDANCE, (att.data || []).map(attendanceFromDb));
  if (typeof WAITLIST !== 'undefined')            _replace(WAITLIST, (wl.data || []).map(waitlistFromDb));
  // Not-yet-cut modules: empty so demo data doesn't appear in a real academy.
  ['GRADING_LOG','EVENTS','COMPETITION_RESULTS','ANNOUNCEMENTS','STUDENT_INJURIES',
   'PROSPECTS','EQUIPMENT','EQUIPMENT_LOANS','STUDENT_PACKAGES','FAMILY_GROUPS']
    .forEach(n => { try { _empty(eval(n)); } catch {} });
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

// Modules surfaced in the admin nav while in tenant mode (Phase 1 + 2a).
const TENANT_MODULES = ['dashboard', 'students', 'schedule', 'classes', 'instructors', 'settings'];
window.TENANT = TENANT; window.isTenant = isTenant;
window.tenantSignOut = tenantSignOut;
