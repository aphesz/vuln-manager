#!/bin/bash
# Predictive Analytics Testing Script

BASE_URL="http://localhost:8000"
PROJECT_ID=3

echo "=================================="
echo "v0.8.5 Predictive Analytics Tests"
echo "=================================="
echo ""

# Test 1: Remediation Time (all risk levels)
echo "📊 TEST 1: Remediation Time Estimation (All Risk Levels)"
echo "---"
curl -s "${BASE_URL}/projects/${PROJECT_ID}/predict/remediation-time" | python3 -m json.tool
echo ""
echo ""

# Test 2: Remediation Time (filtered by risk level)
echo "📊 TEST 2: Remediation Time Estimation (Critical Only)"
echo "---"
curl -s "${BASE_URL}/projects/${PROJECT_ID}/predict/remediation-time?risk_level=Critical" | python3 -m json.tool
echo ""
echo ""

# Test 3: Risk Forecast
echo "📈 TEST 3: Risk Forecasting (30/60/90 days)"
echo "---"
curl -s "${BASE_URL}/projects/${PROJECT_ID}/predict/risk-forecast" | python3 -m json.tool
echo ""
echo ""

# Test 4: Anomaly Detection
echo "⚠️  TEST 4: Anomaly Detection"
echo "---"
curl -s "${BASE_URL}/projects/${PROJECT_ID}/predict/anomalies" | python3 -m json.tool
echo ""
echo ""

# Test 5: Recommendations
echo "💡 TEST 5: Actionable Recommendations"
echo "---"
curl -s "${BASE_URL}/projects/${PROJECT_ID}/predict/recommendations" | python3 -m json.tool
echo ""
echo ""

# Test 6: Rate Limiting (should succeed)
echo "🚦 TEST 6: Rate Limiting (First Request)"
echo "---"
START=$(date +%s)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/projects/${PROJECT_ID}/predict/remediation-time")
END=$(date +%s)
DURATION=$((END - START))
echo "Status Code: ${STATUS}"
echo "Response Time: ${DURATION}s"
echo ""

# Test 7: Invalid project ID
echo "❌ TEST 7: Invalid Project (Error Handling)"
echo "---"
curl -s "${BASE_URL}/projects/99999/predict/remediation-time" | python3 -m json.tool
echo ""
echo ""

# Test 8: Multiple projects comparison
echo "🔄 TEST 8: Compare Predictions Across Projects"
echo "---"
for PID in 3 4; do
    echo "Project ${PID}:"
    FORECAST=$(curl -s "${BASE_URL}/projects/${PID}/predict/risk-forecast")
    echo "${FORECAST}" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  Current: {d['current_risk_score']}, Trend: {d['trend']}, 90d: {d['forecast_90_days']['predicted_risk_score']}\")"
done
echo ""

echo "=================================="
echo "✅ All Tests Complete"
echo "=================================="
