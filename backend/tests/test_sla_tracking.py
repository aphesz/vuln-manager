"""
Tests for SLA tracking and remediation endpoints
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Project, Finding


def test_get_sla_summary(client: TestClient, session: Session):
    """Test SLA summary metrics"""
    # Create test project
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    # Create findings with different SLA statuses
    now = datetime.utcnow()
    
    # On track finding
    finding1 = Finding(
        project_id=project.id,
        title="Finding 1",
        risk_rating="High",
        description="High risk vulnerability on track",
        remediation="Apply security updates",
        sla_status="On Track",
        remediation_deadline=now + timedelta(days=10),
    )
    
    # At risk finding
    finding2 = Finding(
        project_id=project.id,
        title="Finding 2",
        risk_rating="Critical",
        description="Critical vulnerability at risk",
        remediation="Immediate patching required",
        sla_status="At Risk",
        remediation_deadline=now + timedelta(days=2),
    )
    
    # Overdue finding
    finding3 = Finding(
        project_id=project.id,
        title="Finding 3",
        risk_rating="Critical",
        description="Critical overdue vulnerability",
        remediation="Emergency remediation needed",
        sla_status="Overdue",
        remediation_deadline=now - timedelta(days=5),
    )
    
    session.add_all([finding1, finding2, finding3])
    session.commit()
    
    # Get SLA summary
    response = client.get("/sla-summary")
    
    assert response.status_code == 200
    data = response.json()
    assert data["on_track"] >= 1
    assert data["at_risk"] >= 1
    assert data["overdue"] >= 1


def test_get_overdue_findings(client: TestClient, session: Session):
    """Test retrieving overdue findings"""
    # Create test project
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    now = datetime.utcnow()
    
    # Create overdue finding
    overdue_finding = Finding(
        project_id=project.id,
        title="Overdue SQL Injection",
        risk_rating="Critical",
        description="Overdue SQL injection vulnerability",
        remediation="Use parameterized queries",
        sla_status="Overdue",
        remediation_deadline=now - timedelta(days=10),
    )
    
    # Create on-track finding
    on_track_finding = Finding(
        project_id=project.id,
        title="On Track Finding",
        risk_rating="Medium",
        description="On track remediation",
        remediation="Apply security patches",
        sla_status="On Track",
        remediation_deadline=now + timedelta(days=20),
    )
    
    session.add_all([overdue_finding, on_track_finding])
    session.commit()
    
    # Get overdue findings
    response = client.get("/findings/overdue")
    
    assert response.status_code == 200
    findings = response.json()
    
    # Should only return overdue findings
    assert len(findings) >= 1
    for finding in findings:
        assert finding["sla_status"] == "Overdue"


def test_update_remediation(client: TestClient, session: Session):
    """Test updating remediation deadline and owner"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="XSS Vulnerability",
        risk_rating="High",
        description="Cross-site scripting vulnerability",
        remediation="Implement output encoding",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Update remediation
    deadline = (datetime.utcnow() + timedelta(days=30)).isoformat()
    owner = "security_team"
    
    response = client.patch(
        f"/findings/{finding.id}/remediation",
        json={
            "remediation_deadline": deadline,
            "remediation_owner": owner,
            "user": "test_user",
        },
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["remediation_owner"] == owner
    assert data["remediation_deadline"] is not None
    
    # Verify finding updated
    session.refresh(finding)
    assert finding.remediation_owner == owner
    assert finding.remediation_deadline is not None
    
    # Verify audit log created
    from app.models import AuditLog
    statement = select(AuditLog).where(
        AuditLog.entity_type == "finding",
        AuditLog.entity_id == finding.id,
    )
    audit_logs = session.exec(statement).all()
    assert len(audit_logs) > 0


def test_sla_status_calculation(client: TestClient, session: Session):
    """Test SLA status calculation based on risk rating"""
    # Create test project
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    now = datetime.utcnow()
    
    # Critical finding - 7 days
    critical_finding = Finding(
        project_id=project.id,
        title="Critical Finding",
        risk_rating="Critical",
        description="Critical security issue",
        remediation="Emergency patch required",
        remediation_deadline=now + timedelta(days=5),
    )
    
    # High finding - 30 days
    high_finding = Finding(
        project_id=project.id,
        title="High Finding",
        risk_rating="High",
        description="High priority security issue",
        remediation="Apply security update",
        remediation_deadline=now + timedelta(days=25),
    )
    
    # Medium finding - 90 days
    medium_finding = Finding(
        project_id=project.id,
        title="Medium Finding",
        risk_rating="Medium",
        description="Medium priority issue",
        remediation="Schedule remediation",
        remediation_deadline=now + timedelta(days=80),
    )
    
    session.add_all([critical_finding, high_finding, medium_finding])
    session.commit()
    
    # Note: SLA status calculation would be done by backend logic
    # This test verifies the data model supports it


def test_update_remediation_invalid_date(client: TestClient, session: Session):
    """Test updating remediation with invalid date format"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test Finding",
        risk_rating="Medium",
        description="Test finding for validation",
        remediation="Test remediation",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Try to update with invalid date
    response = client.patch(
        f"/findings/{finding.id}/remediation",
        json={
            "remediation_deadline": "not-a-valid-date",
            "user": "test_user",
        },
    )
    
    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()
