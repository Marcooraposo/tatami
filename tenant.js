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

function _replace(arr, rows) { if (Array.isArray(arr)) { arr.length = 0; rows.forEach(r => arr.push(r)); } }
function _empty(arr) { if (Array.isArray(arr)) arr.length = 0; }

// Load the academy's data into the in-memory globals. Phase 1: students +
// enrollments; everything else starts empty (no demo data in a real academy).
async function tHydrate() {
  if (!isTenant()) return;
  const aid = TENANT.academyId;
  const [stu, enr] = await Promise.all([
    sb.from('students').select('*').eq('academy_id', aid),
    sb.from('enrollments').select('*').eq('academy_id', aid)
  ]);
  if (typeof STUDENTS !== 'undefined')    _replace(STUDENTS, (stu.data || []).map(studentFromDb));
  if (typeof ENROLLMENTS !== 'undefined') _replace(ENROLLMENTS, (enr.data || []).map(enrollmentFromDb));
  // Not-yet-cut modules: empty so the demo roster/classes don't appear.
  ['CLASSES','BOOKINGS','ATTENDANCE','WAITLIST','GRADING_LOG','EVENTS','COMPETITION_RESULTS',
   'ANNOUNCEMENTS','STUDENT_INJURIES','PROSPECTS','EQUIPMENT','EQUIPMENT_LOANS',
   'STUDENT_PACKAGES','FAMILY_GROUPS'].forEach(n => { try { _empty(eval(n)); } catch {} });
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

// Modules surfaced in the admin nav while in tenant mode (Phase 1).
const TENANT_MODULES = ['dashboard', 'students', 'settings'];
window.TENANT = TENANT; window.isTenant = isTenant;
window.tenantSignOut = tenantSignOut;
