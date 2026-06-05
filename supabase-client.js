// =============================================================================
// supabase-client.js — Supabase client singleton
// Loaded before data.js in every HTML page.
// =============================================================================

const SUPABASE_URL  = 'https://pcqkkmhmgsjlitonzxxb.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcWtrbWhtZ3NqbGl0b256eHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTE1MTYsImV4cCI6MjA5NjIyNzUxNn0.KZKj0fijU-409jTfJU4XLGic1xm1xLWueV0T11mspZc';

// Loaded via CDN <script> before this file.
// NOTE: the CDN UMD bundle defines a global `supabase` (the library), so we
// must name our client differently to avoid an "already declared" clash.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// =============================================================================
// Persistence helpers — called by the UI for write operations
// Read operations still use the in-memory data.js arrays for now.
// =============================================================================

const DB_PERSIST = {

  // Save attendance for a class (array of { studentId, attended })
  async saveAttendance(classId, records) {
    const rows = records.map(r => ({
      id: `at-${r.studentId}-${classId}`,
      class_id: classId,
      student_id: r.studentId,
      attended: r.attended,
      confirmed_at: r.attended ? new Date().toISOString() : null
    }));
    const { error } = await sb
      .from('attendance')
      .upsert(rows, { onConflict: 'class_id,student_id' });
    if (error) console.error('saveAttendance:', error);
    return !error;
  },

  // Add a new student
  async addStudent(student) {
    const { error } = await sb.from('students').insert(student);
    if (error) console.error('addStudent:', error);
    return !error;
  },

  // Update a student
  async updateStudent(id, patch) {
    const { error } = await sb.from('students').update(patch).eq('id', id);
    if (error) console.error('updateStudent:', error);
    return !error;
  },

  // Upsert enrollment (grading state)
  async saveEnrollment(enrollment) {
    const { error } = await sb
      .from('enrollments')
      .upsert(enrollment, { onConflict: 'student_id,sport_id' });
    if (error) console.error('saveEnrollment:', error);
    return !error;
  },

  // Log a grading event (stripe / promotion)
  async logGrading(entry) {
    const { error } = await sb.from('grading_log').insert(entry);
    if (error) console.error('logGrading:', error);
    return !error;
  },

  // Book a student into a class
  async bookClass(classId, studentId) {
    const { error } = await sb.from('bookings').upsert({
      id: `bk-${studentId}-${classId}`,
      class_id: classId,
      student_id: studentId,
      booked_at: new Date().toISOString(),
      status: 'booked'
    }, { onConflict: 'class_id,student_id' });
    if (error) console.error('bookClass:', error);
    return !error;
  },

  // Add / update a prospect
  async saveProspect(prospect) {
    const { error } = await sb
      .from('prospects')
      .upsert(prospect, { onConflict: 'id' });
    if (error) console.error('saveProspect:', error);
    return !error;
  },

  // Log an injury
  async logInjury(injury) {
    const { error } = await sb.from('student_injuries').insert(injury);
    if (error) console.error('logInjury:', error);
    return !error;
  },

  // Save a class plan (planned curriculum items)
  async saveClassPlan(classId, plannedItemIds) {
    const { error } = await sb
      .from('classes')
      .update({ planned_item_ids: plannedItemIds })
      .eq('id', classId);
    if (error) console.error('saveClassPlan:', error);
    return !error;
  }
};
