# VulnManager Changelog

All notable changes to VulnManager are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

---

## [1.0.0] - October 30, 2025

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
