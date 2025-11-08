# backend/app/predict.py
"""
Predictive Analytics Module (v0.8.5)

Provides statistical algorithms for:
- Remediation time estimation
- Risk score forecasting
- Anomaly detection
- Automated recommendations

No external ML libraries required - uses simple statistical methods.
"""

from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from sqlmodel import Session, select
from sqlalchemy import func
import statistics
import logging

from app.models import (
    Finding,
    Project,
    Instance,
    RemediationTimeEstimate,
    RiskForecast,
    RiskForecastPoint,
    Anomaly,
    Recommendation,
    FindingBase,
)
from app.timezone_utils import get_utc_now

logger = logging.getLogger(__name__)

# Risk scoring weights (same as trend analysis)
RISK_WEIGHTS = {
    "Critical": 10,
    "High": 7,
    "Medium": 4,
    "Low": 2,
    "Informational": 0,
}


def estimate_remediation_time(
    session: Session,
    project_id: int,
    risk_level: Optional[str] = None
) -> List[RemediationTimeEstimate]:
    """
    Estimate remediation time based on historical data.
    
    Uses median time-to-remediate from resolved findings.
    Provides confidence intervals based on std deviation.
    
    Args:
        session: Database session
        project_id: Project ID
        risk_level: Filter by specific risk level (optional)
    
    Returns:
        List of RemediationTimeEstimate per risk level
    """
    # Get all resolved findings for this project
    query = select(Finding).where(
        Finding.project_id == project_id,
        Finding.resolved_at.isnot(None),
        Finding.discovered_at.isnot(None),
    )
    
    if risk_level:
        query = query.where(Finding.risk_rating == risk_level)
    
    findings = session.exec(query).all()
    
    # Group by risk level
    remediation_times: Dict[str, List[float]] = {
        "Critical": [],
        "High": [],
        "Medium": [],
        "Low": [],
        "Informational": [],
    }
    
    for finding in findings:
        if finding.discovered_at and finding.resolved_at:
            # Calculate days to remediate
            delta = finding.resolved_at - finding.discovered_at
            days = delta.total_seconds() / 86400  # Convert to days
            
            risk = finding.risk_rating
            if risk in remediation_times:
                remediation_times[risk].append(days)
    
    # Calculate estimates per risk level
    estimates = []
    
    for risk, times in remediation_times.items():
        if not times:
            # No historical data - use industry defaults
            defaults = {
                "Critical": (7, 3, 14),  # (median, low, high)
                "High": (14, 7, 30),
                "Medium": (30, 14, 60),
                "Low": (60, 30, 90),
                "Informational": (90, 60, 180),
            }
            median, low, high = defaults[risk]
            sample_size = 0
        else:
            # Calculate statistics
            median = statistics.median(times)
            
            if len(times) > 1:
                std_dev = statistics.stdev(times)
                # 95% confidence interval (±2 std devs)
                low = max(0, median - 2 * std_dev)
                high = median + 2 * std_dev
            else:
                # Single data point - use ±50%
                low = median * 0.5
                high = median * 1.5
            
            sample_size = len(times)
        
        estimates.append(
            RemediationTimeEstimate(
                risk_level=risk,
                estimated_days=round(median, 1),
                confidence_interval_low=round(low, 1),
                confidence_interval_high=round(high, 1),
                sample_size=sample_size,
            )
        )
    
    # Filter to requested risk level if specified
    if risk_level:
        estimates = [e for e in estimates if e.risk_level == risk_level]
    
    return estimates


def forecast_risk_score(
    session: Session,
    project_id: int,
) -> RiskForecast:
    """
    Forecast risk score 30/60/90 days ahead using linear regression.
    
    Uses historical risk scores to predict future trajectory.
    Simple linear trend with confidence bounds.
    
    Args:
        session: Database session
        project_id: Project ID
    
    Returns:
        RiskForecast with predictions
    """
    # Get current risk score
    current_findings = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.resolved_at.is_(None),
        )
    ).all()
    current_score = sum(RISK_WEIGHTS.get(f.risk_rating, 0) for f in current_findings)
    
    # Get historical risk scores (last 90 days, weekly)
    now = get_utc_now()
    historical_scores = []
    
    for days_ago in range(90, 0, -7):  # Weekly samples going back 90 days
        check_date = now - timedelta(days=days_ago)
        
        # Get open findings at that point
        findings = session.exec(
            select(Finding).where(
                Finding.project_id == project_id,
                Finding.discovered_at <= check_date,
                (Finding.resolved_at.is_(None)) | (Finding.resolved_at > check_date),
            )
        ).all()
        
        # Calculate risk score
        score = sum(RISK_WEIGHTS.get(f.risk_rating, 0) for f in findings)
        historical_scores.append(score)
    
    # Add current score
    historical_scores.append(current_score)
    
    # Calculate trend using simple linear regression
    if len(historical_scores) < 2:
        # Not enough data - assume stable
        trend = "stable"
        slope = 0.0
    else:
        # Calculate slope (change per week)
        n = len(historical_scores)
        x = list(range(n))  # Week numbers
        y = historical_scores
        
        # Linear regression: y = mx + b
        x_mean = sum(x) / n
        y_mean = sum(y) / n
        
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            slope = 0.0
        else:
            slope = numerator / denominator
        
        # Determine trend
        if slope < -0.5:
            trend = "improving"
        elif slope > 0.5:
            trend = "worsening"
        else:
            trend = "stable"
    
    # Calculate standard deviation for confidence intervals
    if len(historical_scores) > 1:
        std_dev = statistics.stdev(historical_scores)
    else:
        std_dev = current_score * 0.2  # 20% default uncertainty
    
    # Forecast future scores (slope is per week)
    weeks_30d = 4.3  # ~30 days
    weeks_60d = 8.6
    weeks_90d = 12.9
    
    forecast_30 = current_score + (slope * weeks_30d)
    forecast_60 = current_score + (slope * weeks_60d)
    forecast_90 = current_score + (slope * weeks_90d)
    
    # Ensure non-negative
    forecast_30 = max(0, forecast_30)
    forecast_60 = max(0, forecast_60)
    forecast_90 = max(0, forecast_90)
    
    # Calculate confidence (inverse of coefficient of variation)
    if current_score > 0:
        cv = std_dev / current_score
        confidence = max(0.1, min(1.0, 1.0 - cv))
    else:
        confidence = 0.5  # Default for zero baseline
    
    date_30 = (now + timedelta(days=30)).strftime("%Y-%m-%d")
    date_60 = (now + timedelta(days=60)).strftime("%Y-%m-%d")
    date_90 = (now + timedelta(days=90)).strftime("%Y-%m-%d")
    
    return RiskForecast(
        current_risk_score=float(current_score),
        forecast_30_days=RiskForecastPoint(
            date=date_30,
            predicted_risk_score=round(forecast_30, 1),
            lower_bound=round(max(0, forecast_30 - 2 * std_dev), 1),
            upper_bound=round(forecast_30 + 2 * std_dev, 1),
        ),
        forecast_60_days=RiskForecastPoint(
            date=date_60,
            predicted_risk_score=round(forecast_60, 1),
            lower_bound=round(max(0, forecast_60 - 2 * std_dev), 1),
            upper_bound=round(forecast_60 + 2 * std_dev, 1),
        ),
        forecast_90_days=RiskForecastPoint(
            date=date_90,
            predicted_risk_score=round(forecast_90, 1),
            lower_bound=round(max(0, forecast_90 - 2 * std_dev), 1),
            upper_bound=round(forecast_90 + 2 * std_dev, 1),
        ),
        trend=trend,
        confidence=round(confidence, 2),
    )


def detect_anomalies(
    session: Session,
    project_id: int,
) -> List[Anomaly]:
    """
    Detect anomalies in security metrics.
    
    Looks for:
    - Sudden spike in findings (>2 std devs above mean)
    - Remediation slowdown (MTTR increased significantly)
    - Regression (resolved findings reopened)
    
    Args:
        session: Database session
        project_id: Project ID
    
    Returns:
        List of detected anomalies
    """
    anomalies = []
    now = get_utc_now()
    
    # 1. Check for spike in findings (last 7 days vs previous 30 days)
    recent_findings = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.discovered_at >= now - timedelta(days=7),
        )
    ).all()
    
    historical_findings = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.discovered_at >= now - timedelta(days=37),
            Finding.discovered_at < now - timedelta(days=7),
        )
    ).all()
    
    recent_count = len(recent_findings)
    
    if historical_findings:
        # Calculate weekly average from historical period (30 days = ~4 weeks)
        historical_weekly_avg = len(historical_findings) / 4.3
        
        # Check if recent week is >2x the average
        if recent_count > historical_weekly_avg * 2 and recent_count > 5:
            anomalies.append(
                Anomaly(
                    anomaly_type="spike_in_findings",
                    severity="high" if recent_count > historical_weekly_avg * 3 else "medium",
                    detected_at=now.isoformat(),
                    description=f"Unusual spike in findings detected: {recent_count} in last 7 days (avg: {historical_weekly_avg:.1f}/week)",
                    affected_findings=[f.id for f in recent_findings],
                    recommendation="Review recent scans for false positives or investigate potential security incident.",
                )
            )
    
    # 2. Check for remediation slowdown
    # Compare MTTR of last 30 days vs previous 60 days
    recent_resolved = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.resolved_at >= now - timedelta(days=30),
            Finding.resolved_at.isnot(None),
            Finding.discovered_at.isnot(None),
        )
    ).all()
    
    historical_resolved = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.resolved_at >= now - timedelta(days=90),
            Finding.resolved_at < now - timedelta(days=30),
            Finding.resolved_at.isnot(None),
            Finding.discovered_at.isnot(None),
        )
    ).all()
    
    if recent_resolved and historical_resolved:
        recent_mttr = statistics.mean([
            (f.resolved_at - f.discovered_at).total_seconds() / 86400
            for f in recent_resolved
        ])
        
        historical_mttr = statistics.mean([
            (f.resolved_at - f.discovered_at).total_seconds() / 86400
            for f in historical_resolved
        ])
        
        # Check if MTTR increased by >50%
        if recent_mttr > historical_mttr * 1.5 and recent_mttr > 14:
            anomalies.append(
                Anomaly(
                    anomaly_type="remediation_slowdown",
                    severity="medium",
                    detected_at=now.isoformat(),
                    description=f"Remediation velocity decreased: MTTR increased from {historical_mttr:.1f} to {recent_mttr:.1f} days",
                    affected_findings=[f.id for f in recent_resolved],
                    recommendation="Review team capacity and prioritize critical/high findings. Consider resource reallocation.",
                )
            )
    
    # 3. Check for regressions (findings reopened)
    # Look for findings that were closed but are now open again
    reopened = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.issue_status == "Open",
            Finding.resolved_at.isnot(None),  # Was resolved at some point
        )
    ).all()
    
    if reopened:
        anomalies.append(
            Anomaly(
                anomaly_type="regression",
                severity="high" if len(reopened) > 5 else "medium",
                detected_at=now.isoformat(),
                description=f"Detected {len(reopened)} reopened findings - possible regressions or incomplete fixes",
                affected_findings=[f.id for f in reopened],
                recommendation="Review reopened findings for root cause. Implement regression testing to prevent recurrence.",
            )
        )
    
    return anomalies


def generate_recommendations(
    session: Session,
    project_id: int,
) -> List[Recommendation]:
    """
    Generate actionable recommendations based on project analysis.
    
    Categories:
    - Quick wins (low-effort, high-impact fixes)
    - Stale findings (>90 days open)
    - SLA at-risk findings
    - Resource allocation suggestions
    
    Args:
        session: Database session
        project_id: Project ID
    
    Returns:
        List of prioritized recommendations
    """
    recommendations = []
    now = get_utc_now()
    
    # 1. Quick Wins - Low risk findings with many instances (easy to fix, high impact)
    low_findings = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.risk_rating.in_(["Low", "Medium"]),
            Finding.issue_status == "Open",
        )
    ).all()
    
    quick_wins = []
    for finding in low_findings:
        instances = session.exec(
            select(Instance).where(Instance.finding_id == finding.id)
        ).all()
        
        # Look for findings with 5+ instances (widespread issue)
        if len(instances) >= 5:
            quick_wins.append(finding)
    
    if quick_wins:
        recommendations.append(
            Recommendation(
                priority="high",
                category="quick_wins",
                title=f"Quick Win: {len(quick_wins)} low/medium findings with multiple instances",
                description=f"These findings have 5+ instances each, suggesting a systematic issue. Fixing the root cause will remediate many instances at once.",
                affected_findings=[f.id for f in quick_wins],
                estimated_effort="1-2 days",
                potential_impact=f"Remediate {sum(len(session.exec(select(Instance).where(Instance.finding_id == f.id)).all()) for f in quick_wins)} instances",
            )
        )
    
    # 2. Stale Findings - Open for >90 days
    stale_findings = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.discovered_at <= now - timedelta(days=90),
            Finding.issue_status == "Open",
        )
    ).all()
    
    if stale_findings:
        # Prioritize by risk
        critical_stale = [f for f in stale_findings if f.risk_rating == "Critical"]
        high_stale = [f for f in stale_findings if f.risk_rating == "High"]
        
        if critical_stale or high_stale:
            recommendations.append(
                Recommendation(
                    priority="critical" if critical_stale else "high",
                    category="stale_findings",
                    title=f"Stale High-Risk Findings: {len(critical_stale) + len(high_stale)} findings open >90 days",
                    description=f"Critical: {len(critical_stale)}, High: {len(high_stale)}. These long-standing vulnerabilities pose ongoing risk.",
                    affected_findings=[f.id for f in critical_stale + high_stale],
                    estimated_effort="1-4 weeks depending on complexity",
                    potential_impact="Reduce risk exposure significantly",
                )
            )
    
    # 3. SLA At-Risk Findings
    at_risk_findings = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.sla_status == "At Risk",
        )
    ).all()
    
    overdue_findings = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.sla_status == "Overdue",
        )
    ).all()
    
    if at_risk_findings or overdue_findings:
        recommendations.append(
            Recommendation(
                priority="critical" if overdue_findings else "high",
                category="sla_at_risk",
                title=f"SLA Compliance Risk: {len(overdue_findings)} overdue, {len(at_risk_findings)} at risk",
                description="These findings are approaching or past their remediation deadlines. Immediate action required to maintain SLA compliance.",
                affected_findings=[f.id for f in overdue_findings + at_risk_findings],
                estimated_effort="Variable - prioritize by risk rating",
                potential_impact="Maintain SLA compliance and avoid penalties",
            )
        )
    
    # 4. Resource Allocation - High workload on single owner
    findings_by_owner: Dict[str, List[Finding]] = {}
    
    assigned_findings = session.exec(
        select(Finding).where(
            Finding.project_id == project_id,
            Finding.remediation_owner.isnot(None),
            Finding.issue_status == "Open",
        )
    ).all()
    
    for finding in assigned_findings:
        owner = finding.remediation_owner
        if owner:
            if owner not in findings_by_owner:
                findings_by_owner[owner] = []
            findings_by_owner[owner].append(finding)
    
    # Check for overloaded owners (>10 open findings)
    for owner, findings in findings_by_owner.items():
        if len(findings) > 10:
            critical_count = sum(1 for f in findings if f.risk_rating == "Critical")
            high_count = sum(1 for f in findings if f.risk_rating == "High")
            
            recommendations.append(
                Recommendation(
                    priority="medium",
                    category="resource_allocation",
                    title=f"Overloaded Owner: {owner} has {len(findings)} open findings",
                    description=f"Including {critical_count} Critical and {high_count} High risk. Consider redistributing workload or providing additional resources.",
                    affected_findings=[f.id for f in findings],
                    estimated_effort="Management action required",
                    potential_impact="Improve remediation velocity and prevent burnout",
                )
            )
    
    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    recommendations.sort(key=lambda r: priority_order.get(r.priority, 99))
    
    return recommendations
