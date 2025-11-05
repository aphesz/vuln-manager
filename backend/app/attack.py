"""
MITRE ATT&CK Integration Module

This module provides functionality for mapping vulnerabilities to MITRE ATT&CK techniques.
For Phase 2B, we use a curated static list of relevant techniques. Future enhancements
could include fetching from the MITRE CTI repository or using AI for automated mapping.
"""

import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Curated list of MITRE ATT&CK techniques relevant to vulnerability management
# Source: MITRE ATT&CK v14 (Enterprise)
ATTACK_TECHNIQUES = [
    # Initial Access
    {
        "technique_id": "T1190",
        "technique_name": "Exploit Public-Facing Application",
        "tactic": "Initial Access",
        "description": "Adversaries may attempt to exploit a weakness in an Internet-facing host or system",
        "keywords": ["web", "public", "internet-facing", "remote", "exploit"]
    },
    {
        "technique_id": "T1133",
        "technique_name": "External Remote Services",
        "tactic": "Initial Access",
        "description": "Adversaries may leverage external-facing remote services to initially access",
        "keywords": ["remote", "vpn", "rdp", "ssh", "external"]
    },
    
    # Execution
    {
        "technique_id": "T1059",
        "technique_name": "Command and Scripting Interpreter",
        "tactic": "Execution",
        "description": "Adversaries may abuse command and script interpreters to execute commands",
        "keywords": ["command", "injection", "script", "shell", "execution", "rce"]
    },
    {
        "technique_id": "T1059.001",
        "technique_name": "PowerShell",
        "tactic": "Execution",
        "description": "Adversaries may abuse PowerShell commands and scripts for execution",
        "keywords": ["powershell", "command", "windows"]
    },
    {
        "technique_id": "T1203",
        "technique_name": "Exploitation for Client Execution",
        "tactic": "Execution",
        "description": "Adversaries may exploit software vulnerabilities in client applications to execute code",
        "keywords": ["client-side", "browser", "exploit"]
    },
    
    # Persistence
    {
        "technique_id": "T1505",
        "technique_name": "Server Software Component",
        "tactic": "Persistence",
        "description": "Adversaries may abuse legitimate extensible development features of servers",
        "keywords": ["web shell", "backdoor", "server", "plugin"]
    },
    {
        "technique_id": "T1505.003",
        "technique_name": "Web Shell",
        "tactic": "Persistence",
        "description": "Adversaries may backdoor web servers with web shells to establish persistent access",
        "keywords": ["web shell", "upload", "backdoor", "php", "asp"]
    },
    
    # Privilege Escalation
    {
        "technique_id": "T1068",
        "technique_name": "Exploitation for Privilege Escalation",
        "tactic": "Privilege Escalation",
        "description": "Adversaries may exploit software vulnerabilities to elevate privileges",
        "keywords": ["privilege", "escalation", "elevation", "root", "admin"]
    },
    
    # Defense Evasion
    {
        "technique_id": "T1222",
        "technique_name": "File and Directory Permissions Modification",
        "tactic": "Defense Evasion",
        "description": "Adversaries may modify file or directory permissions to evade access controls",
        "keywords": ["permissions", "access control", "acl"]
    },
    {
        "technique_id": "T1027",
        "technique_name": "Obfuscated Files or Information",
        "tactic": "Defense Evasion",
        "description": "Adversaries may attempt to make files or information difficult to discover or analyze",
        "keywords": ["obfuscation", "encoding", "encryption"]
    },
    
    # Credential Access
    {
        "technique_id": "T1110",
        "technique_name": "Brute Force",
        "tactic": "Credential Access",
        "description": "Adversaries may use brute force techniques to gain access to accounts",
        "keywords": ["brute force", "password", "authentication", "login"]
    },
    {
        "technique_id": "T1557",
        "technique_name": "Adversary-in-the-Middle",
        "tactic": "Credential Access",
        "description": "Adversaries may attempt to position themselves between two or more networked devices",
        "keywords": ["mitm", "man-in-the-middle", "interception", "ssl", "tls"]
    },
    {
        "technique_id": "T1212",
        "technique_name": "Exploitation for Credential Access",
        "tactic": "Credential Access",
        "description": "Adversaries may exploit software vulnerabilities to steal credentials",
        "keywords": ["credential", "password", "token", "session"]
    },
    
    # Discovery
    {
        "technique_id": "T1083",
        "technique_name": "File and Directory Discovery",
        "tactic": "Discovery",
        "description": "Adversaries may enumerate files and directories",
        "keywords": ["directory listing", "traversal", "path", "lfi"]
    },
    {
        "technique_id": "T1046",
        "technique_name": "Network Service Discovery",
        "tactic": "Discovery",
        "description": "Adversaries may attempt to get a listing of services running on remote hosts",
        "keywords": ["port scan", "service", "enumeration"]
    },
    
    # Lateral Movement
    {
        "technique_id": "T1210",
        "technique_name": "Exploitation of Remote Services",
        "tactic": "Lateral Movement",
        "description": "Adversaries may exploit remote services to gain unauthorized access to internal systems",
        "keywords": ["remote", "lateral", "pivot", "exploit"]
    },
    
    # Collection
    {
        "technique_id": "T1005",
        "technique_name": "Data from Local System",
        "tactic": "Collection",
        "description": "Adversaries may search local system sources to find files of interest",
        "keywords": ["data", "file", "exfiltration", "sensitive"]
    },
    {
        "technique_id": "T1213",
        "technique_name": "Data from Information Repositories",
        "tactic": "Collection",
        "description": "Adversaries may leverage information repositories to mine valuable information",
        "keywords": ["database", "repository", "sqli", "sql injection"]
    },
    
    # Exfiltration
    {
        "technique_id": "T1041",
        "technique_name": "Exfiltration Over C2 Channel",
        "tactic": "Exfiltration",
        "description": "Adversaries may steal data by exfiltrating it over an existing command and control channel",
        "keywords": ["exfiltration", "data", "c2", "command"]
    },
    
    # Impact
    {
        "technique_id": "T1499",
        "technique_name": "Endpoint Denial of Service",
        "tactic": "Impact",
        "description": "Adversaries may perform Endpoint Denial of Service attacks to degrade or block availability",
        "keywords": ["dos", "denial of service", "availability"]
    },
    {
        "technique_id": "T1565",
        "technique_name": "Data Manipulation",
        "tactic": "Impact",
        "description": "Adversaries may insert, delete, or manipulate data to influence decisions or disrupt operations",
        "keywords": ["manipulation", "integrity", "tamper", "modify"]
    },
]


def get_all_techniques() -> List[Dict[str, Any]]:
    """
    Get all available ATT&CK techniques.
    
    Returns:
        List of technique dictionaries with id, name, tactic, description
    """
    return ATTACK_TECHNIQUES


def search_techniques(query: str) -> List[Dict[str, Any]]:
    """
    Search for ATT&CK techniques by keyword.
    
    Args:
        query: Search string (technique name, ID, or keyword)
    
    Returns:
        List of matching techniques
    """
    query_lower = query.lower().strip()
    
    if not query_lower:
        return ATTACK_TECHNIQUES
    
    results = []
    for tech in ATTACK_TECHNIQUES:
        # Search in technique ID
        if query_lower in tech['technique_id'].lower():
            results.append(tech)
            continue
        
        # Search in technique name
        if query_lower in tech['technique_name'].lower():
            results.append(tech)
            continue
        
        # Search in tactic
        if query_lower in tech['tactic'].lower():
            results.append(tech)
            continue
        
        # Search in description
        if query_lower in tech['description'].lower():
            results.append(tech)
            continue
        
        # Search in keywords
        if any(query_lower in kw.lower() for kw in tech['keywords']):
            results.append(tech)
            continue
    
    return results


def suggest_techniques(
    description: str = None,
    cwe_id: str = None,
    vulnerability_type: str = None
) -> List[Dict[str, Any]]:
    """
    Suggest ATT&CK techniques based on vulnerability characteristics.
    
    Args:
        description: Vulnerability description
        cwe_id: CWE identifier (e.g., "CWE-79")
        vulnerability_type: Type of vulnerability (e.g., "XSS", "SQLi")
    
    Returns:
        List of suggested techniques with relevance scores
    """
    suggestions = []
    
    # Combine search terms
    search_terms = []
    
    if description:
        search_terms.extend(description.lower().split())
    
    if cwe_id:
        # Map common CWEs to keywords
        cwe_keywords = {
            "CWE-79": ["xss", "script", "injection"],
            "CWE-89": ["sql", "injection", "database"],
            "CWE-78": ["command", "injection", "os"],
            "CWE-22": ["path", "traversal", "directory"],
            "CWE-434": ["upload", "file"],
            "CWE-352": ["csrf", "cross-site request"],
            "CWE-306": ["authentication", "bypass"],
            "CWE-307": ["brute force", "authentication"],
            "CWE-20": ["input validation", "injection"],
        }
        if cwe_id in cwe_keywords:
            search_terms.extend(cwe_keywords[cwe_id])
    
    if vulnerability_type:
        search_terms.append(vulnerability_type.lower())
    
    # Score each technique based on keyword matches
    for tech in ATTACK_TECHNIQUES:
        score = 0
        matches = []
        
        # Check each search term against technique keywords
        for term in search_terms:
            if not term or len(term) < 3:
                continue
            
            for keyword in tech['keywords']:
                if term in keyword.lower() or keyword.lower() in term:
                    score += 1
                    matches.append(keyword)
                    break
        
        if score > 0:
            suggestions.append({
                **tech,
                'relevance_score': score,
                'matched_keywords': list(set(matches))
            })
    
    # Sort by relevance score (highest first)
    suggestions.sort(key=lambda x: x['relevance_score'], reverse=True)
    
    # Return top 10 suggestions
    return suggestions[:10]


def format_techniques_for_storage(techniques: List[Dict[str, Any]]) -> str:
    """
    Format techniques for storage in database as JSON string.
    
    Args:
        techniques: List of technique dictionaries
    
    Returns:
        JSON string
    """
    # Store only essential fields
    storage_format = [
        {
            'technique_id': t['technique_id'],
            'technique_name': t['technique_name'],
            'tactic': t['tactic']
        }
        for t in techniques
    ]
    
    return json.dumps(storage_format)


def parse_techniques_from_storage(techniques_json: str) -> List[Dict[str, Any]]:
    """
    Parse techniques from database JSON string.
    
    Args:
        techniques_json: JSON string from database
    
    Returns:
        List of technique dictionaries with full details
    """
    if not techniques_json:
        return []
    
    try:
        stored = json.loads(techniques_json)
        
        # Enrich with full details from our technique database
        enriched = []
        for stored_tech in stored:
            # Find full technique details
            full_tech = next(
                (t for t in ATTACK_TECHNIQUES if t['technique_id'] == stored_tech['technique_id']),
                None
            )
            
            if full_tech:
                enriched.append(full_tech)
            else:
                # Technique not in our database, return stored version
                enriched.append(stored_tech)
        
        return enriched
    
    except json.JSONDecodeError:
        logger.error(f"Failed to parse ATT&CK techniques JSON: {techniques_json}")
        return []
