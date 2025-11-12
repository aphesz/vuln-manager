# 🧪 Modular Reports Testing Guide

## Quick Test

Run the automated test suite:

```bash
./test-modular-reports.sh
```

This script will:
1. ✅ Check backend health
2. ✅ Verify module availability (needs 4+ modules)
3. ✅ Create a test project
4. ✅ Add a test finding with 2 instances
5. ✅ Generate a 4-module DOCX report
6. ✅ Verify file size and type

**Expected output:** All tests pass, generates `/tmp/modular_test_report_{project_id}.docx`

## Manual Testing

### 1. Generate Default Templates
```bash
curl http://localhost:8000/report/modules/generate-defaults
```

### 2. List Available Modules
```bash
curl http://localhost:8000/report/modules | jq
```

Expected: 11 total modules, 6 available (title_page, executive_summary, detailed_findings, recommendations, top_findings, sla_status)

### 3. Create Test Project
```bash
curl -L -X POST http://localhost:8000/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Security Assessment Q4 2024",
    "consultant_name": "John Doe"
  }'
```

**Save the `id` from response!**

### 4. Add Findings
```bash
PROJECT_ID=1  # Use your project ID

# Add a Critical finding
curl -X POST "http://localhost:8000/projects/${PROJECT_ID}/findings" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Remote Code Execution in File Upload",
    "risk_rating": "Critical",
    "description": "Unrestricted file upload allows execution of arbitrary code",
    "remediation": "Implement file type validation, scan uploads, disable execution",
    "instances": [
      {"location": "/api/upload", "details": "No file type validation"},
      {"location": "/admin/import", "details": "Direct file execution possible"}
    ]
  }'

# Add a High finding
curl -X POST "http://localhost:8000/projects/${PROJECT_ID}/findings" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cross-Site Scripting (XSS) in User Profile",
    "risk_rating": "High",
    "description": "Stored XSS allows JavaScript injection in user profiles",
    "remediation": "Implement output encoding and CSP headers",
    "instances": [
      {"location": "/profile/bio", "details": "Bio field vulnerable to script injection"}
    ]
  }'
```

### 5. Generate Report

#### Basic Report (4 modules)
```bash
curl -X POST "http://localhost:8000/projects/${PROJECT_ID}/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      "title_page",
      "executive_summary",
      "detailed_findings",
      "recommendations"
    ],
    "variables": {
      "company_name": "ACME Corporation",
      "report_date": "2024-11-12",
      "report_version": "1.0"
    }
  }' -o security_report.docx
```

#### Full Report (all working modules)
```bash
curl -X POST "http://localhost:8000/projects/${PROJECT_ID}/report/assemble" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      "title_page",
      "executive_summary",
      "detailed_findings",
      "recommendations"
    ],
    "variables": {
      "company_name": "ACME Corporation",
      "report_date": "2024-11-12",
      "report_version": "1.0",
      "consultant_email": "security@example.com",
      "assessment_period": "October 1-31, 2024"
    }
  }' -o complete_report.docx
```

**Note:** Don't include `top_findings` module yet (has table loop syntax issue)

### 6. Verify Report

#### Check file
```bash
ls -lh security_report.docx
file security_report.docx
```

Expected:
- Size: 30-50 KB (depending on findings count)
- Type: Microsoft OOXML

#### Extract text content (inside container)
```bash
docker exec vuln-manager-backend-1 python3 -c "
from docx import Document
doc = Document('/tmp/security_report.docx')
print('Paragraphs:', len(doc.paragraphs))
print('Tables:', len(doc.tables))
print('\nFirst 20 paragraphs:')
for i, p in enumerate(doc.paragraphs[:20]):
    if p.text.strip():
        print(f'{i}: {p.text[:80]}')
"
```

#### Open in Word/LibreOffice
```bash
open security_report.docx
# or
libreoffice security_report.docx
```

## Testing Checklist

### Module Generation
- [ ] Run generate-defaults API endpoint
- [ ] Verify 6 modules created in `/app/report_modules/`
- [ ] Check module listing shows `exists: true` for 6 modules

### Report Assembly
- [ ] Create test project with findings
- [ ] Generate report with 4 working modules
- [ ] Verify file size >30KB
- [ ] Verify file type is OOXML
- [ ] Open in Word - all sections present

### Content Validation
- [ ] Title page shows company name, project name, consultant
- [ ] Executive summary shows risk counts (table)
- [ ] Detailed findings section has all findings
- [ ] Each finding has 15-row details table
- [ ] Recommendations section has priority-based guidance
- [ ] Page breaks between sections

### Custom Variables
- [ ] Company name appears on title page
- [ ] Report date appears in metadata table
- [ ] Custom variables accessible in templates

## Known Issues

### ⚠️ Top Findings Module
**Problem:** Table loop syntax error  
**Workaround:** Don't include in module list  
**Fix:** Manual Word editing required (see MODULAR_REPORTS_TESTING_COMPLETE.md)

### ⚠️ Enum Display
**Problem:** Shows `IssueStatus.Open` instead of `Open`  
**Impact:** Low (doesn't break functionality)  
**Fix:** Update `build_context()` to use `.value`

### ⚠️ SLA Status Module
**Problem:** Not tested yet  
**Status:** Generated but not included in test suite

## Troubleshooting

### "Module not found" error
```bash
# Check which modules exist
docker exec vuln-manager-backend-1 ls -la /app/report_modules/

# Regenerate all templates
curl http://localhost:8000/report/modules/generate-defaults
```

### Report generation returns JSON error
```bash
# Check backend logs
docker logs vuln-manager-backend-1 --tail 50

# Verify project exists
curl http://localhost:8000/projects/${PROJECT_ID}

# Test with single module
curl -X POST "http://localhost:8000/projects/${PROJECT_ID}/report/assemble" \
  -d '{"modules": ["title_page"]}' -o test.docx
```

### Empty or corrupted DOCX
```bash
# Check file size
ls -lh report.docx

# If very small (<1KB), it's probably a JSON error
cat report.docx

# Try with minimal modules
curl -X POST "http://localhost:8000/projects/${PROJECT_ID}/report/assemble" \
  -d '{
    "modules": ["title_page"],
    "variables": {"company_name": "Test"}
  }' -o minimal.docx
```

### Container issues
```bash
# Restart backend
docker-compose restart backend

# Check health
curl http://localhost:8000/health

# Verify database connection
docker-compose ps
```

## Performance Benchmarks

| Test | Expected Time | Expected Size |
|------|---------------|---------------|
| Template generation | <2s | 6 files, ~7KB each |
| Module listing | <100ms | JSON response |
| Report assembly (4 modules) | <1s | 30-50KB DOCX |
| Report assembly (6 modules) | <2s | 40-60KB DOCX |

## Documentation

- **Architecture:** `notes/MODULAR_REPORT_IMPLEMENTATION.md`
- **Integration:** `notes/MODULAR_REPORT_INTEGRATION_GUIDE.md`
- **Testing:** `notes/MODULAR_REPORTS_TESTING_COMPLETE.md`
- **Quick Reference:** `notes/MODULAR_REPORTS_QUICKREF.md`
- **Session Summary:** `notes/SESSION_SUMMARY_V0.11.0_COMPLETE.md`
- **Placeholders:** `notes/REPORT_POC_USAGE.md`

## Support

If tests fail:
1. Check Docker containers are running: `docker-compose ps`
2. Verify backend health: `curl http://localhost:8000/health`
3. Review logs: `docker logs vuln-manager-backend-1`
4. Regenerate templates: `curl http://localhost:8000/report/modules/generate-defaults`
5. See full testing docs: `notes/MODULAR_REPORTS_TESTING_COMPLETE.md`

---

**Version:** v0.11.0  
**Last Updated:** 2024-11-12  
**Status:** ✅ All tests passing
