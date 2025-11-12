# 📝 Modular Reports System - Complete Reference

Comprehensive guide to VulnManager's modular report generation system with reusable DOCX templates and Jinja2 variables.

---

## 🎯 Quick Start

### Generate a Modular Report

```bash
# Using v2 endpoint with template IDs
curl -X POST "http://localhost:8000/projects/1/report/assemble/v2" \
  -H "Content-Type: application/json" \
  -d '{
    "template_ids": [5, 6, 7],
    "variables": {"company_name": "Acme Corp"}
  }' \
  -o report.docx
```

### List Available Templates

```bash
curl http://localhost:8000/projects/1/templates
```

---

## 📚 System Templates

### Available Templates (11 total)

1. **Title Page** (ID: 1)
   - Project metadata and company branding
   - Variables: `project_name`, `client_name`, `assessment_dates`

2. **Executive Summary** (ID: 2)
   - High-level overview with risk statistics
   - Variables: `critical_count`, `high_count`, `medium_count`, `low_count`

3. **Table of Contents** (ID: 3)
   - Auto-generated ToC placeholder
   - No special variables

4. **Methodology** (ID: 4)
   - Assessment approach and scope
   - Variables: `methodology`, `scope`

5. **Detailed Findings** (ID: 5)
   - Complete finding details with instances
   - Loop: `{% for f in findings %}`
   - Variables per finding: `f.title`, `f.description`, `f.risk_rating`, `f.instances`

6. **Executive Findings Summary** (ID: 6)
   - Simplified findings list for executives
   - Same loop as Detailed Findings but condensed

7. **Recommendations** (ID: 7)
   - Remediation guidance and action items
   - Variables: `recommendations`, `priority_actions`

8. **Risk Distribution** (ID: 8)
   - Risk charts and statistics
   - Variables: `risk_critical`, `risk_high`, `risk_medium`, `risk_low`, `total_issues`

9. **Compliance Mapping** (ID: 9)
   - OWASP Top 10, CWE Top 25, MITRE ATT&CK
   - Variables: `owasp_top_10`, `cwe_top_25`, `attack_techniques`

10. **SLA Status** (ID: 10)
    - Remediation tracking and deadlines
    - Variables: `sla_compliance`, `overdue_count`, `at_risk_count`

11. **Appendix** (ID: 11)
    - Technical details and references
    - Variables: `references`, `tools_used`

---

## 🎨 Jinja2 Variable Reference

### Project Variables

```jinja2
{{ project_name }}              # "Acme Corp Q4 2024 Pentest"
{{ project_description }}       # "Web application security assessment"
{{ client_name }}               # "Acme Corporation"
{{ consultant_name }}           # "John Doe"
{{ assessment_dates }}          # "2024-11-01 to 2024-11-15"
{{ project_start_date }}        # "2024-11-01"
{{ project_end_date }}          # "2024-11-15"
```

### Risk Summary Variables

```jinja2
{{ critical_count }}            # Number of Critical findings (int)
{{ high_count }}                # Number of High findings (int)
{{ medium_count }}              # Number of Medium findings (int)
{{ low_count }}                 # Number of Low findings (int)
{{ informational_count }}       # Number of Informational findings (int)
{{ total_issues }}              # Total findings count
{{ cvss_score }}                # Average CVSS score (float, 0.0-10.0)
```

### Finding Loop Variables

```jinja2
{% for f in findings %}
  {{ f.title }}                 # Finding title/name
  {{ f.description }}           # Full description (HTML formatted)
  {{ f.risk_rating }}           # Critical/High/Medium/Low/Informational
  {{ f.cvss_score }}            # CVSS 3.1 score
  {{ f.cwe_id }}                # CWE classification
  {{ f.cve_id }}                # CVE identifier (if applicable)
  {{ f.owasp_category }}        # OWASP Top 10 category (A01-A10)
  {{ f.recommendation }}        # Remediation steps
  {{ f.references_url }}        # External reference URLs
  {{ f.poc_description }}       # Proof of Concept details
  
  # Instance loop (affected URLs/hosts)
  {% for instance in f.instances %}
    {{ instance.location }}     # Affected URL or host
    {{ instance.details }}      # Specific instance details
  {% endfor %}
{% endfor %}
```

### Instance-Specific Variables

```jinja2
{{ instance.location }}         # "https://example.com/login"
{{ instance.details }}          # "POST parameter: username"
{{ instance.evidence }}         # Evidence/screenshot details
```

### Compliance Variables

```jinja2
{{ owasp_top_10 }}              # OWASP Top 10 2021 mapping
{{ cwe_top_25 }}                # CWE Top 25 classification
{{ compliance_percentage }}     # Overall compliance (%)
{{ pci_dss }}                   # PCI DSS compliance status
{{ iso_27001 }}                 # ISO 27001 alignment
{{ nist_csf }}                  # NIST Cybersecurity Framework
```

### SLA Variables

```jinja2
{{ sla_deadline }}              # SLA deadline date
{{ sla_owner }}                 # Responsible person/team
{{ sla_status }}                # On Track/At Risk/Overdue
{{ remediation_owner }}         # Same as sla_owner
{{ remediation_deadline }}      # Same as sla_deadline
```

### Metadata Variables

```jinja2
{{ report_date }}               # Report generation date
{{ version }}                   # Report version number
{{ authors }}                   # Report authors list
{{ confidentiality }}           # Confidentiality level
```

### Custom Variables

```jinja2
{{ company_name }}              # User-provided company name
{{ custom_var }}                # Any user-defined variable
```

---

## 🛠️ Creating Custom Templates

### Step 1: Create DOCX Template

1. Open Microsoft Word
2. Create your report structure
3. Insert Jinja2 variables using `{{ variable_name }}` syntax
4. For loops, use `{% for item in list %}` ... `{% endfor %}`
5. Save as `.docx` file

### Step 2: Upload Template

**Via API:**
```bash
curl -X POST http://localhost:8000/projects/1/templates/upload \
  -F "file=@my_template.docx" \
  -F "name=My Custom Template" \
  -F "description=Executive findings report" \
  -F "is_public=false"
```

**Via UI:**
- Navigate to Modular Report Generator
- Click "Upload Custom Template" button
- Select file, enter name/description
- Click "Upload"

### Step 3: Use in Report

```bash
# Get template ID from list
curl http://localhost:8000/projects/1/templates

# Use in report generation (assume custom template ID is 17)
curl -X POST "http://localhost:8000/projects/1/report/assemble/v2" \
  -H "Content-Type: application/json" \
  -d '{
    "template_ids": [1, 2, 17, 7],
    "variables": {
      "company_name": "Acme Corp",
      "custom_var": "Custom Value"
    }
  }' \
  -o report.docx
```

---

## 📋 Example Custom Templates

### Executive Briefing Template

```jinja2
# In Word document:

{{ company_name }} - Security Assessment Briefing
Date: {{ report_date }}

Executive Summary
-----------------
Our assessment identified {{ total_issues }} security issues across {{ project_name }}.

Risk Breakdown:
- Critical: {{ critical_count }}
- High: {{ high_count }}
- Medium: {{ medium_count }}
- Low: {{ low_count }}

Top Findings:
{% for f in findings[:5] %}
  {{ loop.index }}. {{ f.title }} ({{ f.risk_rating }})
{% endfor %}

Next Steps:
- Remediate Critical and High findings within 30 days
- Assign remediation owners to all findings
- Schedule follow-up assessment for Q1 2025
```

### Technical Findings Template

```jinja2
Technical Findings Report
=========================

{% for f in findings %}
Finding #{{ loop.index }}: {{ f.title }}
Risk Rating: {{ f.risk_rating }}
CWE: {{ f.cwe_id }}
CVSS Score: {{ f.cvss_score }}

Description:
{{ f.description }}

Affected Instances:
{% for instance in f.instances %}
  - {{ instance.location }}
    Details: {{ instance.details }}
{% endfor %}

Recommendation:
{{ f.recommendation }}

---
{% endfor %}
```

---

## 🔧 Advanced Jinja2 Features

### Conditionals

```jinja2
{% if critical_count > 0 %}
  **WARNING:** {{ critical_count }} critical findings require immediate attention!
{% else %}
  No critical findings identified.
{% endif %}
```

### Filters

```jinja2
{{ project_name | upper }}      # UPPERCASE
{{ description | truncate(100) }}  # Limit to 100 chars
{{ report_date | strftime("%Y-%m-%d") }}  # Date formatting
```

### Loops with Index

```jinja2
{% for f in findings %}
  Finding #{{ loop.index }}: {{ f.title }}
  {% if loop.first %}(Top Priority){% endif %}
{% endfor %}
```

### Nested Loops

```jinja2
{% for f in findings %}
  {{ f.title }}
  Affected Systems:
  {% for instance in f.instances %}
    - {{ instance.location }}
  {% endfor %}
{% endfor %}
```

---

## 🧪 Testing Your Template

### Test with Sample Data

```bash
# Generate report with your template
curl -X POST "http://localhost:8000/projects/1/report/assemble/v2" \
  -H "Content-Type: application/json" \
  -d '{
    "template_ids": [17],
    "variables": {
      "company_name": "Test Company",
      "test_var": "Test Value"
    }
  }' \
  -o test_report.docx

# Open test_report.docx in Word to verify
```

### Common Issues

**1. Variables Not Replaced**
- Check syntax: `{{ variable_name }}` (no extra spaces)
- Verify variable name matches exactly
- Check variable is in context (project, findings, custom)

**2. Loop Not Working**
- Use `{% for item in list %}` ... `{% endfor %}`
- For findings: `{% for f in findings %}`
- For instances: `{% for instance in f.instances %}`

**3. Formatting Lost**
- Use HTML in description fields: `{{ f.description | safe }}`
- Apply Word styles to placeholder text
- Avoid complex nested tables

---

## 📊 API Endpoints Reference

### List Templates
```http
GET /projects/{project_id}/templates
```

### Upload Template
```http
POST /projects/{project_id}/templates/upload
Content-Type: multipart/form-data

file: <docx_file>
name: "Template Name"
description: "Optional description"
is_public: false
```

### Generate Report (v2)
```http
POST /projects/{project_id}/report/assemble/v2
Content-Type: application/json

{
  "template_ids": [1, 2, 5, 7],
  "variables": {
    "company_name": "Acme Corp",
    "custom_var": "value"
  }
}
```

### Get Template Documentation
```http
GET /projects/{project_id}/templates/{template_id}/documentation?format=json
```

---

## 🎓 Best Practices

### Template Design

1. **Keep It Simple:** Start with basic variables, add complexity gradually
2. **Use Comments:** Add comments in Word for future reference
3. **Test Frequently:** Generate test reports often during development
4. **Version Control:** Use template versioning for major changes
5. **Reusable Blocks:** Create modular sections that work in multiple reports

### Variable Naming

1. **Descriptive Names:** `client_company_name` > `ccn`
2. **Consistent Casing:** Use `snake_case` for all variables
3. **No Spaces:** `project_name` not `project name`
4. **Avoid Reserved Words:** Don't use `for`, `if`, `in`, etc.

### Report Composition

1. **Standard Structure:** Title → Executive → Findings → Recommendations
2. **Mix System + Custom:** Combine built-in templates with custom sections
3. **Logical Order:** template_ids array determines section order
4. **Consistent Branding:** Use same variables across all templates

---

## 🔍 Troubleshooting

### Template Won't Upload

**Error:** "Invalid file type"
- **Solution:** Only `.docx` files accepted (not .doc, .pdf, .txt)

**Error:** "File too large"
- **Solution:** Max size 50MB, compress images or split template

### Generated Report Empty

**Issue:** Report generates but content missing
- **Check:** Template has valid Jinja2 syntax
- **Verify:** Project has findings (empty project = empty report)
- **Test:** Use `?format=json` on documentation endpoint to see available variables

### Variables Not Replaced

**Issue:** `{{ variable_name }}` appears in output
- **Check:** Variable name spelling matches exactly
- **Verify:** Variable is in context (use documentation endpoint)
- **Fix:** Remove extra spaces: `{{variable_name}}` or `{{ variable_name }}`

---

## 📚 Additional Resources

- **Template Placeholder Documentation:** View available variables in UI
- **Version History:** Track template changes and rollback if needed
- **Import/Export:** Share templates between projects
- **API Documentation:** `/docs` endpoint for full API reference

---

**Last Updated:** 2025-11-12 (v0.15.0)  
**Related Versions:**
- v0.15.0 - Template Placeholder Documentation
- v0.14.0 - Template Versioning
- v0.12.0 - Unified Template System
- v0.11.0 - Modular Report Engine
