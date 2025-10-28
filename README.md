# 🛡️ VulnManager: Scalable Vulnerability Management Platform

VulnManager is a comprehensive, full-stack web application designed to help cybersecurity consultants manage and report findings from assessment projects. It features automated report parsing, intelligent deduplication, and customizable reporting capabilities.

## 🚀 Key Features

* **Scalable Architecture:** Built with FastAPI, PostgreSQL, and Docker for high performance and portability.
* **Intelligent Deduplication:** Findings are grouped into master issues with multiple specific instances.
* **Secure File Parsing:** Securely imports reports from **Burp Suite XML** and **Nessus XML** with built-in XXE prevention and size limits.
* **Data Visualization:** API endpoint for generating real-time risk summary charts.
* **Professional Reporting:** Export findings tables directly into **DOCX** and **PDF** formats.

## 🛠️ Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend** (API) | **FastAPI (Python)** | High performance, automatic validation (Pydantic), and Swagger/ReDoc documentation. |
| **Database** | **PostgreSQL** | Robust, scalable, production-ready relational database. |
| **ORM** | **SQLModel** | Unified Pydantic models for validation and SQLAlchemy for database interaction. |
| **Frontend** (WIP) | **React / Nginx** | Modern SPA framework served securely for decoupled scaling. |
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
