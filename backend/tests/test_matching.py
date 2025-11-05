"""
Tests for vulnerability template matching engine (v0.7.0 Phase 1)

Tests cover:
- Tier 1 Exact Matching: CWE/CVE exact matches
- Tier 2 Fuzzy Matching: Title and description similarity
- Tiered Fallback: Exact → Fuzzy → None
- Match Persistence: VulnerabilityMatch creation
- Auto-match API: Bulk matching endpoint
"""

import pytest
from sqlmodel import Session, select
from app.models import (
    Project,
    Finding,
    VulnerabilityTemplate,
    VulnerabilityMatch,
)
from app.matching import (
    find_exact_cwe_match,
    find_exact_cve_match,
    find_fuzzy_title_matches,
    find_fuzzy_description_matches,
    find_best_match,
    find_all_matches,
    create_vulnerability_match,
    auto_match_finding,
    EXACT_MATCH_THRESHOLD,
    FUZZY_HIGH_THRESHOLD,
    FUZZY_MEDIUM_THRESHOLD,
)


# ==============================
# Fixtures
# ==============================

@pytest.fixture
def sample_project(session: Session) -> Project:
    """Create a sample project for testing."""
    project = Project(
        name="Test Project - Matching Engine",
        description="Project for testing vulnerability matching"
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@pytest.fixture
def sql_injection_template(session: Session) -> VulnerabilityTemplate:
    """Create SQL Injection template with CWE-89."""
    template = VulnerabilityTemplate(
        title="SQL Injection",
        description="Application does not properly sanitize user input before using it in SQL queries",
        cwe_id="CWE-89",
        cvss_score=9.8,
        default_risk_rating="Critical",
        remediation="Test remediation",
        remediation_summary="Use parameterized queries or ORM",
        source="manual",
        is_verified=True
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@pytest.fixture
def xss_template(session: Session) -> VulnerabilityTemplate:
    """Create XSS template with CWE-79."""
    template = VulnerabilityTemplate(
        title="Cross-Site Scripting (XSS)",
        description="Application reflects user input without proper encoding",
        cwe_id="CWE-79",
        cve_id="CVE-2024-1234",  # Fake CVE for testing
        cvss_score=6.1,
        default_risk_rating="Medium",
        remediation="Test remediation",
        remediation_summary="Encode output, use CSP headers",
        source="manual",
        is_verified=True
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@pytest.fixture
def csrf_template(session: Session) -> VulnerabilityTemplate:
    """Create CSRF template without CWE/CVE."""
    template = VulnerabilityTemplate(
        title="Cross-Site Request Forgery (CSRF)",
        description="Application does not validate request origin for state-changing actions",
        cvss_score=4.3,
        default_risk_rating="Medium",
        remediation="Test remediation",
        remediation_summary="Implement CSRF tokens",
        source="manual",
        is_verified=True
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


# ==============================
# Tier 1: Exact Matching Tests
# ==============================

def test_exact_cwe_match_found(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test exact CWE match returns correct template."""
    finding = Finding(
        project_id=sample_project.id,
        title="Login Form SQL Injection",
        description="SQL injection in username parameter",
        risk_rating="Critical",
        remediation="Test remediation",
        cwe_id="CWE-89"
    )
    session.add(finding)
    session.commit()
    
    result = find_exact_cwe_match(session, finding)
    
    assert result is not None
    template, score, method = result
    assert template.id == sql_injection_template.id
    assert score == 1.0
    assert method == "exact_cwe"


def test_exact_cwe_match_not_found(session: Session, sample_project: Project):
    """Test exact CWE match returns None when no template exists."""
    finding = Finding(
        project_id=sample_project.id,
        title="Unknown Vulnerability",
        description="Test description",
        remediation="Test remediation",
        risk_rating="Medium",
        cwe_id="CWE-999"  # No template with this CWE
    )
    session.add(finding)
    session.commit()
    
    result = find_exact_cwe_match(session, finding)
    assert result is None


def test_exact_cve_match_found(session: Session, sample_project: Project, xss_template: VulnerabilityTemplate):
    """Test exact CVE match returns correct template."""
    finding = Finding(
        project_id=sample_project.id,
        title="Reflected XSS Vulnerability",
        description="XSS in search parameter",
        risk_rating="Medium",
        remediation="Test remediation",
        cve_id="CVE-2024-1234"
    )
    session.add(finding)
    session.commit()
    
    result = find_exact_cve_match(session, finding)
    
    assert result is not None
    template, score, method = result
    assert template.id == xss_template.id
    assert score == 1.0
    assert method == "exact_cve"


def test_exact_match_no_cwe_or_cve(session: Session, sample_project: Project):
    """Test exact match returns None when finding has no CWE/CVE."""
    finding = Finding(
        project_id=sample_project.id,
        title="Generic Vulnerability",
        description="No CWE or CVE",
        risk_rating="Low",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    cwe_result = find_exact_cwe_match(session, finding)
    cve_result = find_exact_cve_match(session, finding)
    
    assert cwe_result is None
    assert cve_result is None


# ==============================
# Tier 2: Fuzzy Matching Tests
# ==============================

def test_fuzzy_title_match_exact_same(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test fuzzy title match with identical title."""
    finding = Finding(
        project_id=sample_project.id,
        title="SQL Injection",  # Exact same as template
        description="Test description",
        risk_rating="Critical",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    matches = find_fuzzy_title_matches(session, finding, limit=1)
    
    assert len(matches) == 1
    template, score, method = matches[0]
    assert template.id == sql_injection_template.id
    assert score == 1.0  # 100% match
    assert method == "fuzzy_title"


def test_fuzzy_title_match_word_order(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test fuzzy title match handles word order differences."""
    finding = Finding(
        project_id=sample_project.id,
        title="Injection SQL",  # Same words, different order
        description="Test description",
        risk_rating="Critical",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    matches = find_fuzzy_title_matches(session, finding, limit=1)
    
    assert len(matches) >= 1
    template, score, method = matches[0]
    assert template.id == sql_injection_template.id
    assert score >= 0.8  # Should be high similarity (token_sort_ratio)
    assert method == "fuzzy_title"


def test_fuzzy_title_match_case_insensitive(session: Session, sample_project: Project, xss_template: VulnerabilityTemplate):
    """Test fuzzy title match is case-insensitive."""
    finding = Finding(
        project_id=sample_project.id,
        title="cross-site scripting (xss)",  # Lowercase
        description="Test description",
        risk_rating="Medium",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    matches = find_fuzzy_title_matches(session, finding, limit=1)
    
    assert len(matches) >= 1
    template, score, method = matches[0]
    assert template.id == xss_template.id
    assert score >= 0.9  # Very high similarity
    assert method == "fuzzy_title"


def test_fuzzy_title_match_partial(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test fuzzy title match with partial similarity."""
    finding = Finding(
        project_id=sample_project.id,
        title="SQL Injection in Login Form",  # Extra words
        description="Test description",
        risk_rating="Critical",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    matches = find_fuzzy_title_matches(session, finding, limit=1)
    
    assert len(matches) >= 1
    template, score, method = matches[0]
    assert template.id == sql_injection_template.id
    assert score >= 0.6  # Should have decent similarity
    assert method == "fuzzy_title"


def test_fuzzy_title_match_too_short(session: Session, sample_project: Project):
    """Test fuzzy title match returns empty for very short titles."""
    finding = Finding(
        project_id=sample_project.id,
        title="XS",  # Too short (< 3 chars)
        description="Test description",
        risk_rating="Low",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    matches = find_fuzzy_title_matches(session, finding, limit=5)
    assert len(matches) == 0


def test_fuzzy_description_match(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test fuzzy description match finds similar descriptions."""
    finding = Finding(
        project_id=sample_project.id,
        title="Database Vulnerability",
        description="The application does not properly sanitize user input before using it in SQL queries",  # Similar to template
        risk_rating="High",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    matches = find_fuzzy_description_matches(session, finding, limit=1)
    
    assert len(matches) >= 1
    template, score, method = matches[0]
    assert template.id == sql_injection_template.id
    assert score >= 0.7  # Should have good similarity
    assert method == "fuzzy_description"


def test_fuzzy_description_match_too_short(session: Session, sample_project: Project):
    """Test fuzzy description match returns empty for very short descriptions."""
    finding = Finding(
        project_id=sample_project.id,
        title="Test Finding",
        description="Short",  # Too short (< 10 chars)
        risk_rating="Low",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    matches = find_fuzzy_description_matches(session, finding, limit=5)
    assert len(matches) == 0


# ==============================
# Tiered Fallback Tests
# ==============================

def test_best_match_prefers_exact_cwe(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test find_best_match prefers exact CWE over fuzzy."""
    # Create another template with similar title but no CWE
    similar_template = VulnerabilityTemplate(
        title="SQL Injection Attack",  # Similar title
        description="Different description",
        cvss_score=8.0,
        default_risk_rating="High",
        remediation="Test remediation",
        source="manual",
        is_verified=True
    )
    session.add(similar_template)
    session.commit()
    
    finding = Finding(
        project_id=sample_project.id,
        title="SQL Injection Attack",  # Matches similar_template title better
        description="Test description",
        risk_rating="Critical",
        remediation="Test remediation",
        cwe_id="CWE-89"  # Matches sql_injection_template CWE
    )
    session.add(finding)
    session.commit()
    
    result = find_best_match(session, finding)
    
    assert result is not None
    template, score, method = result
    assert template.id == sql_injection_template.id  # Should prefer exact CWE
    assert method == "exact_cwe"


def test_best_match_falls_back_to_fuzzy(session: Session, sample_project: Project, csrf_template: VulnerabilityTemplate):
    """Test find_best_match falls back to fuzzy when no exact match."""
    finding = Finding(
        project_id=sample_project.id,
        title="Cross-Site Request Forgery",  # Similar to template, but no CWE/CVE
        description="Test description",
        risk_rating="Medium",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    result = find_best_match(session, finding)
    
    assert result is not None
    template, score, method = result
    assert template.id == csrf_template.id
    assert method == "fuzzy_title"
    assert score >= 0.85  # Should be high similarity


def test_best_match_returns_none_for_no_match(session: Session, sample_project: Project):
    """Test find_best_match returns None when no good match exists."""
    finding = Finding(
        project_id=sample_project.id,
        title="Completely Unique Vulnerability Title xyz123",
        description="This should not match anything",
        risk_rating="Low",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    result = find_best_match(session, finding)
    assert result is None


def test_find_all_matches_returns_multiple(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test find_all_matches returns multiple potential matches."""
    # Create another SQL injection variant
    sqli_variant = VulnerabilityTemplate(
        title="SQL Injection Vulnerability",
        description="SQL injection weakness",
        cvss_score=9.0,
        default_risk_rating="Critical",
        remediation="Test remediation",
        source="manual",
        is_verified=True
    )
    session.add(sqli_variant)
    session.commit()
    
    finding = Finding(
        project_id=sample_project.id,
        title="SQL Injection in API",
        description="API endpoint vulnerable to SQL injection",
        risk_rating="Critical",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    
    matches = find_all_matches(session, finding, min_score=0.5)
    
    # Should find both SQL injection templates
    assert len(matches) >= 2
    
    # Verify sorted by score
    for i in range(len(matches) - 1):
        assert matches[i][1] >= matches[i + 1][1]


# ==============================
# Match Persistence Tests
# ==============================

def test_create_vulnerability_match(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test creating a VulnerabilityMatch record."""
    finding = Finding(
        project_id=sample_project.id,
        title="SQL Injection Test",
        description="Test description",
        risk_rating="Critical",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    match = create_vulnerability_match(
        session, finding, sql_injection_template, 0.95, "fuzzy_title", matched_by="test_user"
    )
    
    assert match.id is not None
    assert match.finding_id == finding.id
    assert match.template_id == sql_injection_template.id
    assert match.similarity_score == 0.95
    assert match.match_method == "fuzzy_title"
    assert match.matched_by == "test_user"
    assert match.matched_at is not None


def test_create_vulnerability_match_prevents_duplicates(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test creating duplicate match updates existing record."""
    finding = Finding(
        project_id=sample_project.id,
        title="SQL Injection Test",
        description="Test description",
        risk_rating="Critical",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    # Create first match
    match1 = create_vulnerability_match(
        session, finding, sql_injection_template, 0.80, "fuzzy_title", matched_by="auto"
    )
    match1_id = match1.id
    
    # Create second match (should update existing)
    match2 = create_vulnerability_match(
        session, finding, sql_injection_template, 0.95, "exact_cwe", matched_by="manual"
    )
    
    # Should be same ID (updated, not new)
    assert match2.id == match1_id
    assert match2.similarity_score == 0.95
    assert match2.match_method == "exact_cwe"
    assert match2.matched_by == "manual"
    
    # Verify only one record exists
    all_matches = session.exec(
        select(VulnerabilityMatch).where(VulnerabilityMatch.finding_id == finding.id)
    ).all()
    assert len(all_matches) == 1


def test_auto_match_finding_creates_match(session: Session, sample_project: Project, sql_injection_template: VulnerabilityTemplate):
    """Test auto_match_finding creates VulnerabilityMatch for best match."""
    finding = Finding(
        project_id=sample_project.id,
        title="SQL Injection",
        description="Test description",
        risk_rating="Critical",
        remediation="Test remediation",
        cwe_id="CWE-89"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    match = auto_match_finding(session, finding, matched_by="test_auto")
    
    assert match is not None
    assert match.finding_id == finding.id
    assert match.template_id == sql_injection_template.id
    assert match.similarity_score == 1.0
    assert match.match_method == "exact_cwe"
    assert match.matched_by == "test_auto"


def test_auto_match_finding_returns_none_for_no_match(session: Session, sample_project: Project):
    """Test auto_match_finding returns None when no good match exists."""
    finding = Finding(
        project_id=sample_project.id,
        title="Unique Vulnerability Name xyz999",
        description="No matching template exists",
        risk_rating="Low",
        remediation="Test remediation"
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    match = auto_match_finding(session, finding)
    assert match is None
