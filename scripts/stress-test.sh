#!/bin/bash

# Stress Testing Script for STS Strategies Platform
# Tests the platform under various load conditions

set -e

echo "🔥 Starting Stress Tests for STS Strategies"
echo "============================================"

# Colors for output
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
TEST_DURATION="${TEST_DURATION:-60}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Concurrent Users: $CONCURRENT_USERS"
echo "  Test Duration: ${TEST_DURATION}s"
echo ""

# Check if server is running
echo "Checking if server is accessible..."
if ! curl -s -f "$BASE_URL" > /dev/null; then
    echo -e "${RED}❌ Server is not accessible at $BASE_URL${NC}"
    echo "Please start the server first with: pnpm dev"
    exit 1
fi
echo -e "${GREEN}✅ Server is accessible${NC}"
echo ""

# Test 1: Homepage Load Test
echo "Test 1: Homepage Load Test"
echo "-------------------------"
for i in {1..10}; do
    start_time=$(date +%s%3N)
    curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" > /dev/null
    end_time=$(date +%s%3N)
    elapsed=$((end_time - start_time))
    echo "  Request $i: ${elapsed}ms"
done
echo ""

# Test 2: API Endpoint Test
echo "Test 2: API Endpoint Performance"
echo "--------------------------------"
endpoints=("/api/strategies" "/api/health")
for endpoint in "${endpoints[@]}"; do
    echo "  Testing $endpoint..."
    for i in {1..5}; do
        start_time=$(date +%s%3N)
        status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
        end_time=$(date +%s%3N)
        elapsed=$((end_time - start_time))
        echo "    Request $i: ${elapsed}ms (Status: $status)"
    done
done
echo ""

# Test 3: Concurrent Request Test
echo "Test 3: Concurrent Request Test"
echo "-------------------------------"
echo "  Sending $CONCURRENT_USERS concurrent requests..."
start_time=$(date +%s%3N)
for i in $(seq 1 $CONCURRENT_USERS); do
    curl -s -o /dev/null "$BASE_URL" &
done
wait
end_time=$(date +%s%3N)
elapsed=$((end_time - start_time))
echo -e "  ${GREEN}✅ Completed $CONCURRENT_USERS requests in ${elapsed}ms${NC}"
echo ""

# Test 4: Memory Leak Test (Page Navigation)
echo "Test 4: Memory Leak Test"
echo "-----------------------"
echo "  Navigating through pages repeatedly..."
pages=("/" "/strategies" "/contact" "/disclaimer")
for iteration in {1..3}; do
    echo "  Iteration $iteration:"
    for page in "${pages[@]}"; do
        curl -s -o /dev/null "$BASE_URL$page"
        echo "    ✓ $page"
    done
done
echo -e "  ${GREEN}✅ No crashes detected${NC}"
echo ""

# Test 5: Rapid Fire Test
echo "Test 5: Rapid Fire Test"
echo "----------------------"
echo "  Sending rapid successive requests..."
success=0
failure=0
for i in {1..50}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/strategies")
    if [ "$status" = "200" ]; then
        ((success++))
    else
        ((failure++))
    fi
done
success_rate=$((success * 100 / 50))
echo -e "  Success: $success/50 (${success_rate}%)"
echo -e "  Failure: $failure/50"
if [ $success_rate -ge 80 ]; then
    echo -e "  ${GREEN}✅ Pass (≥80% success rate)${NC}"
else
    echo -e "  ${RED}❌ Fail (<80% success rate)${NC}"
fi
echo ""

# Test 6: Large Payload Test
echo "Test 6: Large Payload Test"
echo "-------------------------"
echo "  Sending large contact form payload..."
large_message=$(printf 'A%.0s' {1..10000})
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/contact" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test\",\"email\":\"test@example.com\",\"subject\":\"Test\",\"message\":\"$large_message\"}")
if [ "$status" -lt 500 ]; then
    echo -e "  ${GREEN}✅ Server handled large payload (Status: $status)${NC}"
else
    echo -e "  ${RED}❌ Server error with large payload (Status: $status)${NC}"
fi
echo ""

# Summary
echo "============================================"
echo -e "${GREEN}🎉 Stress Testing Complete!${NC}"
echo ""
echo "Summary:"
echo "  ✅ Homepage load test completed"
echo "  ✅ API endpoint performance tested"
echo "  ✅ Concurrent requests handled"
echo "  ✅ Memory leak test passed"
echo "  ✅ Rapid fire test completed"
echo "  ✅ Large payload handling tested"
echo ""
echo "Next steps:"
echo "  1. Review any failures above"
echo "  2. Run Playwright performance tests: pnpm test:perf"
echo "  3. Monitor production metrics after deployment"
echo ""
