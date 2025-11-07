"""
Trend Analysis Module

Provides historical trend data and analytics for security posture visualization.
Part of v0.8.1 - Trend Analysis & Historical Data feature.

Functions:
- get_findings_timeline: Finding counts over time by risk rating
- get_remediation_progress: Remediation velocity and MTTR metrics
- get_risk_score_trend: Aggregate risk score evolution
- get_upload_history: Timeline of scan uploads with metrics
"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Literal
from sqlmodel import Session, select, func, and_, or_
from app.models import Finding, Instance, Project
import logging

logger = logging.getLogger(__name__)

# Type aliases for clarity
TimeGranularity = Literal["daily", "weekly", "monthly"]
RiskRating = Literal["Critical", "High", "Medium", "Low", "Informational"]


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware (UTC)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def get_findings_timeline(
    session: Session,
    project_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    granularity: TimeGranularity = "daily"
) -> Dict[str, Any]:
    """
    Get time-series data of finding counts grouped by date and risk rating.
    
    Args:
        session: Database session
        project_id: Project ID to analyze
        start_date: Start of date range (default: 30 days ago)
        end_date: End of date range (default: now)
        granularity: Time grouping (daily, weekly, monthly)
    
    Returns:
        {
            "labels": ["2025-11-01", "2025-11-02", ...],
            "datasets": {
                "Critical": [5, 4, 3, ...],
                "High": [10, 12, 11, ...],
                "Medium": [15, 14, 16, ...],
                "Low": [20, 19, 21, ...],
                "Informational": [5, 5, 6, ...]
            },
            "totals": {
                "Critical": 45,
                "High": 120,
                "Medium": 150,
                "Low": 200,
                "Informational": 30
            }
        }
    """
    # Default to last 30 days if not specified
    if end_date is None:
        end_date = datetime.now(timezone.utc)
    if start_date is None:
        start_date = end_date - timedelta(days=30)
    
    # Ensure timezone awareness
    start_date = _ensure_utc(start_date)
    end_date = _ensure_utc(end_date)
    
    # Verify project exists
    project = session.get(Project, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    
    # Get all findings for this project discovered in date range
    statement = select(Finding).where(
        and_(
            Finding.project_id == project_id,
            Finding.discovered_at >= start_date,
            Finding.discovered_at <= end_date
        )
    )
    findings = session.exec(statement).all()
    
    # Generate date labels based on granularity
    labels = _generate_date_labels(start_date, end_date, granularity)
    
    # Initialize datasets for each risk rating
    risk_ratings = ["Critical", "High", "Medium", "Low", "Informational"]
    datasets = {rating: [0] * len(labels) for rating in risk_ratings}
    totals = {rating: 0 for rating in risk_ratings}
    
    # Populate datasets by counting findings per date bucket
    for finding in findings:
        risk = finding.risk_rating.value
        discovered = finding.discovered_at
        
        # Find which date bucket this finding belongs to
        bucket_idx = _get_date_bucket_index(discovered, labels, granularity)
        if bucket_idx is not None:
            datasets[risk][bucket_idx] += 1
            totals[risk] += 1
    
    return {
        "labels": labels,
        "datasets": datasets,
        "totals": totals,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "granularity": granularity
    }


def get_remediation_progress(
    session: Session,
    project_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    granularity: TimeGranularity = "daily"
) -> Dict[str, Any]:
    """
    Track remediation progress over time with velocity metrics.
    
    Args:
        session: Database session
        project_id: Project ID to analyze
        start_date: Start of date range (default: 30 days ago)
        end_date: End of date range (default: now)
        granularity: Time grouping (daily, weekly, monthly)
    
    Returns:
        {
            "labels": ["2025-11-01", "2025-11-02", ...],
            "open_findings": [50, 48, 45, ...],
            "closed_findings": [5, 7, 10, ...],
            "remediation_velocity": 2.5,  # findings closed per week
            "mean_time_to_remediate": {
                "Critical": 15.5,  # days
                "High": 25.3,
                "Medium": 45.2,
                "Low": 60.1
            },
            "by_risk": {
                "Critical": {"open": 5, "closed": 10},
                "High": {"open": 12, "closed": 20},
                ...
            }
        }
    """
    # Default to last 30 days
    if end_date is None:
        end_date = datetime.now(timezone.utc)
    if start_date is None:
        start_date = end_date - timedelta(days=30)
    
    # Ensure timezone awareness
    start_date = _ensure_utc(start_date)
    end_date = _ensure_utc(end_date)
    
    # Verify project exists
    project = session.get(Project, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    
    # Get all findings for this project
    statement = select(Finding).where(Finding.project_id == project_id)
    all_findings = session.exec(statement).all()
    
    # Generate date labels
    labels = _generate_date_labels(start_date, end_date, granularity)
    
    # Track open/closed counts at each point in time
    open_counts = []
    closed_counts = []
    
    for label_date_str in labels:
        label_date = _ensure_utc(datetime.fromisoformat(label_date_str))
        
        # Count findings that were discovered but not yet resolved at this point
        open_at_date = sum(
            1 for f in all_findings
            if f.discovered_at <= label_date and (f.resolved_at is None or f.resolved_at > label_date)
        )
        
        # Count findings that were resolved by this point
        closed_at_date = sum(
            1 for f in all_findings
            if f.resolved_at is not None and f.resolved_at <= label_date
        )
        
        open_counts.append(open_at_date)
        closed_counts.append(closed_at_date)
    
    # Calculate remediation velocity (findings closed per week)
    closed_in_period = sum(
        1 for f in all_findings
        if f.resolved_at and start_date <= f.resolved_at <= end_date
    )
    days_in_period = (end_date - start_date).days
    weeks_in_period = max(days_in_period / 7.0, 0.1)
    remediation_velocity = closed_in_period / weeks_in_period
    
    # Calculate Mean Time To Remediate (MTTR) by risk level
    mttr_by_risk = {}
    by_risk_stats = {}
    
    risk_ratings = ["Critical", "High", "Medium", "Low", "Informational"]
    for risk in risk_ratings:
        findings_for_risk = [f for f in all_findings if f.risk_rating.value == risk]
        
        # Calculate MTTR for closed findings
        closed_for_risk = [
            f for f in findings_for_risk
            if f.resolved_at is not None
        ]
        
        if closed_for_risk:
            remediation_times = [
                (f.resolved_at - f.discovered_at).days
                for f in closed_for_risk
            ]
            mttr_by_risk[risk] = round(sum(remediation_times) / len(remediation_times), 1)
        else:
            mttr_by_risk[risk] = None
        
        # Count current open/closed
        open_count = sum(1 for f in findings_for_risk if f.resolved_at is None)
        closed_count = len(closed_for_risk)
        by_risk_stats[risk] = {"open": open_count, "closed": closed_count}
    
    return {
        "labels": labels,
        "open_findings": open_counts,
        "closed_findings": closed_counts,
        "remediation_velocity": round(remediation_velocity, 2),
        "mean_time_to_remediate": mttr_by_risk,
        "by_risk": by_risk_stats,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "granularity": granularity
    }


def get_risk_score_trend(
    session: Session,
    project_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    granularity: TimeGranularity = "daily"
) -> Dict[str, Any]:
    """
    Calculate aggregate risk score over time.
    
    Risk score is weighted: Critical=10, High=5, Medium=3, Low=1, Informational=0
    
    Args:
        session: Database session
        project_id: Project ID to analyze
        start_date: Start of date range (default: 30 days ago)
        end_date: End of date range (default: now)
        granularity: Time grouping (daily, weekly, monthly)
    
    Returns:
        {
            "labels": ["2025-11-01", "2025-11-02", ...],
            "risk_scores": [250, 245, 230, ...],
            "trend": "improving",  # "improving", "stable", "worsening"
            "change_percent": -8.0,  # -8% = 8% improvement
            "current_score": 230,
            "start_score": 250
        }
    """
    # Default to last 30 days
    if end_date is None:
        end_date = datetime.now(timezone.utc)
    if start_date is None:
        start_date = end_date - timedelta(days=30)
    
    # Ensure timezone awareness
    start_date = _ensure_utc(start_date)
    end_date = _ensure_utc(end_date)
    
    # Verify project exists
    project = session.get(Project, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    
    # Risk score weights
    risk_weights = {
        "Critical": 10,
        "High": 5,
        "Medium": 3,
        "Low": 1,
        "Informational": 0
    }
    
    # Get all findings for this project
    statement = select(Finding).where(Finding.project_id == project_id)
    all_findings = session.exec(statement).all()
    
    # Generate date labels
    labels = _generate_date_labels(start_date, end_date, granularity)
    
    # Calculate risk score at each point in time
    risk_scores = []
    
    for label_date_str in labels:
        label_date = _ensure_utc(datetime.fromisoformat(label_date_str))
        
        # Count open findings at this point
        open_findings = [
            f for f in all_findings
            if f.discovered_at <= label_date and (f.resolved_at is None or f.resolved_at > label_date)
        ]
        
        # Calculate weighted risk score
        score = sum(risk_weights[f.risk_rating.value] for f in open_findings)
        risk_scores.append(score)
    
    # Determine trend
    start_score = risk_scores[0] if risk_scores else 0
    current_score = risk_scores[-1] if risk_scores else 0
    
    if start_score > 0:
        change_percent = ((current_score - start_score) / start_score) * 100
    else:
        change_percent = 0
    
    if change_percent < -5:
        trend = "improving"
    elif change_percent > 5:
        trend = "worsening"
    else:
        trend = "stable"
    
    return {
        "labels": labels,
        "risk_scores": risk_scores,
        "trend": trend,
        "change_percent": round(change_percent, 1),
        "current_score": current_score,
        "start_score": start_score,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "granularity": granularity
    }


def get_upload_history(
    session: Session,
    project_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Get timeline of scan uploads with findings discovered per upload.
    
    Note: This is a simplified version. Full implementation would require
    tracking upload events separately. For now, we estimate based on
    instance created_at timestamps.
    
    Args:
        session: Database session
        project_id: Project ID to analyze
        start_date: Start of date range (default: 90 days ago)
        end_date: End of date range (default: now)
    
    Returns:
        {
            "uploads": [
                {
                    "date": "2025-11-01T10:30:00",
                    "findings_discovered": 15,
                    "scanner_type": "burp",  # if trackable
                    "critical_count": 2,
                    "high_count": 5,
                    "medium_count": 8
                },
                ...
            ],
            "total_uploads": 5,
            "average_findings_per_upload": 12.4
        }
    """
    # Default to last 90 days
    if end_date is None:
        end_date = datetime.now(timezone.utc)
    if start_date is None:
        start_date = end_date - timedelta(days=90)
    
    # Ensure timezone awareness
    start_date = _ensure_utc(start_date)
    end_date = _ensure_utc(end_date)
    
    # Verify project exists
    project = session.get(Project, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    
    # Get findings discovered in date range
    statement = select(Finding).where(
        and_(
            Finding.project_id == project_id,
            Finding.discovered_at >= start_date,
            Finding.discovered_at <= end_date
        )
    ).order_by(Finding.discovered_at)
    
    findings = session.exec(statement).all()
    
    # Group findings by discovery date (approximate upload events)
    # Findings discovered within 1 hour of each other are considered part of same upload
    uploads = []
    current_upload = None
    
    for finding in findings:
        if current_upload is None:
            # Start new upload event
            current_upload = {
                "date": finding.discovered_at.isoformat(),
                "findings": [finding]
            }
        else:
            # Check if this finding is part of current upload (within 1 hour)
            last_date = _ensure_utc(datetime.fromisoformat(current_upload["date"]))
            if (finding.discovered_at - last_date).total_seconds() <= 3600:
                current_upload["findings"].append(finding)
            else:
                # Finalize current upload and start new one
                uploads.append(_finalize_upload(current_upload))
                current_upload = {
                    "date": finding.discovered_at.isoformat(),
                    "findings": [finding]
                }
    
    # Finalize last upload
    if current_upload:
        uploads.append(_finalize_upload(current_upload))
    
    # Calculate statistics
    total_uploads = len(uploads)
    total_findings = sum(u["findings_discovered"] for u in uploads)
    avg_findings = round(total_findings / total_uploads, 1) if total_uploads > 0 else 0
    
    return {
        "uploads": uploads,
        "total_uploads": total_uploads,
        "average_findings_per_upload": avg_findings,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat()
    }


# Helper functions

def _generate_date_labels(
    start_date: datetime,
    end_date: datetime,
    granularity: TimeGranularity
) -> List[str]:
    """Generate date labels based on granularity."""
    labels = []
    current = start_date
    
    if granularity == "daily":
        delta = timedelta(days=1)
        date_format = "%Y-%m-%d"
    elif granularity == "weekly":
        delta = timedelta(weeks=1)
        date_format = "%Y-W%W"  # ISO week format
    else:  # monthly
        delta = timedelta(days=30)  # Approximate
        date_format = "%Y-%m"
    
    while current <= end_date:
        labels.append(current.strftime(date_format))
        current += delta
    
    return labels


def _get_date_bucket_index(
    date: datetime,
    labels: List[str],
    granularity: TimeGranularity
) -> Optional[int]:
    """Find which date bucket a datetime belongs to."""
    if granularity == "daily":
        date_str = date.strftime("%Y-%m-%d")
    elif granularity == "weekly":
        date_str = date.strftime("%Y-W%W")
    else:  # monthly
        date_str = date.strftime("%Y-%m")
    
    try:
        return labels.index(date_str)
    except ValueError:
        return None


def _finalize_upload(upload_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert upload findings list to summary statistics."""
    findings = upload_data["findings"]
    
    risk_counts = {
        "Critical": 0,
        "High": 0,
        "Medium": 0,
        "Low": 0,
        "Informational": 0
    }
    
    for finding in findings:
        risk = finding.risk_rating.value
        risk_counts[risk] += 1
    
    return {
        "date": upload_data["date"],
        "findings_discovered": len(findings),
        "critical_count": risk_counts["Critical"],
        "high_count": risk_counts["High"],
        "medium_count": risk_counts["Medium"],
        "low_count": risk_counts["Low"],
        "informational_count": risk_counts["Informational"]
    }
