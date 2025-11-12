#!/usr/bin/env python3
"""
Seed system DOCX templates into the database.

This script populates the ReportTemplate table with the 11 default system templates
from storage/templates/system/. Run this after running the migration.

Usage:
    python -m app.seed_system_templates
"""
from pathlib import Path
from sqlmodel import Session, create_engine, select
from app.models import ReportTemplate
from datetime import datetime
import os

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://user:password@localhost:5432/vuln_db")

# Template metadata
SYSTEM_TEMPLATES = [
    {
        "name": "Title Page",
        "description": "Project title, metadata, and company branding placeholders",
        "template_type": "Executive",
        "docx_file_path": "system/title_page.docx",
    },
    {
        "name": "Executive Summary",
        "description": "High-level overview with risk summary table",
        "template_type": "Executive",
        "docx_file_path": "system/executive_summary.docx",
    },
    {
        "name": "Detailed Findings",
        "description": "Full finding details with all fields, donut charts, and colored borders",
        "template_type": "Technical",
        "docx_file_path": "system/detailed_findings.docx",
    },
    {
        "name": "Top Findings",
        "description": "Top N critical findings summary table",
        "template_type": "Executive",
        "docx_file_path": "system/top_findings.docx",
    },
    {
        "name": "Recommendations",
        "description": "Prioritized remediation recommendations and action items",
        "template_type": "Technical",
        "docx_file_path": "system/recommendations.docx",
    },
    {
        "name": "Risk Charts",
        "description": "Visual risk distribution charts and statistics",
        "template_type": "Executive",
        "docx_file_path": "system/risk_charts.docx",
    },
    {
        "name": "SLA Status",
        "description": "SLA tracking with deadlines and ownership",
        "template_type": "Technical",
        "docx_file_path": "system/sla_status.docx",
    },
    {
        "name": "Appendix",
        "description": "Methodology, scope, risk criteria, and references",
        "template_type": "Technical",
        "docx_file_path": "system/appendix.docx",
    },
    {
        "name": "OWASP Compliance",
        "description": "OWASP Top 10 2021 mapping and coverage",
        "template_type": "Compliance",
        "docx_file_path": "system/compliance_owasp.docx",
    },
    {
        "name": "CWE Compliance",
        "description": "CWE Top 25 classification and alignment",
        "template_type": "Compliance",
        "docx_file_path": "system/compliance_cwe.docx",
    },
    {
        "name": "Jira Integration",
        "description": "Jira ticket summary with status tracking",
        "template_type": "Technical",
        "docx_file_path": "system/jira_integration.docx",
    },
]


def seed_system_templates():
    """Seed system DOCX templates into the database."""
    engine = create_engine(DATABASE_URL, echo=True)
    
    with Session(engine) as session:
        # Check if system DOCX templates already exist
        existing = session.exec(
            select(ReportTemplate).where(
                ReportTemplate.is_system_template == True,
                ReportTemplate.docx_file_path != None
            )
        ).all()
        
        if existing:
            print(f"✓ Found {len(existing)} existing system DOCX templates")
            print("  Skipping seed (templates already exist)")
            return
        
        print("Seeding system DOCX templates...")
        
        for tmpl_data in SYSTEM_TEMPLATES:
            # Verify file exists
            file_path = Path("/code/storage/templates") / tmpl_data["docx_file_path"]
            if not file_path.exists():
                print(f"✗ WARNING: Template file not found: {file_path}")
                continue
            
            # Create template record using existing ReportTemplate model
            template = ReportTemplate(
                name=tmpl_data["name"],
                description=tmpl_data["description"],
                template_type=tmpl_data["template_type"],
                docx_file_path=tmpl_data["docx_file_path"],  # NEW: Path to DOCX file
                sections="[]",  # Empty for DOCX templates
                variables="[]",  # Empty for DOCX templates
                is_system_template=True,
                is_public=True,  # System templates available to all projects
                created_by_user_id=None,  # System template
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            
            session.add(template)
            print(f"  ✓ Added: {tmpl_data['name']}")
        
        session.commit()
        print(f"\n✅ Successfully seeded {len(SYSTEM_TEMPLATES)} system DOCX templates")


if __name__ == "__main__":
    seed_system_templates()
