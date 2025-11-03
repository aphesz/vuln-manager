# backend/app/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
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
    VulnerabilityTemplate,
    VulnerabilityTemplateRead,
    VulnerabilityMatch,
    VulnerabilityMatchRead,
)

# Use the RiskRating from FindingBase
RiskRating = FindingBase.RiskRating
from app.parsers import parse_xml_content
from app import scoring
from app.reports import generate_report_docx, generate_report_pdf
from app.sla import (
    calculate_sla_deadline,
    update_finding_sla,
    get_overdue_findings,
    get_sla_summary,
)
from app.jira import get_jira_client, encrypt_token
from app.timezone_utils import (
    get_utc_now,
    convert_to_user_timezone,
    parse_iso_datetime,
    DEFAULT_TIMEZONE,
    TIMEZONE_CHOICES,
    is_valid_timezone,
)
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

# --- Request Models (for API endpoints) ---
from pydantic import BaseModel

class ReviewStatusUpdate(BaseModel):
    """Request model for updating finding review status."""
    status: str
    reviewer_name: Optional[str] = None

class JiraSettingsCreate(BaseModel):
    """Request model for creating/updating Jira settings."""
    project_id: int
    jira_url: str
    project_key: str
    api_token: str
    is_active: bool = True

class JiraConnectionTest(BaseModel):
    """Request model for testing Jira connection."""
    jira_url: str
    email: str  # Jira user email for authentication
    api_token: str

class JiraIssueCreate(BaseModel):
    """Request model for creating Jira issue from finding."""
    user: str = "system"

class RemediationUpdate(BaseModel):
    """Request model for updating remediation deadline and owner."""
    remediation_deadline: Optional[str] = None
    remediation_owner: Optional[str] = None
    user: str = "system"

class IssueStatusUpdate(BaseModel):
    """Request model for updating finding issue status."""
    issue_status: str  # "Open", "Partially Closed", or "Closed"
    issue_status_comment: Optional[str] = None
    user: str = "system"

# --- Application Lifespan ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI application startup and shutdown."""
    # Startup
    create_db_and_tables()
    
    # Fix the database using direct connection first
    from app.db import fix_risk_ratings_direct
    fix_risk_ratings_direct()
    
    yield
    
    # Shutdown (if needed in future)

# --- FastAPI App Initialization ---

from app.websocket import WebSocketManager

app = FastAPI(
    title="VulnManager API",
    description="API for managing vulnerability assessment projects and reports.",
    version="0.3.0",
    lifespan=lifespan
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
    
    # Content Security Policy - restrict resource loading
    # Allow Swagger UI CDN resources (cdn.jsdelivr.net) for API documentation
    # Allow: same-origin scripts/styles, unsafe-inline for Material-UI and Swagger UI
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "img-src 'self' data: https:; "
        "font-src 'self' https://cdn.jsdelivr.net; "
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
    Also auto-creates or links to vulnerability templates.
    
    Args:
        session: Database session
        project_id: ID of the project to add findings to
        issue_data: Dictionary containing finding data from scanner
        
    Returns:
        bool: True if successful
        
    Raises:
        ValueError: If required data is missing or invalid
    """
    import re
    
    # Validate required fields
    if not issue_data.get('title'):
        raise ValueError("Finding title is required")
        
    title = issue_data['title']
    raw_risk = issue_data.get('risk_rating_raw')
    description = issue_data.get('description', 'No description provided.')
    remediation = issue_data.get('remediation', 'No remediation provided.')
    
    logger.info(f"Processing finding: {title!r}")
    logger.debug(f"Raw risk rating: {raw_risk!r}")
    
    try:
        standard_risk = get_risk_rating(raw_risk)
        logger.debug(f"Normalized risk rating: {standard_risk.value}")
    except Exception as e:
        logger.error(f"Error converting risk rating {raw_risk!r}: {e}")
        standard_risk = RiskRating.Low
    
    # Extract CWE and CVE IDs from description
    cwe_match = re.search(r'CWE-(\d+)', description, re.IGNORECASE)
    cve_match = re.search(r'CVE-\d{4}-\d{4,}', description, re.IGNORECASE)
    
    cwe_id = f"CWE-{cwe_match.group(1)}" if cwe_match else None
    cve_id = cve_match.group(0) if cve_match else None
    
    if cwe_id:
        logger.debug(f"Extracted CWE: {cwe_id}")
    if cve_id:
        logger.debug(f"Extracted CVE: {cve_id}")
    
    # 1. Check for existing Finding (Deduplication Logic)
    existing_finding = session.exec(
        select(Finding)
        .where(Finding.project_id == project_id)
        .where(Finding.title == title)
    ).first()
    
    # 2. Find or create vulnerability template
    template = None
    template_id = None
    
    # Try to find existing template by title, CWE, or CVE
    if cwe_id or cve_id:
        statement = select(VulnerabilityTemplate)
        if cwe_id:
            statement = statement.where(VulnerabilityTemplate.cwe_id == cwe_id)
        elif cve_id:
            statement = statement.where(VulnerabilityTemplate.cve_id == cve_id)
        template = session.exec(statement).first()
    
    # If no template found by CWE/CVE, try matching by title
    if not template:
        template = session.exec(
            select(VulnerabilityTemplate).where(VulnerabilityTemplate.title == title)
        ).first()
    
    # Create new template if none exists
    if not template:
        logger.info(f"Creating new vulnerability template from scan: {title}")
        template = VulnerabilityTemplate(
            title=title,
            description=description,
            cwe_id=cwe_id,
            cve_id=cve_id,
            default_risk_rating=standard_risk.value,
            vulnerability_type=_extract_vulnerability_type(title),
            remediation_summary=remediation[:500] if remediation else None,  # First 500 chars
            remediation_steps=remediation,
            source=issue_data.get('scanner_type', 'scan'),  # 'burp', 'nessus', etc.
            is_verified=False,  # Auto-created templates need review
            usage_count=0,
            created_at=get_utc_now(),
            updated_at=get_utc_now()
        )
        session.add(template)
        session.flush()  # Get template.id
    
    template_id = template.id
    
    # Update template usage count
    template.usage_count += 1
    template.last_used = get_utc_now()
    session.add(template)
    
    if existing_finding:
        finding = existing_finding
        # Update template_id if not set
        if not finding.template_id:
            finding.template_id = template_id
            session.add(finding)
    else:
        # 3. Create a new Finding with template link
        finding = Finding(
            project_id=project_id,
            title=title,
            risk_rating=standard_risk,
            description=description,
            remediation=remediation,
            template_id=template_id
        )
        session.add(finding)
        session.flush() # Flushes to get the finding.id for the instance

    # 4. Create a new Instance
    instance = Instance(
        finding_id=finding.id,
        location=issue_data.get('location', 'N/A'),
        details=issue_data.get('details', 'N/A'),
        status='New - Unvalidated',  # Default status
        created_at=get_utc_now()  # Set creation timestamp
    )
    session.add(instance)
    
    session.commit()
    
    # Send WebSocket notification
    await ws_manager.broadcast_finding_update(
        project_id,
        finding.id,
        'update' if existing_finding else 'create'
    )
    
    logger.info(f"Finding processed successfully. Template ID: {template_id}, Finding ID: {finding.id}")
    
    return True


def _extract_vulnerability_type(title: str) -> str:
    """
    Extract vulnerability type from title for categorization.
    
    Args:
        title: Finding title
        
    Returns:
        str: Vulnerability type (XSS, SQLi, CSRF, etc.)
    """
    title_lower = title.lower()
    
    # Common vulnerability type patterns
    if 'xss' in title_lower or 'cross-site scripting' in title_lower or 'cross site scripting' in title_lower:
        return 'XSS'
    elif 'sql' in title_lower and 'injection' in title_lower:
        return 'SQLi'
    elif 'csrf' in title_lower or 'cross-site request forgery' in title_lower:
        return 'CSRF'
    elif 'ssrf' in title_lower or 'server-side request forgery' in title_lower:
        return 'SSRF'
    elif 'rce' in title_lower or 'remote code execution' in title_lower:
        return 'RCE'
    elif 'lfi' in title_lower or 'local file inclusion' in title_lower:
        return 'LFI'
    elif 'rfi' in title_lower or 'remote file inclusion' in title_lower:
        return 'RFI'
    elif 'xxe' in title_lower or 'xml external entity' in title_lower:
        return 'XXE'
    elif 'idor' in title_lower or 'insecure direct object' in title_lower:
        return 'IDOR'
    elif 'path traversal' in title_lower or 'directory traversal' in title_lower:
        return 'Path Traversal'
    elif 'authentication' in title_lower or 'auth' in title_lower:
        return 'Authentication'
    elif 'authorization' in title_lower:
        return 'Authorization'
    elif 'session' in title_lower:
        return 'Session Management'
    elif 'encryption' in title_lower or 'crypto' in title_lower:
        return 'Cryptography'
    elif 'information disclosure' in title_lower or 'info leak' in title_lower:
        return 'Information Disclosure'
    elif 'dos' in title_lower or 'denial of service' in title_lower:
        return 'DoS'
    elif 'buffer overflow' in title_lower:
        return 'Buffer Overflow'
    elif 'insecure deserialization' in title_lower:
        return 'Insecure Deserialization'
    else:
        return 'Other'


# --- Health Check ---

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

@app.get("/projects/stats/all")
def get_all_projects_with_stats(session: Session = Depends(get_session)):
    """Returns all projects with their statistics (findings count, risk summary)."""
    projects = session.exec(select(Project)).all()
    
    projects_with_stats = []
    for project in projects:
        # Get findings count
        findings = session.exec(
            select(Finding).where(Finding.project_id == project.id)
        ).all()
        
        # Calculate risk summary
        risk_summary = {
            'Critical': 0,
            'High': 0,
            'Medium': 0,
            'Low': 0,
            'Informational': 0
        }
        
        for finding in findings:
            risk_level = finding.risk_rating
            if risk_level in risk_summary:
                risk_summary[risk_level] += 1
        
        # Get last upload date from most recent instance
        last_upload = None
        for finding in findings:
            instances = session.exec(
                select(Instance).where(Instance.finding_id == finding.id)
            ).all()
            for instance in instances:
                if instance.created_at and (not last_upload or instance.created_at > last_upload):
                    last_upload = instance.created_at
        
        projects_with_stats.append({
            'id': project.id,
            'name': project.name,
            'consultant_name': project.consultant_name,
            'is_archived': project.is_archived,
            'archived_at': project.archived_at,
            'total_findings': len(findings),
            'critical_count': risk_summary['Critical'],
            'high_count': risk_summary['High'],
            'medium_count': risk_summary['Medium'],
            'low_count': risk_summary['Low'],
            'last_upload_date': last_upload,
            'risk_summary': risk_summary,
            'critical_high_count': risk_summary['Critical'] + risk_summary['High']
        })
    
    return projects_with_stats

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
        # Add scanner_type to issue data for template creation
        issue['scanner_type'] = scanner_type
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
    data: ReviewStatusUpdate,
    session: Session = Depends(get_session)
):
    """
    Update the review status of a finding.
    
    Args:
        finding_id: ID of the finding
        data: Review status update data (status, reviewer_name)
    """
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    # Map 'status' from request to 'review_status' for validation
    review_status = data.status
    reviewer_name = data.reviewer_name
    user = reviewer_name if reviewer_name else "system"
    
    # Validate review status
    valid_statuses = ['Pending', 'In Review', 'Approved', 'Rejected']
    if review_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    old_status = finding.review_status.value if finding.review_status else None
    old_reviewer = finding.reviewer_name
    
    finding.review_status = FindingBase.ReviewStatus(review_status)
    finding.reviewer_name = reviewer_name
    
    # Create audit log entry
    changes = {
        "review_status": {
            "old_value": old_status,
            "new_value": review_status
        }
    }
    if old_reviewer != reviewer_name:
        changes["reviewer_name"] = {
            "old_value": old_reviewer,
            "new_value": reviewer_name
        }
    
    audit_entry = AuditLog(
        entity_type="finding",
        entity_id=finding_id,
        action="review_status_changed",
        user=user,
        timestamp=get_utc_now(),
        changes_json=json.dumps(changes)
    )
    
    session.add(finding)
    session.add(audit_entry)
    session.commit()
    session.refresh(finding)
    
    logger.info(f"Finding {finding_id} review status updated: {old_status} -> {review_status} by {user}")
    
    return {
        "id": finding.id,
        "review_status": finding.review_status.value,
        "reviewer_name": finding.reviewer_name,
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
        created_at=get_utc_now(),
        finding_id=finding_id
    )
    
    # Create audit log entry
    audit_entry = AuditLog(
        entity_type="comment",
        entity_id=0,  # Will be updated after commit
        action="created",
        user=comment_data.user,
        timestamp=get_utc_now(),
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
        .order_by(Comment.created_at)  # Chronological order (oldest first)
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
    
    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)  # Newest first for better UX
    
    entries = session.exec(query).all()
    return entries

# --- Jira Integration Endpoints ---

@app.post("/jira/settings", response_model=JiraSettingsRead)
def create_jira_settings(
    data: JiraSettingsCreate,
    session: Session = Depends(get_session)
):
    """
    Create or update Jira integration settings.
    
    Security: API token is encrypted before storage.
    """
    # Encrypt the API token
    encrypted_token = encrypt_token(data.api_token)
    
    settings = JiraSettings(
        jira_url=data.jira_url,
        project_key=data.project_key,
        api_token_encrypted=encrypted_token,
        is_active=data.is_active,
        project_id=data.project_id
    )
    
    session.add(settings)
    session.commit()
    session.refresh(settings)
    
    logger.info(f"Jira settings created for project {data.project_id}")
    
    return settings

@app.get("/jira/settings/{project_id}", response_model=JiraSettingsRead)
def get_jira_settings(
    project_id: int,
    session: Session = Depends(get_session)
):
    """
    Retrieve Jira integration settings for a specific project.
    Returns 404 if settings not found.
    """
    statement = select(JiraSettings).where(JiraSettings.project_id == project_id)
    settings = session.exec(statement).first()
    
    if not settings:
        raise HTTPException(status_code=404, detail=f"Jira settings not found for project {project_id}")
    
    return settings

@app.post("/jira/test-connection")
async def test_jira_connection(
    data: JiraConnectionTest
):
    """Test Jira connection without saving settings."""
    from app.jira import JiraClient
    
    try:
        client = JiraClient(data.jira_url, data.email, data.api_token)
        result = await client.test_connection()
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "Connection failed"))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")

@app.post("/findings/{finding_id}/create-jira-issue")
async def create_jira_issue_for_finding(
    finding_id: int,
    data: JiraIssueCreate,
    session: Session = Depends(get_session)
):
    """
    Create a Jira issue from a finding.
    
    Args:
        finding_id: ID of the finding
        data: Request data containing user information
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
    
    # Get project key from settings
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
        user=data.user,
        timestamp=get_utc_now(),
        changes_json=json.dumps({
            "jira_issue_key": issue_data["key"],
            "jira_url": issue_data.get("self", "")
        })
    )
    
    session.add(finding)
    session.add(audit_entry)
    session.commit()
    session.refresh(finding)
    
    
    logger.info(f"Jira issue {issue_data['key']} created for finding {finding_id} by {data.user}")
    
    return {
        "jira_issue_key": finding.jira_issue_key,
        "jira_url": issue_data.get("self", ""),
        "finding_id": finding.id
    }

# ===============================
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
            timestamp=get_utc_now(),
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

@app.get("/findings/sla")
def get_all_findings_with_sla(session: Session = Depends(get_session)):
    """Get all findings with SLA tracking information."""
    statement = select(Finding)
    findings = session.exec(statement).all()
    return [FindingReadWithInstances.model_validate(f) for f in findings]

@app.get("/findings/overdue")
def get_overdue_findings_endpoint(session: Session = Depends(get_session)):
    """Get all findings that are past their SLA deadline."""
    findings = get_overdue_findings(session)
    return [FindingReadWithInstances.model_validate(f) for f in findings]

@app.patch("/findings/{finding_id}/remediation")
def update_finding_remediation(
    finding_id: int,
    data: RemediationUpdate,
    session: Session = Depends(get_session)
):
    """
    Update remediation tracking for a finding.
    
    Args:
        finding_id: ID of the finding
        data: Remediation update data (deadline, owner, user)
    """
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    changes = {}
    
    if data.remediation_deadline:
        try:
            new_deadline = datetime.fromisoformat(data.remediation_deadline.replace('Z', '+00:00'))
            old_deadline = finding.remediation_deadline
            finding.remediation_deadline = new_deadline
            changes["remediation_deadline"] = {
                "old": old_deadline.isoformat() if old_deadline else None,
                "new": new_deadline.isoformat()
            }
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format.")
    
    if data.remediation_owner is not None:
        old_owner = finding.remediation_owner
        finding.remediation_owner = data.remediation_owner
        changes["remediation_owner"] = {
            "old": old_owner,
            "new": data.remediation_owner
        }
    
    # Recalculate SLA status
    finding = update_finding_sla(finding, session)
    
    # Create audit log entry
    if changes:
        audit_entry = AuditLog(
            entity_type="finding",
            entity_id=finding_id,
            action="remediation_updated",
            user=data.user,
            timestamp=get_utc_now(),
            changes_json=json.dumps(changes)
        )
        session.add(audit_entry)
        session.commit()
    
    logger.info(f"Finding {finding_id} remediation updated by {data.user}")
    
    return {
        "id": finding.id,
        "remediation_deadline": finding.remediation_deadline.isoformat() if finding.remediation_deadline else None,
        "remediation_owner": finding.remediation_owner,
        "sla_status": finding.sla_status.value if finding.sla_status else None
    }

@app.patch("/findings/{finding_id}/issue-status")
def update_finding_issue_status(
    finding_id: int,
    data: IssueStatusUpdate,
    session: Session = Depends(get_session)
):
    """
    Update issue status for a finding.
    
    Args:
        finding_id: ID of the finding
        data: Issue status update data (status, comment, user)
    """
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    # Validate issue status
    valid_statuses = ["Open", "Partially Closed", "Closed"]
    if data.issue_status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid issue status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    changes = {}
    old_status = finding.issue_status.value if finding.issue_status else None
    old_comment = finding.issue_status_comment
    
    # Update status
    finding.issue_status = FindingBase.IssueStatus(data.issue_status)
    changes["issue_status"] = {
        "old": old_status,
        "new": data.issue_status
    }
    
    # Update comment if provided
    if data.issue_status_comment is not None:
        finding.issue_status_comment = data.issue_status_comment
        changes["issue_status_comment"] = {
            "old": old_comment,
            "new": data.issue_status_comment
        }
    
    session.add(finding)
    
    # Create audit log entry
    audit_entry = AuditLog(
        entity_type="finding",
        entity_id=finding_id,
        action="issue_status_updated",
        user=data.user,
        timestamp=get_utc_now(),
        changes_json=json.dumps(changes)
    )
    session.add(audit_entry)
    session.commit()
    session.refresh(finding)
    
    logger.info(f"Finding {finding_id} issue status updated to {data.issue_status} by {data.user}")
    
    return {
        "id": finding.id,
        "issue_status": finding.issue_status.value,
        "issue_status_comment": finding.issue_status_comment
    }

@app.patch("/findings/{finding_id}")
def update_finding(
    finding_id: int,
    data: dict,
    session: Session = Depends(get_session)
):
    """
    Update finding fields (title, risk_rating, etc.).
    
    Args:
        finding_id: ID of the finding
        data: Dictionary with fields to update (title, risk_rating, description, etc.)
    """
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    changes = {}
    
    # Update title if provided
    if "title" in data:
        old_title = finding.title
        finding.title = data["title"]
        changes["title"] = {
            "old": old_title,
            "new": data["title"]
        }
    
    # Update risk_rating if provided
    if "risk_rating" in data:
        old_risk = finding.risk_rating.value if finding.risk_rating else None
        new_risk = data["risk_rating"]
        
        # Validate risk rating
        valid_risks = ["Critical", "High", "Medium", "Low", "Informational"]
        if new_risk not in valid_risks:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid risk rating. Must be one of: {', '.join(valid_risks)}"
            )
        
        finding.risk_rating = RiskRating(new_risk)
        
        # Update SLA deadline when risk changes
        from app.sla import calculate_sla_deadline
        finding.remediation_deadline = calculate_sla_deadline(finding.risk_rating.value)
        
        changes["risk_rating"] = {
            "old": old_risk,
            "new": new_risk
        }
    
    # Update description if provided
    if "description" in data:
        old_desc = finding.description
        finding.description = data["description"]
        changes["description"] = {
            "old": old_desc[:100] if old_desc else None,  # Truncate for audit log
            "new": data["description"][:100] if data["description"] else None
        }
    
    session.add(finding)
    
    # Create audit log entry if changes were made
    if changes:
        audit_entry = AuditLog(
            entity_type="finding",
            entity_id=finding_id,
            action="finding_updated",
            user=data.get("user", "system"),
            timestamp=get_utc_now(),
            changes_json=json.dumps(changes)
        )
        session.add(audit_entry)
    
    session.commit()
    session.refresh(finding)
    
    logger.info(f"Finding {finding_id} updated with changes: {list(changes.keys())}")
    
    return {
        "id": finding.id,
        "title": finding.title,
        "risk_rating": finding.risk_rating.value,
        "description": finding.description,
        "remediation_deadline": finding.remediation_deadline.isoformat() if finding.remediation_deadline else None
    }

@app.get("/sla-summary")
def get_sla_summary_endpoint(session: Session = Depends(get_session)):
    """Get a summary of findings by SLA status."""
    return get_sla_summary(session)

# --- User Preferences & Timezone Endpoints ---

@app.get("/timezones")
def get_available_timezones():
    """Get list of available timezones for user selection."""
    return {
        "default": DEFAULT_TIMEZONE,
        "timezones": TIMEZONE_CHOICES
    }

@app.get("/user-preferences/{user_email}", response_model=Optional[Dict[str, Any]])
def get_user_preferences(
    user_email: str,
    session: Session = Depends(get_session)
):
    """
    Get user preferences including timezone settings.
    
    Args:
        user_email: User's email address
    """
    from app.models import UserPreferences
    
    statement = select(UserPreferences).where(UserPreferences.user_email == user_email)
    prefs = session.exec(statement).first()
    
    if not prefs:
        # Return defaults if no preferences exist
        return {
            "user_email": user_email,
            "timezone": DEFAULT_TIMEZONE,
            "date_format": "%Y-%m-%d %H:%M:%S %Z",
            "locale": "en_MY"
        }
    
    return {
        "id": prefs.id,
        "user_email": prefs.user_email,
        "timezone": prefs.timezone,
        "date_format": prefs.date_format,
        "locale": prefs.locale
    }

@app.post("/user-preferences")
def create_or_update_user_preferences(
    user_email: str = Body(...),
    timezone: str = Body(DEFAULT_TIMEZONE),
    date_format: str = Body("%Y-%m-%d %H:%M:%S %Z"),
    locale: str = Body("en_MY"),
    session: Session = Depends(get_session)
):
    """
    Create or update user preferences.
    
    Args:
        user_email: User's email address
        timezone: User's preferred timezone (IANA format)
        date_format: Preferred date format string
        locale: User's locale preference
    """
    from app.models import UserPreferences
    
    # Validate timezone
    if not is_valid_timezone(timezone):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timezone: {timezone}. Use IANA timezone names (e.g., 'Asia/Kuala_Lumpur')"
        )
    
    # Check if preferences exist
    statement = select(UserPreferences).where(UserPreferences.user_email == user_email)
    prefs = session.exec(statement).first()
    
    if prefs:
        # Update existing preferences
        prefs.timezone = timezone
        prefs.date_format = date_format
        prefs.locale = locale
    else:
        # Create new preferences
        prefs = UserPreferences(
            user_email=user_email,
            timezone=timezone,
            date_format=date_format,
            locale=locale
        )
        session.add(prefs)
    
    session.commit()
    session.refresh(prefs)
    
    logger.info(f"User preferences updated for {user_email}: timezone={timezone}")
    
    return {
        "id": prefs.id,
        "user_email": prefs.user_email,
        "timezone": prefs.timezone,
        "date_format": prefs.date_format,
        "locale": prefs.locale
    }

# =====================================================
# VULNERABILITY REPOSITORY ENDPOINTS
# =====================================================

@app.get("/api/vulnerability-templates", response_model=List[VulnerabilityTemplateRead])
def get_vulnerability_templates(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    source: Optional[str] = None,
    risk_rating: Optional[str] = None,
    is_verified: Optional[bool] = None,
    cwe_id: Optional[str] = None,
    cve_id: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Get all vulnerability templates with optional filtering and pagination.
    
    Query parameters:
    - skip: Number of records to skip (default: 0)
    - limit: Maximum number of records to return (default: 100, max: 1000)
    - search: Search in title and description
    - source: Filter by source (manual, burp, nessus, nvd, cwe)
    - risk_rating: Filter by default risk rating
    - is_verified: Filter by verification status
    - cwe_id: Filter by CWE ID
    - cve_id: Filter by CVE ID
    """
    from app.models import VulnerabilityTemplate
    
    # Build query
    statement = select(VulnerabilityTemplate)
    
    # Apply filters
    if search:
        search_pattern = f"%{search}%"
        statement = statement.where(
            (VulnerabilityTemplate.title.ilike(search_pattern)) |
            (VulnerabilityTemplate.description.ilike(search_pattern))
        )
    
    if source:
        statement = statement.where(VulnerabilityTemplate.source == source)
    
    if risk_rating:
        statement = statement.where(VulnerabilityTemplate.default_risk_rating == risk_rating)
    
    if is_verified is not None:
        statement = statement.where(VulnerabilityTemplate.is_verified == is_verified)
    
    if cwe_id:
        statement = statement.where(VulnerabilityTemplate.cwe_id == cwe_id)
    
    if cve_id:
        statement = statement.where(VulnerabilityTemplate.cve_id == cve_id)
    
    # Apply pagination and ordering
    statement = statement.order_by(VulnerabilityTemplate.created_at.desc())
    statement = statement.offset(skip).limit(min(limit, 1000))
    
    templates = session.exec(statement).all()
    return templates


@app.post("/api/vulnerability-templates", response_model=VulnerabilityTemplateRead, status_code=201)
async def create_vulnerability_template(
    title: str = Body(...),
    description: str = Body(...),
    cwe_id: Optional[str] = Body(None),
    cve_id: Optional[str] = Body(None),
    cvss_vector: Optional[str] = Body(None),
    cvss_score: Optional[float] = Body(None),
    owasp_likelihood: Optional[int] = Body(None),
    owasp_impact: Optional[int] = Body(None),
    owasp_risk_rating: Optional[str] = Body(None),
    default_risk_rating: Optional[str] = Body(None),
    vulnerability_type: Optional[str] = Body(None),
    remediation_summary: Optional[str] = Body(None),
    remediation_steps: Optional[str] = Body(None),
    references: Optional[str] = Body(None),
    is_verified: bool = Body(True),
    session: Session = Depends(get_session)
):
    """
    Create a new vulnerability template.
    
    All templates created manually are marked with source='manual' and is_verified=True by default.
    """
    from app.models import VulnerabilityTemplate
    
    # Validate CVSS score range
    if cvss_score is not None and (cvss_score < 0.0 or cvss_score > 10.0):
        raise HTTPException(status_code=400, detail="CVSS score must be between 0.0 and 10.0")
    
    # Validate OWASP ranges
    if owasp_likelihood is not None and (owasp_likelihood < 1 or owasp_likelihood > 9):
        raise HTTPException(status_code=400, detail="OWASP likelihood must be between 1 and 9")
    
    if owasp_impact is not None and (owasp_impact < 1 or owasp_impact > 9):
        raise HTTPException(status_code=400, detail="OWASP impact must be between 1 and 9")
    
    # Create template
    template = VulnerabilityTemplate(
        title=title,
        description=description,
        cwe_id=cwe_id,
        cve_id=cve_id,
        cvss_vector=cvss_vector,
        cvss_score=cvss_score,
        owasp_likelihood=owasp_likelihood,
        owasp_impact=owasp_impact,
        owasp_risk_rating=owasp_risk_rating,
        default_risk_rating=default_risk_rating,
        vulnerability_type=vulnerability_type,
        remediation_summary=remediation_summary,
        remediation_steps=remediation_steps,
        references=references,
        source="manual",
        is_verified=is_verified,
        usage_count=0,
        created_at=get_utc_now(),
        updated_at=get_utc_now()
    )
    
    session.add(template)
    session.commit()
    session.refresh(template)
    
    logger.info(f"Created vulnerability template: {template.id} - {template.title}")
    
    return template


@app.get("/api/vulnerability-templates/{template_id}", response_model=VulnerabilityTemplateRead)
def get_vulnerability_template(
    template_id: int,
    session: Session = Depends(get_session)
):
    """Get a single vulnerability template by ID."""
    from app.models import VulnerabilityTemplate
    
    template = session.get(VulnerabilityTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Vulnerability template not found")
    
    return template


@app.patch("/api/vulnerability-templates/{template_id}", response_model=VulnerabilityTemplateRead)
async def update_vulnerability_template(
    template_id: int,
    title: Optional[str] = Body(None),
    description: Optional[str] = Body(None),
    cwe_id: Optional[str] = Body(None),
    cve_id: Optional[str] = Body(None),
    cvss_vector: Optional[str] = Body(None),
    cvss_score: Optional[float] = Body(None),
    owasp_likelihood: Optional[int] = Body(None),
    owasp_impact: Optional[int] = Body(None),
    owasp_risk_rating: Optional[str] = Body(None),
    default_risk_rating: Optional[str] = Body(None),
    vulnerability_type: Optional[str] = Body(None),
    remediation_summary: Optional[str] = Body(None),
    remediation_steps: Optional[str] = Body(None),
    references: Optional[str] = Body(None),
    is_verified: Optional[bool] = Body(None),
    session: Session = Depends(get_session)
):
    """
    Update an existing vulnerability template.
    Only provided fields will be updated.
    """
    from app.models import VulnerabilityTemplate
    
    template = session.get(VulnerabilityTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Vulnerability template not found")
    
    # Update fields if provided
    if title is not None:
        template.title = title
    if description is not None:
        template.description = description
    if cwe_id is not None:
        template.cwe_id = cwe_id
    if cve_id is not None:
        template.cve_id = cve_id
    if cvss_vector is not None:
        template.cvss_vector = cvss_vector
    if cvss_score is not None:
        if cvss_score < 0.0 or cvss_score > 10.0:
            raise HTTPException(status_code=400, detail="CVSS score must be between 0.0 and 10.0")
        template.cvss_score = cvss_score
    if owasp_likelihood is not None:
        if owasp_likelihood < 1 or owasp_likelihood > 9:
            raise HTTPException(status_code=400, detail="OWASP likelihood must be between 1 and 9")
        template.owasp_likelihood = owasp_likelihood
    if owasp_impact is not None:
        if owasp_impact < 1 or owasp_impact > 9:
            raise HTTPException(status_code=400, detail="OWASP impact must be between 1 and 9")
        template.owasp_impact = owasp_impact
    if owasp_risk_rating is not None:
        template.owasp_risk_rating = owasp_risk_rating
    if default_risk_rating is not None:
        template.default_risk_rating = default_risk_rating
    if vulnerability_type is not None:
        template.vulnerability_type = vulnerability_type
    if remediation_summary is not None:
        template.remediation_summary = remediation_summary
    if remediation_steps is not None:
        template.remediation_steps = remediation_steps
    if references is not None:
        template.references = references
    if is_verified is not None:
        template.is_verified = is_verified
    
    # Update timestamp
    template.updated_at = get_utc_now()
    
    session.add(template)
    session.commit()
    session.refresh(template)
    
    logger.info(f"Updated vulnerability template: {template.id} - {template.title}")
    
    return template


@app.delete("/api/vulnerability-templates/{template_id}", status_code=204)
def delete_vulnerability_template(
    template_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a vulnerability template.
    Will fail if template is in use by findings (prevent deletion).
    """
    from app.models import VulnerabilityTemplate, Finding
    
    template = session.get(VulnerabilityTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Vulnerability template not found")
    
    # Check if template is in use
    findings_using_template = session.exec(
        select(Finding).where(Finding.template_id == template_id)
    ).first()
    
    if findings_using_template:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete template: {template.usage_count} finding(s) are using this template. Unlink them first."
        )
    
    session.delete(template)
    session.commit()
    
    logger.info(f"Deleted vulnerability template: {template_id}")


# ============================================================================
# SCORING CALCULATORS ENDPOINTS
# ============================================================================

class CVSSCalculateRequest(BaseModel):
    """Request model for CVSS calculation."""
    vector: str


class CVSSCalculateResponse(BaseModel):
    """Response model for CVSS calculation."""
    vector: str
    base_score: float
    severity: str
    is_valid: bool
    error: Optional[str] = None


@app.post("/api/cvss/calculate", response_model=CVSSCalculateResponse)
def calculate_cvss(
    request: CVSSCalculateRequest,
    session: Session = Depends(get_session)
):
    """
    Calculate CVSS 3.1 Base Score from a vector string.
    
    Uses the official CVSS 3.1 formula:
    - Impact Sub-Score (ISS) calculation
    - Scope-adjusted Impact
    - Exploitability calculation
    - Final Base Score with proper rounding
    
    Returns score, severity rating, and validation status.
    """
    vector = request.vector.strip()
    
    # Validate vector
    is_valid, error_msg = scoring.validate_cvss_vector(vector)
    if not is_valid:
        return CVSSCalculateResponse(
            vector=vector,
            base_score=0.0,
            severity="None",
            is_valid=False,
            error=error_msg
        )
    
    # Calculate score
    result = scoring.calculate_cvss_score(vector)
    if result is None:
        return CVSSCalculateResponse(
            vector=vector,
            base_score=0.0,
            severity="None",
            is_valid=False,
            error="Failed to calculate CVSS score"
        )
    
    base_score, severity = result
    
    logger.info(f"CVSS calculation: {vector} -> {base_score} ({severity})")
    
    return CVSSCalculateResponse(
        vector=vector,
        base_score=base_score,
        severity=severity,
        is_valid=True
    )


class OWASPCalculateRequest(BaseModel):
    """Request model for OWASP risk calculation."""
    likelihood: int
    impact: int


class OWASPCalculateResponse(BaseModel):
    """Response model for OWASP risk calculation."""
    likelihood: int
    impact: int
    risk_score: int
    risk_rating: str
    is_valid: bool
    error: Optional[str] = None


@app.post("/api/owasp/calculate", response_model=OWASPCalculateResponse)
def calculate_owasp(
    request: OWASPCalculateRequest,
    session: Session = Depends(get_session)
):
    """
    Calculate OWASP Risk Rating using Likelihood × Impact methodology.
    
    Inputs:
    - likelihood: 1-9 scale (1=rare, 9=almost certain)
    - impact: 1-9 scale (1=minimal, 9=catastrophic)
    
    Risk Rating Thresholds:
    - Critical: >= 18
    - High: 12-17
    - Medium: 6-11
    - Low: < 6
    """
    try:
        risk_score, risk_rating = scoring.calculate_owasp_risk(
            request.likelihood,
            request.impact
        )
        
        logger.info(f"OWASP calculation: L={request.likelihood} × I={request.impact} -> {risk_score} ({risk_rating})")
        
        return OWASPCalculateResponse(
            likelihood=request.likelihood,
            impact=request.impact,
            risk_score=risk_score,
            risk_rating=risk_rating,
            is_valid=True
        )
    
    except ValueError as e:
        return OWASPCalculateResponse(
            likelihood=request.likelihood,
            impact=request.impact,
            risk_score=0,
            risk_rating="Low",
            is_valid=False,
            error=str(e)
        )

    
    return None

