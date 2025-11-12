# Modular Reports - Quick Reference Card

## 🚀 Quick Start (3 Steps)

```bash
# 1. Generate templates
curl http://localhost:8000/report/modules/generate-defaults

# 2. List modules
curl http://localhost:8000/report/modules

# 3. Assemble report
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{"modules": ["title_page", "executive_summary", "detailed_findings"]}' \
  -o report.docx
```

## 📦 Available Modules

| Module | Description | Use Case |
|--------|-------------|----------|
| `title_page` | Project metadata & branding | All reports |
| `executive_summary` | High-level metrics | Management |
| `detailed_findings` | Full finding details | Technical |
| `top_findings` | Top 10 summary | Quick review |
| `recommendations` | Action items | All reports |
| `sla_status` | Deadline tracking | PM/Leadership |
| `risk_charts` | Visual analytics | Presentations |
| `compliance_owasp` | OWASP mapping | Compliance |
| `compliance_cwe` | CWE mapping | Security audit |
| `jira_integration` | Ticket status | DevOps |
| `appendix` | Technical details | Reference |

## 🎯 Common Report Types

### Executive Report
```json
{
  "modules": ["title_page", "executive_summary", "top_findings", "recommendations"],
  "variables": {"company_name": "Acme Corp"}
}
```

### Technical Report
```json
{
  "modules": [
    "title_page",
    "executive_summary",
    "detailed_findings",
    "sla_status",
    "recommendations"
  ]
}
```

### Compliance Report
```json
{
  "modules": [
    "title_page",
    "compliance_owasp",
    "compliance_cwe",
    "recommendations"
  ]
}
```

### SLA Report
```json
{
  "modules": ["title_page", "sla_status", "jira_integration"]
}
```

## 🔧 Customization

### Edit Template
```bash
# 1. Open in Word
open backend/app/report_modules/title_page.docx

# 2. Edit (keep {{ placeholders }})

# 3. Save and test
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{"modules": ["title_page"]}' \
  -o test.docx
```

### Add Custom Module
```bash
# 1. Create DOCX
cp backend/app/report_modules/title_page.docx \
   backend/app/report_modules/my_module.docx

# 2. Edit content with placeholders

# 3. Add to AVAILABLE_MODULES in report_modular.py

# 4. Use it
curl ... -d '{"modules": ["my_module"]}'
```

## 📝 Top 20 Placeholders

### Project
- `{{ project.name }}` - Project name
- `{{ project.consultant_name }}` - Consultant
- `{{ total_findings }}` - Finding count
- `{{ critical_count }}` - Critical count
- `{{ high_count }}` - High count

### Finding Loop (`{% for f in findings %}`)
- `{{ f.title }}` - Title
- `{{ f.risk_rating }}` - Risk level
- `{{ f.description_text }}` - Description
- `{{ f.remediation_text }}` - Remediation
- `{{ f.affected_resources }}` - Locations
- `{{ f.instances_count }}` - Instance count
- `{{ f.cvss_score }}` - CVSS score
- `{{ f.cwe_id }}` - CWE identifier
- `{{ f.sla_status }}` - SLA status
- `{{ f.remediation_deadline }}` - Due date
- `{{ f.jira_issue_key }}` - Jira ticket
- `{{ f.review_status }}` - Review status
- `{{ f.issue_status }}` - Issue status
- `{{ f.discovered_at }}` - Discovery date
- `{{ f.poc_content }}` - POC description

## 🆘 Troubleshooting

### Module not found
```bash
curl http://localhost:8000/report/modules/generate-defaults
```

### Import error
```bash
docker exec -it vuln-manager-backend pip install docxcompose>=1.4.0
docker-compose restart backend
```

### Template won't render
1. Validate placeholders (see REPORT_POC_USAGE.md)
2. Regenerate template
3. Check logs for Jinja2 errors

## 📚 Documentation

- **Usage**: `notes/REPORT_POC_USAGE.md`
- **Integration**: `notes/MODULAR_REPORT_INTEGRATION_GUIDE.md`
- **Implementation**: `notes/MODULAR_REPORT_IMPLEMENTATION.md`
- **Code**: `backend/app/report_modular.py`

## 🎨 Variables

Pass custom variables to templates:

```json
{
  "modules": [...],
  "variables": {
    "company_name": "Acme Corp",
    "assessment_period": "Q4 2024",
    "report_date": "November 12, 2025",
    "custom_footer": "Confidential - Internal Use Only"
  }
}
```

## 📊 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/report/modules` | GET | List modules |
| `/report/modules/generate-defaults` | GET | Generate templates |
| `/projects/{id}/report/assemble` | POST | Assemble report |

## ✅ Validation

```bash
# Run tests
docker exec -it vuln-manager-backend python test_modular_reports.py

# Expected output:
# ✅ PASS: Imports
# ✅ PASS: Module Listing
# ✅ PASS: Date Formatter
# ✅ PASS: HTML Stripper
# ✅ PASS: Module Paths
# Total: 5/5 tests passed
# 🎉 All tests passed! System is ready.
```

---

**Version:** v0.11.0  
**Updated:** November 12, 2025  
**Status:** Ready for Testing 🚀
