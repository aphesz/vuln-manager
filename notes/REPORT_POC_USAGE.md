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
- `{{ f.impact }}` - Impact description (currently empty, can be populated)
- `{{ f.description_text }}` - Full finding description (plain text)
- `{{ f.remediation_text }}` - Remediation guidance
- `{{ f.poc_content }}` - Proof of concept / screenshots section
- `{{ f.instances_count }}` - Number of instances found

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
