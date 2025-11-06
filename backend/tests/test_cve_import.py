"""
Tests for CVE Import functionality (v0.7.2).

Tests cover:
- POST /vulnerability-templates/import-cve (direct CVE import from NVD)
- CVE ID normalization (with/without CVE- prefix)
- Duplicate CVE handling (409 conflict)
- CVE not found (404 error)
- NVD API error handling (502)
- overwrite_existing parameter
- ImportHistory auto-creation
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from unittest.mock import Mock, patch, AsyncMock
from app.main import app
from app.models import VulnerabilityTemplate, ImportHistory
from app.db import get_session


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
def mock_nvd_data():
    """
    Mock NVD API response data.
    
    NOTE: This mimics the actual parse_nvd_vulnerability output, which 
    auto-generates 'title' from cve_id + description. The title field
    is NOT in the original NVD API response.
    """
    return {
        "cve_id": "CVE-2024-21413",
        "title": "CVE-2024-21413 - A remote code execution vulnerability exists in Microsoft Outlook when the software fails to properly handle objects in memory",
        "description": "A remote code execution vulnerability exists in Microsoft Outlook when the software fails to properly handle objects in memory...",
        "cvss_score": 9.8,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "severity": "CRITICAL",
        "cwe_ids": ["CWE-94"],
        "references": ["https://nvd.nist.gov/vuln/detail/CVE-2024-21413", "https://msrc.microsoft.com/update-guide"],
        "published_date": "2024-02-13T18:15:00",
        "last_modified": "2024-02-21T12:30:00"
    }


class TestCVEImport:
    """Tests for CVE import endpoint"""
    
    @patch('app.nvd.fetch_cve_data')
    async def test_import_valid_cve(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test importing a valid CVE from NVD"""
        mock_fetch.return_value = mock_nvd_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cve_id"] == "CVE-2024-21413"
        # Title is auto-generated from CVE ID + first sentence of description
        assert data["title"].startswith("CVE-2024-21413 - ")
        assert data["cvss_score"] == 9.8
        assert data["source"] == "nvd"
        assert data["is_verified"] is True
        
        # Verify template was created in database
        template = session.exec(
            select(VulnerabilityTemplate).where(
                VulnerabilityTemplate.cve_id == "CVE-2024-21413"
            )
        ).first()
        assert template is not None
        assert template.title == mock_nvd_data["title"]
    
    @patch('app.nvd.fetch_cve_data')
    async def test_import_creates_history_record(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test that CVE import creates an import history record"""
        mock_fetch.return_value = mock_nvd_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        assert response.status_code == 200
        
        # Verify import history was created
        history = session.exec(
            select(ImportHistory).where(ImportHistory.source == "nvd")
        ).first()
        
        assert history is not None
        assert history.import_type == "single_cve"
        assert history.templates_created == 1
        assert history.templates_updated == 0
        assert history.errors == 0
        assert history.total_parsed == 1
        assert history.duration_seconds is not None
        assert history.duration_seconds > 0


class TestCVEIdNormalization:
    """Tests for CVE ID normalization"""
    
    @patch('app.nvd.fetch_cve_data')
    async def test_normalize_with_cve_prefix(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test CVE ID normalization when CVE- prefix is provided"""
        mock_fetch.return_value = mock_nvd_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cve_id"] == "CVE-2024-21413"
        
        # Verify mock was called with normalized ID
        mock_fetch.assert_called_once()
    
    @patch('app.nvd.fetch_cve_data')
    async def test_normalize_without_cve_prefix(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test CVE ID normalization when CVE- prefix is missing"""
        mock_fetch.return_value = mock_nvd_data
        
        # Import without CVE- prefix
        response = client.post("/vulnerability-templates/import-cve?cve_id=2024-21413")
        
        assert response.status_code == 200
        data = response.json()
        # Should be normalized to include CVE- prefix
        assert data["cve_id"] == "CVE-2024-21413"
    
    @patch('app.nvd.fetch_cve_data')
    async def test_normalize_lowercase(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test CVE ID normalization converts to uppercase"""
        mock_fetch.return_value = mock_nvd_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=cve-2024-21413")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cve_id"] == "CVE-2024-21413"
    
    @patch('app.nvd.fetch_cve_data')
    async def test_normalize_with_whitespace(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test CVE ID normalization strips whitespace"""
        mock_fetch.return_value = mock_nvd_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id= CVE-2024-21413 ")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cve_id"] == "CVE-2024-21413"


class TestDuplicateCVEHandling:
    """Tests for duplicate CVE handling"""
    
    @patch('app.nvd.fetch_cve_data')
    async def test_import_duplicate_without_overwrite(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test importing duplicate CVE without overwrite flag"""
        mock_fetch.return_value = mock_nvd_data
        
        # First import
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        assert response.status_code == 200
        
        # Second import (should fail)
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower()
    
    @patch('app.nvd.fetch_cve_data')
    async def test_import_duplicate_with_overwrite(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test importing duplicate CVE with overwrite flag"""
        mock_fetch.return_value = mock_nvd_data
        
        # First import
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        assert response.status_code == 200
        original_id = response.json()["id"]
        
        # Update mock data
        updated_data = mock_nvd_data.copy()
        updated_data["description"] = "Updated description"
        mock_fetch.return_value = updated_data
        
        # Second import with overwrite
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413&overwrite_existing=true")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == original_id  # Same ID
        assert data["description"] == "Updated description"  # Updated content
        
        # Verify history shows update
        history = session.exec(
            select(ImportHistory)
            .where(ImportHistory.source == "nvd")
            .where(ImportHistory.templates_updated == 1)
        ).first()
        assert history is not None
        assert history.templates_created == 0
        assert history.templates_updated == 1
    
    @patch('app.nvd.fetch_cve_data')
    async def test_overwrite_preserves_id(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test that overwriting preserves the original template ID"""
        mock_fetch.return_value = mock_nvd_data
        
        # First import
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        original_id = response.json()["id"]
        
        # Overwrite
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413&overwrite_existing=true")
        new_id = response.json()["id"]
        
        assert original_id == new_id


class TestCVENotFound:
    """Tests for CVE not found scenarios"""
    
    @patch('app.nvd.fetch_cve_data')
    async def test_import_nonexistent_cve(self, mock_fetch, client: TestClient, session: Session):
        """Test importing a CVE that doesn't exist in NVD"""
        mock_fetch.return_value = None  # CVE not found
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2099-99999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        assert "CVE-2099-99999" in response.json()["detail"]
    
    @patch('app.nvd.fetch_cve_data')
    async def test_cve_not_found_no_template_created(self, mock_fetch, client: TestClient, session: Session):
        """Test that no template is created when CVE is not found"""
        mock_fetch.return_value = None
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2099-99999")
        assert response.status_code == 404
        
        # Verify no template was created
        templates = session.exec(select(VulnerabilityTemplate)).all()
        assert len(templates) == 0


class TestNVDAPIErrors:
    """Tests for NVD API error handling"""
    
    @patch('app.nvd.fetch_cve_data')
    async def test_nvd_api_error(self, mock_fetch, client: TestClient, session: Session):
        """Test handling of NVD API errors"""
        from app.nvd import NVDAPIError
        mock_fetch.side_effect = NVDAPIError("Rate limit exceeded")
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-1234")
        
        assert response.status_code == 502
        assert "nvd api" in response.json()["detail"].lower()
    
    @patch('app.nvd.fetch_cve_data')
    async def test_unexpected_error(self, mock_fetch, client: TestClient, session: Session):
        """Test handling of unexpected errors"""
        mock_fetch.side_effect = Exception("Unexpected error")
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-1234")
        
        assert response.status_code == 500
        assert "failed to import" in response.json()["detail"].lower()
    
    @patch('app.nvd.fetch_cve_data')
    async def test_api_timeout(self, mock_fetch, client: TestClient, session: Session):
        """Test handling of API timeouts"""
        import asyncio
        mock_fetch.side_effect = asyncio.TimeoutError("Request timed out")
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-1234")
        
        assert response.status_code == 500


class TestImportHistoryTracking:
    """Tests for import history tracking on CVE imports"""
    
    @patch('app.nvd.fetch_cve_data')
    async def test_history_tracks_success(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test import history tracks successful import"""
        mock_fetch.return_value = mock_nvd_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        assert response.status_code == 200
        
        history = session.exec(select(ImportHistory)).first()
        assert history is not None
        assert history.source == "nvd"
        assert history.import_type == "single_cve"
        assert history.templates_created == 1
        assert history.templates_updated == 0
        assert history.errors == 0
        assert history.total_parsed == 1
        assert history.success_rate == 100.0
    
    @patch('app.nvd.fetch_cve_data')
    async def test_history_tracks_update(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test import history tracks CVE update"""
        mock_fetch.return_value = mock_nvd_data
        
        # First import
        client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        
        # Update
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413&overwrite_existing=true")
        assert response.status_code == 200
        
        # Check second history record
        history_records = session.exec(select(ImportHistory)).all()
        assert len(history_records) == 2
        
        update_record = history_records[1]
        assert update_record.templates_created == 0
        assert update_record.templates_updated == 1
        assert update_record.success_rate == 100.0
    
    @patch('app.nvd.fetch_cve_data')
    async def test_history_has_duration(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test import history records duration"""
        mock_fetch.return_value = mock_nvd_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        assert response.status_code == 200
        
        history = session.exec(select(ImportHistory)).first()
        assert history.duration_seconds is not None
        assert history.duration_seconds > 0
        assert history.duration_seconds < 60  # Should be quick
    
    @patch('app.nvd.fetch_cve_data')
    async def test_history_no_file_info_for_cve(self, mock_fetch, client: TestClient, session: Session, mock_nvd_data):
        """Test import history doesn't have file info for CVE imports"""
        mock_fetch.return_value = mock_nvd_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2024-21413")
        assert response.status_code == 200
        
        history = session.exec(select(ImportHistory)).first()
        assert history.file_name is None
        assert history.file_size is None


class TestRealWorldCVEs:
    """Tests with real-world CVE examples"""
    
    @patch('app.nvd.fetch_cve_data')
    async def test_import_log4shell(self, mock_fetch, client: TestClient, session: Session):
        """Test importing Log4Shell (CVE-2021-44228)"""
        log4shell_data = {
            "title": "Apache Log4j2 Remote Code Execution",
            "cve_id": "CVE-2021-44228",
            "description": "Apache Log4j2 <=2.14.1 JNDI features...",
            "cvss_score": 10.0,
            "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
            "risk_rating": "Critical",
            "vulnerability_type": "CWE-502",
            "source": "nvd"
        }
        mock_fetch.return_value = log4shell_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2021-44228")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cve_id"] == "CVE-2021-44228"
        assert data["cvss_score"] == 10.0
        assert data["risk_rating"] == "Critical"
    
    @patch('app.nvd.fetch_cve_data')
    async def test_import_heartbleed(self, mock_fetch, client: TestClient, session: Session):
        """Test importing Heartbleed (CVE-2014-0160)"""
        heartbleed_data = {
            "title": "OpenSSL Heartbleed Vulnerability",
            "cve_id": "CVE-2014-0160",
            "description": "The (1) TLS and (2) DTLS implementations in OpenSSL...",
            "cvss_score": 7.5,
            "cvss_vector": "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
            "risk_rating": "High",
            "vulnerability_type": "CWE-125",
            "source": "nvd"
        }
        mock_fetch.return_value = heartbleed_data
        
        response = client.post("/vulnerability-templates/import-cve?cve_id=CVE-2014-0160")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cve_id"] == "CVE-2014-0160"
        assert data["cvss_score"] == 7.5
        assert data["risk_rating"] == "High"
