# Test Suite for VulnManager

This directory contains automated tests for VulnManager features across all versions.

## 📦 Test Structure

### Frontend Tests (`frontend/src/tests/`)
- **`setup.ts`** - Vitest configuration and test environment setup
- **`services/`** - Service layer tests
  - `PeerReviewService.test.ts` - Peer review API calls
  - `JiraService.test.ts` - Jira integration API calls
  - `SLAService.test.ts` - SLA tracking API calls

### Backend Tests (`backend/tests/`)

#### Core Feature Tests (v0.1-v0.3)
- **`conftest.py`** - Pytest fixtures and test database setup
- **`test_peer_review.py`** - Peer review workflow endpoints (6 tests)
- **`test_jira_integration.py`** - Jira integration endpoints (7 tests)
- **`test_sla_tracking.py`** - SLA tracking and remediation endpoints (6 tests)

#### Scoring & Calculators (v0.4)
- **`test_scoring.py`** - CVSS 3.1 and OWASP Risk Rating calculations (47 tests)
- **`test_scoring_calculators.py`** - Detailed calculator tests (17 tests)
- **`test_api_endpoints.py`** - Scoring API endpoint tests (19 tests)

#### Custom Tagging System (v0.5)
- **`test_tagging_system.py`** - Tag CRUD, finding associations, usage tracking (23 tests)

#### Enhanced Features (v0.6)
- **`test_export.py`** - Export system (Excel, CSV, JSON, Markdown) (23 tests)
- **`test_quick_add.py`** - Quick-add vulnerability search (8 tests)

#### Vulnerability Repository (v0.7)
- **`test_vulnerability_templates.py`** - Template CRUD, validation, CWE import (45+ tests)
- **`test_versioning.py`** - Template version history and rollback (9 tests)
- **`test_matching.py`** - Auto-matching and fuzzy search (19 tests)
- **`test_import_history.py`** - Import history tracking (v0.7.3, 36 tests) ⭐ **NEW**
- **`test_cve_import.py`** - CVE direct import from NVD (v0.7.3, 30 tests) ⭐ **NEW**

**Total Backend Tests:** ~260+ tests (including v0.7.3 additions)

## 🚀 Running Tests

### Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run src/tests/services/PeerReviewService.test.ts
```

### Backend Tests

```bash
# Navigate to backend directory
cd backend

# Install test dependencies
pip install pytest pytest-cov httpx

# Run all tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run tests with verbose output
pytest -v

# Run specific test file
pytest tests/test_peer_review.py

# Run specific test function
pytest tests/test_peer_review.py::test_add_comment
```

### Docker Environment Tests

```bash
# Run backend tests in Docker
docker exec vuln-manager-backend-1 pytest

# Run backend tests with coverage in Docker
docker exec vuln-manager-backend-1 pytest --cov=app --cov-report=term

# Run frontend tests in Docker
docker exec vuln-manager-frontend-1 npm test
```

## 📊 Test Coverage

### v0.7.3 New Features ⭐
- ✅ **Import History Tracking** (36 test cases in `test_import_history.py`)
  - GET /import-history (list with pagination/filtering)
  - GET /import-history/{id} (retrieve specific record)
  - DELETE /import-history/{id} (cleanup)
  - ImportHistory model computed fields (success_rate, error_details_parsed)
  - Auto-creation on CWE/CVE imports
  - Statistics validation (created, updated, skipped, errors)
  - Duration tracking validation
  - Error details JSON parsing

- ✅ **CVE Direct Import** (30 test cases in `test_cve_import.py`)
  - POST /vulnerability-templates/import-cve
  - CVE ID normalization (with/without "CVE-" prefix, case-insensitive)
  - Duplicate handling (409 conflict, overwrite mode)
  - CVE not found (404 error)
  - NVD API error handling (502 bad gateway, timeouts)
  - ImportHistory auto-creation and tracking
  - Duration tracking for imports
  - Real-world CVE examples (Log4Shell, Heartbleed)

- ✅ **CWE Import Validation** (12 test cases in `test_vulnerability_templates.py`)
  - File type validation (XML only)
  - Empty file rejection
  - File size limits (50MB max)
  - Invalid XML handling
  - Empty CWE list detection
  - CWE lookup endpoint (with/without prefix)
  - MITRE redirect for non-existent CWEs

### Frontend Services (v0.3.0)
- ✅ **PeerReviewService** (15 test cases)
  - Update review status (success/error)
  - Add comments with validation
  - Get comments list
  - Get audit log with filtering

- ✅ **JiraService** (12 test cases)
  - Get/save settings
  - Test connection (success/failure)
  - Create Jira issue
  - Handle missing configuration

- ✅ **SLAService** (9 test cases)
  - Get SLA summary metrics
  - Get overdue findings
  - Update remediation deadline/owner
  - Validate date formats

### Backend Endpoints (v0.3.0)
### Backend Endpoints (v0.3.0)
- ✅ **Peer Review** (6 test cases)
  - PATCH `/api/findings/{id}/review` - Update status
  - POST `/api/findings/{id}/comments` - Add comment
  - GET `/api/findings/{id}/comments` - List comments
  - GET `/api/audit-log` - Query audit log
  - Comment validation (max 5000 chars)

- ✅ **Jira Integration** (7 test cases)
  - POST `/api/jira/settings` - Save configuration
  - GET `/api/jira/settings/{id}` - Retrieve settings
  - POST `/api/jira/test-connection` - Test credentials
  - POST `/api/findings/{id}/create-jira-issue` - Create issue
  - Handle missing configuration errors

- ✅ **SLA Tracking** (6 test cases)
  - GET `/api/sla-summary` - Get metrics
  - GET `/api/findings/overdue` - List overdue findings
  - PATCH `/api/findings/{id}/remediation` - Update deadline
  - SLA status calculation logic
  - Date validation

### Backend Endpoints (v0.4-v0.7)
- ✅ **Scoring & Calculators** (83 test cases across 3 files)
  - CVSS 3.1 vector parsing and calculation
  - OWASP Risk Rating matrix
  - API endpoints for score calculations
  - Boundary value testing
  - Real-world vulnerability examples

- ✅ **Custom Tagging System** (23 test cases)
  - Tag CRUD operations
  - Finding-tag associations
  - Usage count tracking
  - Cascade deletion
  - Color validation

- ✅ **Export System** (23 test cases)
  - Excel, CSV, JSON, Markdown formats
  - Column selection and filtering
  - Risk/status/review filters
  - Empty state handling
  - Filename validation

- ✅ **Vulnerability Templates** (45+ test cases)
  - Template CRUD operations
  - CVSS/OWASP validation
  - Search and filtering
  - Duplicate detection
  - CWE import validation

- ✅ **Matching & Versioning** (28 test cases)
  - Fuzzy title/description matching
  - Exact CWE/CVE matching
  - Template version history
  - Rollback functionality

## 🔧 Test Configuration

### Frontend (Vitest)
- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom (browser simulation)
- **Mocking**: vi.mock() for axios
- **Coverage Provider**: v8
- **Setup Files**: `src/tests/setup.ts`

### Backend (Pytest)
- **Framework**: Pytest
- **Test Client**: FastAPI TestClient
- **Database**: In-memory SQLite (fresh for each test)
- **Fixtures**: Session, client (dependency injection override)
- **Mocking**: unittest.mock for external services

## 📝 Writing New Tests

### Frontend Service Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import YourService from '../../services/YourService';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('YourService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    mockedAxios.get.mockResolvedValue({ data: { result: 'success' } });
    const result = await YourService.doSomething();
    expect(result).toEqual({ result: 'success' });
  });
});
```

### Backend Endpoint Test Template

```python
def test_your_endpoint(client: TestClient, session: Session):
    """Test description"""
    # Create test data
    project = Project(name="Test", description="Test")
    session.add(project)
    session.commit()
    
    # Call endpoint
    response = client.get("/api/your-endpoint")
    
    # Assertions
    assert response.status_code == 200
    assert response.json()["key"] == "expected_value"
```

## ✅ Test Checklist

When adding new features, ensure:

- [ ] **Service tests** - Mock axios calls, test success/error paths
- [ ] **Component tests** - Render, user interactions, state updates
- [ ] **Endpoint tests** - HTTP methods, status codes, response data
- [ ] **Validation tests** - Input validation, error messages
- [ ] **Integration tests** - Database updates, audit logs created
- [ ] **Edge cases** - Empty data, null values, invalid formats
- [ ] **Error handling** - Network errors, 404s, validation failures
- [ ] **Model computed fields** - Test @computed_field properties (v0.7.3+)
- [ ] **Pagination & filtering** - Test skip/limit and filter params (v0.7.3+)
- [ ] **Duration tracking** - Verify timing measurements (v0.7.3+)

## 🐛 Debugging Tests

### Frontend
```bash
# Run tests with verbose output
npx vitest run --reporter=verbose

# Debug specific test
npx vitest run --reporter=verbose --testNamePattern="should add comment"

# Open UI mode
npx vitest --ui
```

### Backend
```bash
# Run with pytest verbose output
pytest -vv

# Run with print statements visible
pytest -s

# Drop into debugger on failure
pytest --pdb

# Run only failed tests from last run
pytest --lf
```

## 📈 CI/CD Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run frontend tests
  run: |
    cd frontend
    npm ci
    npm test -- --run

- name: Run backend tests
  run: |
    cd backend
    pip install -r requirements.txt
    pip install pytest pytest-cov
    pytest --cov=app --cov-report=xml
```

## 🔍 Known Issues

1. **Editor lint errors in tests** - Expected in editor (packages in Docker), resolve during test execution
2. **SQLite date format** - Some datetime comparisons may need adjustments
3. **Async timing** - Use `await` properly for all async operations
4. **Mock NVD API** - v0.7.3 CVE tests use mocked NVD responses (don't hit real API)

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [unittest.mock](https://docs.python.org/3/library/unittest.mock.html) - For mocking NVD API calls

---

**Last Updated**: November 6, 2025  
**Version**: 0.7.3  
**Test Coverage**: ~260+ tests across all features  
**Backend Coverage**: ~95% for core endpoints (v0.7.3)  
**New in v0.7.3**: +66 tests for import history and CVE import
