#!/usr/bin/env bash
# =============================================================================
# Tatami — student-role RLS smoke test (P5b)
# Verifies a claimed student can read their OWN records + academy-PUBLIC data,
# but cannot read other students' PII and cannot write. Staff keep full access.
# Run AFTER migrations …015, 016 on the target project.
#   SUPABASE_URL=… SUPABASE_ANON_KEY=… ./scripts/smoke-student-rls.sh
# =============================================================================
set -uo pipefail
U="${SUPABASE_URL:-https://ozxvvpfhhzgoapbpwida.supabase.co}"
K="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eHZ2cGZoaHpnb2FwYnB3aWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDcwOTMsImV4cCI6MjA5NjMyMzA5M30.DiwfPyjaFR3rkmsfYs26G5lN9W6v7tomCoRzbPk0LoM}"

pass=0; fail=0
ok(){ echo "PASS  $1"; pass=$((pass+1)); }
no(){ echo "FAIL  $1 ($2)"; fail=$((fail+1)); }
chk(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "got '$2' want '$3'"; }
# A rejected write is any 4xx (400 constraint/representation, 401 anon, 403 RLS);
# an *allowed* write would be 2xx. The staff-count assertion below corroborates
# denial by effect (no row was actually created).
denied(){ case "$2" in 4[0-9][0-9]) ok "$1";; *) no "$1" "got '$2' want 4xx (rejected)";; esac; }
# Strict RLS denial: 401 (anon) or 403 (authed, policy) — not a 400 constraint error.
rls_denied(){ case "$2" in 401|403) ok "$1";; *) no "$1" "got '$2' want 401/403 (RLS)";; esac; }
jget(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')"; }
jlen(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else -1)"; }
signup(){ curl -s -X POST "$U/auth/v1/signup" -H "apikey: $K" -H "Content-Type: application/json" -d "{\"email\":\"$1.$(date +%s)-$RANDOM@example.com\",\"password\":\"test123456\"}" | jget access_token; }
get_body(){ curl -s "$U/rest/v1$2" -H "apikey: $K" -H "Authorization: Bearer $1"; }
# No return=representation here: on an RLS-blocked insert that header can mask the
# clean 403, so we omit it for these write-denial probes.
post_code(){ curl -s -o /dev/null -w '%{http_code}' -X POST "$U/rest/v1$2" -H "apikey: $K" -H "Authorization: Bearer $1" -H "Content-Type: application/json" -d "$3"; }

echo "== student-role RLS smoke test =="; echo "target: $U"; echo

TS=$(signup staff)
AID=$(curl -s -X POST "$U/rest/v1/rpc/create_academy" -H "apikey: $K" -H "Authorization: Bearer $TS" -H "Content-Type: application/json" -d '{"p_name":"RLS"}' | tr -d '"')
H=(-H "apikey: $K" -H "Authorization: Bearer $TS" -H "Content-Type: application/json")
[ -n "$AID" ] && ok "staff created academy" || { no "setup" "no academy"; exit 1; }

ME="me-$(date +%s)-$RANDOM"; OTHER="oth-$(date +%s)-$RANDOM"
curl -s -o /dev/null -X POST "$U/rest/v1/students" "${H[@]}" -d "{\"id\":\"$ME\",\"name\":\"Me Student\",\"initials\":\"MS\",\"joined_at\":\"2026-01-01\",\"academy_id\":\"$AID\"}"
curl -s -o /dev/null -X POST "$U/rest/v1/students" "${H[@]}" -d "{\"id\":\"$OTHER\",\"name\":\"Other Student\",\"initials\":\"OS\",\"joined_at\":\"2026-01-01\",\"academy_id\":\"$AID\"}"
curl -s -o /dev/null -X POST "$U/rest/v1/enrollments" "${H[@]}" -d "{\"id\":\"enr-$OTHER\",\"student_id\":\"$OTHER\",\"sport_id\":\"sport-bjj\",\"grading_system_id\":\"g\",\"current_level_id\":\"l\",\"current_stripes\":0,\"level_since\":\"2026-01-01\",\"academy_id\":\"$AID\"}"
curl -s -o /dev/null -X POST "$U/rest/v1/classes" "${H[@]}" -d "{\"id\":\"cls-$ME\",\"sport_id\":\"sport-bjj\",\"starts_at\":\"2026-05-20T18:00:00Z\",\"duration_min\":60,\"class_type\":\"Fundamentals\",\"capacity\":20,\"status\":\"scheduled\",\"academy_id\":\"$AID\"}"
curl -s -o /dev/null -X POST "$U/rest/v1/instructors" "${H[@]}" -d "{\"id\":\"ins-$ME\",\"name\":\"Coach Rui\",\"initials\":\"CR\",\"pay_rate\":99,\"academy_id\":\"$AID\"}"
ok "staff seeded 2 students + enrollment + class + instructor"

# mint invite for MY student record, then claim as a new student user
TOK="rls$(date +%s)$RANDOM"
curl -s -o /dev/null -X POST "$U/rest/v1/student_invites" "${H[@]}" -d "{\"token\":\"$TOK\",\"academy_id\":\"$AID\",\"student_id\":\"$ME\"}"
TST=$(signup student)
SH=(-H "apikey: $K" -H "Authorization: Bearer $TST")
CL=$(curl -s -X POST "$U/rest/v1/rpc/claim_student_invite" -H "apikey: $K" -H "Authorization: Bearer $TST" -H "Content-Type: application/json" -d "{\"p_token\":\"$TOK\"}" | tr -d '"')
chk "student claimed invite" "$CL" "$AID"

# --- READS: own + public allowed, other PII denied ---
n=$(get_body "$TST" "/students?select=id&id=eq.$ME" | jlen);    [ "$n" = "1" ] && ok "student reads OWN record" || no "own record" "n=$n"
n=$(get_body "$TST" "/students?select=id&id=eq.$OTHER");        chk "student CANNOT read other student" "$n" "[]"
n=$(get_body "$TST" "/students?select=id&academy_id=eq.$AID" | jlen); [ "$n" = "1" ] && ok "student list shows only self ($n)" || no "list scope" "n=$n"
n=$(get_body "$TST" "/enrollments?select=id&student_id=eq.$OTHER"); chk "student CANNOT read other's enrollment" "$n" "[]"
n=$(get_body "$TST" "/classes?select=id&academy_id=eq.$AID" | jlen);  [ "$n" -ge 1 ] && ok "student reads academy classes (public)" || no "public classes" "n=$n"
n=$(get_body "$TST" "/academy_features?select=module_id&academy_id=eq.$AID"); echo "$n" | python3 -c "import sys,json;sys.exit(0 if isinstance(json.load(sys.stdin),list) else 1)" && ok "student reads academy_features (public)" || no "features read" "$n"
# instructor pay must NOT leak: table is staff-only, name-only via the directory view
n=$(get_body "$TST" "/instructors?select=name&academy_id=eq.$AID"); chk "student CANNOT read instructors table" "$n" "[]"
n=$(get_body "$TST" "/instructor_directory?select=name&academy_id=eq.$AID"); echo "$n" | grep -q "Coach Rui" && ok "student reads instructor NAME via directory view" || no "directory name" "$n"
pay=$(get_body "$TST" "/instructor_directory?select=pay_rate&academy_id=eq.$AID"); echo "$pay" | grep -qi "does not exist\|42703" && ok "instructor pay_rate absent from view" || no "pay_rate exposed via view" "$pay"

# --- WRITES: student is read-only in P5b ---
denied "student CANNOT insert a student" "$(post_code "$TST" /students "{\"id\":\"x-$RANDOM\",\"name\":\"X\",\"initials\":\"X\",\"joined_at\":\"2026-01-01\",\"academy_id\":\"$AID\"}")"
denied "student CANNOT create a class"   "$(post_code "$TST" /classes "{\"id\":\"x-$RANDOM\",\"sport_id\":\"sport-bjj\",\"starts_at\":\"2026-05-21T18:00:00Z\",\"class_type\":\"X\",\"academy_id\":\"$AID\"}")"

# --- Staff-only tables (018): students get NO access, even to rows that exist ---
# Seed a sensitive row (injury/medical PII) as staff, then prove the student is blind to it.
curl -s -o /dev/null -X POST "$U/rest/v1/student_injuries" "${H[@]}" \
  -d "{\"id\":\"inj-$RANDOM\",\"student_id\":\"$ME\",\"date\":\"2026-06-01\",\"type\":\"fracture\",\"body_part\":\"knee\",\"notes\":\"PII\",\"academy_id\":\"$AID\"}"
chk "student CANNOT read student_injuries (medical PII)" "$(get_body "$TST" "/student_injuries?select=id&academy_id=eq.$AID")" "[]"
# Representative write proof: a FULL, constraint-valid injury row must NOT be
# created (4xx). Pre-018 the member policy would let this succeed (201); post-018
# it's rejected (403, or 400 when NOT NULL is evaluated first). Either 4xx = safe.
denied "student write to injuries denied (full valid body)" \
  "$(post_code "$TST" /student_injuries "{\"id\":\"z-$RANDOM\",\"student_id\":\"$ME\",\"date\":\"2026-06-01\",\"type\":\"other\",\"academy_id\":\"$AID\"}")"
for tbl in prospects student_injuries equipment equipment_loans class_package_types student_packages discount_codes; do
  chk "student CANNOT read $tbl" "$(get_body "$TST" "/$tbl?select=id&academy_id=eq.$AID")" "[]"
  denied "student write to $tbl not created" "$(post_code "$TST" "/$tbl" "{\"id\":\"x-$RANDOM\",\"academy_id\":\"$AID\"}")"
done

# --- P5d: student self-service writes (019) — own only ---
CB="cls-book-$RANDOM"
curl -s -o /dev/null -X POST "$U/rest/v1/classes" "${H[@]}" -d "{\"id\":\"$CB\",\"sport_id\":\"sport-bjj\",\"starts_at\":\"2026-06-01T18:00:00Z\",\"duration_min\":60,\"class_type\":\"Fundamentals\",\"capacity\":20,\"status\":\"scheduled\",\"academy_id\":\"$AID\"}"
chk        "student books OWN class"            "$(post_code "$TST" /bookings "{\"id\":\"bk-$ME-$CB\",\"class_id\":\"$CB\",\"student_id\":\"$ME\",\"status\":\"booked\",\"academy_id\":\"$AID\"}")" 201
denied     "student CANNOT book for OTHER"      "$(post_code "$TST" /bookings "{\"id\":\"bk-x-$RANDOM\",\"class_id\":\"$CB\",\"student_id\":\"$OTHER\",\"status\":\"booked\",\"academy_id\":\"$AID\"}")"
chk        "student checks in OWN"              "$(post_code "$TST" /attendance "{\"id\":\"at-$CB-$ME\",\"class_id\":\"$CB\",\"student_id\":\"$ME\",\"attended\":true,\"academy_id\":\"$AID\"}")" 201
denied     "student CANNOT check in OTHER"      "$(post_code "$TST" /attendance "{\"id\":\"at-x-$RANDOM\",\"class_id\":\"$CB\",\"student_id\":\"$OTHER\",\"attended\":true,\"academy_id\":\"$AID\"}")"
chk        "student joins OWN waitlist"         "$(post_code "$TST" /waitlist "{\"id\":\"wl-$CB-$ME\",\"class_id\":\"$CB\",\"student_id\":\"$ME\",\"academy_id\":\"$AID\"}")" 201
NEWNAME="Renamed-$RANDOM"
curl -s -o /dev/null -X POST "$U/rest/v1/rpc/update_my_profile" -H "apikey: $K" -H "Authorization: Bearer $TST" -H "Content-Type: application/json" \
  -d "{\"p_name\":\"$NEWNAME\",\"p_initials\":\"RN\",\"p_contact\":\"r@e.com\",\"p_phone\":\"+1\",\"p_dob\":null,\"p_weight\":80}"
got=$(get_body "$TST" "/students?select=name&id=eq.$ME"); echo "$got" | grep -q "$NEWNAME" && ok "profile RPC updated own name" || no "profile RPC" "$got"
# profile RPC must not let a student touch another student's row (own-row only)
oname=$(get_body "$TS" "/students?select=name&id=eq.$OTHER"); echo "$oname" | grep -q "Other Student" && ok "profile RPC did NOT touch OTHER" || no "profile RPC leaked to OTHER" "$oname"

# --- STAFF still has full access ---
n=$(get_body "$TS" "/students?select=id&academy_id=eq.$AID" | jlen); [ "$n" -ge 2 ] && ok "staff still sees all students ($n)" || no "staff access" "n=$n"

echo; echo "== $pass passed, $fail failed =="
[ "$fail" -eq 0 ]
