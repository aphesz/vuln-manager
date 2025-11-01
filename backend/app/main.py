# backend/app/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse
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
    Comment,
    CommentRead,
    CommentBase,
    AuditLog,
    AuditLogRead,
    JiraSettings,
    JiraSettingsRead,
    JiraSettingsBase,
)

# Use the RiskRating from FindingBase
RiskRating = FindingBase.RiskRating
from app.parsers import parse_xml_content
from app.reports import generate_report_docx, generate_report_pdf
from app.sla import (
    calculate_sla_deadline,
    update_finding_sla,
    get_overdue_findings,
    get_sla_summary,
)
from app.jira import get_jira_client, encrypt_token
import json
from datetime import datetime

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
    version="0.3.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (can be restricted in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security headers middleware (strict HTTP security)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Prevent clickjacking attacks
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Enable XSS protection (legacy, but good for older browsers)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Referrer policy - only send referrer for same-origin requests
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Permissions policy - disable sensitive features not in use
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    # Content Security Policy - restrict resource loading (adjust as needed)
    # Allow: same-origin scripts/styles, unsafe-inline for Material-UI (evaluate later)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self' ws: wss:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    
    return response

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
def health_check(session: Session = Depends(get_session)):
    """
    Health check endpoint for monitoring and orchestrators.
    Returns 200 if service and database are healthy.
    """
    try:
        # Test database connection with a simple query
        session.exec(text("SELECT 1")).first()
        return {
            "status": "healthy",
            "service": "vuln-manager-api",
            "database": "connected",
            "version": "0.3.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "vuln-manager-api",
                "database": "disconnected",
                "error": str(e)
            }
        )

@app.get("/ready")
def readiness_check(session: Session = Depends(get_session)):
    """
    Readiness check for Kubernetes/orchestrators.
    Returns 200 only if service is ready to accept requests.
    """
    try:
        # Test database connectivity
        session.exec(text("SELECT 1")).first()
        # Check that at least tables exist
        session.exec(select(Project)).first()
        return {
            "ready": True,
            "service": "vuln-manager-api"
        }
    except Exception as e:
        logger.warning(f"Readiness check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "ready": False,
                "service": "vuln-manager-api",
                "reason": "Database not initialized"
            }
        )

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

@app.post("/projects/{project_id}/upload/auto", status_code=201)
async def upload_report_auto(
    project_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Auto-detects scanner type from XML content and processes accordingly.
    Supports: Burp Suite XML, Nessus v2 XML
    
    Security:
    - File size limit: 10 MiB (enforced in parsers.py)
    - Content-type validation: XML only
    - XXE protection: defusedxml parsing
    """
    # Validate content type
    if file.content_type and not file.content_type.startswith('application/xml') and not file.content_type.startswith('text/xml'):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Expected XML file."
        )
    
    # Validate filename
    if not file.filename or not file.filename.lower().endswith(('.xml', '.nessus')):
        raise HTTPException(
            status_code=400,
            detail="Invalid filename. Must be .xml or .nessus file."
        )
    
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
    
    Security:
    - Scanner type whitelist validation
    - Content-type validation: XML only
    - File size limit: 10 MiB (enforced in parsers.py)
    """
    # Whitelist valid scanner types
    valid_scanners = {'burp', 'nessus'}
    scanner_type_lower = scanner_type.lower().strip()
    
    if scanner_type_lower not in valid_scanners:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scanner type: {scanner_type}. Supported: {', '.join(valid_scanners)}"
        )
    
    # Validate content type
    if file.content_type and not file.content_type.startswith('application/xml') and not file.content_type.startswith('text/xml'):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Expected XML file."
        )
    
    # Validate filename
    if not file.filename or not file.filename.lower().endswith(('.xml', '.nessus')):
        raise HTTPException(
            status_code=400,
            detail="Invalid filename. Must be .xml or .nessus file."
        )
    
    xml_content = await file.read()
    return await _process_upload(project_id, scanner_type_lower, xml_content, session)

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

# --- Peer Review Workflow Endpoints ---

@app.patch("/findings/{finding_id}/review")
def update_finding_review_status(
    finding_id: int,
    review_status: str,
    user: str = "system",  # TODO: Replace with actual auth user
    session: Session = Depends(get_session)
):
    """
    Update the review status of a finding.
    
    Args:
        finding_id: ID of the finding
        review_status: New review status (Pending, In Review, Approved, Rejected)
        user: User making the change (from auth token in production)
    """
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    # Validate review status
    valid_statuses = ['Pending', 'In Review', 'Approved', 'Rejected']
    if review_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    old_status = finding.review_status.value if finding.review_status else None
    finding.review_status = FindingBase.ReviewStatus(review_status)
    
    # Create audit log entry
    audit_entry = AuditLog(
        entity_type="finding",
        entity_id=finding_id,
        action="status_changed",
        user=user,
        timestamp=datetime.utcnow(),
        changes_json=json.dumps({
            "field": "review_status",
            "old_value": old_status,
            "new_value": review_status
        })
    )
    
    session.add(finding)
    session.add(audit_entry)
    session.commit()
    session.refresh(finding)
    
    logger.info(f"Finding {finding_id} review status updated: {old_status} -> {review_status} by {user}")
    
    return {
        "id": finding.id,
        "review_status": finding.review_status.value,
        "updated_by": user
    }

@app.post("/findings/{finding_id}/comments", response_model=CommentRead)
def create_comment(
    finding_id: int,
    comment_data: CommentBase,
    session: Session = Depends(get_session)
):
    """
    Add a comment to a finding.
    
    Args:
        finding_id: ID of the finding
        comment_data: Comment data (text, user)
    """
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    # Validate comment length
    if len(comment_data.text) > 5000:
        raise HTTPException(status_code=400, detail="Comment text exceeds maximum length of 5000 characters")
    
    if not comment_data.text.strip():
        raise HTTPException(status_code=400, detail="Comment text cannot be empty")
    
    comment = Comment(
        text=comment_data.text,
        user=comment_data.user,
        created_at=datetime.utcnow(),
        finding_id=finding_id
    )
    
    # Create audit log entry
    audit_entry = AuditLog(
        entity_type="comment",
        entity_id=0,  # Will be updated after commit
        action="created",
        user=comment_data.user,
        timestamp=datetime.utcnow(),
        changes_json=json.dumps({
            "finding_id": finding_id,
            "text_preview": comment_data.text[:100] + "..." if len(comment_data.text) > 100 else comment_data.text
        })
    )
    
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    # Update audit entry with comment ID
    audit_entry.entity_id = comment.id
    session.add(audit_entry)
    session.commit()
    
    logger.info(f"Comment {comment.id} added to finding {finding_id} by {comment_data.user}")
    
    return comment

@app.get("/findings/{finding_id}/comments", response_model=List[CommentRead])
def get_finding_comments(
    finding_id: int,
    session: Session = Depends(get_session)
):
    """Get all comments for a finding."""
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    comments = session.exec(
        select(Comment)
        .where(Comment.finding_id == finding_id)
        .order_by(Comment.created_at.desc())
    ).all()
    
    return comments

@app.get("/audit-log", response_model=List[AuditLogRead])
def get_audit_log(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    user: Optional[str] = None,
    limit: int = 100,
    session: Session = Depends(get_session)
):
    """
    Get audit log entries with optional filtering.
    
    Args:
        entity_type: Filter by entity type (finding, project, comment, etc.)
        entity_id: Filter by entity ID
        user: Filter by user
        limit: Maximum number of entries to return (default 100, max 1000)
    """
    if limit > 1000:
        limit = 1000
    
    query = select(AuditLog)
    
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if user:
        query = query.where(AuditLog.user == user)
    
    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    
    entries = session.exec(query).all()
    return entries

# --- Jira Integration Endpoints ---

@app.post("/jira/settings", response_model=JiraSettingsRead)
def create_jira_settings(
    settings_data: JiraSettingsBase,
    api_token: str,  # Separate from model for security
    project_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """
    Create or update Jira integration settings.
    
    Security: API token is encrypted before storage.
    """
    # Encrypt the API token
    encrypted_token = encrypt_token(api_token)
    
    settings = JiraSettings(
        jira_url=settings_data.jira_url,
        project_key=settings_data.project_key,
        api_token_encrypted=encrypted_token,
        is_active=settings_data.is_active,
        project_id=project_id
    )
    
    session.add(settings)
    session.commit()
    session.refresh(settings)
    
    logger.info(f"Jira settings created for project {project_id}")
    
    return settings

@app.post("/jira/test-connection")
async def test_jira_connection(
    jira_url: str,
    email: str,
    api_token: str
):
    """Test Jira connection without saving settings."""
    from app.jira import JiraClient
    
    client = JiraClient(jira_url, email, api_token)
    result = await client.test_connection()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@app.post("/findings/{finding_id}/create-jira-issue")
async def create_jira_issue_for_finding(
    finding_id: int,
    project_key: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Create a Jira issue from a finding.
    
    Args:
        finding_id: ID of the finding
        project_key: Jira project key (optional, uses settings if not provided)
    """
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    if finding.jira_issue_key:
        raise HTTPException(
            status_code=400,
            detail=f"Finding already has Jira issue: {finding.jira_issue_key}"
        )
    
    # Get Jira client for the project
    client = get_jira_client(session, finding.project_id)
    if not client:
        raise HTTPException(
            status_code=400,
            detail="Jira integration not configured for this project"
        )
    
    # Get project key from settings if not provided
    if not project_key:
        settings_query = select(JiraSettings).where(
            JiraSettings.project_id == finding.project_id,
            JiraSettings.is_active == True
        )
        settings = session.exec(settings_query).first()
        if not settings:
            raise HTTPException(status_code=400, detail="No active Jira settings found")
        project_key = settings.project_key
    
    # Create the issue
    issue_data = await client.create_issue(project_key, finding)
    
    if not issue_data:
        raise HTTPException(status_code=500, detail="Failed to create Jira issue")
    
    # Update finding with Jira issue key
    finding.jira_issue_key = issue_data["key"]
    finding.jira_status = "Open"  # Default status
    
    # Create audit log entry
    audit_entry = AuditLog(
        entity_type="finding",
        entity_id=finding_id,
        action="jira_issue_created",
        user="system",
        timestamp=datetime.utcnow(),
        changes_json=json.dumps({
            "jira_issue_key": issue_data["key"],
            "jira_issue_id": issue_data["id"]
        })
    )
    
    session.add(finding)
    session.add(audit_entry)
    session.commit()
    session.refresh(finding)
    
    logger.info(f"Created Jira issue {issue_data['key']} for finding {finding_id}")
    
    return {
        "finding_id": finding_id,
        "jira_issue_key": issue_data["key"],
        "jira_url": f"{client.jira_url}/browse/{issue_data['key']}"
    }

@app.post("/webhooks/jira")
async def jira_webhook(
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Webhook endpoint for receiving Jira updates.
    
    Security: In production, verify webhook signature/token.
    """
    try:
        payload = await request.json()
        
        # Extract relevant data from Jira webhook
        webhook_event = payload.get("webhookEvent")
        issue_key = payload.get("issue", {}).get("key")
        new_status = payload.get("issue", {}).get("fields", {}).get("status", {}).get("name")
        
        logger.info(f"Received Jira webhook: {webhook_event} for {issue_key}")
        
        if not issue_key:
            return {"status": "ignored", "reason": "No issue key in payload"}
        
        # Find finding with this Jira issue key
        finding = session.exec(
            select(Finding).where(Finding.jira_issue_key == issue_key)
        ).first()
        
        if not finding:
            return {"status": "ignored", "reason": f"No finding found for issue {issue_key}"}
        
        # Update finding's Jira status
        old_status = finding.jira_status
        finding.jira_status = new_status
        
        # Create audit log entry
        audit_entry = AuditLog(
            entity_type="finding",
            entity_id=finding.id,
            action="jira_status_updated",
            user="jira_webhook",
            timestamp=datetime.utcnow(),
            changes_json=json.dumps({
                "jira_issue_key": issue_key,
                "old_status": old_status,
                "new_status": new_status,
                "webhook_event": webhook_event
            })
        )
        
        session.add(finding)
        session.add(audit_entry)
        session.commit()
        
        logger.info(f"Updated finding {finding.id} Jira status: {old_status} -> {new_status}")
        
        return {
            "status": "success",
            "finding_id": finding.id,
            "old_status": old_status,
            "new_status": new_status
        }
        
    except Exception as e:
        logger.error(f"Error processing Jira webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error processing webhook")

# --- SLA & Remediation Tracking Endpoints ---

@app.get("/findings/overdue")
def get_overdue_findings_endpoint(session: Session = Depends(get_session)):
    """Get all findings that are past their SLA deadline."""
    findings = get_overdue_findings(session)
    return [FindingReadWithInstances.from_orm(f) for f in findings]

@app.patch("/findings/{finding_id}/remediation")
def update_finding_remediation(
    finding_id: int,
    remediation_deadline: Optional[str] = None,  # ISO format datetime string
    remediation_owner: Optional[str] = None,
    user: str = "system",
    session: Session = Depends(get_session)
):
    """
    Update remediation tracking for a finding.
    
    Args:
        finding_id: ID of the finding
        remediation_deadline: New deadline (ISO format)
        remediation_owner: Person responsible for remediation
    """
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    changes = {}
    
    if remediation_deadline:
        try:
            new_deadline = datetime.fromisoformat(remediation_deadline.replace('Z', '+00:00'))
            old_deadline = finding.remediation_deadline
            finding.remediation_deadline = new_deadline
            changes["remediation_deadline"] = {
                "old": old_deadline.isoformat() if old_deadline else None,
                "new": new_deadline.isoformat()
            }
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format.")
    
    if remediation_owner is not None:
        old_owner = finding.remediation_owner
        finding.remediation_owner = remediation_owner
        changes["remediation_owner"] = {
            "old": old_owner,
            "new": remediation_owner
        }
    
    # Recalculate SLA status
    finding = update_finding_sla(finding, session)
    
    # Create audit log entry
    if changes:
        audit_entry = AuditLog(
            entity_type="finding",
            entity_id=finding_id,
            action="remediation_updated",
            user=user,
            timestamp=datetime.utcnow(),
            changes_json=json.dumps(changes)
        )
        session.add(audit_entry)
        session.commit()
    
    logger.info(f"Finding {finding_id} remediation updated by {user}")
    
    return {
        "id": finding.id,
        "remediation_deadline": finding.remediation_deadline.isoformat() if finding.remediation_deadline else None,
        "remediation_owner": finding.remediation_owner,
        "sla_status": finding.sla_status.value if finding.sla_status else None
    }

@app.get("/sla-summary")
def get_sla_summary_endpoint(session: Session = Depends(get_session)):
    """Get a summary of findings by SLA status."""
    return get_sla_summary(session)