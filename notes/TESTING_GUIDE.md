# 🧪 VulnManager Testing Guide

Comprehensive testing documentation covering manual testing, automated test suites, and troubleshooting procedures.

---

## 📊 Test Coverage Summary

**Current Stats (v0.15.0):**
- **Total Backend Tests:** ~260+ tests
- **Pass Rate:** 92-96% (179/179 latest run)
- **Test Execution Time:** ~1-5 seconds
- **Coverage:** 100% for v0.7.x+ features

**Test Distribution:**
- Core CRUD: ~50 tests
- Authentication: ~20 tests
- Import System: ~66 tests (v0.7.3 additions)
- Scoring Calculators: ~17 tests
- Export System: ~23 tests
- Vulnerability Templates: ~40+ tests
- Matching Engine: ~20 tests

---

## 🚀 Quick Start - Running Tests

### Backend Tests (pytest)

```bash
# Run all tests
cd backend
pytest

# Run specific test file
pytest tests/test_cve_import.py

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test function
pytest tests/test_import_history.py::test_get_import_history_paginated
```

### Frontend Tests (vitest)

```bash
# Run all tests
cd frontend
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

---

## 🧪 Manual Testing Procedures

### Project Lifecycle Testing

**1. Create Project**
```bash
curl -X POST http://localhost:8000/projects/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Manual Test Project","consultant_name":"Test User"}'
# Expected: 200 OK, returns project with ID
```

**2. Upload Scanner Report**
```bash
# Upload Burp Suite report
curl -X POST http://localhost:8000/projects/1/upload/auto \
  -F "file=@test-files/burp_sample.xml"
# Expected: Findings created, instances linked

# Upload Nessus report
curl -X POST http://localhost:8000/projects/1/upload/nessus \
  -F "file=@test-files/nessus_sample.xml"
# Expected: New findings or instances added to existing
```

**3. Verify Findings**
```bash
curl http://localhost:8000/projects/1
# Expected: JSON with findings array, instance counts
```

**4. Generate Report**
```bash
# PDF Report
curl -o report.pdf http://localhost:8000/projects/1/report.pdf

# DOCX Report (v2 modular)
curl -X POST http://localhost:8000/projects/1/report/assemble/v2 \
  -H "Content-Type: application/json" \
  -d '{"template_ids":[5,6,7],"variables":{"company_name":"TestCo"}}' \
  -o report.docx
# Expected: Valid DOCX file, opens in Word
```

### Template System Testing

**1. Upload Custom Template**
```bash
curl -X POST http://localhost:8000/projects/1/templates/upload \
  -F "file=@my_template.docx" \
  -F "name=Custom Findings" \
  -F "description=Executive summary"
# Expected: Template created with unique ID
```

**2. List Available Templates**
```bash
curl http://localhost:8000/projects/1/templates
# Expected: Array of system + custom templates
```

**3. Generate from Custom Template**
```bash
curl -X POST http://localhost:8000/projects/1/report/assemble/v2 \
  -H "Content-Type: application/json" \
  -d '{"template_ids":[17],"variables":{"company_name":"Acme"}}' \
  -o custom_report.docx
```

### Vulnerability Repository Testing

**1. Import CWE Database**
- Navigate to Vulnerability Template Manager
- Click "Import CWE Database"
- Upload MITRE CWE XML file
- Verify statistics: ~900 templates created
- Check success rate: Should be >95%

**2. Import Single CVE**
```bash
curl -X POST "http://localhost:8000/vulnerability-templates/import-cve?cve_id=CVE-2021-44228"
# Expected: Log4Shell template created with CVSS 10.0
```

**3. Auto-Match Findings**
```bash
curl -X POST "http://localhost:8000/projects/1/auto-match?min_score=0.85"
# Expected: Match suggestions with confidence scores
```

### Export System Testing

**1. Excel Export**
```bash
curl "http://localhost:8000/projects/1/export?format=xlsx&risk_rating=Critical,High" \
  -o findings.xlsx
# Expected: Valid Excel file with filtered findings
```

**2. SARIF Export (CI/CD)**
```bash
curl http://localhost:8000/projects/1/export/sarif -o results.sarif
# Expected: SARIF 2.1.0 JSON, compatible with GitHub Security
```

**3. Interactive HTML Export**
```bash
curl http://localhost:8000/projects/1/export/html -o report.html
# Open in browser, verify sortable table and search work
```

---

## 🔍 Automated Test Suites

### Backend Test Organization

**Core CRUD Tests** (`test_projects.py`, `test_findings.py`):
- Project creation/update/delete
- Finding CRUD operations
- Instance management
- Relationship integrity

**Upload Parser Tests** (`test_parsers.py`):
- Burp Suite XML parsing
- Nessus XML parsing
- CWE/CVE extraction
- Auto-template creation
- Deduplication logic

**Vulnerability Template Tests** (`test_vulnerability_templates.py`):
- Template CRUD operations
- Version history creation
- Bulk operations (delete, update)
- NVD enrichment
- ATT&CK technique mapping

**Import System Tests**:
- `test_cve_import.py` (30 tests) - NVD API integration, error handling
- `test_import_history.py` (36 tests) - History tracking, statistics
- `test_cwe_import.py` (12 tests) - File validation, XML parsing

**Scoring Tests** (`test_scoring_calculators.py`):
- CVSS 3.1 vector parsing
- CVSS score calculation accuracy
- OWASP risk matrix validation

**Matching Tests** (`test_matching.py`):
- Exact CWE/CVE matching
- Fuzzy title/description matching
- Confidence score validation
- Match record creation

**Export Tests** (`test_export.py`):
- Excel/CSV generation
- JSON/Markdown formatting
- Filter application
- Column selection

### Running Specific Test Categories

```bash
# Authentication tests
pytest tests/test_auth.py -v

# Import system tests
pytest tests/test_cve_import.py tests/test_import_history.py -v

# Scoring tests
pytest tests/test_scoring_calculators.py -v

# Template tests
pytest tests/test_vulnerability_templates.py -v

# All tests with coverage
pytest --cov=app --cov-report=term-missing
```

---

## 🐛 Troubleshooting Test Failures

### Common Issues

**1. Database Constraint Violations**
```
IntegrityError: NOT NULL constraint failed
```
**Solution:** Check migration files are up to date
```bash
cd backend
alembic upgrade head
```

**2. Rate Limiting Errors (429)**
```
HTTP 429: Too Many Requests
```
**Solution:** Rate limiting is disabled in pytest via sys.modules detection
- Check `backend/app/main.py` has `"pytest" in sys.modules` check
- If still failing, temporarily disable rate limiting in test environment

**3. Missing Test Database**
```
OperationalError: unable to open database file
```
**Solution:** Tests use in-memory SQLite
- Check `conftest.py` creates engine with `sqlite:///:memory:`
- Verify `TestingSessionLocal` dependency override

**4. Import History FK Violations**
```
IntegrityError: FOREIGN KEY constraint failed
```
**Solution:** Delete version history before deleting templates
```python
# In bulk_delete endpoint
session.execute(delete(VulnerabilityTemplateVersion).where(...))
session.execute(delete(VulnerabilityTemplate).where(...))
```

**5. Frontend Build Failures**
```
Failed to resolve import
```
**Solution:** Clear cache and rebuild
```bash
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

### Debugging Strategies

**Enable SQL Query Logging:**
```python
# In main.py or db.py
engine = create_engine(DATABASE_URL, echo=True)
```

**Print Request/Response in Tests:**
```python
response = client.post("/endpoint", json=data)
print(f"Request: {data}")
print(f"Response: {response.json()}")
assert response.status_code == 200
```

**Use pytest --pdb for Breakpoints:**
```bash
pytest tests/test_file.py::test_function --pdb
# Drops into debugger on failure
```

**Check Docker Logs:**
```bash
docker-compose logs backend --tail 100
docker-compose logs frontend --tail 100
```

---

## ✅ Manual Testing Checklist

### Pre-Release Testing (Run before each release)

**Backend API:**
- [ ] Health check endpoint returns 200
- [ ] Project CRUD operations work
- [ ] Scanner uploads create findings
- [ ] Report generation (PDF/DOCX) succeeds
- [ ] Export formats (Excel/CSV/JSON/Markdown/SARIF/HTML/PPTX) work
- [ ] Template system (upload/list/generate) functions
- [ ] CVE/CWE import completes successfully
- [ ] Auto-matching finds suggestions
- [ ] Version history creates snapshots
- [ ] Bulk operations (delete/update) work

**Frontend UI:**
- [ ] Dashboard loads with all widgets
- [ ] Projects list displays correctly
- [ ] Findings table with all columns works
- [ ] Interactive filters (risk, status, tags) apply correctly
- [ ] Export dialog opens and downloads files
- [ ] Template manager CRUD operations function
- [ ] Documentation viewer shows variables
- [ ] Version history displays and rollback works
- [ ] Dark mode toggle switches themes
- [ ] Mobile responsive layout verified

**Integration Tests:**
- [ ] Upload Burp report → findings created
- [ ] Upload Nessus report → instances added
- [ ] Generate modular report → valid DOCX
- [ ] Import CWE database → ~900 templates
- [ ] Import CVE → NVD data enriched
- [ ] Auto-match → suggestions with scores
- [ ] Bulk delete templates → usage protection works
- [ ] Create template version → snapshot saved
- [ ] Rollback template → previous state restored

**Performance:**
- [ ] Dashboard loads in <2 seconds
- [ ] Report generation completes in <5 seconds
- [ ] Export completes in <3 seconds
- [ ] No memory leaks (check with dev tools)
- [ ] No console errors in browser

---

## 📈 Test Result History

### v0.15.0 (Current)
- **Backend:** 179/179 passing (100%)
- **Frontend:** Not reported
- **Known Issues:** None critical
- **Notes:** All new documentation features tested

### v0.7.3 (Test Coverage Milestone)
- **Backend:** 260+/260+ passing (100%)
- **New Tests:** +66 (import history + CVE import)
- **Coverage:** 100% for v0.7.x features

### v0.6.0
- **Backend:** 173/179 passing (96.6%)
- **Known Issues:** 14 template tests (isolation issues, non-critical)
- **Export Tests:** 23/23 passing (100%)

### v0.5.0
- **Backend:** 156/156 passing (100%)
- **Tagging Tests:** 23/23 passing (100%)

---

## 🔧 Test Environment Setup

### Local Development

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
pip install pytest pytest-cov

# Run tests
pytest

# Frontend setup
cd frontend
npm install
npm test
```

### Docker Environment

```bash
# Start services
docker-compose up -d

# Run backend tests in container
docker exec vuln-manager-backend-1 pytest

# View logs
docker-compose logs backend --tail 50
```

### CI/CD (Future)

```yaml
# .github/workflows/tests.yml (example)
name: Tests
on: [push, pull_request]
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run pytest
        run: |
          cd backend
          pip install -r requirements.txt
          pytest --cov=app
```

---

## 📚 Additional Resources

- **Backend Test README:** `backend/tests/README.md` - Detailed test suite docs
- **Troubleshooting Upload:** `TROUBLESHOOTING_UPLOAD.md` - Scanner upload issues
- **Testing Results:** Historical test execution results and metrics
- **Bug Fixes:** `ARCHIVE_BUG_FIXES.md` - Known issues and resolutions

---

**Last Updated:** 2025-11-12 (v0.15.0)  
**Maintained By:** VulnManager Development Team
