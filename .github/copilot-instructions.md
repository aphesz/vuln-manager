# 🤖 Copilot Agent Instructions for **VulnManager**

## 📦 Project Overview
- **Backend**: FastAPI (Python) using **SQLModel** (Pydantic + SQLAlchemy) with PostgreSQL.
- **Frontend**: React SPA served by Nginx (WIP).
- **Deployment**: Docker Compose orchestrates three services – `backend`, `db`, `frontend`.
- **Core Domain**: Projects → Findings (deduplicated) → Instances (individual occurrences).
- **Key Files**:
  - `backend/app/main.py` – API entry point, DB session handling, risk‑rating mapping, upload/parsing endpoints.
  - `backend/app/models.py` – SQLModel definitions and read‑models used for FastAPI responses.
  - `backend/app/parsers.py` – Secure XML parsing for Burp/Nessus reports.
  - `backend/app/reports.py` – DOCX/PDF generation utilities.
  - `docker-compose.yml` – Service definitions, environment variables.
  - `frontend/src/**` – React components (Dashboard, FindingsTable, etc.).

## 🏗️ Architecture & Data Flow
1. **Client** (React) calls FastAPI endpoints (`/projects/...`).
2. **FastAPI** uses dependency‑injected `Session` (SQLModel) to query/modify PostgreSQL.
3. **Upload Endpoint** (`/projects/{id}/upload/{scanner}`) reads XML, calls `parse_xml_content` → list of issue dicts.
4. **Processing** (`process_and_save_issue`) deduplicates findings, creates `Instance` rows, and normalizes risk via `get_risk_rating`.
5. **Report Generation** (`/projects/{id}/report.docx`) pulls full project graph (`ProjectReadWithFindings`) and feeds it to `generate_report_docx`/`pdf`.
6. **Frontend** consumes JSON responses; charts are built from the `RiskMapping` utility model.

## 🔧 Development & Deployment Workflow

### Development Mode
- **Start dev stack**: `ENVIRONMENT=development docker-compose -f docker-compose.dev.yml up --build -d`
- **Run backend locally**: Ensure virtualenv and `pip install -r backend/requirements.txt`
- **Hot Reload**: Development mode enables file watching and auto-reload
- **Debugging**: Development mode includes SQL query logging and DEBUG level output
- **Database**: Tables auto-created on startup via `create_db_and_tables`
- **Testing**: Add tests under `backend/tests/` and run with `docker exec vuln-manager-backend pytest`
- **Code Quality**: Use `ruff` and `black` (not bundled)

### Production Mode
- **Start prod stack**: `docker-compose up --build -d`
- **Performance Settings**:
  - 2 uvicorn workers (configurable via `WORKERS` env var)
  - Connection pooling (pool_size=5, max_overflow=10)
  - Limited concurrency (1000 connections)
  - Optimized keep-alive (5 seconds)
- **Logging**: INFO level only, no SQL query logging
- **Resource Usage**:
  - Disabled file watching
  - Efficient connection handling
  - Minimal logging overhead
- **Monitoring**: Process and connection metrics available via status endpoints

## 📏 Project‑Specific Conventions
- **Risk Rating Normalization** – always use `get_risk_rating` to map raw scanner values to the exact ENUM strings stored in PostgreSQL (`Critical`, `High`, `Medium`, `Low`, `None`).
- **Read Models** – API responses must use the `*ReadWith*` models defined in `models.py`; never return raw ORM objects.
- **Deduplication Logic** – `process_and_save_issue` first searches for an existing `Finding` by `project_id` + `title`. If found, only a new `Instance` is added.
- **File Upload Size** – the parser enforces a 10 MiB limit (hard‑coded in `parsers.py`).
- **SQLModel Imports** – all DB models live in `backend/app/models.py`; import them via `from app.models import …`.
- **Docker Environment Variables** – `DATABASE_URL` defaults to `postgresql+psycopg2://user:password@db:5432/vuln_db`. Override in `.env` for local dev.
- **Breadcrumb Navigation** – **ALL new pages MUST include breadcrumb navigation** using the `PageBreadcrumbs` component from `frontend/src/components/PageBreadcrumbs.tsx`. Add it at the top of every page component for consistent navigation UX.

## 🎨 Frontend Component Guidelines

### Required: Breadcrumb Navigation
**Every new page component MUST include breadcrumbs** at the top for consistent navigation:

```tsx
import PageBreadcrumbs from './PageBreadcrumbs';

const MyNewPage: React.FC = () => {
  const { projectId } = useParams();
  
  return (
    <Container>
      {/* REQUIRED: Breadcrumb navigation */}
      <PageBreadcrumbs projectId={projectId} />
      
      {/* Page content */}
      <Typography variant="h4">My Page</Typography>
      {/* ... */}
    </Container>
  );
};
```

**Custom breadcrumb items** (optional):
```tsx
<PageBreadcrumbs 
  projectId={projectId}
  projectName="My Project"
  items={[
    { label: 'Projects', path: '/', icon: <HomeIcon fontSize="small" /> },
    { label: 'Project Name', path: `/projects/${projectId}` },
    { label: 'Current Page', icon: <CustomIcon fontSize="small" /> }
  ]}
/>
```

**Auto-detection** (default behavior):
- If no `items` prop provided, breadcrumbs are auto-generated from URL path
- Automatically recognizes: dashboard, attack-surface, trends, findings, templates, sla-policy, compliance, calculators, reports
- Shows appropriate icons for each page type

### Breadcrumb Requirements
✅ **DO**: Include `<PageBreadcrumbs />` at the top of every page  
✅ **DO**: Pass `projectId` when available  
✅ **DO**: Use auto-detection for standard pages  
✅ **DO**: Customize `items` only for special cases  
❌ **DON'T**: Create pages without breadcrumbs  
❌ **DON'T**: Implement custom breadcrumb UI (use the component)

## 🔗 Integration Points & External Dependencies

### Core Dependencies
- **PostgreSQL**: Accessed via `sqlmodel.create_engine` with connection pooling
  ```python
  engine = create_engine(
      DATABASE_URL,
      echo=False,
      pool_pre_ping=True,
      pool_size=5,
      max_overflow=10,
      pool_recycle=3600
  )
  ```
- **XML Parsing**: Uses `defusedxml` for secure XXE-free parsing
- **Report Generation**: `python-docx` for DOCX, `reportlab` for PDF
- **Frontend**: React app built with `npm run build`, served by Nginx

### Deployment Configuration
- **Database Connection**:
  - Production: Pooled connections with timeout
  - Development: Echo mode for query logging
- **Server Settings**:
  - Production: Multi-worker uvicorn without reload
  - Development: Single worker with hot-reload
- **Docker Services**:
  - `backend`: FastAPI app with optimized uvicorn settings
  - `db`: PostgreSQL with volume persistence
  - `frontend`: Nginx serving React build with API proxy

## 📚 How to Extend
1. **Add a new scanner**: create a parser function in `parsers.py`, update the `upload_report` endpoint to accept the new `scanner_type`, and extend `get_risk_rating` if needed.
2. **New API endpoint**: follow the pattern in `main.py` – declare a route, use `Depends(get_session)`, and return a read model.
3. **New frontend page**: 
   - Create component under `src/components/`
   - **ALWAYS include `<PageBreadcrumbs />` at the top**
   - Add route in `App.tsx`
   - Consume backend API via service layer
   - Follow Material-UI design patterns

---
*These instructions are intended for AI agents (Copilot, Claude, etc.) to quickly understand the codebase, run common commands, and follow project conventions.*
