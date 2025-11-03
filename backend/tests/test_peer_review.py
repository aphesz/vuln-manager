"""
Tests for peer review workflow endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Project, Finding, Comment, AuditLog


def test_update_review_status(client: TestClient, session: Session):
    """Test updating a finding's review status"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="SQL Injection",
        risk_rating="Critical",
        description="SQL injection vulnerability in authentication",
        remediation="Use parameterized queries and input validation",
        review_status="Pending",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Test 1: Update review status
    response = client.patch(
        f"/findings/{finding.id}/review",
        json={"status": "Approved", "reviewer_id": 1}
    )
    
    assert response.status_code == 200
    
    # Verify finding updated
    session.expire(finding)  # Force reload from database
    session.refresh(finding)
    assert finding.review_status.value == "Approved"
    
    # Verify audit log created
    statement = select(AuditLog).where(
        AuditLog.entity_type == "finding",
        AuditLog.entity_id == finding.id,
    )
    audit_logs = session.exec(statement).all()
    assert len(audit_logs) > 0
    assert audit_logs[0].action == "review_status_changed"


def test_add_comment(client: TestClient, session: Session):
    """Test adding a comment to a finding"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="XSS Vulnerability",
        risk_rating="High",
        description="Cross-site scripting in user input fields",
        remediation="Implement proper output encoding and CSP headers",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Add comment
    comment_text = "This needs immediate attention"
    response = client.post(
        f"/findings/{finding.id}/comments",
        json={"text": comment_text, "user": "test_user"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == comment_text
    assert data["user"] == "test_user"
    assert "created_at" in data


def test_add_comment_validation(client: TestClient, session: Session):
    """Test comment validation (max 5000 characters)"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test Finding",
        risk_rating="Medium",
        description="Test vulnerability description",
        remediation="Test remediation steps",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Try to add comment that's too long
    long_comment = "a" * 5001
    response = client.post(
        f"/findings/{finding.id}/comments",
        json={"text": long_comment, "user": "test_user"},
    )
    
    assert response.status_code == 422  # Pydantic validation error
    # Pydantic returns validation errors as a list
    response_data = response.json()
    assert "detail" in response_data


def test_get_comments(client: TestClient, session: Session):
    """Test retrieving comments for a finding"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test Finding",
        risk_rating="Low",
        description="Low risk vulnerability",
        remediation="Apply security best practices",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Add multiple comments
    from app.timezone_utils import get_utc_now
    comment1 = Comment(
        finding_id=finding.id,
        text="First comment",
        user="user1",
        created_at=get_utc_now(),
    )
    comment2 = Comment(
        finding_id=finding.id,
        text="Second comment",
        user="user2",
        created_at=get_utc_now(),
    )
    session.add(comment1)
    session.add(comment2)
    session.commit()
    
    # Get comments
    response = client.get(f"/findings/{finding.id}/comments")
    
    assert response.status_code == 200
    comments = response.json()
    assert len(comments) == 2
    assert comments[0]["text"] == "First comment"
    assert comments[1]["text"] == "Second comment"


def test_get_audit_log(client: TestClient, session: Session):
    """Test retrieving audit log entries"""
    # Create test project and finding
    project = Project(name="Test Project", description="Test")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test Finding",
        risk_rating="High",
        description="High risk security finding",
        remediation="Immediate remediation required",
        review_status="Pending",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Create audit log entries
    import json
    from app.timezone_utils import get_utc_now
    log1 = AuditLog(
        entity_type="finding",
        entity_id=finding.id,
        action="review_status_changed",
        user="user1",
        timestamp=get_utc_now(),
        changes_json=json.dumps({
            "field": "review_status",
            "old_value": "Pending",
            "new_value": "In Review"
        })
    )
    log2 = AuditLog(
        entity_type="finding",
        entity_id=finding.id,
        action="review_status_changed",
        user="user2",
        timestamp=get_utc_now(),
        changes_json=json.dumps({
            "field": "review_status",
            "old_value": "In Review",
            "new_value": "Approved"
        })
    )
    session.add(log1)
    session.add(log2)
    session.commit()
    
    # Get audit log
    response = client.get(
        "/audit-log",
        params={"entity_type": "finding", "entity_id": finding.id},
    )
    
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) == 2
    assert logs[0]["action"] == "review_status_changed"
    
    # API returns newest first, so logs[0] is the most recent (log2)
    import json
    if logs[0]["changes_json"]:
        changes = json.loads(logs[0]["changes_json"])
        assert changes["old_value"] == "In Review"
        assert changes["new_value"] == "Approved"
    
    # logs[1] should be the older entry (log1)
    if logs[1]["changes_json"]:
        changes = json.loads(logs[1]["changes_json"])
        assert changes["old_value"] == "Pending"
        assert changes["new_value"] == "In Review"
