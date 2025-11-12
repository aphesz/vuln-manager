# Report Modules

This directory contains reusable DOCX template modules for modular report generation.

## 🚀 Quick Start

### Generate Default Templates
```bash
# Via API (Recommended)
curl http://localhost:8000/report/modules/generate-defaults

# Via Python
docker exec -it vuln-manager-backend python -m app.report_modules.generate_templates
```

### Use Templates
```bash
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{"modules": ["title_page", "executive_summary", "detailed_findings"]}' \
  -o report.docx
```

## 📦 Available Modules

### Core Modules
- `title_page.docx` - Project title, metadata, and company branding
- `executive_summary.docx` - High-level overview and key metrics
- `risk_charts.docx` - Visual risk distribution and trends
- `top_findings.docx` - Top N critical findings summary
- `detailed_findings.docx` - Full finding details with all fields
- `recommendations.docx` - Remediation recommendations and action items
- `appendix.docx` - Additional technical details and references

### Specialized Modules
- `compliance_owasp.docx` - OWASP Top 10 compliance mapping
- `compliance_cwe.docx` - CWE Top 25 compliance mapping
- `sla_status.docx` - SLA tracking and deadline summary
- `jira_integration.docx` - Jira ticket status and linking

## Module Template Format

Each module is a DOCX file with Jinja2 placeholders (docxtpl syntax). Use the same context variables documented in `REPORT_POC_USAGE.md`.

### Common Context Variables

**Project-level:**
- `{{ project.name }}` - Project name
- `{{ total_findings }}` - Total finding count

**Finding loop:**
```
{% for f in findings %}
  {{ f.title }}
  {{ f.risk_rating }}
  {{ f.description_text }}
  ... (see full list in REPORT_POC_USAGE.md)
{% endfor %}
```

## Creating New Modules

1. Create a DOCX in Word/LibreOffice with your desired layout
2. Insert Jinja2 placeholders using `{{ variable }}` or `{% for ... %}`
3. Save as `.docx` in this directory
4. Reference the module name (without extension) in API requests

## Module Generation Script

Run `python -m app.report_modules.generate_templates` to create default module templates programmatically.
