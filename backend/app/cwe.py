"""
CWE (Common Weakness Enumeration) Database Integration

Parses CWE XML data from MITRE to create vulnerability templates.

CWE Database Download: https://cwe.mitre.org/data/downloads.html
Latest XML: https://cwe.mitre.org/data/xml/cwec_latest.xml.zip

References:
- CWE List: https://cwe.mitre.org/data/index.html
- XML Schema: https://cwe.mitre.org/data/xsd/cwe_schema_latest.xsd
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)

# CWE XML namespace
CWE_NAMESPACE = {
    'cwe': 'http://cwe.mitre.org/cwe-7'
}


class CWEParseError(Exception):
    """Raised when CWE XML parsing fails."""
    pass


def parse_cwe_xml(xml_content: bytes) -> List[Dict[str, Any]]:
    """
    Parse CWE XML file and extract weakness data.
    
    Args:
        xml_content: Raw XML bytes from CWE database file
    
    Returns:
        List of dictionaries with CWE data ready for VulnerabilityTemplate
    
    Raises:
        CWEParseError: If XML parsing fails
    
    Example:
        >>> with open('cwec_latest.xml', 'rb') as f:
        >>>     xml_data = f.read()
        >>> cwe_list = parse_cwe_xml(xml_data)
        >>> len(cwe_list)
        922  # ~900+ CWE entries
    """
    try:
        # Parse XML with defusedxml for security
        from defusedxml import ElementTree as DefusedET
        root = DefusedET.fromstring(xml_content)
        
        weaknesses = []
        
        # Find all Weakness elements
        # CWE XML structure: <Weakness_Catalog><Weaknesses><Weakness ID="...">
        for weakness in root.findall('.//cwe:Weakness', CWE_NAMESPACE):
            try:
                cwe_data = parse_weakness_element(weakness)
                if cwe_data:
                    weaknesses.append(cwe_data)
            except Exception as e:
                cwe_id = weakness.get('ID', 'unknown')
                logger.warning(f"Failed to parse CWE-{cwe_id}: {str(e)}")
                continue
        
        logger.info(f"Successfully parsed {len(weaknesses)} CWE entries from XML")
        return weaknesses
    
    except ET.ParseError as e:
        raise CWEParseError(f"Failed to parse CWE XML: {str(e)}")
    except Exception as e:
        raise CWEParseError(f"Unexpected error parsing CWE XML: {str(e)}")


def parse_weakness_element(weakness: ET.Element) -> Optional[Dict[str, Any]]:
    """
    Parse a single <Weakness> element into template data.
    
    Args:
        weakness: ElementTree element for a CWE weakness
    
    Returns:
        Dictionary with template fields or None if parsing fails
    """
    cwe_id_num = weakness.get('ID')
    if not cwe_id_num:
        return None
    
    cwe_id = f"CWE-{cwe_id_num}"
    
    # Extract name (required)
    name = weakness.get('Name', '')
    if not name:
        logger.warning(f"{cwe_id} has no name, skipping")
        return None
    
    # Extract abstraction (e.g., "Class", "Base", "Variant", "Compound")
    abstraction = weakness.get('Abstraction', 'Base')
    
    # Extract description
    description = extract_description(weakness)
    
    # Extract extended description (if available)
    extended_desc = extract_extended_description(weakness)
    if extended_desc:
        description = f"{description}\n\n{extended_desc}"
    
    # Extract vulnerability type from abstraction
    vuln_type = map_cwe_abstraction_to_type(abstraction)
    
    # Extract potential mitigations (remediation)
    remediation = extract_mitigations(weakness)
    
    # Extract related weaknesses (for references)
    related_cwes = extract_related_weaknesses(weakness)
    
    # Map to risk rating based on Common Consequences
    risk_rating = extract_risk_rating_from_consequences(weakness)
    
    # Build references URL
    references = f"https://cwe.mitre.org/data/definitions/{cwe_id_num}.html"
    if related_cwes:
        references += f"\n\nRelated CWEs: {', '.join(related_cwes)}"
    
    return {
        'title': f"{name} ({cwe_id})",
        'description': description[:5000],  # Limit to 5000 chars for DB
        'cwe_id': cwe_id,
        'cve_id': None,  # CWE entries don't have CVE IDs
        'vulnerability_type': vuln_type,
        'default_risk_rating': risk_rating,
        'remediation_summary': remediation[:1000] if remediation else f"Apply mitigation strategies for {cwe_id}. See MITRE documentation.",
        'remediation_steps': remediation if remediation else None,
        'references': references,
        'source': 'cwe',
        'is_verified': True,  # MITRE CWE data is authoritative
        'cvss_vector': None,  # CWE doesn't provide CVSS scores
        'cvss_score': None,
        'owasp_likelihood': None,
        'owasp_impact': None,
        'owasp_risk_rating': None,
    }


def extract_description(weakness: ET.Element) -> str:
    """Extract description from <Description> element."""
    desc_elem = weakness.find('.//cwe:Description', CWE_NAMESPACE)
    if desc_elem is not None and desc_elem.text:
        return clean_text(desc_elem.text)
    return "No description available."


def extract_extended_description(weakness: ET.Element) -> Optional[str]:
    """Extract extended description from <Extended_Description> element."""
    ext_desc_elem = weakness.find('.//cwe:Extended_Description', CWE_NAMESPACE)
    if ext_desc_elem is not None:
        # Extended description may contain multiple <xhtml:p> elements
        text_parts = []
        for p in ext_desc_elem.iter():
            if p.text and p.text.strip():
                text_parts.append(clean_text(p.text))
        if text_parts:
            return "\n\n".join(text_parts)
    return None


def extract_mitigations(weakness: ET.Element) -> Optional[str]:
    """Extract mitigation strategies from <Potential_Mitigations> element."""
    mitigations = []
    
    # Find all Mitigation elements
    for mitigation in weakness.findall('.//cwe:Mitigation', CWE_NAMESPACE):
        phase = mitigation.find('.//cwe:Phase', CWE_NAMESPACE)
        description = mitigation.find('.//cwe:Description', CWE_NAMESPACE)
        
        phase_text = clean_text(phase.text) if phase is not None and phase.text else "General"
        desc_text = clean_text(description.text) if description is not None and description.text else ""
        
        if desc_text:
            mitigations.append(f"**{phase_text}**: {desc_text}")
    
    if mitigations:
        return "\n\n".join(mitigations)
    return None


def extract_related_weaknesses(weakness: ET.Element) -> List[str]:
    """Extract related CWE IDs from <Related_Weaknesses> element."""
    related = []
    
    for related_weakness in weakness.findall('.//cwe:Related_Weakness', CWE_NAMESPACE):
        cwe_id = related_weakness.get('CWE_ID')
        nature = related_weakness.get('Nature', 'Related')
        if cwe_id:
            related.append(f"CWE-{cwe_id} ({nature})")
    
    return related


def extract_risk_rating_from_consequences(weakness: ET.Element) -> str:
    """
    Estimate risk rating from Common_Consequences.
    
    CWE consequence impacts: Confidentiality, Integrity, Availability
    Map to our risk ratings: Critical/High/Medium/Low/Informational
    """
    consequences = weakness.findall('.//cwe:Consequence', CWE_NAMESPACE)
    
    if not consequences:
        return "Medium"  # Default if no consequences listed
    
    # Count high-impact consequences
    high_impact_count = 0
    for consequence in consequences:
        for impact in consequence.findall('.//cwe:Impact', CWE_NAMESPACE):
            impact_text = impact.text.strip() if impact.text else ""
            if any(keyword in impact_text.lower() for keyword in ['complete', 'total', 'execute', 'gain']):
                high_impact_count += 1
    
    # Map impact count to risk rating
    if high_impact_count >= 3:
        return "Critical"
    elif high_impact_count >= 2:
        return "High"
    elif high_impact_count >= 1:
        return "Medium"
    else:
        return "Low"


def map_cwe_abstraction_to_type(abstraction: str) -> str:
    """
    Map CWE abstraction level to our vulnerability_type.
    
    CWE Abstractions:
    - Pillar: Very abstract (e.g., CWE-664 Improper Control of Resource)
    - Class: More specific (e.g., CWE-707 Improper Neutralization)
    - Base: Concrete weakness (e.g., CWE-79 XSS)
    - Variant: Specific implementation (e.g., CWE-80 Improper Neutralization of Script)
    - Compound: Multiple weaknesses combined
    """
    type_map = {
        'Pillar': 'Design Flaw',
        'Class': 'Architecture Issue',
        'Base': 'Implementation Flaw',
        'Variant': 'Code-level Issue',
        'Compound': 'Complex Vulnerability',
    }
    return type_map.get(abstraction, 'General Weakness')


def clean_text(text: str) -> str:
    """Clean and normalize text from XML elements."""
    if not text:
        return ""
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove XML artifacts
    text = text.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    
    return text.strip()


def generate_import_statistics(
    total_parsed: int,
    created: int,
    skipped: int,
    errors: int
) -> Dict[str, Any]:
    """
    Generate import statistics for API response.
    
    Args:
        total_parsed: Total CWEs parsed from XML
        created: Number of new templates created
        skipped: Number of CWEs skipped (already exist)
        errors: Number of parsing errors
    
    Returns:
        Statistics dictionary
    """
    return {
        'total_parsed': total_parsed,
        'templates_created': created,
        'templates_skipped': skipped,
        'errors': errors,
        'success_rate': round((created / total_parsed * 100), 2) if total_parsed > 0 else 0,
        'imported_at': datetime.utcnow().isoformat(),
    }
