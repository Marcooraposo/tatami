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
// instructor_directory view exposes only safe columns (no pay_rate) — see migration 017.
function _instFromView(r) { return { id: r.id, name: r.name, initials: r.initials, sportIds: [] }; }

async function sHydrate() {
  const aid = STUDENT_CTX.academyId;
  const [me, enr, cls, tpl, ins, bk, att, wl, ev, ann, gl, feat] = await Promise.all([
    sb.from('students').select('*').eq('academy_id', aid),            // RLS → my row only
    sb.from('enrollments').select('*').eq('academy_id', aid),         // RLS → mine
    sb.from('classes').select('*').eq('academy_id', aid),             // public
    sb.from('recurring_templates').select('*').eq('academy_id', aid), // public
    sb.from('instructor_directory').select('*').eq('academy_id', aid),// public (name only, no pay)
    sb.from('bookings').select('*').eq('academy_id', aid),            // RLS → mine
    sb.from('attendance').select('*').eq('academy_id', aid),          // RLS → mine
    sb.from('waitlist').select('*').eq('academy_id', aid),            // RLS → mine
    sb.from('events').select('*').eq('academy_id', aid),              // public
    sb.from('announcements').select('*').eq('academy_id', aid),       // public
    sb.from('grading_log').select('*').eq('academy_id', aid),         // RLS → mine
    sb.from('academy_features').select('module_id, enabled').eq('academy_id', aid)
  ]);
  if (typeof INSTRUCTORS !== 'undefined')         _srep(INSTRUCTORS, ins.data, _instFromView);
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

// ---- P5d: student self-service writes (RLS scopes each to my own rows) ------
// Insert that tolerates a duplicate (already booked/checked-in) as success.
function _okOrDup(r) {
  if (!r.error) return { ok: true };
  if (r.error.code === '23505') return { ok: true, dup: true };
  console.error('[student] write:', r.error);
  return { ok: false, error: r.error };
}
async function sBookClass(classId) {
  return _okOrDup(await sb.from('bookings').insert({
    id: 'bk-' + STUDENT_CTX.studentId + '-' + classId, class_id: classId,
    student_id: STUDENT_CTX.studentId, status: 'booked',
    booked_at: new Date().toISOString(), academy_id: STUDENT_CTX.academyId
  }));
}
async function sCancelBooking(classId) {
  const r = await sb.from('bookings').delete()
    .eq('class_id', classId).eq('student_id', STUDENT_CTX.studentId).eq('academy_id', STUDENT_CTX.academyId);
  return { ok: !r.error, error: r.error };
}
async function sCheckIn(classId) {
  return _okOrDup(await sb.from('attendance').insert({
    id: 'at-' + classId + '-' + STUDENT_CTX.studentId, class_id: classId,
    student_id: STUDENT_CTX.studentId, attended: true,
    confirmed_at: new Date().toISOString(), academy_id: STUDENT_CTX.academyId
  }));
}
async function sJoinWaitlist(classId) {
  return _okOrDup(await sb.from('waitlist').insert({
    id: 'wl-' + classId + '-' + STUDENT_CTX.studentId, class_id: classId,
    student_id: STUDENT_CTX.studentId, queued_at: new Date().toISOString(),
    academy_id: STUDENT_CTX.academyId
  }));
}
async function sLeaveWaitlist(classId) {
  const r = await sb.from('waitlist').delete()
    .eq('class_id', classId).eq('student_id', STUDENT_CTX.studentId).eq('academy_id', STUDENT_CTX.academyId);
  return { ok: !r.error, error: r.error };
}
async function sUpdateProfile(p) {
  const r = await sb.rpc('update_my_profile', {
    p_name: p.name ?? null, p_initials: p.initials ?? null,
    p_contact: p.contact ?? null, p_phone: p.phone ?? null,
    p_dob: p.dob || null, p_weight: p.weightKg ?? null
  });
  return { ok: !r.error, error: r.error };
}

window.STUDENT_CTX = STUDENT_CTX;
window.isStudentTenant = isStudentTenant;
window.sModuleEnabled = sModuleEnabled;
window.studentSignOut = studentSignOut;
window.sBookClass = sBookClass; window.sCancelBooking = sCancelBooking;
window.sCheckIn = sCheckIn; window.sJoinWaitlist = sJoinWaitlist;
window.sLeaveWaitlist = sLeaveWaitlist; window.sUpdateProfile = sUpdateProfile;
