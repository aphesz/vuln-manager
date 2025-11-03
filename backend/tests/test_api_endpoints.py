"""
API endpoint tests for vulnerability repository and scoring calculators.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session


class TestCVSSCalculatorEndpoint:
    """Test POST /cvss/calculate endpoint."""
    
    def test_calculate_valid_xss_vector(self, client: TestClient):
        """Test calculating XSS vector via API."""
        response = client.post(
            "/cvss/calculate",
            json={"vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is True
        assert data["base_score"] == 6.1
        assert data["severity"] == "Medium"
        assert data["vector"] == "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
        assert data["error"] is None
    
    def test_calculate_critical_vector(self, client: TestClient):
        """Test calculating Critical severity vector."""
        response = client.post(
            "/cvss/calculate",
            json={"vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is True
        assert data["base_score"] >= 9.0
        assert data["severity"] == "Critical"
    
    def test_calculate_invalid_vector(self, client: TestClient):
        """Test invalid CVSS vector returns error."""
        response = client.post(
            "/cvss/calculate",
            json={"vector": "INVALID"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is False
        assert data["error"] is not None
        assert data["base_score"] == 0.0
    
    def test_calculate_missing_metrics(self, client: TestClient):
        """Test vector with missing metrics."""
        response = client.post(
            "/cvss/calculate",
            json={"vector": "CVSS:3.1/AV:N/AC:L"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is False
        assert "missing" in data["error"].lower()
    
    def test_calculate_empty_vector(self, client: TestClient):
        """Test empty vector."""
        response = client.post(
            "/cvss/calculate",
            json={"vector": ""}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is False
        assert data["error"] is not None


class TestOWASPCalculatorEndpoint:
    """Test POST /owasp/calculate endpoint."""
    
    def test_calculate_critical_risk(self, client: TestClient):
        """Test Critical risk calculation."""
        response = client.post(
            "/owasp/calculate",
            json={"likelihood": 9, "impact": 9}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is True
        assert data["risk_score"] == 81
        assert data["risk_rating"] == "Critical"
        assert data["likelihood"] == 9
        assert data["impact"] == 9
        assert data["error"] is None
    
    def test_calculate_high_risk(self, client: TestClient):
        """Test High risk calculation."""
        response = client.post(
            "/owasp/calculate",
            json={"likelihood": 5, "impact": 3}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is True
        assert data["risk_score"] == 15
        assert data["risk_rating"] == "High"
    
    def test_calculate_medium_risk(self, client: TestClient):
        """Test Medium risk calculation."""
        response = client.post(
            "/owasp/calculate",
            json={"likelihood": 3, "impact": 3}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is True
        assert data["risk_score"] == 9
        assert data["risk_rating"] == "Medium"
    
    def test_calculate_low_risk(self, client: TestClient):
        """Test Low risk calculation."""
        response = client.post(
            "/owasp/calculate",
            json={"likelihood": 1, "impact": 1}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is True
        assert data["risk_score"] == 1
        assert data["risk_rating"] == "Low"
    
    def test_calculate_invalid_likelihood_too_high(self, client: TestClient):
        """Test invalid likelihood (> 9)."""
        response = client.post(
            "/owasp/calculate",
            json={"likelihood": 10, "impact": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is False
        assert data["error"] is not None
        assert "likelihood" in data["error"].lower()
    
    def test_calculate_invalid_impact_too_low(self, client: TestClient):
        """Test invalid impact (< 1)."""
        response = client.post(
            "/owasp/calculate",
            json={"likelihood": 5, "impact": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is False
        assert data["error"] is not None
        assert "impact" in data["error"].lower()
    
    def test_calculate_boundary_values(self, client: TestClient):
        """Test all boundary risk rating values."""
        # Critical boundary (18)
        response = client.post("/owasp/calculate", json={"likelihood": 2, "impact": 9})
        assert response.json()["risk_rating"] == "Critical"
        
        # High boundary low (12)
        response = client.post("/owasp/calculate", json={"likelihood": 4, "impact": 3})
        assert response.json()["risk_rating"] == "High"
        
        # Medium boundary low (6)
        response = client.post("/owasp/calculate", json={"likelihood": 2, "impact": 3})
        assert response.json()["risk_rating"] == "Medium"
        
        # Low (< 6)
        response = client.post("/owasp/calculate", json={"likelihood": 1, "impact": 5})
        assert response.json()["risk_rating"] == "Low"


class TestVulnerabilityTemplateEndpoints:
    """Test vulnerability template CRUD endpoints."""
    
    def test_list_templates_empty(self, client: TestClient):
        """Test listing templates returns array."""
        response = client.get("/vulnerability-templates")
        
        assert response.status_code == 200
        data = response.json()
        
        # API returns array directly
        assert isinstance(data, list)
    
    def test_create_template(self, client: TestClient):
        """Test creating a new template."""
        template_data = {
            "title": "Test SQL Injection",
            "description": "SQL injection vulnerability in login form",
            "cwe_id": "CWE-89",
            "default_risk_rating": "High",
            "vulnerability_type": "SQLi"
        }
        
        response = client.post("/vulnerability-templates", json=template_data)
        
        assert response.status_code in [200, 201]
        data = response.json()
        
        assert data["title"] == template_data["title"]
        assert data["description"] == template_data["description"]
        assert data["cwe_id"] == template_data["cwe_id"]
        assert data["source"] == "manual"
        assert "id" in data
    
    def test_create_template_with_cvss(self, client: TestClient):
        """Test creating template with CVSS data."""
        template_data = {
            "title": "Test XSS with CVSS",
            "description": "Cross-site scripting vulnerability",
            "cwe_id": "CWE-79",
            "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
            "cvss_score": 6.1,
            "default_risk_rating": "Medium",
            "vulnerability_type": "XSS"
        }
        
        response = client.post("/vulnerability-templates", json=template_data)
        
        assert response.status_code in [200, 201]
        data = response.json()
        
        assert data["cvss_vector"] == template_data["cvss_vector"]
        assert data["cvss_score"] == template_data["cvss_score"]
    
    def test_list_templates_with_pagination(self, client: TestClient):
        """Test pagination parameters."""
        response = client.get("/vulnerability-templates?page=1&per_page=10")
        
        assert response.status_code == 200
        data = response.json()
        
        # API returns array directly
        assert isinstance(data, list)
    
    def test_search_templates(self, client: TestClient):
        """Test searching templates."""
        response = client.get("/vulnerability-templates?search=SQL")
        
        assert response.status_code == 200
        data = response.json()
        
        # API returns array
        assert isinstance(data, list)
    
    def test_filter_by_risk_rating(self, client: TestClient):
        """Test filtering by risk rating."""
        response = client.get("/vulnerability-templates?risk_rating=High")
        
        assert response.status_code == 200
        data = response.json()
        
        # API returns array
        assert isinstance(data, list)
    
    def test_filter_by_cwe(self, client: TestClient):
        """Test filtering by CWE ID."""
        response = client.get("/vulnerability-templates?cwe_id=CWE-79")
        
        assert response.status_code == 200
        data = response.json()
        
        # API returns array
        assert isinstance(data, list)


class TestHealthAndStatus:
    """Test general API health and status."""
    
    def test_docs_available(self, client: TestClient):
        """Test Swagger docs are available."""
        response = client.get("/docs")
        
        assert response.status_code == 200
