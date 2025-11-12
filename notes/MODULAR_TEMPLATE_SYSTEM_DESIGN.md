# Modular Template System Design - User-Supplied Templates

**Status**: ✅ **IMPLEMENTED** (v0.12.1)  
**Last Updated**: November 12, 2025

## Executive Summary

The Modular Template System enables users to upload custom DOCX templates with Jinja2 placeholders that are automatically filled with project data. This system was inspired by `report_poc_simple.py` and extends it with modular composition capabilities.

### Key Features Delivered
- ✅ User-uploadable DOCX templates with full styling control
- ✅ 11 pre-built system templates for common report sections
- ✅ Drag-and-drop template selection and ordering
- ✅ Automatic donut chart generation with risk labels
- ✅ Risk-based colored table borders
- ✅ Template management (upload, delete, verify)
- ✅ Docker volume persistence
- ✅ Full-text rendering (no truncation)
- ✅ Database-backed template library
- ✅ Public/private template sharing

### Architecture
- **Backend**: FastAPI + SQLModel + docxtpl (Jinja2) + docxcompose
- **Storage**: Filesystem-backed with Docker volume mount
- **Frontend**: React + Material-UI + react-beautiful-dnd
- **Database**: PostgreSQL with migration 021

---

## Vision
Enable users to upload custom DOCX templates with placeholders that get automatically filled with project data, similar to `report_poc_simple.py` but with modular composition capabilities.

## Architecture

### Current State (v0.12.1) ✅ COMPLETE
- ✅ Users upload custom DOCX templates via UI
- ✅ Templates stored per-project or as reusable library
- ✅ Templates use Jinja2 placeholders (same as POC)
- ✅ System fills placeholders with project data
- ✅ Multiple templates can be selected and merged
- ✅ Template library shared across projects (public templates)
- ✅ Module selection and ordering works (drag & drop)
- ✅ Context building from project data works
- ✅ Document merging works (docxcompose)
- ✅ Donut charts with risk labels in custom templates
- ✅ Colored table borders in custom templates
- ✅ Template management (delete, verify)
- ✅ Docker volume persistence for template storage
- ✅ Full-text descriptions (no truncation)

## Design Pattern: report_poc_simple.py

### Core Flow
```python
# 1. User provides template with placeholders
template_path = "/path/to/user_template.docx"

# 2. Load template
tpl = DocxTemplate(template_path)

# 3. Build context from project data
ctx = build_context_from_project(project)

# 4. Render template with context
tpl.render(ctx)

# 5. Return filled document
return tpl.docx_bytes
```

### Key Features to Preserve
1. **User-supplied templates** - users control layout, fonts, styles, branding
2. **Jinja2 placeholders** - `{{ f.title }}`, `{% for f in findings %}`, etc.
3. **InlineImage support** - `{{ f.donut_img }}` for dynamic charts
4. **HTML stripping** - Safe text insertion with `_strip_html()`
5. **Colored borders** - Risk-based visual styling with `_set_table_left_border()`

## Proposed Implementation

### 1. Template Storage Model ✅ IMPLEMENTED

```python
class ReportTemplate(SQLModel, table=True):
    """User-uploaded report templates - v0.12.0"""
    __tablename__ = "report_template"
    
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    description: str | None = None
    template_type: str  # "Executive", "Technical", "Compliance", "Custom"
    
    # Template storage
    docx_file_path: str | None = None  # Relative path: system/, shared/, projects/{id}/
    sections: str = Field(default="[]")  # JSON list of section names (legacy)
    variables: str = Field(default="[]")  # JSON list of required variables (legacy)
    
    # Access control
    is_system_template: bool = Field(default=False)
    is_public: bool = Field(default=False)  # Shared across projects
    created_by_user_id: int | None = Field(default=None, foreign_key="user.id")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**Storage Structure:**
```
backend/storage/templates/
  ├── system/              # 11 system templates (seeded via seed_system_templates.py)
  │   ├── title_page.docx
  │   ├── executive_summary.docx
  │   ├── detailed_findings.docx
  │   ├── top_findings.docx
  │   ├── recommendations.docx
  │   ├── risk_charts.docx
  │   ├── sla_status.docx
  │   ├── appendix.docx
  │   ├── compliance_owasp.docx
  │   ├── compliance_cwe.docx
  │   └── jira_integration.docx
  ├── shared/              # Public user templates (is_public=True)
  │   └── {filename}.docx
  └── projects/            # Project-specific templates
      └── {project_id}/
          └── {filename}.docx
```

**Docker Volume Mount:**
```yaml
# docker-compose.yml
backend:
  volumes:
    - ./backend/app:/app
    - ./backend/storage:/code/storage  # Persists templates across rebuilds
```

### 2. API Endpoints ✅ IMPLEMENTED

```python
# Upload custom template
POST /projects/{id}/templates/upload
Content-Type: multipart/form-data
{
  "file": <DOCX file>,
  "name": "My Custom Template",
  "description": "Custom report for client X",
  "template_type": "Custom",
  "is_public": false
}
Response: Template metadata with file path

# List available templates
GET /projects/{id}/templates
Response: {
  "system_templates": [...],
  "custom_templates": [...]
}

# Verify template file integrity
GET /projects/{id}/templates/verify
Response: {
  "total_templates": 11,
  "valid_templates": 11,
  "invalid_templates": 0,
  "templates": [{
    "id": 5,
    "name": "Title Page",
    "file_exists": true,
    "error_message": null
  }, ...]
}

# Delete custom template
DELETE /projects/{id}/templates/{template_id}
Response: 204 No Content (deletes both DB record and file)

# Generate report with selected templates
POST /projects/{id}/report/assemble/v2
Content-Type: application/json
{
  "template_ids": [5, 6, 7],  # Selected templates in order
  "variables": {
    "company_name": "Acme Corp",
    "report_date": "2025-11-12",
    "report_version": "1.0",
    "consultant_email": "consultant@example.com",
    "assessment_period": "Q4 2025"
  }
}
Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

### 3. Context Building ✅ IMPLEMENTED (report_modular.py)

```python
def build_context(project: Any, variables: Optional[Dict] = None) -> Dict:
    """Build comprehensive context with all placeholders.
    
    Features:
    - Full HTML-stripped text (no truncation on descriptions)
    - Risk-based sorting (Critical → High → Medium → Low → Informational)
    - SLA status counters
    - Extended metadata (CVE, CWE, CVSS, OWASP, Jira)
    """
    return {
        "project": {
            "name": project.name,
            "consultant_name": project.consultant_name,
        },
        "findings": [
            {
                "section_number": f"1.1.{idx}",
                "title": f.title,
                "risk_rating": "Critical|High|Medium|Low|Informational",
                "donut_img": InlineImage(...),  # Generated dynamically for ALL templates
                "has_donut": True,
                "instances_count": len(instances),
                "affected_resources": "URL1, URL2 (+3 more)",
                "description_text": _strip_html(f.description),  # FULL TEXT
                "impact": _strip_html(f.impact),
                "remediation_text": _strip_html(f.remediation),
                "poc_content": _strip_html(f.poc_description),
                "references_url": f.references_url or "N/A",
                "issue_status": "Open|Closed|Reopened",
                "review_status": "Pending|Approved|Rejected",
                "reviewer_name": f.reviewer_name or "N/A",
                "sla_status": "On Track|At Risk|Overdue",
                "remediation_deadline": "2025-12-31",
                "remediation_owner": "John Doe",
                "jira_issue_key": "VULN-123",
                "jira_status": "To Do|In Progress|Done",
                "cve_id": "CVE-2024-12345",
                "cwe_id": "CWE-79",
                "cvss_score": 9.8,
                "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                "owasp_category": "A03:2021",
                "owasp_risk_rating": "High",
                "discovered_at": "2025-11-01",
                "resolved_at": "N/A",
            }
            for idx, f in enumerate(project.findings, start=1)
        ],
        "total_findings": len(findings),
        "critical_count": 2,
        "high_count": 5,
        "medium_count": 8,
        "low_count": 3,
        "informational_count": 1,
        "overdue_count": 2,
        "at_risk_count": 3,
        "on_track_count": 13,
        # User-provided variables
        "company_name": variables.get("company_name", "N/A"),
        "report_date": variables.get("report_date", datetime.now().strftime("%Y-%m-%d")),
        "report_version": variables.get("report_version", "1.0"),
        "consultant_email": variables.get("consultant_email", "N/A"),
        "assessment_period": variables.get("assessment_period", "N/A"),
    }
```

### 4. Template Rendering Engine ✅ IMPLEMENTED (report_modular.py)

```python
def render_module(
    module_path: Path,
    context: Dict,
    module_name: str = ""
) -> Document:
    """Render user-supplied template with project data.
    
    Features (v0.12.1):
    - Donut charts automatically added to ALL templates with findings
    - Colored table borders automatically applied to ALL templates
    - InlineImage support for dynamic charts
    - HTML stripping for safe text insertion
    - Full document merging with docxcompose
    """
    
    tpl = DocxTemplate(module_path)
    
    # Add donut charts for ANY template with findings (not just detailed_findings)
    if "findings" in context and context["findings"]:
        enhanced_findings = []
        for f_ctx in context["findings"]:
            risk = f_ctx.get("risk_rating", "Low")
            color = RISK_COLORS.get(risk, "DDDDDD")
            
            # Generate donut chart image
            try:
                donut_stream = _generate_donut_image(risk, color, size_inches=1.2, dpi=150)
                donut_img = InlineImage(tpl, donut_stream, Cm(3.0))
                f_ctx["donut_img"] = donut_img
                f_ctx["has_donut"] = True
            except Exception as e:
                f_ctx["donut_img"] = f"[{risk}]"
                f_ctx["has_donut"] = False
            
            enhanced_findings.append(f_ctx)
        
        context["findings"] = enhanced_findings
    
    # Render template
    tpl.render(context)
    
    # Save and reload as Document
    buf = BytesIO()
    tpl.save(buf)
    buf.seek(0)
    doc = Document(buf)
    
    # Post-process: Add colored left borders to tables in ANY template with findings
    if "findings" in context and context["findings"]:
        findings_iter = iter(context["findings"])
        for tbl in doc.tables:
            try:
                finding = next(findings_iter)
                color = RISK_COLORS.get(finding.get("risk_rating", "Low"), "DDDDDD")
                _set_table_left_border(tbl, color)  # From report_poc_simple.py
            except StopIteration:
                break
    
    return doc


def assemble_report(
    session: Session,
    project: Any,
    template_ids: List[int],
    variables: Optional[Dict] = None,
) -> bytes:
    """Assemble modular report from selected templates.
    
    Main entry point for v0.12.0+ unified template system.
    """
    # Load templates from database
    templates = [get_template_by_id(session, id) for id in template_ids]
    template_paths = [get_template_path(tmpl) for tmpl in templates]
    
    # Build context once for all templates
    context = build_context(project, variables)
    
    # Render each template
    rendered_docs = [
        render_module(path, context, module_name=tmpl.name.lower().replace(" ", "_"))
        for tmpl, path in zip(templates, template_paths)
    ]
    
    # Merge all rendered templates with docxcompose
    return merge_documents(rendered_docs)
```

## Implementation Status

### Phase 1: Template Upload/Storage ✅ COMPLETE (v0.12.0)
- ✅ Added `ReportTemplate` model (migration 021)
- ✅ Created storage directory structure (backend/storage/templates/)
- ✅ Added template upload endpoint (POST /projects/{id}/templates/upload)
- ✅ Added template list endpoint (GET /projects/{id}/templates)
- ✅ Seeded 11 system templates via seed_system_templates.py
- ✅ Docker volume mount for persistence (./backend/storage:/code/storage)

### Phase 2: User Template Rendering ✅ COMPLETE (v0.12.0)
- ✅ Refactored `report_modular.py` to load from storage
- ✅ Support both system and user templates
- ✅ Unified template system (database-backed)
- ✅ Template validation on upload (DOCX format check)

### Phase 3: Frontend UI ✅ COMPLETE (v0.12.0)
- ✅ Template upload interface with file picker
- ✅ Template library browser (system + custom)
- ✅ Drag-drop template selection (react-beautiful-dnd)
- ✅ Template delete button with confirmation dialog
- ✅ Template verification UI (missing file warnings)
- ✅ "Generate Reports" button on Dashboard Quick Actions

### Phase 4: Template Management ✅ COMPLETE (v0.12.1)
- ✅ Delete custom templates (DELETE endpoint)
- ✅ Verify template file integrity (GET /verify endpoint)
- ✅ Warning badges for missing template files
- ✅ Donut charts in ALL custom templates (not just system templates)
- ✅ Colored table borders in ALL custom templates
- ✅ Full-text descriptions (removed 500-char truncation)

### Phase 5: Advanced Features 🚧 PLANNED (v0.13.0+)
- [ ] Template variables form builder (dynamic based on placeholders)
- [ ] Template sharing/marketplace
- [ ] Template versioning (save revisions)
- [ ] Template inheritance/composition
- [ ] Placeholder documentation generator
- [ ] Template preview in UI
- [ ] Bulk template operations
- [ ] Template categories/tags

## Available Placeholders (Complete List)

### Project Level
- `{{ project.name }}` - Project name
- `{{ project.consultant_name }}` - Consultant name
- `{{ report_date }}` - Report generation date
- `{{ company_name }}` - Client company name
- `{{ assessment_period }}` - Assessment timeframe

### Risk Summary
- `{{ total_findings }}` - Total finding count
- `{{ critical_count }}` - Critical findings count
- `{{ high_count }}` - High findings count
- `{{ medium_count }}` - Medium findings count
- `{{ low_count }}` - Low findings count
- `{{ informational_count }}` - Informational findings count

### SLA Summary
- `{{ overdue_count }}` - Overdue findings count
- `{{ at_risk_count }}` - At-risk findings count
- `{{ on_track_count }}` - On-track findings count

### Finding Loop ({% for f in findings %})
- `{{ f.section_number }}` - Finding number (e.g., "1.1")
- `{{ f.title }}` - Finding title
- `{{ f.risk_rating }}` - Risk level (Critical/High/Medium/Low)
- `{{ f.donut_img }}` - Risk donut chart (InlineImage)
- `{{ f.instances_count }}` - Number of instances
- `{{ f.affected_resources }}` - Affected URLs/systems
- `{{ f.description_text }}` - HTML-stripped description (FULL TEXT, no truncation)
- `{{ f.impact }}` - Impact description (FULL TEXT)
- `{{ f.remediation_text }}` - Remediation guidance
- `{{ f.poc_content }}` - Proof of concept
- `{{ f.references_url }}` - Reference links
- `{{ f.issue_status }}` - Status (Open/Closed/etc.)
- `{{ f.review_status }}` - Review status
- `{{ f.reviewer_name }}` - Reviewer name
- `{{ f.sla_status }}` - SLA status
- `{{ f.remediation_deadline }}` - Remediation due date
- `{{ f.remediation_owner }}` - Owner name
- `{{ f.jira_issue_key }}` - Jira ticket key
- `{{ f.jira_status }}` - Jira status
- `{{ f.cve_id }}` - CVE identifier
- `{{ f.cwe_id }}` - CWE identifier
- `{{ f.cvss_score }}` - CVSS score
- `{{ f.cvss_vector }}` - CVSS vector
- `{{ f.owasp_category }}` - OWASP category
- `{{ f.owasp_risk_rating }}` - OWASP risk rating
- `{{ f.discovered_at }}` - Discovery date
- `{{ f.resolved_at }}` - Resolution date

## Example User Template

```xml
<!-- User creates this in Microsoft Word with placeholders -->

Security Assessment Report
{{ company_name }}

Report Date: {{ report_date }}
Consultant: {{ project.consultant_name }}

EXECUTIVE SUMMARY
This assessment of {{ project.name }} identified {{ total_findings }} security findings.

Critical Priority: {{ critical_count }}
High Priority: {{ high_count }}

DETAILED FINDINGS
{% for f in findings %}

{{ f.section_number }} {{ f.title }} ({{ f.risk_rating }})
{{ f.donut_img }}

Affected: {{ f.affected_resources }}
CVE/CWE: {{ f.cve_id }} / {{ f.cwe_id }}
CVSS: {{ f.cvss_score }}

Description:
{{ f.description_text }}

Impact:
{{ f.impact }}

Remediation:
{{ f.remediation_text }}

Proof of Concept:
{{ f.poc_content }}

References: {{ f.references_url }}

{% endfor %}
```

## Benefits

### For Users
1. **Full Control** - Users design layouts, fonts, colors, branding
2. **Reusability** - Save templates for future projects
3. **Flexibility** - Mix system and custom templates
4. **No Code** - Just Word + placeholders

### For Platform
1. **Scalability** - Easy to add new placeholders
2. **Maintainability** - Less hardcoded template generation
3. **Extensibility** - Users can add custom sections
4. **Compliance** - Users create industry-specific templates

## Next Steps

### Immediate Priorities (v0.12.2)
1. **Template Preview** - Show rendered preview before generating full report
2. **Variable Form Builder** - Auto-generate UI form fields from template placeholders
3. **Template Validation** - Check for required placeholders on upload

### Future Enhancements (v0.13.0+)
1. **Template Marketplace** - Share templates between organizations
2. **Version Control** - Track template changes over time
3. **Template Editor** - In-browser DOCX editing
4. **Smart Placeholders** - Auto-suggest available placeholders while editing

### Open Questions
1. ~~Should we refactor current modular system or create parallel system?~~ ✅ RESOLVED: Unified system implemented
2. ~~Implementation Priority: Start with Phase 1 (storage) or go straight to full implementation?~~ ✅ RESOLVED: Full implementation complete
3. ~~Backward Compatibility: Keep existing `/report/assemble` endpoint or deprecate?~~ ✅ RESOLVED: New endpoint `/report/assemble/v2` added

---
*Last Updated: v0.12.1 (November 12, 2025)*  
*This design document captures the vision and implementation of the user-driven template system inspired by report_poc_simple.py*
