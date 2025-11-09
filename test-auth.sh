#!/bin/bash
# Test authentication endpoints

BASE_URL="http://localhost:8000"

echo "=== Testing Authentication Endpoints ==="
echo ""

# Test 1: Register a new user
echo "1. Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vulnmanager.local",
    "username": "admin",
    "password": "Admin123",
    "full_name": "Admin User",
    "role": "admin"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
echo ""

# Test 2: Login
echo "2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@vulnmanager.local&password=Admin123")

echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" != "null" ]; then
  echo "3. Getting current user profile..."
  curl -s -X GET "$BASE_URL/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
  echo ""

  echo "4. Testing protected endpoint (list users - admin only)..."
  curl -s -X GET "$BASE_URL/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
  echo ""
else
  echo "Failed to get access token"
fi

echo ""
echo "=== Tests Complete ==="
