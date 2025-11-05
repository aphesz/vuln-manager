# backend/app/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy import text, case, func, delete
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import sys
import logging
import re

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
    CommentCreate,
    AuditLog,
    AuditLogRead,
    JiraSettings,
    JiraSettingsRead,
    JiraSettingsBase,
    VulnerabilityTemplate,
    VulnerabilityTemplateRead,
    VulnerabilityMatch,
    VulnerabilityMatchRead,
    ProjectMetrics,
    SLAComplianceMetrics,
    ReviewProgressMetrics,
    FindingTrend,
    TopVulnerability,
    Tag,
    TagRead,
    TagCreate,
    TagUpdate,
    FindingTag,
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

# --- Input Validation Utilities ---

def validate_string_length(value: str, field_name: str, max_length: int = 500, allow_empty: bool = False) -> str:
    """Validate string length and basic content."""
    if not value and not allow_empty:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot be empty")
    if len(value) > max_length:
        raise HTTPException(status_code=400, detail=f"{field_name} exceeds maximum length of {max_length} characters")
    return value.strip()

def validate_url(url: str, field_name: str = "URL") -> str:
    """Validate URL format."""
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # or IP
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    if url and not url_pattern.match(url):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")
    return url

def sanitize_html_input(value: str) -> str:
    """Remove potentially dangerous HTML/script tags from user input."""
    if not value:
        return value
    # Remove script tags and their content
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.DOTALL | re.IGNORECASE)
    # Remove common XSS vectors
    dangerous_patterns = [
        r'javascript:',
        r'on\w+\s*=',  # onclick=, onerror=, etc.
        r'<iframe',
        r'<embed',
        r'<object',
    ]
    for pattern in dangerous_patterns:
        value = re.sub(pattern, '', value, flags=re.IGNORECASE)
    return value

# --- Rate Limiting Setup ---

# Disable rate limiting during tests
import sys
is_testing = "pytest" in sys.modules

limiter = Limiter(key_func=get_remote_address, enabled=not is_testing)

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
    description="""
## VulnManager - Vulnerability Assessment Management Platform

A comprehensive API for managing security vulnerability assessments, findings, and reports.

### Key Features

- **Project Management**: Create and manage vulnerability assessment projects
- **Finding Tracking**: Track findings with risk ratings, instances, and remediation status
- **Quick Add**: Rapidly create findings from vulnerability templates
- **Vulnerability Repository**: Searchable template library with 100+ common vulnerabilities
- **Report Generation**: Export findings to DOCX, PDF, Excel, CSV
- **CVSS & OWASP Scoring**: Built-in risk calculators
- **SLA Tracking**: Monitor remediation deadlines and compliance
- **Peer Review**: Comment system and review workflow
- **Jira Integration**: Sync findings to Jira issues

### Security

- Rate limiting on all write endpoints
- Input validation and sanitization
- XSS protection
- XXE-safe XML parsing
- Security headers (CSP, X-Frame-Options, etc.)

### Version

Current version: 0.7.2
    """,
    version="0.7.2",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "VulnManager Support",
        "url": "https://github.com/aphesz/vuln-manager",
    },
    license_info={
        "name": "MIT",
    },
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
@limiter.limit("30/hour")  # Max 30 projects per hour per IP
def create_project(
    request: Request,
    project: Project,
    session: Session = Depends(get_session)
):
    """Creates a new project entry."""
    # Validate and sanitize inputs
    project.name = validate_string_length(sanitize_html_input(project.name), "project name", max_length=200)
    if project.consultant_name:
        project.consultant_name = validate_string_length(
            sanitize_html_input(project.consultant_name),
            "consultant name",
            max_length=100,
            allow_empty=True
        )
    
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
    
    # Build the response with tags
    findings_with_tags = []
    for finding in project.findings:
        # Load tags for this finding
        finding_tags = session.exec(
            select(Tag)
            .join(FindingTag, Tag.id == FindingTag.tag_id)
            .where(FindingTag.finding_id == finding.id)
            .order_by(Tag.name)
        ).all()
        
        # Convert to dict and add tags
        finding_dict = finding.model_dump()
        finding_dict['tags'] = [TagRead.model_validate(tag) for tag in finding_tags]
        findings_with_tags.append(FindingReadWithInstances(**finding_dict))
    
    # Build project response
    project_dict = project.model_dump(exclude={'findings'})
    project_dict['findings'] = findings_with_tags
    
    return ProjectReadWithFindings(**project_dict)

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
@limiter.limit("10/minute")  # Max 10 uploads per minute per IP
async def upload_report_auto(
    request: Request,
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
@limiter.limit("10/minute")  # Max 10 uploads per minute per IP
async def upload_report(
    request: Request,
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

@app.get("/projects/{project_id}/metrics", response_model=ProjectMetrics)
def get_project_metrics(project_id: int, session: Session = Depends(get_session)):
    """
    Returns comprehensive dashboard metrics for a project.
    Includes SLA compliance, review progress, trends, and top vulnerabilities.
    """
    from datetime import timedelta
    from collections import defaultdict
    
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Fetch all findings for this project
    findings = session.exec(
        select(Finding).where(Finding.project_id == project_id)
    ).all()
    
    # 1. SLA Compliance Metrics
    sla_on_track = sum(1 for f in findings if f.sla_status == "On Track")
    sla_at_risk = sum(1 for f in findings if f.sla_status == "At Risk")
    sla_overdue = sum(1 for f in findings if f.sla_status == "Overdue")
    sla_total = len(findings)
    sla_compliance_rate = (sla_on_track / sla_total * 100) if sla_total > 0 else 0.0
    
    sla_compliance = SLAComplianceMetrics(
        on_track=sla_on_track,
        at_risk=sla_at_risk,
        overdue=sla_overdue,
        total=sla_total,
        compliance_rate=round(sla_compliance_rate, 2)
    )
    
    # 2. Review Progress Metrics
    review_pending = sum(1 for f in findings if f.review_status == "Pending")
    review_in_review = sum(1 for f in findings if f.review_status == "In Review")
    review_approved = sum(1 for f in findings if f.review_status == "Approved")
    review_rejected = sum(1 for f in findings if f.review_status == "Rejected")
    review_total = len(findings)
    approval_rate = (review_approved / review_total * 100) if review_total > 0 else 0.0
    
    review_progress = ReviewProgressMetrics(
        pending=review_pending,
        in_review=review_in_review,
        approved=review_approved,
        rejected=review_rejected,
        total=review_total,
        approval_rate=round(approval_rate, 2)
    )
    
    # 3. Finding Trends (last 30 days or since project creation)
    # Group findings by date (we'll use a simplified approach - just show overall counts)
    # For a real implementation, you'd track when findings were created
    now = get_utc_now()
    trends = []
    
    # Generate trend for last 30 days
    for i in range(30, -1, -1):
        date = now - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        
        # Count findings by status (simplified - in reality you'd filter by creation date)
        open_count = sum(1 for f in findings if f.issue_status in ["Open", "Partially Closed"])
        closed_count = sum(1 for f in findings if f.issue_status == "Closed")
        
        trends.append(FindingTrend(
            date=date_str,
            total_findings=len(findings),
            open_findings=open_count,
            closed_findings=closed_count
        ))
    
    # 4. Top Vulnerabilities (top 5 by instance count)
    finding_instance_counts = []
    for finding in findings:
        instance_count = len(session.exec(
            select(Instance).where(Instance.finding_id == finding.id)
        ).all())
        finding_instance_counts.append((finding, instance_count))
    
    # Sort by instance count descending
    finding_instance_counts.sort(key=lambda x: x[1], reverse=True)
    
    top_vulnerabilities = [
        TopVulnerability(
            title=finding.title,
            risk_rating=finding.risk_rating,
            instance_count=count,
            finding_id=finding.id
        )
        for finding, count in finding_instance_counts[:5]
    ]
    
    # 5. Key Metrics
    total_instances = sum(
        len(session.exec(select(Instance).where(Instance.finding_id == f.id)).all())
        for f in findings
    )
    
    # Calculate average CVSS score (if available)
    cvss_scores = []
    for finding in findings:
        # Check if finding has CVSS data (you'd need to parse from description or store separately)
        # For now, we'll skip this or use a placeholder
        pass
    average_cvss = None  # Would calculate from actual CVSS scores
    
    # Count findings with Jira tickets
    findings_with_jira = sum(1 for f in findings if f.jira_issue_key)
    jira_sync_rate = (findings_with_jira / len(findings) * 100) if findings else 0.0
    
    # Average time to approval (would need timestamps on review_status changes)
    average_time_to_approval = None  # Would calculate from audit logs
    
    return ProjectMetrics(
        sla_compliance=sla_compliance,
        review_progress=review_progress,
        finding_trends=trends,
        top_vulnerabilities=top_vulnerabilities,
        total_findings=len(findings),
        total_instances=total_instances,
        average_cvss_score=average_cvss,
        findings_with_jira=findings_with_jira,
        jira_sync_rate=round(jira_sync_rate, 2),
        average_time_to_approval=average_time_to_approval
    )

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

# --- Export Endpoints ---

@app.get("/projects/{project_id}/export")
def export_findings(
    project_id: int,
    format: str = "excel",  # 'excel' or 'csv'
    columns: Optional[str] = None,  # Comma-separated column names
    risk_filter: Optional[str] = None,  # Comma-separated risk levels
    status_filter: Optional[str] = None,  # Comma-separated issue statuses
    review_filter: Optional[str] = None,  # Comma-separated review statuses
    session: Session = Depends(get_session)
):
    """
    Export findings with customizable columns and filters.
    
    Query Parameters:
    - format: 'excel' or 'csv' (default: 'excel')
    - columns: Comma-separated list of columns to include (default: all)
              Available: title, risk_rating, description, remediation, instance_count,
                        review_status, reviewer_name, jira_issue_key, jira_status,
                        remediation_deadline, sla_status, remediation_owner, issue_status
    - risk_filter: Comma-separated risk levels (Critical, High, Medium, Low, Informational)
    - status_filter: Comma-separated issue statuses (Open, Partially Closed, Closed)
    - review_filter: Comma-separated review statuses (Pending, In Review, Approved, Rejected)
    """
    import csv
    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    
    # Fetch project
    project = session.exec(select(Project).where(Project.id == project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Fetch findings with instances
    findings = session.exec(
        select(Finding).where(Finding.project_id == project_id)
    ).all()
    
    # Apply filters
    filtered_findings = []
    for finding in findings:
        # Risk filter
        if risk_filter:
            risk_levels = [r.strip() for r in risk_filter.split(',')]
            if finding.risk_rating not in risk_levels:
                continue
        
        # Issue status filter
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(',')]
            if finding.issue_status not in statuses:
                continue
        
        # Review status filter
        if review_filter:
            reviews = [r.strip() for r in review_filter.split(',')]
            if finding.review_status not in reviews:
                continue
        
        filtered_findings.append(finding)
    
    # Define all available columns
    all_columns = {
        'title': 'Title',
        'risk_rating': 'Risk Rating',
        'description': 'Description',
        'remediation': 'Remediation',
        'instance_count': 'Instance Count',
        'review_status': 'Review Status',
        'reviewer_name': 'Reviewer',
        'jira_issue_key': 'Jira Issue',
        'jira_status': 'Jira Status',
        'remediation_deadline': 'Deadline',
        'sla_status': 'SLA Status',
        'remediation_owner': 'Owner',
        'issue_status': 'Issue Status',
    }
    
    # Parse selected columns
    if columns:
        selected_cols = [c.strip() for c in columns.split(',')]
        # Validate columns
        invalid_cols = [c for c in selected_cols if c not in all_columns]
        if invalid_cols:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid columns: {', '.join(invalid_cols)}"
            )
        column_map = {k: v for k, v in all_columns.items() if k in selected_cols}
    else:
        column_map = all_columns
    
    # Build data rows
    rows = []
    for finding in filtered_findings:
        row = {}
        for col_key, col_name in column_map.items():
            if col_key == 'instance_count':
                # Count instances
                instance_count = session.exec(
                    select(Instance).where(Instance.finding_id == finding.id)
                ).all()
                row[col_name] = len(instance_count)
            else:
                # Get attribute value
                value = getattr(finding, col_key, '')
                row[col_name] = value if value is not None else ''
        rows.append(row)
    
    # Generate Excel file
    if format.lower() == 'excel':
        wb = Workbook()
        ws = wb.active
        ws.title = "Findings"
        
        # Add headers
        headers = list(column_map.values())
        ws.append(headers)
        
        # Style header row
        header_fill = PatternFill(start_color="E0E0E0", end_color="E0E0E0", fill_type="solid")
        header_font = Font(bold=True)
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
        
        # Add data rows
        for row in rows:
            ws.append([row.get(h, '') for h in headers])
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 60)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Save to bytes
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={"Content-Disposition": f"attachment; filename={project.name.replace(' ', '_')}_findings.xlsx"}
        )
    
    # Generate CSV file
    elif format.lower() == 'csv':
        output = io.StringIO()
        headers = list(column_map.values())
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
        
        # Convert to bytes
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type='text/csv',
            headers={"Content-Disposition": f"attachment; filename={project.name.replace(' ', '_')}_findings.csv"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'excel' or 'csv'")

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


@app.post("/projects/{project_id}/findings", response_model=FindingReadWithInstances, status_code=201)
@limiter.limit("20/minute")  # Max 20 manual findings per minute per IP
async def create_finding_manually(
    request: Request,
    project_id: int,
    title: str = Body(...),
    description: str = Body(...),
    remediation: str = Body(...),
    risk_rating: str = Body(...),
    template_id: Optional[int] = Body(None),
    instances: List[Dict[str, str]] = Body(..., description="List of instance objects with 'location' and 'details'"),
    issue_status: Optional[str] = Body("Open"),
    session: Session = Depends(get_session)
):
    """
    Manually create a new finding with instances (Quick Add feature).
    
    This endpoint allows creating findings from vulnerability templates
    or from scratch with multiple instances.
    
    Request body:
    - title: Finding title
    - description: Detailed description
    - remediation: Remediation guidance
    - risk_rating: One of: Critical, High, Medium, Low, Informational
    - template_id: Optional link to vulnerability template
    - instances: Array of {location, details} objects
    - issue_status: One of: Open, Partially Closed, Closed (default: Open)
    """
    from app.models import VulnerabilityTemplate
    
    # Input validation
    title = validate_string_length(sanitize_html_input(title), "title", max_length=200)
    description = validate_string_length(sanitize_html_input(description), "description", max_length=5000)
    remediation = validate_string_length(sanitize_html_input(remediation), "remediation", max_length=5000)
    
    # Validate project exists
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate risk rating
    try:
        risk = FindingBase.RiskRating(risk_rating)
    except ValueError:
        valid_ratings = [r.value for r in FindingBase.RiskRating]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid risk_rating. Must be one of: {', '.join(valid_ratings)}"
        )
    
    # Validate issue status
    try:
        status = FindingBase.IssueStatus(issue_status) if issue_status else FindingBase.IssueStatus.Open
    except ValueError:
        valid_statuses = [s.value for s in FindingBase.IssueStatus]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid issue_status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    # Validate instances
    if not instances or len(instances) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one instance is required"
        )
    
    if len(instances) > 100:  # Limit to prevent abuse
        raise HTTPException(
            status_code=400,
            detail="Maximum 100 instances allowed per request"
        )
    
    for idx, inst in enumerate(instances):
        if 'location' not in inst or 'details' not in inst:
            raise HTTPException(
                status_code=400,
                detail=f"Instance {idx} must have 'location' and 'details' fields"
            )
        # Validate and sanitize instance data
        inst['location'] = validate_string_length(sanitize_html_input(inst['location']), f"Instance {idx} location", max_length=500)
        inst['details'] = validate_string_length(sanitize_html_input(inst['details']), f"Instance {idx} details", max_length=2000)
    
    # If template_id provided, validate it exists and update usage
    template = None
    if template_id:
        template = session.get(VulnerabilityTemplate, template_id)
        if not template:
            raise HTTPException(status_code=404, detail=f"Vulnerability template {template_id} not found")
        
        # Update template usage
        template.usage_count += 1
        template.last_used = get_utc_now()
        template.updated_at = get_utc_now()
        session.add(template)
    
    # Check for existing finding with same title in project
    existing_finding = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.title == title
        )
    ).first()
    
    if existing_finding:
        # Add instances to existing finding
        finding = existing_finding
        logger.info(f"Adding instances to existing finding {finding.id}: {title}")
    else:
        # Create new finding
        finding = Finding(
            project_id=project_id,
            title=title,
            risk_rating=risk,
            description=description,
            remediation=remediation,
            template_id=template_id,
            issue_status=status
        )
        session.add(finding)
        session.flush()  # Get finding.id
        logger.info(f"Created new finding {finding.id}: {title}")
    
    # Create instances
    created_instances = []
    for inst_data in instances:
        instance = Instance(
            finding_id=finding.id,
            location=inst_data['location'],
            details=inst_data['details'],
            status='New - Unvalidated',
            created_at=get_utc_now()
        )
        session.add(instance)
        created_instances.append(instance)
    
    session.commit()
    session.refresh(finding)
    
    # Send WebSocket notification
    await ws_manager.broadcast_finding_update(
        project_id,
        finding.id,
        'update' if existing_finding else 'create'
    )
    
    logger.info(f"Successfully created finding with {len(created_instances)} instances")
    
    return finding


@app.post("/findings/{finding_id}/comments", response_model=CommentRead)
@limiter.limit("60/minute")  # Max 60 comments per minute per IP
def create_comment(
    request: Request,
    finding_id: int,
    comment_data: CommentCreate,
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
    
    # Validate and sanitize comment
    comment_text = validate_string_length(sanitize_html_input(comment_data.text), "comment text", max_length=5000)
    
    comment = Comment(
        text=comment_text,
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

@app.get("/vulnerability-templates", response_model=List[VulnerabilityTemplateRead])
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


@app.post("/vulnerability-templates", response_model=VulnerabilityTemplateRead, status_code=201)
@limiter.limit("30/hour")  # Max 30 templates per hour per IP
async def create_vulnerability_template(
    request: Request,
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
    
    # Validate and sanitize inputs
    title = validate_string_length(sanitize_html_input(title), "title", max_length=200)
    description = validate_string_length(sanitize_html_input(description), "description", max_length=5000)
    if remediation_summary:
        remediation_summary = validate_string_length(sanitize_html_input(remediation_summary), "remediation summary", max_length=2000, allow_empty=True)
    if remediation_steps:
        remediation_steps = validate_string_length(sanitize_html_input(remediation_steps), "remediation steps", max_length=5000, allow_empty=True)
    
    # Validate CVSS score range
    if cvss_score is not None and (cvss_score < 0.0 or cvss_score > 10.0):
        raise HTTPException(status_code=400, detail="CVSS score must be between 0.0 and 10.0")
    
    # Validate OWASP ranges
    if owasp_likelihood is not None and (owasp_likelihood < 1 or owasp_likelihood > 9):
        raise HTTPException(status_code=400, detail="OWASP likelihood must be between 1 and 9")
    
    if owasp_impact is not None and (owasp_impact < 1 or owasp_impact > 9):
        raise HTTPException(status_code=400, detail="OWASP impact must be between 1 and 9")
    
    # Check for duplicate templates (same title + CWE/CVE combination)
    duplicate_check = select(VulnerabilityTemplate).where(
        VulnerabilityTemplate.title == title
    )
    
    # If CWE or CVE provided, use them for stricter duplicate detection
    if cwe_id:
        duplicate_check = duplicate_check.where(VulnerabilityTemplate.cwe_id == cwe_id)
    if cve_id:
        duplicate_check = duplicate_check.where(VulnerabilityTemplate.cve_id == cve_id)
    
    existing_template = session.exec(duplicate_check).first()
    
    if existing_template:
        raise HTTPException(
            status_code=409,
            detail=f"A template with this title{' and CWE ID' if cwe_id else ''}{' and CVE ID' if cve_id else ''} already exists (ID: {existing_template.id})"
        )
    
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


@app.get("/vulnerability-templates/analytics")
def get_template_analytics(
    session: Session = Depends(get_session)
):
    """
    Get comprehensive analytics about the vulnerability template repository.
    
    Returns statistics on:
    - Total template count
    - Distribution by source (manual/burp/nessus/nvd/cwe)
    - Distribution by risk rating
    - Top 10 most-used templates
    - Data quality metrics (CVSS coverage, CWE coverage, verification rate)
    - ATT&CK technique usage statistics
    """
    from collections import defaultdict
    import json
    
    # Total templates
    total_templates = session.exec(
        select(func.count(VulnerabilityTemplate.id))
    ).one()
    
    # Templates by source
    by_source_raw = session.exec(
        select(
            VulnerabilityTemplate.source,
            func.count(VulnerabilityTemplate.id)
        ).group_by(VulnerabilityTemplate.source)
    ).all()
    by_source = {source or "unknown": count for source, count in by_source_raw}
    
    # Templates by risk rating
    by_risk_raw = session.exec(
        select(
            VulnerabilityTemplate.default_risk_rating,
            func.count(VulnerabilityTemplate.id)
        ).group_by(VulnerabilityTemplate.default_risk_rating)
    ).all()
    by_risk = {risk or "None": count for risk, count in by_risk_raw}
    
    # Most used templates (top 10)
    most_used_templates = session.exec(
        select(VulnerabilityTemplate)
        .order_by(VulnerabilityTemplate.usage_count.desc())
        .limit(10)
    ).all()
    
    most_used = [
        {
            "template_id": t.id,
            "title": t.title,
            "usage_count": t.usage_count,
            "risk_rating": t.default_risk_rating
        }
        for t in most_used_templates
    ]
    
    # Quality metrics
    with_cvss = session.exec(
        select(func.count(VulnerabilityTemplate.id))
        .where(VulnerabilityTemplate.cvss_score.isnot(None))
    ).one()
    
    with_cwe = session.exec(
        select(func.count(VulnerabilityTemplate.id))
        .where(VulnerabilityTemplate.cwe_id.isnot(None))
    ).one()
    
    verified = session.exec(
        select(func.count(VulnerabilityTemplate.id))
        .where(VulnerabilityTemplate.is_verified == True)
    ).one()
    
    # Calculate percentages
    cvss_pct = (with_cvss / total_templates * 100) if total_templates > 0 else 0
    cwe_pct = (with_cwe / total_templates * 100) if total_templates > 0 else 0
    verified_pct = (verified / total_templates * 100) if total_templates > 0 else 0
    
    # ATT&CK technique statistics
    templates_with_attack = session.exec(
        select(func.count(VulnerabilityTemplate.id))
        .where(VulnerabilityTemplate.attack_techniques.isnot(None))
        .where(VulnerabilityTemplate.attack_techniques != "null")
        .where(VulnerabilityTemplate.attack_techniques != "[]")
    ).one()
    
    # Count total techniques and tactic distribution
    all_templates_with_attack = session.exec(
        select(VulnerabilityTemplate.attack_techniques)
        .where(VulnerabilityTemplate.attack_techniques.isnot(None))
        .where(VulnerabilityTemplate.attack_techniques != "null")
        .where(VulnerabilityTemplate.attack_techniques != "[]")
    ).all()
    
    total_techniques_mapped = 0
    tactic_counts = defaultdict(int)
    
    for attack_json in all_templates_with_attack:
        try:
            techniques = json.loads(attack_json)
            if isinstance(techniques, list):
                total_techniques_mapped += len(techniques)
                for tech in techniques:
                    if isinstance(tech, dict) and "tactic" in tech:
                        tactic_counts[tech["tactic"]] += 1
        except (json.JSONDecodeError, TypeError):
            continue
    
    # Sort tactics by count
    most_common_tactics = [
        {"tactic": tactic, "count": count}
        for tactic, count in sorted(tactic_counts.items(), key=lambda x: x[1], reverse=True)
    ]
    
    return {
        "total_templates": total_templates,
        "by_source": by_source,
        "by_risk_rating": by_risk,
        "most_used": most_used,
        "quality_metrics": {
            "with_cvss": with_cvss,
            "with_cwe": with_cwe,
            "verified": verified,
            "cvss_coverage_pct": round(cvss_pct, 1),
            "cwe_coverage_pct": round(cwe_pct, 1),
            "verification_rate_pct": round(verified_pct, 1)
        },
        "attack_techniques": {
            "templates_with_attack": templates_with_attack,
            "total_techniques_mapped": total_techniques_mapped,
            "most_common_tactics": most_common_tactics[:5]  # Top 5 tactics
        }
    }


@app.get("/vulnerability-templates/{template_id}", response_model=VulnerabilityTemplateRead)
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


@app.patch("/vulnerability-templates/{template_id}", response_model=VulnerabilityTemplateRead)
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


@app.delete("/vulnerability-templates/{template_id}", status_code=204)
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


@app.post("/vulnerability-templates/cleanup-duplicates")
def cleanup_duplicate_templates(
    session: Session = Depends(get_session)
):
    """
    Remove duplicate vulnerability templates, keeping the most recent version
    with the highest usage count for each title+CWE/CVE combination.
    
    Returns summary of templates removed.
    """
    from app.models import VulnerabilityTemplate
    from collections import defaultdict
    
    # Get all templates
    all_templates = session.exec(select(VulnerabilityTemplate)).all()
    
    # Group by title + CWE + CVE combination
    groups = defaultdict(list)
    for template in all_templates:
        key = (template.title, template.cwe_id or '', template.cve_id or '')
        groups[key].append(template)
    
    removed_count = 0
    removed_ids = []
    kept_templates = []
    
    # Process each group
    for key, templates_in_group in groups.items():
        if len(templates_in_group) > 1:
            # Sort by: usage_count DESC, created_at DESC
            templates_in_group.sort(
                key=lambda t: (t.usage_count, t.created_at),
                reverse=True
            )
            
            # Keep the first one (highest usage, most recent)
            keep = templates_in_group[0]
            kept_templates.append(keep.id)
            
            # Remove the rest
            for template in templates_in_group[1:]:
                # Only remove if usage_count is 0 (not linked to findings)
                if template.usage_count == 0:
                    session.delete(template)
                    removed_ids.append(template.id)
                    removed_count += 1
                    logger.info(f"Removed duplicate template: {template.id} - {template.title}")
    
    session.commit()
    
    return {
        "removed_count": removed_count,
        "removed_ids": removed_ids,
        "kept_templates": kept_templates,
        "message": f"Removed {removed_count} duplicate template(s)"
    }


@app.post("/vulnerability-templates/{template_id}/enrich")
async def enrich_template_from_nvd(
    template_id: int,
    overwrite_existing: bool = Query(False, description="Overwrite existing fields with NVD data"),
    session: Session = Depends(get_session)
):
    """
    Enrich a vulnerability template with data from the National Vulnerability Database (NVD).
    
    Fetches official CVE data including:
    - Official description from NIST
    - CVSS 3.1 score and vector
    - CWE mapping
    - Severity rating
    - Official references
    
    Args:
        template_id: Template to enrich
        overwrite_existing: If False, only populate empty fields. If True, overwrite all.
    
    Returns:
        Updated template with NVD data
    
    Examples:
        POST /vulnerability-templates/5/enrich
        → Fetches CVE data and updates template
    """
    from app.nvd import enrich_template_from_nvd, NVDAPIError
    
    # Get template
    template = session.get(VulnerabilityTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check if template has CVE ID
    if not template.cve_id:
        raise HTTPException(
            status_code=400,
            detail="Template must have a CVE ID to enrich from NVD"
        )
    
    try:
        # Fetch enrichment data from NVD
        logger.info(f"Enriching template {template_id} from NVD: {template.cve_id}")
        enrichment_data = await enrich_template_from_nvd(
            template.cve_id,
            overwrite_existing=overwrite_existing
        )
        
        # Apply updates to template
        for field, value in enrichment_data.items():
            # Skip if field already has value and overwrite_existing=False
            if not overwrite_existing and getattr(template, field, None):
                continue
            
            # Update field
            setattr(template, field, value)
        
        session.add(template)
        session.commit()
        session.refresh(template)
        
        logger.info(f"Successfully enriched template {template_id} with NVD data")
        
        # Return updated template
        return VulnerabilityTemplateRead.model_validate(template)
    
    except NVDAPIError as e:
        logger.error(f"NVD API error: {str(e)}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch data from NVD: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error enriching template: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal error while enriching template: {str(e)}"
        )


# =============================================================================
# ATT&CK Mapping Endpoints (v0.7.0 Phase 2B)
# =============================================================================

@app.get("/attack/techniques")
def get_attack_techniques(
    query: str = Query(None, description="Search query for filtering techniques"),
    session: Session = Depends(get_session)
):
    """
    Get all available MITRE ATT&CK techniques or search for specific ones.
    
    GET /attack/techniques - Get all techniques
    GET /attack/techniques?query=injection - Search techniques
    
    Returns:
        List of ATT&CK techniques with details
    """
    from app.attack import get_all_techniques, search_techniques
    
    if query:
        techniques = search_techniques(query)
    else:
        techniques = get_all_techniques()
    
    return {
        "count": len(techniques),
        "techniques": techniques
    }


@app.post("/vulnerability-templates/{template_id}/suggest-attack")
def suggest_attack_techniques(
    template_id: int,
    session: Session = Depends(get_session)
):
    """
    Suggest MITRE ATT&CK techniques for a vulnerability template.
    
    POST /vulnerability-templates/5/suggest-attack
    
    Returns:
        List of suggested techniques with relevance scores
    """
    from app.attack import suggest_techniques
    
    # Get template
    template = session.get(VulnerabilityTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get suggestions
    suggestions = suggest_techniques(
        description=template.description,
        cwe_id=template.cwe_id,
        vulnerability_type=template.vulnerability_type
    )
    
    logger.info(f"Generated {len(suggestions)} ATT&CK technique suggestions for template {template_id}")
    
    return {
        "template_id": template_id,
        "template_title": template.title,
        "suggestion_count": len(suggestions),
        "suggestions": suggestions
    }


@app.patch("/vulnerability-templates/{template_id}/attack-techniques")
def update_attack_techniques(
    template_id: int,
    technique_ids: List[str],
    session: Session = Depends(get_session)
):
    """
    Update ATT&CK techniques for a vulnerability template.
    
    PATCH /vulnerability-templates/5/attack-techniques
    Body: ["T1190", "T1059", "T1505.003"]
    
    Returns:
        Updated template with ATT&CK mappings
    """
    from app.attack import get_all_techniques, format_techniques_for_storage
    
    # Get template
    template = session.get(VulnerabilityTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Validate technique IDs
    all_techniques = get_all_techniques()
    valid_ids = {t['technique_id'] for t in all_techniques}
    
    selected_techniques = []
    for tid in technique_ids:
        if tid not in valid_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid technique ID: {tid}"
            )
        
        # Find technique details
        tech = next(t for t in all_techniques if t['technique_id'] == tid)
        selected_techniques.append(tech)
    
    # Store as JSON
    template.attack_techniques = format_techniques_for_storage(selected_techniques)
    template.updated_at = datetime.utcnow()
    
    session.add(template)
    session.commit()
    session.refresh(template)
    
    logger.info(f"Updated ATT&CK techniques for template {template_id}: {technique_ids}")
    
    return VulnerabilityTemplateRead.model_validate(template)


@app.post("/projects/{project_id}/auto-match")
def auto_match_project_findings(
    project_id: int,
    min_score: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity score (0.0-1.0)"),
    auto_create: bool = Query(True, description="Automatically create matches above threshold"),
    session: Session = Depends(get_session)
):
    """
    Automatically match all findings in a project to vulnerability templates.
    
    Uses tiered matching strategy (v0.7.0 Phase 1):
    - Tier 1 (Exact): CWE/CVE exact matching → 100% confidence
    - Tier 2 (Fuzzy): Title/description fuzzy matching → 60-99% confidence
    - Tier 3 (Semantic): AI embeddings → future enhancement
    
    Args:
        project_id: Project to process
        min_score: Minimum similarity threshold (0.0-1.0). Default 0.6 (60%)
        auto_create: If True, automatically create VulnerabilityMatch records.
                     If False, return suggestions only (preview mode)
    
    Returns:
        {
            "project_id": int,
            "total_findings": int,
            "matched_count": int,
            "unmatched_count": int,
            "matches": [
                {
                    "finding_id": int,
                    "finding_title": str,
                    "template_id": int,
                    "template_title": str,
                    "similarity_score": float,
                    "match_method": str,
                    "created": bool  # True if auto_create=True
                }
            ]
        }
    
    Examples:
        # Preview mode (no changes)
        POST /projects/1/auto-match?auto_create=false
        
        # Auto-create matches with 70% minimum
        POST /projects/1/auto-match?min_score=0.7&auto_create=true
    """
    from app.matching import find_all_matches, create_vulnerability_match
    
    # Verify project exists
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all findings in project
    findings = session.exec(
        select(Finding).where(Finding.project_id == project_id)
    ).all()
    
    total_findings = len(findings)
    matched_count = 0
    results = []
    
    for finding in findings:
        # Find all potential matches for this finding
        matches = find_all_matches(session, finding, min_score=min_score)
        
        if matches:
            # Take the best match (first in list, highest score)
            template, score, method = matches[0]
            matched_count += 1
            
            created = False
            if auto_create:
                # Create VulnerabilityMatch record
                create_vulnerability_match(
                    session, finding, template, score, method, matched_by="auto_match_api"
                )
                created = True
            
            results.append({
                "finding_id": finding.id,
                "finding_title": finding.title,
                "template_id": template.id,
                "template_title": template.title,
                "similarity_score": round(score, 3),
                "match_method": method,
                "created": created
            })
    
    unmatched_count = total_findings - matched_count
    
    logger.info(
        f"Auto-match complete for project {project_id}: "
        f"{matched_count}/{total_findings} findings matched "
        f"(min_score={min_score}, auto_create={auto_create})"
    )
    
    return {
        "project_id": project_id,
        "total_findings": total_findings,
        "matched_count": matched_count,
        "unmatched_count": unmatched_count,
        "matches": results
    }


# =====================================================
# TAG MANAGEMENT ENDPOINTS
# =====================================================

@app.get("/tags", response_model=List[TagRead])
@limiter.limit("100/minute")
def list_tags(
    request: Request,
    search: Optional[str] = Query(None, description="Search tags by name"),
    session: Session = Depends(get_session)
):
    """
    List all tags with optional search.
    Returns tags sorted by usage count (most used first).
    """
    
    statement = select(Tag)
    
    if search:
        statement = statement.where(Tag.name.ilike(f"%{search}%"))
    
    statement = statement.order_by(Tag.usage_count.desc(), Tag.name)
    
    tags = session.exec(statement).all()
    
    return tags


@app.post("/tags", response_model=TagRead, status_code=201)
@limiter.limit("30/hour")
def create_tag(
    request: Request,
    tag: TagCreate,
    session: Session = Depends(get_session)
):
    """
    Create a new tag.
    Tag names must be unique (case-insensitive).
    """
    from app.timezone_utils import get_utc_now
    
    # Check if tag already exists (case-insensitive)
    existing = session.exec(
        select(Tag).where(func.lower(Tag.name) == tag.name.lower())
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Tag '{tag.name}' already exists"
        )
    
    # Validate color format (hex color)
    if tag.color and not re.match(r'^#[0-9A-Fa-f]{6}$', tag.color):
        raise HTTPException(
            status_code=400,
            detail="Color must be a valid hex color code (e.g., #2196F3)"
        )
    
    new_tag = Tag(
        name=tag.name,
        color=tag.color or "#2196F3",
        description=tag.description,
        created_at=get_utc_now(),
        usage_count=0
    )
    
    session.add(new_tag)
    session.commit()
    session.refresh(new_tag)
    
    logger.info(f"Created tag: {new_tag.id} - {new_tag.name}")
    
    return new_tag


@app.get("/tags/{tag_id}", response_model=TagRead)
def get_tag(
    tag_id: int,
    session: Session = Depends(get_session)
):
    """Get a single tag by ID."""
    
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    return tag


@app.patch("/tags/{tag_id}", response_model=TagRead)
@limiter.limit("60/hour")
def update_tag(
    request: Request,
    tag_id: int,
    tag_update: TagUpdate,
    session: Session = Depends(get_session)
):
    """
    Update a tag.
    Only provided fields will be updated.
    """
    from app.timezone_utils import get_utc_now
    
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Check name uniqueness if being updated
    if tag_update.name and tag_update.name != tag.name:
        existing = session.exec(
            select(Tag).where(
                func.lower(Tag.name) == tag_update.name.lower(),
                Tag.id != tag_id
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Tag '{tag_update.name}' already exists"
            )
        tag.name = tag_update.name
    
    if tag_update.color:
        if not re.match(r'^#[0-9A-Fa-f]{6}$', tag_update.color):
            raise HTTPException(
                status_code=400,
                detail="Color must be a valid hex color code (e.g., #2196F3)"
            )
        tag.color = tag_update.color
    
    if tag_update.description is not None:
        tag.description = tag_update.description
    
    session.add(tag)
    session.commit()
    session.refresh(tag)
    
    logger.info(f"Updated tag: {tag_id} - {tag.name}")
    
    return tag


@app.delete("/tags/{tag_id}", status_code=204)
def delete_tag(
    tag_id: int,
    session: Session = Depends(get_session)
):
    """
    Delete a tag.
    This will also remove all associations with findings.
    """
    
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Delete all finding-tag associations
    session.exec(delete(FindingTag).where(FindingTag.tag_id == tag_id))
    
    # Delete the tag
    session.delete(tag)
    session.commit()
    
    logger.info(f"Deleted tag: {tag_id} - {tag.name}")


@app.post("/findings/{finding_id}/tags/{tag_id}", status_code=201)
@limiter.limit("100/minute")
def add_tag_to_finding(
    request: Request,
    finding_id: int,
    tag_id: int,
    session: Session = Depends(get_session)
):
    """Add a tag to a finding."""
    from app.models import Finding
    from app.timezone_utils import get_utc_now
    
    # Verify finding exists
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    # Verify tag exists
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Check if already associated
    existing = session.exec(
        select(FindingTag).where(
            FindingTag.finding_id == finding_id,
            FindingTag.tag_id == tag_id
        )
    ).first()
    
    if existing:
        return {"message": "Tag already associated with finding"}
    
    # Create association
    finding_tag = FindingTag(
        finding_id=finding_id,
        tag_id=tag_id,
        created_at=get_utc_now()
    )
    
    session.add(finding_tag)
    
    # Update tag usage count
    tag.usage_count += 1
    session.add(tag)
    
    session.commit()
    
    logger.info(f"Added tag {tag_id} to finding {finding_id}")
    
    return {"message": "Tag added to finding"}


@app.delete("/findings/{finding_id}/tags/{tag_id}", status_code=204)
def remove_tag_from_finding(
    finding_id: int,
    tag_id: int,
    session: Session = Depends(get_session)
):
    """Remove a tag from a finding."""
    
    # Find the association
    finding_tag = session.exec(
        select(FindingTag).where(
            FindingTag.finding_id == finding_id,
            FindingTag.tag_id == tag_id
        )
    ).first()
    
    if not finding_tag:
        raise HTTPException(status_code=404, detail="Tag association not found")
    
    # Delete association
    session.delete(finding_tag)
    
    # Update tag usage count
    tag = session.get(Tag, tag_id)
    if tag and tag.usage_count > 0:
        tag.usage_count -= 1
        session.add(tag)
    
    session.commit()
    
    logger.info(f"Removed tag {tag_id} from finding {finding_id}")


@app.get("/findings/{finding_id}/tags", response_model=List[TagRead])
def get_finding_tags(
    finding_id: int,
    session: Session = Depends(get_session)
):
    """Get all tags for a finding."""
    from app.models import Finding
    
    # Verify finding exists
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    # Get all tags for this finding
    tags = session.exec(
        select(Tag)
        .join(FindingTag, Tag.id == FindingTag.tag_id)
        .where(FindingTag.finding_id == finding_id)
        .order_by(Tag.name)
    ).all()
    
    return tags


# =====================================================
# QUICK ADD / TEMPLATE SEARCH ENDPOINTS
# =====================================================

@app.get("/repository/search", response_model=List[VulnerabilityTemplateRead])
def search_repository_templates(
    q: str = Query(..., min_length=1, description="Search query for title, description, CWE, CVE"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results to return"),
    verified_only: bool = Query(False, description="Only return verified templates"),
    session: Session = Depends(get_session)
):
    """
    Quick search for vulnerability templates (optimized for Quick Add feature).
    
    Searches across:
    - Title (fuzzy match)
    - Description (fuzzy match)
    - CWE ID (exact match)
    - CVE ID (exact match)
    - Vulnerability type (exact match)
    
    Returns templates ordered by:
    1. Exact title matches first
    2. Usage count (most used first)
    3. Creation date (newest first)
    """
    from app.models import VulnerabilityTemplate
    
    # Build search pattern for fuzzy matching
    search_pattern = f"%{q}%"
    
    # Base query
    statement = select(VulnerabilityTemplate)
    
    # Apply verified filter
    if verified_only:
        statement = statement.where(VulnerabilityTemplate.is_verified == True)
    
    # Search across multiple fields
    statement = statement.where(
        (VulnerabilityTemplate.title.ilike(search_pattern)) |
        (VulnerabilityTemplate.description.ilike(search_pattern)) |
        (VulnerabilityTemplate.cwe_id.ilike(search_pattern)) |
        (VulnerabilityTemplate.cve_id.ilike(search_pattern)) |
        (VulnerabilityTemplate.vulnerability_type.ilike(search_pattern))
    )
    
    # Order by relevance:
    # 1. Exact title match first (case-insensitive)
    # 2. Usage count (most used first)
    # 3. Creation date (newest first)
    
    # Create a score for exact matches
    exact_match_score = case(
        (func.lower(VulnerabilityTemplate.title) == q.lower(), 1),
        else_=0
    )
    
    statement = statement.order_by(
        exact_match_score.desc(),
        VulnerabilityTemplate.usage_count.desc(),
        VulnerabilityTemplate.created_at.desc()
    ).limit(limit)
    
    templates = session.exec(statement).all()
    
    logger.info(f"Repository search for '{q}' returned {len(templates)} results")
    
    return templates


@app.get("/projects/{project_id}/template-suggestions", response_model=List[VulnerabilityTemplateRead])
def get_project_template_suggestions(
    project_id: int,
    limit: int = Query(10, ge=1, le=50, description="Maximum suggestions to return"),
    session: Session = Depends(get_session)
):
    """
    Get template suggestions for Quick Add based on project's existing findings.
    
    Returns templates that:
    1. Are already used in this project (sorted by frequency)
    2. Have high overall usage counts (popular templates)
    3. Are verified templates
    
    Useful for "Add Similar" and suggesting common vulnerabilities.
    """
    from app.models import VulnerabilityTemplate, Finding, Project
    
    # Verify project exists
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get templates already used in this project
    project_templates_statement = (
        select(VulnerabilityTemplate.id, func.count(Finding.id).label("usage_in_project"))
        .join(Finding, Finding.template_id == VulnerabilityTemplate.id)
        .where(Finding.project_id == project_id)
        .group_by(VulnerabilityTemplate.id)
        .order_by(func.count(Finding.id).desc())
    )
    
    project_template_usage = session.exec(project_templates_statement).all()
    project_template_ids = [t[0] for t in project_template_usage]
    
    # Combine:
    # 1. Templates used in this project (by frequency)
    # 2. Most popular verified templates not yet used
    suggestions = []
    
    # Add templates from this project first
    if project_template_ids:
        project_templates = session.exec(
            select(VulnerabilityTemplate)
            .where(VulnerabilityTemplate.id.in_(project_template_ids))
            .order_by(VulnerabilityTemplate.usage_count.desc())
        ).all()
        suggestions.extend(project_templates)
    
    # Fill remaining slots with popular verified templates
    remaining = limit - len(suggestions)
    if remaining > 0:
        popular_templates = session.exec(
            select(VulnerabilityTemplate)
            .where(
                VulnerabilityTemplate.is_verified == True,
                ~VulnerabilityTemplate.id.in_(project_template_ids) if project_template_ids else True
            )
            .order_by(VulnerabilityTemplate.usage_count.desc())
            .limit(remaining)
        ).all()
        suggestions.extend(popular_templates)
    
    logger.info(f"Generated {len(suggestions)} template suggestions for project {project_id}")
    
    return suggestions[:limit]


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


@app.post("/cvss/calculate", response_model=CVSSCalculateResponse)
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


@app.post("/owasp/calculate", response_model=OWASPCalculateResponse)
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

