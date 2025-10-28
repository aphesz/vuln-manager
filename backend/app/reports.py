# backend/app/reports.py

from docx import Document
from docx.shared import Inches
from typing import TYPE_CHECKING
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

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
    Generates a security assessment report in PDF format using ReportLab.
    
    Args:
        project: The Project object including findings and instances
        file_path: The path where the PDF file should be saved
    """
    print(f"Generating PDF report for project: {project.name}")
    
    # Initialize the PDF document
    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        rightMargin=72,  # 1 inch margins
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30
    )
    heading1_style = styles['Heading1']
    heading2_style = styles['Heading2']
    normal_style = styles['Normal']
    
    # Build the document content
    story = []
    
    # Title Page
    story.append(Paragraph(f"Security Assessment Report", title_style))
    story.append(Paragraph(f"Project: {project.name}", heading1_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Consultant: {project.consultant_name or 'N/A'}", normal_style))
    story.append(Paragraph(f"Report Date: {datetime.now().strftime('%Y-%m-%d')}", normal_style))
    story.append(Spacer(1, 60))
    
    # Executive Summary
    story.append(Paragraph("Executive Summary", heading1_style))
    story.append(Paragraph(
        "This security assessment report details the findings discovered during "
        "the assessment period. Each finding is categorized by risk level and "
        "includes detailed information about the vulnerability, its impact, and "
        "recommended remediation steps.",
        normal_style
    ))
    story.append(Spacer(1, 20))
    
    # Risk Summary Table
    risk_counts = {
        'Critical': 0,
        'High': 0,
        'Medium': 0,
        'Low': 0,
        'Informational': 0
    }
    
    for finding in project.findings:
        risk_counts[finding.risk_rating] += 1
    
    # Create risk summary table
    risk_data = [['Risk Level', 'Count']]
    risk_colors = {
        'Critical': colors.red,
        'High': colors.orange,
        'Medium': colors.yellow,
        'Low': colors.green,
        'Informational': colors.blue
    }
    
    for risk in ['Critical', 'High', 'Medium', 'Low', 'Informational']:
        risk_data.append([risk, str(risk_counts[risk])])
    
    risk_table = Table(risk_data, colWidths=[2*inch, inch])
    risk_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 12),
    ]))
    
    story.append(risk_table)
    story.append(Spacer(1, 30))
    
    # Detailed Findings
    story.append(Paragraph("Detailed Findings", heading1_style))
    story.append(Spacer(1, 12))
    
    if not project.findings:
        story.append(Paragraph("No findings were recorded for this project.", normal_style))
    else:
        # Sort findings by risk rating
        RISK_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Informational']
        sorted_findings = sorted(
            project.findings,
            key=lambda f: RISK_ORDER.index(f.risk_rating) if f.risk_rating in RISK_ORDER else len(RISK_ORDER)
        )
        
        for i, finding in enumerate(sorted_findings, 1):
            # Finding Title
            story.append(Paragraph(
                f"Finding {i}: {finding.title}",
                heading2_style
            ))
            
            # Finding details table
            finding_data = [
                ['Risk Rating', finding.risk_rating],
                ['Description', finding.description],
                ['Remediation', finding.remediation],
                ['Instances', str(len(finding.instances))]
            ]
            
            finding_table = Table(finding_data, colWidths=[1.5*inch, 4*inch])
            finding_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            story.append(finding_table)
            story.append(Spacer(1, 12))
            
            # Instance details
            for j, instance in enumerate(finding.instances, 1):
                instance_data = [
                    [f'Instance {j}'],
                    ['Location', instance.location],
                    ['Details', instance.details],
                    ['Status', instance.status]
                ]
                
                instance_table = Table(instance_data, colWidths=[1.5*inch, 4*inch])
                instance_table.setStyle(TableStyle([
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('SPAN', (0, 0), (1, 0)),  # Span the title across both columns
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ]))
                
                story.append(instance_table)
                story.append(Spacer(1, 12))
            
            story.append(Spacer(1, 20))
    
    try:
        # Build the PDF
        doc.build(story)
        print(f"PDF report saved to {file_path}")
    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise