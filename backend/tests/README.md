# Test Suite for VulnManager Tier 1 Features

This directory contains automated tests for the VulnManager v0.3.0 Tier 1 features.

## 📦 Test Structure

### Frontend Tests (`frontend/src/tests/`)
- **`setup.ts`** - Vitest configuration and test environment setup
- **`services/`** - Service layer tests
  - `PeerReviewService.test.ts` - Peer review API calls
  - `JiraService.test.ts` - Jira integration API calls
  - `SLAService.test.ts` - SLA tracking API calls

### Backend Tests (`backend/tests/`)
- **`conftest.py`** - Pytest fixtures and test database setup
- **`test_peer_review.py`** - Peer review workflow endpoints
- **`test_jira_integration.py`** - Jira integration endpoints
- **`test_sla_tracking.py`** - SLA tracking and remediation endpoints

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

### Frontend Services
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

### Backend Endpoints
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

1. **Frontend lint errors in tests** - Expected in editor, resolve during build
2. **SQLite date format** - Some datetime comparisons may need adjustments
3. **Async timing** - Use `await` properly for all async operations

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

**Last Updated**: November 1, 2025  
**Version**: 0.3.0  
**Test Coverage**: ~85% (services + endpoints)
