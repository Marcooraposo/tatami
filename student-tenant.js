// =============================================================================
// student-tenant.js — resolve the logged-in student and hydrate their app from
// Supabase. RLS (migration 016) gives a student their OWN records + academy-
// public data; this loads that into the same in-memory globals the screens
// already render from, so the synchronous UI is unchanged. Demo mode (no session
// or the /demo path) is untouched — the app keeps using data.js.
// Loaded after tenant.js (reuses its snake<->camel mappers) and data.js.
// =============================================================================
const STUDENT_CTX = { mode: 'demo', studentId: null, academyId: null, userId: null, academyName: '', features: {} };
function isStudentTenant() { return STUDENT_CTX.mode === 'tenant'; }

async function initStudentApp() {
  try {
    if (/\/demo(\b|\/|$)/.test(location.pathname)) return STUDENT_CTX;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return STUDENT_CTX;
    STUDENT_CTX.userId = session.user.id;
    // RLS: students_self_read → this returns only my own row.
    const { data: mine, error } = await sb.from('students').select('*').eq('user_id', session.user.id).limit(1);
    if (error) { console.error('[student] load self:', error); return STUDENT_CTX; }
    if (!mine || !mine.length) { STUDENT_CTX.mode = 'unlinked'; return STUDENT_CTX; } // signed in but not a student
    const me = mine[0];
    STUDENT_CTX.mode = 'tenant';
    STUDENT_CTX.studentId = me.id;
    STUDENT_CTX.academyId = me.academy_id;
    const { data: acad } = await sb.from('academies').select('name').eq('id', me.academy_id).limit(1);
    STUDENT_CTX.academyName = (acad && acad[0] && acad[0].name) || 'My Academy';
    await sHydrate();
  } catch (e) { console.error('[student] init:', e); }
  return STUDENT_CTX;
}

function _srep(arr, rows, map) { if (Array.isArray(arr)) arr.splice(0, arr.length, ...((rows || []).map(map))); }
function _annFromDb(r) { return { id: r.id, title: r.title, body: r.body, pinned: !!r.pinned, expiresAt: r.expires_at, createdAt: r.created_at }; }

async function sHydrate() {
  const aid = STUDENT_CTX.academyId;
  const [me, enr, cls, tpl, bk, att, wl, ev, ann, gl, feat] = await Promise.all([
    sb.from('students').select('*').eq('academy_id', aid),            // RLS → my row only
    sb.from('enrollments').select('*').eq('academy_id', aid),         // RLS → mine
    sb.from('classes').select('*').eq('academy_id', aid),             // public
    sb.from('recurring_templates').select('*').eq('academy_id', aid), // public
    sb.from('bookings').select('*').eq('academy_id', aid),            // RLS → mine
    sb.from('attendance').select('*').eq('academy_id', aid),          // RLS → mine
    sb.from('waitlist').select('*').eq('academy_id', aid),            // RLS → mine
    sb.from('events').select('*').eq('academy_id', aid),              // public
    sb.from('announcements').select('*').eq('academy_id', aid),       // public
    sb.from('grading_log').select('*').eq('academy_id', aid),         // RLS → mine
    sb.from('academy_features').select('module_id, enabled').eq('academy_id', aid)
  ]);
  if (typeof STUDENTS !== 'undefined')            _srep(STUDENTS, me.data, studentFromDb);
  if (typeof ENROLLMENTS !== 'undefined')         _srep(ENROLLMENTS, enr.data, enrollmentFromDb);
  if (typeof CLASSES !== 'undefined')             _srep(CLASSES, cls.data, classFromDb);
  if (typeof RECURRING_TEMPLATES !== 'undefined') _srep(RECURRING_TEMPLATES, tpl.data, templateFromDb);
  if (typeof BOOKINGS !== 'undefined')            _srep(BOOKINGS, bk.data, bookingFromDb);
  if (typeof ATTENDANCE !== 'undefined')          _srep(ATTENDANCE, att.data, attendanceFromDb);
  if (typeof WAITLIST !== 'undefined')            _srep(WAITLIST, wl.data, waitlistFromDb);
  if (typeof EVENTS !== 'undefined')              _srep(EVENTS, ev.data, eventFromDb);
  if (typeof ANNOUNCEMENTS !== 'undefined')       _srep(ANNOUNCEMENTS, ann.data, _annFromDb);
  if (typeof GRADING_LOG !== 'undefined')         _srep(GRADING_LOG, gl.data, gradingLogFromDb);
  STUDENT_CTX.features = {};
  (feat.data || []).forEach(r => { STUDENT_CTX.features[r.module_id] = !!r.enabled; });
}

// Is a module enabled for this student's academy? (available modules default on).
function sModuleEnabled(id) {
  if (!isStudentTenant()) return true;
  if (Object.prototype.hasOwnProperty.call(STUDENT_CTX.features, id)) return !!STUDENT_CTX.features[id];
  return true;
}

async function studentSignOut() {
  try { await sb.auth.signOut(); } catch {}
  STUDENT_CTX.mode = 'demo'; STUDENT_CTX.studentId = null; STUDENT_CTX.academyId = null;
}

window.STUDENT_CTX = STUDENT_CTX;
window.isStudentTenant = isStudentTenant;
window.sModuleEnabled = sModuleEnabled;
window.studentSignOut = studentSignOut;
