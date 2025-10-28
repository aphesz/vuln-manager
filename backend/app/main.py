# backend/app/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlmodel import SQLModel, Session, create_engine, select
from typing import Optional, List, Dict, Any
import os

# Custom imports
from app.models import (
    Project,
    Finding,
    Instance,
    RiskMapping,
    RiskRating,
    ProjectReadWithFindings,
    FindingReadWithInstances,
)
from app.parsers import parse_xml_content
from app.reports import generate_report_docx, generate_report_pdf

# --- Database Setup ---

# Use SQLite as the default when no DATABASE_URL is provided.
# This avoids the need for the `psycopg2` driver in local/dev environments.
# For production you can still set DATABASE_URL to a PostgreSQL DSN (e.g.,
# "postgresql+psycopg2://user:password@db:5432/vuln_db").
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    """Initializes the database and creates all tables defined in SQLModel."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency to get a new DB session."""
    with Session(engine) as session:
        yield session

# --- FastAPI App Initialization ---

app = FastAPI(
    title="VulnManager API",
    description="API for managing vulnerability assessment projects and reports.",
    version="1.0.0"
)

# --- Utility Functions ---

def get_risk_rating(raw_rating: str) -> RiskRating:
    """Map raw scanner severity to the :class:`RiskRating` enum.

    The function returns a ``RiskRating`` member, which SQLModel stores as the
    corresponding string value in the PostgreSQL ``risk_rating`` ENUM column.
    """

    mapping = {
        # Burp mappings
        "CRITICAL": RiskRating.Critical,
        "HIGH": RiskRating.High,
        "MEDIUM": RiskRating.Medium,
        "LOW": RiskRating.Low,
        "INFORMATION": RiskRating.Informational,
        "FALSE POSITIVE": RiskRating.Informational,
        # Nessus mappings (numeric strings)
        "4": RiskRating.Critical,
        "3": RiskRating.High,
        "2": RiskRating.Medium,
        "1": RiskRating.Low,
        "0": RiskRating.Informational,
    }

    return mapping.get(raw_rating.upper(), RiskRating.Informational)

def process_and_save_issue(session: Session, project_id: int, issue_data: Dict[str, Any]):
    """
    Checks for an existing Finding, creates or updates it, and adds a new Instance.
    """
    title = issue_data['title']
    standard_risk = get_risk_rating(issue_data['risk_rating_raw'])
    
    # 1. Check for existing Finding (Deduplication Logic)
    existing_finding = session.exec(
        select(Finding)
        .where(Finding.project_id == project_id)
        .where(Finding.title == title)
    ).first()
    
    if existing_finding:
        finding = existing_finding
    else:
        # 2. Create a new Finding
        finding = Finding(
            project_id=project_id,
            title=title,
            risk_rating=standard_risk,
            description=issue_data.get('description', 'No description provided.'),
            remediation=issue_data.get('remediation', 'No remediation provided.')
        )
        session.add(finding)
        session.flush() # Flushes to get the finding.id for the instance

    # 3. Create a new Instance
    instance = Instance(
        finding_id=finding.id,
        location=issue_data.get('location', 'N/A'),
        details=issue_data.get('details', 'N/A'),
        status='New - Unvalidated' # Default status
    )
    session.add(instance)
    
    session.commit()
    return True

# --- Application Startup and Health Check ---

@app.on_event("startup")
def on_startup():
    """Runs when the FastAPI application starts."""
    create_db_and_tables()

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "database": "connected"}

# --- Endpoint: Project Management ---

@app.post("/projects/", response_model=Project)
def create_project(project: Project, session: Session = Depends(get_session)):
    """Creates a new project entry."""
    session.add(project)
    session.commit()
    session.refresh(project)
    return project

@app.get("/projects/", response_model=List[Project])
def read_projects(session: Session = Depends(get_session)):
    """Returns a list of all projects."""
    projects = session.exec(select(Project)).all()
    return projects

@app.get("/projects/{project_id}", response_model=ProjectReadWithFindings) # Using the corrected model name
def read_project(project_id: int, session: Session = Depends(get_session)):
    """Returns details for a specific project, including all findings and instances."""
    project = session.exec(
        select(Project)
        .where(Project.id == project_id)
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return project

# --- Endpoint: Report Upload and Parsing ---

@app.post("/projects/{project_id}/upload/{scanner_type}", status_code=201)
async def upload_report(
    project_id: int,
    scanner_type: str,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Uploads an XML report, parses it, and saves findings/instances to the database.
    Supported types: 'burp', 'nessus'.
    """
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        xml_content = await file.read()
        
        # 1. Parse the XML content using the robust utility function
        issues_data = parse_xml_content(xml_content, scanner_type)
        
    except ValueError as e:
        # Handles DTD security block, invalid XML, or unknown scanner type errors
        raise HTTPException(status_code=400, detail=f"Parsing Error: {e}")
    except Exception as e:
        # Catch all other unexpected errors during file processing
        raise HTTPException(status_code=500, detail=f"Internal Server Error during file processing: {e}")

    # 2. Process and Save all issues to the database (Deduplication occurs here)
    new_instances_count = 0
    for issue in issues_data:
        process_and_save_issue(session, project_id, issue)
        new_instances_count += 1

    return {
        "message": f"Successfully processed report for Project {project_id}.",
        "new_instances_count": new_instances_count
    }

# --- Endpoint: Report Generation ---

@app.get("/projects/{project_id}/report.docx", response_class=FileResponse)
def get_docx_report(project_id: int, session: Session = Depends(get_session)):
    """Generates and returns the assessment report in DOCX format."""
    project = session.exec(select(Project).where(Project.id == project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate the report file path
    file_path = f"/tmp/report_{project_id}.docx"
    generate_report_docx(project, file_path)
    
    return FileResponse(
        file_path, 
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f"{project.name.replace(' ', '_')}_Report.docx"
    )

@app.get("/projects/{project_id}/report.pdf", response_class=FileResponse)
def get_pdf_report(project_id: int, session: Session = Depends(get_session)):
    """Generates and returns the assessment report in PDF format."""
    project = session.exec(select(Project).where(Project.id == project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Build a risk summary for the project.
    # Use the RiskRating enum values to ensure we cover all possible ratings.
    risk_levels = [r.value for r in RiskRating]
    summary: dict[str, int] = {level: 0 for level in risk_levels}

    findings = session.exec(
        select(Finding.risk_rating).where(Finding.project_id == project_id)
    ).all()

    for risk in findings:
        # ``risk`` is stored as the enum string value.
        if risk in summary:
            summary[risk] += 1

    # Generate a placeholder PDF (or real PDF in the future).
    file_path = f"/tmp/report_{project_id}.pdf"
    generate_report_pdf(project, file_path)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"{project.name.replace(' ', '_')}_Report.pdf",
    )