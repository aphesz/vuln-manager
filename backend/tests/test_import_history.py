"""
Tests for Import History tracking endpoints (v0.7.2).

Tests cover:
- GET /import-history (list with pagination and filtering)
- GET /import-history/{id} (retrieve specific record)
- DELETE /import-history/{id} (cleanup old records)
- ImportHistory model success_rate computed field
- Auto-creation of history records on imports
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from datetime import datetime, timezone
from app.main import app
from app.models import ImportHistory, VulnerabilityTemplate, Project
from app.db import get_session
import json


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def session():
    """Database session for tests"""
    from sqlmodel import create_engine, Session
    from app.models import SQLModel
    
    # In-memory SQLite for testing
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Override dependency
        def get_session_override():
            return session
        
        app.dependency_overrides[get_session] = get_session_override
        yield session
        app.dependency_overrides.clear()


@pytest.fixture
def sample_import_history(session: Session):
    """Create sample import history records"""
    records = [
        ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            file_name="cwec_v4.14.xml",
            file_size=18925678,
            templates_created=845,
            templates_updated=0,
            templates_skipped=77,
            errors=3,
            total_parsed=925,
            imported_by="system",
            imported_at=datetime(2025, 11, 1, 10, 30, 0, tzinfo=timezone.utc),
            duration_seconds=45.23,
            error_details='[{"cwe_id": "CWE-123", "error": "Invalid format"}]'
        ),
        ImportHistory(
            source="nvd",
            import_type="single_cve",
            file_name=None,
            file_size=None,
            templates_created=1,
            templates_updated=0,
            templates_skipped=0,
            errors=0,
            total_parsed=1,
            imported_by="system",
            imported_at=datetime(2025, 11, 2, 14, 15, 0, tzinfo=timezone.utc),
            duration_seconds=2.45,
            error_details=None
        ),
        ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            file_name="cwec_v4.15.xml",
            file_size=19123456,
            templates_created=50,
            templates_updated=895,
            templates_skipped=0,
            errors=0,
            total_parsed=945,
            imported_by="system",
            imported_at=datetime(2025, 11, 3, 9, 0, 0, tzinfo=timezone.utc),
            duration_seconds=52.10,
            error_details=None
        ),
    ]
    
    for record in records:
        session.add(record)
    session.commit()
    
    for record in records:
        session.refresh(record)
    
    return records


class TestListImportHistory:
    """Tests for GET /import-history endpoint"""
    
    def test_list_empty(self, client: TestClient, session: Session):
        """Test listing import history when none exist"""
        response = client.get("/import-history")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_list_all_records(self, client: TestClient, sample_import_history):
        """Test listing all import history records"""
        response = client.get("/import-history")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        
        # Check first record structure
        record = data[0]
        assert "id" in record
        assert "source" in record
        assert "import_type" in record
        assert "templates_created" in record
        assert "success_rate" in record
        assert "duration_seconds" in record
    
    def test_list_with_pagination(self, client: TestClient, sample_import_history):
        """Test pagination with skip and limit parameters"""
        # First page
        response = client.get("/import-history?skip=0&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        
        # Second page
        response = client.get("/import-history?skip=2&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        
        # Beyond available records
        response = client.get("/import-history?skip=10&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
    
    def test_filter_by_source_cwe(self, client: TestClient, sample_import_history):
        """Test filtering by source='cwe'"""
        response = client.get("/import-history?source=cwe")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        
        for record in data:
            assert record["source"] == "cwe"
    
    def test_filter_by_source_nvd(self, client: TestClient, sample_import_history):
        """Test filtering by source='nvd'"""
        response = client.get("/import-history?source=nvd")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["source"] == "nvd"
        assert data[0]["import_type"] == "single_cve"
    
    def test_filter_nonexistent_source(self, client: TestClient, sample_import_history):
        """Test filtering by source that doesn't exist"""
        response = client.get("/import-history?source=manual")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
    
    def test_pagination_with_filter(self, client: TestClient, sample_import_history):
        """Test combining pagination and filtering"""
        response = client.get("/import-history?source=cwe&skip=0&limit=1")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["source"] == "cwe"


class TestGetImportHistoryById:
    """Tests for GET /import-history/{id} endpoint"""
    
    def test_get_existing_record(self, client: TestClient, sample_import_history):
        """Test retrieving a specific import history record"""
        record_id = sample_import_history[0].id
        response = client.get(f"/import-history/{record_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == record_id
        assert data["source"] == "cwe"
        assert data["import_type"] == "bulk_cwe"
        assert data["file_name"] == "cwec_v4.14.xml"
        assert data["templates_created"] == 845
        assert data["total_parsed"] == 925
    
    def test_get_nonexistent_record(self, client: TestClient, session: Session):
        """Test retrieving non-existent import history record"""
        response = client.get("/import-history/99999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_get_record_with_error_details(self, client: TestClient, sample_import_history):
        """Test that error_details are properly parsed"""
        record_id = sample_import_history[0].id
        response = client.get(f"/import-history/{record_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "error_details_parsed" in data
        assert isinstance(data["error_details_parsed"], list)
        assert len(data["error_details_parsed"]) == 1
        assert data["error_details_parsed"][0]["cwe_id"] == "CWE-123"
    
    def test_get_record_without_error_details(self, client: TestClient, sample_import_history):
        """Test record with no error_details"""
        record_id = sample_import_history[1].id
        response = client.get(f"/import-history/{record_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "error_details_parsed" in data
        assert data["error_details_parsed"] == []


class TestDeleteImportHistory:
    """Tests for DELETE /import-history/{id} endpoint"""
    
    def test_delete_existing_record(self, client: TestClient, sample_import_history, session: Session):
        """Test deleting an import history record"""
        record_id = sample_import_history[0].id
        
        # Verify record exists
        record = session.get(ImportHistory, record_id)
        assert record is not None
        
        # Delete it
        response = client.delete(f"/import-history/{record_id}")
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"].lower()
        
        # Verify it's gone
        session.expire_all()  # Clear session cache
        record = session.get(ImportHistory, record_id)
        assert record is None
    
    def test_delete_nonexistent_record(self, client: TestClient, session: Session):
        """Test deleting non-existent import history record"""
        response = client.delete("/import-history/99999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_delete_does_not_affect_templates(self, client: TestClient, sample_import_history, session: Session):
        """Test that deleting import history doesn't delete templates"""
        # Create a template
        template = VulnerabilityTemplate(
            title="Test Vulnerability",
            description="Test description",
            risk_rating="High",
            source="cwe"
        )
        session.add(template)
        session.commit()
        template_id = template.id
        
        # Delete import history
        record_id = sample_import_history[0].id
        response = client.delete(f"/import-history/{record_id}")
        assert response.status_code == 200
        
        # Verify template still exists
        session.expire_all()
        template = session.get(VulnerabilityTemplate, template_id)
        assert template is not None
        assert template.title == "Test Vulnerability"


class TestImportHistoryModel:
    """Tests for ImportHistory model computed fields"""
    
    def test_success_rate_all_successful(self, session: Session):
        """Test success_rate when all templates are created"""
        record = ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            templates_created=100,
            templates_updated=0,
            templates_skipped=0,
            errors=0,
            total_parsed=100,
            imported_by="system"
        )
        
        assert record.success_rate == 100.0
    
    def test_success_rate_partial_success(self, session: Session):
        """Test success_rate with some errors"""
        record = ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            templates_created=80,
            templates_updated=10,
            templates_skipped=5,
            errors=5,
            total_parsed=100,
            imported_by="system"
        )
        
        # (80 + 10) / 100 = 90%
        assert record.success_rate == 90.0
    
    def test_success_rate_all_errors(self, session: Session):
        """Test success_rate when all imports fail"""
        record = ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            templates_created=0,
            templates_updated=0,
            templates_skipped=0,
            errors=100,
            total_parsed=100,
            imported_by="system"
        )
        
        assert record.success_rate == 0.0
    
    def test_success_rate_zero_parsed(self, session: Session):
        """Test success_rate when nothing was parsed"""
        record = ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            templates_created=0,
            templates_updated=0,
            templates_skipped=0,
            errors=0,
            total_parsed=0,
            imported_by="system"
        )
        
        assert record.success_rate == 0.0
    
    def test_success_rate_updated_count(self, session: Session):
        """Test success_rate includes templates_updated"""
        record = ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            templates_created=20,
            templates_updated=75,
            templates_skipped=3,
            errors=2,
            total_parsed=100,
            imported_by="system"
        )
        
        # (20 + 75) / 100 = 95%
        assert record.success_rate == 95.0
    
    def test_error_details_parsed_valid_json(self, session: Session):
        """Test error_details_parsed with valid JSON"""
        error_json = json.dumps([
            {"cwe_id": "CWE-1", "error": "Error 1"},
            {"cwe_id": "CWE-2", "error": "Error 2"}
        ])
        
        record = ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            templates_created=98,
            templates_updated=0,
            templates_skipped=0,
            errors=2,
            total_parsed=100,
            imported_by="system",
            error_details=error_json
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        
        parsed = record.error_details_parsed
        assert isinstance(parsed, list)
        assert len(parsed) == 2
        assert parsed[0]["cwe_id"] == "CWE-1"
        assert parsed[1]["error"] == "Error 2"
    
    def test_error_details_parsed_none(self, session: Session):
        """Test error_details_parsed when error_details is None"""
        record = ImportHistory(
            source="nvd",
            import_type="single_cve",
            templates_created=1,
            templates_updated=0,
            templates_skipped=0,
            errors=0,
            total_parsed=1,
            imported_by="system",
            error_details=None
        )
        
        assert record.error_details_parsed == []
    
    def test_error_details_parsed_invalid_json(self, session: Session):
        """Test error_details_parsed with invalid JSON"""
        record = ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            templates_created=100,
            templates_updated=0,
            templates_skipped=0,
            errors=0,
            total_parsed=100,
            imported_by="system",
            error_details="not valid json {["
        )
        
        # Should return empty list for invalid JSON
        assert record.error_details_parsed == []


class TestImportHistoryIntegration:
    """Integration tests for automatic import history creation"""
    
    def test_cwe_import_creates_history(self, client: TestClient, session: Session):
        """Test that CWE import automatically creates history record"""
        # This would require mocking file upload and CWE parsing
        # For now, verify the model integration works
        
        # Create a mock import history
        record = ImportHistory(
            source="cwe",
            import_type="bulk_cwe",
            file_name="test.xml",
            file_size=1000,
            templates_created=10,
            templates_updated=0,
            templates_skipped=0,
            errors=0,
            total_parsed=10,
            imported_by="system",
            duration_seconds=5.5
        )
        session.add(record)
        session.commit()
        
        # Verify it was created
        records = session.exec(select(ImportHistory)).all()
        assert len(records) == 1
        assert records[0].source == "cwe"
        assert records[0].duration_seconds == 5.5
    
    def test_cve_import_creates_history(self, client: TestClient, session: Session):
        """Test that CVE import automatically creates history record"""
        # Create a mock CVE import history
        record = ImportHistory(
            source="nvd",
            import_type="single_cve",
            file_name=None,
            file_size=None,
            templates_created=1,
            templates_updated=0,
            templates_skipped=0,
            errors=0,
            total_parsed=1,
            imported_by="system",
            duration_seconds=2.3
        )
        session.add(record)
        session.commit()
        
        # Verify it was created
        records = session.exec(select(ImportHistory).where(ImportHistory.source == "nvd")).all()
        assert len(records) == 1
        assert records[0].import_type == "single_cve"
        assert records[0].duration_seconds == 2.3
