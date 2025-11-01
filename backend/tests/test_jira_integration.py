"""
Tests for Jira integration endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from unittest.mock import patch, Mock, AsyncMock

from app.models import Project, Finding, JiraSettings


def test_save_jira_settings(client: TestClient, session: Session):
    """Test saving Jira configuration"""
    # Create test project first
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    settings_data = {
        "project_id": project.id,
        "jira_url": "https://example.atlassian.net",
        "project_key": "VULN",
        "api_token": "test-token-123",
    }
    
    response = client.post("/jira/settings", json=settings_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["jira_url"] == settings_data["jira_url"]
    assert data["project_key"] == settings_data["project_key"]
    # API token should not be in response
    assert "api_token" not in data or data["api_token"] == ""


def test_get_jira_settings(client: TestClient, session: Session):
    """Test retrieving Jira settings"""
    # Create test project first
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    # Create test settings
    settings = JiraSettings(
        project_id=project.id,
        jira_url="https://example.atlassian.net",
        project_key="VULN",
        api_token_encrypted="encrypted-token",
    )
    session.add(settings)
    session.commit()
    
    response = client.get(f"/jira/settings/{settings.project_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["jira_url"] == settings.jira_url
    assert data["project_key"] == settings.project_key


@patch('app.jira.JiraClient')
def test_test_jira_connection_success(mock_jira, client: TestClient):
    """Test Jira connection with valid credentials"""
    # Mock successful connection
    mock_instance = Mock()
    mock_instance.test_connection = AsyncMock(return_value={
        "success": True,
        "message": "Connection successful",
        "user": "Test User"
    })
    mock_jira.return_value = mock_instance
    
    response = client.post("/jira/test-connection", json={
        "jira_url": "https://example.atlassian.net",
        "email": "test@example.com",
        "api_token": "valid-token",
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "successful" in data["message"].lower()


@patch('app.jira.JiraClient')
def test_test_jira_connection_failure(mock_jira, client: TestClient):
    """Test Jira connection with invalid credentials"""
    # Mock failed connection
    mock_instance = Mock()
    mock_instance.test_connection = AsyncMock(side_effect=Exception("Authentication failed"))
    mock_jira.return_value = mock_instance
    
    response = client.post("/jira/test-connection", json={
        "jira_url": "https://example.atlassian.net",
        "email": "test@example.com",
        "api_token": "invalid-token",
    })
    
    assert response.status_code == 400
    assert "failed" in response.json()["detail"].lower()


@patch('app.main.get_jira_client')
def test_create_jira_issue(mock_get_client, client: TestClient, session: Session):
    """Test creating a Jira issue from a finding"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="SQL Injection in Login Form",
        risk_rating="Critical",
        description="Vulnerability allows SQL injection attacks",
        remediation="Use parameterized queries and prepared statements",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Create Jira settings
    from app.jira import encrypt_token
    settings = JiraSettings(
        project_id=project.id,
        jira_url="https://example.atlassian.net",
        project_key="VULN",
        api_token_encrypted=encrypt_token("test-token"),
        is_active=True
    )
    session.add(settings)
    session.commit()
    
    # Mock Jira client and get_jira_client
    mock_client_instance = Mock()
    mock_client_instance.create_issue = AsyncMock(return_value={
        "key": "VULN-123",
        "self": "https://example.atlassian.net/rest/api/2/issue/VULN-123",
    })
    mock_get_client.return_value = mock_client_instance
    
    # Create Jira issue
    response = client.post(
        f"/findings/{finding.id}/create-jira-issue",
        json={"user": "test_user"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["jira_issue_key"] == "VULN-123"
    assert "jira_url" in data
    
    # Verify finding updated
    session.refresh(finding)
    assert finding.jira_issue_key == "VULN-123"
    
    # Verify audit log created
    from app.models import AuditLog
    statement = select(AuditLog).where(
        AuditLog.entity_type == "finding",
        AuditLog.entity_id == finding.id,
        AuditLog.action == "jira_issue_created",
    )
    audit_logs = session.exec(statement).all()
    assert len(audit_logs) > 0


def test_create_jira_issue_no_settings(client: TestClient, session: Session):
    """Test creating Jira issue without configured settings"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test Finding",
        risk_rating="High",
        description="Test finding for Jira integration",
        remediation="Apply security patches",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Try to create Jira issue without settings
    response = client.post(
        f"/findings/{finding.id}/create-jira-issue",
        json={"user": "test_user"},
    )
    
    assert response.status_code == 400
    assert "not configured" in response.json()["detail"].lower()
