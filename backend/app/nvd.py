"""
NVD (National Vulnerability Database) API Integration

Fetches official CVE data from NIST NVD API 2.0 to enrich vulnerability templates.

API Documentation: https://nvd.nist.gov/developers/vulnerabilities
Rate Limits: 5 requests per 30 seconds (no API key), 50 per 30 seconds (with key)

References:
- NVD API 2.0: https://nvd.nist.gov/developers/vulnerabilities
- CVSS 3.1 Spec: https://www.first.org/cvss/v3.1/specification-document
"""

import httpx
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import asyncio

logger = logging.getLogger(__name__)

# NVD API Configuration
NVD_API_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
NVD_REQUEST_TIMEOUT = 30  # seconds
NVD_RATE_LIMIT_DELAY = 6  # seconds between requests (safe for no API key)

# Cache to avoid hammering NVD API
_nvd_cache: Dict[str, Dict[str, Any]] = {}
_cache_ttl = timedelta(hours=24)  # Cache for 24 hours


class NVDAPIError(Exception):
    """Raised when NVD API request fails."""
    pass


async def fetch_cve_data(cve_id: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
    """
    Fetch CVE data from NVD API 2.0.
    
    Args:
        cve_id: CVE identifier (e.g., "CVE-2024-1234")
        use_cache: Whether to use cached data if available
    
    Returns:
        Dictionary with CVE data or None if not found
    
    Example:
        >>> data = await fetch_cve_data("CVE-2021-44228")  # Log4Shell
        >>> data['description']
        "Apache Log4j2 2.0-beta9 through 2.15.0..."
    """
    # Validate CVE format
    if not cve_id or not cve_id.upper().startswith("CVE-"):
        logger.warning(f"Invalid CVE ID format: {cve_id}")
        return None
    
    cve_id = cve_id.upper()
    
    # Check cache
    if use_cache and cve_id in _nvd_cache:
        cached_entry = _nvd_cache[cve_id]
        if datetime.utcnow() - cached_entry['cached_at'] < _cache_ttl:
            logger.info(f"Using cached data for {cve_id}")
            return cached_entry['data']
    
    # Fetch from NVD API
    try:
        async with httpx.AsyncClient(timeout=NVD_REQUEST_TIMEOUT) as client:
            url = f"{NVD_API_BASE_URL}"
            params = {"cveId": cve_id}
            
            logger.info(f"Fetching CVE data from NVD: {cve_id}")
            response = await client.get(url, params=params)
            
            if response.status_code == 404:
                logger.warning(f"CVE not found in NVD: {cve_id}")
                return None
            
            if response.status_code != 200:
                raise NVDAPIError(
                    f"NVD API returned {response.status_code}: {response.text}"
                )
            
            data = response.json()
            
            # NVD API 2.0 response format
            if 'vulnerabilities' not in data or len(data['vulnerabilities']) == 0:
                logger.warning(f"No vulnerability data for {cve_id}")
                return None
            
            # Extract first (and should be only) vulnerability
            vuln_data = data['vulnerabilities'][0]['cve']
            
            # Parse into our format
            parsed = parse_nvd_vulnerability(vuln_data)
            
            # Cache result
            _nvd_cache[cve_id] = {
                'data': parsed,
                'cached_at': datetime.utcnow()
            }
            
            # Rate limiting (be nice to NVD)
            await asyncio.sleep(NVD_RATE_LIMIT_DELAY)
            
            return parsed
    
    except httpx.TimeoutException:
        raise NVDAPIError(f"NVD API timeout for {cve_id}")
    except httpx.RequestError as e:
        raise NVDAPIError(f"NVD API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching CVE data: {str(e)}")
        raise NVDAPIError(f"Unexpected error: {str(e)}")


def parse_nvd_vulnerability(vuln_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse NVD API 2.0 vulnerability data into our template format.
    
    Args:
        vuln_data: Raw CVE data from NVD API
    
    Returns:
        Parsed data ready for VulnerabilityTemplate
    """
    result = {
        'cve_id': vuln_data.get('id'),
        'description': None,
        'cvss_score': None,
        'cvss_vector': None,
        'severity': None,
        'cwe_ids': [],
        'references': [],
        'published_date': None,
        'last_modified': None,
    }
    
    # Extract description (prefer English)
    descriptions = vuln_data.get('descriptions', [])
    for desc in descriptions:
        if desc.get('lang') == 'en':
            result['description'] = desc.get('value')
            break
    
    # Extract CVSS 3.1 metrics (prefer CVSS v3.1 over v3.0 over v2.0)
    metrics = vuln_data.get('metrics', {})
    
    # Try CVSS v3.1 first
    cvss_v31 = metrics.get('cvssMetricV31', [])
    if cvss_v31:
        cvss_data = cvss_v31[0].get('cvssData', {})
        result['cvss_score'] = cvss_data.get('baseScore')
        result['cvss_vector'] = cvss_data.get('vectorString')
        result['severity'] = cvss_data.get('baseSeverity', '').upper()
    else:
        # Fallback to CVSS v3.0
        cvss_v30 = metrics.get('cvssMetricV30', [])
        if cvss_v30:
            cvss_data = cvss_v30[0].get('cvssData', {})
            result['cvss_score'] = cvss_data.get('baseScore')
            result['cvss_vector'] = cvss_data.get('vectorString')
            result['severity'] = cvss_data.get('baseSeverity', '').upper()
    
    # Extract CWE IDs
    weaknesses = vuln_data.get('weaknesses', [])
    for weakness in weaknesses:
        for desc in weakness.get('description', []):
            cwe_value = desc.get('value', '')
            if cwe_value.startswith('CWE-'):
                result['cwe_ids'].append(cwe_value)
    
    # Take first CWE as primary
    if result['cwe_ids']:
        result['primary_cwe'] = result['cwe_ids'][0]
    
    # Extract references
    references = vuln_data.get('references', [])
    result['references'] = [ref.get('url') for ref in references if ref.get('url')]
    
    # Extract dates
    result['published_date'] = vuln_data.get('published')
    result['last_modified'] = vuln_data.get('lastModified')
    
    return result


def map_cvss_severity_to_risk_rating(severity: str) -> str:
    """
    Map CVSS severity to our RiskRating enum.
    
    NVD Severity:    Our Risk Rating:
    - CRITICAL    →  Critical
    - HIGH        →  High
    - MEDIUM      →  Medium
    - LOW         →  Low
    - NONE        →  Informational
    """
    severity_map = {
        'CRITICAL': 'Critical',
        'HIGH': 'High',
        'MEDIUM': 'Medium',
        'LOW': 'Low',
        'NONE': 'Informational',
    }
    return severity_map.get(severity.upper(), 'Medium')


def generate_remediation_summary(cve_id: str, description: str) -> str:
    """
    Generate basic remediation summary from CVE data.
    
    This is a placeholder - in production you might want to:
    1. Use AI to generate remediation from description
    2. Pull from vendor advisories
    3. Use CWE-based remediation templates
    """
    return (
        f"Review vendor security advisory for {cve_id}. "
        f"Apply latest security patches and updates. "
        f"Verify fix in staging environment before production deployment."
    )


async def enrich_template_from_nvd(
    cve_id: str,
    overwrite_existing: bool = False
) -> Dict[str, Any]:
    """
    Fetch CVE data and return enrichment data for a template.
    
    Args:
        cve_id: CVE identifier
        overwrite_existing: If False, only fill empty fields
    
    Returns:
        Dictionary with fields to update in VulnerabilityTemplate
    
    Example:
        >>> enrichment = await enrich_template_from_nvd("CVE-2021-44228")
        >>> print(enrichment['cvss_score'])
        10.0
    """
    nvd_data = await fetch_cve_data(cve_id)
    
    if not nvd_data:
        raise NVDAPIError(f"Could not fetch data for {cve_id}")
    
    # Build update dict
    updates = {}
    
    # Always update these if we have data
    if nvd_data.get('description'):
        updates['description'] = nvd_data['description']
    
    if nvd_data.get('cvss_score'):
        updates['cvss_score'] = nvd_data['cvss_score']
    
    if nvd_data.get('cvss_vector'):
        updates['cvss_vector'] = nvd_data['cvss_vector']
    
    if nvd_data.get('severity'):
        updates['default_risk_rating'] = map_cvss_severity_to_risk_rating(
            nvd_data['severity']
        )
    
    if nvd_data.get('primary_cwe'):
        updates['cwe_id'] = nvd_data['primary_cwe']
    
    # Generate basic remediation if none exists
    if nvd_data.get('description'):
        updates['remediation_summary'] = generate_remediation_summary(
            cve_id,
            nvd_data['description']
        )
    
    # Join references into text
    if nvd_data.get('references'):
        # Take first 5 references to avoid bloat
        refs = nvd_data['references'][:5]
        updates['references'] = '\n'.join(refs)
    
    # Add metadata
    updates['source'] = 'nvd'
    updates['is_verified'] = True  # NVD data is authoritative
    
    logger.info(f"Generated enrichment data for {cve_id}: {len(updates)} fields")
    return updates


# Synchronous wrapper for non-async contexts
def fetch_cve_data_sync(cve_id: str) -> Optional[Dict[str, Any]]:
    """Synchronous wrapper for fetch_cve_data."""
    return asyncio.run(fetch_cve_data(cve_id))


def enrich_template_from_nvd_sync(
    cve_id: str,
    overwrite_existing: bool = False
) -> Dict[str, Any]:
    """Synchronous wrapper for enrich_template_from_nvd."""
    return asyncio.run(enrich_template_from_nvd(cve_id, overwrite_existing))
