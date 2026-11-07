#!/usr/bin/env bash
# Seeds a running local instance (default http://localhost:8080, in-memory H2) with demo data:
#   owner1 / tech1 / cust1  (password: devpass123)  -- local dev only
#   one garage in Bengaluru priced for every fault x vehicle type, tech1 joined to it,
#   cust1 with one SEDAN.
# Usage: bash scripts/seed-dev-data.sh [base-url]
set -euo pipefail
BASE="${1:-http://localhost:8080}"
PASS="devpass123"
J='Content-Type: application/json'

reg() { curl -s -X POST "$BASE/auth/register" -H "$J" \
  -d "{\"username\":\"$1\",\"email\":\"$1@example.com\",\"password\":\"$PASS\",\"phone\":\"+9198000000$2\",\"roles\":[\"$3\"]}" >/dev/null; }
tok() { curl -s -X POST "$BASE/auth/login" -H "$J" -d "{\"username\":\"$1\",\"password\":\"$PASS\"}" \
  | sed -E 's/.*"token":"([^"]+)".*/\1/'; }

reg owner1 01 ROLE_GARAGE_OWNER
reg tech1  02 ROLE_GARAGE_MEMBER
reg cust1  03 ROLE_USER
OWNER=$(tok owner1); TECH=$(tok tech1); CUST=$(tok cust1)

GARAGE_ID=$(curl -s -X POST "$BASE/api/garages" -H "$J" -H "Authorization: Bearer $OWNER" \
  -d '{"name":"MG Road Auto Care","address":"MG Road, Bengaluru","latitude":12.9756,"longitude":77.6066,"dailyCapacity":10}' \
  | sed -E 's/^\{"id":([0-9]+).*/\1/')

FAULTS=$(curl -s "$BASE/api/fault-types" -H "Authorization: Bearer $OWNER" | grep -oE '"id":[0-9]+' | cut -d: -f2)
VTYPES=$(curl -s "$BASE/api/vehicle-types" -H "Authorization: Bearer $OWNER" | grep -oE '"id":[0-9]+' | cut -d: -f2)
for f in $FAULTS; do for v in $VTYPES; do
  curl -s -X POST "$BASE/api/garages/$GARAGE_ID/prices" -H "$J" -H "Authorization: Bearer $OWNER" \
    -d "{\"faultTypeId\":$f,\"vehicleTypeId\":$v,\"price\":$((300 + f * 50 + v * 20))}" >/dev/null
done; done

curl -s -X POST "$BASE/api/garage-members/join" -H "$J" -H "Authorization: Bearer $TECH" \
  -d "{\"garageId\":$GARAGE_ID}" >/dev/null

SEDAN=$(curl -s "$BASE/api/vehicle-types" -H "Authorization: Bearer $CUST" | grep -oE '"id":[0-9]+,"name":"SEDAN"' | grep -oE '[0-9]+')
curl -s -X POST "$BASE/api/vehicles" -H "$J" -H "Authorization: Bearer $CUST" \
  -d "{\"vehicleTypeId\":$SEDAN,\"model\":\"Honda City\",\"year\":2021,\"licensePlate\":\"KA01AB1234\"}" >/dev/null

echo "Seeded garage $GARAGE_ID with owner1 / tech1 / cust1"
