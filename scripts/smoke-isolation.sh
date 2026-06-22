#!/usr/bin/env bash
# =============================================================================
# Tatami — tenant-isolation smoke test (P4)
# Creates two throwaway academies and asserts RLS keeps them apart, anon is
# locked out of operational data, and the shared master library is read-only.
# Run AFTER the full migration chain (…013, 014) is applied to the target project.
#
# Usage:
#   SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=eyJ... ./scripts/smoke-isolation.sh
# Defaults to the dev project if env vars are unset.
# =============================================================================
set -uo pipefail

U="${SUPABASE_URL:-https://ozxvvpfhhzgoapbpwida.supabase.co}"
K="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eHZ2cGZoaHpnb2FwYnB3aWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDcwOTMsImV4cCI6MjA5NjMyMzA5M30.DiwfPyjaFR3rkmsfYs26G5lN9W6v7tomCoRzbPk0LoM}"

pass=0; fail=0
ok()  { echo "PASS  $1"; pass=$((pass+1)); }
no()  { echo "FAIL  $1 ($2)"; fail=$((fail+1)); }
chk() { if [ "$2" = "$3" ]; then ok "$1"; else no "$1" "got '$2' want '$3'"; fi; }

jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') if isinstance(d,dict) else '')"; }
jlen() { python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else -1)"; }

signup() { # $1 label -> access_token
  curl -s -X POST "$U/auth/v1/signup" -H "apikey: $K" -H "Content-Type: application/json" \
    -d "{\"email\":\"smoke.$1.$(date +%s)-$RANDOM@example.com\",\"password\":\"test123456\"}" | jget access_token
}
mkacad() { # $1 token $2 name -> academy_id
  curl -s -X POST "$U/rest/v1/rpc/create_academy" -H "apikey: $K" -H "Authorization: Bearer $1" \
    -H "Content-Type: application/json" -d "{\"p_name\":\"$2\"}" | tr -d '"'
}
post_code() { # $1 token $2 path $3 body -> http status
  curl -s -o /dev/null -w '%{http_code}' -X POST "$U/rest/v1$2" \
    -H "apikey: $K" -H "Authorization: Bearer $1" -H "Content-Type: application/json" \
    -H "Prefer: return=representation" -d "$3"
}
get_code() { # $1 token $2 path -> http status
  curl -s -o /dev/null -w '%{http_code}' "$U/rest/v1$2" -H "apikey: $K" -H "Authorization: Bearer $1"
}
get_body() { # $1 token $2 path -> body
  curl -s "$U/rest/v1$2" -H "apikey: $K" -H "Authorization: Bearer $1"
}

echo "== Tatami isolation smoke test =="
echo "target: $U"; echo

TA=$(signup a); TB=$(signup b)
if [ -n "$TA" ] && [ -n "$TB" ]; then ok "two users signed up"; else no "signup" "empty token"; exit 1; fi
AID=$(mkacad "$TA" "Smoke-A"); BID=$(mkacad "$TB" "Smoke-B")
if [ -n "$AID" ] && [ -n "$BID" ] && [ "$AID" != "$BID" ]; then ok "two academies created"; else no "create_academy" "A=$AID B=$BID"; exit 1; fi

SID="smk-$(date +%s)-$RANDOM"
# A can write + read its own students (full row — joined_at is NOT NULL).
c=$(post_code "$TA" /students "{\"id\":\"$SID\",\"name\":\"A One\",\"initials\":\"AO\",\"joined_at\":\"2026-01-01\",\"academy_id\":\"$AID\"}")
chk "A inserts own student" "$c" 201
n=$(get_body "$TA" "/students?select=id&academy_id=eq.$AID" | jlen)
if [ "$n" -ge 1 ]; then ok "A reads own students ($n)"; else no "A reads own students" "count=$n"; fi

# Cross-tenant: A must not see or write B (full row, so a 403 is purely RLS).
cb=$(get_body "$TA" "/students?select=id&academy_id=eq.$BID")
chk "A cannot read B's students" "$cb" "[]"
c=$(post_code "$TA" /students "{\"id\":\"${SID}x\",\"name\":\"X\",\"initials\":\"X\",\"joined_at\":\"2026-01-01\",\"academy_id\":\"$BID\"}")
chk "A cannot write into B (with-check)" "$c" 403

# Anon locked out of operational data.
an=$(get_body "$K" "/students?select=id&academy_id=eq.$AID")
chk "anon cannot read students" "$an" "[]"

# Master library: public read, writes denied (post-014).
chk "master read works (sports)"            "$(get_code "$K" "/sports?select=id&limit=1")" 200
chk "anon write to master denied (sports)"  "$(post_code "$K"  /sports '{"id":"sport-smktest","name":{"en":"X"}}')" 403
chk "member write to master denied (sports)" "$(post_code "$TA" /sports '{"id":"sport-smktest2","name":{"en":"X"}}')" 403

echo; echo "== $pass passed, $fail failed =="
[ "$fail" -eq 0 ]
