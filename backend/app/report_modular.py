"""
Modular DOCX report generation system.

Allows assembling reports from multiple reusable template modules
that can be selected, ordered, and merged into a single DOCX output.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import List, Dict, Optional, Any
import json
from datetime import datetime

from docxtpl import DocxTemplate
from docx import Document
from docxcompose.composer import Composer

from app.report_poc_simple import _strip_html, _fmt_dt, _normalize_risk_label


MODULE_DIR = Path(__file__).parent / "report_modules"

# Available module names (without .docx extension)
AVAILABLE_MODULES = [
    "title_page",
    "executive_summary",
    "risk_charts",
    "top_findings",
    "detailed_findings",
    "recommendations",
    "appendix",
    "sla_status",
    "compliance_owasp",
    "compliance_cwe",
    "jira_integration",
]


def get_module_path(module_name: str) -> Path:
    """Get the file path for a module template.
    
    Args:
        module_name: Module name without .docx extension
        
    Returns:
        Path to the module DOCX file
        
    Raises:
        FileNotFoundError: If module doesn't exist
    """
    path = MODULE_DIR / f"{module_name}.docx"
    if not path.exists():
        raise FileNotFoundError(f"Module '{module_name}' not found at {path}")
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
            "description_text": description_text[:500] if len(description_text) > 500 else description_text,
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


def render_module(module_path: Path, context: Dict) -> Document:
    """Render a single module template with the given context.
    
    Args:
        module_path: Path to the module DOCX template
        context: Full context dict for Jinja2 rendering
        
    Returns:
        Rendered Document object
    """
    tpl = DocxTemplate(module_path)
    tpl.render(context)
    
    # Save to BytesIO and reload as Document for merging
    buf = BytesIO()
    tpl.save(buf)
    buf.seek(0)
    return Document(buf)


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
    project: Any,
    modules: List[str],
    variables: Optional[Dict] = None,
) -> bytes:
    """Assemble a modular report from selected modules.
    
    Main entry point for modular report generation.
    
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
    
    # Validate all modules exist before rendering
    module_paths = [get_module_path(m) for m in modules]
    
    # Build context once for all modules
    context = build_context(project, variables)
    
    # Render each module
    rendered_docs = []
    for path in module_paths:
        try:
            doc = render_module(path, context)
            rendered_docs.append(doc)
        except Exception as e:
            # Add context about which module failed
            raise RuntimeError(f"Failed to render module '{path.stem}': {e}") from e
    
    # Merge all rendered modules
    return merge_documents(rendered_docs)


def list_available_modules() -> List[Dict[str, Any]]:
    """List all available report modules with metadata.
    
    Returns:
        List of dicts with module info (name, exists, description)
    """
    modules = []
    for name in AVAILABLE_MODULES:
        path = MODULE_DIR / f"{name}.docx"
        modules.append({
            "name": name,
            "exists": path.exists(),
            "path": str(path),
            "description": _get_module_description(name),
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
