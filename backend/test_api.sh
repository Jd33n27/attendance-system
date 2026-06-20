#!/bin/bash

# Exit on first error
set -e

echo "=== OALCDA API INTEGRATION TEST ==="

# Base URL (default to localhost:8080)
API_URL=${API_URL:-"http://localhost:8080"}
ADMIN_TOKEN=${ADMIN_TOKEN:-"super-secret-admin-token-change-me"}

echo "Using API URL: $API_URL"

# Helper function to print response headers and body
call_api() {
  local method=$1
  local path=$2
  local data=$3
  local auth=$4
  
  local auth_header=""
  if [ -n "$auth" ]; then
    auth_header="-H \"Authorization: Bearer $auth\""
  fi

  local data_param=""
  if [ -n "$data" ]; then
    data_param="-d '$data'"
  fi

  echo "--------------------------------------" >&2
  echo "Request: $method $path" >&2
  if [ -n "$data" ]; then
    echo "Payload: $data" >&2
  fi

  local cmd="curl -s -w '\nHTTP_STATUS:%{http_code}\n' -X $method"
  if [ -n "$auth" ]; then
    cmd="$cmd -H 'Authorization: Bearer $auth'"
  fi
  if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
    cmd="$cmd -H 'Content-Type: application/json'"
  fi
  if [ -n "$data" ]; then
    cmd="$cmd -d '$data'"
  fi
  cmd="$cmd $API_URL$path"

  response=$(eval $cmd)
  
  body=$(echo "$response" | grep -v "HTTP_STATUS:")
  status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d':' -f2)

  echo "Status: $status" >&2
  echo "Body: $body" >&2
  
  if [ "$status" -ne 200 ] && [ "$status" -ne 201 ]; then
    echo "ERROR: Unexpected status code $status" >&2
    exit 1
  fi
  
  # Return body
  echo "$body"
}

# 1. Check Health Check
echo "Testing health check..."
call_api "GET" "/health" "" ""

# 2. Register a new user
echo "Testing user registration..."
rand_id=$RANDOM
reg_name="Tester Joe $rand_id"
reg_response=$(call_api "POST" "/api/auth/register" "{\"name\":\"$reg_name\",\"department\":\"Engineering\"}" "")
user_id=$(echo "$reg_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
qr_key=$(echo "$reg_response" | grep -o '"qr_key":"[^"]*' | cut -d'"' -f4)
echo "Created User ID: $user_id"
echo "QR Key Prefix: $qr_key"

# 3. Generate Daily QR
echo "Testing QR code generation..."
qr_response=$(call_api "POST" "/api/qr/generate" "{}" "$ADMIN_TOKEN")
qr_string=$(echo "$qr_response" | grep -o '"qr_code_string":"[^"]*' | cut -d'"' -f4)
echo "Generated QR code string: $qr_string"

# 4. Get Active QR
echo "Testing active QR retrieval..."
call_api "GET" "/api/qr/active" "" ""

# 5. Clock In
echo "Testing clock-in..."
call_api "POST" "/api/attendance/scan" "{\"qr_string\":\"$qr_string\",\"user_id\":\"$user_id\",\"action\":\"in\"}" ""

# 6. Clock Out
echo "Testing clock-out..."
call_api "POST" "/api/attendance/scan" "{\"qr_string\":\"$qr_string\",\"user_id\":\"$user_id\",\"action\":\"out\"}" ""

# 7. Get Logs
echo "Testing historical logs retrieval..."
call_api "GET" "/api/attendance/logs/$user_id" "" ""

# 8. Test Duplicate Registration (Expects 409 Conflict)
echo "Testing duplicate registration rejection..."
status=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -d "{\"name\":\"$reg_name\",\"department\":\"Engineering\"}" $API_URL/api/auth/register)
if [ "$status" -ne 409 ]; then
  echo "ERROR: Expected 409 Conflict for duplicate registration, got $status"
  exit 1
fi
echo "Duplicate registration correctly blocked (Status: 409)"

# 9. Test Login (Expects 200 OK)
echo "Testing login with QR key..."
login_response=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"qr_key\":\"$qr_key\"}" $API_URL/api/auth/login)
if [[ ! "$login_response" =~ "$user_id" ]]; then
  echo "ERROR: Login response did not contain user_id"
  exit 1
fi
echo "Login succeeded with valid QR key"

# 10. Test Admin Verify Token (Expects 200 OK)
echo "Testing admin token verification (success)..."
admin_verify_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" $API_URL/api/admin/verify)
if [ "$admin_verify_status" -ne 200 ]; then
  echo "ERROR: Expected 200 OK for valid admin token, got $admin_verify_status"
  exit 1
fi
echo "Admin token successfully verified (Status: 200)"

# 11. Test Admin Verify Token (Expects 401 Unauthorized)
echo "Testing admin token verification (failure)..."
admin_verify_fail_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer wrong-token" $API_URL/api/admin/verify)
if [ "$admin_verify_fail_status" -ne 401 ]; then
  echo "ERROR: Expected 401 Unauthorized for invalid admin token, got $admin_verify_fail_status"
  exit 1
fi
echo "Admin token invalidation correctly rejected (Status: 401)"

echo "--------------------------------------"
echo "✅ ALL API TESTS COMPLETED SUCCESSFULLY!"

