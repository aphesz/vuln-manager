# backend/app/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy import text
from typing import Optional, List, Dict, Any
import os
import sys
import logging

# Configure logging to output to stdout
logging.basicConfig(
    level=logging.INFO if os.getenv('ENVIRONMENT') == 'production' else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Test log message on startup
logger.debug("Logging initialized in main.py")

# Custom imports
from app.models import (
    Project,
    Finding,
    Instance,
    RiskMapping,
    FindingBase,  # Import FindingBase instead of top-level RiskRating
    ProjectReadWithFindings,
    FindingReadWithInstances,
)

# Use the RiskRating from FindingBase
RiskRating = FindingBase.RiskRating
from app.parsers import parse_xml_content
from app.reports import generate_report_docx, generate_report_pdf

# --- Database Setup ---

# Use SQLite as the default when no DATABASE_URL is provided.
# This avoids the need for the `psycopg2` driver in local/dev environments.
# For production you can still set DATABASE_URL to a PostgreSQL DSN (e.g.,
# "postgresql+psycopg2://user:password@db:5432/vuln_db").
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    """Initializes the database and creates all tables defined in SQLModel."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency to get a new DB session."""
    with Session(engine) as session:
        yield session

# --- FastAPI App Initialization ---

from app.websocket import WebSocketManager

app = FastAPI(
    title="VulnManager API",
    description="API for managing vulnerability assessment projects and reports.",
    version="1.0.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (can be restricted in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize WebSocket manager
ws_manager = WebSocketManager()

@app.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: int):
    await ws_manager.connect(websocket, project_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, project_id)

# --- Utility Functions ---

def fix_risk_ratings_in_db(session: Session):
    """
    Fix any incorrectly cased risk ratings in the database.
    """
    logger.info("Checking for risk ratings that need fixing...")
    
    try:
        # First, get a list of all findings
        findings = session.exec(select(Finding)).all()
        logger.info(f"Found {len(findings)} total findings")
        
        fixed_count = 0
        for finding in findings:
            current = finding.risk_rating
            logger.debug(f"Checking finding {finding.id} with risk_rating '{current}'")
            
            # Map the current rating to the correct enum value
            if current == 'MEDIUM':
                finding.risk_rating = RiskRating.Medium.value
                fixed_count += 1
            elif current == 'LOW':
                finding.risk_rating = RiskRating.Low.value
                fixed_count += 1
            elif current == 'HIGH':
                finding.risk_rating = RiskRating.High.value
                fixed_count += 1
            elif current == 'CRITICAL':
                finding.risk_rating = RiskRating.Critical.value
                fixed_count += 1
            elif current in ('INFORMATION', 'INFORMATIONAL'):
                finding.risk_rating = RiskRating.Informational.value
                fixed_count += 1
        
        if fixed_count > 0:
            logger.info(f"Fixed {fixed_count} risk ratings")
            session.commit()
        else:
            logger.info("No risk ratings needed fixing")
            
    except Exception as e:
        logger.error(f"Error fixing risk ratings: {str(e)}", exc_info=True)
        session.rollback()
        raise

def get_risk_rating(raw_rating: str) -> RiskRating:
    """Map raw scanner severity to the :class:`RiskRating` enum.

    The function returns a ``RiskRating`` member, which SQLModel stores as the
    corresponding string value in the PostgreSQL ``risk_rating`` ENUM column.
    
    Valid values are: Critical, High, Medium, Low, Informational
    
    Args:
        raw_rating: The raw risk rating from a scanner (can be numeric or text)
        
    Returns:
        RiskRating: A valid enum member with proper case
    """
    logger.debug(f"Converting raw risk rating: {raw_rating!r}")
    
    # Handle None/empty values
    if not raw_rating:
        logger.warning("Empty risk rating, defaulting to Low")
        return RiskRating.Low
    
    raw_str = str(raw_rating).strip()
    
    # First try exact match (handles already correct values)
    try:
        return RiskRating(raw_str)
    except ValueError:
        pass
    
    # Then try proper case version of the string
    try:
        proper_case = raw_str.lower().capitalize()
        if proper_case == 'Information':  # Special case
            proper_case = 'Informational'
        return RiskRating(proper_case)
    except ValueError:
        pass
    
    # Finally try mapping from known scanner values
    mapping = {
        # Numeric ratings (Nessus)
        '0': RiskRating.Informational,
        '1': RiskRating.Low,
        '2': RiskRating.Medium,
        '3': RiskRating.High,
        '4': RiskRating.Critical,
        
        # Common text variations
        'INFO': RiskRating.Informational,
        'INFORMATIONAL': RiskRating.Informational,
        'INFORMATION': RiskRating.Informational,
        'FALSE POSITIVE': RiskRating.Informational,
    }
    
    result = mapping.get(raw_str.upper(), RiskRating.Low)
    logger.debug(f"Mapped {raw_rating!r} to {result.value}")
    return result

async def process_and_save_issue(session: Session, project_id: int, issue_data: Dict[str, Any]):
    """
    Checks for an existing Finding, creates or updates it, and adds a new Instance.
    
    Args:
        session: Database session
        project_id: ID of the project to add findings to
        issue_data: Dictionary containing finding data from scanner
        
    Returns:
        bool: True if successful
        
    Raises:
        ValueError: If required data is missing or invalid
    """
    # Validate required fields
    if not issue_data.get('title'):
        raise ValueError("Finding title is required")
        
    title = issue_data['title']
    raw_risk = issue_data.get('risk_rating_raw')
    
    logger.info(f"Processing finding: {title!r}")
    logger.debug(f"Raw risk rating: {raw_risk!r}")
    
    try:
        standard_risk = get_risk_rating(raw_risk)
        logger.debug(f"Normalized risk rating: {standard_risk.value}")
    except Exception as e:
        logger.error(f"Error converting risk rating {raw_risk!r}: {e}")
        standard_risk = RiskRating.Low
        
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
    
    # Send WebSocket notification
    await ws_manager.broadcast_finding_update(
        project_id,
        finding.id,
        'update' if existing_finding else 'create'
    )
    
    return True

# --- Application Startup and Health Check ---

@app.on_event("startup")
def on_startup():
    """Runs when the FastAPI application starts."""
    create_db_and_tables()
    
    # Fix the database using direct connection first
    from app.db import fix_risk_ratings_direct
    fix_risk_ratings_direct()

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

@app.put("/projects/{project_id}", response_model=Project)
def update_project(project_id: int, project_update: Project, session: Session = Depends(get_session)):
    """Updates an existing project (name, consultant, archive status)."""
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    project.name = project_update.name
    project.consultant_name = project_update.consultant_name
    project.is_archived = project_update.is_archived
    project.archived_at = project_update.archived_at
    
    session.add(project)
    session.commit()
    session.refresh(project)
    return project

@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, session: Session = Depends(get_session)):
    """Deletes a project and all associated findings and instances."""
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete all instances for this project's findings
    findings = session.exec(
        select(Finding).where(Finding.project_id == project_id)
    ).all()
    
    for finding in findings:
        instances = session.exec(
            select(Instance).where(Instance.finding_id == finding.id)
        ).all()
        for instance in instances:
            session.delete(instance)
        session.delete(finding)
    
    # Delete the project
    session.delete(project)
    session.commit()
    
    logger.info(f"Project {project_id} and all associated findings deleted")

# --- Endpoint: Report Upload and Parsing ---

async def _process_upload(
    project_id: int,
    scanner_type: str,
    xml_content: bytes,
    session: Session
) -> Dict[str, Any]:
    """
    Shared logic for processing uploaded reports.
    """
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        logger.info(f"Processing report as {scanner_type} for project {project_id}")
        
        # 1. Parse the XML content using the robust utility function
        logger.debug("Parsing XML content...")
        issues_data = parse_xml_content(xml_content, scanner_type)
        logger.debug(f"Found {len(issues_data)} issues in report")
        
    except ValueError as e:
        logger.error(f"Parsing Error: {e}")
        # Handles DTD security block, invalid XML, or unknown scanner type errors
        raise HTTPException(status_code=400, detail=f"Parsing Error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during parsing: {e}", exc_info=True)
        # Catch all other unexpected errors during file processing
        raise HTTPException(status_code=500, detail=f"Internal Server Error during file processing: {e}")

    # 2. Process and Save all issues to the database (Deduplication occurs here)
    new_instances_count = 0
    for issue in issues_data:
        await process_and_save_issue(session, project_id, issue)
        new_instances_count += 1

    return {
        "message": f"Successfully processed report for Project {project_id}.",
        "new_instances_count": new_instances_count
    }

# NOTE: The /auto endpoint must be defined FIRST, before the generic /{scanner_type} endpoint,
# otherwise FastAPI will match /auto against /{scanner_type} and pass "auto" as the scanner_type
@app.post("/projects/{project_id}/upload/auto", status_code=201)
async def upload_report_auto(
    project_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Auto-detects scanner type from XML content and processes accordingly.
    Supports: Burp Suite XML, Nessus v2 XML
    """
    xml_content = await file.read()
    
    # Auto-detect scanner type
    xml_str = xml_content.decode('utf-8', errors='ignore')
    
    if '<NessusClientData' in xml_str:
        scanner_type = 'nessus'
    elif '<issues burpversion' in xml_str.lower() or '<issues' in xml_str.lower():
        scanner_type = 'burp'
    else:
        raise HTTPException(
            status_code=400,
            detail="Could not auto-detect scanner type. Supported formats: Burp Suite XML, Nessus v2 XML"
        )
    
    logger.info(f"Auto-detected scanner type: {scanner_type}")
    return await _process_upload(project_id, scanner_type, xml_content, session)

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
    xml_content = await file.read()
    return await _process_upload(project_id, scanner_type, xml_content, session)

@app.get("/projects/{project_id}/risk_summary")
def get_risk_summary(project_id: int, session: Session = Depends(get_session)):
    """
    Returns a summary of findings grouped by risk level.
    Used for risk visualization charts.
    """
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Initialize risk summary
    risk_summary = {
        'Critical': 0,
        'High': 0,
        'Medium': 0,
        'Low': 0,
        'Informational': 0
    }
    
    # Count findings by risk level
    findings = session.exec(
        select(Finding).where(Finding.project_id == project_id)
    ).all()
    
    for finding in findings:
        # finding.risk_rating is already a string (enum value)
        risk_level = finding.risk_rating
        if risk_level in risk_summary:
            risk_summary[risk_level] += 1
    
    return risk_summary

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