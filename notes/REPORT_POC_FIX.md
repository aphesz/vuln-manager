# Report PoC Fix - Document Corruption Issue Resolved

## Problem
The initial PoC implementation used complex merged cells in the table structure, which caused DOCX corruption when docxtpl tried to render the template. The generated files couldn't be opened in Word.

## Root Cause
- **Merged cells + docxtpl loops** don't play well together
- The complex cell merging (rows 0-9 in left column) created invalid XML after template rendering
- InlineImage insertion into merged cells caused document structure corruption

## Solution
Created a simplified version (`report_poc_simple.py`) that avoids merged cells:

### Key Changes
1. **No cell merging** - Each row stands on its own
2. **Simpler table structure** - 9 rows x 2 columns (no merging)
3. **Better error handling** - Try/catch blocks around image generation and rendering
4. **Truncated content** - Description limited to 500 chars to avoid XML bloat
5. **Fallback text** - If donut image fails, uses text placeholder `[Risk]`

### New Template Structure
```
Row 0: {{ f.donut_img }} | {{ f.section_number }} {{ f.title }}
Row 1: AFFECTED: | {{ f.affected_resources }}
Row 2: STATUS: | {{ f.status }}
Row 3: CVE / CWE: | {{ f.cve_cwe }}
Row 4: OWASP: | {{ f.owasp_vector }}
Row 5: DESCRIPTION: | (empty)
Row 6: (empty) | {{ f.description_text }}
Row 7: POC: | (empty)
Row 8: (empty) | (Evidence placeholder)
```

## Testing Results
✅ Template download works: `GET /reports/poc/template.docx`
✅ Report generation works: `POST /projects/3/report/poc`
✅ DOCX file is valid and can be opened
✅ Donut images are embedded correctly
✅ Left border styling applies correctly

## Files Created/Modified
- **backend/app/report_poc_simple.py** - New simplified renderer
- **backend/app/main.py** - Updated to use `render_docx_simple()` and `build_simple_template_docx()`
- **notes/REPORT_POC_FIX.md** - This document

## Usage
Same as before, but now it actually works:

```bash
# Download template
curl http://localhost:8000/reports/poc/template.docx -o template.docx

# Generate report
curl -X POST \
  -F "template_file=@template.docx" \
  "http://localhost:8000/projects/3/report/poc" \
  -o report.docx

# Verify it's valid
file report.docx
# Output: report.docx: Microsoft OOXML
```

## Next Steps
If you want the exact layout from your screenshot with the larger left column:
1. Download the generated template
2. Open it in Word
3. Adjust column widths manually (left: wider, right: narrower)
4. Save and use that as your template

The renderer will preserve your manual column width adjustments.

## Known Limitations
- Donut images are smaller (2.8cm) to fit non-merged cells
- Description truncated to 500 characters (can be increased if needed)
- No complex merged cell layouts (by design, to avoid corruption)

## Verification Commands
```bash
# Check services are running
docker compose ps

# View backend logs
docker compose logs backend --tail 20

# Test template endpoint
curl http://localhost:8000/reports/poc/template.docx -o test.docx && open test.docx

# Test report generation (replace project ID)
curl -X POST -F "template_file=@test.docx" \
  "http://localhost:8000/projects/YOUR_PROJECT_ID/report/poc" \
  -o report.docx && open report.docx
```
