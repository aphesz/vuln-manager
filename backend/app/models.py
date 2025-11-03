# backend/app/models.py

from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship  # type: ignore
from enum import Enum
from datetime import datetime

# --- Base Models ---

from pydantic import field_serializer

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
    
    # Vulnerability Repository link
    template_id: Optional[int] = Field(default=None, index=True)  # Foreign key to VulnerabilityTemplate

class InstanceBase(SQLModel):
    """Base model for a single instance (or occurrence) of a finding."""
    location: str = Field(...)
    details: str = Field(...)
    status: str = Field(default="New - Unvalidated", index=True)  # e.g., 'New', 'Confirmed', 'Remediated'
    created_at: datetime = Field(default=None, index=True)  # Will be set by timezone_utils.get_utc_now()

# --- Table Models ---

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
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    matches: List["VulnerabilityMatch"] = Relationship(back_populates="template")

class VulnerabilityMatchBase(SQLModel):
    """Base model for tracking finding-to-template matches."""
    finding_id: int = Field(..., foreign_key="finding.id", index=True)
    template_id: int = Field(..., foreign_key="vulnerabilitytemplate.id", index=True)
    
    # Match metrics
    similarity_score: float = Field(..., ge=0.0, le=1.0)  # 0.0 - 1.0 (100%)
    match_method: str = Field(..., max_length=50, index=True)  # "exact_cwe", "exact_cve", "fuzzy_title", "fuzzy_description", "ai_embedding"
    
    # Metadata
    matched_at: datetime = Field(default=None, index=True)
    matched_by: str = Field(default="auto", max_length=50)  # "auto" or username

class VulnerabilityMatch(VulnerabilityMatchBase, table=True):
    """Database model for VulnerabilityMatch."""
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    template: Optional[VulnerabilityTemplate] = Relationship(back_populates="matches")

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

# 12. VulnerabilityTemplate with Matches
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

# --- Utility Models (The Fixes) ---

class RiskMapping(SQLModel):
    """A utility class to represent risk categories (not mapped to DB table)."""
    risk: str
    count: int

class FindingStatus(SQLModel): # <-- ADDED THIS MODEL TO FIX THE IMPORTERROR
    """A utility class for finding statuses (not mapped to DB table)."""
    status_name: str
    status_id: int