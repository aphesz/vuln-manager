# backend/tests/test_quick_add.py

"""
Test suite for Quick Add Finding feature.

Tests:
- Repository template search (/repository/search)
- Template suggestions (/projects/{id}/template-suggestions)
- Manual finding creation (/projects/{id}/findings)
"""

import pytest
from sqlmodel import Session
from app.models import Project, Finding, VulnerabilityTemplate
from app.timezone_utils import get_utc_now


@pytest.fixture
def sample_project(session: Session):
    """Create a sample project for testing."""
    project = Project(name="Test Project", consultant_name="Test Consultant")
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@pytest.fixture
def sample_templates(session: Session):
    """Create sample vulnerability templates for testing."""
    templates = [
        VulnerabilityTemplate(
            title="Cross-Site Scripting (XSS)",
            description="XSS allows attackers to inject malicious scripts",
            cwe_id="CWE-79",
            default_risk_rating="High",
            vulnerability_type="XSS",
            remediation_summary="Sanitize user input",
            remediation_steps="1. Validate input\n2. Encode output",
            source="manual",
            is_verified=True,
            usage_count=10,
            created_at=get_utc_now(),
            updated_at=get_utc_now()
        ),
        VulnerabilityTemplate(
            title="SQL Injection",
            description="SQLi allows attackers to manipulate database queries",
            cwe_id="CWE-89",
            default_risk_rating="Critical",
            vulnerability_type="SQLi",
            remediation_summary="Use parameterized queries",
            remediation_steps="1. Use prepared statements\n2. Avoid dynamic SQL",
            source="manual",
            is_verified=True,
            usage_count=15,
            created_at=get_utc_now(),
            updated_at=get_utc_now()
        ),
        VulnerabilityTemplate(
            title="Cross-Site Request Forgery (CSRF)",
            description="CSRF forces users to execute unwanted actions",
            cwe_id="CWE-352",
            default_risk_rating="Medium",
            vulnerability_type="CSRF",
            remediation_summary="Implement anti-CSRF tokens",
            source="burp",
            is_verified=False,
            usage_count=3,
            created_at=get_utc_now(),
            updated_at=get_utc_now()
        ),
        VulnerabilityTemplate(
            title="XML External Entity (XXE)",
            description="XXE allows attackers to interfere with XML processing",
            cwe_id="CWE-611",
            default_risk_rating="High",
            vulnerability_type="XXE",
            remediation_summary="Disable external entity processing",
            source="manual",
            is_verified=True,
            usage_count=5,
            created_at=get_utc_now(),
            updated_at=get_utc_now()
        ),
    ]
    
    for template in templates:
        session.add(template)
    
    session.commit()
    
    for template in templates:
        session.refresh(template)
    
    return templates


class TestRepositorySearch:
    """Tests for /repository/search endpoint."""
    
    def test_search_by_title(self, client, sample_templates):
        """Test fuzzy search by title."""
        response = client.get("/repository/search?q=XSS")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any("XSS" in t["title"] for t in data)
    
    def test_search_by_cwe(self, client, sample_templates):
        """Test search by CWE ID."""
        response = client.get("/repository/search?q=CWE-79")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["cwe_id"] == "CWE-79"
    
    def test_search_fuzzy_matching(self, client, sample_templates):
        """Test fuzzy matching (case-insensitive, partial)."""
        response = client.get("/repository/search?q=sql")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any("SQL" in t["title"] for t in data)
    
    def test_search_verified_only(self, client, sample_templates):
        """Test verified_only filter."""
        response = client.get("/repository/search?q=CSRF&verified_only=true")
        assert response.status_code == 200
        data = response.json()
        # CSRF template is not verified, should not appear
        assert len(data) == 0
        
        response = client.get("/repository/search?q=XSS&verified_only=true")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(t["is_verified"] for t in data)
    
    def test_search_limit(self, client, sample_templates):
        """Test result limit parameter."""
        response = client.get("/repository/search?q=e&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2
    
    def test_search_exact_match_priority(self, client, sample_templates):
        """Test that exact matches appear first."""
        response = client.get("/repository/search?q=SQL Injection")
        assert response.status_code == 200
        data = response.json()
        # Exact match should be first
        assert data[0]["title"] == "SQL Injection"
    
    def test_search_usage_count_ordering(self, client, sample_templates):
        """Test ordering by usage count after exact match."""
        response = client.get("/repository/search?q=e")  # Matches multiple templates
        assert response.status_code == 200
        data = response.json()
        # After exact matches, should be ordered by usage_count desc
        # SQLi (15) > XSS (10) > XXE (5) > CSRF (3)
        assert len(data) >= 2
    
    def test_search_min_length(self, client, sample_templates):
        """Test minimum query length requirement."""
        response = client.get("/repository/search?q=X")  # Only 1 char
        # Should still work (backend accepts q: str with min_length=1)
        assert response.status_code == 200


class TestTemplateSuggestions:
    """Tests for /projects/{id}/template-suggestions endpoint."""
    
    def test_suggestions_for_new_project(self, client, sample_project, sample_templates):
        """Test suggestions for project with no findings."""
        response = client.get(f"/projects/{sample_project.id}/template-suggestions")
        assert response.status_code == 200
        data = response.json()
        # Should return popular verified templates
        assert len(data) > 0
        # Should be ordered by usage count
        assert data[0]["usage_count"] >= data[-1]["usage_count"]
    
    def test_suggestions_with_project_templates(self, client, session, sample_project, sample_templates):
        """Test suggestions based on project's existing templates."""
        # Create findings using specific templates
        xss_template = sample_templates[0]  # XSS
        sqli_template = sample_templates[1]  # SQLi
        
        # Create findings linked to templates
        finding1 = Finding(
            project_id=sample_project.id,
            title="XSS Finding 1",
            description="Test",
            remediation="Test",
            risk_rating="High",
            template_id=xss_template.id
        )
        finding2 = Finding(
            project_id=sample_project.id,
            title="XSS Finding 2",
            description="Test",
            remediation="Test",
            risk_rating="High",
            template_id=xss_template.id
        )
        finding3 = Finding(
            project_id=sample_project.id,
            title="SQLi Finding",
            description="Test",
            remediation="Test",
            risk_rating="Critical",
            template_id=sqli_template.id
        )
        
        session.add_all([finding1, finding2, finding3])
        session.commit()
        
        response = client.get(f"/projects/{sample_project.id}/template-suggestions")
        assert response.status_code == 200
        data = response.json()
        
        # Should include XSS and SQLi (templates used in project)
        template_ids = [t["id"] for t in data]
        assert xss_template.id in template_ids
        assert sqli_template.id in template_ids
    
    def test_suggestions_limit(self, client, sample_project, sample_templates):
        """Test limit parameter."""
        response = client.get(f"/projects/{sample_project.id}/template-suggestions?limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2
    
    def test_suggestions_nonexistent_project(self, client, sample_templates):
        """Test suggestions for nonexistent project."""
        response = client.get("/projects/99999/template-suggestions")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestManualFindingCreation:
    """Tests for POST /projects/{id}/findings endpoint."""
    
    def test_create_finding_with_template(self, client, sample_project, sample_templates):
        """Test creating finding from template with multiple instances."""
        xss_template = sample_templates[0]
        
        payload = {
            "title": "XSS on Login Page",
            "description": "Reflected XSS in username parameter",
            "remediation": "Encode user input before displaying",
            "risk_rating": "High",
            "template_id": xss_template.id,
            "instances": [
                {"location": "https://example.com/login?user=<script>", "details": "param: user"},
                {"location": "https://example.com/search?q=<script>", "details": "param: q"}
            ],
            "issue_status": "Open"
        }
        
        response = client.post(f"/projects/{sample_project.id}/findings", json=payload)
        assert response.status_code == 201
        data = response.json()
        
        assert data["title"] == payload["title"]
        assert data["risk_rating"] == payload["risk_rating"]
        assert data["template_id"] == xss_template.id
        assert len(data["instances"]) == 2
        assert data["instances"][0]["location"] == payload["instances"][0]["location"]
    
    def test_create_finding_without_template(self, client, sample_project):
        """Test creating finding without template link."""
        payload = {
            "title": "Custom Vulnerability",
            "description": "Custom description",
            "remediation": "Custom remediation",
            "risk_rating": "Medium",
            "instances": [
                {"location": "https://example.com/custom", "details": "Custom details"}
            ]
        }
        
        response = client.post(f"/projects/{sample_project.id}/findings", json=payload)
        assert response.status_code == 201
        data = response.json()
        
        assert data["title"] == payload["title"]
        assert data["template_id"] is None
        assert len(data["instances"]) == 1
    
    def test_create_finding_updates_template_usage(self, client, session, sample_project, sample_templates):
        """Test that creating finding increments template usage count."""
        xss_template = sample_templates[0]
        initial_usage = xss_template.usage_count
        
        payload = {
            "title": "Test Finding",
            "description": "Test",
            "remediation": "Test",
            "risk_rating": "High",
            "template_id": xss_template.id,
            "instances": [{"location": "test", "details": "test"}]
        }
        
        response = client.post(f"/projects/{sample_project.id}/findings", json=payload)
        assert response.status_code == 201
        
        # Refresh template from DB
        session.refresh(xss_template)
        assert xss_template.usage_count == initial_usage + 1
        assert xss_template.last_used is not None
    
    def test_create_finding_deduplication(self, client, session, sample_project, sample_templates):
        """Test that duplicate titles add instances to existing finding."""
        xss_template = sample_templates[0]
        
        # Create first finding
        payload1 = {
            "title": "Duplicate Test",
            "description": "Test",
            "remediation": "Test",
            "risk_rating": "High",
            "template_id": xss_template.id,
            "instances": [{"location": "location1", "details": "details1"}]
        }
        response1 = client.post(f"/projects/{sample_project.id}/findings", json=payload1)
        assert response1.status_code == 201
        finding_id = response1.json()["id"]
        
        # Create second finding with same title
        payload2 = {
            "title": "Duplicate Test",  # Same title
            "description": "Different description",
            "remediation": "Different remediation",
            "risk_rating": "Medium",
            "instances": [{"location": "location2", "details": "details2"}]
        }
        response2 = client.post(f"/projects/{sample_project.id}/findings", json=payload2)
        assert response2.status_code == 201
        data2 = response2.json()
        
        # Should be same finding ID
        assert data2["id"] == finding_id
        # Should have 2 instances now
        assert len(data2["instances"]) == 2
    
    def test_create_finding_invalid_risk_rating(self, client, sample_project):
        """Test validation of risk rating enum."""
        payload = {
            "title": "Test",
            "description": "Test",
            "remediation": "Test",
            "risk_rating": "InvalidRating",
            "instances": [{"location": "test", "details": "test"}]
        }
        
        response = client.post(f"/projects/{sample_project.id}/findings", json=payload)
        assert response.status_code == 400
        assert "risk_rating" in response.json()["detail"].lower()
    
    def test_create_finding_invalid_issue_status(self, client, sample_project):
        """Test validation of issue status enum."""
        payload = {
            "title": "Test",
            "description": "Test",
            "remediation": "Test",
            "risk_rating": "High",
            "issue_status": "InvalidStatus",
            "instances": [{"location": "test", "details": "test"}]
        }
        
        response = client.post(f"/projects/{sample_project.id}/findings", json=payload)
        assert response.status_code == 400
        assert "issue_status" in response.json()["detail"].lower()
    
    def test_create_finding_no_instances(self, client, sample_project):
        """Test that at least one instance is required."""
        payload = {
            "title": "Test",
            "description": "Test",
            "remediation": "Test",
            "risk_rating": "High",
            "instances": []  # Empty array
        }
        
        response = client.post(f"/projects/{sample_project.id}/findings", json=payload)
        assert response.status_code == 400
        assert "instance" in response.json()["detail"].lower()
    
    def test_create_finding_invalid_instance_structure(self, client, sample_project):
        """Test validation of instance structure."""
        payload = {
            "title": "Test",
            "description": "Test",
            "remediation": "Test",
            "risk_rating": "High",
            "instances": [
                {"location": "test"}  # Missing 'details'
            ]
        }
        
        response = client.post(f"/projects/{sample_project.id}/findings", json=payload)
        assert response.status_code == 400
        assert "details" in response.json()["detail"].lower()
    
    def test_create_finding_nonexistent_template(self, client, sample_project):
        """Test error when template_id doesn't exist."""
        payload = {
            "title": "Test",
            "description": "Test",
            "remediation": "Test",
            "risk_rating": "High",
            "template_id": 99999,  # Nonexistent
            "instances": [{"location": "test", "details": "test"}]
        }
        
        response = client.post(f"/projects/{sample_project.id}/findings", json=payload)
        assert response.status_code == 404
        assert "template" in response.json()["detail"].lower()
    
    def test_create_finding_nonexistent_project(self, client):
        """Test error when project doesn't exist."""
        payload = {
            "title": "Test",
            "description": "Test",
            "remediation": "Test",
            "risk_rating": "High",
            "instances": [{"location": "test", "details": "test"}]
        }
        
        response = client.post("/projects/99999/findings", json=payload)
        assert response.status_code == 404
        assert "project" in response.json()["detail"].lower()
