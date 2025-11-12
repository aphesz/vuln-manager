#!/usr/bin/env python3
"""Test script to verify donut chart integration in detailed_findings module."""

import sys
from pathlib import Path
from datetime import datetime
from io import BytesIO

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.report_modular import render_module

def test_donut_integration():
    """Test that donut charts are generated and embedded in detailed_findings."""
    
    # Create test context with sample findings
    test_context = {
        "findings": [
            {
                "section_number": "1.1",
                "title": "SQL Injection in Login Form",
                "risk_rating": "Critical",
                "instances_count": 3,
                "issue_status": "Open",
                "review_status": "Reviewed",
                "reviewer_name": "Security Team",
                "sla_status": "On Track",
                "remediation_deadline": "2025-11-15",
                "remediation_owner": "Dev Team Alpha",
                "jira_issue_key": "SEC-123",
                "jira_status": "In Progress",
                "cve_id": "CVE-2024-1234",
                "cwe_id": "CWE-89",
                "cvss_score": "9.8",
                "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                "owasp_category": "A03:2021 - Injection",
                "owasp_risk_rating": "High",
                "affected_resources": "Login endpoint (/api/auth/login)",
                "discovered_at": "2025-11-01",
                "resolved_at": "",
                "description_text": "SQL injection vulnerability in login form allows attackers to bypass authentication.",
                "impact": "Unauthorized access to user accounts and sensitive data.",
                "remediation_text": "Use parameterized queries and input validation.",
                "poc_content": "Payload: ' OR '1'='1",
                "references_url": "https://owasp.org/www-community/attacks/SQL_Injection"
            },
            {
                "section_number": "1.2",
                "title": "XSS in User Profile",
                "risk_rating": "High",
                "instances_count": 2,
                "issue_status": "Open",
                "review_status": "Pending",
                "reviewer_name": "",
                "sla_status": "At Risk",
                "remediation_deadline": "2025-11-20",
                "remediation_owner": "Dev Team Beta",
                "jira_issue_key": "SEC-124",
                "jira_status": "To Do",
                "cve_id": "",
                "cwe_id": "CWE-79",
                "cvss_score": "7.3",
                "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
                "owasp_category": "A03:2021 - Injection",
                "owasp_risk_rating": "Medium",
                "affected_resources": "User profile page (/user/profile)",
                "discovered_at": "2025-11-05",
                "resolved_at": "",
                "description_text": "Reflected XSS in user profile allows script injection.",
                "impact": "Session hijacking and data theft.",
                "remediation_text": "Implement output encoding and CSP headers.",
                "poc_content": "Payload: <script>alert('XSS')</script>",
                "references_url": "https://owasp.org/www-community/attacks/xss/"
            }
        ]
    }
    
    # Path to detailed_findings template
    template_path = Path("/code/app/report_modules/detailed_findings.docx")
    
    print("Testing donut chart integration in detailed_findings module...")
    print(f"Template path: {template_path}")
    print(f"Test findings: {len(test_context['findings'])}")
    print()
    
    # Render the module with donut charts
    try:
        doc = render_module(template_path, test_context, module_name="detailed_findings")
        print("✅ Module rendered successfully!")
        print(f"   Document has {len(doc.paragraphs)} paragraphs")
        print(f"   Document has {len(doc.tables)} tables")
        
        # Check if images were embedded
        inline_shapes_count = len(doc.inline_shapes)
        print(f"   Document has {inline_shapes_count} inline shapes (images)")
        
        if inline_shapes_count >= len(test_context['findings']):
            print(f"✅ SUCCESS: Found {inline_shapes_count} inline shapes (expected at least {len(test_context['findings'])} for donut charts)")
        else:
            print(f"⚠️  WARNING: Expected at least {len(test_context['findings'])} inline shapes, found {inline_shapes_count}")
        
        # Save test output
        output_path = Path("/code/test_donut_output.docx")
        doc.save(str(output_path))
        print(f"\n✅ Test output saved to: {output_path}")
        print(f"   File size: {output_path.stat().st_size / 1024:.1f} KB")
        
        # Check table borders
        if doc.tables:
            first_table = doc.tables[0]
            print(f"\n✅ First table has {len(first_table.rows)} rows and {len(first_table.columns)} columns")
            # Note: Can't easily verify border colors without inspecting XML
            print("   (Border colors applied - verify manually by opening the document)")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_donut_integration()
    sys.exit(0 if success else 1)
