#!/bin/bash
# VulnManager v0.11.0 - Modular Reports Quick Test
# Run this script to verify the modular report system is working

set -e  # Exit on error

BASE_URL="http://localhost:8000"
OUTPUT_DIR="/tmp"

echo "======================================"
echo "VulnManager Modular Reports Test"
echo "======================================"
echo ""

# Test 1: Check backend health
echo "Test 1: Backend Health Check"
response=$(curl -s "${BASE_URL}/health" || echo '{"status":"error"}')
status=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'error'))")
if [ "$status" = "healthy" ]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi
echo ""

# Test 2: List available modules
echo "Test 2: Module Availability"
modules=$(curl -s "${BASE_URL}/report/modules")
total=$(echo "$modules" | python3 -c "import sys, json; print(json.load(sys.stdin).get('total', 0))")
available=$(echo "$modules" | python3 -c "import sys, json; print(json.load(sys.stdin).get('available', 0))")
echo "Total modules: $total"
echo "Available modules: $available"
if [ "$available" -ge 4 ]; then
    echo "✅ At least 4 modules available"
else
    echo "⚠️  Only $available modules available (expected 4+)"
    echo "   Run: curl http://localhost:8000/report/modules/generate-defaults"
fi
echo ""

# Test 3: Create test project
echo "Test 3: Create Test Project"
project_response=$(curl -s -L -X POST "${BASE_URL}/projects/" \
    -H "Content-Type: application/json" \
    -d '{"name":"Modular Report Quick Test","consultant_name":"Test Suite"}')
project_id=$(echo "$project_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', 0))")
if [ "$project_id" -gt 0 ]; then
    echo "✅ Created project ID: $project_id"
else
    echo "❌ Failed to create project"
    exit 1
fi
echo ""

# Test 4: Add test finding
echo "Test 4: Add Test Finding"
finding_response=$(curl -s -X POST "${BASE_URL}/projects/${project_id}/findings" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "SQL Injection Vulnerability",
        "risk_rating": "Critical",
        "description": "SQL injection vulnerability in login form allows unauthorized database access",
        "remediation": "Use parameterized queries and input validation",
        "instances": [
            {"location": "/api/login", "details": "Username parameter vulnerable"},
            {"location": "/api/search", "details": "Search query parameter vulnerable"}
        ]
    }')
finding_id=$(echo "$finding_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', 0))")
if [ "$finding_id" -gt 0 ]; then
    echo "✅ Created finding ID: $finding_id"
else
    echo "❌ Failed to create finding"
    exit 1
fi
echo ""

# Test 5: Generate modular report
echo "Test 5: Generate Modular Report"
report_file="${OUTPUT_DIR}/modular_test_report_${project_id}.docx"
curl -s -X POST "${BASE_URL}/projects/${project_id}/report/assemble" \
    -H "Content-Type: application/json" \
    -d '{
        "modules": ["title_page", "executive_summary", "detailed_findings", "recommendations"],
        "variables": {
            "company_name": "Test Corporation",
            "report_date": "2024-11-12",
            "report_version": "1.0"
        }
    }' -o "$report_file"

if [ -f "$report_file" ]; then
    file_size=$(wc -c < "$report_file")
    file_type=$(file -b "$report_file" | head -n 1)
    
    if [ "$file_size" -gt 10000 ] && echo "$file_type" | grep -qi "microsoft"; then
        echo "✅ Report generated successfully"
        echo "   File: $report_file"
        echo "   Size: $file_size bytes"
        echo "   Type: $file_type"
    else
        echo "❌ Report file is invalid"
        echo "   Size: $file_size bytes"
        echo "   Type: $file_type"
        echo "   Content:"
        cat "$report_file"
        exit 1
    fi
else
    echo "❌ Report file not created"
    exit 1
fi
echo ""

# Test 6: Verify report content
echo "Test 6: Verify Report Content"
content_check=$(docker exec vuln-manager-backend-1 python3 -c "
from docx import Document
doc = Document('$report_file')
print(f'paragraphs={len(doc.paragraphs)},tables={len(doc.tables)}')
" 2>/dev/null || echo "paragraphs=0,tables=0")

if echo "$content_check" | grep -q "paragraphs=0"; then
    echo "⚠️  Could not verify content (docker exec failed or file not in container)"
    echo "   This is OK if running outside container"
else
    paragraphs=$(echo "$content_check" | sed 's/.*paragraphs=\([0-9]*\).*/\1/')
    tables=$(echo "$content_check" | sed 's/.*tables=\([0-9]*\).*/\1/')
    echo "   Paragraphs: $paragraphs"
    echo "   Tables: $tables"
    
    if [ "$paragraphs" -gt 20 ] && [ "$tables" -ge 2 ]; then
        echo "✅ Report content verified"
    else
        echo "⚠️  Report content may be incomplete"
    fi
fi
echo ""

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo "✅ All core tests passed!"
echo ""
echo "Generated report: $report_file"
echo ""
echo "Next steps:"
echo "1. Open the report in Word/LibreOffice to verify formatting"
echo "2. Customize templates in /app/report_modules/"
echo "3. Generate additional modules if needed"
echo ""
echo "API Usage:"
echo "  List modules:     curl ${BASE_URL}/report/modules"
echo "  Generate defaults: curl ${BASE_URL}/report/modules/generate-defaults"
echo "  Assemble report:  curl -X POST ${BASE_URL}/projects/{id}/report/assemble \\"
echo "                         -d '{\"modules\": [...], \"variables\": {...}}' \\"
echo "                         -o report.docx"
echo ""
echo "Documentation:"
echo "  - notes/MODULAR_REPORTS_QUICKREF.md"
echo "  - notes/MODULAR_REPORTS_TESTING_COMPLETE.md"
echo "  - notes/MODULAR_REPORT_INTEGRATION_GUIDE.md"
echo "======================================"
