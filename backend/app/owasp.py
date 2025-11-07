"""
OWASP Top 10 2021 Mapping Module

This module provides functionality to:
1. Map vulnerabilities to OWASP Top 10 2021 categories
2. Auto-detect OWASP category from CWE, title, or description
3. Calculate coverage statistics for compliance reporting

OWASP Top 10 2021: https://owasp.org/Top10/
"""

from typing import Dict, List, Optional, Tuple
import re

# OWASP Top 10 2021 Categories with CWE mappings
OWASP_TOP_10_2021 = {
    "A01": {
        "name": "Broken Access Control",
        "description": "Restrictions on what authenticated users are allowed to do not properly enforced",
        "cwes": [
            22, 23, 35, 59, 200, 201, 219, 264, 275, 276, 284, 285, 
            352, 359, 377, 402, 425, 432, 434, 443, 451, 639, 651, 
            668, 706, 862, 863, 913, 922, 1275
        ],
        "keywords": [
            "access control", "authorization", "permission", "privilege escalation",
            "path traversal", "directory traversal", "forceful browsing",
            "insecure direct object reference", "idor", "missing authorization"
        ]
    },
    "A02": {
        "name": "Cryptographic Failures",
        "description": "Failures related to cryptography which often leads to sensitive data exposure",
        "cwes": [
            261, 296, 310, 319, 321, 322, 323, 324, 325, 326, 327, 
            328, 329, 330, 331, 335, 336, 337, 338, 340, 347, 523, 
            720, 757, 759, 760, 780, 818, 916
        ],
        "keywords": [
            "encryption", "cryptography", "weak cipher", "sensitive data exposure",
            "ssl", "tls", "https", "plaintext", "cleartext", "hashing",
            "weak algorithm", "md5", "sha1", "des", "rc4"
        ]
    },
    "A03": {
        "name": "Injection",
        "description": "User-supplied data not validated, filtered, or sanitized by application",
        "cwes": [
            20, 74, 75, 77, 78, 79, 80, 83, 87, 88, 89, 90, 91, 93, 
            94, 95, 96, 97, 98, 99, 113, 116, 138, 184, 470, 564, 
            610, 643, 644, 652, 917
        ],
        "keywords": [
            "sql injection", "sqli", "xss", "cross-site scripting",
            "command injection", "os command", "ldap injection",
            "xpath injection", "xml injection", "code injection",
            "script injection", "template injection", "ssti", "nosql injection"
        ]
    },
    "A04": {
        "name": "Insecure Design",
        "description": "Missing or ineffective control design",
        "cwes": [
            73, 183, 209, 213, 235, 256, 257, 258, 259, 266, 269, 
            280, 311, 312, 313, 316, 419, 430, 434, 444, 451, 472, 
            501, 522, 525, 539, 579, 598, 602, 642, 646, 650, 653, 
            656, 657, 799, 807, 840, 841, 927, 1021, 1173
        ],
        "keywords": [
            "insecure design", "threat model", "security requirement",
            "business logic", "rate limiting", "resource exhaustion",
            "missing security control", "architecture"
        ]
    },
    "A05": {
        "name": "Security Misconfiguration",
        "description": "Missing appropriate security hardening or improperly configured permissions",
        "cwes": [
            2, 11, 13, 15, 16, 260, 315, 520, 526, 537, 541, 547, 
            611, 614, 756, 776, 942, 1004, 1032, 1174
        ],
        "keywords": [
            "misconfiguration", "default password", "default credentials",
            "directory listing", "exposed", "information disclosure",
            "verbose error", "stack trace", "debug mode", "unnecessary service",
            "cors", "csp", "security header", "hardening"
        ]
    },
    "A06": {
        "name": "Vulnerable and Outdated Components",
        "description": "Using components with known vulnerabilities",
        "cwes": [1035, 1104],
        "keywords": [
            "outdated", "vulnerable component", "old version", "deprecated",
            "known vulnerability", "cve", "unmaintained", "unsupported",
            "end of life", "eol", "patch available", "library", "dependency"
        ]
    },
    "A07": {
        "name": "Identification and Authentication Failures",
        "description": "Confirmation of user's identity, authentication, and session management",
        "cwes": [
            255, 259, 287, 288, 289, 290, 291, 294, 295, 297, 300, 
            302, 304, 306, 307, 346, 384, 521, 523, 620, 640, 798, 
            940, 1216
        ],
        "keywords": [
            "authentication", "session", "login", "password", "credential",
            "weak password", "brute force", "session fixation",
            "session hijacking", "remember me", "account lockout",
            "multi-factor", "mfa", "2fa", "jwt", "token"
        ]
    },
    "A08": {
        "name": "Software and Data Integrity Failures",
        "description": "Code and infrastructure that does not protect against integrity violations",
        "cwes": [
            345, 353, 426, 494, 502, 565, 784, 829, 830, 915
        ],
        "keywords": [
            "integrity", "deserialization", "insecure deserialization",
            "tamper", "ci/cd", "auto-update", "plugin", "unsigned",
            "untrusted data", "serialization", "pickle", "yaml", "json"
        ]
    },
    "A09": {
        "name": "Security Logging and Monitoring Failures",
        "description": "Without logging and monitoring, breaches cannot be detected",
        "cwes": [
            117, 223, 532, 778
        ],
        "keywords": [
            "logging", "monitoring", "audit", "log", "detection",
            "alerting", "no logging", "insufficient logging",
            "log injection", "sensitive data in logs"
        ]
    },
    "A10": {
        "name": "Server-Side Request Forgery (SSRF)",
        "description": "Web application fetches remote resource without validating user-supplied URL",
        "cwes": [918],
        "keywords": [
            "ssrf", "server-side request forgery", "url injection",
            "remote file inclusion", "rfi", "internal network access",
            "port scanning", "localhost", "127.0.0.1", "metadata"
        ]
    }
}


def get_owasp_categories() -> Dict[str, Dict]:
    """
    Get all OWASP Top 10 2021 categories with metadata.
    
    Returns:
        Dict mapping category ID (A01-A10) to category details
    """
    return OWASP_TOP_10_2021.copy()


def detect_owasp_category(
    title: Optional[str] = None,
    description: Optional[str] = None,
    cwe_id: Optional[int] = None,
    vulnerability_type: Optional[str] = None
) -> Optional[str]:
    """
    Auto-detect OWASP Top 10 2021 category for a vulnerability.
    
    Priority:
    1. CWE ID mapping (most reliable)
    2. Vulnerability type keyword matching
    3. Title keyword matching
    4. Description keyword matching
    
    Args:
        title: Vulnerability title
        description: Vulnerability description
        cwe_id: CWE identifier (e.g., 79 for XSS)
        vulnerability_type: Type string (e.g., "XSS", "SQLi")
    
    Returns:
        OWASP category ID (A01-A10) or None if no match
    """
    # Priority 1: Direct CWE mapping
    if cwe_id:
        for category_id, category_data in OWASP_TOP_10_2021.items():
            if cwe_id in category_data["cwes"]:
                return category_id
    
    # Prepare search text (lowercase for case-insensitive matching)
    search_texts = []
    if vulnerability_type:
        search_texts.append(vulnerability_type.lower())
    if title:
        search_texts.append(title.lower())
    if description:
        search_texts.append(description.lower())
    
    combined_text = " ".join(search_texts)
    
    # Priority 2-4: Keyword matching (check all categories, return first match)
    # We use a scoring system to find the best match
    category_scores: Dict[str, int] = {}
    
    for category_id, category_data in OWASP_TOP_10_2021.items():
        score = 0
        for keyword in category_data["keywords"]:
            # Count occurrences of each keyword
            keyword_lower = keyword.lower()
            if keyword_lower in combined_text:
                # Give higher score for exact matches in vulnerability_type or title
                if vulnerability_type and keyword_lower in vulnerability_type.lower():
                    score += 10
                elif title and keyword_lower in title.lower():
                    score += 5
                else:
                    score += 1
        
        if score > 0:
            category_scores[category_id] = score
    
    # Return category with highest score
    if category_scores:
        best_match = max(category_scores.items(), key=lambda x: x[1])
        return best_match[0]
    
    return None


def extract_cwe_from_text(text: str) -> Optional[int]:
    """
    Extract CWE ID from text (e.g., "CWE-79" -> 79).
    
    Args:
        text: Text to search for CWE patterns
    
    Returns:
        CWE ID as integer, or None if not found
    """
    if not text:
        return None
    
    # Match patterns like "CWE-79", "CWE 79", "cwe-79"
    cwe_pattern = r'CWE[:\s-]+(\d+)'
    match = re.search(cwe_pattern, text, re.IGNORECASE)
    
    if match:
        return int(match.group(1))
    
    return None


def get_category_description(category_id: str) -> Optional[Dict]:
    """
    Get detailed information about an OWASP category.
    
    Args:
        category_id: OWASP category ID (A01-A10)
    
    Returns:
        Dictionary with category details, or None if invalid ID
    """
    return OWASP_TOP_10_2021.get(category_id)


def calculate_coverage_statistics(findings_by_category: Dict[str, int]) -> Dict:
    """
    Calculate OWASP Top 10 coverage statistics.
    
    Args:
        findings_by_category: Dict mapping category ID to finding count
    
    Returns:
        Dict with coverage statistics
    """
    total_categories = len(OWASP_TOP_10_2021)
    categories_with_findings = sum(1 for count in findings_by_category.values() if count > 0)
    total_findings = sum(findings_by_category.values())
    
    # Calculate coverage percentage
    coverage_percentage = (categories_with_findings / total_categories) * 100 if total_categories > 0 else 0
    
    # Find most common category
    most_common_category = None
    max_count = 0
    if findings_by_category:
        most_common_category = max(findings_by_category.items(), key=lambda x: x[1])[0]
        max_count = findings_by_category[most_common_category]
    
    return {
        "total_categories": total_categories,
        "categories_with_findings": categories_with_findings,
        "categories_without_findings": total_categories - categories_with_findings,
        "coverage_percentage": round(coverage_percentage, 1),
        "total_findings": total_findings,
        "most_common_category": most_common_category,
        "most_common_category_count": max_count
    }
