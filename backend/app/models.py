# backend/app/models.py

from typing import Optional, List, Dict
from sqlmodel import Field, SQLModel, Relationship  # type: ignore
from enum import Enum
from datetime import datetime
import json

# --- Base Models ---

from pydantic import field_serializer, computed_field

class ProjectBase(SQLModel):
    """Base model for project creation and updates."""
    # Required fields must use an explicit ellipsis default for Pydantic v2.
    name: str = Field(..., index=True)
    consultant_name: Optional[str] = None
    is_archived: bool = Field(default=False, index=True)
    archived_at: Optional[datetime] = None

class FindingBase(SQLModel):
    """Base model for a single, deduplicated vulnerability finding."""
    title: str = Field(..., index=True)
    # Use an Enum to enforce the allowed risk rating values at the ORM level.
    # The enum values match the PostgreSQL ENUM defined for the `risk_rating` column.
    class RiskRating(str, Enum):
        """Enum for risk ratings with proper case values.
        These must match exactly with the PostgreSQL enum type."""
        Critical = "Critical"
        High = "High"
        Medium = "Medium"
        Low = "Low"
        Informational = "Informational"

    class ReviewStatus(str, Enum):
        """Enum for peer review workflow statuses."""
        Pending = "Pending"
        InReview = "In Review"
        Approved = "Approved"
        Rejected = "Rejected"

    class SLAStatus(str, Enum):
        """Enum for SLA tracking statuses."""
        OnTrack = "On Track"
        AtRisk = "At Risk"
        Overdue = "Overdue"

    class IssueStatus(str, Enum):
        """Enum for issue tracking statuses."""
        Open = "Open"
        PartiallyClosed = "Partially Closed"
        Closed = "Closed"

    risk_rating: RiskRating = Field(..., index=True)  # Normalized risk
    description: str = Field(...)
    remediation: str = Field(...)
    
    # Peer Review fields
    review_status: ReviewStatus = Field(default=ReviewStatus.Pending, index=True)
    reviewer_name: Optional[str] = Field(default=None, max_length=100)
    
    # Issue Status field
    issue_status: IssueStatus = Field(default=IssueStatus.Open, index=True)
    issue_status_comment: Optional[str] = None  # Optional comment for status changes
    
    # Jira Integration fields
    jira_issue_key: Optional[str] = Field(default=None, index=True)
    jira_status: Optional[str] = None
    
    # SLA & Remediation Tracking fields
    remediation_deadline: Optional[datetime] = Field(default=None, index=True)
    sla_status: Optional[SLAStatus] = Field(default=None, index=True)
    remediation_owner: Optional[str] = None
    
    # Timeline Tracking fields (v0.8.1 - Trend Analysis)
    discovered_at: Optional[datetime] = Field(default=None, index=True)  # When finding was first detected
    resolved_at: Optional[datetime] = Field(default=None, index=True)  # When finding was marked as resolved (null if open)
    
    # Compliance Mapping fields (v0.8.3)
    owasp_category: Optional[str] = Field(default=None, max_length=10, index=True)  # OWASP Top 10 2021 category (A01-A10)
    
    # Vulnerability Repository link
    template_id: Optional[int] = Field(default=None, index=True)  # Foreign key to VulnerabilityTemplate

class InstanceBase(SQLModel):
    """Base model for a single instance (or occurrence) of a finding."""
    location: str = Field(...)
    details: str = Field(...)
    status: str = Field(default="New - Unvalidated", index=True)  # e.g., 'New', 'Confirmed', 'Remediated'
    created_at: datetime = Field(default=None, index=True)  # Will be set by timezone_utils.get_utc_now()

# --- Table Models ---

# User & Authentication Models
class UserBase(SQLModel):
    """Base model for user."""
    email: str = Field(..., unique=True, index=True, max_length=255)
    username: str = Field(..., unique=True, index=True, max_length=100)
    full_name: Optional[str] = Field(default=None, max_length=255)
    role: str = Field(default="viewer", max_length=50)  # admin, analyst, viewer
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    avatar_url: Optional[str] = Field(default=None, max_length=500)

class User(UserBase, table=True):
    """Database model for User with authentication."""
    __tablename__ = "users"  # Avoid PostgreSQL reserved "user" type name
    
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str = Field(..., max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    last_login: Optional[datetime] = Field(default=None)

class UserRead(UserBase):
    """Model for reading user data (no password)."""
    id: int
    created_at: datetime
    last_login: Optional[datetime]

class UserCreate(SQLModel):
    """Model for creating a new user."""
    email: str
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "viewer"

class UserUpdate(SQLModel):
    """Model for updating user profile."""
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserUpdatePassword(SQLModel):
    """Model for changing password."""
    current_password: str
    new_password: str

# Project Models
class Project(ProjectBase, table=True):
    """Database model for a project."""
    id: Optional[int] = Field(default=None, primary_key=True)

    # Relationships
    findings: List["Finding"] = Relationship(back_populates="project")

class Finding(FindingBase, table=True):
    """Database model for a Finding (the vulnerability definition)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")

    # Relationships
    project: Optional[Project] = Relationship(back_populates="findings")
    instances: List["Instance"] = Relationship(back_populates="finding")
    comments: List["Comment"] = Relationship(back_populates="finding")

class Instance(InstanceBase, table=True):
    """Database model for an Instance."""
    id: Optional[int] = Field(default=None, primary_key=True)
    finding_id: Optional[int] = Field(default=None, foreign_key="finding.id")

    # Relationships
    finding: Optional[Finding] = Relationship(back_populates="instances")

# --- Peer Review & Audit Models ---

class CommentBase(SQLModel):
    """Base model for comments on findings."""
    text: str = Field(..., max_length=5000)
    user: str = Field(..., max_length=255)  # TODO: Replace with proper user auth later

class CommentCreate(CommentBase):
    """Model for creating a comment (no created_at)."""
    pass

class Comment(CommentBase, table=True):
    """Database model for Comment."""
    id: Optional[int] = Field(default=None, primary_key=True)
    finding_id: int = Field(..., foreign_key="finding.id", index=True)
    created_at: datetime = Field()  # Required field, explicitly set by API using timezone_utils.get_utc_now()
    
    # Relationships
    finding: Optional[Finding] = Relationship(back_populates="comments")

class AuditLogBase(SQLModel):
    """Base model for audit log entries."""
    entity_type: str = Field(..., max_length=50, index=True)  # 'finding', 'project', 'comment', etc.
    entity_id: int = Field(..., index=True)
    action: str = Field(..., max_length=50, index=True)  # 'created', 'updated', 'deleted', 'status_changed'
    user: str = Field(..., max_length=255)
    timestamp: datetime = Field(index=True)  # Required field, explicitly set by caller using timezone_utils.get_utc_now()
    changes_json: Optional[str] = None  # JSON string of before/after changes

class AuditLog(AuditLogBase, table=True):
    """Database model for AuditLog."""
    id: Optional[int] = Field(default=None, primary_key=True)

class JiraSettingsBase(SQLModel):
    """Base model for Jira integration settings (per-project or global)."""
    jira_url: str = Field(..., max_length=500)
    project_key: str = Field(..., max_length=50)
    # Note: API token should be stored encrypted or in env vars, not plain text
    # This is a placeholder - implement proper secret management
    api_token_encrypted: Optional[str] = None
    is_active: bool = Field(default=True)

class JiraSettings(JiraSettingsBase, table=True):
    """Database model for Jira settings."""
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id", index=True)

class UserPreferencesBase(SQLModel):
    """Base model for user preferences (timezone, locale, etc.)."""
    user_email: str = Field(..., unique=True, index=True)
    timezone: str = Field(default="Asia/Kuala_Lumpur")  # Default to GMT+8 (MYT)
    date_format: str = Field(default="%Y-%m-%d %H:%M:%S %Z")
    locale: str = Field(default="en_MY")  # Malaysian English

class UserPreferences(UserPreferencesBase, table=True):
    """Database model for user preferences."""
    id: Optional[int] = Field(default=None, primary_key=True)

# --- Tagging System Models ---

class TagBase(SQLModel):
    """Base model for tags."""
    name: str = Field(..., unique=True, index=True, max_length=50)
    color: str = Field(default="#2196F3", max_length=7)  # Hex color code
    description: Optional[str] = Field(default=None, max_length=200)

class Tag(TagBase, table=True):
    """Database model for Tag."""
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=None)
    usage_count: int = Field(default=0)  # How many findings have this tag

class FindingTag(SQLModel, table=True):
    """Junction table for finding-tag many-to-many relationship."""
    __tablename__ = "finding_tags"
    
    finding_id: int = Field(foreign_key="finding.id", primary_key=True, index=True)
    tag_id: int = Field(foreign_key="tag.id", primary_key=True, index=True)
    created_at: datetime = Field(default=None)

# --- Report Template Models (v1.1.0 - Advanced Reporting - Unified) ---

class ReportTemplateBase(SQLModel):
    """
    Unified base model for report templates.
    Supports both simple parameterized templates AND complex widget-based templates.
    """
    name: str = Field(..., index=True, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    
    class TemplateType(str, Enum):
        """Enum for report template types."""
        Executive = "Executive"
        Technical = "Technical"
        Compliance = "Compliance"
        Custom = "Custom"
    
    template_type: TemplateType = Field(..., index=True)
    
    # Sections configuration stored as JSON
    # Simple mode (parameterized): [
    #   {"id": "title", "name": "Title Page", "enabled": true, "order": 1},
    #   {"id": "summary", "name": "Executive Summary", "enabled": true, "order": 2},
    #   {"id": "charts", "name": "Charts", "enabled": true, "order": 3, "settings": {"include_pie": true}},
    # ]
    # 
    # Advanced mode (widget-based): [
    #   {"type": "text", "title": "Section Title", "content": "...", "layout": {...}},
    #   {"type": "table", "title": "Findings Table", "widget": "findings_table", "filters": {...}},
    #   {"type": "chart", "title": "Risk Chart", "widget": "severity_pie", "settings": {...}},
    # ]
    sections: str = Field(default="[]")  # JSON string
    
    # Variables that can be customized when using the template
    # Example: [
    #   {"name": "company_name", "label": "Company Name", "type": "text", "required": false, "default": ""},
    #   {"name": "include_charts", "label": "Include Charts", "type": "boolean", "required": false, "default": true},
    #   {"name": "max_findings", "label": "Max Findings", "type": "number", "required": false, "default": 10}
    # ]
    variables: str = Field(default="[]")  # JSON string
    
    # Layout configuration (for advanced widget-based templates)
    # Example: {"page_size": "letter", "orientation": "portrait", "margins": {"top": 1, "bottom": 1}}
    layout_config: Optional[str] = Field(default=None)  # JSON string, optional
    
    # Metadata
    is_system_template: bool = Field(default=False)  # Built-in templates (read-only)
    is_public: bool = Field(default=False)  # Shared with all users
    usage_count: int = Field(default=0)  # Tracks how many times template has been used
    last_used_at: Optional[datetime] = Field(default=None)  # Last generation timestamp

class ReportTemplate(ReportTemplateBase, table=True):
    """Database model for ReportTemplate."""
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=None, index=True)
    updated_at: datetime = Field(default=None)
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="users.id")

# --- Vulnerability Repository Models ---

class VulnerabilityTemplateBase(SQLModel):
    """Base model for vulnerability templates in the knowledge repository."""
    # Core identification
    title: str = Field(..., index=True, max_length=500)
    description: str = Field(...)
    
    # Weakness/Vulnerability IDs
    cwe_id: Optional[str] = Field(default=None, index=True, max_length=20)  # e.g., "CWE-79"
    cve_id: Optional[str] = Field(default=None, index=True, max_length=50)  # e.g., "CVE-2024-1234"
    
    # Risk Scoring - CVSS 3.1
    cvss_vector: Optional[str] = Field(default=None, max_length=100)  # e.g., "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
    cvss_score: Optional[float] = Field(default=None, ge=0.0, le=10.0)  # 0.0 - 10.0
    
    # Risk Scoring - OWASP
    owasp_likelihood: Optional[int] = Field(default=None, ge=1, le=9)  # 1-9
    owasp_impact: Optional[int] = Field(default=None, ge=1, le=9)  # 1-9
    owasp_risk_rating: Optional[str] = Field(default=None, max_length=20)  # Critical/High/Medium/Low
    
    # Default categorization
    default_risk_rating: Optional[str] = Field(default=None, max_length=20, index=True)  # Maps to FindingBase.RiskRating
    vulnerability_type: Optional[str] = Field(default=None, max_length=100)  # e.g., "XSS", "SQLi", "CSRF"
    
    # Remediation guidance
    remediation_summary: Optional[str] = Field(default=None)
    remediation_steps: Optional[str] = Field(default=None)  # Detailed steps
    references: Optional[str] = Field(default=None)  # URLs, CWE links, etc.
    
    # MITRE ATT&CK mapping (JSON stored as text)
    attack_techniques: Optional[str] = Field(default=None)  # JSON array: [{"technique_id": "T1190", "technique_name": "Exploit Public-Facing Application", "tactic": "Initial Access"}]
    
    # Metadata
    source: str = Field(default="manual", max_length=50, index=True)  # "manual", "burp", "nessus", "nvd", "cwe"
    is_verified: bool = Field(default=False, index=True)  # Has this been reviewed/verified?
    usage_count: int = Field(default=0)  # How many findings use this template?
    
    # Timestamps
    created_at: datetime = Field(default=None, index=True)
    updated_at: datetime = Field(default=None)
    last_used: Optional[datetime] = Field(default=None)

class VulnerabilityTemplate(VulnerabilityTemplateBase, table=True):
    """Database model for VulnerabilityTemplate."""
    __tablename__ = "vulnerability_templates"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    matches: List["VulnerabilityMatch"] = Relationship(back_populates="template")
    versions: List["VulnerabilityTemplateVersion"] = Relationship(back_populates="template")

class VulnerabilityTemplateVersionBase(SQLModel):
    """Base model for template version history (snapshot-based versioning)."""
    template_id: int = Field(..., foreign_key="vulnerability_templates.id", index=True)
    version_number: int = Field(..., index=True)  # Auto-incremented per template
    
    # Snapshot of template state at this version
    title: str = Field(..., max_length=500)
    description: str
    cwe_id: Optional[str] = Field(default=None, max_length=20)
    cve_id: Optional[str] = Field(default=None, max_length=50)
    cvss_vector: Optional[str] = Field(default=None, max_length=100)
    cvss_score: Optional[float] = Field(default=None)
    owasp_likelihood: Optional[int] = Field(default=None)
    owasp_impact: Optional[int] = Field(default=None)
    owasp_risk_rating: Optional[str] = Field(default=None, max_length=20)
    default_risk_rating: Optional[str] = Field(default=None, max_length=20)
    vulnerability_type: Optional[str] = Field(default=None, max_length=100)
    remediation_summary: Optional[str] = Field(default=None)
    remediation_steps: Optional[str] = Field(default=None)
    references: Optional[str] = Field(default=None)
    attack_techniques: Optional[str] = Field(default=None)
    source: str = Field(default="manual", max_length=50)
    is_verified: bool = Field(default=False)
    
    # Change tracking metadata
    changed_by: Optional[str] = Field(default=None, max_length=255)  # Username/email of who made the change
    change_reason: Optional[str] = Field(default=None, max_length=500)  # Why was this change made?
    created_at: datetime = Field(default=None, index=True)  # When this version was created

class VulnerabilityTemplateVersion(VulnerabilityTemplateVersionBase, table=True):
    """Database model for VulnerabilityTemplateVersion."""
    __tablename__ = "vulnerability_template_versions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    template: Optional[VulnerabilityTemplate] = Relationship(back_populates="versions")

class VulnerabilityMatchBase(SQLModel):
    """Base model for tracking finding-to-template matches."""
    finding_id: int = Field(..., foreign_key="finding.id", index=True)
    template_id: int = Field(..., foreign_key="vulnerability_templates.id", index=True)
    
    # Match metrics
    similarity_score: float = Field(..., ge=0.0, le=1.0)  # 0.0 - 1.0 (100%)
    match_method: str = Field(..., max_length=50, index=True)  # "exact_cwe", "exact_cve", "fuzzy_title", "fuzzy_description", "ai_embedding"
    
    # Metadata
    matched_at: datetime = Field(default=None, index=True)
    matched_by: str = Field(default="auto", max_length=50)  # "auto" or username

class VulnerabilityMatch(VulnerabilityMatchBase, table=True):
    """Database model for VulnerabilityMatch."""
    __tablename__ = "vulnerability_matches"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    template: Optional[VulnerabilityTemplate] = Relationship(back_populates="matches")

# --- Import History Models ---

class ImportHistoryBase(SQLModel):
    """Base model for tracking vulnerability database imports (CWE/CVE)."""
    # Import metadata
    source: str = Field(..., max_length=50, index=True)  # "cwe", "nvd", "manual"
    import_type: str = Field(..., max_length=50)  # "bulk_cwe", "bulk_nvd", "single_cve", "sync"
    
    # File information
    file_name: Optional[str] = Field(default=None, max_length=255)
    file_size: Optional[int] = Field(default=None)  # bytes
    
    # Import results
    templates_created: int = Field(default=0)
    templates_updated: int = Field(default=0)
    templates_skipped: int = Field(default=0)
    errors: int = Field(default=0)
    total_parsed: int = Field(default=0)
    
    # Calculated field
    @computed_field  # type: ignore[misc]
    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.total_parsed == 0:
            return 0.0
        return round((self.templates_created + self.templates_updated) / self.total_parsed * 100, 2)
    
    # Metadata
    imported_by: str = Field(default="system", max_length=100)  # username or "system"
    imported_at: datetime = Field(default=None, index=True)
    duration_seconds: Optional[float] = Field(default=None)  # import duration
    
    # Error details (JSON stored as text)
    error_details: Optional[str] = Field(default=None)  # JSON array of error messages

class ImportHistory(ImportHistoryBase, table=True):
    """Database model for ImportHistory."""
    __tablename__ = "import_history"
    
    id: Optional[int] = Field(default=None, primary_key=True)

# --- Read Models (For FastAPI Responses) ---

# 1. Instance Read Model
class InstanceRead(InstanceBase):
    id: int
    finding_id: int
    
    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime, _info):
        """Serialize datetime with timezone info"""
        if value and value.tzinfo:
            return value.isoformat()
        return value

# 2. Comment Read Model
class CommentRead(SQLModel):
    """Read model for Comment with all fields."""
    id: int
    finding_id: int
    text: str
    user: str
    created_at: datetime
    
    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime, _info):
        """Serialize datetime with timezone info"""
        if value and value.tzinfo:
            return value.isoformat()
        return value

# 3. AuditLog Read Model
class AuditLogRead(AuditLogBase):
    id: int

# 4. JiraSettings Read Model
class JiraSettingsRead(JiraSettingsBase):
    id: int
    project_id: Optional[int]

# 5. UserPreferences Read Model
class UserPreferencesRead(UserPreferencesBase):
    id: int

# 7. Finding Read Model 
class FindingReadWithInstances(FindingBase):
    id: int
    project_id: int
    instances: List[InstanceRead] = []
    comments: List[CommentRead] = []
    tags: List["TagRead"] = []  # Include tags with findings (forward reference)

# 8. Project Read Model
class ProjectReadWithFindings(ProjectBase):
    """Used to read a Project including all its Findings (and their Instances)."""
    id: int
    findings: List[FindingReadWithInstances] = []

# 9. Project Read Model with Statistics (for project listing)
class ProjectReadWithStats(ProjectBase):
    """Used to read a Project with aggregated statistics (for project list view)."""
    id: int
    total_findings: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    last_upload_date: Optional[datetime] = None

# 10. VulnerabilityTemplate Read Model
class VulnerabilityTemplateRead(VulnerabilityTemplateBase):
    """Used to read a VulnerabilityTemplate."""
    id: int
    
    @computed_field
    @property
    def attack_techniques_parsed(self) -> Optional[List[Dict[str, str]]]:
        """Parse attack_techniques JSON on demand"""
        if self.attack_techniques:
            try:
                return json.loads(self.attack_techniques)
            except (json.JSONDecodeError, TypeError):
                return None
        return None
    
    @field_serializer('created_at', 'updated_at', 'last_used')
    def serialize_datetime(self, value: Optional[datetime], _info):
        """Serialize datetime with timezone info"""
        if value and value.tzinfo:
            return value.isoformat()
        return value

# 11. VulnerabilityMatch Read Model
class VulnerabilityMatchRead(VulnerabilityMatchBase):
    """Used to read a VulnerabilityMatch."""
    id: int
    
    @field_serializer('matched_at')
    def serialize_matched_at(self, value: datetime, _info):
        """Serialize datetime with timezone info"""
        if value and value.tzinfo:
            return value.isoformat()
        return value

# 12. ImportHistory Read Model
class ImportHistoryRead(ImportHistoryBase):
    """Used to read ImportHistory with all fields."""
    id: int
    
    @computed_field  # type: ignore[misc]
    @property
    def error_details_parsed(self) -> Optional[List[str]]:
        """Parse error_details JSON on demand"""
        if self.error_details:
            try:
                return json.loads(self.error_details)
            except (json.JSONDecodeError, TypeError):
                return None
        return None
    
    @field_serializer('imported_at')
    def serialize_imported_at(self, value: datetime, _info):
        """Serialize datetime with timezone info"""
        if value and value.tzinfo:
            return value.isoformat()
        return value

# 13. VulnerabilityTemplate with Matches
class VulnerabilityTemplateWithMatches(VulnerabilityTemplateBase):
    """Used to read a VulnerabilityTemplate with its matches."""
    id: int
    matches: List[VulnerabilityMatchRead] = []
    
    @field_serializer('created_at', 'updated_at', 'last_used')
    def serialize_datetime(self, value: Optional[datetime], _info):
        """Serialize datetime with timezone info"""
        if value and value.tzinfo:
            return value.isoformat()
        return value

# 13. VulnerabilityTemplateVersion Read Model
class VulnerabilityTemplateVersionRead(VulnerabilityTemplateVersionBase):
    """Used to read a VulnerabilityTemplateVersion."""
    id: int
    
    @computed_field
    @property
    def attack_techniques_parsed(self) -> Optional[List[Dict[str, str]]]:
        """Parse attack_techniques JSON on demand"""
        if self.attack_techniques:
            try:
                return json.loads(self.attack_techniques)
            except (json.JSONDecodeError, TypeError):
                return None
        return None
    
    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime, _info):
        """Serialize datetime with timezone info"""
        if value and value.tzinfo:
            return value.isoformat()
        return value

# --- Utility Models (The Fixes) ---

class RiskMapping(SQLModel):
    """A utility class to represent risk categories (not mapped to DB table)."""
    risk: str
    count: int

class FindingStatus(SQLModel): # <-- ADDED THIS MODEL TO FIX THE IMPORTERROR
    """A utility class for finding statuses (not mapped to DB table)."""
    status_name: str
    status_id: int

# --- Dashboard Metrics Models ---

class SLAComplianceMetrics(SQLModel):
    """SLA compliance breakdown for dashboard widget."""
    on_track: int
    at_risk: int
    overdue: int
    total: int
    compliance_rate: float  # Percentage on track

class FindingTrend(SQLModel):
    """Single data point for finding trends chart."""
    date: str  # ISO date format
    total_findings: int
    open_findings: int
    closed_findings: int

class TopVulnerability(SQLModel):
    """Top vulnerability by instance count."""
    title: str
    risk_rating: str
    instance_count: int
    finding_id: int

class ReviewProgressMetrics(SQLModel):
    """Review workflow progress metrics."""
    pending: int
    in_review: int
    approved: int
    rejected: int
    total: int
    approval_rate: float  # Percentage approved

class ProjectMetrics(SQLModel):
    """Comprehensive dashboard metrics for a project."""
    # SLA Compliance
    sla_compliance: SLAComplianceMetrics
    
    # Review Progress
    review_progress: ReviewProgressMetrics
    
    # Finding Trends (last 30 days or since project start)
    finding_trends: List[FindingTrend]
    
    # Top Vulnerabilities (top 5 by instance count)
    top_vulnerabilities: List[TopVulnerability]
    
    # Key Metrics
    total_findings: int
    total_instances: int
    average_cvss_score: Optional[float]
    findings_with_jira: int
    jira_sync_rate: float  # Percentage with Jira tickets

# --- Tag Read Models ---

class TagRead(TagBase):
    """Read model for Tag with metadata."""
    id: int
    created_at: datetime
    usage_count: int

class TagCreate(TagBase):
    """Model for creating a tag."""
    pass

class TagUpdate(SQLModel):
    """Model for updating a tag (all fields optional)."""
    name: Optional[str] = Field(default=None, max_length=50)
    color: Optional[str] = Field(default=None, max_length=7)
    description: Optional[str] = Field(default=None, max_length=200)
    average_time_to_approval: Optional[float] = None  # Days, if available

# --- Report Template & Email Settings Models ---

class ReportTemplateType(str, Enum):
    """Enum for report template types."""
    ExecutiveSummary = "Executive Summary"
    TechnicalFindings = "Technical Findings"
    RiskAssessment = "Risk Assessment"
    RemediationStatus = "Remediation Status"
    PortfolioOverview = "Portfolio Overview"
    ComplianceOWASP = "Compliance - OWASP Top 10"
    ComplianceCWE = "Compliance - CWE Top 25"
    ComplianceATTACK = "Compliance - MITRE ATT&CK"
    ComplianceSLA = "Compliance - SLA Report"
    Custom = "Custom Template"  # User-defined templates

class ReportFormat(str, Enum):
    """Enum for report output formats."""
    DOCX = "docx"
    PDF = "pdf"
    HTML = "html"

class EmailSettingsBase(SQLModel):
    """Base model for email/SMTP settings."""
    smtp_host: str = Field(..., max_length=255)
    smtp_port: int = Field(default=587)
    smtp_username: str = Field(..., max_length=255)
    smtp_password: str = Field(..., max_length=255)  # Should be encrypted in production
    smtp_use_tls: bool = Field(default=True)
    smtp_use_ssl: bool = Field(default=False)
    from_email: str = Field(..., max_length=255)
    from_name: Optional[str] = Field(default="VulnManager Reports", max_length=255)
    is_active: bool = Field(default=False)

class EmailSettings(EmailSettingsBase, table=True):
    """Database model for email/SMTP settings."""
    __tablename__ = "email_settings"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=None)
    updated_at: datetime = Field(default=None)

class EmailSettingsRead(EmailSettingsBase):
    """Read model for email settings (excludes password)."""
    id: int
    created_at: datetime
    updated_at: datetime
    smtp_password: str = Field(default="********")  # Masked for security

class EmailSettingsCreate(EmailSettingsBase):
    """Model for creating email settings."""
    pass

class EmailSettingsUpdate(SQLModel):
    """Model for updating email settings (all optional)."""
    smtp_host: Optional[str] = Field(default=None, max_length=255)
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = Field(default=None, max_length=255)
    smtp_password: Optional[str] = Field(default=None, max_length=255)
    smtp_use_tls: Optional[bool] = None
    smtp_use_ssl: Optional[bool] = None
    from_email: Optional[str] = Field(default=None, max_length=255)
    from_name: Optional[str] = Field(default=None, max_length=255)
    is_active: Optional[bool] = None

class ReportBrandingBase(SQLModel):
    """Base model for report branding/customization."""
    company_name: Optional[str] = Field(default=None, max_length=255)
    company_address: Optional[str] = Field(default=None, max_length=500)
    company_phone: Optional[str] = Field(default=None, max_length=50)
    company_email: Optional[str] = Field(default=None, max_length=255)
    company_website: Optional[str] = Field(default=None, max_length=255)
    logo_path: Optional[str] = Field(default=None, max_length=500)  # Path to uploaded logo
    primary_color: str = Field(default="#1976d2", max_length=7)  # Hex color
    secondary_color: str = Field(default="#dc004e", max_length=7)
    footer_text: Optional[str] = Field(default=None, max_length=500)

class ReportBranding(ReportBrandingBase, table=True):
    """Database model for report branding."""
    __tablename__ = "report_branding"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=None)
    updated_at: datetime = Field(default=None)

class ReportBrandingRead(ReportBrandingBase):
    """Read model for report branding."""
    id: int
    created_at: datetime
    updated_at: datetime

class ReportBrandingUpdate(SQLModel):
    """Model for updating report branding (all optional)."""
    company_name: Optional[str] = Field(default=None, max_length=255)
    company_address: Optional[str] = Field(default=None, max_length=500)
    company_phone: Optional[str] = Field(default=None, max_length=50)
    company_email: Optional[str] = Field(default=None, max_length=255)
    company_website: Optional[str] = Field(default=None, max_length=255)
    logo_path: Optional[str] = Field(default=None, max_length=500)
    primary_color: Optional[str] = Field(default=None, max_length=7)
    secondary_color: Optional[str] = Field(default=None, max_length=7)
    footer_text: Optional[str] = Field(default=None, max_length=500)

class CustomReportTemplateBase(SQLModel):
    """Base model for custom report templates."""
    name: str = Field(..., max_length=255, index=True)
    description: Optional[str] = Field(default=None, max_length=1000)
    template_json: str = Field(...)  # JSON string containing template structure
    is_public: bool = Field(default=False)  # Whether template is shared with all users
    created_by: Optional[str] = Field(default=None, max_length=255)  # Username/email

class CustomReportTemplate(CustomReportTemplateBase, table=True):
    """Database model for custom report templates."""
    __tablename__ = "custom_report_templates"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=None, index=True)
    updated_at: datetime = Field(default=None)
    last_used_at: Optional[datetime] = Field(default=None)
    usage_count: int = Field(default=0)

class CustomReportTemplateRead(CustomReportTemplateBase):
    """Read model for custom report templates."""
    id: int
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime]
    usage_count: int

class CustomReportTemplateCreate(SQLModel):
    """Model for creating custom report templates."""
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    template_json: str = Field(...)
    is_public: bool = Field(default=False)
    created_by: Optional[str] = Field(default=None, max_length=255)

class CustomReportTemplateUpdate(SQLModel):
    """Model for updating custom report templates (all optional)."""
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    template_json: Optional[str] = Field(default=None)
    is_public: Optional[bool] = Field(default=None)

class ReportGenerationRequest(SQLModel):
    """Model for report generation request."""
    template_type: ReportTemplateType
    format: ReportFormat = Field(default=ReportFormat.PDF)
    project_ids: List[int] = Field(default_factory=list)  # Empty = all projects
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    include_sections: Optional[List[str]] = Field(default=None)  # Section names to include
    send_email: bool = Field(default=False)  # Whether to send via email
    email_to: Optional[List[str]] = Field(default=None)  # Email addresses for delivery
    email_cc: Optional[List[str]] = Field(default=None)  # CC recipients
    email_bcc: Optional[List[str]] = Field(default=None)  # BCC recipients
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    custom_template_id: Optional[int] = Field(default=None)  # ID of custom template to use

# --- Predictive Analytics Models (v0.8.5) ---

class RemediationTimeEstimate(SQLModel):
    """Remediation time prediction for a finding by risk level."""
    risk_level: str
    estimated_days: float
    confidence_interval_low: float
    confidence_interval_high: float
    sample_size: int  # Number of historical findings used

class RiskForecastPoint(SQLModel):
    """Single point in risk forecast timeline."""
    date: str  # ISO date
    predicted_risk_score: float
    lower_bound: float
    upper_bound: float

class RiskForecast(SQLModel):
    """Risk score forecast for 30/60/90 days ahead."""
    current_risk_score: float
    forecast_30_days: RiskForecastPoint
    forecast_60_days: RiskForecastPoint
    forecast_90_days: RiskForecastPoint
    trend: str  # "improving", "stable", "worsening"
    confidence: float  # 0.0 - 1.0

class Anomaly(SQLModel):
    """Detected anomaly in security metrics."""
    anomaly_type: str  # "spike_in_findings", "remediation_slowdown", "regression"
    severity: str  # "low", "medium", "high", "critical"
    detected_at: str  # ISO datetime
    description: str
    affected_findings: List[int]  # Finding IDs
    recommendation: str

class Recommendation(SQLModel):
    """Actionable recommendation based on project analysis."""
    priority: str  # "critical", "high", "medium", "low"
    category: str  # "quick_wins", "stale_findings", "sla_at_risk", "resource_allocation"
    title: str
    description: str
    affected_findings: List[int]  # Finding IDs
    estimated_effort: Optional[str]  # "1 day", "1 week", etc.
    potential_impact: str

# --- Report Template Read Models (v1.1.0 - Unified) ---

class ReportTemplateRead(ReportTemplateBase):
    """Read model for report templates."""
    id: int
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[int]
    usage_count: int
    last_used_at: Optional[datetime]

class ReportTemplateCreate(SQLModel):
    """Model for creating report templates."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    template_type: str = Field(...)  # "Executive", "Technical", "Compliance", "Custom"
    sections: str = Field(default="[]")  # JSON string
    variables: str = Field(default="[]")  # JSON string
    layout_config: Optional[str] = Field(default=None)  # JSON string
    is_public: bool = Field(default=False)

class ReportTemplateUpdate(SQLModel):
    """Model for updating report templates (all fields optional)."""
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    template_type: Optional[str] = Field(default=None)
    sections: Optional[str] = Field(default=None)
    variables: Optional[str] = Field(default=None)
    layout_config: Optional[str] = Field(default=None)
    is_public: Optional[bool] = Field(default=None)

# Rebuild models to resolve forward references
FindingReadWithInstances.model_rebuild()
