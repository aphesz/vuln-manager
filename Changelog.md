# VulnManager Changelog

All notable changes to VulnManager are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

**Note:** VulnManager is in pre-release. Versions follow 0.x.x format until official public release.

---

## [0.3.0] - November 1, 2025 (Previously v1.3.0)

### 🎯 Tier 1 Features - Major Release

### 🔍 Peer Review Workflow
- **Review Status Tracking** - Multi-stage review process (Pending, In Review, Approved, Rejected)
- **Comment System** - Collaborative discussion on findings with user attribution
- **Audit Trail** - Complete change history for all Tier 1 operations
- **API Endpoints**:
  - `PATCH /findings/{id}/review` - Update review status with validation
  - `POST /findings/{id}/comments` - Add comments to findings
  - `GET /findings/{id}/comments` - List all comments for a finding
  - `GET /audit-log` - Searchable audit trail (filterable by entity_type, entity_id, user)

### 🔗 Jira Integration
- **Bi-directional Sync** - Connect VulnManager with Jira Cloud/Server
- **Encrypted Credentials** - Fernet encryption for API tokens
- **Auto Issue Creation** - Create Jira issues from findings with risk-based priorities
- **Webhook Support** - Real-time status updates from Jira
- **API Endpoints**:
  - `POST /jira/settings` - Configure Jira integration with encrypted token storage
  - `POST /jira/test-connection` - Validate Jira credentials before saving
  - `POST /findings/{id}/create-jira-issue` - Create Jira issues from findings
  - `POST /webhooks/jira` - Receive Jira status updates

### ⏰ SLA & Remediation Tracking
- **Risk-based SLA Deadlines** - Automatic deadline calculation
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 90 days
  - Informational: No SLA
- **Status Calculation** - Automatic tracking (On Track, At Risk, Overdue)
- **Ownership Assignment** - Track remediation responsibility
- **Dashboard Metrics** - Management visibility into SLA performance
- **API Endpoints**:
  - `GET /findings/overdue` - List all overdue findings
  - `PATCH /findings/{id}/remediation` - Update deadline and owner
  - `GET /sla-summary` - Dashboard metrics by SLA status

### 🗃️ Database Changes
- **New Tables** (3):
  - `comment` - Finding discussions
  - `auditlog` - Change tracking
  - `jirasettings` - Jira configuration
- **Extended Finding Table** (6 new columns):
  - `review_status` - ENUM (Pending, In Review, Approved, Rejected)
  - `jira_issue_key` - VARCHAR(255) indexed
  - `jira_status` - VARCHAR(255)
  - `remediation_deadline` - TIMESTAMP indexed
  - `sla_status` - ENUM (On Track, At Risk, Overdue)
  - `remediation_owner` - VARCHAR(255)
- **Indexes** - 4 new indexes for performance
- **Enum Types** - 2 new types (reviewstatus, slastatus)

### 🔧 Infrastructure
- **Alembic Migrations** - Database schema versioning
  - `001_tier1_features.py` - Table creation
  - `002_add_finding_columns.py` - Column additions
- **New Dependencies**:
  - `alembic==1.13.1` - Database migrations
  - `cryptography==42.0.2` - Token encryption
  - `httpx==0.26.0` - Async HTTP client for Jira
- **Updated Dockerfile** - Include Alembic files in `/code` structure

### 🔒 Security Enhancements
- **Token Encryption** - Fernet encryption for Jira API tokens
- **Input Validation** - Whitelists, length limits, ISO datetime validation
- **Audit Logging** - All Tier 1 operations tracked
- **Secure Defaults** - Pending review status, encrypted storage

### 📊 Implementation Stats
- **Commits**: 1 commit (31270ab)
- **Files Modified**: 15 files
- **Lines Added**: 1,490+ lines
- **New Endpoints**: +9 API endpoints
- **New Modules**: `jira.py` (10,668 bytes), `sla.py` (5,469 bytes)

### 📚 Build & Deploy
- Build hash: `f22c366e185ba016209d430fd7d989569676652839`
- Status: ✅ Production ready - backward compatible with 0.2.0
- All migrations applied successfully

---

## [0.2.0] - November 1, 2025 (Previously v1.2.0)

### 🔒 Security Enhancements
- **HTTP Security Headers** - X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy
- **Input Validation** - Content-type, filename, scanner type whitelist for upload endpoints
- **Secure Theme Storage** - Whitelist validation for theme mode with safe JSON parsing
- **Defense in Depth** - Multiple validation layers prevent injection and malformed inputs

### ✨ Features
- **Enhanced Health Endpoint** - `/health` checks database connectivity and returns detailed status
- **Readiness Probe** - New `/ready` endpoint for Kubernetes/orchestrator checks
- **Theme Persistence** - Remember light/dark mode preference in localStorage
- **System Color Scheme Detection** - Respect OS `prefers-color-scheme` preference automatically
- **Graceful Fallbacks** - Handle localStorage unavailability (private browsing) without crashing

### ♿ Accessibility
- **ARIA Labels** - Semantic labels for header, navigation, theme toggle
- **Keyboard Navigation** - Focus rings for keyboard users (focus-visible styling)
- **Screen Reader Support** - Proper roles, aria-hidden for decorative elements
- **Semantic HTML** - Header title now uses `<h1>` element

### 📚 Documentation
- Created `notes/QUICK_WINS_VERIFICATION.md` - Verification guide for all v1.2.0 improvements
- Comprehensive security review and testing checklist

### 📊 Build & Deploy
- Build hash: `bb0387802fb661ea05d85fc55de500bcf0932d8552e757f15bfc3e2d651aac88`
- Status: ✅ Production ready - backward compatible with v1.1.0
- All containers healthy, no schema changes required

---

## [0.2.0] - November 1, 2025 (Previously v1.2.0)

### 🔒 Security Enhancements
- **HTTP Security Headers** - X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy
- **Input Validation** - Content-type, filename, scanner type whitelist for upload endpoints
- **Secure Theme Storage** - Whitelist validation for theme mode with safe JSON parsing
- **Defense in Depth** - Multiple validation layers prevent injection and malformed inputs

### ✨ Features
- **Enhanced Health Endpoint** - `/health` checks database connectivity and returns detailed status
- **Readiness Probe** - New `/ready` endpoint for Kubernetes/orchestrator checks
- **Theme Persistence** - Remember light/dark mode preference in localStorage
- **System Color Scheme Detection** - Respect OS `prefers-color-scheme` preference automatically
- **Graceful Fallbacks** - Handle localStorage unavailability (private browsing) without crashing

### ♿ Accessibility
- **ARIA Labels** - Semantic labels for header, navigation, theme toggle
- **Keyboard Navigation** - Focus rings for keyboard users (focus-visible styling)
- **Screen Reader Support** - Proper roles, aria-hidden for decorative elements
- **Semantic HTML** - Header title now uses `<h1>` element

### 📚 Documentation
- Created `notes/QUICK_WINS_VERIFICATION.md` - Verification guide for all 0.2.0 improvements
- Comprehensive security review and testing checklist

### 📊 Build & Deploy
- Build hash: `bb0387802fb661ea05d85fc55de500bcf0932d8552e757f15bfc3e2d651aac88`
- Status: ✅ Production ready - backward compatible with 0.1.0
- All containers healthy, no schema changes required

---

## [0.1.0] - October 30, 2025 (Previously v1.1.0)

### ✨ Added

- **Professional Dark Mode** - GitHub-inspired palette with high contrast text
  - Dark: `#0d1117` background, `#e6edf3` text
  - Light: `#f5f5f5` background, `#212121` text
  - Risk colors optimized for both modes
- **Theme Toggle Button** - ☀️/🌙 icon in header, available on all pages
- **AppHeader Component** - Standalone header component for proper theme context
- **CssBaseline** - Applies theme colors to entire document (body/html)

### 🐛 Fixed

- Dark mode now applies to entire UI (previously only table)
- Dashboard titles readable in light mode
- Theme toggle buttons properly styled and functional
- Text contrast meets WCAG AA standards
- All typography hierarchy improved with proper font weights

### 📝 Changed

- **ThemeProvider.tsx** - Added CssBaseline, expanded palette, improved typography
- **AppHeader.tsx** - New component handling header and theme toggle
- **Dashboard.tsx** - Updated title and section headers with theme-aware colors
- **App.tsx** - Simplified to focus on routing
- **index.css** - Added smooth transitions for theme changes

### 📊 Build & Deploy

- Build hash: `index-Dn8rR-dN.js`
- Build time: ~11-15 seconds
- All containers healthy and running
- Production ready ✅

---

## [Unreleased] - October 30, 2025 (Initial Development)

### ✨ Added

#### Project Management Features
- **Project Quick Actions** - Complete project lifecycle management
  - Create new projects with title and consultant name
  - Rename existing projects (inline edit or menu)
  - Delete projects with cascading delete to findings/instances
  - Archive/Unarchive projects with soft-delete support
  - Export project metadata as JSON
  - Tab-based filtering for Active/Archived projects
  
- **Inline Editing** - Fast project metadata editing
  - Click project title to edit directly
  - Click consultant name to edit directly
  - Keyboard shortcuts: Enter to save, Escape to cancel
  - Auto-focus on first field
  - Form validation (required fields)
  - Real-time save with API integration

#### Backend Endpoints
- `PUT /projects/{project_id}` - Update project (name, consultant, archive status)
- `DELETE /projects/{project_id}` - Delete project with cascading deletes

#### Database Schema
- Added `is_archived` boolean field to Project model (indexed)
- Added `archived_at` timestamp field to Project model for archival tracking

#### UI Improvements
- Finding titles now clickable - opens finding details dialog
- Project cards with hover effects and visual feedback
- Menu system (≡) for project quick actions
- Dialog components for Create, Rename, and Delete confirmation
- Inline edit mode with Save/Cancel buttons

### 🐛 Fixed

#### HTML Rendering Issues
- **Frontend**: Added `stripHtmlTags()` utility function to remove HTML tags from finding descriptions and remediation in UI display
- **Backend**: Added `strip_html_tags()` function to remove HTML markup from:
  - DOCX report generation (descriptions, remediation, instance details)
  - PDF report generation (descriptions, remediation, instance details)
- Verified: DOCX (45K) and PDF (29 pages) exports contain clean text without HTML tags
- Root cause: Burp/Nessus XML contains HTML tags in descriptions; now properly stripped

#### File Upload Limitation
- Increased Nginx `client_max_body_size` from 1MB default to 10MB
- Applied at server level and `/api` location in nginx.conf
- Verified: Successfully uploaded 2.2MB test file

### 📝 Changed

- **ProjectsLists.tsx**: Complete rewrite with comprehensive project management UI
  - Added 10+ new state hooks for dialogs and forms
  - Added 11 handler functions for business logic
  - Added Material-UI components: TextField, Dialog, Menu, IconButton
  - Added 7 Material-UI icons for actions
  - Conditional rendering for edit mode
  
- **Frontend Dockerfile**: Optimization
  - Removed unnecessary build dependencies (python3, make, g++)
  - Simplified Node build stage for faster builds

### 📚 Documentation

Created comprehensive documentation:
- `INLINE_EDIT_FEATURE.md` - Complete technical guide for inline editing
- `PROJECT_QUICK_ACTIONS_SUMMARY.md` - Technical documentation for quick actions
- `PROJECT_QUICK_ACTIONS_UI_GUIDE.md` - UI layouts and interaction flows
- `PROJECT_QUICK_ACTIONS_TESTING.md` - Comprehensive test guide (30+ test cases)
- `PROJECT_QUICK_ACTIONS_QUICKREF.md` - Quick reference for developers
- `SESSION_SUMMARY_OCT30.md` - Comprehensive session summary

### 🧪 Testing & Validation

**Backend API Testing**:
- ✅ POST /projects/ - Create project
- ✅ GET /projects/ - List projects
- ✅ PUT /projects/{id} - Update project
- ✅ DELETE /projects/{id} - Delete project with cascading

**Frontend Testing**:
- ✅ Project creation with form dialog
- ✅ Project renaming via menu and inline edit
- ✅ Project archiving and tab filtering
- ✅ Delete confirmation dialog
- ✅ JSON export functionality
- ✅ Inline edit keyboard shortcuts (Enter/Escape)
- ✅ Finding title clickability
- ✅ HTML tag stripping in UI and exports

**Build Verification**:
- Build hash confirmed changed: `index-BokmqCAI.js` (previous: `index-DhWjyWfi.js`)
- All containers restarted successfully
- Test projects created for manual testing
- System health check passed

### 📊 Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Create Project | 100-200ms | API call + refresh |
| Edit (Inline) | 100-200ms | Click to save |
| Archive | 100-200ms | Toggle + tab update |
| Delete | 100-500ms | Scales with findings count |
| Export | <50ms | Client-side, instant |
| Frontend Build | ~8s | Vite deterministic build |

### 🔧 System Configuration

**Platform Support**:
- Optimized for ARM64 (M4 Mac with Apple Silicon)
- Use `--platform linux/arm64` for Docker builds
- Native performance without cross-compilation overhead

**Docker Optimization**:
- Selective pruning strategy (no `docker system prune -af`)
- `docker container prune -f` - Remove stopped containers
- `docker image prune -f` - Remove dangling images
- `docker volume prune -f` - Remove unused volumes

### ✅ Deployment Status

**Current State**:
- ✅ Backend: FastAPI running on http://localhost:8000
- ✅ Frontend: React app running on http://localhost:3000
- ✅ Database: PostgreSQL connected and initialized
- ✅ All containers: Healthy and running

**Build Version**: `index-BokmqCAI.js`  
**Platform**: ARM64 (M4 Mac)  
**Status**: Ready for production  

---

## Previous Releases

### [0.9.0] - October 29, 2025

#### Fixed
- HTML tags now stripped from DOCX and PDF report exports
- HTML tags removed from UI finding descriptions and remediation
- Increased file upload limit from 1MB to 10MB via Nginx configuration

#### Tests
- Verified DOCX exports (45K file, no HTML tags)
- Verified PDF exports (29-page file, no HTML tags)
- File upload test successful (2.2MB test file)

---

### [0.8.0] - October 28, 2025 (Initial Release)

#### Core Features
- ✅ Project management (create, list, get, delete)
- ✅ Vulnerability report parsing (Burp Suite XML)
- ✅ Finding deduplication
- ✅ Finding management (instances, risk ratings)
- ✅ Report generation (PDF, DOCX, Excel export)
- ✅ Risk visualization (pie chart)
- ✅ Dark/light mode UI
- ✅ User preferences persistence

#### Technology Stack
- **Backend**: FastAPI 0.104.1 + SQLModel + PostgreSQL
- **Frontend**: React 18.3.1 + TypeScript + Vite 5.4.21 + Material-UI 5
- **Deployment**: Docker Compose (3 services: backend, db, frontend)

#### API Endpoints
- `GET /health` - System health check
- `POST /projects/` - Create project
- `GET /projects/` - List all projects
- `GET /projects/{id}` - Get project with findings tree
- `POST /projects/{id}/upload/{scanner}` - Upload vulnerability report
- `GET /projects/{id}/risk_summary` - Risk distribution data
- `GET /projects/{id}/report.pdf` - Generate PDF report
- `GET /projects/{id}/report.docx` - Generate DOCX report
- `WS /ws/{project_id}` - WebSocket for real-time updates

#### Security Features
- XXE prevention (defusedxml parsing)
- DTD blocking
- 10 MiB file size limit
- Input validation via Pydantic
- SQL injection prevention
- CORS middleware

---

## Release Guidelines

### Future Updates

**When adding features:**
1. Update this Changelog.md file ONLY
2. Add changes under `[Unreleased]` section
3. Use format: `### ✨ Added`, `### 🐛 Fixed`, `### 📝 Changed`
4. When releasing, move to versioned section with date
5. Update version number in relevant files

**Changelog Sections**:
- `✨ Added` - New features
- `🐛 Fixed` - Bug fixes
- `📝 Changed` - Changes to existing functionality
- `⚠️ Deprecated` - Soon-to-be removed features
- `🗑️ Removed` - Removed features
- `🔒 Security` - Security fixes and updates
- `📚 Documentation` - Documentation updates
- `🧪 Testing` - Testing improvements
- `🔧 Configuration` - System/deployment changes

**Commit Message Format**:
```
type(scope): description

feat(projects): add inline editing for project names
fix(reports): strip HTML tags from DOCX exports
docs(changelog): update release notes
chore(docker): optimize build process
```

---

## Archive

**Old Summary Files** (consolidated into this Changelog):
- SESSION_SUMMARY.md ← consolidated
- SESSION_SUMMARY_OCT30.md ← consolidated
- SESSION_COMPLETION.md ← consolidated
- HTML_EXPORT_FIX_SUMMARY.md ← consolidated
- FEATURE_STATUS.md ← consolidated
- PROJECT_QUICK_ACTIONS_SUMMARY.md ← reference
- INLINE_EDIT_FEATURE.md ← reference

**Note**: Keep reference documentation files for technical details, but use this Changelog for all release notes and change tracking.

---

**Last Updated**: October 30, 2025  
**Maintainer**: VulnManager Team  
**Repository**: https://github.com/aphesz/vuln-manager
