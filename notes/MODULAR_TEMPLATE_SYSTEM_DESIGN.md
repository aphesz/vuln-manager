# Modular Template System Design - User-Supplied Templates

## Vision
Enable users to upload custom DOCX templates with placeholders that get automatically filled with project data, similar to `report_poc_simple.py` but with modular composition capabilities.

## Architecture

### Current State (v0.11.0)
- ❌ System generates hardcoded templates programmatically
- ❌ Users cannot customize layouts or styles
- ❌ Templates are stored in `backend/app/report_modules/` as system files
- ✅ Module selection and ordering works
- ✅ Context building from project data works
- ✅ Document merging works

### Target State (v0.12.0+)
- ✅ Users upload custom DOCX templates via UI
- ✅ Templates stored per-project or as reusable library
- ✅ Templates use Jinja2 placeholders (same as POC)
- ✅ System fills placeholders with project data
- ✅ Multiple templates can be selected and merged
- ✅ Template library shared across projects

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

### 1. Template Storage Model

```python
class ReportTemplate(SQLModel, table=True):
    """User-uploaded report templates."""
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    description: str | None = None
    category: str  # "executive", "technical", "compliance", "custom"
    is_system: bool = False  # System templates vs user templates
    is_public: bool = False  # Shared across projects
    project_id: int | None = Field(foreign_key="project.id")  # If project-specific
    file_path: str  # Path to DOCX file in storage
    created_at: datetime
    updated_at: datetime
    created_by: str | None  # User email/ID
```

### 2. Template Storage Structure
```
storage/
  templates/
    system/           # Default templates (like current report_modules/)
      executive_summary.docx
      detailed_findings.docx
      ...
    shared/           # User-uploaded shared templates
      {template_id}.docx
    projects/         # Project-specific templates
      {project_id}/
        {template_id}.docx
```

### 3. API Endpoints

```python
# Upload template
POST /projects/{id}/templates/upload
- Multipart form data with DOCX file
- Validates file is valid DOCX
- Stores in project-specific or shared location
- Returns template metadata

# List templates
GET /projects/{id}/templates
- Returns available templates (system + project + shared)
- Includes preview info, placeholder list

# Generate report with custom templates
POST /projects/{id}/report/generate
{
  "template_ids": [1, 5, 8],  # Selected templates in order
  "variables": {"company_name": "Acme Corp", ...}
}
- Loads each template from storage
- Fills with project data
- Merges into single DOCX
- Returns generated report
```

### 4. Context Building (Same as POC)

```python
def build_context_from_project(project: Project) -> Dict:
    """Build comprehensive context with all placeholders."""
    return {
        "project": {
            "name": project.name,
            "consultant_name": project.consultant_name,
            ...
        },
        "findings": [
            {
                "section_number": "1.1",
                "title": "...",
                "risk_rating": "Critical",
                "donut_img": InlineImage(...),  # Generated dynamically
                "affected_resources": "...",
                "description_text": _strip_html(f.description),
                "poc_content": _strip_html(f.poc_description),
                ...
            }
            for f in project.findings
        ],
        "risk_summary": {
            "critical_count": ...,
            "high_count": ...,
            ...
        },
        "variables": {
            "company_name": "...",
            "report_date": "...",
            ...
        }
    }
```

### 5. Template Rendering Engine

```python
def render_user_template(
    template_path: Path,
    project: Project,
    variables: Dict = None,
    module_name: str = ""
) -> Document:
    """Render user-supplied template with project data."""
    
    # Load template
    tpl = DocxTemplate(template_path)
    
    # Build context
    ctx = build_context_from_project(project, variables)
    
    # Special enhancements (donut charts, colored borders)
    if should_add_visualizations(template_path, module_name):
        ctx = enhance_with_visualizations(ctx, tpl)
    
    # Render
    tpl.render(ctx)
    
    # Post-process (colored borders, etc.)
    doc = post_process_document(tpl, ctx, module_name)
    
    return doc
```

## Migration Path

### Phase 1: Template Upload/Storage (v0.12.0)
- [ ] Add `ReportTemplate` model
- [ ] Create storage directory structure
- [ ] Add template upload endpoint
- [ ] Add template list endpoint
- [ ] Copy existing system templates to storage/templates/system/

### Phase 2: User Template Rendering (v0.12.0)
- [ ] Refactor `report_modular.py` to load from storage instead of hardcoded paths
- [ ] Support both system and user templates
- [ ] Validate template placeholders on upload
- [ ] Add template preview/validation

### Phase 3: Frontend UI (v0.12.0)
- [ ] Template upload interface
- [ ] Template library browser
- [ ] Template editor/preview (optional)
- [ ] Drag-drop template selection (existing ModularReportGenerator.tsx)

### Phase 4: Advanced Features (v0.13.0+)
- [ ] Template variables form builder (dynamic based on placeholders)
- [ ] Template sharing/marketplace
- [ ] Template versioning
- [ ] Template inheritance/composition
- [ ] Placeholder documentation generator

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
- `{{ f.description_text }}` - HTML-stripped description
- `{{ f.impact }}` - Impact description
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

1. **Decision Point**: Should we refactor current modular system or create parallel system?
   - Option A: Refactor existing `report_modular.py` to use storage
   - Option B: Keep current system as "quickstart", add new user template system
   
2. **Implementation Priority**: Start with Phase 1 (storage) or go straight to full implementation?

3. **Backward Compatibility**: Keep existing `/report/assemble` endpoint or deprecate?

---
*This design document captures the vision for a user-driven template system inspired by report_poc_simple.py*
