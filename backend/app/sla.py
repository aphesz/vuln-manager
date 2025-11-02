"""SLA and remediation tracking logic for VulnManager."""

from datetime import datetime, timedelta, timezone
from typing import Optional, List
from sqlmodel import Session, select
from app.models import Finding, FindingBase
from app.timezone_utils import get_utc_now
import logging

logger = logging.getLogger(__name__)

# SLA Deadlines based on risk rating (in days)
SLA_DEADLINES = {
    FindingBase.RiskRating.Critical: 7,      # 7 days
    FindingBase.RiskRating.High: 14,         # 14 days
    FindingBase.RiskRating.Medium: 30,       # 30 days
    FindingBase.RiskRating.Low: 90,          # 90 days
    FindingBase.RiskRating.Informational: None,  # No SLA
}

# Thresholds for "At Risk" status (percentage of time elapsed)
AT_RISK_THRESHOLD = 0.75  # If 75% of time has elapsed, mark as "At Risk"


def calculate_sla_deadline(
    risk_rating: FindingBase.RiskRating,
    created_at: Optional[datetime] = None
) -> Optional[datetime]:
    """
    Calculate the SLA deadline for a finding based on its risk rating.
    
    Args:
        risk_rating: The risk rating of the finding
        created_at: When the finding was created (defaults to now)
        
    Returns:
        The SLA deadline datetime, or None if no SLA applies
    """
    days = SLA_DEADLINES.get(risk_rating)
    if days is None:
        return None
        
    start_date = created_at or get_utc_now()
    return start_date + timedelta(days=days)


def calculate_sla_status(
    deadline: Optional[datetime],
    current_time: Optional[datetime] = None
) -> Optional[FindingBase.SLAStatus]:
    """
    Calculate the SLA status based on the deadline.
    
    Args:
        deadline: The SLA deadline
        current_time: The current time (defaults to now)
        
    Returns:
        The SLA status (On Track, At Risk, or Overdue)
    """
    if deadline is None:
        return None
    
    # Make sure we're working with timezone-aware datetimes
    now = current_time or datetime.now(timezone.utc)
    
    # If deadline is naive, make it UTC-aware
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    
    # If now is naive, make it UTC-aware
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    
    # If past deadline, it's overdue
    if now > deadline:
        return FindingBase.SLAStatus.Overdue
        return FindingBase.SLAStatus.Overdue
    
    # Calculate time remaining vs. total time
    # For "At Risk", we need to know when it was created
    # Since we only have deadline, we'll use a simple heuristic:
    # If less than 25% of the original time remains, mark as "At Risk"
    
    # We'll assume the original SLA period based on how close we are
    # This is a simplified approach - in production, store created_at
    time_remaining = deadline - now
    
    # Heuristic: if less than 2 days remaining for any finding, mark as "At Risk"
    # (unless it's a Low priority finding)
    if time_remaining.days < 2:
        return FindingBase.SLAStatus.AtRisk
    
    # For now, default to "On Track"
    return FindingBase.SLAStatus.OnTrack


def update_finding_sla(
    finding: Finding,
    session: Session
) -> Finding:
    """
    Update the SLA status for a single finding.
    
    Args:
        finding: The finding to update
        session: Database session
        
    Returns:
        The updated finding
    """
    # If no deadline set, calculate it
    if not finding.remediation_deadline:
        finding.remediation_deadline = calculate_sla_deadline(finding.risk_rating)
    
    # Calculate and update SLA status
    finding.sla_status = calculate_sla_status(finding.remediation_deadline)
    
    session.add(finding)
    session.commit()
    session.refresh(finding)
    
    return finding


def update_all_slas(session: Session) -> int:
    """
    Background task to update SLA statuses for all findings.
    
    Args:
        session: Database session
        
    Returns:
        Number of findings updated
    """
    logger.info("Starting SLA update task...")
    
    statement = select(Finding)
    findings = session.exec(statement).all()
    
    updated_count = 0
    for finding in findings:
        old_status = finding.sla_status
        update_finding_sla(finding, session)
        
        if old_status != finding.sla_status:
            updated_count += 1
            logger.info(
                f"Finding {finding.id} SLA status changed: "
                f"{old_status} -> {finding.sla_status}"
            )
    
    logger.info(f"SLA update task complete. Updated {updated_count} findings.")
    return updated_count


def get_overdue_findings(session: Session) -> List[Finding]:
    """
    Get all findings that are past their SLA deadline.
    
    Args:
        session: Database session
        
    Returns:
        List of overdue findings
    """
    statement = select(Finding).where(
        Finding.sla_status == FindingBase.SLAStatus.Overdue
    )
    return list(session.exec(statement).all())


def get_sla_summary(session: Session) -> dict:
    """
    Get a summary of findings by SLA status.
    
    Args:
        session: Database session
        
    Returns:
        Dictionary with counts by SLA status
    """
    statement = select(Finding)
    findings = session.exec(statement).all()
    
    summary = {
        "on_track": 0,
        "at_risk": 0,
        "overdue": 0,
        "no_sla": 0,
        "total": len(findings)
    }
    
    for finding in findings:
        if finding.sla_status == FindingBase.SLAStatus.OnTrack:
            summary["on_track"] += 1
        elif finding.sla_status == FindingBase.SLAStatus.AtRisk:
            summary["at_risk"] += 1
        elif finding.sla_status == FindingBase.SLAStatus.Overdue:
            summary["overdue"] += 1
        else:
            summary["no_sla"] += 1
    
    return summary
