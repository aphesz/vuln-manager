"""
CVSS 3.1 and OWASP Risk scoring calculators.

This module implements the official CVSS 3.1 scoring formula and OWASP Risk Rating methodology
for vulnerability assessment.

References:
- CVSS 3.1 Specification: https://www.first.org/cvss/specification-document
- CVSS 3.1 Calculator: https://www.first.org/cvss/calculator/3.1
- OWASP Risk Rating: https://owasp.org/www-community/OWASP_Risk_Rating_Methodology
"""

from typing import Dict, Optional, Tuple
import re
import math


# CVSS 3.1 Metric Values
CVSS_METRICS = {
    "AV": {  # Attack Vector
        "N": 0.85,  # Network
        "A": 0.62,  # Adjacent
        "L": 0.55,  # Local
        "P": 0.2,   # Physical
    },
    "AC": {  # Attack Complexity
        "L": 0.77,  # Low
        "H": 0.44,  # High
    },
    "PR": {  # Privileges Required (Unchanged scope)
        "N": 0.85,  # None
        "L": 0.62,  # Low
        "H": 0.27,  # High
    },
    "PR_CHANGED": {  # Privileges Required (Changed scope)
        "N": 0.85,  # None
        "L": 0.68,  # Low
        "H": 0.50,  # High
    },
    "UI": {  # User Interaction
        "N": 0.85,  # None
        "R": 0.62,  # Required
    },
    "S": {  # Scope
        "U": "Unchanged",
        "C": "Changed",
    },
    "C": {  # Confidentiality Impact
        "H": 0.56,  # High
        "L": 0.22,  # Low
        "N": 0.0,   # None
    },
    "I": {  # Integrity Impact
        "H": 0.56,  # High
        "L": 0.22,  # Low
        "N": 0.0,   # None
    },
    "A": {  # Availability Impact
        "H": 0.56,  # High
        "L": 0.22,  # Low
        "N": 0.0,   # None
    },
}


def parse_cvss_vector(vector: str) -> Optional[Dict[str, str]]:
    """
    Parse a CVSS 3.1 vector string into its component metrics.
    
    Args:
        vector: CVSS vector string (e.g., "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N")
    
    Returns:
        Dictionary of metric keys to values, or None if invalid
    
    Examples:
        >>> parse_cvss_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N")
        {'AV': 'N', 'AC': 'L', 'PR': 'N', 'UI': 'R', 'S': 'C', 'C': 'L', 'I': 'L', 'A': 'N'}
    """
    if not vector or not vector.startswith("CVSS:3."):
        return None
    
    # Remove version prefix
    vector = vector.split("/", 1)[1] if "/" in vector else ""
    
    metrics = {}
    parts = vector.split("/")
    
    for part in parts:
        if ":" not in part:
            continue
        key, value = part.split(":", 1)
        metrics[key] = value
    
    # Validate all required metrics are present
    required = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"]
    if not all(m in metrics for m in required):
        return None
    
    return metrics


def calculate_cvss_score(vector: str) -> Optional[Tuple[float, str]]:
    """
    Calculate CVSS 3.1 Base Score using the official formula.
    
    Args:
        vector: CVSS 3.1 vector string
    
    Returns:
        Tuple of (base_score, severity_rating) or None if invalid
    
    Official CVSS 3.1 Formula:
        ISS = 1 - [(1 - C) × (1 - I) × (1 - A)]
        
        If Scope Unchanged:
            Impact = 6.42 × ISS
        
        If Scope Changed:
            Impact = 7.52 × [ISS - 0.029] - 3.25 × [ISS - 0.02]^15
        
        Exploitability = 8.22 × AV × AC × PR × UI
        
        If Impact <= 0:
            BaseScore = 0
        Else if Scope Unchanged:
            BaseScore = Roundup(Minimum[(Impact + Exploitability), 10])
        Else if Scope Changed:
            BaseScore = Roundup(Minimum[1.08 × (Impact + Exploitability), 10])
        
        Where Roundup rounds up to 1 decimal place
    
    Severity Ratings:
        None:     0.0
        Low:      0.1-3.9
        Medium:   4.0-6.9
        High:     7.0-8.9
        Critical: 9.0-10.0
    """
    metrics = parse_cvss_vector(vector)
    if not metrics:
        return None
    
    try:
        # Extract metric values
        av = CVSS_METRICS["AV"][metrics["AV"]]
        ac = CVSS_METRICS["AC"][metrics["AC"]]
        ui = CVSS_METRICS["UI"][metrics["UI"]]
        
        # Privileges Required depends on Scope
        scope = metrics["S"]
        if scope == "C":
            pr = CVSS_METRICS["PR_CHANGED"][metrics["PR"]]
        else:
            pr = CVSS_METRICS["PR"][metrics["PR"]]
        
        # Impact metrics
        c = CVSS_METRICS["C"][metrics["C"]]
        i = CVSS_METRICS["I"][metrics["I"]]
        a = CVSS_METRICS["A"][metrics["A"]]
        
        # Calculate Impact Sub-Score (ISS)
        iss = 1 - ((1 - c) * (1 - i) * (1 - a))
        
        # Calculate Impact based on Scope
        if scope == "U":
            impact = 6.42 * iss
        else:  # Scope Changed
            impact = 7.52 * (iss - 0.029) - 3.25 * math.pow((iss - 0.02), 15)
        
        # Calculate Exploitability
        exploitability = 8.22 * av * ac * pr * ui
        
        # Calculate Base Score
        if impact <= 0:
            base_score = 0.0
        elif scope == "U":
            base_score = min(impact + exploitability, 10.0)
        else:  # Scope Changed
            base_score = min(1.08 * (impact + exploitability), 10.0)
        
        # Round up to 1 decimal place (official CVSS rounding)
        base_score = math.ceil(base_score * 10) / 10
        
        # Determine severity rating
        if base_score == 0.0:
            severity = "None"
        elif base_score < 4.0:
            severity = "Low"
        elif base_score < 7.0:
            severity = "Medium"
        elif base_score < 9.0:
            severity = "High"
        else:
            severity = "Critical"
        
        return (base_score, severity)
    
    except (KeyError, ValueError):
        return None


def calculate_owasp_risk(likelihood: int, impact: int) -> Tuple[int, str]:
    """
    Calculate OWASP Risk Rating using the Likelihood × Impact methodology.
    
    Args:
        likelihood: Likelihood score (1-9)
            1-3: Low likelihood (difficult to exploit, requires special conditions)
            4-6: Medium likelihood (moderately difficult, some skill required)
            7-9: High likelihood (easy to exploit, publicly available tools)
        
        impact: Impact score (1-9)
            1-3: Low impact (limited disclosure, minimal data loss)
            4-6: Medium impact (moderate data loss, some service disruption)
            7-9: High impact (complete system compromise, critical data breach)
    
    Returns:
        Tuple of (risk_score, risk_rating)
    
    Risk Rating Thresholds:
        Critical: >= 18
        High:     12-17
        Medium:   6-11
        Low:      < 6
    
    Examples:
        >>> calculate_owasp_risk(9, 9)
        (81, 'Critical')
        
        >>> calculate_owasp_risk(5, 3)
        (15, 'High')
        
        >>> calculate_owasp_risk(2, 2)
        (4, 'Low')
    """
    # Validate inputs
    if not (1 <= likelihood <= 9):
        raise ValueError("Likelihood must be between 1 and 9")
    if not (1 <= impact <= 9):
        raise ValueError("Impact must be between 1 and 9")
    
    # Calculate risk score
    risk_score = likelihood * impact
    
    # Determine risk rating
    if risk_score >= 18:
        risk_rating = "Critical"
    elif risk_score >= 12:
        risk_rating = "High"
    elif risk_score >= 6:
        risk_rating = "Medium"
    else:
        risk_rating = "Low"
    
    return (risk_score, risk_rating)


def validate_cvss_vector(vector: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a CVSS 3.1 vector string.
    
    Args:
        vector: CVSS vector string to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    
    Examples:
        >>> validate_cvss_vector("CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N")
        (True, None)
        
        >>> validate_cvss_vector("CVSS:2.0/AV:N/AC:L")
        (False, "Vector must start with 'CVSS:3.0' or 'CVSS:3.1'")
    """
    if not vector:
        return (False, "Vector string is empty")
    
    if not vector.startswith("CVSS:3."):
        return (False, "Vector must start with 'CVSS:3.0' or 'CVSS:3.1'")
    
    metrics = parse_cvss_vector(vector)
    if metrics is None:
        return (False, "Missing required metrics (AV, AC, PR, UI, S, C, I, A)")
    
    # Validate each metric value
    validations = [
        ("AV", metrics.get("AV"), ["N", "A", "L", "P"]),
        ("AC", metrics.get("AC"), ["L", "H"]),
        ("PR", metrics.get("PR"), ["N", "L", "H"]),
        ("UI", metrics.get("UI"), ["N", "R"]),
        ("S", metrics.get("S"), ["U", "C"]),
        ("C", metrics.get("C"), ["H", "L", "N"]),
        ("I", metrics.get("I"), ["H", "L", "N"]),
        ("A", metrics.get("A"), ["H", "L", "N"]),
    ]
    
    for metric_name, value, valid_values in validations:
        if value not in valid_values:
            return (False, f"Invalid value '{value}' for metric {metric_name}. Must be one of: {', '.join(valid_values)}")
    
    return (True, None)
