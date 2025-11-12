"""
Modular DOCX report generation system.

Supports user-uploaded custom DOCX templates with placeholders (like report_poc_simple.py).
Templates are stored in database and loaded from storage/templates/.

v0.12.0: Unified template system - users can upload custom DOCX templates
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import List, Dict, Optional, Any, Union
import json
from datetime import datetime

from docxtpl import DocxTemplate, InlineImage
from docx import Document
from docx.shared import Cm
from docxcompose.composer import Composer
from sqlmodel import Session, select

from app.models import ReportTemplate
from app.report_poc_simple import (
    _strip_html, 
    _fmt_dt, 
    _normalize_risk_label,
    _generate_donut_image,
    _set_table_left_border,
    RISK_COLORS,
)


# Storage root for templates
# Use /code/storage in container, fallback to relative path for local dev
STORAGE_ROOT = Path("/code/storage/templates") if Path("/code/storage").exists() else Path(__file__).parent.parent / "storage" / "templates"

# Legacy module directory (for backward compatibility)
MODULE_DIR = Path(__file__).parent / "report_modules"


def get_template_by_id(session: Session, template_id: int) -> Optional[ReportTemplate]:
    """Load template from database by ID.
    
    Args:
        session: Database session
        template_id: Template ID
        
    Returns:
        ReportTemplate object or None
    """
    return session.get(ReportTemplate, template_id)


def get_template_by_name(session: Session, name: str, project_id: Optional[int] = None) -> Optional[ReportTemplate]:
    """Load template from database by name.
    
    Args:
        session: Database session  
        name: Template name
        project_id: Optional project ID for project-specific templates
        
    Returns:
        ReportTemplate object or None
    """
    # Try project-specific first
    if project_id:
        stmt = select(ReportTemplate).where(
            ReportTemplate.name == name,
            ReportTemplate.project_id == project_id
        )
        result = session.exec(stmt).first()
        if result:
            return result
    
    # Fall back to system/public templates
    stmt = select(ReportTemplate).where(
        ReportTemplate.name == name,
        ReportTemplate.is_system_template == True
    )
    return session.exec(stmt).first()


def get_template_path(template: ReportTemplate) -> Path:
    """Get filesystem path for a template.
    
    Args:
        template: ReportTemplate object
        
    Returns:
        Path to DOCX file
        
    Raises:
        FileNotFoundError: If template file doesn't exist
    """
    # DOCX templates stored in storage/templates/
    if template.docx_file_path:
        path = STORAGE_ROOT / template.docx_file_path
        if not path.exists():
            raise FileNotFoundError(f"Template file not found: {path}")
        return path
    
    # Legacy fallback: should not happen with new system
    raise ValueError(f"Template '{template.name}' has no docx_file_path")


def get_module_path(module_name: str) -> Path:
    """DEPRECATED: Get the file path for a module template.
    
    This function is kept for backward compatibility.
    New code should use get_template_by_id() or get_template_by_name().
    
    Args:
        module_name: Module name without .docx extension
        
    Returns:
        Path to the module DOCX file
        
    Raises:
        FileNotFoundError: If module doesn't exist
    """
    # Try new storage location first
    path = STORAGE_ROOT / "system" / f"{module_name}.docx"
    if path.exists():
        return path
    
    # Fall back to legacy location
    path = MODULE_DIR / f"{module_name}.docx"
    if not path.exists():
        raise FileNotFoundError(f"Module '{module_name}' not found")
    return path


def build_context(project: Any, variables: Optional[Dict] = None) -> Dict:
    """Build the full context dict for template rendering.
    
    Args:
        project: Project object with findings
        variables: Optional user-provided variables (company_name, etc.)
        
    Returns:
        Complete context dict for Jinja2 rendering
    """
    findings_ctx = []
    
    # Risk counters
    risk_counts = {
        "Critical": 0,
        "High": 0,
        "Medium": 0,
        "Low": 0,
        "Informational": 0,
    }
    
    # SLA counters
    overdue_count = 0
    at_risk_count = 0
    on_track_count = 0
    
    for idx, f in enumerate(project.findings or [], start=1):
        risk = _normalize_risk_label(getattr(f, "risk_rating", "Low"))
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
        
        # Count SLA status
        sla_status = str(getattr(f, "sla_status", "") or "")
        if "Overdue" in sla_status:
            overdue_count += 1
        elif "At Risk" in sla_status:
            at_risk_count += 1
        elif "On Track" in sla_status:
            on_track_count += 1
        
        instances = getattr(f, "instances", []) or []
        affected_resources = ", ".join([
            getattr(inst, "location", "")[:50] 
            for inst in instances[:3]
        ]) if instances else "N/A"
        if len(instances) > 3:
            affected_resources += f" (+{len(instances) - 3} more)"
        
        description_text = _strip_html(getattr(f, "description", "") or "")
        owasp_category = getattr(f, "owasp_category", None)
        status = getattr(instances[0], "status", "New - Unvalidated") if instances else "New - Unvalidated"
        
        findings_ctx.append({
            "index": idx,
            "section_number": f"1.1.{idx}",
            "risk_rating": risk,
            "title": getattr(f, "title", "Untitled"),
            "instances_count": len(instances),
            "affected_resources": affected_resources,
            "status": status,
            "owasp_vector": f"OWASP {owasp_category}" if owasp_category else "N/A",
            "description_text": description_text,  # No truncation - full description
            "remediation_text": _strip_html(getattr(f, "remediation", "") or ""),
            # Extended fields
            "impact": _strip_html(getattr(f, "impact", "") or ""),
            "references_url": getattr(f, "references_url", None) or "N/A",
            "poc_content": _strip_html(getattr(f, "poc_description", "") or ""),
            "review_status": str(getattr(f, "review_status", "Pending") or "Pending"),
            "reviewer_name": getattr(f, "reviewer_name", None) or "N/A",
            "issue_status": str(getattr(f, "issue_status", "Open") or "Open"),
            "issue_status_comment": getattr(f, "issue_status_comment", None) or "",
            "jira_issue_key": getattr(f, "jira_issue_key", None) or "N/A",
            "jira_status": getattr(f, "jira_status", None) or "N/A",
            "remediation_deadline": _fmt_dt(getattr(f, "remediation_deadline", None)),
            "sla_status": sla_status or "N/A",
            "remediation_owner": getattr(f, "remediation_owner", None) or "N/A",
            "discovered_at": _fmt_dt(getattr(f, "discovered_at", None)),
            "resolved_at": _fmt_dt(getattr(f, "resolved_at", None)),
            "owasp_category": owasp_category or "N/A",
            "cwe_id": getattr(f, "cwe_id", None) or "N/A",
            "cve_id": getattr(f, "cve_id", None) or "N/A",
            "cvss_vector": getattr(f, "cvss_vector", None) or "N/A",
            "cvss_score": getattr(f, "cvss_score", None),
            "owasp_likelihood": getattr(f, "owasp_likelihood", None),
            "owasp_impact": getattr(f, "owasp_impact", None),
            "owasp_risk_rating": getattr(f, "owasp_risk_rating", None) or "N/A",
            "template_id": getattr(f, "template_id", None) or "",
        })
    
    # Sort findings by risk (Critical -> High -> Medium -> Low -> Informational)
    RISK_ORDER = ["Critical", "High", "Medium", "Low", "Informational"]
    findings_ctx.sort(
        key=lambda x: RISK_ORDER.index(x["risk_rating"]) 
        if x["risk_rating"] in RISK_ORDER else len(RISK_ORDER)
    )
    
    # Build base context
    ctx = {
        "project": {
            "name": getattr(project, "name", "Project"),
            "consultant_name": getattr(project, "consultant_name", None) or "N/A",
        },
        "findings": findings_ctx,
        "total_findings": len(findings_ctx),
        # Risk counts
        "critical_count": risk_counts["Critical"],
        "high_count": risk_counts["High"],
        "medium_count": risk_counts["Medium"],
        "low_count": risk_counts["Low"],
        "informational_count": risk_counts["Informational"],
        # SLA counts
        "overdue_count": overdue_count,
        "at_risk_count": at_risk_count,
        "on_track_count": on_track_count,
        # Metadata
        "report_date": datetime.now().strftime("%B %d, %Y"),
        "assessment_period": "N/A",  # Can be overridden by variables
        "company_name": "N/A",  # Can be overridden by variables
    }
    
    # Merge user variables
    if variables:
        ctx.update(variables)
    
    return ctx


def render_module(module_path: Path, context: Dict, module_name: str = "") -> Document:
    """Render a single module template with the given context.
    
    Args:
        module_path: Path to the module DOCX template
        context: Full context dict for Jinja2 rendering
        module_name: Name of the module (for special handling)
        
    Returns:
        Rendered Document object
    """
    tpl = DocxTemplate(module_path)
    
    # Add donut charts for ANY template that contains findings
    # This ensures custom templates also get donut images
    if "findings" in context and context["findings"]:
        enhanced_findings = []
        for f_ctx in context["findings"]:
            risk = f_ctx.get("risk_rating", "Low")
            color = RISK_COLORS.get(risk, "DDDDDD")
            
            # Generate donut chart image
            try:
                donut_stream = _generate_donut_image(
                    risk,
                    color,
                    size_inches=1.2,  # Smaller for inline use
                    dpi=150,
                )
                donut_img = InlineImage(tpl, donut_stream, Cm(3.0))
                f_ctx["donut_img"] = donut_img
                f_ctx["has_donut"] = True
            except Exception as e:
                # Fallback to text if image generation fails
                f_ctx["donut_img"] = f"[{risk}]"
                f_ctx["has_donut"] = False
            
            enhanced_findings.append(f_ctx)
        
        # Update context with enhanced findings
        context["findings"] = enhanced_findings
    
    tpl.render(context)
    
    # Save to BytesIO and reload as Document for merging
    buf = BytesIO()
    tpl.save(buf)
    buf.seek(0)
    doc = Document(buf)
    
    # Post-process: Add colored left borders to tables in ANY template with findings
    # This ensures custom templates also get colored borders
    if "findings" in context and context["findings"]:
        # Apply colored borders to finding tables
        findings_iter = iter(context["findings"])
        for tbl in doc.tables:
            try:
                finding = next(findings_iter)
                color = RISK_COLORS.get(finding.get("risk_rating", "Low"), "DDDDDD")
                _set_table_left_border(tbl, color)
            except StopIteration:
                break
            except Exception:
                continue
    
    return doc


def merge_documents(docs: List[Document]) -> bytes:
    """Merge multiple Document objects into a single DOCX.
    
    Uses docxcompose to preserve styles, headers, footers, and images.
    
    Args:
        docs: List of Document objects to merge
        
    Returns:
        Merged DOCX as bytes
        
    Raises:
        ValueError: If docs list is empty
    """
    if not docs:
        raise ValueError("Cannot merge empty document list")
    
    if len(docs) == 1:
        # Single document - just return it
        buf = BytesIO()
        docs[0].save(buf)
        buf.seek(0)
        return buf.read()
    
    # Use docxcompose Composer to merge
    base = docs[0]
    composer = Composer(base)
    
    for doc in docs[1:]:
        composer.append(doc)
    
    # Save merged document
    out = BytesIO()
    composer.save(out)
    out.seek(0)
    return out.read()


def assemble_report(
    session: Session,
    project: Any,
    template_ids: List[int],
    variables: Optional[Dict] = None,
) -> bytes:
    """Assemble a modular report from selected templates.
    
    Main entry point for modular report generation using database templates.
    
    Args:
        session: Database session
        project: Project object with findings
        template_ids: List of template IDs to include (in order)
        variables: Optional user variables (company_name, etc.)
        
    Returns:
        Complete assembled DOCX report as bytes
        
    Raises:
        FileNotFoundError: If a requested template doesn't exist
        ValueError: If template_ids list is empty
    """
    if not template_ids:
        raise ValueError("Must specify at least one template")
    
    # Load templates from database
    templates = []
    for tmpl_id in template_ids:
        tmpl = get_template_by_id(session, tmpl_id)
        if not tmpl:
            raise ValueError(f"Template ID {tmpl_id} not found")
        templates.append(tmpl)
    
    # Get paths and validate all templates exist
    template_paths = [get_template_path(tmpl) for tmpl in templates]
    
    # Build context once for all templates
    context = build_context(project, variables)
    
    # Render each template
    rendered_docs = []
    for tmpl, path in zip(templates, template_paths):
        try:
            # Use template name as module_name for special handling (e.g., "Detailed Findings")
            doc = render_module(path, context, module_name=tmpl.name.lower().replace(" ", "_"))
            rendered_docs.append(doc)
        except Exception as e:
            # Add context about which template failed
            raise RuntimeError(f"Failed to render template '{tmpl.name}': {e}") from e
    
    # Merge all rendered templates
    return merge_documents(rendered_docs)


def assemble_report_legacy(
    project: Any,
    modules: List[str],
    variables: Optional[Dict] = None,
) -> bytes:
    """DEPRECATED: Assemble a modular report from module names.
    
    This function is kept for backward compatibility.
    New code should use assemble_report() with template IDs.
    
    Args:
        project: Project object with findings
        modules: List of module names to include (in order)
        variables: Optional user variables (company_name, etc.)
        
    Returns:
        Complete assembled DOCX report as bytes
        
    Raises:
        FileNotFoundError: If a requested module doesn't exist
        ValueError: If modules list is empty
    """
    if not modules:
        raise ValueError("Must specify at least one module")
    
    # Validate all modules exist before rendering (use legacy path resolution)
    module_paths = [get_module_path(m) for m in modules]
    
    # Build context once for all modules
    context = build_context(project, variables)
    
    # Render each module with module name for special handling
    rendered_docs = []
    for module_name, path in zip(modules, module_paths):
        try:
            doc = render_module(path, context, module_name=module_name)
            rendered_docs.append(doc)
        except Exception as e:
            # Add context about which module failed
            raise RuntimeError(f"Failed to render module '{path.stem}': {e}") from e
    
    # Merge all rendered modules
    return merge_documents(rendered_docs)


def list_available_modules(session: Optional[Session] = None, project_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """List all available report templates from database.
    
    Args:
        session: Optional database session (for API endpoint use)
        project_id: Optional project ID (for future project-specific filtering)
    
    Returns:
        List of dicts with template info (id, name, description, type, etc.)
    """
    if not session:
        # If no session provided, return empty list (caller should provide session)
        return []
    
    # Query all templates with DOCX files
    # For now, show all non-private templates (system + public + user uploads)
    # TODO: Add project_id filtering when model is updated
    stmt = select(ReportTemplate).where(
        ReportTemplate.docx_file_path != None
    )
    templates = session.exec(stmt).all()
    
    modules = []
    for tmpl in templates:
        try:
            path = get_template_path(tmpl)
            exists = path.exists()
        except (FileNotFoundError, ValueError):
            exists = False
            path = None
        
        modules.append({
            "id": tmpl.id,
            "name": tmpl.name,
            "description": tmpl.description or "",
            "template_type": str(tmpl.template_type),
            "exists": exists,
            "path": str(path) if path else None,
            "is_system": tmpl.is_system_template,
            "is_public": tmpl.is_public,
        })
    
    return modules


def _get_module_description(module_name: str) -> str:
    """Get a human-readable description for a module."""
    descriptions = {
        "title_page": "Project title, metadata, and company branding",
        "executive_summary": "High-level overview and key metrics",
        "risk_charts": "Visual risk distribution and trends",
        "top_findings": "Top N critical findings summary",
        "detailed_findings": "Full finding details with all fields",
        "recommendations": "Remediation recommendations and action items",
        "appendix": "Additional technical details and references",
        "sla_status": "SLA tracking and deadline summary",
        "compliance_owasp": "OWASP Top 10 compliance mapping",
        "compliance_cwe": "CWE Top 25 compliance mapping",
        "jira_integration": "Jira ticket status and linking",
    }
    return descriptions.get(module_name, "No description available")
