/**
 * ExecutiveService - API client for executive dashboard endpoints
 * 
 * Provides methods to fetch high-level KPIs and visualizations for C-level stakeholders:
 * - Executive summary with all KPIs
 * - Risk heat map across all projects
 */

import axios from 'axios';

const API_BASE_URL = '/api';

export interface FindingsBySeverity {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
}

export interface TrendData {
  trend_direction: 'improving' | 'worsening' | 'stable';
  percentage_change: number;
  recent_count: number;
  previous_count: number;
  period_days: number;
}

export interface ComplianceCoverage {
  owasp_coverage: number;
  cwe_coverage: number;
  attack_coverage: number;
}

export interface ProjectRiskScore {
  project_id: number;
  project_name: string;
  risk_score: number;
  severity_counts: FindingsBySeverity;
  color: 'red' | 'orange' | 'yellow' | 'green';
  total_findings: number;
  open_critical_high: number;
  is_archived: boolean;
}

export interface ExecutiveSummaryResponse {
  total_projects: number;
  total_findings: number;
  findings_by_severity: FindingsBySeverity;
  mttr_days: number;
  trend: TrendData;
  compliance_coverage: ComplianceCoverage;
  open_critical_high: number;
  top_risky_projects: ProjectRiskScore[];
  generated_at: string;
}

export interface RiskHeatMapResponse extends Array<ProjectRiskScore> {}

/**
 * Fetch executive summary with all KPIs
 */
export async function getExecutiveSummary(): Promise<ExecutiveSummaryResponse> {
  const response = await axios.get<ExecutiveSummaryResponse>(`${API_BASE_URL}/executive/summary`);
  return response.data;
}

/**
 * Fetch risk heat map for all projects
 */
export async function getRiskHeatMap(): Promise<RiskHeatMapResponse> {
  const response = await axios.get<RiskHeatMapResponse>(`${API_BASE_URL}/executive/risk-heatmap`);
  return response.data;
}
