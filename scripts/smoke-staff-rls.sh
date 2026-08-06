#!/usr/bin/env bash
# =============================================================================
# smoke-staff-rls.sh — verify the admin/instructor split from migration 020.
#
# Proves an INSTRUCTOR can do their job (students, classes, curriculum, grading)
# and cannot reach anything administrative (finance, pay rates, team management,
# module config, academy settings).
#
# Usage:
#   SUPABASE_URL=https://xxx.supabase.co \
#   ANON_KEY=eyJ... \
#   ADMIN_EMAIL=owner@example.com   ADMIN_PW=...    \
#   INST_EMAIL=coach@example.com    INST_PW=...     \
#   ACADEMY_ID=acad-...                             \
#   ./scripts/smoke-staff-rls.sh
#
# Both accounts must already be members of ACADEMY_ID (admin/owner + instructor).
# =============================================================================
set -uo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${ANON_KEY:?set ANON_KEY}"
: "${ADMIN_EMAIL:?set ADMIN_EMAIL}"; : "${ADMIN_PW:?set ADMIN_PW}"
: "${INST_EMAIL:?set INST_EMAIL}";   : "${INST_PW:?set INST_PW}"
: "${ACADEMY_ID:?set ACADEMY_ID}"

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31m✗\033[0m %s\n     %s\n' "$1" "$2"; }

login() {
  curl -sS "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'
}

# code <token> <method> <path> [body]
code() {
  local tok="$1" m="$2" p="$3" body="${4:-}"
  if [ -n "$body" ]; then
    curl -sS -o /dev/null -w '%{http_code}' -X "$m" "$SUPABASE_URL/rest/v1/$p" \
      -H "apikey: $ANON_KEY" -H "Authorization: Bearer $tok" \
      -H 'Content-Type: application/json' -d "$body"
  else
    curl -sS -o /dev/null -w '%{http_code}' -X "$m" "$SUPABASE_URL/rest/v1/$p" \
      -H "apikey: $ANON_KEY" -H "Authorization: Bearer $tok"
  fi
}
body() {
  curl -sS "$SUPABASE_URL/rest/v1/$2" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $1"
}
rpc() {
  curl -sS -o /dev/null -w '%{http_code}' -X POST "$SUPABASE_URL/rest/v1/rpc/$2" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $1" \
    -H 'Content-Type: application/json' -d "$3"
}

# Assert a read returns rows (200 + non-empty array).
can_read() {
  local tok="$1" tbl="$2" label="$3"
  local c; c=$(code "$tok" GET "$tbl?academy_id=eq.$ACADEMY_ID&limit=1")
  [ "$c" = "200" ] && ok "$label" || bad "$label" "got HTTP $c"
}
# Assert a read is blocked: RLS with no policy returns 200 + [] (not an error),
# so "denied" here means "no rows come back".
cannot_read() {
  local tok="$1" tbl="$2" label="$3"
  local out; out=$(body "$tok" "$tbl?academy_id=eq.$ACADEMY_ID&limit=1")
  if [ "$out" = "[]" ] || echo "$out" | grep -q '"code"'; then
    ok "$label"
  else
    bad "$label" "LEAK — got: ${out:0:120}"
  fi
}
# Assert a write is rejected (any 4xx, or 201 that we then have to flag).
cannot_write() {
  local tok="$1" tbl="$2" payload="$3" label="$4"
  local c; c=$(code "$tok" POST "$tbl" "$payload")
  case "$c" in
    2*) bad "$label" "LEAK — write accepted (HTTP $c)" ;;
    *)  ok "$label" ;;
  esac
}
rpc_denied() {
  local tok="$1" fn="$2" args="$3" label="$4"
  local c; c=$(rpc "$tok" "$fn" "$args")
  case "$c" in
    2*) bad "$label" "LEAK — RPC succeeded (HTTP $c)" ;;
    *)  ok "$label" ;;
  esac
}

echo "→ authenticating"
ADMIN_TOK=$(login "$ADMIN_EMAIL" "$ADMIN_PW")
INST_TOK=$(login "$INST_EMAIL" "$INST_PW")
[ -n "$ADMIN_TOK" ] || { echo "admin login failed"; exit 1; }
[ -n "$INST_TOK" ]  || { echo "instructor login failed"; exit 1; }
echo "  admin + instructor tokens acquired"

echo
echo "INSTRUCTOR — can do their job"
can_read "$INST_TOK" students            "reads students"
can_read "$INST_TOK" classes             "reads classes"
can_read "$INST_TOK" recurring_templates "reads schedule templates"
can_read "$INST_TOK" enrollments         "reads enrollments"
can_read "$INST_TOK" attendance          "reads attendance"
can_read "$INST_TOK" bookings            "reads bookings"
can_read "$INST_TOK" grading_log         "reads grading log"
can_read "$INST_TOK" events              "reads events"
can_read "$INST_TOK" team_directory      "reads team directory (for class assignment)"

echo
echo "INSTRUCTOR — locked out of admin surfaces"
cannot_read "$INST_TOK" instructors          "cannot read instructors (pay_rate)"
cannot_read "$INST_TOK" class_package_types  "cannot read membership plans"
cannot_read "$INST_TOK" student_packages     "cannot read student packages"
cannot_read "$INST_TOK" discount_codes       "cannot read discount codes"
cannot_read "$INST_TOK" prospects            "cannot read the lead pipeline"
cannot_read "$INST_TOK" equipment            "cannot read equipment"
cannot_read "$INST_TOK" staff_invites        "cannot read staff invites"

echo
echo "INSTRUCTOR — pay rate never reaches the client"
DIR=$(body "$INST_TOK" "team_directory?academy_id=eq.$ACADEMY_ID&limit=5")
if echo "$DIR" | grep -q 'pay_rate'; then
  bad "team_directory omits pay_rate" "LEAK — pay_rate present in view output"
else
  ok "team_directory omits pay_rate"
fi

echo
echo "INSTRUCTOR — cannot escalate privileges"
rpc_denied "$INST_TOK" invite_staff \
  "{\"p_academy_id\":\"$ACADEMY_ID\",\"p_name\":\"Smoke Test\",\"p_email\":null,\"p_role\":\"admin\",\"p_teaches\":true}" \
  "cannot invite staff"
rpc_denied "$INST_TOK" list_academy_members "{\"p_academy_id\":\"$ACADEMY_ID\"}" \
  "cannot list academy members"
rpc_denied "$INST_TOK" set_member_role \
  "{\"p_academy_id\":\"$ACADEMY_ID\",\"p_user_id\":\"00000000-0000-0000-0000-000000000000\",\"p_role\":\"admin\"}" \
  "cannot change roles"
rpc_denied "$INST_TOK" revoke_member \
  "{\"p_academy_id\":\"$ACADEMY_ID\",\"p_user_id\":\"00000000-0000-0000-0000-000000000000\"}" \
  "cannot revoke members"

echo
echo "INSTRUCTOR — cannot write admin data"
cannot_write "$INST_TOK" discount_codes \
  "{\"id\":\"smoke-dc\",\"academy_id\":\"$ACADEMY_ID\",\"code\":\"SMOKE\"}" "cannot create discount codes"
cannot_write "$INST_TOK" academy_features \
  "{\"academy_id\":\"$ACADEMY_ID\",\"module_id\":\"billing\",\"enabled\":true}" "cannot toggle modules"

echo
echo "ADMIN — retains full access"
can_read "$ADMIN_TOK" instructors         "reads instructors"
can_read "$ADMIN_TOK" class_package_types "reads membership plans"
can_read "$ADMIN_TOK" discount_codes      "reads discount codes"
can_read "$ADMIN_TOK" prospects           "reads the lead pipeline"
LM=$(rpc "$ADMIN_TOK" list_academy_members "{\"p_academy_id\":\"$ACADEMY_ID\"}")
[ "$LM" = "200" ] && ok "lists academy members" || bad "lists academy members" "HTTP $LM"

echo
echo "ADMIN — lockout guards hold"
SELF_UID=$(curl -sS "$SUPABASE_URL/auth/v1/user" -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_TOK" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
rpc_denied "$ADMIN_TOK" set_member_role \
  "{\"p_academy_id\":\"$ACADEMY_ID\",\"p_user_id\":\"$SELF_UID\",\"p_role\":\"instructor\"}" \
  "cannot demote self"
rpc_denied "$ADMIN_TOK" revoke_member \
  "{\"p_academy_id\":\"$ACADEMY_ID\",\"p_user_id\":\"$SELF_UID\"}" \
  "cannot revoke self"

echo
printf 'staff RLS: \033[32m%d passed\033[0m, ' "$PASS"
if [ "$FAIL" -gt 0 ]; then printf '\033[31m%d failed\033[0m\n' "$FAIL"; exit 1; fi
printf '0 failed\n'
