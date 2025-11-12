"""
Generate default DOCX module templates programmatically.

Run: python -m app.report_modules.generate_templates
"""
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

MODULE_DIR = Path(__file__).parent


def create_title_page_template():
    """Create title page module with company branding placeholders."""
    doc = Document()
    
    # Spacer
    doc.add_paragraph()
    doc.add_paragraph()
    doc.add_paragraph()
    
    # Title
    title = doc.add_heading("Security Assessment Report", level=1)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Project name
    proj = doc.add_paragraph("{{ project.name }}")
    proj.alignment = WD_ALIGN_PARAGRAPH.CENTER
    proj.runs[0].font.size = Pt(18)
    proj.runs[0].font.bold = True
    
    doc.add_paragraph()
    doc.add_paragraph()
    doc.add_paragraph()
    
    # Metadata table
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.style = 'Light Grid Accent 1'
    
    meta_table.cell(0, 0).text = "Report Date:"
    meta_table.cell(0, 1).text = "{{ report_date }}"
    
    meta_table.cell(1, 0).text = "Consultant:"
    meta_table.cell(1, 1).text = "{{ project.consultant_name }}"
    
    meta_table.cell(2, 0).text = "Company:"
    meta_table.cell(2, 1).text = "{{ company_name }}"
    
    meta_table.cell(3, 0).text = "Total Findings:"
    meta_table.cell(3, 1).text = "{{ total_findings }}"
    
    meta_table.cell(4, 0).text = "Assessment Period:"
    meta_table.cell(4, 1).text = "{{ assessment_period }}"
    
    # Page break
    doc.add_page_break()
    
    doc.save(MODULE_DIR / "title_page.docx")
    print("✓ Created title_page.docx")


def create_executive_summary_template():
    """Create executive summary module."""
    doc = Document()
    
    doc.add_heading("Executive Summary", level=1)
    doc.add_paragraph()
    
    # Summary paragraph
    summary = doc.add_paragraph(
        "This security assessment of "
    )
    summary.add_run("{{ project.name }}").bold = True
    summary.add_run(" identified ")
    summary.add_run("{{ total_findings }}").bold = True
    summary.add_run(" security findings across various risk levels. ")
    summary.add_run("{{ critical_count }}").bold = True
    summary.add_run(" Critical and ")
    summary.add_run("{{ high_count }}").bold = True
    summary.add_run(" High severity findings require immediate attention.")
    
    doc.add_paragraph()
    
    # Risk summary heading
    doc.add_heading("Risk Summary", level=2)
    
    # Risk counts table
    risk_table = doc.add_table(rows=6, cols=2)
    risk_table.style = 'Light Grid Accent 1'
    
    risk_table.cell(0, 0).text = "Risk Level"
    risk_table.cell(0, 1).text = "Count"
    risk_table.cell(0, 0).paragraphs[0].runs[0].font.bold = True
    risk_table.cell(0, 1).paragraphs[0].runs[0].font.bold = True
    
    risk_table.cell(1, 0).text = "Critical"
    risk_table.cell(1, 1).text = "{{ critical_count }}"
    
    risk_table.cell(2, 0).text = "High"
    risk_table.cell(2, 1).text = "{{ high_count }}"
    
    risk_table.cell(3, 0).text = "Medium"
    risk_table.cell(3, 1).text = "{{ medium_count }}"
    
    risk_table.cell(4, 0).text = "Low"
    risk_table.cell(4, 1).text = "{{ low_count }}"
    
    risk_table.cell(5, 0).text = "Informational"
    risk_table.cell(5, 1).text = "{{ informational_count }}"
    
    doc.add_page_break()
    
    doc.save(MODULE_DIR / "executive_summary.docx")
    print("✓ Created executive_summary.docx")


def create_detailed_findings_template():
    """Create detailed findings module with full field support."""
    doc = Document()
    
    doc.add_heading("Detailed Findings", level=1)
    doc.add_paragraph()
    
    # Findings loop
    doc.add_paragraph("{% for f in findings %}")
    
    # Finding heading
    doc.add_heading("{{ f.section_number }} {{ f.title }} ({{ f.risk_rating }})", level=2)
    
    # Create finding table
    finding_table = doc.add_table(rows=15, cols=2)
    finding_table.style = 'Light Grid Accent 1'
    finding_table.columns[0].width = Inches(2.0)
    finding_table.columns[1].width = Inches(4.5)
    
    # Row 0: Risk Rating
    finding_table.cell(0, 0).text = "Risk Rating:"
    finding_table.cell(0, 1).text = "{{ f.risk_rating }}"
    finding_table.cell(0, 0).paragraphs[0].runs[0].font.bold = True
    
    # Row 1: Instances
    finding_table.cell(1, 0).text = "Instances:"
    finding_table.cell(1, 1).text = "{{ f.instances_count }}"
    
    # Row 2: Status
    finding_table.cell(2, 0).text = "Issue Status:"
    finding_table.cell(2, 1).text = "{{ f.issue_status }}"
    
    # Row 3: Review Status
    finding_table.cell(3, 0).text = "Review Status:"
    finding_table.cell(3, 1).text = "{{ f.review_status }} ({{ f.reviewer_name }})"
    
    # Row 4: SLA
    finding_table.cell(4, 0).text = "SLA Status:"
    finding_table.cell(4, 1).text = "{{ f.sla_status }} - Due: {{ f.remediation_deadline }}"
    
    # Row 5: Remediation Owner
    finding_table.cell(5, 0).text = "Remediation Owner:"
    finding_table.cell(5, 1).text = "{{ f.remediation_owner }}"
    
    # Row 6: Jira
    finding_table.cell(6, 0).text = "Jira Ticket:"
    finding_table.cell(6, 1).text = "{{ f.jira_issue_key }} ({{ f.jira_status }})"
    
    # Row 7: CVE/CWE
    finding_table.cell(7, 0).text = "CVE / CWE:"
    finding_table.cell(7, 1).text = "{{ f.cve_id }} / {{ f.cwe_id }}"
    
    # Row 8: CVSS
    finding_table.cell(8, 0).text = "CVSS Score:"
    finding_table.cell(8, 1).text = "{{ f.cvss_score }} ({{ f.cvss_vector }})"
    
    # Row 9: OWASP
    finding_table.cell(9, 0).text = "OWASP Category:"
    finding_table.cell(9, 1).text = "{{ f.owasp_category }} - Risk: {{ f.owasp_risk_rating }}"
    
    # Row 10: Affected Resources
    finding_table.cell(10, 0).text = "Affected Resources:"
    finding_table.cell(10, 1).text = "{{ f.affected_resources }}"
    
    # Row 11: Timeline
    finding_table.cell(11, 0).text = "Timeline:"
    finding_table.cell(11, 1).text = "Discovered: {{ f.discovered_at }} | Resolved: {{ f.resolved_at }}"
    
    # Row 12: Description header
    finding_table.cell(12, 0).text = "Description:"
    finding_table.cell(12, 0).paragraphs[0].runs[0].font.bold = True
    finding_table.cell(12, 1).text = ""
    
    # Row 13: Description content
    finding_table.cell(13, 0).text = ""
    finding_table.cell(13, 1).text = "{{ f.description_text }}"
    
    # Row 14: Impact
    finding_table.cell(14, 0).text = "Impact:"
    finding_table.cell(14, 0).paragraphs[0].runs[0].font.bold = True
    finding_table.cell(14, 1).text = "{{ f.impact }}"
    
    doc.add_paragraph()
    
    # Remediation section
    doc.add_heading("Remediation", level=3)
    doc.add_paragraph("{{ f.remediation_text }}")
    
    # POC section
    doc.add_heading("Proof of Concept", level=3)
    doc.add_paragraph("{{ f.poc_content }}")
    
    # References
    doc.add_paragraph()
    ref = doc.add_paragraph("References: ")
    ref.add_run("{{ f.references_url }}").font.color.rgb = RGBColor(0, 0, 255)
    
    doc.add_paragraph()
    doc.add_paragraph("{% endfor %}")
    
    doc.add_page_break()
    
    doc.save(MODULE_DIR / "detailed_findings.docx")
    print("✓ Created detailed_findings.docx")


def create_recommendations_template():
    """Create recommendations module."""
    doc = Document()
    
    doc.add_heading("Recommendations", level=1)
    doc.add_paragraph()
    
    # Critical priority
    doc.add_heading("Critical Priority", level=2)
    doc.add_paragraph(
        "{% if critical_count > 0 %}"
        "Address all {{ critical_count }} Critical severity findings immediately. "
        "These vulnerabilities pose a direct threat to system security and should be "
        "remediated within 24-48 hours."
        "{% else %}"
        "No critical findings identified."
        "{% endif %}"
    )
    
    # High priority
    doc.add_heading("High Priority", level=2)
    doc.add_paragraph(
        "{% if high_count > 0 %}"
        "Remediate {{ high_count }} High severity findings within 1-2 weeks. "
        "These issues present significant security risks and should be prioritized "
        "in the remediation plan."
        "{% else %}"
        "No high severity findings identified."
        "{% endif %}"
    )
    
    # General recommendations
    doc.add_heading("General Security Recommendations", level=2)
    
    doc.add_paragraph("Conduct regular security assessments (quarterly recommended) to identify "
                     "new vulnerabilities and validate remediation efforts.", style='List Bullet')
    
    doc.add_paragraph("Provide security awareness training to development teams to prevent "
                     "common vulnerabilities from being introduced during the development lifecycle.",
                     style='List Bullet')
    
    doc.add_paragraph("Implement automated security scanning in CI/CD pipelines for continuous "
                     "vulnerability detection.", style='List Bullet')
    
    doc.add_paragraph("Establish a formal vulnerability disclosure and remediation process with "
                     "defined SLAs by severity level.", style='List Bullet')
    
    doc.add_page_break()
    
    doc.save(MODULE_DIR / "recommendations.docx")
    print("✓ Created recommendations.docx")


def create_top_findings_template():
    """Create top findings summary module."""
    doc = Document()
    
    doc.add_heading("Top Priority Findings", level=1)
    doc.add_paragraph()
    
    intro = doc.add_paragraph(
        "The following table summarizes the highest priority findings that require "
        "immediate attention."
    )
    
    doc.add_paragraph()
    
    # Top findings table
    top_table = doc.add_table(rows=1, cols=5)
    top_table.style = 'Light Grid Accent 1'
    
    # Header row
    hdr_cells = top_table.rows[0].cells
    hdr_cells[0].text = "#"
    hdr_cells[1].text = "Finding"
    hdr_cells[2].text = "Risk"
    hdr_cells[3].text = "Instances"
    hdr_cells[4].text = "SLA Status"
    
    for cell in hdr_cells:
        cell.paragraphs[0].runs[0].font.bold = True
    
    # Data rows (Jinja loop) - using tr template
    doc.add_paragraph("{%tr for f in findings[:10] %}")
    
    row_template = top_table.add_row().cells
    row_template[0].text = "{{ loop.index }}"
    row_template[1].text = "{{ f.title[:60] }}"
    row_template[2].text = "{{ f.risk_rating }}"
    row_template[3].text = "{{ f.instances_count }}"
    row_template[4].text = "{{ f.sla_status or 'N/A' }}"
    
    doc.add_paragraph("{%endtr%}")
    
    doc.add_page_break()
    
    doc.save(MODULE_DIR / "top_findings.docx")
    print("✓ Created top_findings.docx")


def create_sla_status_template():
    """Create SLA tracking module."""
    doc = Document()
    
    doc.add_heading("SLA Tracking Report", level=1)
    doc.add_paragraph()
    
    # Summary
    summary = doc.add_paragraph(
        "This report tracks the remediation SLA status for all findings. "
    )
    summary.add_run("{{ overdue_count }}").bold = True
    summary.add_run(" findings are currently overdue, and ")
    summary.add_run("{{ at_risk_count }}").bold = True
    summary.add_run(" are at risk of missing their SLA deadlines.")
    
    doc.add_paragraph()
    
    # SLA status table
    doc.add_heading("Findings by SLA Status", level=2)
    
    sla_table = doc.add_table(rows=1, cols=6)
    sla_table.style = 'Light Grid Accent 1'
    
    hdr = sla_table.rows[0].cells
    hdr[0].text = "Finding"
    hdr[1].text = "Risk"
    hdr[2].text = "SLA Status"
    hdr[3].text = "Deadline"
    hdr[4].text = "Owner"
    hdr[5].text = "Jira"
    
    for cell in hdr:
        cell.paragraphs[0].runs[0].font.bold = True
    
    doc.add_paragraph("{% for f in findings %}")
    
    row = sla_table.add_row().cells
    row[0].text = "{{ f.title[:40] }}"
    row[1].text = "{{ f.risk_rating }}"
    row[2].text = "{{ f.sla_status }}"
    row[3].text = "{{ f.remediation_deadline }}"
    row[4].text = "{{ f.remediation_owner }}"
    row[5].text = "{{ f.jira_issue_key }}"
    
    doc.add_paragraph("{% endfor %}")
    
    doc.add_page_break()
    
    doc.save(MODULE_DIR / "sla_status.docx")
    print("✓ Created sla_status.docx")


def main():
    """Generate all default module templates."""
    print("Generating default report module templates...")
    print()
    
    create_title_page_template()
    create_executive_summary_template()
    create_detailed_findings_template()
    create_recommendations_template()
    create_top_findings_template()
    create_sla_status_template()
    
    print()
    print(f"✅ Successfully generated 6 module templates in {MODULE_DIR}")
    print()
    print("Next steps:")
    print("1. Review the generated templates in Word/LibreOffice")
    print("2. Customize layouts, fonts, and styles as needed")
    print("3. Use the /projects/{id}/report/assemble endpoint to generate modular reports")


if __name__ == "__main__":
    main()
