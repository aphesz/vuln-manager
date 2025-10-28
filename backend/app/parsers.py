# backend/app/parsers.py

# Use defusedxml's safe ElementTree implementation to protect against XXE attacks.
# It provides the same API (`parse`, `fromstring`, etc.) as the standard library.
# Import the module directly as an alias to keep existing code unchanged.
from defusedxml import ElementTree as ET  # type: ignore
import re
import sys
import logging
from typing import List, Dict, Any, Literal
from pathlib import Path

# Configure logging to output to stdout
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Test log message
logger.debug("Logging initialized in parsers.py")

# Constants for security limits
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit
MAX_DTD_SCAN_SIZE = 8192  # Increased from 4KB to 8KB for better coverage

# --- Core Security Check (XXE Defense) ---

def check_for_dtd(xml_content: bytes, scanner_type: str = None) -> None:
    """
    Performs security checks on XML content before parsing.
    
    Args:
        xml_content (bytes): The raw XML content to check
        scanner_type (str, optional): The type of scanner ('burp' or 'nessus')
        
    Raises:
        ValueError: If the file exceeds size limits or contains potentially dangerous DTD
        declarations (unless explicitly allowed for certain verified formats)
    """
    # Check file size first
    if len(xml_content) > MAX_FILE_SIZE:
        raise ValueError(
            f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
        )
    
    # Check a larger portion of the file for DTDs
    xml_str_start = xml_content[:MAX_DTD_SCAN_SIZE].decode('utf-8', errors='ignore')
    
    if '<!DOCTYPE' in xml_str_start.upper():
        # For Burp reports, we do a strict verification of the format
        if scanner_type == 'burp':
            if all(marker in xml_str_start.upper() for marker in ['<ISSUES BURPVERSION', '<!DOCTYPE']):
                print("WARNING: DTD found in verified Burp report format - proceeding with caution")
                return
            
        # Block all other DTDs by default
        raise ValueError(
            "XML file contains a Document Type Definition (DTD) and is blocked for security reasons. "
            "If this is a Burp Suite report, ensure it's in the standard format. "
            "For all other cases, remove the DOCTYPE declaration manually."
        )

# --- General Parser Utility ---

def parse_xml_content(xml_content: bytes, scanner_type: str) -> List[Dict[str, Any]]:
    """
    Selects the correct parser based on scanner_type and returns raw issue data.
    """
    if scanner_type == 'burp':
        return parse_burp_xml(xml_content)
    elif scanner_type == 'nessus':
        return parse_nessus_xml(xml_content)
    else:
        raise ValueError(f"Unknown scanner type: {scanner_type}")

# --- Helper functions ---

def get_text_safe(element, tag_name: str, default: str = 'N/A') -> str:
    """
    Safely extracts text from a sub-element. 
    Returns the default value if the element is missing, or if the text is empty/whitespace.
    """
    sub_element = element.find(tag_name)
    if sub_element is not None and sub_element.text is not None:
        stripped_text = sub_element.text.strip()
        if stripped_text:
            return stripped_text
    return default

# --- Scanner Specific Parsers ---

def parse_burp_xml(xml_content: bytes) -> List[Dict[str, Any]]:
    """
    Parses a Burp Suite XML report, handling encoding and Base64-encoded content safely.
    
    Args:
        xml_content (bytes): Raw XML content from a Burp Suite report
        
    Returns:
        List[Dict[str, Any]]: List of parsed vulnerability findings
        
    Raises:
        ValueError: If the XML is invalid or cannot be parsed
    """
    # Security check
    check_for_dtd(xml_content, scanner_type='burp')

    # Detect encoding with fallback chain
    encodings_to_try = ['utf-8', 'utf-16', 'iso-8859-1', 'ascii']
    
    # First try to get encoding from XML declaration
    encoding_match = re.match(br'<\?xml.*?encoding=["\'](.*?)["\'].*?\?>', 
                            xml_content[:1000], 
                            re.IGNORECASE | re.DOTALL)
    
    if encoding_match:
        try:
            declared_encoding = encoding_match.group(1).decode('ascii').strip()
            encodings_to_try.insert(0, declared_encoding)
        except UnicodeDecodeError:
            pass

    # Try encodings until one works
    xml_str = None
    for encoding in encodings_to_try:
        try:
            xml_str = xml_content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    
    if xml_str is None:
        raise ValueError("Could not decode XML content with any known encoding")

    # 4. Parse the cleaned XML string
    try:
        root = ET.fromstring(xml_str) 
    except ET.ParseError as e:
        raise ValueError(f"Uploaded file is not valid XML or could not be parsed: {e}")

    issues = []
    
    for issue in root.findall('.//issue'):
        
        # --- CRITICAL TITLE FIX: Try primary tag, then fallback ---
        title = get_text_safe(issue, 'issueName', default='')
        if title == '':
            # FALLBACK to the simpler 'name' tag, which some Burp versions use
            title = get_text_safe(issue, 'name', default='N/A - Title Undetermined')
        
        # --- LOCATION CONSTRUCTION ---
        url = get_text_safe(issue, 'url', default='')
        path = get_text_safe(issue, 'path', default='')
        host = get_text_safe(issue, 'host', default='N/A')
        port = get_text_safe(issue, 'port', default='')
        protocol = get_text_safe(issue, 'protocol', default='')
        
        # Build location with all available components
        location_parts = []
        
        if protocol and host != 'N/A':
            location_parts.append(f"{protocol}://")
        
        if host != 'N/A':
            location_parts.append(host)
            if port:
                location_parts.append(f":{port}")
                
        if path:
            # Ensure path starts with / if it's not already in the URL
            if not path.startswith('/') and not url.endswith('/'):
                path = '/' + path
            location_parts.append(path)
            
        if url and not (protocol or host != 'N/A' or path):
            location_parts.append(url)
            
        location = ''.join(location_parts) if location_parts else 'N/A - Location Undetermined'
        
        # Build comprehensive details
        details_list = []
        if host != 'N/A':
            details_list.append(f"**Host:** {host}")
        if port:
            details_list.append(f"**Port:** {port}")
        if protocol:
            details_list.append(f"**Protocol:** {protocol}")
            
        # Add request method if available
        method = get_text_safe(issue, 'method', default='')
        if method:
            details_list.append(f"**Method:** {method}")
        
        raw_severity = get_text_safe(issue, 'severity')
        logger.debug(f"Burp raw severity value: {raw_severity}")
        
        issues.append({
            'title': title,
            'risk_rating_raw': raw_severity,
            'description': get_text_safe(issue, 'issueBackground', default='No detailed description provided in report.'),
            'remediation': get_text_safe(issue, 'remediationBackground', default='No specific remediation steps provided.'),
            'location': location,
            'details': "\n".join(details_list)
        })
        
    return issues

def parse_nessus_xml(xml_content: bytes) -> List[Dict[str, Any]]:
    """
    Parses a Nessus XML report into a standardized vulnerability findings format.
    
    Args:
        xml_content (bytes): Raw XML content from a Nessus scan report
        
    Returns:
        List[Dict[str, Any]]: List of parsed vulnerability findings with standardized fields:
            - title: The name of the vulnerability
            - risk_rating_raw: Nessus severity (0-4)
            - description: Detailed vulnerability description
            - remediation: Recommended fix steps
            - location: Affected host/port/protocol
            - details: Additional technical details
            
    Raises:
        ValueError: If the XML is invalid, cannot be parsed, or missing required elements
    """
    # Security check
    check_for_dtd(xml_content)
    
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid Nessus XML format: {e}")
        
    # Validate it's actually a Nessus report
    if root.tag != 'NessusClientData_v2':
        raise ValueError("Not a valid Nessus v2 report format")
        
    issues = []
    
    # Extract findings data
    for host in root.findall('.//ReportHost'):
        host_name = host.get('name') or 'Unknown Host'
        
        for item in host.findall('.//ReportItem'):
            # Skip informational items that don't represent a true finding
            if item.get('severity') == '0': 
                continue 
            
            description = item.find('./description').text if item.find('./description') is not None else 'N/A'
            solution = item.find('./solution').text if item.find('./solution') is not None else 'N/A'

            location = f"{host_name}:{item.get('port')} ({item.get('protocol')})"
            details = f"Plugin ID: {item.get('pluginID')}"

            raw_severity = item.get('severity', '0')
            logger.debug(f"Nessus raw severity value: {raw_severity}")
            
            issues.append({
                'title': item.get('pluginName'),
                'risk_rating_raw': raw_severity,  # Nessus uses numeric severity (0, 1, 2, 3, 4)
                'description': description,
                'remediation': solution,
                'location': location,
                'details': details
            })
            
    return issues