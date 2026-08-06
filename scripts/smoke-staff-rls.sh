#!/usr/bin/env bash
# =============================================================================
# Tatami — staff-role RLS smoke test (P6a)
# Verifies the admin/instructor split from migration 020:
#   * an INSTRUCTOR can do their job (students, classes, curriculum, grading)
#   * an INSTRUCTOR cannot reach finance, pay rates, leads, or team management
#   * an ADMIN keeps full access, and cannot lock themselves out
#
# Self-contained: signs up its own admin + instructor, creates a throwaway
# academy, and exercises the real invite → claim → access path. Requires email
# confirmation to be OFF on the target project (true on dev).
# Run AFTER migrations …019, 020.
#   SUPABASE_URL=… SUPABASE_ANON_KEY=… ./scripts/smoke-staff-rls.sh
# =============================================================================
set -uo pipefail
U="${SUPABASE_URL:-https://ozxvvpfhhzgoapbpwida.supabase.co}"
K="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eHZ2cGZoaHpnb2FwYnB3aWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDcwOTMsImV4cCI6MjA5NjMyMzA5M30.DiwfPyjaFR3rkmsfYs26G5lN9W6v7tomCoRzbPk0LoM}"

pass=0; fail=0
ok(){ echo "PASS  $1"; pass=$((pass+1)); }
no(){ echo "FAIL  $1 ($2)"; fail=$((fail+1)); }
chk(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "got '$2' want '$3'"; }
# A rejected RPC/write is any 4xx; an allowed one would be 2xx.
denied(){ case "$2" in 4[0-9][0-9]) ok "$1";; *) no "$1" "got '$2' want 4xx (rejected)";; esac; }

jget(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')"; }
jlen(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else -1)"; }

signup(){ curl -s -X POST "$U/auth/v1/signup" -H "apikey: $K" -H "Content-Type: application/json" \
  -d "{\"email\":\"$1.$(date +%s)-$RANDOM@example.com\",\"password\":\"test123456\"}" | jget access_token; }
get_body(){ curl -s "$U/rest/v1$2" -H "apikey: $K" -H "Authorization: Bearer $1"; }
post_code(){ curl -s -o /dev/null -w '%{http_code}' -X POST "$U/rest/v1$2" -H "apikey: $K" \
  -H "Authorization: Bearer $1" -H "Content-Type: application/json" -d "$3"; }
rpc_body(){ curl -s -X POST "$U/rest/v1/rpc/$2" -H "apikey: $K" -H "Authorization: Bearer $1" \
  -H "Content-Type: application/json" -d "$3"; }
rpc_code(){ curl -s -o /dev/null -w '%{http_code}' -X POST "$U/rest/v1/rpc/$2" -H "apikey: $K" \
  -H "Authorization: Bearer $1" -H "Content-Type: application/json" -d "$3"; }

# Admin seeded a row, so "instructor sees 0" is a real denial, not an empty table.
seeded_hidden(){ # label, instructor-token, path
  local n; n=$(get_body "$2" "$3" | jlen)
  [ "$n" = "0" ] && ok "$1" || no "$1" "LEAK — instructor read $n row(s)"
}
seeded_visible(){ # label, admin-token, path
  local n; n=$(get_body "$2" "$3" | jlen)
  [ "$n" -ge 1 ] 2>/dev/null && ok "$1" || no "$1" "admin read $n row(s), want >=1"
}

echo "== staff-role RLS smoke test =="; echo "target: $U"; echo

# ---- setup: admin (owner) + academy ----------------------------------------
TA=$(signup admin)
[ -n "$TA" ] || { no "setup" "admin signup failed"; exit 1; }
AID=$(rpc_body "$TA" create_academy '{"p_name":"RoleTest"}' | tr -d '"')
[ -n "$AID" ] && ok "admin created academy ($AID)" || { no "setup" "no academy"; exit 1; }
HA=(-H "apikey: $K" -H "Authorization: Bearer $TA" -H "Content-Type: application/json")

TS=$(date +%s)-$RANDOM
# Operational data an instructor SHOULD see.
curl -s -o /dev/null -X POST "$U/rest/v1/students" "${HA[@]}" \
  -d "{\"id\":\"stu-$TS\",\"name\":\"Test Student\",\"initials\":\"TS\",\"joined_at\":\"2026-01-01\",\"academy_id\":\"$AID\"}"
curl -s -o /dev/null -X POST "$U/rest/v1/classes" "${HA[@]}" \
  -d "{\"id\":\"cls-$TS\",\"sport_id\":\"sport-bjj\",\"starts_at\":\"2026-05-20T18:00:00Z\",\"duration_min\":60,\"class_type\":\"Fundamentals\",\"capacity\":20,\"status\":\"scheduled\",\"academy_id\":\"$AID\"}"
# Admin-only data an instructor must NOT see.
curl -s -o /dev/null -X POST "$U/rest/v1/discount_codes" "${HA[@]}" \
  -d "{\"id\":\"dc-$TS\",\"code\":\"SECRET-$TS\",\"type\":\"percent\",\"value\":10,\"academy_id\":\"$AID\"}"
curl -s -o /dev/null -X POST "$U/rest/v1/class_package_types" "${HA[@]}" \
  -d "{\"id\":\"cpt-$TS\",\"name\":\"10-pack\",\"class_count\":10,\"price\":100,\"validity_days\":90,\"academy_id\":\"$AID\"}"
curl -s -o /dev/null -X POST "$U/rest/v1/prospects" "${HA[@]}" \
  -d "{\"id\":\"pro-$TS\",\"name\":\"Hot Lead\",\"contact\":\"lead@example.com\",\"academy_id\":\"$AID\"}"
curl -s -o /dev/null -X POST "$U/rest/v1/equipment" "${HA[@]}" \
  -d "{\"id\":\"eq-$TS\",\"category\":\"mats\",\"name\":\"Tatami\",\"qty\":10,\"academy_id\":\"$AID\"}"
ok "admin seeded operational + admin-only rows"

# ---- invite → claim: the real path an instructor takes ----------------------
B="{\"p_academy_id\":\"$AID\",\"p_name\":\"Coach Test\",\"p_email\":\"coach@example.com\",\"p_role\":\"instructor\",\"p_teaches\":true}"
TOK=$(rpc_body "$TA" invite_staff "$B" | tr -d '"')
[ -n "$TOK" ] && ok "admin minted a staff invite" || { no "invite_staff" "no token"; exit 1; }

PEND=$(get_body "$TA" "/instructors?academy_id=eq.$AID&status=eq.pending&select=id,status" | jlen)
chk "invite created a PENDING instructor profile" "$PEND" "1"

TI=$(signup coach)
[ -n "$TI" ] || { no "setup" "instructor signup failed"; exit 1; }
B="{\"p_token\":\"$TOK\"}"
CLAIM=$(rpc_body "$TI" claim_invite "$B")
echo "$CLAIM" | grep -q '"kind": *"staff"' && ok "claim_invite resolved it as a STAFF invite" \
  || no "claim_invite kind" "got: ${CLAIM:0:120}"

ACT=$(get_body "$TA" "/instructors?academy_id=eq.$AID&status=eq.active&select=id" | jlen)
[ "$ACT" -ge 1 ] 2>/dev/null && ok "claim flipped the profile to ACTIVE" || no "claim → active" "got $ACT"

ROLE=$(get_body "$TI" "/academy_members?academy_id=eq.$AID&select=role" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['role'] if d else '')")
chk "claim granted the 'instructor' membership" "$ROLE" "instructor"

echo
echo "-- INSTRUCTOR can do their job --"
for tbl in students classes recurring_templates enrollments attendance bookings waitlist grading_log events; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$U/rest/v1/$tbl?academy_id=eq.$AID&limit=1" -H "apikey: $K" -H "Authorization: Bearer $TI")
  chk "reads $tbl" "$c" "200"
done
n=$(get_body "$TI" "/students?academy_id=eq.$AID" | jlen)
[ "$n" -ge 1 ] 2>/dev/null && ok "actually sees the seeded student" || no "student visibility" "got $n rows"
n=$(get_body "$TI" "/team_directory?academy_id=eq.$AID" | jlen)
[ "$n" -ge 1 ] 2>/dev/null && ok "reads team_directory (for class assignment)" || no "team_directory" "got $n rows"

echo
echo "-- INSTRUCTOR is locked out of admin surfaces --"
seeded_hidden "cannot read instructors (carries pay_rate)" "$TI" "/instructors?academy_id=eq.$AID"
seeded_hidden "cannot read discount_codes"                 "$TI" "/discount_codes?academy_id=eq.$AID"
seeded_hidden "cannot read class_package_types"            "$TI" "/class_package_types?academy_id=eq.$AID"
seeded_hidden "cannot read prospects (lead PII)"           "$TI" "/prospects?academy_id=eq.$AID"
seeded_hidden "cannot read equipment"                      "$TI" "/equipment?academy_id=eq.$AID"
seeded_hidden "cannot read staff_invites"                  "$TI" "/staff_invites?academy_id=eq.$AID"

DIR=$(get_body "$TI" "/team_directory?academy_id=eq.$AID&limit=5")
echo "$DIR" | grep -q 'pay_rate' && no "team_directory omits pay_rate" "LEAK — pay_rate in payload" \
  || ok "team_directory omits pay_rate"

echo
echo "-- INSTRUCTOR cannot escalate privileges --"
B="{\"p_academy_id\":\"$AID\",\"p_name\":\"Mole\",\"p_email\":null,\"p_role\":\"admin\",\"p_teaches\":true}"
denied "cannot invite staff" "$(rpc_code "$TI" invite_staff "$B")"
B="{\"p_academy_id\":\"$AID\"}"
denied "cannot list academy members" "$(rpc_code "$TI" list_academy_members "$B")"
B="{\"p_academy_id\":\"$AID\",\"p_user_id\":\"00000000-0000-0000-0000-000000000000\",\"p_role\":\"admin\"}"
denied "cannot change roles" "$(rpc_code "$TI" set_member_role "$B")"
B="{\"p_academy_id\":\"$AID\",\"p_user_id\":\"00000000-0000-0000-0000-000000000000\"}"
denied "cannot revoke members" "$(rpc_code "$TI" revoke_member "$B")"

echo
echo "-- INSTRUCTOR cannot write admin data --"
B="{\"id\":\"dc-hack-$TS\",\"code\":\"HACK-$TS\",\"type\":\"percent\",\"value\":99,\"academy_id\":\"$AID\"}"
denied "cannot create discount codes" "$(post_code "$TI" "/discount_codes" "$B")"
B="{\"academy_id\":\"$AID\",\"module_id\":\"billing\",\"enabled\":true}"
denied "cannot toggle modules" "$(post_code "$TI" "/academy_features" "$B")"
B="{\"id\":\"ins-hack-$TS\",\"name\":\"Ghost\",\"initials\":\"GH\",\"pay_rate\":999,\"academy_id\":\"$AID\"}"
denied "cannot create an instructor row directly" "$(post_code "$TI" "/instructors" "$B")"

echo
echo "-- ADMIN retains full access --"
seeded_visible "reads instructors"         "$TA" "/instructors?academy_id=eq.$AID"
seeded_visible "reads discount_codes"      "$TA" "/discount_codes?academy_id=eq.$AID"
seeded_visible "reads class_package_types" "$TA" "/class_package_types?academy_id=eq.$AID"
seeded_visible "reads prospects"           "$TA" "/prospects?academy_id=eq.$AID"
B="{\"p_academy_id\":\"$AID\"}"
chk "lists academy members" "$(rpc_code "$TA" list_academy_members "$B")" "200"

echo
echo "-- ADMIN lockout guards hold --"
SELF=$(curl -s "$U/auth/v1/user" -H "apikey: $K" -H "Authorization: Bearer $TA" | jget id)
B="{\"p_academy_id\":\"$AID\",\"p_user_id\":\"$SELF\",\"p_role\":\"instructor\"}"
denied "cannot demote self" "$(rpc_code "$TA" set_member_role "$B")"
B="{\"p_academy_id\":\"$AID\",\"p_user_id\":\"$SELF\"}"
denied "cannot revoke self" "$(rpc_code "$TA" revoke_member "$B")"

COACH=$(curl -s "$U/auth/v1/user" -H "apikey: $K" -H "Authorization: Bearer $TI" | jget id)

echo
echo "-- ADMIN can promote, and promotion actually grants access --"
B="{\"p_academy_id\":\"$AID\",\"p_user_id\":\"$COACH\",\"p_role\":\"admin\"}"
chk "promotes instructor → admin" "$(rpc_code "$TA" set_member_role "$B")" "204"
n=$(get_body "$TI" "/discount_codes?academy_id=eq.$AID" | jlen)
[ "$n" -ge 1 ] 2>/dev/null && ok "promoted user now reads finance data" || no "promotion took effect" "got $n rows"

# The owner guard needs a SECOND admin to be meaningful: passing the owner's own
# id as the owner would trip the self-guard first and prove nothing. Now that the
# coach is an admin, have THEM try to demote and remove the owner.
B="{\"p_academy_id\":\"$AID\",\"p_user_id\":\"$SELF\",\"p_role\":\"instructor\"}"
denied "another admin cannot demote the owner" "$(rpc_code "$TI" set_member_role "$B")"
B="{\"p_academy_id\":\"$AID\",\"p_user_id\":\"$SELF\"}"
denied "another admin cannot remove the owner" "$(rpc_code "$TI" revoke_member "$B")"

B="{\"p_academy_id\":\"$AID\",\"p_user_id\":\"$COACH\",\"p_role\":\"instructor\"}"
chk "demotes back to instructor" "$(rpc_code "$TA" set_member_role "$B")" "204"
n=$(get_body "$TI" "/discount_codes?academy_id=eq.$AID" | jlen)
chk "demotion revokes finance access again" "$n" "0"

echo
echo "-- revoke removes access but keeps history --"
INST_ID=$(get_body "$TA" "/instructors?academy_id=eq.$AID&select=id&limit=1" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if d else '')")
B="{\"p_instructor_id\":\"$INST_ID\"}"
chk "admin revokes the instructor" "$(rpc_code "$TA" revoke_instructor "$B")" "204"
n=$(get_body "$TI" "/students?academy_id=eq.$AID" | jlen)
chk "revoked user loses student access" "$n" "0"
n=$(get_body "$TA" "/instructors?academy_id=eq.$AID&status=eq.revoked" | jlen)
[ "$n" -ge 1 ] 2>/dev/null && ok "profile row survives for class history" || no "history preserved" "got $n rows"

echo
echo "== $pass passed, $fail failed =="
[ "$fail" -eq 0 ] || exit 1
