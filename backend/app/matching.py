"""
Vulnerability Template Matching Engine

Implements tiered matching strategy for linking findings to vulnerability templates:
- Tier 1 (Exact): CWE/CVE exact matching
- Tier 2 (Fuzzy): Fuzzy string matching on title/description
- Tier 3 (Semantic): AI embeddings (future enhancement)

References:
- v0.7.0 Phase 1: Enhanced Matching Engine
- VulnerabilityMatch model: backend/app/models.py
"""

from typing import List, Dict, Optional, Tuple
from sqlmodel import Session, select
from rapidfuzz import fuzz
from datetime import datetime

from app.models import Finding, VulnerabilityTemplate, VulnerabilityMatch


# ==============================
# Configuration Constants
# ==============================

# Similarity score thresholds (0-100 scale)
EXACT_MATCH_THRESHOLD = 100  # Perfect match (CWE/CVE exact)
FUZZY_HIGH_THRESHOLD = 85    # Very likely match (title fuzzy)
FUZZY_MEDIUM_THRESHOLD = 70  # Possible match (description fuzzy)
FUZZY_LOW_THRESHOLD = 60     # Weak match (below this, reject)

# Match method identifiers (stored in VulnerabilityMatch.match_method)
MATCH_METHOD_EXACT_CWE = "exact_cwe"
MATCH_METHOD_EXACT_CVE = "exact_cve"
MATCH_METHOD_FUZZY_TITLE = "fuzzy_title"
MATCH_METHOD_FUZZY_DESC = "fuzzy_description"
MATCH_METHOD_AI_EMBEDDING = "ai_embedding"  # Future


# ==============================
# Tier 1: Exact Matching
# ==============================
# Note: Finding model does not have cwe_id or cve_id fields.
# Those fields only exist on VulnerabilityTemplate.
# Exact matching would require parsing CWE/CVE from finding title/description,
# which is implemented in the upload parsers (parsers.py).
# For now, we skip Tier 1 and rely on Tier 2 (fuzzy) matching.


# ==============================
# Tier 2: Fuzzy Matching
# ==============================

def find_fuzzy_title_matches(
    session: Session, finding: Finding, limit: int = 5
) -> List[Tuple[VulnerabilityTemplate, float, str]]:
    """
    Find templates by fuzzy title matching.
    
    Uses rapidfuzz token_sort_ratio for order-independent matching:
    - "SQL Injection in Login Form" matches "Login Form SQL Injection"
    - Handles case differences, punctuation variations
    
    Args:
        session: Database session
        finding: Finding to match
        limit: Maximum number of matches to return
    
    Returns:
        List of (template, similarity_score, "fuzzy_title") sorted by score desc
    """
    if not finding.title or len(finding.title) < 3:
        return []
    
    # Fetch all templates (optimize later with search index)
    statement = select(VulnerabilityTemplate)
    all_templates = session.exec(statement).all()
    
    matches = []
    for template in all_templates:
        if not template.title:
            continue
        
        # Token sort ratio: "SQL Injection" vs "Injection SQL" → 100
        # Regular ratio: "SQL Injection" vs "Injection SQL" → ~70
        similarity = fuzz.token_sort_ratio(
            finding.title.lower(),
            template.title.lower()
        )
        
        # Convert 0-100 to 0.0-1.0
        similarity_score = similarity / 100.0
        
        if similarity >= FUZZY_LOW_THRESHOLD:
            matches.append((template, similarity_score, MATCH_METHOD_FUZZY_TITLE))
    
    # Sort by similarity desc, return top N
    matches.sort(key=lambda x: x[1], reverse=True)
    return matches[:limit]


def find_fuzzy_description_matches(
    session: Session, finding: Finding, limit: int = 5
) -> List[Tuple[VulnerabilityTemplate, float, str]]:
    """
    Find templates by fuzzy description matching.
    
    Uses partial_ratio for substring matching:
    - Useful when finding description is verbose but template is concise
    - "This app has SQL injection in login" → "SQL injection vulnerability"
    
    Args:
        session: Database session
        finding: Finding to match
        limit: Maximum number of matches to return
    
    Returns:
        List of (template, similarity_score, "fuzzy_description") sorted by score desc
    """
    if not finding.description or len(finding.description) < 10:
        return []
    
    statement = select(VulnerabilityTemplate)
    all_templates = session.exec(statement).all()
    
    matches = []
    for template in all_templates:
        if not template.description:
            continue
        
        # Partial ratio: best substring match
        similarity = fuzz.partial_ratio(
            finding.description.lower(),
            template.description.lower()
        )
        
        similarity_score = similarity / 100.0
        
        if similarity >= FUZZY_LOW_THRESHOLD:
            matches.append((template, similarity_score, MATCH_METHOD_FUZZY_DESC))
    
    matches.sort(key=lambda x: x[1], reverse=True)
    return matches[:limit]


# ==============================
# Tiered Matching Orchestrator
# ==============================

def find_best_match(
    session: Session, finding: Finding
) -> Optional[Tuple[VulnerabilityTemplate, float, str]]:
    """
    Find the best matching template using tiered fallback strategy.
    
    Strategy:
    1. Tier 2 (Fuzzy): Try Title → Description
    2. Tier 3 (Semantic): AI embeddings (future)
    
    Note: Tier 1 (Exact CWE/CVE) skipped because Finding model lacks cwe_id/cve_id fields.
    
    Args:
        session: Database session
        finding: Finding to match
    
    Returns:
        (template, similarity_score, match_method) or None
    
    Examples:
        >>> # Fuzzy title match
        >>> find_best_match(session, finding_xss)
        (template_xss, 0.87, "fuzzy_title")
    """
    # Tier 2: Fuzzy Title (take best match if above high threshold)
    fuzzy_title_matches = find_fuzzy_title_matches(session, finding, limit=1)
    if fuzzy_title_matches:
        template, score, method = fuzzy_title_matches[0]
        if score >= FUZZY_HIGH_THRESHOLD / 100.0:
            return (template, score, method)
    
    # Tier 2: Fuzzy Description (fallback if title weak)
    fuzzy_desc_matches = find_fuzzy_description_matches(session, finding, limit=1)
    if fuzzy_desc_matches:
        template, score, method = fuzzy_desc_matches[0]
        if score >= FUZZY_MEDIUM_THRESHOLD / 100.0:
            return (template, score, method)
    
    # No confident match found
    return None


def find_all_matches(
    session: Session, finding: Finding, min_score: float = 0.6
) -> List[Tuple[VulnerabilityTemplate, float, str]]:
    """
    Find ALL potential matching templates across all tiers.
    
    Useful for:
    - Manual review UI (show user multiple options)
    - Analytics (how many matches per finding?)
    - Confidence scoring (1 match vs 10 matches)
    
    Args:
        session: Database session
        finding: Finding to match
        min_score: Minimum similarity threshold (0.0-1.0)
    
    Returns:
        List of (template, similarity_score, match_method) sorted by score desc
    """
    all_matches = []
    
    # Tier 2: Fuzzy matches
    title_matches = find_fuzzy_title_matches(session, finding, limit=10)
    all_matches.extend(title_matches)
    
    desc_matches = find_fuzzy_description_matches(session, finding, limit=10)
    all_matches.extend(desc_matches)
    
    # Filter by min_score and deduplicate
    seen_template_ids = set()
    unique_matches = []
    
    for template, score, method in all_matches:
        if score >= min_score and template.id not in seen_template_ids:
            unique_matches.append((template, score, method))
            seen_template_ids.add(template.id)
    
    # Sort by score desc
    unique_matches.sort(key=lambda x: x[1], reverse=True)
    return unique_matches


# ==============================
# Match Persistence
# ==============================

def create_vulnerability_match(
    session: Session,
    finding: Finding,
    template: VulnerabilityTemplate,
    similarity_score: float,
    match_method: str,
    matched_by: str = "auto"
) -> VulnerabilityMatch:
    """
    Create and persist a VulnerabilityMatch record.
    
    Args:
        session: Database session
        finding: Finding being matched
        template: Template to link
        similarity_score: Confidence score (0.0-1.0)
        match_method: How match was found (exact_cwe, fuzzy_title, etc.)
        matched_by: Who/what created the match (default "auto")
    
    Returns:
        Created VulnerabilityMatch instance
    """
    # Check if match already exists
    existing = session.exec(
        select(VulnerabilityMatch).where(
            VulnerabilityMatch.finding_id == finding.id,
            VulnerabilityMatch.template_id == template.id
        )
    ).first()
    
    if existing:
        # Update existing match
        existing.similarity_score = similarity_score
        existing.match_method = match_method
        existing.matched_at = datetime.utcnow()
        existing.matched_by = matched_by
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    
    # Create new match
    match = VulnerabilityMatch(
        finding_id=finding.id,
        template_id=template.id,
        similarity_score=similarity_score,
        match_method=match_method,
        matched_at=datetime.utcnow(),
        matched_by=matched_by
    )
    session.add(match)
    session.commit()
    session.refresh(match)
    return match


def auto_match_finding(
    session: Session, finding: Finding, matched_by: str = "auto"
) -> Optional[VulnerabilityMatch]:
    """
    Automatically match a finding to the best template and create VulnerabilityMatch.
    
    Args:
        session: Database session
        finding: Finding to match
        matched_by: Who triggered the match (default "auto")
    
    Returns:
        Created VulnerabilityMatch if match found, else None
    """
    match_result = find_best_match(session, finding)
    if not match_result:
        return None
    
    template, score, method = match_result
    return create_vulnerability_match(
        session, finding, template, score, method, matched_by
    )
