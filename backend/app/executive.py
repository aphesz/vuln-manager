# backend/app/executive.py
"""
Executive Dashboard and Reporting Module
Provides high-level KPIs and visualizations for C-level stakeholders.
"""

from typing import List, Optional, Dict, Tuple
from datetime import datetime, timedelta
from sqlmodel import Session, select, func
from sqlalchemy import and_, or_
from app.models import Project, Finding, Instance, FindingBase
from app.timezone_utils import get_utc_now
from collections import defaultdict
import statistics


class ExecutiveMetrics:
    """Business logic for calculating executive-level metrics."""
    
    @staticmethod
    def calculate_mttr(session: Session, project_id: Optional[int] = None) -> float:
        """
        Calculate Mean Time To Remediation (MTTR) in days.
        
        Args:
            session: Database session
            project_id: Optional project ID to filter by (None = all projects)
        
        Returns:
            MTTR in days (0.0 if no resolved findings)
        """
        query = select(Finding).where(
            Finding.resolved_at.isnot(None),
            Finding.discovered_at.isnot(None)
        )
        
        if project_id:
            query = query.where(Finding.project_id == project_id)
        
        findings = session.exec(query).all()
        
        if not findings:
            return 0.0
        
        resolution_times = []
        for finding in findings:
            if finding.discovered_at and finding.resolved_at:
                delta = finding.resolved_at - finding.discovered_at
                resolution_times.append(delta.total_seconds() / 86400)  # Convert to days
        
        return round(statistics.mean(resolution_times), 2) if resolution_times else 0.0
    
    @staticmethod
    def calculate_trend_direction(session: Session, days: int = 30) -> Dict[str, any]:
        """
        Calculate trend direction by comparing recent vs previous period.
        
        Args:
            session: Database session
            days: Number of days for comparison period (default 30)
        
        Returns:
            Dict with trend_direction ('improving'|'worsening'|'stable'), 
            percentage_change, recent_count, previous_count
        """
        now = get_utc_now()
        recent_start = now - timedelta(days=days)
        previous_start = recent_start - timedelta(days=days)
        
        # Recent period findings (discovered in last N days)
        recent_findings = session.exec(
            select(func.count(Finding.id)).where(
                Finding.discovered_at >= recent_start,
                Finding.discovered_at < now
            )
        ).one()
        
        # Previous period findings
        previous_findings = session.exec(
            select(func.count(Finding.id)).where(
                Finding.discovered_at >= previous_start,
                Finding.discovered_at < recent_start
            )
        ).one()
        
        # Calculate percentage change
        if previous_findings == 0:
            percentage_change = 0.0
            trend_direction = "stable"
        else:
            percentage_change = round(
                ((recent_findings - previous_findings) / previous_findings) * 100, 
                2
            )
            
            if percentage_change < -5:  # More than 5% reduction
                trend_direction = "improving"
            elif percentage_change > 5:  # More than 5% increase
                trend_direction = "worsening"
            else:
                trend_direction = "stable"
        
        return {
            "trend_direction": trend_direction,
            "percentage_change": percentage_change,
            "recent_count": recent_findings,
            "previous_count": previous_findings,
            "period_days": days
        }
    
    @staticmethod
    def calculate_compliance_coverage(session: Session, project_id: Optional[int] = None) -> Dict[str, float]:
        """
        Calculate compliance coverage percentages for OWASP Top 10, CWE Top 25, ATT&CK.
        
        Args:
            session: Database session
            project_id: Optional project ID (None = all projects)
        
        Returns:
            Dict with owasp_coverage, cwe_coverage, attack_coverage (0-100%)
        """
        query = select(Finding)
        if project_id:
            query = query.where(Finding.project_id == project_id)
        
        findings = session.exec(query).all()
        total = len(findings)
        
        if total == 0:
            return {
                "owasp_coverage": 0.0,
                "cwe_coverage": 0.0,
                "attack_coverage": 0.0
            }
        
        # Count findings with OWASP mapping
        owasp_mapped = sum(1 for f in findings if f.owasp_category is not None)
        
        # Count findings with CWE mapping (stored in description or title)
        cwe_mapped = sum(1 for f in findings if 'CWE-' in f.title or 'CWE-' in f.description)
        
        # Count findings with ATT&CK mapping (check instances for technique IDs)
        attack_mapped = 0
        for finding in findings:
            # Check if any instance has ATT&CK technique in details
            if any('T' in inst.details and any(char.isdigit() for char in inst.details) 
                   for inst in finding.instances):
                attack_mapped += 1
        
        return {
            "owasp_coverage": round((owasp_mapped / total) * 100, 2),
            "cwe_coverage": round((cwe_mapped / total) * 100, 2),
            "attack_coverage": round((attack_mapped / total) * 100, 2)
        }
    
    @staticmethod
    def get_findings_by_severity(session: Session, project_id: Optional[int] = None) -> Dict[str, int]:
        """
        Count findings by severity level.
        
        Args:
            session: Database session
            project_id: Optional project ID (None = all projects)
        
        Returns:
            Dict with keys: critical, high, medium, low, informational
        """
        query = select(Finding)
        if project_id:
            query = query.where(Finding.project_id == project_id)
        
        findings = session.exec(query).all()
        
        counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "informational": 0
        }
        
        for finding in findings:
            risk = finding.risk_rating.value.lower() if finding.risk_rating else "informational"
            if risk in counts:
                counts[risk] += 1
        
        return counts
    
    @staticmethod
    def get_risk_heat_map(session: Session) -> List[Dict[str, any]]:
        """
        Generate risk heat map data for all projects.
        
        Returns:
            List of dicts with: project_id, project_name, risk_score, 
            severity_counts, color, total_findings, open_critical_high
        """
        projects = session.exec(select(Project).where(Project.is_archived == False)).all()
        heat_map_data = []
        
        for project in projects:
            findings = session.exec(
                select(Finding).where(Finding.project_id == project.id)
            ).all()
            
            # Calculate risk score (weighted sum)
            risk_score = 0
            severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "informational": 0}
            open_critical_high = 0
            
            for finding in findings:
                risk = finding.risk_rating.value.lower() if finding.risk_rating else "informational"
                severity_counts[risk] = severity_counts.get(risk, 0) + 1
                
                # Weighted scoring
                if risk == "critical":
                    risk_score += 10
                    if finding.issue_status.value == "Open":
                        open_critical_high += 1
                elif risk == "high":
                    risk_score += 7
                    if finding.issue_status.value == "Open":
                        open_critical_high += 1
                elif risk == "medium":
                    risk_score += 4
                elif risk == "low":
                    risk_score += 2
                elif risk == "informational":
                    risk_score += 1
            
            # Determine color based on risk score
            if risk_score >= 50:
                color = "red"  # Critical risk
            elif risk_score >= 30:
                color = "orange"  # High risk
            elif risk_score >= 15:
                color = "yellow"  # Medium risk
            else:
                color = "green"  # Low risk
            
            heat_map_data.append({
                "project_id": project.id,
                "project_name": project.name,
                "risk_score": risk_score,
                "severity_counts": severity_counts,
                "color": color,
                "total_findings": len(findings),
                "open_critical_high": open_critical_high,
                "is_archived": project.is_archived
            })
        
        # Sort by risk_score descending
        heat_map_data.sort(key=lambda x: x["risk_score"], reverse=True)
        
        return heat_map_data
    
    @staticmethod
    def get_executive_summary(session: Session) -> Dict[str, any]:
        """
        Generate comprehensive executive summary with all KPIs.
        
        Returns:
            Dict with: total_projects, findings_by_severity, mttr, trend, 
            compliance_coverage, open_critical_high, top_risky_projects
        """
        # Total projects (active only)
        total_projects = session.exec(
            select(func.count(Project.id)).where(Project.is_archived == False)
        ).one()
        
        # Findings by severity (all active projects)
        findings_by_severity = ExecutiveMetrics.get_findings_by_severity(session)
        
        # MTTR (all projects)
        mttr = ExecutiveMetrics.calculate_mttr(session)
        
        # Trend direction (last 30 days)
        trend = ExecutiveMetrics.calculate_trend_direction(session, days=30)
        
        # Compliance coverage
        compliance_coverage = ExecutiveMetrics.calculate_compliance_coverage(session)
        
        # Open critical/high findings count
        open_critical_high = session.exec(
            select(func.count(Finding.id)).where(
                and_(
                    or_(
                        Finding.risk_rating == FindingBase.RiskRating.Critical,
                        Finding.risk_rating == FindingBase.RiskRating.High
                    ),
                    Finding.issue_status == FindingBase.IssueStatus.Open
                )
            )
        ).one()
        
        # Top 5 risky projects
        heat_map = ExecutiveMetrics.get_risk_heat_map(session)
        top_risky_projects = heat_map[:5]  # Already sorted by risk_score
        
        # Total findings across all projects
        total_findings = sum(findings_by_severity.values())
        
        return {
            "total_projects": total_projects,
            "total_findings": total_findings,
            "findings_by_severity": findings_by_severity,
            "mttr_days": mttr,
            "trend": trend,
            "compliance_coverage": compliance_coverage,
            "open_critical_high": open_critical_high,
            "top_risky_projects": top_risky_projects,
            "generated_at": get_utc_now().isoformat()
        }
