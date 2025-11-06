# 🛡️ VulnManager: Scalable Vulnerability Management Platform

VulnManager is a comprehensive, full-stack web application designed to help cybersecurity consultants manage and report findings from assessment projects. It features automated report parsing, intelligent deduplication, and customizable reporting capabilities.

## 🚀 Key Features

### Core Functionality
* **Scalable Architecture:** Built with FastAPI, PostgreSQL, and Docker for high performance and portability.
* **Intelligent Deduplication:** Findings are grouped into master issues with multiple specific instances.
* **Secure File Parsing:** Securely imports reports from **Burp Suite XML** and **Nessus XML** with built-in XXE prevention and size limits.
* **Data Visualization:** Real-time risk summary charts and dashboard metrics (Total, Critical, High, Medium/Low findings).
* **Professional Reporting:** Export findings tables directly into **DOCX** and **PDF** formats.

### Advanced Features ✨
* **🔍 Quick Add Finding:** Rapid finding creation with vulnerability template search and multi-instance support.
* **📚 Vulnerability Repository:** Searchable library of vulnerability templates with CWE/CVE mapping and external database import.
* **🗄️ CWE Database Import:** Bulk import MITRE CWE database (900+ weakness entries) for comprehensive vulnerability coverage.
* **� CVE Import:** Import individual CVEs directly from NIST NVD API with automatic template creation.
* **📊 Import History:** Track all CWE/CVE database imports with statistics (created, updated, skipped, errors, success rate).
* **�📤 Export Enhancements:** Export to Excel/CSV with custom column selection and advanced filtering.
* **📊 Dashboard Widgets:** Real-time metrics cards showing project statistics and risk distribution.
* **�🔄 Peer Review Workflow:** Complete review system with status tracking (Pending, In Review, Approved, Rejected), reviewer assignment, and collaborative comments.
* **📊 Issue Status Tracking:** Manage finding lifecycle (Open, Partially Closed, Closed) with status comments and audit trails.
* **⏰ SLA Management:** Automatic deadline tracking with visual indicators (On Track, At Risk, Overdue) based on risk severity.
* **🔗 Jira Integration:** Bi-directional sync with Jira for seamless issue tracking and status updates.
* **💬 Collaborative Comments:** Team discussion on findings with timezone-aware timestamps and real-time updates.
* **🌍 Timezone Support:** Full timezone awareness (default GMT+8/MYT) with user preferences for dates and times.
* **✏️ Inline Editing:** Quick edit finding titles, risk ratings, and statuses directly in the data grid.
* **📱 Responsive Design:** Mobile-optimized UI with high contrast theme and accessibility features (WCAG 2.1 Level AA).
* **⌨️ Keyboard Shortcuts:** Power user features with keyboard navigation and quick actions.
* **🔍 Advanced Filtering:** Multi-criteria filtering by risk rating, issue status, SLA status, and more.
* **📈 Project Statistics:** Last upload dates, risk distribution, and finding counts on project cards.
* **🎨 Fluid Tables:** Auto-resizing columns and persistent user preferences for table layouts.

## 🛠️ Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend** (API) | **FastAPI (Python)** | High performance, automatic validation (Pydantic), and Swagger/ReDoc documentation. |
| **Database** | **PostgreSQL** | Robust, scalable, production-ready relational database with timezone support. |
| **ORM** | **SQLModel** | Unified Pydantic models for validation and SQLAlchemy for database interaction. |
| **Frontend** | **React + TypeScript + Material-UI** | Modern, type-safe SPA with rich component library and responsive design. |
| **Deployment** | **Docker & Docker Compose** | Ensures portability and isolated environments. |

## ⚙️ Setup and Installation

### Prerequisites

1.  **Docker** and **Docker Compose** installed.
2.  A terminal/shell environment (Bash, PowerShell, etc.).

### 1. Clone Repository and Build

```bash
git clone https://github.com/aphesz/vuln-manager.git vuln-manager
cd vuln-manager

# Build images and start all three services (backend, db, frontend)
docker-compose up --build -d

# For development with hot-reload, use:
ENVIRONMENT=development docker-compose -f docker-compose.dev.yml up --build -d
```

### 2. Environment Configuration

The application supports two deployment modes:

#### Production Mode (Default)
- Optimized for performance and stability
- Multiple workers (2 by default)
- Connection pooling
- Minimal logging
- No file watching/hot-reload

#### Development Mode
- Enhanced debugging
- SQL query logging
- Hot-reload enabled
- Detailed logging
- Single worker

### 3. Performance Tuning

Key configuration parameters (set in Dockerfile or environment):

```ini
# Backend Performance
WORKERS=2                    # Number of uvicorn workers
LIMIT_CONCURRENCY=1000       # Maximum concurrent connections
BACKLOG=2048                # Connection queue size
TIMEOUT_KEEP_ALIVE=5        # Keep-alive timeout in seconds

# Database Optimization
POOL_SIZE=5                 # Base pool size
MAX_OVERFLOW=10             # Maximum additional connections
POOL_RECYCLE=3600          # Connection recycle time in seconds
```

For high-traffic deployments, consider adjusting these values based on your hardware resources.

### 4. Access the Application

Once all services are running:

- **Frontend UI:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs (Swagger UI)
- **Alternative API Docs:** http://localhost:8000/redoc (ReDoc)

### 5. Database Migrations

The application uses Alembic for database migrations. Migrations run automatically on startup, but you can manage them manually:

```bash
# Check current migration version
docker exec -w /code vuln-manager-backend-1 alembic current

# Run all pending migrations
docker exec -w /code vuln-manager-backend-1 alembic upgrade head

# Revert last migration
docker exec -w /code vuln-manager-backend-1 alembic downgrade -1

# View migration history
docker exec -w /code vuln-manager-backend-1 alembic history
```

## 📱 User Interface Features

### Dashboard
- **Metrics Cards:** Visual display of Total, Critical, High, and Medium/Low findings
- **Risk Distribution Chart:** Interactive donut chart showing finding breakdown by severity
- **Project Statistics:** Quick overview of last upload dates and risk counts per project

### Findings Management
- **Multi-Tab Detail View:** Overview, Instances, Remediation, Peer Review, Issue Status
- **Inline Editing:** Quick edit titles, risk ratings, and statuses without opening dialogs
- **Bulk Actions:** Update multiple findings at once (risk rating, status, export)
- **Advanced Filtering:** Filter by risk level, issue status, SLA status, and more
- **Column Customization:** Show/hide columns, resize, and persist preferences

### Collaboration
- **Peer Review System:** Assign reviewers, track review status, add reviewer comments
- **Comments Section:** Team discussions on findings with timezone-aware timestamps
- **Audit Trails:** Complete history of changes for compliance and accountability

### Integrations
- **Jira Sync:** Create and track Jira issues directly from findings
- **Report Export:** Generate professional DOCX/PDF reports with customizable templates

### Vulnerability Repository & CWE/CVE Import
- **Template Library:** 900+ vulnerability templates from MITRE CWE database + NIST NVD CVE data
- **CWE Import Process:**
  1. Navigate to **Vulnerability Repository** page
  2. Click **"Import CWE Database"** button in toolbar
  3. Download latest CWE XML from https://cwe.mitre.org/data/xml/cwec_latest.xml.zip
  4. Upload the XML file (supports up to 50MB)
  5. Review import statistics (parsed, created, skipped, errors)
  6. Choose to overwrite existing entries or skip duplicates
- **CVE Import Process:**
  1. Click **"Import CVE"** button in toolbar
  2. Enter CVE ID (e.g., CVE-2024-1234 or just 2024-1234)
  3. Click "Import CVE" to fetch from NIST NVD API
  4. Review imported CVE details (CVSS score, description, remediation)
  5. Optional: Check "Overwrite existing" to update existing CVE templates
- **Import History:**
  1. Click **"Import History"** button to view all imports
  2. See statistics: date, source (CWE/NVD), templates created/updated/skipped, errors, success rate
  3. Filter by source or view all records
  4. Delete history records (does not affect imported templates)
- **Auto-Enrichment:** Imported templates include CWE/CVE IDs, weakness descriptions, CVSS scores, remediation strategies, and risk ratings
- **Smart Matching:** Auto-link findings to CWE/CVE templates during scan uploads

## 🔧 API Endpoints

Key API endpoints (full documentation at `/docs`):

### Projects
- `GET /projects/` - List all projects
- `POST /projects/` - Create new project (rate limited: 30/hour)
- `GET /projects/{id}` - Get project with findings
- `GET /projects/stats/all` - Get all projects with statistics
- `POST /projects/{id}/upload/{scanner}` - Upload Burp/Nessus report (rate limited: 10/min)
- `POST /projects/{id}/findings` - Manually create finding (rate limited: 20/min)
- `GET /projects/{id}/export.{format}` - Export findings (csv/xlsx)

### Findings
- `GET /findings/` - List all findings
- `PATCH /findings/{id}` - Update finding
- `GET /findings/{id}/comments` - Get finding comments
- `POST /findings/{id}/comments` - Add comment (rate limited: 60/min)

### Vulnerability Templates
- `GET /vulnerability-templates` - List all templates (search, filter, paginate)
- `POST /vulnerability-templates` - Create template (rate limited: 30/hour)
- `POST /vulnerability-templates/import-cwe-database` - Bulk import MITRE CWE database (50MB limit)
- `POST /vulnerability-templates/import-cve` - Import single CVE from NIST NVD by CVE ID
- `GET /vulnerability-templates/{id}` - Get template details
- `GET /cwe/{cwe_id}` - Lookup CWE by ID (local DB or MITRE redirect)
- `GET /repository/search` - Search templates (fuzzy search)
- `GET /projects/{id}/template-suggestions` - Get project-specific suggestions

### Import History
- `GET /import-history` - List all import history records (paginated, filterable by source)
- `GET /import-history/{id}` - Get import history details
- `DELETE /import-history/{id}` - Delete import history record

### Peer Review
- `GET /findings/{id}/review` - Get review status
- `PATCH /findings/{id}/review` - Update review status

### Jira Integration
- `POST /jira/settings` - Configure Jira settings
- `POST /jira/create-issue/{finding_id}` - Create Jira issue
- `GET /jira/sync/{finding_id}` - Sync Jira status

### SLA & Issue Tracking
- `GET /sla/overview/{project_id}` - SLA dashboard
- `PATCH /findings/{id}/issue-status` - Update issue status

## 🧪 Testing

The project includes comprehensive test suites for both frontend and backend:

```bash
# Run backend tests
docker exec vuln-manager-backend-1 pytest

# Run frontend tests
docker exec vuln-manager-frontend-1 npm test

# Run tests with coverage
docker exec vuln-manager-backend-1 pytest --cov=app --cov-report=html
```

See `/backend/tests/README.md` for detailed testing documentation.

## 🎨 Themes & Accessibility

- **Light/Dark Mode:** System preference detection with manual toggle
- **High Contrast Theme:** WCAG 2.1 Level AA compliant for accessibility
- **Responsive Design:** Optimized for desktop, tablet, and mobile devices
- **Keyboard Navigation:** Full keyboard support with shortcuts
- **Screen Reader Support:** ARIA labels and semantic HTML

## 🌍 Timezone Support

VulnManager supports full timezone awareness:

- **Default Timezone:** GMT+8 (Asia/Kuala_Lumpur - Malaysia Time)
- **User Preferences:** Configurable timezone per user
- **Supported Timezones:** All IANA timezone database entries
- **Automatic Conversion:** All timestamps stored in UTC, displayed in user's timezone
- **Relative Timestamps:** "2 hours ago" format with absolute time tooltips

## 📊 Database Schema

Key database models:

- **Project:** Container for findings
- **Finding:** Deduplicated vulnerability/issue
- **Instance:** Specific occurrence of a finding
- **Comment:** Team discussions on findings
- **AuditLog:** Change tracking for compliance
- **JiraSettings:** Jira integration configuration
- **UserPreferences:** User timezone and locale settings

All datetime fields use `TIMESTAMPTZ` (timezone-aware) for proper timezone handling.

## 🔒 Security Features

- **Rate Limiting:** Automatic throttling of API requests to prevent abuse
  - Uploads: 10 per minute per IP
  - Project creation: 30 per hour per IP
  - Finding creation: 20 per minute per IP
  - Comments: 60 per minute per IP
  - Templates: 30 per hour per IP
- **Input Validation:** Comprehensive sanitization of all user inputs
  - Length limits (titles: 200 chars, descriptions: 5000 chars)
  - HTML/Script tag stripping to prevent XSS attacks
  - URL format validation
  - Maximum instance limits (100 per request)
- **XXE Prevention:** Secure XML parsing with `defusedxml`
- **File Size Limits:** 10 MiB upload limit to prevent DoS
- **SQL Injection Protection:** Parameterized queries via SQLModel
- **Security Headers:** CSP, X-Frame-Options, X-Content-Type-Options, etc.
- **Connection Pooling:** Prevents connection exhaustion attacks
- **CORS Configuration:** Controlled cross-origin access

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check database is running
docker ps | grep vuln-manager-db

# View database logs
docker logs vuln-manager-db-1

# Connect to database directly
docker exec -it vuln-manager-db-1 psql -U pgakar -d vulndb
```

### Backend Issues
```bash
# View backend logs
docker logs vuln-manager-backend-1 -f

# Restart backend
docker-compose restart backend

# Check migration status
docker exec -w /code vuln-manager-backend-1 alembic current
```

### Frontend Issues
```bash
# View frontend logs
docker logs vuln-manager-frontend-1

# Rebuild frontend
docker-compose up --build -d frontend

# Clear browser cache and reload
```

## 📝 Changelog

See [Changelog.md](Changelog.md) for version history and release notes.

## 🤝 Contributing

Contributions are welcome! Please see [.github/copilot-instructions.md](.github/copilot-instructions.md) for development guidelines and architecture overview.

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [Material-UI](https://mui.com/) - React component library
- [PostgreSQL](https://www.postgresql.org/) - Database
- [SQLModel](https://sqlmodel.tiangolo.com/) - SQL database ORM
- [Docker](https://www.docker.com/) - Containerization

---

**VulnManager** - Making vulnerability management efficient and collaborative 🛡️
