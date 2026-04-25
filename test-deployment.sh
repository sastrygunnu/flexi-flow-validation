#!/bin/bash

# Test Deployment Script
# Usage: ./test-deployment.sh https://your-app.railway.app

if [ -z "$1" ]; then
  echo "Usage: ./test-deployment.sh <YOUR_DEPLOYMENT_URL>"
  echo "Example: ./test-deployment.sh https://validly-production-abc123.up.railway.app"
  exit 1
fi

URL=$1
echo "Testing deployment at: $URL"
echo "======================================"
echo ""

# Test 1: Frontend loads
echo "✓ Test 1: Frontend loads"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)
if [ "$STATUS" = "200" ]; then
  echo "  ✅ PASS: Frontend responds with 200"
else
  echo "  ❌ FAIL: Got status $STATUS (expected 200)"
fi
echo ""

# Test 2: API health
echo "✓ Test 2: API health check"
HEALTH=$(curl -s $URL/api/circle/status | grep -o '"ok":true')
if [ ! -z "$HEALTH" ]; then
  echo "  ✅ PASS: API is healthy"
else
  echo "  ❌ FAIL: API not responding correctly"
fi
echo ""

# Test 3: Flows exist
echo "✓ Test 3: Flows API"
FLOWS=$(curl -s $URL/api/flows | grep -o '"flows":\[')
if [ ! -z "$FLOWS" ]; then
  echo "  ✅ PASS: Flows API responds"
else
  echo "  ❌ FAIL: Flows API not working"
fi
echo ""

# Test 4: Circle balance
echo "✓ Test 4: Circle payer balance"
BALANCE=$(curl -s $URL/api/circle/status | grep -o '"amount":"[0-9.]*"' | head -1)
if [ ! -z "$BALANCE" ]; then
  echo "  ✅ PASS: Balance found: $BALANCE"
else
  echo "  ❌ FAIL: No balance found"
fi
echo ""

echo "======================================"
echo "Full test details:"
echo ""
echo "Circle Status:"
curl -s $URL/api/circle/status | python3 -m json.tool 2>/dev/null || curl -s $URL/api/circle/status | jq '.' 2>/dev/null || curl -s $URL/api/circle/status
echo ""
echo "======================================"
echo "Flows:"
curl -s $URL/api/flows | python3 -m json.tool 2>/dev/null || curl -s $URL/api/flows | jq '.' 2>/dev/null || curl -s $URL/api/flows
echo ""
echo "======================================"
echo ""
echo "If all tests pass, open $URL in your browser!"
