"""
CWE Top 25 Most Dangerous Software Weaknesses (2024)

This module provides functionality to:
1. Track findings against MITRE CWE Top 25 2024
2. Calculate coverage statistics for compliance reporting
3. Prioritize remediation based on industry-critical weaknesses

CWE Top 25: https://cwe.mitre.org/top25/archive/2024/2024_cwe_top25.html
"""

from typing import Dict, List, Optional

# CWE Top 25 Most Dangerous Software Weaknesses 2024
# Source: MITRE CWE Top 25 (2024)
CWE_TOP_25_2024 = {
    1: {
        "cwe_id": 79,
        "name": "Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')",
        "rank": 1,
        "score": 63.72,
        "description": "XSS vulnerabilities allow attackers to inject malicious scripts into web pages",
        "severity": "High"
    },
    2: {
        "cwe_id": 89,
        "name": "Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')",
        "rank": 2,
        "score": 59.85,
        "description": "SQL injection allows attackers to manipulate database queries",
        "severity": "Critical"
    },
    3: {
        "cwe_id": 20,
        "name": "Improper Input Validation",
        "rank": 3,
        "score": 52.07,
        "description": "Failure to properly validate input can lead to various attacks",
        "severity": "High"
    },
    4: {
        "cwe_id": 78,
        "name": "Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')",
        "rank": 4,
        "score": 46.33,
        "description": "OS command injection allows attackers to execute arbitrary commands",
        "severity": "Critical"
    },
    5: {
        "cwe_id": 787,
        "name": "Out-of-bounds Write",
        "rank": 5,
        "score": 43.85,
        "description": "Writing data outside allocated memory boundaries",
        "severity": "Critical"
    },
    6: {
        "cwe_id": 190,
        "name": "Integer Overflow or Wraparound",
        "rank": 6,
        "score": 37.07,
        "description": "Integer overflow can lead to buffer overflows and other issues",
        "severity": "High"
    },
    7: {
        "cwe_id": 352,
        "name": "Cross-Site Request Forgery (CSRF)",
        "rank": 7,
        "score": 36.66,
        "description": "CSRF tricks users into performing unwanted actions",
        "severity": "Medium"
    },
    8: {
        "cwe_id": 22,
        "name": "Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')",
        "rank": 8,
        "score": 35.89,
        "description": "Path traversal allows access to files outside intended directory",
        "severity": "High"
    },
    9: {
        "cwe_id": 434,
        "name": "Unrestricted Upload of File with Dangerous Type",
        "rank": 9,
        "score": 35.54,
        "description": "Unrestricted file upload can lead to code execution",
        "severity": "Critical"
    },
    10: {
        "cwe_id": 862,
        "name": "Missing Authorization",
        "rank": 10,
        "score": 34.39,
        "description": "Missing authorization checks allow unauthorized access",
        "severity": "High"
    },
    11: {
        "cwe_id": 476,
        "name": "NULL Pointer Dereference",
        "rank": 11,
        "score": 33.49,
        "description": "Dereferencing NULL pointers causes crashes and potential exploits",
        "severity": "Medium"
    },
    12: {
        "cwe_id": 287,
        "name": "Improper Authentication",
        "rank": 12,
        "score": 32.61,
        "description": "Weak authentication mechanisms allow unauthorized access",
        "severity": "Critical"
    },
    13: {
        "cwe_id": 798,
        "name": "Use of Hard-coded Credentials",
        "rank": 13,
        "score": 31.95,
        "description": "Hard-coded credentials provide easy access to attackers",
        "severity": "Critical"
    },
    14: {
        "cwe_id": 125,
        "name": "Out-of-bounds Read",
        "rank": 14,
        "score": 31.50,
        "description": "Reading data outside allocated memory boundaries",
        "severity": "High"
    },
    15: {
        "cwe_id": 918,
        "name": "Server-Side Request Forgery (SSRF)",
        "rank": 15,
        "score": 30.87,
        "description": "SSRF allows attackers to make requests from the server",
        "severity": "High"
    },
    16: {
        "cwe_id": 119,
        "name": "Improper Restriction of Operations within the Bounds of a Memory Buffer",
        "rank": 16,
        "score": 29.92,
        "description": "Buffer handling errors can lead to various exploits",
        "severity": "Critical"
    },
    17: {
        "cwe_id": 502,
        "name": "Deserialization of Untrusted Data",
        "rank": 17,
        "score": 28.85,
        "description": "Insecure deserialization can lead to remote code execution",
        "severity": "Critical"
    },
    18: {
        "cwe_id": 77,
        "name": "Improper Neutralization of Special Elements used in a Command ('Command Injection')",
        "rank": 18,
        "score": 27.97,
        "description": "Command injection allows execution of arbitrary commands",
        "severity": "Critical"
    },
    19: {
        "cwe_id": 416,
        "name": "Use After Free",
        "rank": 19,
        "score": 27.43,
        "description": "Using memory after it has been freed can lead to exploits",
        "severity": "Critical"
    },
    20: {
        "cwe_id": 284,
        "name": "Improper Access Control",
        "rank": 20,
        "score": 26.78,
        "description": "Improper access control allows unauthorized actions",
        "severity": "High"
    },
    21: {
        "cwe_id": 835,
        "name": "Loop with Unreachable Exit Condition ('Infinite Loop')",
        "rank": 21,
        "score": 25.99,
        "description": "Infinite loops can cause denial of service",
        "severity": "Medium"
    },
    22: {
        "cwe_id": 732,
        "name": "Incorrect Permission Assignment for Critical Resource",
        "rank": 22,
        "score": 25.43,
        "description": "Incorrect permissions can expose sensitive resources",
        "severity": "High"
    },
    23: {
        "cwe_id": 94,
        "name": "Improper Control of Generation of Code ('Code Injection')",
        "rank": 23,
        "score": 24.87,
        "description": "Code injection allows execution of arbitrary code",
        "severity": "Critical"
    },
    24: {
        "cwe_id": 863,
        "name": "Incorrect Authorization",
        "rank": 24,
        "score": 24.32,
        "description": "Incorrect authorization logic allows unauthorized access",
        "severity": "High"
    },
    25: {
        "cwe_id": 306,
        "name": "Missing Authentication for Critical Function",
        "rank": 25,
        "score": 23.76,
        "description": "Critical functions without authentication are easily exploited",
        "severity": "Critical"
    }
}


def get_cwe_top_25() -> Dict[int, Dict]:
    """
    Get all CWE Top 25 2024 entries.
    
    Returns:
        Dict mapping rank (1-25) to CWE details
    """
    return CWE_TOP_25_2024.copy()


def get_cwe_by_id(cwe_id: int) -> Optional[Dict]:
    """
    Get CWE Top 25 entry by CWE ID.
    
    Args:
        cwe_id: CWE identifier (e.g., 79 for XSS)
    
    Returns:
        CWE details if in Top 25, None otherwise
    """
    for rank, cwe_data in CWE_TOP_25_2024.items():
        if cwe_data["cwe_id"] == cwe_id:
            return cwe_data
    return None


def is_in_top_25(cwe_id: int) -> bool:
    """
    Check if a CWE ID is in the Top 25.
    
    Args:
        cwe_id: CWE identifier
    
    Returns:
        True if CWE is in Top 25, False otherwise
    """
    return get_cwe_by_id(cwe_id) is not None


def get_severity_color(severity: str) -> str:
    """
    Get color code for severity level.
    
    Args:
        severity: Severity level (Critical/High/Medium/Low)
    
    Returns:
        Hex color code
    """
    severity_colors = {
        "Critical": "#d32f2f",  # Red
        "High": "#f57c00",      # Orange
        "Medium": "#fbc02d",    # Yellow
        "Low": "#388e3c"        # Green
    }
    return severity_colors.get(severity, "#757575")  # Gray default


def calculate_top25_statistics(findings_by_cwe: Dict[int, int]) -> Dict:
    """
    Calculate CWE Top 25 coverage statistics.
    
    Args:
        findings_by_cwe: Dict mapping CWE ID to finding count
    
    Returns:
        Dict with coverage statistics
    """
    total_weaknesses = len(CWE_TOP_25_2024)
    weaknesses_found = 0
    total_findings = 0
    critical_count = 0
    high_count = 0
    
    # Count weaknesses found and findings by severity
    for rank, cwe_data in CWE_TOP_25_2024.items():
        cwe_id = cwe_data["cwe_id"]
        count = findings_by_cwe.get(cwe_id, 0)
        
        if count > 0:
            weaknesses_found += 1
            total_findings += count
            
            if cwe_data["severity"] == "Critical":
                critical_count += count
            elif cwe_data["severity"] == "High":
                high_count += count
    
    # Calculate coverage percentage
    coverage_percentage = (weaknesses_found / total_weaknesses) * 100 if total_weaknesses > 0 else 0
    
    # Find most common weakness
    most_common_cwe = None
    max_count = 0
    if findings_by_cwe:
        for cwe_id, count in findings_by_cwe.items():
            if count > max_count and is_in_top_25(cwe_id):
                most_common_cwe = cwe_id
                max_count = count
    
    return {
        "total_weaknesses": total_weaknesses,
        "weaknesses_found": weaknesses_found,
        "weaknesses_not_found": total_weaknesses - weaknesses_found,
        "coverage_percentage": round(coverage_percentage, 1),
        "total_findings": total_findings,
        "critical_findings": critical_count,
        "high_findings": high_count,
        "most_common_cwe_id": most_common_cwe,
        "most_common_cwe_count": max_count,
        "most_common_cwe_name": get_cwe_by_id(most_common_cwe)["name"] if most_common_cwe else None
    }


def get_top_10_by_findings(findings_by_cwe: Dict[int, int]) -> List[Dict]:
    """
    Get top 10 CWE Top 25 entries sorted by finding count.
    
    Args:
        findings_by_cwe: Dict mapping CWE ID to finding count
    
    Returns:
        List of CWE entries with finding counts, sorted by count descending
    """
    results = []
    
    for rank, cwe_data in CWE_TOP_25_2024.items():
        cwe_id = cwe_data["cwe_id"]
        count = findings_by_cwe.get(cwe_id, 0)
        
        results.append({
            **cwe_data,
            "finding_count": count,
            "has_findings": count > 0
        })
    
    # Sort by finding count (descending), then by rank (ascending)
    results.sort(key=lambda x: (-x["finding_count"], x["rank"]))
    
    return results[:10]
