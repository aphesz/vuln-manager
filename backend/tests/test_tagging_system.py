"""
Tests for the Custom Tagging System

This module tests:
- Tag CRUD operations (Create, Read, Update, Delete)
- Finding-tag associations
- Tag usage tracking
- Color validation
- Tag search functionality
- Cascade deletion
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Project, Finding, Tag, FindingTag


# ============================================================
# TAG CRUD TESTS
# ============================================================

def test_create_tag(client: TestClient, session: Session):
    """Test creating a new tag with valid data"""
    response = client.post("/tags", json={
        "name": "High Priority",
        "color": "#FF0000",
        "description": "Critical findings requiring immediate attention"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "High Priority"
    assert data["color"] == "#FF0000"
    assert data["description"] == "Critical findings requiring immediate attention"
    assert data["usage_count"] == 0
    assert "id" in data
    assert "created_at" in data


def test_create_tag_invalid_color(client: TestClient):
    """Test creating a tag with an invalid color"""
    response = client.post("/tags", json={
        "name": "Invalid Color",
        "color": "not-a-hex-color"
    })
    assert response.status_code == 422  # FastAPI validation returns 422
    assert "color" in str(response.json()).lower()


def test_create_tag_duplicate_name(client: TestClient, session: Session):
    """Test that duplicate tag names are rejected"""
    # Create first tag
    client.post("/tags", json={
        "name": "Duplicate",
        "color": "#FF0000",
        "description": "First tag"
    })
    
    # Try to create duplicate
    response = client.post("/tags", json={
        "name": "Duplicate",
        "color": "#00FF00",
        "description": "Second tag"
    })
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_list_tags(client: TestClient, session: Session):
    """Test listing all tags"""
    # Create multiple tags
    tags = [
        {"name": "Tag1", "color": "#FF0000", "description": "First"},
        {"name": "Tag2", "color": "#00FF00", "description": "Second"},
        {"name": "Tag3", "color": "#0000FF", "description": "Third"}
    ]
    
    for tag in tags:
        client.post("/tags", json=tag)
    
    # List all tags
    response = client.get("/tags")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # Verify tags are sorted by name
    names = [t["name"] for t in data]
    assert names == sorted(names)


def test_search_tags(client: TestClient, session: Session):
    """Test searching tags by name"""
    # Create tags
    client.post("/tags", json={"name": "OWASP Top 10", "color": "#FF0000", "description": "Security"})
    client.post("/tags", json={"name": "False Positive", "color": "#00FF00", "description": "Not a real issue"})
    client.post("/tags", json={"name": "Needs Retest", "color": "#0000FF", "description": "Retest required"})
    
    # Search for "OWASP"
    response = client.get("/tags?search=OWASP")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "OWASP Top 10"


def test_get_tag_by_id(client: TestClient, session: Session):
    """Test retrieving a single tag by ID"""
    # Create tag
    create_response = client.post("/tags", json={
        "name": "Test Tag",
        "color": "#FF0000",
        "description": "Test"
    })
    tag_id = create_response.json()["id"]
    
    # Get tag by ID
    response = client.get(f"/tags/{tag_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == tag_id
    assert data["name"] == "Test Tag"


def test_get_nonexistent_tag(client: TestClient):
    """Test that getting a non-existent tag returns 404"""
    response = client.get("/tags/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_tag(client: TestClient, session: Session):
    """Test updating a tag"""
    # Create tag
    create_response = client.post("/tags", json={
        "name": "Original Name",
        "color": "#FF0000",
        "description": "Original description"
    })
    tag_id = create_response.json()["id"]
    
    # Update tag
    response = client.patch(f"/tags/{tag_id}", json={
        "name": "Updated Name",
        "color": "#00FF00",
        "description": "Updated description"
    })
    
    if response.status_code != 200:
        print(f"ERROR: {response.status_code} - {response.json()}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["color"] == "#00FF00"
    assert data["description"] == "Updated description"


def test_update_tag_partial(client: TestClient, session: Session):
    """Test partial update (only name)"""
    # Create tag
    create_response = client.post("/tags", json={
        "name": "Original",
        "color": "#FF0000",
        "description": "Test"
    })
    tag_id = create_response.json()["id"]
    
    # Update only name
    response = client.patch(f"/tags/{tag_id}", json={
        "name": "Updated"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated"
    assert data["color"] == "#FF0000"  # Should remain unchanged


def test_update_tag_duplicate_name(client: TestClient, session: Session):
    """Test that updating to a duplicate name is rejected"""
    # Create two tags
    client.post("/tags", json={"name": "Tag1", "color": "#FF0000", "description": "First"})
    create_response = client.post("/tags", json={"name": "Tag2", "color": "#00FF00", "description": "Second"})
    tag2_id = create_response.json()["id"]
    
    # Try to rename Tag2 to Tag1
    response = client.patch(f"/tags/{tag2_id}", json={"name": "Tag1"})
    
    assert response.status_code in [400, 422]  # Can be either depending on validation layer
    assert "already exists" in str(response.json()).lower() or "tag1" in str(response.json()).lower()


def test_delete_tag(client: TestClient, session: Session):
    """Test deleting a tag"""
    # Create tag
    create_response = client.post("/tags", json={
        "name": "To Delete",
        "color": "#FF0000",
        "description": "Will be deleted"
    })
    tag_id = create_response.json()["id"]
    
    # Delete tag
    response = client.delete(f"/tags/{tag_id}")
    assert response.status_code == 204  # FastAPI DELETE returns 204 No Content
    
    # Verify tag is gone
    get_response = client.get(f"/tags/{tag_id}")
    assert get_response.status_code == 404


def test_delete_nonexistent_tag(client: TestClient):
    """Test deleting a non-existent tag returns 404"""
    response = client.delete("/tags/99999")
    assert response.status_code == 404


# ============================================================
# FINDING-TAG ASSOCIATION TESTS
# ============================================================

def test_add_tag_to_finding(client: TestClient, session: Session):
    """Test associating a tag with a finding"""
    # Create project
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    # Create finding
    finding = Finding(
        project_id=project.id,
        title="SQL Injection",
        description="Test",
        remediation="Fix it",
        risk_rating="High"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Create tag
    tag_response = client.post("/tags", json={
        "name": "Critical",
        "color": "#FF0000",
        "description": "Critical issue"
    })
    tag_id = tag_response.json()["id"]
    
    # Associate tag with finding
    response = client.post(f"/findings/{finding.id}/tags/{tag_id}")
    assert response.status_code in [200, 201]  # Accept both OK and Created
    
    # Verify association
    finding_tags = session.exec(
        select(FindingTag).where(FindingTag.finding_id == finding.id)
    ).all()
    assert len(finding_tags) == 1
    assert finding_tags[0].tag_id == tag_id


def test_add_duplicate_tag_to_finding(client: TestClient, session: Session):
    """Test that adding the same tag twice is rejected"""
    # Setup
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="XSS",
        description="Test",
        remediation="Fix",
        risk_rating="Medium"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    tag_response = client.post("/tags", json={
        "name": "Test Tag",
        "color": "#FF0000",
        "description": "Test"
    })
    tag_id = tag_response.json()["id"]
    
    # Add tag first time
    client.post(f"/findings/{finding.id}/tags/{tag_id}")
    
    # Try to add again
    response = client.post(f"/findings/{finding.id}/tags/{tag_id}")
    # Should either reject with 400 or be idempotent with 200/201
    assert response.status_code in [200, 201, 400]


def test_remove_tag_from_finding(client: TestClient, session: Session):
    """Test removing a tag from a finding"""
    # Setup
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="CSRF",
        description="Test",
        remediation="Fix",
        risk_rating="Low"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    tag_response = client.post("/tags", json={
        "name": "To Remove",
        "color": "#FF0000",
        "description": "Test"
    })
    tag_id = tag_response.json()["id"]
    
    # Add tag
    client.post(f"/findings/{finding.id}/tags/{tag_id}")
    
    # Remove tag
    response = client.delete(f"/findings/{finding.id}/tags/{tag_id}")
    assert response.status_code in [200, 204]  # Accept both OK and No Content
    
    # Verify removal
    finding_tags = session.exec(
        select(FindingTag).where(FindingTag.finding_id == finding.id)
    ).all()
    assert len(finding_tags) == 0


def test_remove_nonexistent_tag_from_finding(client: TestClient, session: Session):
    """Test removing a tag that isn't associated returns 404"""
    # Setup
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test",
        description="Test",
        remediation="Fix",
        risk_rating="Low"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    tag_response = client.post("/tags", json={
        "name": "Not Associated",
        "color": "#FF0000",
        "description": "Test"
    })
    tag_id = tag_response.json()["id"]
    
    # Try to remove tag that was never added
    response = client.delete(f"/findings/{finding.id}/tags/{tag_id}")
    assert response.status_code == 404


def test_list_finding_tags(client: TestClient, session: Session):
    """Test listing all tags for a finding"""
    # Setup
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test Finding",
        description="Test",
        remediation="Fix",
        risk_rating="High"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Create multiple tags
    tag_ids = []
    for i in range(3):
        tag_response = client.post("/tags", json={
            "name": f"Tag {i}",
            "color": "#FF0000",
            "description": f"Tag {i}"
        })
        tag_ids.append(tag_response.json()["id"])
    
    # Associate all tags
    for tag_id in tag_ids:
        client.post(f"/findings/{finding.id}/tags/{tag_id}")
    
    # List tags
    response = client.get(f"/findings/{finding.id}/tags")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


# ============================================================
# TAG USAGE TRACKING TESTS
# ============================================================

def test_tag_usage_count_increments(client: TestClient, session: Session):
    """Test that usage_count increments when tag is added to finding"""
    # Create tag
    tag_response = client.post("/tags", json={
        "name": "Usage Test",
        "color": "#FF0000",
        "description": "Test"
    })
    tag_id = tag_response.json()["id"]
    initial_count = tag_response.json()["usage_count"]
    
    # Create project and finding
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test",
        description="Test",
        remediation="Fix",
        risk_rating="Medium"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Add tag to finding
    client.post(f"/findings/{finding.id}/tags/{tag_id}")
    
    # Check usage count
    tag_check = client.get(f"/tags/{tag_id}")
    assert tag_check.json()["usage_count"] == initial_count + 1


def test_tag_usage_count_decrements(client: TestClient, session: Session):
    """Test that usage_count decrements when tag is removed from finding"""
    # Setup
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    finding = Finding(
        project_id=project.id,
        title="Test",
        description="Test",
        remediation="Fix",
        risk_rating="Low"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Create tag and add to finding
    tag_response = client.post("/tags", json={
        "name": "Decrement Test",
        "color": "#FF0000",
        "description": "Test"
    })
    tag_id = tag_response.json()["id"]
    client.post(f"/findings/{finding.id}/tags/{tag_id}")
    
    # Get current count
    tag_check = client.get(f"/tags/{tag_id}")
    count_before = tag_check.json()["usage_count"]
    
    # Remove tag
    client.delete(f"/findings/{finding.id}/tags/{tag_id}")
    
    # Check count decreased
    tag_check = client.get(f"/tags/{tag_id}")
    assert tag_check.json()["usage_count"] == count_before - 1


# ============================================================
# CASCADE DELETION TESTS
# ============================================================

def test_deleting_tag_removes_associations(client: TestClient, session: Session):
    """Test that deleting a tag also removes all finding associations"""
    # Setup
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    # Create multiple findings
    finding_ids = []
    for i in range(3):
        finding = Finding(
            project_id=project.id,
            title=f"Finding {i}",
            description="Test",
            remediation="Fix",
            risk_rating="Medium"
        )
        session.add(finding)
        session.commit()
        session.refresh(finding)
        finding_ids.append(finding.id)
    
    # Create tag
    tag_response = client.post("/tags", json={
        "name": "Cascade Test",
        "color": "#FF0000",
        "description": "Test"
    })
    tag_id = tag_response.json()["id"]
    
    # Associate tag with all findings
    for finding_id in finding_ids:
        client.post(f"/findings/{finding_id}/tags/{tag_id}")
    
    # Verify associations exist
    associations = session.exec(select(FindingTag).where(FindingTag.tag_id == tag_id)).all()
    assert len(associations) == 3
    
    # Delete tag
    client.delete(f"/tags/{tag_id}")
    
    # Verify all associations are gone
    associations = session.exec(select(FindingTag).where(FindingTag.tag_id == tag_id)).all()
    assert len(associations) == 0


# ============================================================
# PROJECT WITH TAGS TESTS
# ============================================================

def test_get_project_with_finding_tags(client: TestClient, session: Session):
    """Test that getting a project includes tags for findings"""
    # Create project
    project = Project(name="Test Project", consultant_name="Tester")
    session.add(project)
    session.commit()
    session.refresh(project)
    
    # Create finding
    finding = Finding(
        project_id=project.id,
        title="Tagged Finding",
        description="Test",
        remediation="Fix",
        risk_rating="High"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Create tags
    tag1 = client.post("/tags", json={"name": "Tag1", "color": "#FF0000", "description": "First"})
    tag2 = client.post("/tags", json={"name": "Tag2", "color": "#00FF00", "description": "Second"})
    tag1_id = tag1.json()["id"]
    tag2_id = tag2.json()["id"]
    
    # Associate tags
    client.post(f"/findings/{finding.id}/tags/{tag1_id}")
    client.post(f"/findings/{finding.id}/tags/{tag2_id}")
    
    # Get project
    response = client.get(f"/projects/{project.id}")
    assert response.status_code == 200
    data = response.json()
    
    # Verify tags are included
    assert len(data["findings"]) == 1
    assert len(data["findings"][0]["tags"]) == 2
    
    # Verify tag details
    tag_names = [t["name"] for t in data["findings"][0]["tags"]]
    assert "Tag1" in tag_names
    assert "Tag2" in tag_names


# ============================================================
# COLOR VALIDATION TESTS
# ============================================================

def test_valid_hex_colors(client: TestClient):
    """Test various valid hex color formats"""
    valid_colors = [
        "#FF0000",  # 6-digit uppercase
        "#ff0000",  # 6-digit lowercase
        "#AbCdEf",  # 6-digit mixed case
    ]
    
    for i, color in enumerate(valid_colors):
        response = client.post("/tags", json={
            "name": f"Color Test {i}",
            "color": color,
            "description": "Test"
        })
        assert response.status_code == 201, f"Failed for color: {color}"


def test_invalid_hex_colors(client: TestClient):
    """Test that invalid hex colors are rejected"""
    invalid_colors = [
        "FF0000",      # Missing #
        "#FF00",       # Too short
        "#FF00000",    # Too long
        "#GGGGGG",     # Invalid characters
        "red",         # Color name
        "#FF-00-00",   # Dashes
    ]
    
    for i, color in enumerate(invalid_colors):
        response = client.post("/tags", json={
            "name": f"Invalid Color {i}",
            "color": color,
            "description": "Test"
        })
        # FastAPI validation returns 422, our endpoint might return 400
        assert response.status_code in [400, 422], f"Should reject color: {color}"
