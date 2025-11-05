# backend/tests/test_versioning.py

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.main import app
from app.models import VulnerabilityTemplate, VulnerabilityTemplateVersion
from app.db import get_session
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

client = TestClient(app)


class TestTemplateVersioning:
    """Test suite for template versioning functionality."""

    def test_create_template_no_version(self, test_session: Session):
        """Creating a template should NOT create an initial version."""
        response = client.post(
            "/vulnerability-templates",
            json={
                "title": "Test Vulnerability",
                "description": "Test description",
                "cwe_id": "CWE-79",
                "default_risk_rating": "High",
            },
        )
        assert response.status_code == 200
        template_id = response.json()["id"]

        # Verify no version exists yet
        versions = test_session.exec(
            select(VulnerabilityTemplateVersion).where(
                VulnerabilityTemplateVersion.template_id == template_id
            )
        ).all()
        assert len(versions) == 0

    def test_update_creates_version_snapshot(self, test_session: Session):
        """Updating a template should create a version snapshot of the OLD state."""
        # Create template
        response = client.post(
            "/vulnerability-templates",
            json={
                "title": "Original Title",
                "description": "Original description",
                "cwe_id": "CWE-89",
                "cvss_score": 7.5,
            },
        )
        template_id = response.json()["id"]

        # Update template
        update_response = client.patch(
            f"/vulnerability-templates/{template_id}",
            json={
                "title": "Updated Title",
                "changed_by": "test_user",
                "change_reason": "Testing version creation",
            },
        )
        assert update_response.status_code == 200

        # Verify version was created with ORIGINAL data
        versions = test_session.exec(
            select(VulnerabilityTemplateVersion)
            .where(VulnerabilityTemplateVersion.template_id == template_id)
            .order_by(VulnerabilityTemplateVersion.version_number)
        ).all()

        assert len(versions) == 1
        assert versions[0].version_number == 1
        assert versions[0].title == "Original Title"  # OLD state
        assert versions[0].description == "Original description"
        assert versions[0].cwe_id == "CWE-89"
        assert versions[0].cvss_score == 7.5
        assert versions[0].changed_by == "test_user"
        assert versions[0].change_reason == "Testing version creation"

    def test_multiple_updates_create_sequential_versions(self, test_session: Session):
        """Multiple updates should create sequential version numbers."""
        # Create template
        response = client.post(
            "/vulnerability-templates",
            json={"title": "Version 0", "description": "Initial state"},
        )
        template_id = response.json()["id"]

        # Update 3 times
        for i in range(1, 4):
            client.patch(
                f"/vulnerability-templates/{template_id}",
                json={
                    "title": f"Version {i}",
                    "changed_by": f"user{i}",
                    "change_reason": f"Update #{i}",
                },
            )

        # Verify 3 versions exist
        versions = test_session.exec(
            select(VulnerabilityTemplateVersion)
            .where(VulnerabilityTemplateVersion.template_id == template_id)
            .order_by(VulnerabilityTemplateVersion.version_number)
        ).all()

        assert len(versions) == 3
        assert versions[0].version_number == 1
        assert versions[0].title == "Version 0"  # Original
        assert versions[1].version_number == 2
        assert versions[1].title == "Version 1"  # After first update
        assert versions[2].version_number == 3
        assert versions[2].title == "Version 2"  # After second update

    def test_get_version_history(self, test_session: Session):
        """GET /versions endpoint should return all versions chronologically."""
        # Create and update template
        response = client.post(
            "/vulnerability-templates",
            json={"title": "Test Template", "description": "Original"},
        )
        template_id = response.json()["id"]

        # Create 2 versions by updating
        client.patch(
            f"/vulnerability-templates/{template_id}",
            json={"description": "Updated v1", "changed_by": "user1"},
        )
        client.patch(
            f"/vulnerability-templates/{template_id}",
            json={"description": "Updated v2", "changed_by": "user2"},
        )

        # Get version history
        history_response = client.get(f"/vulnerability-templates/{template_id}/versions")
        assert history_response.status_code == 200

        versions = history_response.json()
        assert len(versions) == 2
        assert versions[0]["version_number"] == 1
        assert versions[0]["description"] == "Original"
        assert versions[1]["version_number"] == 2
        assert versions[1]["description"] == "Updated v1"

    def test_rollback_to_previous_version(self, test_session: Session):
        """Rolling back should restore template to previous state and create snapshot."""
        # Create template
        response = client.post(
            "/vulnerability-templates",
            json={
                "title": "Original",
                "description": "Version 1",
                "cvss_score": 5.0,
            },
        )
        template_id = response.json()["id"]

        # Update to create version 1
        client.patch(
            f"/vulnerability-templates/{template_id}",
            json={"title": "Updated", "description": "Version 2", "cvss_score": 7.0},
        )

        # Rollback to version 1
        rollback_response = client.post(
            f"/vulnerability-templates/{template_id}/rollback/1",
            json={"changed_by": "admin", "change_reason": "Rollback test"},
        )
        assert rollback_response.status_code == 200

        # Verify current template state matches version 1
        current = rollback_response.json()
        assert current["title"] == "Original"
        assert current["description"] == "Version 1"
        assert current["cvss_score"] == 5.0

        # Verify snapshot was created before rollback
        versions = test_session.exec(
            select(VulnerabilityTemplateVersion)
            .where(VulnerabilityTemplateVersion.template_id == template_id)
            .order_by(VulnerabilityTemplateVersion.version_number)
        ).all()

        assert len(versions) == 2  # v1 (original) + v2 (before rollback)
        assert versions[0].version_number == 1
        assert versions[1].version_number == 2
        assert versions[1].change_reason == "Before rollback to v1"

    def test_rollback_nonexistent_version_fails(self):
        """Rolling back to non-existent version should return 404."""
        # Create template
        response = client.post(
            "/vulnerability-templates",
            json={"title": "Test", "description": "Test"},
        )
        template_id = response.json()["id"]

        # Try to rollback to version 99 (doesn't exist)
        rollback_response = client.post(
            f"/vulnerability-templates/{template_id}/rollback/99",
            json={},
        )
        assert rollback_response.status_code == 404

    def test_version_preserves_all_fields(self, test_session: Session):
        """Version snapshot should preserve all template fields."""
        # Create template with all fields
        response = client.post(
            "/vulnerability-templates",
            json={
                "title": "Complete Template",
                "description": "Full description",
                "cwe_id": "CWE-79",
                "cve_id": "CVE-2024-1234",
                "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
                "cvss_score": 6.1,
                "default_risk_rating": "Medium",
                "vulnerability_type": "XSS",
                "remediation_summary": "Encode output",
                "remediation_steps": "Step 1, Step 2",
                "references": "https://example.com",
                "is_verified": True,
            },
        )
        template_id = response.json()["id"]

        # Update to create version
        client.patch(
            f"/vulnerability-templates/{template_id}",
            json={"title": "Updated Title"},
        )

        # Verify version has all fields
        version = test_session.exec(
            select(VulnerabilityTemplateVersion).where(
                VulnerabilityTemplateVersion.template_id == template_id
            )
        ).first()

        assert version.cwe_id == "CWE-79"
        assert version.cve_id == "CVE-2024-1234"
        assert version.cvss_score == 6.1
        assert version.default_risk_rating == "Medium"
        assert version.vulnerability_type == "XSS"
        assert version.remediation_summary == "Encode output"
        assert version.is_verified is True

    def test_version_history_empty_for_new_template(self):
        """New template should have empty version history."""
        response = client.post(
            "/vulnerability-templates",
            json={"title": "New Template", "description": "Never updated"},
        )
        template_id = response.json()["id"]

        history_response = client.get(f"/vulnerability-templates/{template_id}/versions")
        assert history_response.status_code == 200
        assert len(history_response.json()) == 0


# Fixtures for test isolation
@pytest.fixture
def test_session():
    """Provide a test database session."""
    from app.db import engine
    from sqlmodel import Session

    with Session(engine) as session:
        yield session
