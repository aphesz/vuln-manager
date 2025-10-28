# backend/app/reports.py

from docx import Document
from docx.shared import Inches
from typing import TYPE_CHECKING
import os

# Type checking import to avoid circular dependencies in SQLModel
if TYPE_CHECKING:
    from app.models import Project # We need the Project model structure for typing

# --- Utility Functions ---

def generate_report_docx(project: 'Project', file_path: str):
    """
    Generates a security assessment report in DOCX format.
    
    Args:
        project: The Project object including findings and instances.
        file_path: The path where the DOCX file should be saved.
    """
    print(f"Generating DOCX report for project: {project.name}")
    
    # Initialize a new Word document
    document = Document()
    
    # 1. Title Page
    document.add_heading(f"Security Assessment Report: {project.name}", 0)
    document.add_paragraph(f"Consultant: {project.consultant_name or 'N/A'}")
    document.add_paragraph(f"Report Date: {os.path.basename(file_path).split('_')[1].split('.')[0]}")
    document.add_page_break()
    
    # 2. Executive Summary (Placeholder)
    document.add_heading("Executive Summary", 1)
    document.add_paragraph(
        "This is a placeholder for the Executive Summary. The full report details "
        "the findings discovered during the security assessment period."
    )
    
    # 3. Findings Section
    document.add_heading("Detailed Findings", 1)
    
    if not project.findings:
        document.add_paragraph("No findings were recorded for this project.")
    else:
        # Group and sort findings by risk rating (Critical -> High -> Medium, etc.)
        RISK_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Informational']
        sorted_findings = sorted(
            project.findings, 
            key=lambda f: RISK_ORDER.index(f.risk_rating) if f.risk_rating in RISK_ORDER else len(RISK_ORDER)
        )

        for i, finding in enumerate(sorted_findings, 1):
            document.add_heading(f"Finding {i}: {finding.title} ({finding.risk_rating})", 2)
            
            # Risk/Description
            document.add_paragraph(f"Risk Rating: {finding.risk_rating}")
            document.add_heading("Description", 3)
            document.add_paragraph(finding.description)
            
            # Remediation
            document.add_heading("Remediation / Solution", 3)
            document.add_paragraph(finding.remediation)
            
            # Instances/Locations
            document.add_heading(f"Vulnerable Instances ({len(finding.instances)})", 3)
            
            for instance in finding.instances:
                document.add_paragraph(f"Location: {instance.location}", style='List Bullet')
                document.add_paragraph(f"Details: {instance.details}")
                document.add_paragraph(f"Status: {instance.status}")
                
            document.add_page_break()

    # Save the document
    try:
        document.save(file_path)
        print(f"Report saved to {file_path}")
    except Exception as e:
        print(f"Error saving DOCX file: {e}")
        # Re-raise or handle as needed

def generate_report_pdf(project: 'Project', file_path: str):
    """
    Placeholder for PDF generation. In a real environment, this would
    convert the DOCX to PDF or use a library like ReportLab/WeasyPrint.
    
    For now, this function is included to satisfy the import in main.py,
    but it only creates an empty file.
    """
    print(f"Attempting to generate PDF report placeholder for project: {project.name}")
    try:
        # Create an empty placeholder file
        with open(file_path, 'w') as f:
            f.write(f"PDF generation for {project.name} is not fully implemented. See DOCX report.")
        print(f"PDF placeholder created at {file_path}")
    except Exception as e:
        print(f"Error creating PDF placeholder: {e}")