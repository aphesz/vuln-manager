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
git clone [YOUR_REPO_URL] vuln-manager
cd vuln-manager

# Build images and start all three services (backend, db, frontend)
docker-compose up --build -d# vuln-manager
