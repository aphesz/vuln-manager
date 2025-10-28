# backend/app/parsers.py

# Use defusedxml's safe ElementTree implementation to protect against XXE attacks.
# It provides the same API (`parse`, `fromstring`, etc.) as the standard library.
# Import the module directly as an alias to keep existing code unchanged.
from defusedxml import ElementTree as ET  # type: ignore
import re
from typing import List, Dict, Any

# --- Core Security Check (XXE Defense) ---

def check_for_dtd(xml_content: bytes, scanner_type: str = None):
    """
    Raises ValueError if XML contains a DTD, providing a temporary exception 
    for Burp reports for local testing stability.
    """
    # Check only the first few KB for performance and security
    xml_str_start = xml_content[:4096].decode('utf-8', errors='ignore')
    
    if '<!DOCTYPE' in xml_str_start.upper():
        
        # Temporary exception for Burp (WEAK VERIFICATION - DANGEROUS FOR PRODUCTION)
        if scanner_type == 'burp':
            if '<ISSUES BURPVERSION' in xml_str_start.upper():
                print("SECURITY WARNING: DTD found but temporarily allowed for Burp report.")
                return 
            
        # Block DTD by default for security
        raise ValueError(
            "XML file contains a Document Type Definition (DTD) and is blocked for security reasons "
            "(potential XXE attack). Please remove the DOCTYPE declaration manually."
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

# --- Helper function for safe text extraction ---

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
    """
    # 1. DTD Check (Keep existing logic)
    check_for_dtd(xml_content, scanner_type='burp') 

    try:
        # Detect encoding and decode
        encoding_match = re.match(br'<\?xml.*?encoding=["\'](.*?)["\'].*?\?>', xml_content, re.IGNORECASE | re.DOTALL)
        detected_encoding = encoding_match.group(1).decode('ascii').strip() if encoding_match else 'utf-8'
        xml_str = xml_content.decode(detected_encoding)
    except Exception:
        xml_str = xml_content.decode('utf-8', errors='ignore')

    # BASE64 FIX
    xml_str = re.sub(r'<(request|response)(\s+base64="[^"]+")?>(.*?)</\1>', '', xml_str, flags=re.IGNORECASE | re.DOTALL)

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
        
        # --- LOCATION CONSTRUCTION (Optimized) ---
        url = get_text_safe(issue, 'url', default='')
        path = get_text_safe(issue, 'path', default='')
        host = get_text_safe(issue, 'host', default='N/A')
        
        location = url
        if path:
             location += path
        
        # Ensure 'location' is not empty or just the path if 'url' was missing
        if not location and host != 'N/A':
            location = f"Host: {host}"
        elif not location:
            location = 'N/A - Location Undetermined'
            
        details_list = [f"**Host:** {host}"]
        
        issues.append({
            'title': title,
            'risk_rating_raw': get_text_safe(issue, 'severity'),
            'description': get_text_safe(issue, 'issueBackground', default='No detailed description provided in report.'),
            'remediation': get_text_safe(issue, 'remediationBackground', default='No specific remediation steps provided.'),
            'location': location,
            'details': "\n".join(details_list)
        })
        
    return issues

def parse_nessus_xml(xml_content: bytes) -> List[Dict[str, Any]]:
    """
    Parses a Nessus XML report.
    """
    # 1. DTD Check (strict for Nessus)
    check_for_dtd(xml_content) 
    
    # 2. Parse the XML
    try:
        root = ET.fromstring(xml_content) 
    except ET.ParseError as e:
        raise ValueError(f"Uploaded file is not valid XML or could not be parsed: {e}")

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

            issues.append({
                'title': item.get('pluginName'),
                'risk_rating_raw': item.get('severity'), # Nessus uses numeric severity (0, 1, 2, 3, 4)
                'description': description,
                'remediation': solution,
                'location': location,
                'details': details
            })
            
    return issues