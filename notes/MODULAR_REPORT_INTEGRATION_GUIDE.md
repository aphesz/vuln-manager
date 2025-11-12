# Modular Report System - Integration Guide

## Quick Setup (Docker Environment)

### 1. Install Dependencies

```bash
# Enter the backend container
docker exec -it vuln-manager-backend bash

# Install docxcompose
pip install docxcompose>=1.4.0

# Verify installation
python -c "from docxcompose.composer import Composer; print('✅ docxcompose installed')"
```

### 2. Generate Default Templates

**Option A: Via API (Recommended)**
```bash
curl http://localhost:8000/report/modules/generate-defaults
```

**Option B: Via Python Script**
```bash
docker exec -it vuln-manager-backend python -m app.report_modules.generate_templates
```

### 3. Verify Installation

```bash
# Run validation tests
docker exec -it vuln-manager-backend python test_modular_reports.py

# List available modules
curl http://localhost:8000/report/modules
```

### 4. Test Report Generation

```bash
# First, ensure you have at least one project with findings
# Then assemble a report:

curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": ["title_page", "executive_summary", "detailed_findings"],
    "variables": {
      "company_name": "Test Corp",
      "assessment_period": "November 2024"
    }
  }' \
  -o test_report.docx

# Open the report
open test_report.docx  # macOS
xdg-open test_report.docx  # Linux
```

## Local Development Setup (Without Docker)

### 1. Install Dependencies

```bash
cd /Users/hk/Docker/vuln-manager/backend

# Create/activate virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install all requirements
pip install -r requirements.txt
```

### 2. Generate Templates

```bash
cd /Users/hk/Docker/vuln-manager/backend
python -m app.report_modules.generate_templates
```

### 3. Run Tests

```bash
python test_modular_reports.py
```

## Customizing Module Templates

### 1. Edit Existing Templates

```bash
# Open template in Word/LibreOffice
open backend/app/report_modules/title_page.docx

# Make changes (keep Jinja2 placeholders intact)
# Save the file

# Test your changes
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{"modules": ["title_page"]}' \
  -o test.docx && open test.docx
```

### 2. Create New Templates

```bash
# 1. Create DOCX file in report_modules/
cp backend/app/report_modules/title_page.docx \
   backend/app/report_modules/my_custom_module.docx

# 2. Edit the new template with your content and placeholders

# 3. Add to AVAILABLE_MODULES in report_modular.py
# 4. Add description in _get_module_description()
# 5. Use in API: {"modules": ["my_custom_module"]}
```

## Common Use Cases

### Executive Summary Report (Quick)

```bash
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": ["title_page", "executive_summary", "top_findings", "recommendations"]
  }' \
  -o exec_summary.docx
```

### Full Technical Report

```bash
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      "title_page",
      "executive_summary",
      "detailed_findings",
      "sla_status",
      "recommendations"
    ],
    "variables": {
      "company_name": "Acme Corporation",
      "assessment_period": "Q4 2024"
    }
  }' \
  -o full_report.docx
```

### SLA-Focused Report

```bash
curl -X POST "http://localhost:8000/projects/1/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": ["title_page", "sla_status", "recommendations"]
  }' \
  -o sla_report.docx
```

## Troubleshooting

### Issue: "Module not found" error

**Solution:**
```bash
# Generate default templates
curl http://localhost:8000/report/modules/generate-defaults

# Or manually run the generator
docker exec -it vuln-manager-backend python -m app.report_modules.generate_templates
```

### Issue: Import errors in logs

**Solution:**
```bash
# Install missing dependency
docker exec -it vuln-manager-backend pip install docxcompose>=1.4.0

# Restart container
docker-compose restart backend
```

### Issue: Template rendering fails

**Solution:**
1. Check that placeholders are valid (see REPORT_POC_USAGE.md)
2. Verify template files aren't corrupted
3. Regenerate templates: `curl http://localhost:8000/report/modules/generate-defaults`

### Issue: DOCX won't open in Word

**Solution:**
1. Try raw endpoint first: `POST /projects/{id}/report/poc/raw`
2. Check for invalid XML characters in finding data
3. Validate template by opening manually before rendering

## API Reference

### List Modules
```
GET /report/modules
```

Response:
```json
{
  "modules": [
    {
      "name": "title_page",
      "exists": true,
      "path": "/app/report_modules/title_page.docx",
      "description": "Project title, metadata, and company branding"
    }
  ],
  "total": 11,
  "available": 6
}
```

### Generate Defaults
```
GET /report/modules/generate-defaults
```

Response:
```json
{
  "message": "Successfully generated default module templates",
  "modules": [...]
}
```

### Assemble Report
```
POST /projects/{project_id}/report/assemble
Content-Type: application/json

{
  "modules": ["title_page", "executive_summary", "detailed_findings"],
  "variables": {
    "company_name": "Acme Corp",
    "assessment_period": "November 2024"
  }
}
```

Response: DOCX file (application/vnd.openxmlformats-officedocument.wordprocessingml.document)

## Next Steps

1. **Test the system**: Generate templates and create a test report
2. **Customize templates**: Edit the default templates to match your branding
3. **Create custom modules**: Add new modules for specific use cases
4. **Integrate with frontend**: Build a UI for module selection
5. **Add PDF export**: Implement DOCX-to-PDF conversion

## Support

- Documentation: `notes/REPORT_POC_USAGE.md`
- Implementation: `notes/MODULAR_REPORT_IMPLEMENTATION.md`
- Code: `backend/app/report_modular.py`
- Templates: `backend/app/report_modules/`
