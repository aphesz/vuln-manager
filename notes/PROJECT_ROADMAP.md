# 🗺️ VulnManager Project Roadmap

**Last Updated:** November 3, 2025  
**Version:** 0.4.0 Planning

---

## 📊 Current Status (v0.3.1 - Completed)

### ✅ Core Features Implemented
- Full-stack architecture (FastAPI + React + PostgreSQL)
- Secure XML parsing (Burp Suite, Nessus)
- Intelligent finding deduplication
- Professional report generation (DOCX/PDF)
- Dashboard with risk visualization
- Peer review workflow
- Issue status tracking
- SLA management with deadline tracking
- Jira integration (bi-directional sync)
- Collaborative comments with timezone support
- Inline editing capabilities
- Responsive design with accessibility (WCAG 2.1 AA)
- Keyboard shortcuts and power user features
- Advanced filtering and bulk actions
- Project statistics and metrics cards
- Fluid tables with column customization

### 🐛 Recent Fixes
- ✅ Comment timezone bug (TIMESTAMP → TIMESTAMPTZ migration)
- ✅ Removed duplicate Comments tab
- ✅ Enhanced timezone utilities and documentation

---

## 🎯 Roadmap Overview

```
Current: v0.3.1
├── v0.4.0 - Vulnerability Repository (Q1 2026) ⭐ NEW
│   ├── Phase 1: Core Repository
│   ├── Phase 2: Scoring & Calculations
│   ├── Phase 3: Auto-Matching
│   └── Phase 4: External Data Integration
├── v0.5.0 - Enhanced UI/UX (Q2 2026)
├── v0.6.0 - Advanced Analytics (Q2 2026)
└── v1.0.0 - Enterprise Features (Q3 2026)
```

---

## 🚀 Version 0.4.0 - Vulnerability Repository (Priority: HIGH)

**Timeline:** 6-8 weeks  
**Effort:** 25-35 development hours  
**Status:** Planning Phase

### 🎯 Goals
Create a centralized vulnerability knowledge base that:
1. Auto-populates from imported scans
2. Supports manual template creation
3. Provides CVSS/OWASP risk scoring
4. Auto-matches findings to templates
5. Integrates with external CVE/CWE databases

---

### Phase 1: Core Repository Infrastructure (Week 1-2)
**Effort:** 8-10 hours  
**Priority:** Critical

#### Database Schema
- [ ] **Create VulnerabilityTemplate model**
  - Core fields: title, description, CWE/CVE IDs
  - Risk scoring: CVSS vector/score, OWASP likelihood/impact
  - Categorization: default_risk_rating, vulnerability_type
  - Remediation: summary, detailed steps, references
  - Metadata: source, is_verified, usage tracking
  - Timestamps: created_at, updated_at, last_used

- [ ] **Create VulnerabilityMatch model**
  - Track finding → template matches
  - Store similarity scores
  - Record match method (exact/fuzzy/cwe/cve/ai)

- [ ] **Migration 007_add_vulnerability_templates.py**
  - Create vulnerability_templates table
  - Create vulnerability_matches table
  - Add template_id FK to findings table
  - Create indexes on title, CWE ID, CVE ID

#### Backend API - CRUD Operations
- [ ] `GET /api/vulnerability-templates` - List all templates
  - Pagination support
  - Search by title/CWE/CVE/type
  - Filter by source, risk rating
  
- [ ] `POST /api/vulnerability-templates` - Create template
  - Validation with Pydantic models
  - Auto-calculate scores if vector provided
  - Set source = "manual", is_verified = true
  
- [ ] `GET /api/vulnerability-templates/{id}` - Get single template
  - Include usage statistics
  - Include linked findings count
  
- [ ] `PATCH /api/vulnerability-templates/{id}` - Update template
  - Partial updates supported
  - Update updated_at timestamp
  - Recalculate scores if needed
  
- [ ] `DELETE /api/vulnerability-templates/{id}` - Delete template
  - Prevent deletion if used by findings
  - Or cascade/unlink depending on policy

#### Frontend - Template Manager
- [ ] **VulnerabilityTemplateManager component**
  - DataGrid with templates
  - Search/filter UI
  - Quick actions (edit, delete, clone)
  
- [ ] **CreateTemplateDialog component**
  - Form with all template fields
  - CWE/CVE autocomplete
  - Rich text editor for remediation
  - CVSS calculator widget integration
  
- [ ] **TemplateDetailDialog component**
  - View full template details
  - Usage statistics chart
  - List of findings using this template
  - Edit button

#### Auto-Population from Imports
- [ ] **Modify process_and_save_issue() in main.py**
  - Check if template exists for vulnerability
  - If not, create new template from scan data
  - Extract CWE from description/metadata
  - Link finding to template (template_id)
  - Update template usage_count
  
- [ ] **Extract CWE/CVE from scan data**
  - Parse Burp XML for CWE references
  - Parse Nessus XML for CVE/plugin IDs
  - Regex patterns for common formats

**Deliverables:**
- ✅ Database schema and migrations
- ✅ Full CRUD API endpoints
- ✅ Basic frontend UI for template management
- ✅ Auto-creation from scans working
- ✅ Unit tests for API endpoints
- ✅ Integration tests for upload flow

---

### Phase 2: Scoring & Risk Calculations (Week 2-3)
**Effort:** 6-8 hours  
**Priority:** High

#### CVSS 3.1 Calculator
- [ ] **Backend: scoring.py module**
  - `parse_cvss_vector()` - Parse CVSS:3.1/AV:N/AC:L/...
  - `calculate_cvss_score()` - Full CVSS 3.1 base score calculation
  - Support Attack Vector, Complexity, Privileges, User Interaction
  - Support Scope, Confidentiality, Integrity, Availability
  - Return base score (0.0 - 10.0)
  
- [ ] `POST /api/cvss/calculate` - Calculate from vector
  - Input: CVSS vector string
  - Output: score + severity rating
  
- [ ] `POST /api/cvss/vector-builder` - Build vector from selections
  - Input: individual metric selections
  - Output: complete vector string + score

#### OWASP Risk Rating Calculator
- [ ] **Backend: scoring.py module**
  - `calculate_owasp_risk()` - Likelihood × Impact matrix
  - Input: likelihood (1-9), impact (1-9)
  - Output: risk rating (Critical/High/Medium/Low)
  - Risk score = likelihood × impact
  - Thresholds: ≥18 Critical, ≥12 High, ≥6 Medium, <6 Low
  
- [ ] `auto_calculate_owasp_from_cvss()` - Estimate from CVSS
  - Map CVSS 9.0+ → 9/9 (Critical)
  - Map CVSS 7.0-8.9 → 6/6 (High)
  - Map CVSS 4.0-6.9 → 4/4 (Medium)
  - Map CVSS <4.0 → 2/2 (Low)

#### Frontend - Calculators
- [ ] **CVSSCalculator component**
  - Dropdowns for each metric (AV, AC, PR, UI, S, C, I, A)
  - Real-time score calculation
  - Visual severity indicator (Critical/High/Medium/Low)
  - Copy vector string to clipboard
  - Integrate into CreateTemplateDialog
  
- [ ] **OWASPRiskCalculator component**
  - Sliders for Likelihood (1-9)
  - Sliders for Impact (1-9)
  - Matrix visualization
  - Risk rating display
  - Integration with template form

#### Auto-Calculation
- [ ] **Template creation/update hooks**
  - If cvss_vector provided → auto-calculate cvss_score
  - If cvss_score provided → estimate owasp values
  - If owasp_likelihood + owasp_impact → calculate owasp_risk_rating
  - Update default_risk_rating based on scores

**Deliverables:**
- ✅ CVSS 3.1 calculator (backend + frontend)
- ✅ OWASP risk calculator (backend + frontend)
- ✅ Auto-calculation on template save
- ✅ Interactive calculator widgets
- ✅ Unit tests for calculation logic
- ✅ Documentation of scoring methodologies

---

### Phase 3: Similarity Matching & Auto-Population (Week 3-5)
**Effort:** 8-12 hours  
**Priority:** High

#### Matching Strategy: Tiered Approach

**Tier 1: Exact Matches (Highest Confidence)**
- [ ] **CWE ID matching**
  - If finding has CWE-79 → match template with CWE-79
  - Confidence: 1.0 (100%)
  
- [ ] **CVE ID matching**
  - If finding has CVE-2024-1234 → match exact CVE
  - Confidence: 1.0 (100%)

**Tier 2: Fuzzy String Matching (High Confidence)**
- [ ] **Backend: matching.py module**
  - `calculate_similarity()` - Use difflib.SequenceMatcher
  - Compare finding.title vs template.title
  - Compare finding.description vs template.description
  - Weighted average (title 70%, description 30%)
  - Threshold: 0.85 (85% similarity)
  
- [ ] `find_similar_templates()` - Search all templates
  - Return list of (template, score) tuples
  - Sort by similarity score descending
  
- [ ] `auto_match_finding_to_template()` - Auto-match logic
  - Try Tier 1 (exact) first
  - Fall back to Tier 2 (fuzzy)
  - Create VulnerabilityMatch record
  - Return best match or None

**Tier 3: Advanced NLP (Optional - Future Enhancement)**
- [ ] **Semantic similarity with embeddings**
  - Use sentence-transformers (all-MiniLM-L6-v2)
  - Convert text to 384-dim vectors
  - Calculate cosine similarity
  - Threshold: 0.75 (75% similarity)
  - Pre-compute template embeddings on startup
  - **Note:** Adds ~50MB to Docker image, requires pip install

#### API Endpoints
- [ ] `POST /api/findings/{id}/auto-match` - Manual trigger
  - Find best matching template
  - Auto-populate finding with template data
  - Return match confidence score
  
- [ ] `POST /api/findings/{id}/suggest-matches` - Get suggestions
  - Return top 5 similar templates
  - Allow user to select best match
  - Update finding with selected template
  
- [ ] `GET /api/vulnerability-matches` - List all matches
  - Filter by finding, template, method
  - Show match statistics

#### Integration with Upload Flow
- [ ] **Modify process_and_save_issue()**
  - After creating finding, call auto_match
  - If match found (confidence ≥ 0.85):
    - Set finding.template_id
    - Auto-populate remediation if missing
    - Set CVSS/OWASP scores
    - Update template.usage_count
  - If no match, create new template

#### Frontend - Matching UI
- [ ] **Auto-match indicator in FindingsTable**
  - Column showing match status
  - Chip: "Matched" (green) or "Find Match" button
  - Tooltip showing confidence score
  
- [ ] **TemplateSuggestionsDialog**
  - Show top 5 suggested templates
  - Display similarity scores
  - Preview template details
  - "Select" button to apply template
  
- [ ] **Match confidence visualization**
  - Progress bar or percentage
  - Color coding (green ≥90%, yellow 80-89%, orange 70-79%)

**Deliverables:**
- ✅ Multi-tier matching algorithm
- ✅ Auto-match on upload
- ✅ Manual match triggering
- ✅ Suggestion system
- ✅ Match tracking and audit trail
- ✅ Frontend match indicators
- ✅ Performance benchmarks (< 100ms per match)

---

### Phase 4: External Data Integration (Week 5-6)
**Effort:** 6-8 hours  
**Priority:** Medium

#### NVD (National Vulnerability Database) Integration
- [ ] **Backend: nvd_integration.py module**
  - `NVDClient` class
  - API key configuration (free key from nvd.nist.gov)
  - Rate limiting (50 requests/30s with key, 5/30s without)
  
- [ ] **CVE Search & Import**
  - `search_cve(cve_id)` - Fetch single CVE by ID
  - `search_by_keyword(keyword)` - Search CVEs by keyword
  - `get_recent_cves(days)` - Get CVEs published in last N days
  - `parse_cve_to_template()` - Convert NVD JSON to VulnerabilityTemplate
  
- [ ] **API Endpoints**
  - `POST /api/vulnerability-templates/import-cve`
    - Input: CVE ID (CVE-2024-1234)
    - Fetch from NVD API
    - Create template in repository
    - Return created template
  
  - `POST /api/vulnerability-templates/sync-nvd`
    - Input: days (default 7)
    - Background task to fetch recent CVEs
    - Skip if already in repository
    - Return import statistics
  
- [ ] **Background Sync Job (Optional)**
  - Scheduled task (daily/weekly)
  - Auto-import high/critical CVEs
  - Email notification of new imports

#### CWE (Common Weakness Enumeration) Integration
- [ ] **CWE Database Import**
  - Download CWE XML from mitre.org
  - Parse XML to extract weaknesses
  - Create template for each CWE
  - Link related CWEs (parent/child)
  
- [ ] `POST /api/vulnerability-templates/import-cwe-database`
  - One-time bulk import
  - Parse CWE XML file
  - Create ~900 templates
  - Set source = "cwe"

#### Frontend - External Data
- [ ] **Import CVE Dialog**
  - Input field for CVE ID
  - Search button
  - Preview fetched data
  - Confirm import button
  
- [ ] **Sync Settings Page**
  - NVD API key configuration
  - Auto-sync toggle (enable/disable)
  - Sync frequency (daily/weekly)
  - Last sync timestamp
  - Manual sync trigger button
  
- [ ] **Import History**
  - List of imported CVEs/CWEs
  - Source indicator
  - Import date
  - Link to view template

#### Data Quality & Deduplication
- [ ] **Before importing external data:**
  - Check if CVE/CWE already exists
  - Compare with existing templates
  - Merge or update if duplicate found
  - Prefer verified/manual over auto-imported

**Deliverables:**
- ✅ NVD API integration
- ✅ CVE import functionality
- ✅ CWE database import
- ✅ Background sync capability
- ✅ Deduplication logic
- ✅ Frontend import UI
- ✅ Rate limiting and error handling
- ✅ Documentation for API key setup

---

### Phase 5: Testing & Documentation (Week 6-7)
**Effort:** 4-6 hours  
**Priority:** High

#### Testing
- [ ] **Unit Tests**
  - CVSS calculation accuracy
  - OWASP risk calculation
  - Fuzzy matching algorithm
  - Template CRUD operations
  - NVD API parsing
  
- [ ] **Integration Tests**
  - Upload scan → auto-create template
  - Upload scan → auto-match to template
  - Auto-populate finding from template
  - CVE import flow
  - Match confidence thresholds
  
- [ ] **Performance Tests**
  - Matching speed with 1000+ templates
  - NVD sync with 100+ CVEs
  - Database query performance
  - Frontend rendering with large datasets
  
- [ ] **Manual Testing**
  - Real Burp/Nessus scans
  - Template creation workflow
  - CVSS calculator accuracy
  - Match suggestions UX
  - CVE import success rate

#### Documentation
- [ ] **User Guide**
  - How to use vulnerability repository
  - Creating templates manually
  - Understanding CVSS scores
  - Interpreting match confidence
  - Importing CVEs
  
- [ ] **API Documentation**
  - Update Swagger/ReDoc
  - Add examples for new endpoints
  - Document scoring calculations
  - Document matching algorithms
  
- [ ] **Developer Docs**
  - Architecture overview
  - Matching algorithm details
  - Adding new data sources
  - Extending scoring methods
  
- [ ] **Migration Guide**
  - How to upgrade to v1.3.0
  - Database migration steps
  - NVD API key setup
  - Optional: Bulk import CWE database

**Deliverables:**
- ✅ Comprehensive test suite
- ✅ User documentation
- ✅ API documentation
- ✅ Migration guide
- ✅ Performance benchmarks
- ✅ Known limitations documented

---

### Success Metrics for v0.4.0

**Functional Metrics:**
- [ ] 95%+ of imported findings auto-matched to templates
- [ ] CVSS calculation accuracy: 100% (matches official calculator)
- [ ] Fuzzy matching: 90%+ true positive rate at 85% threshold
- [ ] NVD import: <5% failure rate
- [ ] Template creation time: <30 seconds (manual)
- [ ] Auto-match performance: <100ms per finding

**User Experience:**
- [ ] Template manager loads in <2 seconds with 1000 templates
- [ ] CVSS calculator provides instant feedback (<100ms)
- [ ] Match suggestions display <1 second
- [ ] CVE import completes in <5 seconds

**Data Quality:**
- [ ] Template repository contains 200+ verified templates
- [ ] 80%+ of findings linked to templates
- [ ] CVSS scores present on 70%+ of templates
- [ ] Remediation guidance on 90%+ of templates

---

## 🎨 Version 0.5.0 - Enhanced UI/UX (Q2 2026)

**Timeline:** 4-5 weeks  
**Effort:** 25-30 hours  
**Status:** Planning

### Key Features

#### Advanced Dashboard
- [ ] **Interactive analytics widgets**
  - Draggable/resizable dashboard cards
  - Custom widget selection
  - Save dashboard layouts
  
- [ ] **Trend analysis charts**
  - Finding discovery timeline
  - Remediation progress over time
  - Risk trend (improving/worsening)
  
- [ ] **Comparison views**
  - Side-by-side project comparison
  - Before/after upload comparison
  - Industry benchmark comparison

#### Enhanced Findings Management
- [ ] **Advanced bulk operations**
  - Bulk risk rating update
  - Bulk template assignment
  - Bulk status change
  - Bulk export selection
  
- [ ] **Custom tagging system**
  - Create custom tags
  - Tag-based filtering
  - Tag autocomplete
  - Tag hierarchy (parent/child)
  
- [ ] **Finding relationships**
  - Link related findings
  - Mark duplicates across projects
  - Group findings by attack chain

#### Improved UX
- [ ] **Keyboard shortcuts expanded**
  - Navigate findings (J/K)
  - Quick actions (R for remediate, C for comment)
  - Command palette (Cmd+K)
  
- [ ] **Customizable table views**
  - Save multiple table configurations
  - Quick view switching
  - Export table settings
  
- [ ] **Dark mode enhancements**
  - Better color contrast
  - Dark-aware chart colors
  - User preference persistence

**Estimated Effort:** 25-30 hours

---

## 📊 Version 0.6.0 - Advanced Analytics & Reporting (Q2 2026)

**Timeline:** 3-4 weeks  
**Effort:** 20-25 hours  
**Status:** Planning

### Key Features

#### Advanced Reporting
- [ ] **Custom report templates**
  - Drag-and-drop report builder
  - Custom sections and ordering
  - Conditional content inclusion
  - Branding customization
  
- [ ] **Executive summaries**
  - Auto-generated executive dashboards
  - Risk heat maps
  - Compliance checklists
  - Trend analysis graphs
  
- [ ] **Scheduled reports**
  - Weekly/monthly automated reports
  - Email delivery
  - Report distribution lists

#### Analytics Engine
- [ ] **Predictive analytics**
  - Estimate remediation time
  - Risk score trending
  - Vulnerability recurrence prediction
  
- [ ] **Benchmarking**
  - Compare against industry standards
  - OWASP Top 10 mapping
  - MITRE ATT&CK mapping
  - CWE Top 25 tracking
  
- [ ] **Compliance reporting**
  - PCI DSS mapping
  - ISO 27001 mapping
  - SOC 2 mapping
  - Custom compliance frameworks

#### Data Export
- [ ] **Enhanced export formats**
  - JSON/CSV/Excel
  - SARIF format (for CI/CD)
  - HTML interactive reports
  - Markdown reports
  
- [ ] **API endpoints for integrations**
  - Webhook notifications
  - RESTful data export
  - GraphQL API (optional)

**Estimated Effort:** 20-25 hours

---

## 🏢 Version 1.0.0 - Enterprise Features (Q3 2026)

**Timeline:** 8-10 weeks  
**Effort:** 60-80 hours  
**Status:** Concept Phase

### Key Features

#### Multi-Tenancy
- [ ] **Organization management**
  - Multiple organizations per instance
  - Organization-level settings
  - Data isolation between orgs
  
- [ ] **Team collaboration**
  - Team workspaces
  - Shared findings library
  - Team activity feed
  
- [ ] **User management**
  - Invite users
  - Role-based access control
  - Permission granularity (project-level)

#### Advanced Security
- [ ] **SSO/SAML integration**
  - LDAP/Active Directory
  - SAML 2.0
  - OAuth 2.0 providers
  
- [ ] **Audit logging**
  - Comprehensive audit trail
  - Compliance reporting
  - User activity tracking
  
- [ ] **Data encryption**
  - Encryption at rest
  - Field-level encryption for sensitive data
  - API key management

#### Enterprise Features
- [ ] **Custom workflows**
  - Workflow builder
  - Approval processes
  - Automated actions
  
- [ ] **Integration marketplace**
  - SIEM integrations (Splunk, ELK)
  - Ticketing systems (ServiceNow)
  - Communication tools (Slack, Teams)
  
- [ ] **Advanced deployment**
  - High availability setup
  - Load balancing
  - Database replication
  - Backup/restore automation

**Estimated Effort:** 60-80 hours

---

## 📋 Development Priorities Matrix

| Version | Feature Category | Business Value | Technical Complexity | Priority |
|---------|-----------------|----------------|---------------------|----------|
| v0.4.0 | Vulnerability Repository | ⭐⭐⭐⭐⭐ | 🔧🔧🔧 | **P0** |
| v0.4.0 | CVSS/OWASP Scoring | ⭐⭐⭐⭐ | 🔧🔧 | **P0** |
| v0.4.0 | Auto-Matching | ⭐⭐⭐⭐⭐ | 🔧🔧🔧🔧 | **P0** |
| v0.4.0 | NVD Integration | ⭐⭐⭐ | 🔧🔧 | P1 |
| v0.5.0 | Advanced Dashboard | ⭐⭐⭐⭐ | 🔧🔧🔧 | P1 |
| v0.5.0 | Bulk Operations | ⭐⭐⭐⭐ | 🔧🔧 | P1 |
| v0.6.0 | Custom Reports | ⭐⭐⭐⭐ | 🔧🔧🔧 | P1 |
| v0.6.0 | Compliance Mapping | ⭐⭐⭐ | 🔧🔧 | P2 |
| v1.0.0 | Multi-Tenancy | ⭐⭐⭐⭐⭐ | 🔧🔧🔧🔧🔧 | P2 |
| v1.0.0 | SSO/SAML | ⭐⭐⭐⭐ | 🔧🔧🔧🔧 | P2 |

---

## 🎯 Next Immediate Actions

### This Week (Nov 3-9, 2025)
1. ✅ **Review and approve v0.4.0 plan**
2. [ ] **Create database schema design** for VulnerabilityTemplate
3. [ ] **Write migration 007** with schema changes
4. [ ] **Set up development branch** (feature/vulnerability-repository)
5. [ ] **Create initial models.py** additions

### Next Week (Nov 10-16, 2025)
1. [ ] **Implement CRUD API endpoints**
2. [ ] **Build basic frontend template manager**
3. [ ] **Integrate auto-creation** in upload flow
4. [ ] **Write unit tests** for CRUD operations

### Following Week (Nov 17-23, 2025)
1. [ ] **Implement CVSS calculator**
2. [ ] **Implement OWASP calculator**
3. [ ] **Build frontend calculators**
4. [ ] **Test scoring accuracy**

---

## 📈 Long-Term Vision

**Year 1 Goals (2026):**
- Comprehensive vulnerability knowledge base (v0.4.0)
- Industry-standard risk scoring (v0.4.0)
- Intelligent auto-matching (v0.4.0)
- Enhanced UI/UX (v0.5.0)
- Advanced analytics and reporting (v0.6.0)

**Year 2 Goals (2027):**
- Enterprise features and multi-tenancy (v1.0.0+)
- AI-powered vulnerability analysis
- Automated remediation suggestions
- Integration ecosystem
- Mobile applications
- Cloud-native deployment options

---

## 📞 Stakeholder Communication

**Progress Updates:**
- Weekly: Development progress, blockers, decisions needed
- Monthly: Demo of completed features, roadmap adjustments
- Quarterly: Strategic review, priority reassessment

**Feedback Loops:**
- User testing sessions after each phase
- Gather requirements for next version
- Prioritize backlog based on feedback

---

**Document Owner:** Development Team  
**Review Frequency:** Bi-weekly  
**Next Review:** November 17, 2025

