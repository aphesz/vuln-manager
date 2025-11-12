# Report PoC (docxtpl + python-docx)

This proof-of-concept lets you upload a DOCX template and get back a rendered
DOCX with:
- Risk-colored donut chart per finding
- Left outer border colored per finding risk on each finding table

## Endpoint

POST /projects/{project_id}/report/poc
- Body: form-data with field `template_file` = .docx file
- Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document

Optional query params:
- `apply_style` (default: true) — when false, skips left-border styling
- `donut_size_cm` (optional) — size of donut image in centimeters (default ~2.8cm)
- `donut_dpi` (optional) — rendering DPI for donut image (default 150)

Example with curl (replace 1 with your project id):

```
curl -X POST \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "template_file=@/path/to/your/template.docx" \
  "http://localhost:8000/projects/1/report/poc" \
  -o report_poc.docx
```

## Template authoring quickstart

The template now matches your professional report layout with a left donut column
and labeled detail rows on the right.

Compatibility notes:
- Donut images are generated as opaque JPEGs (no transparency) for Word compatibility.
- Dynamic data is sanitized (HTML stripped) to avoid invalid XML in DOCX.
- If you encounter Word open issues, test with:
  - `/projects/{id}/report/poc?apply_style=false` (no border styling)
  - `/projects/{id}/report/poc/raw` (no images, no styling)

### Structure

Create your template in Word (.docx) with a finding block structured as:
- **Left column**: Merged cells for the donut chart ({{ f.donut_img }})
- **Right column**: Labeled rows for finding details

Wrap the entire finding table in a loop:

```
{% for f in findings %}
  [Your 2-column table with 10 rows]
{% endfor %}
```

### Available placeholders

**Header/Section:**
- `{{ f.section_number }}` - Auto-generated section number (1.1.1, 1.1.2, etc.)
- `{{ f.index }}` - Simple numeric index (1, 2, 3...)
- `{{ f.title }}` - Finding title
- `{{ f.risk_rating }}` - Risk level (Critical, High, Medium, Low, Informational)

**Finding details:**
- `{{ f.affected_resources }}` - Comma-separated list of affected URLs/locations
- `{{ f.status }}` - Status (e.g., "New - Unvalidated", "Confirmed", etc.)
- `{{ f.cve_cwe }}` - Extracted CVE/CWE identifiers (auto-detected from description)
- `{{ f.owasp_vector }}` - OWASP category if mapped
- `{{ f.impact }}` - Impact description
- `{{ f.references_url }}` - Reference URL(s)
- `{{ f.description_text }}` - Full finding description (plain text)
- `{{ f.remediation_text }}` - Remediation guidance
- `{{ f.poc_content }}` - Proof of concept narrative (maps to poc_description)
- `{{ f.instances_count }}` - Number of instances found

 New fields added to support richer reporting:
 - `{{ f.review_status }}` - Peer review workflow status (Pending, In Review, Approved, Rejected)
 - `{{ f.reviewer_name }}` - Reviewer name (if any)
 - `{{ f.issue_status }}` - Issue lifecycle status (Open, Partially Closed, Closed)
 - `{{ f.issue_status_comment }}` - Comment/reason for status change
 - `{{ f.jira_issue_key }}` - Linked Jira key (e.g., SEC-123)
 - `{{ f.jira_status }}` - Current Jira ticket status
 - `{{ f.remediation_deadline }}` - SLA due date (YYYY-MM-DD)
 - `{{ f.sla_status }}` - SLA status (On Track, At Risk, Overdue)
 - `{{ f.remediation_owner }}` - Person/Team responsible for remediation
 - `{{ f.discovered_at }}` - First discovered date (YYYY-MM-DD)
 - `{{ f.resolved_at }}` - Resolved date (if any, YYYY-MM-DD)
 - `{{ f.owasp_category }}` - OWASP Top 10 category code (e.g., A01)
 - `{{ f.cwe_id }}` - CWE identifier (e.g., CWE-79)
 - `{{ f.cve_id }}` - CVE identifier (e.g., CVE-2024-1234)
 - `{{ f.cvss_vector }}` - CVSS 3.1 vector string
 - `{{ f.cvss_score }}` - CVSS score (0.0 - 10.0)
 - `{{ f.owasp_likelihood }}` - OWASP Likelihood (1-9)
 - `{{ f.owasp_impact }}` - OWASP Impact (1-9)
 - `{{ f.owasp_risk_rating }}` - OWASP risk rating (Critical/High/Medium/Low)
 - `{{ f.template_id }}` - Linked Vulnerability Template ID (if any)

**Visual elements:**
- `{{ f.donut_img }}` - Risk-colored donut chart (auto-generated JPEG)

### Example table structure

| Left Column (merged, rows 0-9) | Right Column |
|--------------------------------|--------------|
| {{ f.donut_img }}              | **{{ f.section_number }} {{ f.title }}** |
|                                | **AFFECTED RESOURCES:**<br>{{ f.affected_resources }} |
|                                | **STATUS:**<br>{{ f.status }} |
|                                | **CVE / CWE:**<br>{{ f.cve_cwe }} |
|                                | **OWASP RISK VECTOR:**<br>{{ f.owasp_vector }} |
|                                | **IMPACT:**<br>{{ f.impact }} |
|                                | **DESCRIPTION** |
|                                | {{ f.description_text }} |
|                                | **POC / SCREENSHOT** |
|                                | {{ f.poc_content }} |

Optional additional rows you can include in your template:

| Label | Value |
|-------|-------|
| REVIEW STATUS: | {{ f.review_status }} (Reviewer: {{ f.reviewer_name }}) |
| ISSUE STATUS: | {{ f.issue_status }} {{ f.issue_status_comment }} |
| JIRA: | {{ f.jira_issue_key }} ({{ f.jira_status }}) |
| SLA: | {{ f.sla_status }} — Due {{ f.remediation_deadline }} — Owner {{ f.remediation_owner }} |
| DISCOVERED / RESOLVED: | {{ f.discovered_at }} / {{ f.resolved_at }} |
| CVSS: | {{ f.cvss_score }} ({{ f.cvss_vector }}) |
| OWASP: | {{ f.owasp_category }} — L={{ f.owasp_likelihood }} I={{ f.owasp_impact }} — {{ f.owasp_risk_rating }} |
| CWE / CVE: | {{ f.cwe_id }} / {{ f.cve_id }} |

Notes:
- The PoC detects the risk per block by reading the first row text. Keep the
  risk label visible in the first row so the colored left border matches.
- The donut image (`{{ f.donut_img }}`) is injected automatically.
- Only the LEFT outer border is colored; other borders are set to none.

## Colors

The following risk colors are applied:
- Critical: #8B0000
- High: #FF4500
- Medium: #FFA500
- Low: #9ACD32
- Informational: #1976D2

You can change these in `backend/app/report_poc_simple.py` (RISK_COLORS).

Deprecated:
- The original PoC (`report_poc.py`) used PNG donuts and merged cells and is now deprecated. Use the simplified renderer.

## Modular report templates (proposal)

As reports grow, you may want to assemble a final DOCX from multiple reusable sections (modules) such as: Title Page, Executive Summary, Risk Charts, Top Findings, Detailed Findings, Recommendations, Appendix.

Recommended approach:

1) Directory structure for modules

```
backend/app/report_modules/
  title_page.docx.j2
  executive_summary.docx.j2
  risk_charts.docx.j2
  top_findings.docx.j2
  detailed_findings.docx.j2
  recommendations.docx.j2
  appendix.docx.j2
```

Each module is a DOCX template (docxtpl) using the same placeholders documented above. Keep styles consistent (e.g., a shared base theme) to minimize conflicts when merging.

2) API to select modules and order

Add an endpoint (or extend the current PoC) to accept a list/order, for example:

- Query string: `?modules=title_page,executive_summary,risk_charts,detailed_findings,recommendations`
- Or JSON body: `{ "modules": ["title_page", "executive_summary", ...] }`

3) Render each module, then merge into one DOCX

Render every selected module separately with `docxtpl` using the same context, then merge the resulting documents. For robust merging that preserves headers/footers, styles, and images, use `docxcompose`:

Python sketch:

```python
from io import BytesIO
from docx import Document
from docxcompose.composer import Composer
from docxtpl import DocxTemplate

def render_module(tpl_path: str, ctx: dict) -> Document:
  tpl = DocxTemplate(tpl_path)
  tpl.render(ctx)
  buf = BytesIO()
  tpl.save(buf)
  buf.seek(0)
  return Document(buf)

def merge_documents(docs: list[Document]) -> bytes:
  base = docs[0]
  composer = Composer(base)
  for d in docs[1:]:
    composer.append(d)
  out = BytesIO()
  composer.save(out)
  out.seek(0)
  return out.read()

# Usage
docs = [render_module(path, ctx) for path in selected_module_paths]
final_bytes = merge_documents(docs)
```

Note: add `docxcompose` to backend/requirements.txt. If you prefer no new dependency, you can append using python-docx (iterate body elements), but style/header/footer fidelity will be limited.

4) User options and variables

- Reuse the variables system (e.g., `company_name`, `include_charts`, `max_findings`) and pass them in the same context.
- Per-module settings can be supplied via `modules=[{"id":"detailed_findings","settings":{"max_items":50}}]`.

5) Export formats

Start with DOCX assembly, and optionally convert to PDF using a separate pipeline (e.g., LibreOffice headless or other service) if needed. The existing ReportLab PDF flow is separate and can mirror the same module list.

---

## Using the Modular Report System

The modular report system is now fully implemented! Here's how to use it:

### API Endpoints

#### 1. List Available Modules

```bash
GET /report/modules
```

Returns metadata about all available report modules:

```json
{
  "modules": [
    {
      "name": "title_page",
      "exists": true,
      "path": "/app/report_modules/title_page.docx",
      "description": "Project title, metadata, and company branding"
    },
    ...
  ],
  "total": 11,
  "available": 6
}
```

#### 2. Generate Default Module Templates

```bash
GET /report/modules/generate-defaults
```

Creates default DOCX templates for all modules. Run this once to bootstrap your module library.

#### 3. Assemble Modular Report

```bash
POST /projects/{project_id}/report/assemble
Content-Type: application/json

{
  "modules": [
    "title_page",
    "executive_summary",
    "detailed_findings",
    "recommendations"
  ],
  "variables": {
    "company_name": "Acme Corporation",
    "assessment_period": "Q4 2024"
  }
}
```

Returns a complete DOCX report with the selected modules merged in order.

### Usage Examples

**Quick Executive Report:**
```bash
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": ["title_page", "executive_summary", "top_findings", "recommendations"],
    "variables": {"company_name": "Acme Corp"}
  }' \
  -o executive_report.docx
```

**Full Technical Report:**
```bash
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      "title_page",
      "executive_summary",
      "risk_charts",
      "detailed_findings",
      "sla_status",
      "jira_integration",
      "recommendations",
      "appendix"
    ],
    "variables": {
      "company_name": "Acme Corporation",
      "assessment_period": "October - November 2024",
      "include_charts": true
    }
  }' \
  -o full_technical_report.docx
```

**Compliance-Focused Report:**
```bash
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      "title_page",
      "executive_summary",
      "compliance_owasp",
      "compliance_cwe",
      "recommendations"
    ]
  }' \
  -o compliance_report.docx
```

### Customizing Module Templates

1. **Generate defaults** (if not already done):
   ```bash
   curl http://localhost:8000/report/modules/generate-defaults
   ```

2. **Edit templates** in Word/LibreOffice:
   - Open `backend/app/report_modules/title_page.docx`
   - Modify layout, fonts, colors, and styles
   - Keep Jinja2 placeholders intact (e.g., `{{ project.name }}`)
   - Save the file

3. **Test your changes**:
   ```bash
   curl -X POST "http://localhost:8000/projects/1/report/assemble" \
     -H "Content-Type: application/json" \
     -d '{"modules": ["title_page"]}' \
     -o test.docx
   ```

### Creating New Modules

1. Create a new DOCX file in `backend/app/report_modules/`
2. Add Jinja2 placeholders from the available context (see above)
3. Add the module name to `AVAILABLE_MODULES` in `backend/app/report_modular.py`
4. Add a description in `_get_module_description()`
5. Use it in API requests: `{"modules": ["your_new_module"]}`

### Module Variables Reference

**Project-level:**
- `project.name` - Project name
- `project.consultant_name` - Consultant/analyst name
- `total_findings` - Total finding count
- `critical_count`, `high_count`, `medium_count`, `low_count`, `informational_count` - Risk counts
- `overdue_count`, `at_risk_count`, `on_track_count` - SLA status counts
- `report_date` - Current date (formatted)
- `assessment_period` - Custom period string (from variables)
- `company_name` - Company/client name (from variables)

**Finding loop** (`{% for f in findings %}`):
All placeholders listed in the "Available placeholders" section above are available.

### Tips

- **Performance**: Keep modules focused; avoid duplicating the same finding loop in multiple modules
- **Styling**: Use a consistent Word theme/style across modules for seamless merging
- **Images**: The donut chart generation works in module templates just like in the POC renderer
- **Conditionals**: Use Jinja2 conditionals for dynamic sections: `{% if critical_count > 0 %}...{% endif %}`
- **Loops**: Filter findings: `{% for f in findings if f.risk_rating == 'Critical' %}...{% endfor %}`
