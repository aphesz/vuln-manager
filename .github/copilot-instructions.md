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

## 🔧 Development Workflow
- **Start the stack**: `docker-compose up --build -d` (backend, db, frontend).
- **Run backend locally** (outside Docker) – ensure the same virtualenv and `pip install -r backend/requirements.txt` (includes `fastapi`, `sqlmodel`, `uvicorn`).
- **Database migrations**: No Alembic; tables are auto‑created on startup (`create_db_and_tables`).
- **Testing**: No test suite yet – add `pytest` under `backend/tests/` and run `docker exec vuln-manager-backend pytest`.
- **Debugging**: Use `uvicorn backend.app.main:app --reload` inside the container or locally; logs show SQL statements (`engine = create_engine(..., echo=True)`).
- **Lint/format**: `ruff` and `black` are recommended (not bundled). Add a pre‑commit hook if needed.

## 📏 Project‑Specific Conventions
- **Risk Rating Normalization** – always use `get_risk_rating` to map raw scanner values to the exact ENUM strings stored in PostgreSQL (`Critical`, `High`, `Medium`, `Low`, `None`).
- **Read Models** – API responses must use the `*ReadWith*` models defined in `models.py`; never return raw ORM objects.
- **Deduplication Logic** – `process_and_save_issue` first searches for an existing `Finding` by `project_id` + `title`. If found, only a new `Instance` is added.
- **File Upload Size** – the parser enforces a 10 MiB limit (hard‑coded in `parsers.py`).
- **SQLModel Imports** – all DB models live in `backend/app/models.py`; import them via `from app.models import …`.
- **Docker Environment Variables** – `DATABASE_URL` defaults to `postgresql+psycopg2://user:password@db:5432/vuln_db`. Override in `.env` for local dev.

## 🔗 Integration Points & External Dependencies
- **PostgreSQL** – accessed via `sqlmodel.create_engine`. Ensure the `psycopg2-binary` package is installed.
- **XML Parsing** – uses `defusedxml` to prevent XXE attacks; only Burp and Nessus schemas are supported.
- **Report Generation** – `python-docx` for DOCX, `reportlab` for PDF (declared in `backend/requirements.txt`).
- **Frontend Build** – `npm install && npm run build` inside `frontend/`; the built static files are served by Nginx.
- **Docker Compose** – `backend` depends on `db`; `frontend` depends on `backend` for API proxying (via Nginx `proxy_pass`).

## 📚 How to Extend
1. **Add a new scanner**: create a parser function in `parsers.py`, update the `upload_report` endpoint to accept the new `scanner_type`, and extend `get_risk_rating` if needed.
2. **New API endpoint**: follow the pattern in `main.py` – declare a route, use `Depends(get_session)`, and return a read model.
3. **Frontend component**: add a React component under `src/components/`, expose it via a route in `App.js`, and consume the corresponding backend JSON.

---
*These instructions are intended for AI agents (Copilot, Claude, etc.) to quickly understand the codebase, run common commands, and follow project conventions.*
